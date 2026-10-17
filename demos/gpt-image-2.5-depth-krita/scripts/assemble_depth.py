"""Register gpt-image-2.5 completions back to the standard part shapes.

Each delivered part has canvas coordinates, alpha equal to its completed SVG
shape (the color-block standard) and the model's own pixels everywhere inside
it, with low-frequency tone matched to the source. The part's visible source
pixels are then overlaid on the completion. Every part uses its model output
(a failed generation is regenerated, never replaced by source pixels); the
latest regeneration (generated-v2.png) wins. Seams and occluder outlines left
by the overlay are repaired afterwards with Krita brushes (see plan_retouch.py),
which use the model completion saved as model.png.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

from prepare_depth import OUT, STANDARD, W, H, dump


def generation(folder):
    v2 = folder / 'generated-v2.png'
    return v2 if v2.exists() else folder / 'generated.png'


def generated_on_canvas(folder, rec, matrix=None):
    """Warp a crop-space generation into canvas space (default: crop placement)."""
    g = np.array(Image.open(generation(folder)).convert('RGBA')).astype(np.float32)
    rgb = g[:, :, :3] * (g[:, :, 3:] / 255)  # premultiplied for clean warping
    x0, y0, x1, y1 = rec['crop']
    sx, sy = (x1 - x0) / g.shape[1], (y1 - y0) / g.shape[0]
    base = np.array([[sx, 0, x0], [0, sy, y0], [0, 0, 1]], np.float64)
    m = (matrix if matrix is not None else np.eye(3)) @ base
    flags = cv2.INTER_AREA if max(sx, sy) < 1 else cv2.INTER_CUBIC
    out = cv2.warpAffine(np.dstack([rgb, g[:, :, 3]]), m[:2], (W, H), flags=flags, borderValue=0)
    a = np.clip(out[:, :, 3], 0, 255)
    rgb = np.where(a[:, :, None] > 1, out[:, :, :3] / np.maximum(a[:, :, None], 1) * 255, 0)
    return np.clip(rgb, 0, 255), a


def register(folder, rec, full, src, visible):
    """Map the model output onto the source by its preserved (red) pixels.

    gpt-image-2.5 does not keep framing, so candidates are: plain crop placement,
    bbox fit to the standard shape, SIFT+RANSAC similarity on visible content,
    each optionally refined by ECC. The lowest error on visible pixels wins."""
    tgt = full > 127
    sel = ndi.binary_erosion(visible & (src[:, :, 3] > 250), iterations=1)
    if sel.sum() < 30:
        sel = visible & (src[:, :, 3] > 127)

    def iou(a):
        m = a > 127
        return float((m & tgt).sum() / max(1, (m | tgt).sum()))

    def score(rgb, a):
        if sel.sum() < 30:
            return 1 - iou(a)  # nothing visible: fit the standard shape
        cov = (a[sel] > 127).mean()
        return masked_err(rgb, src, sel) / 255 + (1 - cov) * .5 + (1 - iou(a)) * .25

    cands = {'crop': np.eye(3)}
    rgb0, a0 = generated_on_canvas(folder, rec)
    m = a0 > 127
    if m.sum() > 16:
        ys, xs = np.where(m); ty, tx = np.where(tgt)
        gb = [xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]
        tb = [tx.min(), ty.min(), tx.max() + 1, ty.max() + 1]
        sx, sy = (tb[2] - tb[0]) / (gb[2] - gb[0]), (tb[3] - tb[1]) / (gb[3] - gb[1])
        if .6 < sx < 1.6 and .6 < sy < 1.6:
            cands['bbox'] = np.array([[sx, 0, tb[0] - gb[0] * sx], [0, sy, tb[1] - gb[1] * sy], [0, 0, 1]])
    S = sift_similarity(rgb0, a0, src, visible, full)
    if S is not None:
        cands['sift'] = S
    results = []
    for name, M in list(cands.items()):
        rgb, a = (rgb0, a0) if name == 'crop' else generated_on_canvas(folder, rec, M)
        E = mask_ecc(a, full)
        if E is not None:
            cands[name + '+shape'] = E @ M
    for name, M in cands.items():
        rgb, a = (rgb0, a0) if name == 'crop' else generated_on_canvas(folder, rec, M)
        results.append((score(rgb, a), name, M, rgb, a))
        E = ecc_refine(rgb, a, src, sel, full)
        if E is not None:
            r2, a2 = generated_on_canvas(folder, rec, E @ M)
            results.append((score(r2, a2), name + '+ecc', E @ M, r2, a2))
    err, name, M, rgb, a = min(results, key=lambda r: r[0])
    return rgb, a, dict(method=name, score=round(err, 4), iou=round(iou(a), 4),
                        visibleError=round(masked_err(rgb, src, sel), 2) if sel.sum() >= 30 else None,
                        candidates={r[1]: round(r[0], 4) for r in results}, matrix=np.round(M, 5).tolist())


def window(full, pad=24):
    ys, xs = np.where(full > 0)
    return max(0, ys.min() - pad), min(H, ys.max() + pad), max(0, xs.min() - pad), min(W, xs.max() + pad)


def gray(rgb, a):
    g = cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    return g * (a / 255) + 128 * (1 - a / 255)


def sift_similarity(rgb, a, src, visible, full):
    """Similarity in canvas space from generated (crop-placed) to source."""
    y0, y1, x0, x1 = window(full, 40)
    G = gray(rgb[y0:y1, x0:x1], a[y0:y1, x0:x1]).astype(np.uint8)
    Sg = gray(src[y0:y1, x0:x1, :3].astype(np.float32), src[y0:y1, x0:x1, 3].astype(np.float32)).astype(np.uint8)
    up = max(1, min(4, 600 / max(G.shape)))
    if up > 1:
        G = cv2.resize(G, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
        Sg = cv2.resize(Sg, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    ms = cv2.resize(ndi.binary_dilation(visible, iterations=3)[y0:y1, x0:x1].astype(np.uint8), Sg.shape[::-1], interpolation=cv2.INTER_NEAREST)
    mg = cv2.resize((a[y0:y1, x0:x1] > 20).astype(np.uint8), G.shape[::-1], interpolation=cv2.INTER_NEAREST)
    sift = cv2.SIFT_create(4000)
    kg, dg = sift.detectAndCompute(G, mg * 255)
    ks, ds = sift.detectAndCompute(Sg, ms * 255)
    if dg is None or ds is None or len(kg) < 6 or len(ks) < 6:
        return None
    matches = cv2.BFMatcher().knnMatch(dg, ds, k=2)
    good = [m for m, n in (p for p in matches if len(p) == 2) if m.distance < .78 * n.distance]
    if len(good) < 6:
        return None
    pg = np.float32([kg[m.queryIdx].pt for m in good]) / up + [x0, y0]
    ps = np.float32([ks[m.trainIdx].pt for m in good]) / up + [x0, y0]
    A, inl = cv2.estimateAffinePartial2D(pg, ps, method=cv2.RANSAC, ransacReprojThreshold=3)
    if A is None or inl.sum() < 6:
        return None
    s = np.sqrt(abs(np.linalg.det(A[:, :2])))
    if not .6 < s < 1.6:
        return None
    return np.vstack([A, [0, 0, 1]]).astype(np.float64)


def mask_ecc(a, full):
    """Affine that best overlays the model's alpha on the standard shape."""
    y0, y1, x0, x1 = window(full, 60)
    sigma = max(2, .03 * max(y1 - y0, x1 - x0))
    T = ndi.gaussian_filter((full[y0:y1, x0:x1] > 127).astype(np.float32), sigma)
    G = ndi.gaussian_filter((a[y0:y1, x0:x1] > 127).astype(np.float32), sigma)
    if G.sum() < 10:
        return None
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(T, G, warp, cv2.MOTION_AFFINE,
                                       (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), None, 1)
    except cv2.error:
        return None
    lin = warp[:, :2]
    if not .5 < abs(np.linalg.det(lin)) < 2 or np.abs(lin - np.eye(2)).max() > .5:
        return None
    Tm = np.vstack([warp, [0, 0, 1]]).astype(np.float64)
    off = np.array([[1, 0, x0], [0, 1, y0], [0, 0, 1]], np.float64)
    return off @ np.linalg.inv(Tm) @ np.linalg.inv(off)


