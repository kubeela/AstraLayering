"""Case-specific shoulder retouch with an opaque, strapless white bodysuit.

Use the clothed, refined delivery as the input. Only the shoulder/upper-neckline
rectangles in two native layers change. The original opaque chest, torso and
pelvis covering stays in place; the upper neckline gains an opaque white band.
This script prepares pixel patches for the existing Krita retouch writer.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter1d


PARTS = ('body/torso', 'body/breast')


def rgba(path):
    return np.array(Image.open(path).convert('RGBA'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def shoulder_paint(reference):
    """Interpolate adjacent skin across authored shoulder-strap selections."""
    h, w = reference.shape[:2]
    y, x = np.indices((h, w), dtype=np.float32)
    field = reference[:, :, :3].astype(np.float64)
    selected = np.zeros((h, w), dtype=bool)
    rows = np.arange(h)
    # Coordinates were reviewed on the clothed source. Broad selections include
    # both strap outlines; samples sit outside those outlines on exposed skin.
    left = np.interp(rows, [299, 315, 335, 350, 367], [450, 444, 437, 431, 424])
    right = np.interp(rows, [299, 315, 335, 350, 367], [478, 474, 469, 469, 474])
    for mirrored in (False, True):
        lo, hi = (1024 - right, 1024 - left) if mirrored else (left, right)
        outer, inner = [], []
        for row, (a, b) in enumerate(zip(lo, hi)):
            sy = max(299, min(row, 362))
            ia, ib = int(lo[sy]), int(hi[sy])
            a = np.median(reference[sy, ia-5:ia-1, :3], axis=0)
            b = np.median(reference[sy, ib+1:ib+5, :3], axis=0)
            # The upper strap ends touch hair outside the shoulder silhouette.
            # Use neck-side skin at the same height instead of sampling hair.
            if a[0]-a[1] < 7 or a[1] < a[2]:
                a = b.copy()
            if b[0]-b[1] < 7 or b[1] < b[2]:
                b = a.copy()
            outer.append(a)
            inner.append(b)
        a = gaussian_filter1d(np.array(outer), .7, axis=0)
        b = gaussian_filter1d(np.array(inner), .7, axis=0)
        t = np.clip((x-lo[:, None]) / (hi-lo)[:, None], 0, 1)
        color = a[:, None, :] * (1-t[:, :, None]) + b[:, None, :] * t[:, :, None]
        active = (y >= 299) & (y < 367) & (x >= lo[:, None]) & (x <= hi[:, None])
        # Feather inside the selection; the selection already includes skin
        # margins, so the original dark outlines are fully painted over.
        weight = np.minimum(np.clip((x-lo[:, None])/3, 0, 1),
                            np.clip((hi[:, None]-x)/3, 0, 1))
        field[active] = (color * weight[:, :, None]
                         + field*(1-weight[:, :, None]))[active]
        selected |= active
    return field, selected


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', type=Path, required=True)
    ap.add_argument('--output', type=Path, required=True)
    args = ap.parse_args()
    source, out = args.input.resolve(), args.output.resolve()
    if out.exists() or source == out:
        raise ValueError('Use a new directory; preserve the clothed original.')
    manifest = json.loads((source/'manifest.json').read_text())
    if manifest['canvas'] != [1024, 1536] or len(manifest['parts']) != 90:
        raise ValueError('This recipe only applies to the reviewed 90-part case.')
    out.mkdir(parents=True)
    shutil.copytree(source/'parts', out/'parts',
                    ignore=shutil.ignore_patterns('before-retouch.png', 'retouch-mask.png'))
    for name in ('character.kra', 'reference.png', 'groups.json'):
        shutil.copy2(source/name, out/name)
    reference = rgba(source/'reassembled.png')
    skin, straps = shoulder_paint(reference)
    h, w = reference.shape[:2]
    y, x = np.indices((h, w), dtype=np.float64)
    top = 362.0 + 4.0*np.clip(1-((x-512)/83)**2, 0, 1)
    lo = np.interp(y, [350, 365, 380, 400], [435, 430, 423, 420])
    hi = 1024-lo
    region = (y >= 299) & (y < 404) & (x >= 418) & (x <= 606)
    band = (y >= top-1) & (x >= lo) & (x <= hi) & region
    fabric = np.median(reference[400:411, 478:546, :3].reshape(-1, 3), axis=0)
    cloth = np.broadcast_to(fabric, (h, w, 3)).copy()
    cloth -= (np.clip(np.abs(x-512)/90, 0, 1)**2)[:, :, None]*[2, 2, 3]
    # A restrained edge and narrow highlight make a readable white garment.
    edge = np.exp(-((y-top)/.65)**2)
    cloth -= edge[:, :, None]*[46, 49, 48]
    cloth += np.exp(-((y-top-1.5)/.7)**2)[:, :, None]*[2, 2, 2]
    coverage = np.clip(y-top+1, 0, 1)
    fade = np.clip((404-y)/8, 0, 1)
    weight = coverage*fade*np.clip(x-lo, 0, 1)*np.clip(hi-x, 0, 1)
    patches = []
    composite = Image.new('RGBA', (w, h))
    for entry in manifest['parts']:
        pid = entry['id']
        folder = out/'parts'/pid
        before = rgba(source/'parts'/pid/'full.png')
        after = before.copy()
        if pid in PARTS:
            opaque = before[:, :, 3] > 0
            paint = straps & (y < top) & opaque
            after[paint, :3] = np.rint(skin[paint]).clip(0, 255).astype(np.uint8)
            paint_band = band & opaque
            mixed = cloth*weight[:, :, None]+after[:, :, :3]*(1-weight[:, :, None])
            after[paint_band, :3] = np.rint(mixed[paint_band]).clip(0, 255).astype(np.uint8)
        changed = np.any(before != after, axis=2)
        if changed.any():
            assert pid in PARTS and not changed[404:].any()
            assert np.array_equal(before[:, :, 3], after[:, :, 3])
            Image.fromarray(before).save(folder/'before-retouch.png')
            Image.fromarray(after).save(folder/'full.png')
            mask = Image.fromarray(changed.astype(np.uint8)*255)
            mask.save(folder/'retouch-mask.png')
            visible = rgba(source/'parts'/pid/'visible.png')
            active = visible[:, :, 3] > 0
            visible[active, :3] = after[active, :3]
            Image.fromarray(visible).save(folder/'visible.png')
            entry['fullSha256'] = digest(folder/'full.png')
            entry['postProcessing'] = 'covered-shoulders-v1: local skin interpolation; opaque white neckline'
            patches.append(dict(id=pid, bounds=mask.getbbox(),
                reasons=['Repaint shoulder straps with adjacent skin; retain and extend opaque white chest coverage.'],
                changedPixels=int(changed.sum()), beforeSha256=digest(source/'parts'/pid/'full.png'),
                afterSha256=entry['fullSha256']))
        composite.alpha_composite(Image.open(folder/'visible.png'))
    composite.save(out/'reassembled.png')
    # Comparing to the previous refined assembly, not to the unretouched input.
    shutil.copy2(source/'reassembled.png', out/'before.png')
    manifest['variant'] = dict(id='covered-shoulders-v1', title='露肩换装底图 · 保留白色连体遮挡',
        source=os.path.relpath(source, out), sourceManifestSha256=digest(source/'manifest.json'))
    dump(out/'manifest.json', manifest)
    dump(out/'retouch-plan.json', dict(sourceCommit='0028d4a2', parts=patches,
        method='Adjacent shoulder skin interpolation and an opaque strapless white neckline.',
        sourceKraSha256=digest(source/'character.kra'),
        preserve=['All original part alpha and pose masks', '90 parts and 25 groups',
                  'Opaque white chest, torso and pelvis coverage', 'All pixels from row 404 down']))
    comparison = Image.new('RGB', (1200, 580), '#73777e')
    draw = ImageDraw.Draw(comparison)
    for i, (name, im) in enumerate([('Original white bodysuit', Image.fromarray(reference)),
                                  ('Retouched shoulders / opaque white coverage', composite)]):
        crop = im.crop((370, 270, 650, 515)).resize((560, 490), Image.Resampling.LANCZOS)
        comparison.paste(crop, (i*600+20, 55), crop)
        draw.text((i*600+20, 20), name, fill='white')
    comparison.save(out/'shoulder-comparison.png')
    print(json.dumps(dict(output=str(out), changedParts=[p['id'] for p in patches],
                          changedPixels=sum(p['changedPixels'] for p in patches)), indent=2))


if __name__ == '__main__':
    main()
