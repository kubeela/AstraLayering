"""五官多尺度模板匹配：正面合成上取模板，在 left.png 中找位置与横纵缩放。

匹配分数低或位置不合理的五官（如被头发挡住、形状变化太大）要看图剔除，不进后续约束。
"""
import cv2
import numpy as np


def match(front_bgr, target_bgr, rect, sx=np.linspace(0.6, 1.15, 23), sy=(0.95, 1.0, 1.05), window=(90, 30), margin=3):
    """rect 为五官在正面图中的 [x0, y0, x1, y1)；window 为相对正面位置的搜索半宽（x, y）。

    返回 score、sx、sy、目标中心 cx/cy、缩放后的模板 w/h，以及正面中心 front_cx/front_cy。
    """
    x0, y0, x1, y1 = rect[0] - margin, rect[1] - margin, rect[2] + margin, rect[3] + margin
    tpl = cv2.cvtColor(front_bgr[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
    tgt = cv2.cvtColor(target_bgr, cv2.COLOR_BGR2GRAY)
    fx, fy = (x0 + x1) / 2, (y0 + y1) / 2
    best = None
    for a in sx:
        for b in sy:
            t = cv2.resize(tpl, None, fx=a, fy=b, interpolation=cv2.INTER_AREA if a < 1 else cv2.INTER_LINEAR)
            if min(t.shape) < 5:
                continue
            r = cv2.matchTemplate(tgt, t, cv2.TM_CCOEFF_NORMED)
            xx = np.arange(r.shape[1]) + t.shape[1] / 2
            yy = np.arange(r.shape[0]) + t.shape[0] / 2
            r = np.where((np.abs(xx[None] - fx) <= window[0]) & (np.abs(yy[:, None] - fy) <= window[1]), r, -1)
            j, i = np.unravel_index(np.argmax(r), r.shape)
            if best is None or r[j, i] > best['score']:
                best = dict(score=float(r[j, i]), sx=float(a), sy=float(b), cx=float(i + t.shape[1] / 2), cy=float(j + t.shape[0] / 2),
                            w=int(t.shape[1]), h=int(t.shape[0]))
    best.update(front_cx=fx, front_cy=fy, front_rect=[int(x0), int(y0), int(x1), int(y1)])
    return best
