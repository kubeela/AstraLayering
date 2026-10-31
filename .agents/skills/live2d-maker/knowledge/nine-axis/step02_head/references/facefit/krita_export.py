# 在 Krita 中运行（krita 工具执行 Python）。复制后填好 KRA、OUT，按实际图层命名修改 PATTERN。
# 从上到下导出脸部组下每个非组图层的可见效果（含所在组的透明度蒙版）为同画布 PNG，并写 layers.json。
import json
import os
import re

from krita import Krita
from PyQt5.QtGui import QImage

KRA = ''        # 源 KRA 路径
OUT = ''        # 导出目录，如 <workspace>/export
PATTERN = re.compile(r'^(\d+)\s+(face/\S+)$')   # 图层名 → 部件 id（第 2 组）

os.makedirs(OUT, exist_ok=True)
doc = Krita.instance().openDocument(KRA)
doc.waitForDone()
W, H = doc.width(), doc.height()
order = []


def walk(node):
    for n in reversed(node.childNodes()):   # childNodes() 自下而上
        order.append(n)
        if n.type() == 'grouplayer':
            walk(n)


walk(doc.rootNode())
meta = []
for n in order:
    m = PATTERN.match(n.name())
    if not m or n.type() == 'grouplayer':
        continue
    pid = m.group(2)
    img = QImage(bytes(n.projectionPixelData(0, 0, W, H)), W, H, W * 4, QImage.Format_ARGB32)
    fn = pid.replace('/', '__') + '.png'
    img.save(os.path.join(OUT, fn))
    b = n.bounds()
    meta.append({'id': pid, 'name': n.name(), 'file': fn, 'opacity': n.opacity(), 'visible': n.visible(),
                 'bounds': [b.x(), b.y(), b.width(), b.height()]})
json.dump(meta, open(os.path.join(OUT, 'layers.json'), 'w'), ensure_ascii=False, indent=1)
doc.close()
result = {'count': len(meta), 'ids': [m['id'] for m in meta], 'canvas': [W, H]}
