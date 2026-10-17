"""Verify and apply the Krita brush retouch (krita_retouch.py output).

Overlay delivery (delivery-v2 / retouch-v2). For every edited layer: alpha must
equal the part mask and changed pixels must lie inside the repair selection
(outline-ghost band + manual flaws; it may include visible pixels, which carry
occluder outlines after the overlay).
Then parts/*/full.png, the composites, manifest.json and validation.json are
updated, and before/after zooms are written to retouch/before-after/.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from assemble_depth import contact_sheet, psnr  # noqa: E402
from prepare_depth import W, H, dump  # noqa: E402
import zoom_parts  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'delivery-v2'
RET = ROOT / 'retouch-v2'


def main():
    log = json.loads((RET / 'krita-retouch.json').read_text())
    if not log.get('ok'):
        raise SystemExit('Krita retouch failed: ' + log.get('error', ''))
    plan = {p['id']: p for p in json.loads((RET / 'plan.json').read_text())['parts']}
    flaws = json.loads((RET / 'flaws.json').read_text())
    man = json.loads((OUT / 'manifest.json').read_text())
    src = np.array(Image.open(ROOT / 'work/source.png').convert('RGBA'))
    owner = np.array(Image.open(ROOT / 'work/owner.png')).astype(int)
    (RET / 'before-after').mkdir(exist_ok=True)
    results = {}
    for e in man['parts']:
        p = plan.get(e['id'])
        if not p:
            continue
        before = np.array(Image.open(OUT / 'parts' / e['id'] / 'full.png'))
        bgra = np.frombuffer((RET / 'krita-out' / f"{p['level']:02d}.bgra").read_bytes(), np.uint8).reshape(H, W, 4)
        after = bgra[..., [2, 1, 0, 3]].copy()
        after[after[..., 3] == 0] = 0
        sel = np.array(Image.open(ROOT / p['selection'])) > 0
        changed = (after != before).any(-1)
        checks = dict(alphaUnchanged=bool((after[..., 3] == before[..., 3]).all()),
                      changesInsideSelection=bool(not (changed & ~sel).any()))
        if not all(checks.values()):
            raise SystemExit(f"{e['id']}: retouch check failed {checks}")
        Image.fromarray(after).save(OUT / 'parts' / e['id'] / 'full.png')
        d = np.abs(after[..., :3].astype(int) - before[..., :3].astype(int)).max(-1)
        results[e['id']] = dict(checks, changedPixels=int(changed.sum()), selectionPixels=int(sel.sum()),
                                meanChange=round(float(d[changed].mean()), 1) if changed.any() else 0)
        e['retouch'] = dict(tool='Krita ' + log['version'] + ' brush (paintLine, alpha-locked, selection = repair mask)',
                            note=p['note'], strokes=len(p['strokes']),
                            **results[e['id']])
        b = zoom_parts.render(e['id'], RET / 'before/parts', 420)
        a = zoom_parts.render(e['id'], OUT / 'parts', 420)
        sheet = Image.new('RGB', (b.width, b.height + a.height + 8), '#303040')
        sheet.paste(b, (0, 0)); sheet.paste(a, (0, b.height + 8))
        sheet.save(RET / 'before-after' / (f"{p['level']:02d}-" + e['id'].replace('/', '__') + '.png'))
    plain = np.zeros((H, W, 4), np.float32); posed = np.zeros((H, W, 4), np.float32)
    for e in sorted(man['parts'], key=lambda e: e['level']):
        im = np.array(Image.open(OUT / 'parts' / e['id'] / 'full.png')).astype(np.float32) / 255
        pm = np.array(Image.open(OUT / 'parts' / e['id'] / 'pose-mask.png')).astype(np.float32) / 255
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
    kr = np.array(Image.open(OUT / 'krita-reopened.png').convert('RGBA')).astype(int)
    subj = src[:, :, 3] > 127
    val = json.loads((OUT / 'validation.json').read_text())
    val.update(posePSNR=psnr(posed[:, :, :3], src[:, :, :3], subj),
               depthStackPSNR=psnr(plain[:, :, :3], src[:, :, :3], subj),
               depthStackUnchangedPixelRatio=float((np.abs(plain[:, :, :3].astype(int) - src[:, :, :3]).max(2) <= 2)[subj].mean()),
               poseUnchangedPixelRatio=float((np.abs(posed[:, :, :3].astype(int) - src[:, :, :3]).max(2) <= 2)[subj].mean()),
               kritaReopenedVsDepthStackMaxAbs=int(np.abs(kr - plain.astype(int)).max()),
               retouch=dict(parts=len(results), strokes=sum(len(plan[k]['strokes']) for k in results),
                            allChecksPassed=all(all(v[c] for c in ('alphaUnchanged', 'changesInsideSelection'))
                                                for v in results.values()),
                            manualFlaws=sorted(flaws), kraReopenVerified=log['reopenedVerified']))
    dump(OUT / 'manifest.json', man)
    dump(OUT / 'validation.json', val)
    contact_sheet(man['parts'], OUT)
    print(json.dumps(dict(val['retouch'], posePSNR=round(val['posePSNR'], 2), depthStackPSNR=round(val['depthStackPSNR'], 2),
                          kritaVsStack=val['kritaReopenedVsDepthStackMaxAbs'])))
    for k, v in results.items():
        print(k, v['changedPixels'], v['meanChange'])


if __name__ == '__main__':
    main()
