"""Inspected, hand-authored Krita head correction; run once on the prior KRA.

The frozen standard is deliberately retained. User-requested contour corrections
are recorded as explicit exceptions in shape-revisions.json.
"""
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QPainter, QPainterPath, QColor

EDIT_LOG = json.loads((OUT/'brush-edits.json').read_text())
DOC.setBatchmode(True)
exec((OUT/'scripts/krita_retouch_helpers.py').read_text(), globals())

def path_alpha(path):
    im = QImage(4096, 6144, QImage.Format_ARGB32)
    im.fill(Qt.transparent)
    q = QPainter(im)
    q.setRenderHint(QPainter.Antialiasing)
    q.scale(4, 4)
    q.fillPath(path, QColor(255, 255, 255))
    q.end()
    im = im.scaled(1024, 1536, Qt.IgnoreAspectRatio, Qt.SmoothTransformation)
    b = im.constBits(); b.setsize(im.sizeInBytes())
    return bytes(b)[3::4]

def save_shape(pid, alpha):
    shape = QImage(alpha, 1024, 1536, 1024, QImage.Format_Grayscale8).copy()
    assert shape.save(str(OUT/'parts'/pid/'shape.png'))

# The small dark underside follows the original right forehead hair root.
# Its inner edge follows the sapphire mount, preserving the separate ornament.
shadow = QPainterPath()
shadow.moveTo(514.6, 132.7)
shadow.cubicTo(517.5, 128.1, 521.5, 126.4, 524.3, 129.0)
shadow.cubicTo(529.0, 132.8, 533.1, 138.4, 536.4, 144.7)
shadow.cubicTo(531.0, 143.1, 523.2, 142.9, 516.3, 144.4)
shadow.lineTo(520.1, 139.0)
shadow.cubicTo(518.4, 136.7, 516.6, 134.8, 514.6, 132.7)
shadow.closeSubpath()
pid = 'hair/side_hair_left'
shape = QImage(str(OUT/'parts'/pid/'shape.png')).convertToFormat(QImage.Format_Grayscale8)
b = shape.constBits(); b.setsize(shape.sizeInBytes())
alpha = bytes(max(a, b) for a, b in zip(bytes(b), path_alpha(shadow)))
save_shape(pid, alpha)
underpaint(pid, [
    dict(points=[[520,135],[533,141]], size=22, color=[151,147,173], preset='b) Basic-1'),
    dict(points=[[522,131],[528,138]], size=9, color=[168,163,187], opacity=.58, preset='b) Airbrush Soft'),
    dict(points=[[520,140],[530,141],[535,143]], size=4, color=[127,126,151], opacity=.52, preset='b) Airbrush Soft'),
], '用户指出的画面右侧发根暗面：依原画手定边界，以 Krita 基础笔和柔笔补画；避开独立额饰。')
paint(pid, [
    dict(points=[[521,131],[521,133],[522,135]], size=4, color=[174,169,191], opacity=.28, preset='b) Airbrush Soft'),
    dict(points=[[523,139],[526,137],[528,136]], size=2, color=[131,128,155], opacity=.55, preset='b) Airbrush Soft'),
    dict(points=[[528,141],[530,140],[532,142]], size=3, color=[167,162,186], opacity=.35, preset='b) Airbrush Soft'),
], '细修暗面稀疏的弧向明暗，与另一侧发根保持相同柔和度。')

# Retain the crown and temples, bring only the lower cap behind ears/jaw.
# This is the rounded mass visible in the screenshot, not the long back locks.
cap = QPainterPath()
cap.moveTo(0, 0); cap.lineTo(1024, 0); cap.lineTo(1024, 206)
cap.lineTo(587.6, 206)
cap.cubicTo(581.2, 211.0, 571.5, 215.0, 567.0, 223.0)
cap.cubicTo(554.0, 239.0, 530.0, 259.0, 512.0, 263.0)
cap.cubicTo(495.0, 259.0, 472.0, 240.0, 458.0, 224.0)
cap.cubicTo(451.0, 215.0, 442.0, 211.0, 435.0, 206.0)
cap.lineTo(0, 206); cap.closeSubpath()
pid = 'hair/hair_cap'; node = NODES[pid]; before = digest(node)
data = bytearray(pixels(node)); limit = path_alpha(cap)
data[3::4] = bytes(min(a,b) for a,b in zip(data[3::4],limit))
save_shape(pid, data[3::4])
node.setPixelData(bytes(data),0,0,1024,1536); DOC.waitForDone()
png(node, OUT/'parts'/pid/'full.png')
EDIT_LOG.append(dict(id=pid, mode='Krita pixel-layer contour edit with hand-authored Bezier selection',
    note='按用户截图收小耳后圆弧发底：冠部和鬓角保留，下缘从 y281 收至 y263，藏回耳朵与下颌后方；长后发不缩放。',
    before=before, after=digest(node)))
(OUT/'brush-edits.json').write_text(json.dumps(EDIT_LOG,ensure_ascii=False,indent=2)+'\n')
# Shrinking the cap exposes a previously hidden registration seam at this root.
paint('hair/back_hair/main_left', [
    dict(points=[[538,194],[537,204],[536,220],[538,235],[537,248],[538,264],[539,280],[543,295]], size=9, color=[142,142,178], preset='b) Basic-5 Size Opacity'),
    dict(points=[[542,195],[541,213],[542,232],[541,249],[542,267],[544,282],[547,297]], size=11, color=[151,152,189], opacity=.5, preset='b) Airbrush Soft'),
    dict(points=[[538,201],[537,220],[539,240],[538,258],[540,278],[544,297]], size=2, color=[126,128,163], opacity=.42, preset='b) Airbrush Soft'),
], '发底缩小后新露出的后发内缘：逐段手画，去掉旧配准留下的浅色断条，保留纵向发丝。')
DOC.refreshProjection(); DOC.waitForDone()
inspect_all()
