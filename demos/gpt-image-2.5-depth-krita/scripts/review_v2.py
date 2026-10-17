"""Review sheets of delivery-v2 parts (source | part | completion highlighted), largest hidden areas first."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
import zoom_parts
ROOT = Path(__file__).resolve().parent.parent
PD = Path(sys.argv[1]); OUTD = Path(sys.argv[2]); OUTD.mkdir(parents=True, exist_ok=True)
owner = zoom_parts.owner
rows = []
for pid, p in zoom_parts.man.items():
    a = np.array(Image.open(PD / pid / 'full.png'))[..., 3] > 0
    hid = int((a & (owner != p['index'])).sum())
    if hid >= int(sys.argv[3]) if len(sys.argv) > 3 else 30:
        rows.append((hid, pid))
rows.sort(reverse=True)
for k in range(0, len(rows), 6):
    tiles = []
    for hid, pid in rows[k:k + 6]:
        t = zoom_parts.render(pid, PD, 360); t.thumbnail((1100, 380))
        c = Image.new('RGB', (1100, 400), '#303040'); c.paste(t, (0, 20))
        ImageDraw.Draw(c).text((4, 4), f'{pid}  hidden={hid}', fill='white'); tiles.append(c)
    sheet = Image.new('RGB', (1100, 400 * len(tiles)), '#303040')
    for i, t in enumerate(tiles): sheet.paste(t, (0, 400 * i))
    sheet.save(OUTD / f'r{k // 6:02d}.png')
print(len(rows), [p for _, p in rows])
