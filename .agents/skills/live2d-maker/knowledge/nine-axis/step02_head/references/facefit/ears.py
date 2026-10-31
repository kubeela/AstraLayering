"""耳朵：整体跟随父级在耳根处的位移，只做平移和横向透视缩放，不拟合 left.png 中的耳朵像素。

远侧耳不用透明度隐藏：它沿头部转到脑后，排在脸底之下，由脸遮挡。
耳根点（耳朵与脸相接处）由调用者在正面图上选取；哪只是远侧耳、转到多深由调用者看图判断。
"""
import numpy as np


def follow(warp, rest, root, h=2.0):
    """rest：耳朵控制网格的正面位置 (N, 2)，root：正面耳根点 (x, y)，均为 box 坐标。

    返回 (−30 位置 (N, 2), 横向缩放)。横向缩放取父级前向场在耳根处 x 方向的局部斜率。
    """
    rx, ry = root
    p, _ = warp.forward(np.array([rx - h, rx, rx + h]), np.array([ry, ry, ry]))
    sx = (p[2, 0] - p[0, 0]) / (2 * h)
    rest = np.asarray(rest, np.float64)
    return np.stack([p[1, 0] + sx * (rest[:, 0] - rx), p[1, 1] + (rest[:, 1] - ry)], -1), float(sx)


def behind(warp, rest, root, extra=0.0, phi0=None):
    """远侧耳：耳根沿圆柱转过 θ（再加 extra 弧度）到侧后方，整体平移，形状不变。

    phi0：耳根在正面时的圆柱角（度）；缺省按耳根 x 反算。耳朵长在头侧，耳根像素压在脸上时，
    反算的角度会偏小，此时可按头侧给（如 −90）。
    返回 (−30 位置 (N, 2), 耳根转后的角度 φ（度）)。|φ| 超过 90° 即在脑后；
    能否被脸遮住、遮住多少，渲染后看图判断，不够再调 extra 或耳根。
    """
    c, (rx, ry) = warp.cyl, root
    a = np.arcsin(np.clip((rx - c.C) / c.R, -1, 1)) if phi0 is None else np.radians(phi0)
    phi = a - c.theta - extra
    x = rx + c.tx + c.R * (np.sin(phi) - np.sin(a))
    p, _ = warp.forward(np.array([rx]), np.array([ry]))
    return np.asarray(rest, np.float64) + [x - rx, p[0, 1] - ry], float(np.degrees(phi))
