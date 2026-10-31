"""损失与优化循环。输入（蒙版、轮廓段、覆盖区、ROI、有效区、权重）都由调用者按角色给出。

- 父级：left.png 中脸部可见外轮廓内侧采到脸底 alpha=1、外侧=0，加肤色区覆盖与网格平滑。
- 子级：本组 ROI 内，渲染结果与 left.png 的多尺度 L1 颜色差＋横纵梯度差，加网格平滑。
"""
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from scipy import ndimage as ndi
from scipy.ndimage import gaussian_filter, gaussian_filter1d

from .field import Residual, sample


def contour_normals(mask, sigma=1.5):
    """二值区域的最长外轮廓点（像素中心）与向外的单位法向，均为 (N, 2)。

    要用哪一段（去掉被头发遮住、与头发相接或与耳朵相连的部分）由调用者看图选取。
    """
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=len)[:, 0, :].astype(np.float64)
    sd = ndi.distance_transform_edt(mask) - ndi.distance_transform_edt(~mask.astype(bool))
    gy, gx = np.gradient(gaussian_filter(sd, sigma))
    xi, yi = c[:, 0].astype(int), c[:, 1].astype(int)
    n = np.stack([-gx[yi, xi], -gy[yi, xi]], 1)
    n = np.stack([gaussian_filter1d(n[:, 0], 2, mode='wrap'), gaussian_filter1d(n[:, 1], 2, mode='wrap')], 1)
    return c + 0.5, n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-9)


def turning_angle(pts, k=4):
    """每个轮廓点前后 k 点切线的夹角（度），可用来找下颌与头发相接处的拐点。"""
    d_in, d_out = pts - np.roll(pts, k, 0), np.roll(pts, -k, 0) - pts
    return np.degrees(np.abs(np.arctan2(d_in[:, 0] * d_out[:, 1] - d_in[:, 1] * d_out[:, 0], (d_in * d_out).sum(1))))


def blurred(alpha, sigmas):
    """alpha (H, W) numpy → {sigma: (1, H, W) 张量}，用于由粗到细的优化。"""
    return {s: torch.tensor(gaussian_filter(alpha, s) if s > 0 else alpha, dtype=torch.float32)[None] for s in sigmas}


def fit_parent(warp, face_alpha, contour, cover, box, grid=(10, 10), iters=400, lr=0.3, cover_w=0.3, smooth_w=5e-3,
               band=3.0, offset=0.0, sigmas=(8, 4, 2, 0), extra=None, log=print):
    """拟合父级残差，结果写入 warp.parent。

    face_alpha：box 内脸底 alpha (H, W) numpy；contour：(pts, normals) 选好的可见外轮廓；
    cover：(xs, ys) 目标中应被脸底覆盖的像素中心；box：残差网格范围 [x0, y0, x1, y1]；
    offset：轮廓线的位置相对轮廓点沿法向的偏移（线稿较粗时调）；extra(warp) 可返回附加损失。
    """
    warp.parent = Residual(box, *grid)
    opt = torch.optim.Adam(warp.parent.parameters(), lr=lr)
    A = blurred(face_alpha, sigmas)
    pts, nrm = (torch.tensor(v, dtype=torch.float32) for v in contour)
    p_in, p_out = pts + nrm * (offset - band), pts + nrm * (offset + band)
    cx, cy = (torch.as_tensor(v, dtype=torch.float32) for v in cover)
    for it in range(iters):
        a = A[sigmas[min(it * len(sigmas) // iters, len(sigmas) - 1)]]
        opt.zero_grad()
        l_in = ((1 - sample(a, *warp.parent_back(p_in[:, 0], p_in[:, 1]))[0]) ** 2).mean()
        l_out = (sample(a, *warp.parent_back(p_out[:, 0], p_out[:, 1]))[0] ** 2).mean()
        l_cov = ((1 - sample(a, *warp.parent_back(cx, cy))[0]) ** 2).mean()
        l_sm = warp.parent.smooth()
        loss = l_in + l_out + cover_w * l_cov + smooth_w * l_sm + (extra(warp) if extra else 0)
        loss.backward()
        opt.step()
        if log and (it % 100 == 0 or it == iters - 1):
            log(f'parent {it} loss={float(loss.detach()):.5f} contour={float((l_in + l_out).detach()):.5f} cover={float(l_cov.detach()):.5f} smooth={float(l_sm.detach()):.4f}')
    warp.parent.g.requires_grad_(False)
    return warp.parent


def _pool(x, s):
    return F.avg_pool2d(x[None], s, s)[0] if s > 1 else x


def image_loss(rgb, target, scales=(4, 2, 1), edge_w=2.0):
    loss = 0.
    for s in scales:
        a, b = _pool(rgb, s), _pool(target, s)
        loss = loss + (a - b).abs().mean()
        loss = loss + edge_w * ((a[:, :, 1:] - a[:, :, :-1] - b[:, :, 1:] + b[:, :, :-1]).abs().mean()
                                + (a[:, 1:] - a[:, :-1] - b[:, 1:] + b[:, :-1]).abs().mean())
    return loss


def render(warp, layers, xs, ys):
    """layers：[(预乘 RGBA 张量, group)]，从下到上；group 为 None 时只用父级。返回预乘 RGBA。"""
    out = None
    for tex, group in layers:
        w = sample(tex, *warp.back(xs, ys, group))
        out = w if out is None else w + out * (1 - w[3:4])
    return out


def fit_child(warp, group, layers, target, roi, valid, grid, init=(0.0, 0.0), iters=300, lr=0.4, smooth_w=2e-3,
              edge_w=2.0, scales=(4, 2, 1), log=print):
    """拟合一个子级（如眉眼 6×4、嘴 4×4、鼻 3×3），结果写入 warp.children[group]。

    layers 同 render，一般是脸底与参与对照的五官；target：left.png RGB 张量 (3, S, S)；
    roi：整数像素范围 [x0, y0, x1, y1)；valid：ROI 内参与比较的像素 (h, w) 张量（扣头发、限脸底内）；
    init：初始目标空间位移，可由匹配位置与父级投影之差估得。
    """
    x0, y0, x1, y1 = roi
    child = Residual([x0, y0, x1, y1], *grid)
    with torch.no_grad():
        child.g[:, 0], child.g[:, 1] = float(init[0]), float(init[1])
    warp.children[group] = child
    opt = torch.optim.Adam(child.parameters(), lr=lr)
    ys, xs = torch.meshgrid(torch.arange(y0, y1, dtype=torch.float32) + 0.5, torch.arange(x0, x1, dtype=torch.float32) + 0.5, indexing='ij')
    tgt, m = target[:, y0:y1, x0:x1], valid[None].float()
    for it in range(iters):
        opt.zero_grad()
        rgb = render(warp, layers, xs, ys)[:3] * m + tgt * (1 - m)
        l_img, l_sm = image_loss(rgb, tgt, scales, edge_w), child.smooth()
        loss = l_img + smooth_w * l_sm
        loss.backward()
        opt.step()
        if log and (it % 100 == 0 or it == iters - 1):
            log(f'{group} {it} loss={float(loss.detach()):.5f} image={float(l_img.detach()):.5f} smooth={float(l_sm.detach()):.4f}')
    child.g.requires_grad_(False)
    return child
