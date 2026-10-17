"""Simulate the planned repaint (model colors inside the selection) and write before | after zooms."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parent))
import zoom_parts
ROOT = Path(__file__).resolve().parent.parent
D = ROOT / 'delivery-v2/parts'; SIM = ROOT / 'retouch-v2/sim/parts'
plan = {p['id']: p for p in json.loads((ROOT / 'retouch-v2/plan.json').read_text())['parts']}
outd = ROOT / 'retouch-v2/sim-review'; outd.mkdir(parents=True, exist_ok=True)
ids = sys.argv[1:] or list(plan)
for pid in ids:
    p = plan[pid]
    part = np.array(Image.open(D / pid / 'full.png'))
    after = part.copy()
    sel = np.array(Image.open(ROOT / p['selection'])) > 0
    for s in p['strokes']:
        x, y = s['p0']; h = s['size'] // 2
        m = np.zeros_like(sel); m[max(0, y - h):y + h + 1, max(0, x - h):x + h + 1] = True
        m &= sel & (part[..., 3] > 0)
        after[m, :3] = s['color']
    (SIM / pid).mkdir(parents=True, exist_ok=True); Image.fromarray(after).save(SIM / pid / 'full.png')
    b = zoom_parts.render(pid, D, 420); a = zoom_parts.render(pid, SIM, 420)
    sh = Image.new('RGB', (max(b.width, a.width), b.height + a.height + 24), '#303040')
    ImageDraw.Draw(sh).text((4, 4), pid + '  before / after', fill='white')
    sh.paste(b, (0, 20)); sh.paste(a, (0, b.height + 24)); sh.thumbnail((1100, 1100))
    sh.save(outd / (f"{p['level']:02d}-" + pid.replace('/', '__') + '.png'))
