"""Per-part review sheets: source, control, completed part, completion emphasis."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
PARTS = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'parts'
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'retouch/review'
CELL = 300
OUT.mkdir(parents=True, exist_ok=True)
man = json.loads((ROOT / 'manifest.json').read_text())
src = np.array(Image.open(ROOT / '.work/source.png').convert('RGBA'))
owner = np.array(Image.open(ROOT / '.work/owner.png')).astype(int)

def checker(h, w, s=8):
    yy, xx = np.indices((h, w))
    c = np.where(((yy // s) + (xx // s)) % 2, 205, 245).astype(np.uint8)
    return np.dstack([c, c, c]).astype(float)

def over(rgba, bg):
    a = rgba[..., 3:4] / 255
    return (rgba[..., :3] * a + bg * (1 - a)).astype(np.uint8)

def panel(arr, scale):
    im = Image.fromarray(arr)
    return im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.NEAREST if scale > 2 else Image.LANCZOS)

parts = sorted(man['parts'], key=lambda p: p['level'])
PER = 4
for page in range(0, len(parts), PER):
    sheet = Image.new('RGB', (2 * (3 * CELL + 20), 2 * (CELL + 26)), '#6f7484')
    d = ImageDraw.Draw(sheet)
    for i, p in enumerate(parts[page:page + PER]):
        f = PARTS / p['id']
        full = np.array(Image.open(f / 'full.png'))
        ctrl = np.array(Image.open(f / 'control.png').convert('RGB'))
        a = full[..., 3]
        ys, xs = np.where(a > 0)
        pad = max(6, int(.12 * max(np.ptp(ys), np.ptp(xs))))
        y0, y1 = max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad + 1)
        x0, x1 = max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad + 1)
        h, w = y1 - y0, x1 - x0
        s = min(CELL / w, CELL / h)
        bg = checker(h, w)
        vis = (owner == p['index'])[y0:y1, x0:x1]
        emph = full[y0:y1, x0:x1].astype(float)
        emph[vis, :3] = emph[vis, :3] * .45 + 40 * .55  # darken source-visible pixels
        tiles = [over(src[y0:y1, x0:x1].astype(float), bg),
                 over(full[y0:y1, x0:x1].astype(float), bg), over(emph, np.full((h, w, 3), 95.0))]
        ox, oy = (i % 2) * (3 * CELL + 20) + 6, (i // 2) * (CELL + 26) + 4
        for j, t in enumerate(tiles):
            sheet.paste(panel(t, s), (ox + j * CELL, oy))
        d.text((ox, oy + CELL + 4), f"L{p['level']} {p['id']}  ({w}x{h}px, x{s:.1f})", fill='#ffffff')
    sheet.save(OUT / f'review-{page // PER + 1:02d}.jpg', quality=92)
print('sheets', (len(parts) + PER - 1) // PER)
