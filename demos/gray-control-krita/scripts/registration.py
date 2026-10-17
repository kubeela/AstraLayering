"""Geometric image registration only; no completion by source cloning or filling.

Registration helpers adapted from the earlier depth demonstration. Numerical
alignment scores choose a transform only; visual review determines acceptance.
"""
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
W,H=1024,1536

def generation(folder):
    for name in ['generated-v5.png','generated-review.png','generated-final.png','generated-retry.png','generated.png']:
        if (folder/name).is_file():return folder/name
    raise FileNotFoundError(folder)

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
