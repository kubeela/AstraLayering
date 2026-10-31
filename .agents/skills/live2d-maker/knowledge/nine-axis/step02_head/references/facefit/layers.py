"""图层读取、裁剪与合成。拟合用 box 局部坐标，见 __init__。"""
import json
import cv2
import numpy as np
import torch


def load_box(crop_json):
    """step01 的 crop.json → (x, y, size)。"""
    box = json.load(open(crop_json))['box']
    return box['x'], box['y'], box['size']


def load_layers(export_dir):
    """读 krita_export.py 的输出，KRA 从上到下。img 为整画布 BGRA float，alpha 已乘图层不透明度。"""
    out = []
    for m in json.load(open(f'{export_dir}/layers.json')):
        im = cv2.imread(f"{export_dir}/{m['file']}", cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
        im[..., 3] *= m['opacity'] / 255
        out.append({**m, 'img': im})
    return out


def crop(im, box):
    x, y, s = box
    return im[y:y + s, x:x + s]


def alpha_bbox(alpha, thr=0.02):
    """alpha > thr 的像素范围 [x0, y0, x1, y1)；没有像素时返回 None。"""
    ys, xs = np.nonzero(alpha > thr)
    if not len(xs):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def union_bbox(boxes):
    boxes = [b for b in boxes if b is not None]
    return min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)


def to_tensor(im_box):
    """box 内 BGRA float → 预乘 RGBA 张量 (4, H, W)。"""
    a = im_box[..., 3:4]
    rgb = im_box[..., 2::-1] * a
    return torch.tensor(np.concatenate([rgb, a], -1)).permute(2, 0, 1).contiguous()


def composite(layers, box, keep=lambda layer: True, bg=0.5):
    """把选中的图层按 KRA 顺序叠成 box 内 BGR uint8（如只要脸、不要头发）。"""
    s = box[2]
    comp = np.full((s, s, 3), bg, np.float32)
    for layer in reversed(layers):
        if not keep(layer):
            continue
        im = crop(layer['img'], box)
        a = im[..., 3:4]
        comp = comp * (1 - a) + im[..., :3] * a
    return (comp * 255).astype(np.uint8)
