"""后向场（目标 → 正面）：父级 = 圆柱 + 残差；子级在父级之前先做一小段目标空间位移。

    正面 (x, y) = 父级(目标点 + 子级位移)
    父级(x, y)  = (cyl(x) + rx, y − ty + ry)

前向位置（控制点在 −30 的位置）由 Warp.forward 牛顿反解得到。
"""
import numpy as np
import torch
import torch.nn.functional as F

from .cylinder import Cyl


class Residual(torch.nn.Module):
    """box [x0, y0, x1, y1] 上 gy×gx 个控制点的双三次位移场。"""

    def __init__(self, box, gx, gy, init=None):
        super().__init__()
        self.box, self.gx, self.gy = [float(v) for v in box], gx, gy
        self.g = torch.nn.Parameter(torch.zeros(1, 2, gy, gx) if init is None else init.clone().float())

    def forward(self, x, y):
        x0, y0, x1, y1 = self.box
        grid = torch.stack([((x - x0) / (x1 - x0) * 2 - 1).reshape(-1), ((y - y0) / (y1 - y0) * 2 - 1).reshape(-1)], -1).view(1, -1, 1, 2)
        out = F.grid_sample(self.g, grid, mode='bicubic', padding_mode='border', align_corners=True).view(2, -1)
        return out[0].view(x.shape), out[1].view(x.shape)

    def smooth(self):
        """二阶差分能量，越小越平滑。"""
        g = self.g
        dxx = g[..., :, 2:] - 2 * g[..., :, 1:-1] + g[..., :, :-2]
        dyy = g[..., 2:, :] - 2 * g[..., 1:-1, :] + g[..., :-2, :]
        dxy = g[..., 1:, 1:] - g[..., 1:, :-1] - g[..., :-1, 1:] + g[..., :-1, :-1]
        return (dxx ** 2).mean() + (dyy ** 2).mean() + 2 * (dxy ** 2).mean()

    def state(self):
        return {'box': self.box, 'gx': self.gx, 'gy': self.gy, 'g': self.g.detach().clone()}

    @classmethod
    def load(cls, state):
        return cls(state['box'], state['gx'], state['gy'], state['g'])


def pix_grid(x0, y0, x1, y1):
    """[x0, x1)×[y0, y1) 的像素中心坐标 (xs, ys)。"""
    ys, xs = torch.meshgrid(torch.arange(y0, y1, dtype=torch.float32) + 0.5, torch.arange(x0, x1, dtype=torch.float32) + 0.5, indexing='ij')
    return xs, ys


def sample(img, sx, sy, mode='bilinear'):
    """img (C, H, W) 在连续坐标 (sx, sy) 处双线性采样，返回 (C, *sx.shape)。"""
    H, W = img.shape[-2:]
    grid = torch.stack([sx.reshape(-1) / W * 2 - 1, sy.reshape(-1) / H * 2 - 1], -1).view(1, -1, 1, 2)
    return F.grid_sample(img[None], grid, mode=mode, padding_mode='zeros', align_corners=False).view(img.shape[0], *sx.shape)


class Warp:
    """cyl：Cyl；parent：Residual 或 None；children：{group: Residual}。"""

    def __init__(self, cyl, parent=None, children=None):
        self.cyl, self.parent, self.children = cyl, parent, dict(children or {})

    def parent_back(self, x, y):
        rx, ry = self.parent(x, y) if self.parent is not None else (0, 0)
        return self.cyl(x) + rx, y - self.cyl.ty + ry

    def back(self, x, y, group=None):
        child = self.children.get(group)
        if child is not None:
            dx, dy = child(x, y)
            x, y = x + dx, y + dy
        return self.parent_back(x, y)

    @torch.no_grad()
    def forward(self, qx, qy, group=None, init=None, iters=60, clamp=8.0):
        """正面点 (qx, qy) → 目标点：牛顿法解 back(p) = q。返回 (p (N,2) numpy, 残差 numpy)。"""
        q = torch.tensor(np.stack([qx, qy], -1), dtype=torch.float32)
        if init is None:
            init = np.stack([self.cyl.inverse(np.asarray(qx)), np.asarray(qy) + self.cyl.ty], -1)
        p = torch.tensor(init, dtype=torch.float32).clone()
        e = 1e-2
        for _ in range(iters):
            x, y = p[:, 0], p[:, 1]
            sx, sy = self.back(x, y, group)
            sx1, sy1 = self.back(x + e, y, group)
            sx2, sy2 = self.back(x, y + e, group)
            a, b, c, d = (sx1 - sx) / e, (sx2 - sx) / e, (sy1 - sy) / e, (sy2 - sy) / e
            det = a * d - b * c
            det = torch.where(det.abs() < 1e-3, torch.full_like(det, 1e-3), det)
            rx, ry = q[:, 0] - sx, q[:, 1] - sy
            p = p + torch.stack([(d * rx - b * ry) / det, (-c * rx + a * ry) / det], -1).clamp(-clamp, clamp)
        sx, sy = self.back(p[:, 0], p[:, 1], group)
        return p.numpy(), ((sx - q[:, 0]) ** 2 + (sy - q[:, 1]) ** 2).sqrt().numpy()

    def save(self, path):
        torch.save({'cyl': self.cyl.params(), 'size': self.cyl.size,
                    'parent': self.parent.state() if self.parent is not None else None,
                    'children': {k: v.state() for k, v in self.children.items()}}, path)

    @classmethod
    def load(cls, path):
        st = torch.load(path, weights_only=False)
        cyl = Cyl(**st['cyl'], size=st['size'])
        return cls(cyl, Residual.load(st['parent']) if st['parent'] else None, {k: Residual.load(v) for k, v in st['children'].items()})
