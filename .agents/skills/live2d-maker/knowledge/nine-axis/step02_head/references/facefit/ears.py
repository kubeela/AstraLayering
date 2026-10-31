"""耳朵：整体跟随父级在耳根处的位移，只做平移和横向透视缩放，不拟合 left.png 中的耳朵像素。

耳根点（耳朵与脸相接处）由调用者在正面图上选取；哪只是远侧耳、要不要隐藏也由调用者看图判断。
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