def ecc_refine(rgb, a, src, sel, full):
    if sel.sum() < 200:
        return None
    y0, y1, x0, x1 = window(full)
    S = gray(src[y0:y1, x0:x1, :3].astype(np.float32), src[y0:y1, x0:x1, 3].astype(np.float32))
    G = gray(rgb[y0:y1, x0:x1], a[y0:y1, x0:x1])
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(S, G, warp, cv2.MOTION_AFFINE,
                                       (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 150, 1e-5),
                                       sel[y0:y1, x0:x1].astype(np.uint8), 5)
    except cv2.error:
        return None
    lin = warp[:, :2]
    if abs(np.linalg.det(lin) - 1) > .2 or np.abs(lin - np.eye(2)).max() > .25 or np.abs(warp[:, 2]).max() > 60:
        return None
    # ECC maps source coords -> generated coords; invert into a canvas warp.
    T = np.vstack([warp, [0, 0, 1]]).astype(np.float64)
    off = np.array([[1, 0, x0], [0, 1, y0], [0, 0, 1]], np.float64)
    return off @ np.linalg.inv(T) @ np.linalg.inv(off)


def masked_err(rgb, src, sel):
    return float(np.abs(rgb[sel] - src[:, :, :3][sel].astype(np.float32)).mean())


def normalized_blur(values, weight, sigma):
    num = ndi.gaussian_filter(values * weight[..., None], (sigma, sigma, 0))
    den = ndi.gaussian_filter(weight, sigma)[..., None]
    return num / np.maximum(den, 1e-4), den[..., 0]


