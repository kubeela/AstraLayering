"""导出：每个图层一张裁切贴图和一个 16×16 warp，写 face-left.json。坐标为原画布像素。"""
import json
import os

import cv2
import numpy as np


def lattice(bbox, cols=16, rows=16):
    """bbox [x0, y0, x1, y1] 上的规则网格 ((rows+1)·(cols+1), 2)，行优先。"""
    X, Y = np.meshgrid(np.linspace(bbox[0], bbox[2], cols + 1), np.linspace(bbox[1], bbox[3], rows + 1))
    return np.stack([X.ravel(), Y.ravel()], 1)


def write_texture(layer, out_dir, n, pad=8):
    """把整画布图层裁成 layers/NNN.png，返回 (texture, textureBounds, bbox)；bbox 为不透明像素外扩 pad。"""
    im = layer['img']
    a8 = np.round(im[..., 3] * 255).astype(np.uint8)
    ys, xs = np.nonzero(a8 > 0)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    bgra = np.round(im * 255).astype(np.uint8)
    bgra[..., 3] = a8
    bgra[a8 == 0, :3] = 0
    name = f'layers/{n:03d}.png'
    os.makedirs(f'{out_dir}/layers', exist_ok=True)
    cv2.imwrite(f'{out_dir}/{name}', bgra[y0:y1, x0:x1])
    return name, [x0, y0, x1 - x0, y1 - y0], [x0 - pad, y0 - pad, x1 + pad, y1 + pad]


def warp_lattice(warp, rest, box, group=None, iters=60):
    """画布控制点 → −30 画布位置（牛顿反解）。返回 (位置, 最大反解残差)。"""
    q = rest - np.array(box[:2])
    p, err = warp.forward(q[:, 0], q[:, 1], group, iters=iters)
    return p.astype(np.float64) + np.array(box[:2]), float(err.max())


def fold(points, cols=16, rows=16):
    """各格子两条边的叉积最小值；≤0 表示网格翻折，需要回头调拟合。"""
    P = np.asarray(points).reshape(rows + 1, cols + 1, 2)
    e1, e2 = P[:-1, 1:] - P[:-1, :-1], P[1:, :-1] - P[:-1, :-1]
    return float((e1[..., 0] * e2[..., 1] - e1[..., 1] * e2[..., 0]).min())


def part(layer, group, texture, bounds, bbox, keyform, cols=16, rows=16, opacity=None):
    r = lambda pts: [[round(float(x), 2), round(float(y), 2)] for x, y in pts]
    entry = {'id': layer['id'], 'group': group, 'texture': texture, 'textureBounds': bounds, 'bbox': bbox, 'cols': cols, 'rows': rows,
             'keyforms': {'0': r(lattice(bbox, cols, rows)), '-30': r(keyform)}}
    if opacity:
        entry['opacity'] = opacity
    return entry


def write_face_left(path, axis, notes, parts):
    """parts 按 KRA 从上到下排列；axis 为脸部中轴列（画布像素）。"""
    json.dump({'axis': float(axis), 'notes': notes, 'parts': parts}, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
