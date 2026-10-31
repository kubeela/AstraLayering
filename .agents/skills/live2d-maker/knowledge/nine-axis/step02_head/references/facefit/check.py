"""按关键形渲染交付的 face-left.json，检查用。parts 从上到下即绘制顺序；'30' 按左右配对镜像，与程序一致。"""
import json
import re

import cv2
import numpy as np


def warp_point(part, key, x, y):
    x0, y0, x1, y1 = part['bbox']
    cols, rows = part['cols'], part['rows']
    pts = np.array(part['keyforms'][key]).reshape(rows + 1, cols + 1, 2)
    u, v = np.clip((x - x0) / (x1 - x0) * cols, 0, cols), np.clip((y - y0) / (y1 - y0) * rows, 0, rows)
    i, j = np.minimum(cols - 1, np.floor(u).astype(int)), np.minimum(rows - 1, np.floor(v).astype(int))
    s, t = (u - i)[..., None], (v - j)[..., None]
    at = (pts[j, i] * (1 - s) + pts[j, i + 1] * s) * (1 - t) + (pts[j + 1, i] * (1 - s) + pts[j + 1, i + 1] * s) * t
    return at + np.stack([x - (x0 + (x1 - x0) * u / cols), y - (y0 + (y1 - y0) * v / rows)], -1)


def pair_id(i):
    return re.sub(r'(^|[/_])(left|right)(?=$|[/_])', lambda m: m.group(1) + ('right' if m.group(2) == 'left' else 'left'), i)


def keyform(part, key, face):
    if key != '30':
        return np.array(part['keyforms'][key])
    pair = {p['id']: p for p in face['parts']}.get(pair_id(part['id']), part)
    r0, axis = np.array(part['keyforms']['0']), face['axis']
    m = warp_point(pair, '-30', 2 * axis - r0[:, 0], r0[:, 1])
    return np.stack([2 * axis - m[:, 0], m[:, 1]], -1)


def render(face, out_dir, box, key='-30', ss=4):
    """box 范围内的预乘 RGBA (S·ss, S·ss, 4)；ss 为超采样倍数。"""
    bx, by, size = box
    H = size * ss
    canvas = np.zeros((H, H, 4), np.float32)
    for p in reversed(face['parts']):
        pts = keyform(p, key, face)
        tex = cv2.imread(f"{out_dir}/{p['texture']}", cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
        tex[..., :3] *= tex[..., 3:4]
        tx, ty, tw, th = p['textureBounds']
        cols, rows = p['cols'], p['rows']
        R, P = np.array(p['keyforms']['0']).reshape(rows + 1, cols + 1, 2), pts.reshape(rows + 1, cols + 1, 2)
        layer = np.zeros((H, H, 4), np.float32)
        for j in range(rows):
            for i in range(cols):
                for tri in (((0, 0), (1, 0), (0, 1)), ((1, 1), (1, 0), (0, 1))):
                    src = np.float32([[R[j + dj, i + di, 0] - tx, R[j + dj, i + di, 1] - ty] for di, dj in tri])
                    if src[:, 0].max() < -1 or src[:, 1].max() < -1 or src[:, 0].min() > tw + 1 or src[:, 1].min() > th + 1:
                        continue
                    dst = np.float32([[(P[j + dj, i + di, 0] - bx) * ss, (P[j + dj, i + di, 1] - by) * ss] for di, dj in tri])
                    x0, y0 = max(int(np.floor(dst[:, 0].min())) - 1, 0), max(int(np.floor(dst[:, 1].min())) - 1, 0)
                    x1, y1 = min(int(np.ceil(dst[:, 0].max())) + 2, H), min(int(np.ceil(dst[:, 1].max())) + 2, H)
                    if x1 <= x0 or y1 <= y0:
                        continue
                    off = np.float32([x0, y0])
                    w = cv2.warpAffine(tex, cv2.getAffineTransform(src, dst - off), (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR)
                    msk = np.zeros((y1 - y0, x1 - x0), np.uint8)
                    cv2.fillConvexPoly(msk, np.round((dst - off) * 16).astype(np.int32), 1, shift=4)
                    layer[y0:y1, x0:x1] = np.where(msk[..., None] > 0, w, layer[y0:y1, x0:x1])
        canvas = layer + canvas * (1 - layer[..., 3:4])
    return canvas


def to_bgr(canvas, size, scale=2, bg=0.5):
    rgb = canvas[..., :3] + bg * (1 - canvas[..., 3:4])
    return (np.clip(cv2.resize(rgb, (size * scale, size * scale), interpolation=cv2.INTER_AREA), 0, 1) * 255).astype(np.uint8)


def left_check(out_dir, left_png, box, scale=2):
    """渲染 −30 与 left.png 并排，写 left-check.png。"""
    face = json.load(open(f'{out_dir}/face-left.json'))
    size = box[2]
    tgt = cv2.resize(cv2.imread(left_png), (size * scale, size * scale), interpolation=cv2.INTER_CUBIC)
    img = np.hstack([to_bgr(render(face, out_dir, box), size, scale), tgt])
    cv2.imwrite(f'{out_dir}/left-check.png', img)
    return img