def push_pull(values, known):
    """Smooth membrane fill of unknown pixels from known ones (no nearest streaks)."""
    if known.all():
        return values
    v, w = values * known[..., None], known.astype(np.float32)
    levels = []
    while min(w.shape) > 2:
        levels.append((v, w))
        h2, w2 = (w.shape[0] + 1) // 2, (w.shape[1] + 1) // 2
        v = cv2.resize(cv2.GaussianBlur(v, (3, 3), 0), (w2, h2), interpolation=cv2.INTER_AREA)
        w = cv2.resize(cv2.GaussianBlur(w, (3, 3), 0), (w2, h2), interpolation=cv2.INTER_AREA)
    fill = v / np.maximum(w, 1e-6)[..., None]
    for v, w in reversed(levels):
        up = cv2.resize(fill, (w.shape[1], w.shape[0]), interpolation=cv2.INTER_LINEAR)
        k = np.clip(w, 0, 1)[..., None]
        fill = v / np.maximum(w, 1e-6)[..., None] * k + up * (1 - k)
    return np.where(known[..., None], values, fill)


def finish(rgb, a, full, src, visible, pid, paste_source=True):
    shape = full > 0
    gen = rgb.astype(np.float32)
    have = a > 127
    if not have.any():
        raise ValueError(pid + ': model output empty after registration')
    stats = {}
    paint = shape
    # Pixels of the standard shape without model content: smooth fill seeded from
    # model pixels (and the part's own visible source pixels when pasting).
    hole = paint & ~have
    if hole.any():
        y0, y1, x0, x1 = window(full, 8)
        if paste_source:
            known = (have | (visible & (src[:, :, 3] > 200)))[y0:y1, x0:x1]
            vals = np.where(visible[..., None], src[:, :, :3].astype(np.float32), gen)[y0:y1, x0:x1]
        else:
            known, vals = have[y0:y1, x0:x1], gen[y0:y1, x0:x1]
        if known.any():
            filled = push_pull(vals, known)
            sub = hole[y0:y1, x0:x1]
            gen[y0:y1, x0:x1][sub] = filled[sub]
            stats['holeFilledPixels'] = int(hole.sum())
        have = have | hole
    hidden = shape & ~visible
    seed = ndi.binary_erosion(visible & (src[:, :, 3] > 250), iterations=2) & have
    if not paste_source:
        # outlines of other parts lie on the visible side of the color-block
        # boundary; they would pull the tone field dark, so drop strong outliers
        seed &= np.abs(src[:, :, :3].astype(np.float32) - gen).max(-1) < 48
    stats['hiddenPixels'] = int(hidden.sum())
    if seed.sum() >= 20 and paint.any():
        # Smooth color correction field from (source - model) on owned pixels;
        # model texture is kept, only low-frequency tone shifts toward the source.
        diff = src[:, :, :3].astype(np.float32) - gen
        w = seed.astype(np.float32)
        near, den = normalized_blur(diff, w, 12)
        far, _ = normalized_blur(diff, w, 48)
        glob = np.median(diff[seed], axis=0)
        t = np.clip(den / .15, 0, 1)[..., None]
        delta = np.clip(near * t + far * (1 - t), -40, 40)
        if not np.isfinite(delta).all():
            delta = np.broadcast_to(glob, delta.shape)
        gen[paint] = np.clip(gen[paint] + delta[paint], 0, 255)
        stats['meanCorrection'] = np.round(np.abs(delta[paint]).mean(0), 2).tolist()
    model = np.rint(gen).astype(np.uint8)
    if paste_source:
        gen[visible] = src[:, :, :3][visible]
    return np.rint(gen).astype(np.uint8), model, stats


