"""Hand repaired outline pixels to the front part (overlay delivery, after Krita).

The Krita repair repaints visible pixels of a back part that carry the outline /
antialias fringe of the part in front (the color-block shapes put the outline
just outside the front part). Those pixels belong to the front part's outline:
each repainted visible pixel is given, with its source color, to the nearest
part drawn above it (higher level), and the original-pose masks move with it.
The back part stays clean and complete; the composite keeps the outlines.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
from assemble_depth import contact_sheet, psnr  # noqa: E402
from prepare_depth import W, H, dump  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'delivery-v2'
RET = ROOT / 'retouch-v2'


def main():
    man = json.loads((OUT / 'manifest.json').read_text())
    parts = {e['id']: e for e in man['parts']}
    by_index = {e['index']: e for e in man['parts']}
    plan = json.loads((RET / 'plan.json').read_text())['parts']
    src = np.array(Image.open(ROOT / 'work/source.png').convert('RGBA'))
    owner = np.array(Image.open(ROOT / 'work/owner.png')).astype(int)
    level = np.full(owner.shape, -1)
    for e in man['parts']:
        level[owner == e['index']] = e['level']
    full = {k: np.array(Image.open(OUT / 'parts' / k / 'full.png')) for k in parts}
    pose = {k: np.array(Image.open(OUT / 'parts' / k / 'pose-mask.png')) for k in parts}
    received = {}
    for p in plan:
        e = parts[p['id']]
        sel = np.array(Image.open(ROOT / p['selection'])) > 0
        moved = sel & (owner == e['index'])
        if not moved.any():
            continue
        front = level > e['level']
        _, (iy, ix) = ndi.distance_transform_edt(~front, return_indices=True)
        target = owner[iy, ix]
        dist = np.hypot(iy - np.arange(H)[:, None], ix - np.arange(W)[None, :])
        moved &= dist <= 12  # only pixels next to a front part are outlines; others stay repaired only
        to = {}
        for q in np.unique(target[moved]):
            m = moved & (target == q)
            qid = by_index[int(q)]['id']
            full[qid][m] = src[m]
            pose[qid][m] = 255
            pose[p['id']][m] = 0
            to[qid] = int(m.sum())
            received[qid] = received.get(qid, 0) + int(m.sum())
        e['outlineTransfer'] = dict(note='repainted visible outline pixels handed to the front part with source colors', to=to)
    for k, n in received.items():
        parts[k]['outlineReceived'] = dict(pixels=n, note='outline / antialias band taken over from the part behind (shape grows by up to a few px beyond the color-block region)')
    for k in parts:
        Image.fromarray(full[k]).save(OUT / 'parts' / k / 'full.png')
        Image.fromarray(pose[k]).save(OUT / 'parts' / k / 'pose-mask.png')
    plain = np.zeros((H, W, 4), np.float32); posed = np.zeros((H, W, 4), np.float32)
    for e in sorted(man['parts'], key=lambda e: e['level']):
        im = full[e['id']].astype(np.float32) / 255
        pm = pose[e['id']].astype(np.float32) / 255
        for acc, alpha in ((plain, im[:, :, 3]), (posed, im[:, :, 3] * pm)):
            a = alpha[..., None]
            acc[:, :, :3] = im[:, :, :3] * a + acc[:, :, :3] * (1 - a)
            acc[:, :, 3:] = a + acc[:, :, 3:] * (1 - a)

    def unpremul(acc):
        o = acc.copy(); o[:, :, :3] = np.where(acc[:, :, 3:] > 0, acc[:, :, :3] / np.maximum(acc[:, :, 3:], 1e-6), 0)
        return np.rint(np.clip(o, 0, 1) * 255).astype(np.uint8)
    posed, plain = unpremul(posed), unpremul(plain)
    Image.fromarray(posed).save(OUT / 'reassembled-pose.png')
    Image.fromarray(plain).save(OUT / 'reassembled-depth-stack.png')
    subj = src[:, :, 3] > 127
    val = json.loads((OUT / 'validation.json').read_text())
    val.update(posePSNR=psnr(posed[:, :, :3], src[:, :, :3], subj),
               depthStackPSNR=psnr(plain[:, :, :3], src[:, :, :3], subj),
               depthStackUnchangedPixelRatio=float((np.abs(plain[:, :, :3].astype(int) - src[:, :, :3]).max(2) <= 2)[subj].mean()),
               poseUnchangedPixelRatio=float((np.abs(posed[:, :, :3].astype(int) - src[:, :, :3]).max(2) <= 2)[subj].mean()),
               outlineTransfer=dict(parts=len(received), pixels=sum(received.values())))
    val.pop('kritaReopenedVsDepthStackMaxAbs', None)  # KRA is rebuilt from the final parts next
    dump(OUT / 'manifest.json', man)
    dump(OUT / 'validation.json', val)
    contact_sheet(man['parts'], OUT)
    print(json.dumps(dict(val['outlineTransfer'], posePSNR=round(val['posePSNR'], 2), depthStackPSNR=round(val['depthStackPSNR'], 2),
                          poseUnchanged=round(val['poseUnchangedPixelRatio'], 4), stackUnchanged=round(val['depthStackUnchangedPixelRatio'], 4))))
    for k, n in sorted(received.items(), key=lambda t: -t[1])[:12]:
        print(k, n)


if __name__ == '__main__':
    main()
