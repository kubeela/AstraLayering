"""Plan the Krita repair of the overlay delivery (delivery-v2).

After the overlay, visible source pixels next to a completed (hidden) area often
still carry the occluder's outline / antialias fringe ("outline ghost"): hair
edge across the ear, anklet chain on the foot, chin line on the neck. These
pixels are found within a few pixels of the hidden area where the source differs
strongly from the model completion (parts/<id>/model.png) and looks more like the
occluder (source color at the nearest hidden pixel) than like it; they are repainted
with Krita brush dabs in the model's colors, so the part reads as one
continuous whole. Manual flaws (FLAWS) add selections per part.
Writes retouch-v2/plan.json and retouch-v2/plan/<part>/selection.png.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
DEL = ROOT / 'delivery-v2'
RET = ROOT / 'retouch-v2'
PARTS = RET / 'before/parts' if (RET / 'before/parts').is_dir() else DEL / 'parts'
COVER = 'b) Basic-1'
BAND = 4          # px from the hidden area that may hold an occluder outline
DIFF = 40         # max channel difference source vs model
DARKER = 22       # source darker than model by this much (outline lines)

# manual flaws: numpy expressions over r, g, b, luma (current part colors), vis,
# hidden, shape, interior (shape inset), yn/xn (0..1 within the part bbox),
# ridge (darker than surroundings = thin line); color='model' repaints with model colors,
# or good=<expr> samples a smooth push-pull field from good pixels.
FLAWS = json.loads((RET / 'flaws.json').read_text()) if (RET / 'flaws.json').exists() else {}


def push_pull(rgb, known):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from assemble_depth import push_pull as pp
    return pp(rgb, known)


def plan_part(pid, rec, owner, src, level):
    part = np.array(Image.open(PARTS / pid / 'full.png')).astype(np.float32)
    model = np.array(Image.open(DEL / 'parts' / pid / 'model.png').convert('RGBA')).astype(np.float32)
    a = part[..., 3]; shape = a > 0
    vis = shape & (owner == rec['index']); hidden = shape & ~vis
    r, g, b = part[..., 0], part[..., 1], part[..., 2]
    luma = .299 * r + .587 * g + .114 * b
    ml = .299 * model[..., 0] + .587 * model[..., 1] + .114 * model[..., 2]
    sl = .299 * src[..., 0] + .587 * src[..., 1] + .114 * src[..., 2]
    # only pixels covered by a part in front count; shape pixels outside the source
    # silhouette (owner = background) border the real outer outline, which is kept
    covered = hidden & (level > rec['level'])
    near = ndi.binary_dilation(covered, iterations=BAND) & vis
    d = np.abs(src[..., :3] - model[..., :3]).max(-1)
    # the source at the nearest hidden pixel is the occluder's color there; a ghost
    # pixel looks more like that occluder (outline/fringe) than like the completion
    _, (iy, ix) = ndi.distance_transform_edt(~covered, return_indices=True)
    occ = src[iy, ix, :3]
    d_occ = np.abs(src[..., :3] - occ).max(-1)
    ghost = near & ((d > DIFF) | (sl < ml - DARKER)) & (d_occ < d)
    # the part's own silhouette outline (outer 2 px) is real and kept
    inner = ndi.binary_erosion(shape, iterations=2)
    ghost = ndi.binary_dilation(ghost & inner, iterations=1) & near & inner
    # smoothed model colors (normalized inside the shape) avoid speckles from noisy model edges
    w = ndi.gaussian_filter(shape.astype(np.float32), 1.2)
    field = ndi.gaussian_filter(model[..., :3] * shape[..., None], (1.2, 1.2, 0)) / np.maximum(w, 1e-3)[..., None]
    sel = ghost.copy(); notes = []
    if ghost.any():
        notes.append(f'outline ghost band: {int(ghost.sum())} visible px near the completion repainted with model colors')
    cfg = FLAWS.get(pid)
    if cfg:
        ys, xs = np.mgrid[:a.shape[0], :a.shape[1]]
        yy, xx = np.where(shape)
        yn = (ys - yy.min()) / max(1, np.ptp(yy)); xn = (xs - xx.min()) / max(1, np.ptp(xx))
        ridge = ndi.gaussian_filter(luma, 2) - luma          # thin dark lines
        interior = ndi.binary_erosion(shape, iterations=cfg.get('inset', 4))
        env = dict(r=r, g=g, b=b, luma=luma, vis=vis, hidden=hidden, shape=shape, ys=ys, xs=xs, yn=yn, xn=xn,
                   ridge=ridge, interior=interior, np=np, ndi=ndi)
        m = shape & eval(cfg['defect'], env)
        m = ndi.binary_dilation(m, iterations=cfg.get('grow', 1)) & shape
        if cfg.get('color', 'model') != 'model':
            good = shape & (a > 200) & ~m & ~ghost & eval(cfg['good'], env)
            f2 = push_pull(part[..., :3], good)
            f2 = np.where(good[..., None], f2, ndi.gaussian_filter(f2, (1.5, 1.5, 0)))
            field[m] = f2[m]
        sel |= m; notes.append(cfg['note'])
    if not sel.any():
        return None
    s = FLAWS.get(pid, {}).get('size', 3)
    pts = list(zip(*np.where(sel)))
    step = max(1, s // 2)
    pts = [(y, x) for y, x in pts if y % step == 0 and x % step == 0] + \
          [(y, x) for y, x in pts if not (y % step == 0 and x % step == 0)][::max(1, step * step)]
    strokes = [dict(p0=[int(x), int(y)], p1=[int(x) + 1, int(y)], size=s, opacity=1.0,
                    color=np.rint(field[y, x]).astype(int).tolist(), preset=COVER) for y, x in pts]
    folder = RET / 'plan' / pid; folder.mkdir(parents=True, exist_ok=True)
    Image.fromarray((sel * 255).astype(np.uint8)).save(folder / 'selection.png')
    return dict(id=pid, layer=f"{rec['level']:02d} {pid}", level=rec['level'], defectPixels=int(sel.sum()),
                ghostPixels=int(ghost.sum()), hiddenPixels=int(hidden.sum()), strokes=strokes, note='; '.join(notes),
                selection=str((folder / 'selection.png').relative_to(ROOT)))


def main():
    man = json.loads((DEL / 'manifest.json').read_text())['parts']
    owner = np.array(Image.open(ROOT / 'work/owner.png')).astype(int)
    src = np.array(Image.open(ROOT / 'work/source.png').convert('RGBA')).astype(np.float32)
    level = np.full(owner.shape, -1)
    for e in man:
        level[owner == e['index']] = e['level']
    only = set(sys.argv[1:])
    plans = [p for p in (plan_part(e['id'], e, owner, src, level) for e in man if not only or e['id'] in only) if p]
    RET.mkdir(exist_ok=True)
    (RET / 'plan.json').write_text(json.dumps(dict(parts=plans), ensure_ascii=False) + '\n')
    for p in plans:
        print(f"{p['level']:2d} {p['id']}: sel {p['defectPixels']} (ghost {p['ghostPixels']}), {len(p['strokes'])} dabs")
    print('parts', len(plans), 'dabs', sum(len(p['strokes']) for p in plans))


if __name__ == '__main__':
    main()