def is_skin(pid):
    return pid == 'neck' or pid.startswith('arms/') or pid.endswith(('/leg', '/foot'))


def contact_sheet(entries, out, kind='full', label='full'):
    thumb, cell_h, cols = 176, 230, 6
    for page in range((len(entries) + 23) // 24):
        chunk = entries[page * 24:(page + 1) * 24]
        sheet = Image.new('RGB', (cols * thumb, 4 * cell_h), '#8a8fa0')
        draw = ImageDraw.Draw(sheet)
        for i, p in enumerate(chunk):
            im = Image.open(out / 'parts' / p['id'] / f'{kind}.png')
            b = im.getchannel('A').point(lambda v: 255 if v > 127 else 0).getbbox()
            if b:
                im = im.crop(b)
                s = min((thumb - 16) / im.width, 188 / im.height)
                im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.Resampling.LANCZOS)
                sheet.paste(im, ((i % cols) * thumb + (thumb - im.width) // 2, (i // cols) * cell_h + 8), im)
            words = p['id'].replace('head_accessories/', 'acc/').split('/')
            draw.text(((i % cols) * thumb + 5, (i // cols) * cell_h + 199),
                      f"L{p['level']} " + '/'.join(words[:-1]) + '\n' + words[-1], fill='#101018')
        sheet.save(out / f'contact-{label}-{page + 1}.jpg', quality=92)


def psnr(a, b, m):
    e = ((a.astype(float) - b.astype(float)) ** 2)[m].mean()
    return float(10 * np.log10(255 ** 2 / max(e, 1e-9)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', type=Path, default=OUT / 'work')
    ap.add_argument('--output', type=Path, default=OUT / 'delivery')
    ap.add_argument('--only', nargs='*')
    args = ap.parse_args()
    work, out = args.work.resolve(), args.output.resolve()
    man = json.loads((work / 'manifest.json').read_text())
    src = np.array(Image.open(work / 'source.png').convert('RGBA'))
    src[src[:, :, 3] == 0] = 0
    owner = np.array(Image.open(work / 'owner.png')).astype(np.int32)
    missing = [p['id'] for p in man['parts'] if not (work / 'parts' / p['id'] / 'generated.png').exists()]
    if missing:
        raise SystemExit(f'Missing {len(missing)} generations: ' + ', '.join(missing))
    old = {}
    if (out / 'manifest.json').exists():
        old = {p['id']: p for p in json.loads((out / 'manifest.json').read_text())['parts']}
    entries = []
    for rec in man['parts']:
        pid = rec['id']; folder = work / 'parts' / pid; target = out / 'parts' / pid
        target.mkdir(parents=True, exist_ok=True)
        full = np.array(Image.open(folder / 'full-mask.png'))
        visible = owner == rec['index']
        if args.only is not None and pid not in args.only and pid in old and (target / 'full.png').exists():
            entries.append(old[pid]); continue
        rgb, a, reg = register(folder, rec, full, src, visible)
        color, model_rgb, stats = finish(rgb, a, full, src, visible, pid)
        # report how far the model's own pixels are from the source where the part is visible
        sel = ndi.binary_erosion(visible & (src[:, :, 3] > 250), iterations=1)
        if sel.sum() >= 10:
            d = np.abs(model_rgb[sel].astype(int) - src[:, :, :3][sel]).max(-1)
            stats['visibleDeviation'] = dict(meanAbs=round(float(d.mean()), 2), over32=round(float((d > 32).mean()), 4),
                                             pixels=int(sel.sum()))
        rgba = np.dstack([color, full]); rgba[full == 0] = 0
        Image.fromarray(rgba).save(target / 'full.png')
        mrgba = np.dstack([model_rgb, full]); mrgba[full == 0] = 0
        Image.fromarray(mrgba).save(target / 'model.png')  # completion before the overlay (retouch color source)
        # Pose mask: on visible pixels alpha becomes the source alpha; elsewhere 0.
        pose = np.zeros((H, W), np.uint8)
        pose[visible] = np.clip(np.rint(src[:, :, 3][visible] * 255.0 / np.maximum(full[visible], 1)), 0, 255)
        Image.fromarray(pose).save(target / 'pose-mask.png')
        shutil.copy2(folder / 'control.png', target / 'control.png')
        gfile = generation(folder)
        if gfile.name == 'generated-v2.png':
            info = json.loads((folder / 'generated-v2.json').read_text())
            prompt, model, variant = folder / 'prompt-v2.txt', info['model'], 'v2 (' + info['image1'] + ')'
        else:
            used = folder / 'used-prompt.txt'
            prompt = used if used.exists() else folder / 'prompt.txt'
            model = 'gpt-image-2.5-' + ((folder / 'used-model.txt').read_text().strip() if (folder / 'used-model.txt').exists() else 'flare')
            variant = used.exists() and 'override' or 'template'
        shutil.copy2(prompt, target / 'prompt.txt')
        entries.append(dict(rec, model=model, promptVariant=variant, generation=gfile.name,
                            registration=reg, **stats,
                            generatedSha256=hashlib.sha256(gfile.read_bytes()).hexdigest()))
    # Composite twice: with pose masks (original pose) and plain depth stacking of complete parts.
    posed = np.zeros((H, W, 4), np.float32); plain = np.zeros((H, W, 4), np.float32)
    for e in sorted(entries, key=lambda e: e['level']):
        im = np.array(Image.open(out / 'parts' / e['id'] / 'full.png')).astype(np.float32) / 255
        pm = np.array(Image.open(out / 'parts' / e['id'] / 'pose-mask.png')).astype(np.float32) / 255
        for acc, alpha in ((plain, im[:, :, 3]), (posed, im[:, :, 3] * pm)):
            a = alpha[..., None]
            acc[:, :, :3] = im[:, :, :3] * a + acc[:, :, :3] * (1 - a)
            acc[:, :, 3:] = a + acc[:, :, 3:] * (1 - a)
    def unpremul(acc):
        o = acc.copy(); o[:, :, :3] = np.where(acc[:, :, 3:] > 0, acc[:, :, :3] / np.maximum(acc[:, :, 3:], 1e-6), 0)
        return np.rint(np.clip(o, 0, 1) * 255).astype(np.uint8)
    posed, plain = unpremul(posed), unpremul(plain)
    Image.fromarray(posed).save(out / 'reassembled-pose.png')
    Image.fromarray(plain).save(out / 'reassembled-depth-stack.png')
    subj = src[:, :, 3] > 127
    report = dict(parts=len(entries), order='occlusion.json levels, back to front',
                  posePSNR=psnr(posed[:, :, :3], src[:, :, :3], subj),
                  depthStackPSNR=psnr(plain[:, :, :3], src[:, :, :3], subj),
                  depthStackAlphaMeanAbs=float(np.abs(plain[:, :, 3].astype(int) - src[:, :, 3]).mean()),
                  poseAlphaMaxAbs=int(np.abs(posed[:, :, 3].astype(int) - src[:, :, 3]).max()),
                  poseUnchangedPixelRatio=float((np.abs(posed[:, :, :3].astype(int) - src[:, :, :3]).max(2) <= 2)[subj].mean()),
                  depthStackUnchangedPixelRatio=float((np.abs(plain[:, :, :3].astype(int) - src[:, :, :3]).max(2) <= 2)[subj].mean()),
                  regenerated=[e['id'] for e in entries if e.get('generation') == 'generated-v2.png'],
                  largestVisibleDeviation=sorted(([e['id'], e['visibleDeviation']['meanAbs'], e['visibleDeviation']['over32']]
                                                  for e in entries if e.get('visibleDeviation')), key=lambda r: -r[1])[:15],
                  lowIoU=[(e['id'], e['registration']['iou']) for e in entries if e['registration']['iou'] < .8])
    dump(out / 'manifest.json', dict(man, parts=entries))
    dump(out / 'validation.json', report)
    shutil.copy2(work / 'source.png', out / 'reference.png')
    shutil.copy2(STANDARD / 'groups.json', out / 'groups.json')
    shutil.copy2(STANDARD / 'occlusion.json', out / 'occlusion.json')
    contact_sheet(entries, out)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
