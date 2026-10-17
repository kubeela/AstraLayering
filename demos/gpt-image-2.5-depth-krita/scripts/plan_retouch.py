"""Plan Krita brush retouches for flawed part completions.

Every defect mask is restricted to the part's HIDDEN pixels (completed by the
model), so visible source pixels are never touched. Stroke colors are sampled
from the part's own good pixels (visible or clean hidden ones) with a smooth
push-pull field; hair is painted along the local strand direction.
Writes retouch/flaws.json, retouch/plan.json and retouch/plan/<part>/selection.png.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
from assemble_depth import push_pull  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RET = ROOT / 'retouch'
# plan from the pre-retouch parts (backed up before the first Krita run)
PARTS = RET / 'before/parts' if (RET / 'before/parts').is_dir() else ROOT / 'parts'
COVER = 'b) Basic-1'  # hard round: full coverage inside the selection; colors come from a smooth field

# defect / good are numpy expressions over r, g, b, luma (part colors) and
# vis (visible source pixels); defect is always intersected with hidden.
FLAWS = {
    'hair/back_hair/lock_right': dict(note='hidden mid strip painted as a yellow-cream glow; repaint lavender-white hair along strands',
                                      defect='r - b > 4', good='b >= r - 1', mode='hair', size=9),
    'hair/back_hair/lock_left': dict(note='hidden mid tinted pink/skin; repaint with hair colors along strands',
                                     defect='(r - b > 4) | (r - g > 8)', good='(b >= r - 1) & (r - g <= 6)', mode='hair', size=9),
    'legs/leg_right/foot': dict(note='ghost anklet line and over-bright healed skin under the anklet; repaint with surrounding skin (the faint outline left is the anklet shadow in visible source pixels, kept)',
                                defect='hidden', good='vis & (r > g + 3) & (luma > 175)', avoidEdge=3, mode='dab', size=6),
    'legs/leg_left/foot': dict(note='ghost anklet line and over-bright healed skin under the anklet; repaint with surrounding skin (the faint outline left is the anklet shadow in visible source pixels, kept)',
                               defect='hidden', good='vis & (r > g + 3) & (luma > 175)', avoidEdge=3, mode='dab', size=6),
    'neck': dict(note='ghost chin shadow (heart/V) under the face and duplicated collarbone V under the torso; smooth skin',
                 defect='hidden', good='vis & (r > 170) & (r > g + 3)', avoidEdge=6, mode='dab', size=14),
    'head_accessories/left_earring/ear_stud': dict(note='hidden stud pixels are skin/grey; repaint as the silver-pearl stud',
                                                   defect='hidden', good='vis', mode='dab', size=3),
    'head_accessories/right_earring/ear_stud': dict(note='hidden stud pixels are skin/grey; repaint as the silver-pearl stud',
                                                    defect='hidden', good='vis', mode='dab', size=3),
    'face/ear_right': dict(note='a hair strand (white/lavender) painted into the hidden ear; repaint as ear rim skin',
                           defect='b >= r - 12', good='vis & (r > g + 8)', mode='dab', size=5),
    'face/ear_left': dict(note='a hair strand (white/lavender) painted into the hidden ear; repaint as ear rim skin',
                          defect='b >= r - 12', good='vis & (r > g + 8)', mode='dab', size=5),
    'face/eye_left/sclera': dict(note='dark iris rim stroke left in the hidden center; fill sclera white-grey',
                                 defect='hidden', good='vis & (luma > 170)', mode='dab', size=5),
    'face/eye_right/sclera': dict(note='light iris rim line and white highlight dot in the hidden part; fill sclera white-grey',
                                  defect='hidden', good='vis & (luma > 170)', mode='dab', size=5),
    'face/eye_left/iris': dict(note='hidden top band painted as eyelid brown; repaint with the iris top navy',
                               defect='r > b - 6', good='vis & (b > r + 6)', mode='dab', size=4),
    'face/eye_right/iris': dict(note='hidden top band painted as eyelid brown; repaint with the iris top navy',
                                defect='r > b - 6', good='vis & (b > r + 6)', mode='dab', size=4),
    'face/mouth/lower_teeth': dict(note='dull pink/brown; should read as an off-white teeth band (color from the lightest visible upper teeth)',
                                   defect='hidden', fixed=[234, 218, 210], mode='dab', size=3),
    'face/mouth/upper_teeth': dict(note='dark lip red at the hidden ends; recolor as teeth',
                                   defect='r - g > 30', fixed=[230, 212, 203], mode='dab', size=3),
    'head_accessories/forehead_ornament/upper_sapphire_mount': dict(note='cream/yellow pixels on the hidden left frame; silver frame',
                                                                    defect='r - b > 4', good='b >= r', mode='dab', size=3),
    'head_accessories/right_crown_ribbon/gem_suspension/crown_gem_link': dict(note='brown/orange hidden top; silver link',
                                                                              defect='r - b > 4', good='b >= r', mode='dab', size=3),
    'head_accessories/left_crown_ribbon/jeweled_suspension/inter_gem_connector': dict(note='yellow/gold pixels; silver-grey connector',
                                                                                      defect='r - b > 4', good='b >= r', mode='dab', size=3),
    'head_accessories/right_crown_ribbon/gem_suspension/inter_gem_link': dict(note='yellow pixel; silver-grey link',
                                                                              defect='r - b > 4', good='b >= r', mode='dab', size=3),
    'head_accessories/left_crown_ribbon/jeweled_suspension/ribbon_connector': dict(note='white + blue gem residue in the hidden bottom; silver connector',
                                                                                   defect='hidden', good='vis', mode='dab', size=3),
    'hair/side_hair_right': dict(note='dark/blue gem blob at the hidden top tip; repaint as hair',
                                 defect='(luma < 175) | (b - r > 22)', good='(luma >= 175) & (b - r <= 18)', mode='hair', size=4),
}

# Reviewed but left as is: the residue lies in VISIBLE pixels (source pixels the
# depth standard assigns to this part), which the retouch never repaints.
KEPT = {
    'face/face_base': 'eye-oval / eyelash outline and the hair-parting wedge are source pixels owned by face_base '
                      '(ownership residue of the color-block standard); its hidden completion is clean',
    'hair/hair_cap': 'faint earring-diamond ghosts in the hidden lower sides are low contrast and behind the face; acceptable',
    'arms/arm_left/upper_arm': 'hidden top under the torso is continuous skin; no defect',
    'arms/arm_right/upper_arm': 'hidden top under the torso is continuous skin; no defect',
    'head_accessories/crown_frame': 'grey-white rounded ends in the hidden area follow the frame silver; acceptable',
}


def load(pid):
    return np.array(Image.open(PARTS / pid / 'full.png')).astype(np.float32)


def orientation(luma, alpha, sigma=5):
    """Strand direction (unit vector, perpendicular to the dominant gradient)."""
    gy, gx = np.gradient(ndi.gaussian_filter(luma, 1.5))
    w = (alpha > 0).astype(np.float32)
    jxx = ndi.gaussian_filter(gx * gx * w, sigma)
    jyy = ndi.gaussian_filter(gy * gy * w, sigma)
    jxy = ndi.gaussian_filter(gx * gy * w, sigma)
    theta = .5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2
    return np.cos(theta), np.sin(theta)


def plan_part(pid, cfg, man, owner):
    rec = man[pid]
    part = load(pid)
    a = part[..., 3]
    r, g, b = part[..., 0], part[..., 1], part[..., 2]
    luma = .299 * r + .587 * g + .114 * b
    shape = a > 0
    vis = shape & (owner == rec['index'])
    hidden = shape & ~vis
    env = dict(r=r, g=g, b=b, luma=luma, vis=vis, hidden=hidden, np=np)
    defect = hidden & eval(cfg['defect'], env)
    # close tiny gaps so strokes cover whole blemishes, still inside hidden
    defect = ndi.binary_dilation(defect, iterations=1 if cfg['size'] <= 4 else 2) & hidden
    if 'fixed' in cfg:
        field = np.broadcast_to(np.array(cfg['fixed'], np.float32), part[..., :3].shape)
        good = np.zeros_like(shape)
    else:
        good = eval(cfg['good'], env) & shape & (a > 200) & ~defect
        if cfg.get('avoidEdge'):
            # visible pixels along the occluder edge carry its shadow/antialias;
            # sampling them would trace the occluder's outline back into the fill
            good &= ~ndi.binary_dilation(hidden, iterations=cfg['avoidEdge'])
        if good.sum() < 3:
            raise SystemExit(f'{pid}: not enough good pixels to sample from')
        field = push_pull(part[..., :3], good)
        # gentle smoothing of sampled colors: one brush stroke = one local color
        field = np.where(good[..., None], field, ndi.gaussian_filter(field, (1.5, 1.5, 0)))
    s = cfg['size']
    ys, xs = np.where(defect)
    strokes = []
    if cfg['mode'] == 'hair':
        ux, uy = orientation(np.where(good, luma, ndi.gaussian_filter(luma, 3)), a)
        step = max(2, s // 3)
        pts = [(y, x) for y, x in zip(ys, xs) if y % step == 0 and x % step == 0]
        L = 2.2 * s
        for y, x in pts:
            dx, dy = ux[y, x] * L / 2, uy[y, x] * L / 2
            c = field[y, x]
            strokes.append(dict(p0=[round(x - dx), round(y - dy)], p1=[round(x + dx), round(y + dy)], size=s,
                                opacity=1.0, color=np.rint(c).astype(int).tolist(), preset=COVER))
        # strand texture: thin light/dark lines along the strands at low opacity
        rng = np.random.default_rng(7)
        for y, x in pts[::2]:
            dx, dy = ux[y, x] * L, uy[y, x] * L
            shade = rng.choice([-14, 10])
            c = np.clip(field[y, x] + shade, 0, 255)
            strokes.append(dict(p0=[round(x - dx), round(y - dy)], p1=[round(x + dx), round(y + dy)], size=2,
                                opacity=.35, color=np.rint(c).astype(int).tolist(), preset='b) Basic-5 Size'))
    else:
        step = max(1, s // 3)
        pts = [(y, x) for y, x in zip(ys, xs) if y % step == 0 and x % step == 0]
        cover = np.zeros_like(defect)
        for y, x in pts:
            cover[max(0, y - s // 2):y + s // 2 + 1, max(0, x - s // 2):x + s // 2 + 1] = True
        pts += [(y, x) for y, x in zip(*np.where(defect & ~cover))]  # every defect pixel gets a dab
        for y, x in pts:
            c = field[y, x]
            strokes.append(dict(p0=[int(x), int(y)], p1=[int(x) + 1, int(y)], size=s, opacity=1.0,
                                color=np.rint(c).astype(int).tolist(), preset=COVER))
    folder = RET / 'plan' / pid
    folder.mkdir(parents=True, exist_ok=True)
    Image.fromarray((defect * 255).astype(np.uint8)).save(folder / 'selection.png')
    return dict(id=pid, layer=f"{rec['level']:02d} {pid}", level=rec['level'], defectPixels=int(defect.sum()),
                hiddenPixels=int(hidden.sum()), goodSamples=int(good.sum()), strokes=strokes,
                selection=str((folder / 'selection.png').relative_to(ROOT)))


def main():
    man = {p['id']: p for p in json.loads((ROOT / 'manifest.json').read_text())['parts']}
    owner = np.array(Image.open(ROOT / '.work/owner.png')).astype(int)
    plans = [plan_part(pid, cfg, man, owner) for pid, cfg in FLAWS.items()]
    (RET / 'flaws.json').write_text(json.dumps(dict(retouched=FLAWS, kept=KEPT), ensure_ascii=False, indent=2) + '\n')
    (RET / 'plan.json').write_text(json.dumps(dict(parts=plans), ensure_ascii=False) + '\n')
    for p in plans:
        print(f"{p['level']:2d} {p['id']}: defect {p['defectPixels']}/{p['hiddenPixels']} hidden, "
              f"{len(p['strokes'])} strokes, {p['goodSamples']} samples")


if __name__ == '__main__':
    main()
