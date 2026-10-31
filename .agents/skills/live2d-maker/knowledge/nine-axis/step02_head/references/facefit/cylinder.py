"""圆柱转向：x' = C + tx + R·sin(asin((x−C)/R) − θ)，正面 x → 目标 x'。

C 是脸部中轴列（box 坐标），由角色决定（通常取脸底或两眼的中线）。
"""
import numpy as np
import torch
from scipy.optimize import least_squares


def forward(x, C, R, theta, tx):
    """正面 x → (目标 x', 该处横向缩放 cos(φ−θ)/cos φ)。"""
    phi = np.arcsin(np.clip((x - C) / R, -0.999, 0.999))
    return C + tx + R * np.sin(phi - theta), np.cos(phi - theta) / np.cos(phi)


def fit(C, positions, scales=(), scale_weight=40.0, bounds=([60, 0.05, -40], [250, 1.2, 40]),
        starts=((70, 0.3), (90, 0.5), (120, 0.7))):
    """positions：[(正面 x, 目标 x, 权重)]；scales：[(正面 x, 匹配到的横向缩放)]，通常是左右眼。

    返回 dict(C, R, theta, tx, cost)。θ 为弧度。
    """
    def residual(p):
        R, th, tx = p
        r = [w * (forward(xs, C, R, th, tx)[0] - xt) for xs, xt, w in positions]
        r += [scale_weight * (forward(xs, C, R, th, tx)[1] - s) for xs, s in scales]
        return np.array(r)
    best = min((least_squares(residual, [R0, t0, 0], bounds=bounds) for R0, t0 in starts), key=lambda s: s.cost)
    R, th, tx = best.x
    return dict(C=float(C), R=float(R), theta=float(th), tx=float(tx), cost=float(best.cost))


class Cyl:
    """单调的后向圆柱查表：目标 x' → 正面 x（可微）。纵向整体偏移 ty：正面 y = 目标 y − ty。

    eps 限制最小斜率，避免转面边缘处折叠；lo/hi 覆盖 box 外一段。
    """

    def __init__(self, C, R, theta, tx, ty, size, eps=0.12, step=0.25):
        self.C, self.R, self.theta, self.tx, self.ty, self.size = C, R, theta, tx, ty, size
        lo, hi = -0.3 * size, 1.3 * size
        xs = np.arange(lo, hi + step, step)
        u = (xs - C - tx) / R
        phi = np.arcsin(np.clip(u, -0.999, 0.999))
        slope = np.maximum(np.where(np.abs(u) < 0.999, np.cos(phi + theta) / np.cos(phi), 1.0), eps)
        i0 = int(np.argmin(np.abs(xs - (C + tx))))
        cum = np.concatenate([[0], np.cumsum((slope[1:] + slope[:-1]) / 2 * step)])
        self.xs_np, self.B_np = xs, cum - cum[i0] + C + R * np.sin(theta)
        self.B = torch.tensor(self.B_np, dtype=torch.float32)
        self.lo, self.step = lo, step

    def __call__(self, x):
        t = ((x - self.lo) / self.step).clamp(0, len(self.B) - 1.001)
        i = t.floor().long()
        f = t - i
        return self.B[i] * (1 - f) + self.B[i + 1] * f

    def inverse(self, x_src):
        """正面 x → 目标 x'，用作牛顿反解的初值。"""
        return np.interp(x_src, self.B_np, self.xs_np)

    def params(self):
        return dict(C=self.C, R=self.R, theta=self.theta, tx=self.tx, ty=self.ty)
