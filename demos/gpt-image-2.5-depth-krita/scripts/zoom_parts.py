"""Zoomed inspection of chosen parts: complete part on gray with the hidden
(completed) region outlined in red, next to the source crop."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
PARTS = ROOT / 'delivery/parts'
man = {p['id']: p for p in json.loads((ROOT / 'delivery/manifest.json').read_text())['parts']}
src = np.array(Image.open(ROOT / 'work/source.png').convert('RGBA')).astype(float)
owner = np.array(Image.open(ROOT / 'work/owner.png')).astype(int)

def render(pid, parts_dir=PARTS, size=640):
    p = man[pid]
    full = np.array(Image.open(parts_dir / pid / 'full.png')).astype(float)
    a = full[..., 3]
    ys, xs = np.where(a > 0)
    pad = max(4, int(.08 * max(np.ptp(ys), np.ptp(xs))))
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad + 1), max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad + 1)
    hid = ((a > 0) & (owner != p['index']))[y0:y1, x0:x1]
    edge = hid & ~ndi.binary_erosion(hid)
    bg = np.full((y1 - y0, x1 - x0, 3), 128.0)
    def over(rgba):
        al = rgba[..., 3:4] / 255
        return rgba[..., :3] * al + bg * (1 - al)
    part = over(full[y0:y1, x0:x1]); part2 = part.copy()
    vis = (a[y0:y1, x0:x1] > 0) & ~hid
    part2[vis] = part2[vis] * .35 + 30  # visible source pixels dimmed; completion at full
    part2[edge] = [255, 0, 0]
    tiles = [over(src[y0:y1, x0:x1]), part, part2]
    s = max(1, int(size / max(y1 - y0, x1 - x0)))
    ims = [Image.fromarray(t.astype(np.uint8)).resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST) for t in tiles]
    out = Image.new('RGB', (sum(i.width for i in ims) + 20, ims[0].height), '#303040')
    x = 0
    for i in ims:
        out.paste(i, (x, 0)); x += i.width + 10
    return out

if __name__ == '__main__':
    outdir = Path(sys.argv[1]); outdir.mkdir(parents=True, exist_ok=True)
    pdir = Path(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] != '-' else PARTS
    for pid in sys.argv[3:]:
        render(pid, pdir).save(outdir / (pid.replace('/', '__') + '.png'))
