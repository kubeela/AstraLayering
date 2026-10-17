"""Run inside Krita (see launch_krita.py): build the depth-ordered layer stack.

One paint layer per leaf part, stacked by occlusion.json level (bottom = 0).
Each layer holds the complete part; a transparency mask restores the original
pose (disable it to see the full completion). The KRA is saved, reopened, and
its projection exported both with masks (original) and without (depth stack).
"""
import hashlib
import json
import os
import traceback
from pathlib import Path

from krita import InfoObject, Krita, Selection
from PyQt5.QtCore import QTimer
from PyQt5.QtGui import QImage

COLORS = {'hair': 2, 'face': 1, 'head_accessories': 4, 'body': 6, 'arms': 3, 'legs': 5, 'neck': 7, 'pelvis': 8}


def raw(image):
    ptr = image.constBits(); ptr.setsize(image.sizeInBytes())
    return bytes(ptr)


def export(doc, path):
    info = InfoObject(); info.setProperty('alpha', True)
    doc.refreshProjection(); doc.waitForDone()
    if not doc.exportImage(str(path), info):
        raise RuntimeError('PNG export failed: ' + str(path))
    doc.waitForDone()


def main():
    out = Path(os.environ['ASTRA_DELIVERY_DIR'])
    report = out / 'krita-import.json'
    try:
        app = Krita.instance()
        man = json.loads((out / 'manifest.json').read_text())
        w, h = man['canvas']
        doc = app.createDocument(w, h, 'Astra depth layering — 90 parts', 'RGBA', 'U8', 'sRGB-elle-V2-srgbtrc.icc', 72)
        doc.setBatchmode(True)
        root = doc.rootNode()
        for initial in root.childNodes():
            initial.remove()
        parts = sorted(man['parts'], key=lambda p: p['level'])
        expected, below = {}, None
        for p in parts:
            folder = out / 'parts' / p['id']
            image = QImage(str(folder / 'full.png')).convertToFormat(QImage.Format_ARGB32)
            if image.isNull():
                raise RuntimeError('Cannot read ' + str(folder / 'full.png'))
            name = f"{p['level']:02d} {p['id']}"
            node = doc.createNode(name, 'paintlayer')
            root.addChildNode(node, below)  # placed directly above the previous level
            data = raw(image); expected[name] = hashlib.sha256(data).hexdigest()
            if not node.setPixelData(data, 0, 0, w, h):
                raise RuntimeError('Cannot set pixels ' + name)
            node.setColorLabel(COLORS.get(p['id'].split('/')[0], 0))
            mask_image = QImage(str(folder / 'pose-mask.png')).convertToFormat(QImage.Format_Grayscale8)
            sel = Selection(); sel.setPixelData(raw(mask_image), 0, 0, w, h)
            mask = doc.createTransparencyMask('原姿势遮挡 · 关闭以显示完整补全')
            node.addChildNode(mask, None); mask.setSelection(sel)
            node.setCollapsed(True)
            below = node
        order = [n.name() for n in root.childNodes()]
        if order != [f"{p['level']:02d} {p['id']}" for p in parts]:
            raise RuntimeError('Layer order does not follow occlusion levels: ' + ', '.join(order[:5]))
        kra = out / 'character-depth.kra'
        if not doc.saveAs(str(kra)):
            raise RuntimeError('KRA save failed')
        doc.waitForDone(); doc.close()
        loaded = app.openDocument(str(kra)); loaded.setBatchmode(True)
        app.activeWindow().addView(loaded)
        export(loaded, out / 'krita-reopened-pose.png')
        layers = [n for n in loaded.rootNode().childNodes() if n.type() == 'paintlayer']
        verified = []
        for n in layers:
            if hashlib.sha256(bytes(n.pixelData(0, 0, w, h))).hexdigest() != expected[n.name()]:
                raise RuntimeError('Reopened layer pixels changed: ' + n.name())
            verified.append(n.name())
        masks = [c for n in layers for c in n.childNodes() if c.type() == 'transparencymask']
        for m in masks:
            m.setVisible(False)
        export(loaded, out / 'krita-reopened-depth-stack.png')
        for m in masks:
            m.setVisible(True)
        report.write_text(json.dumps(dict(ok=True, version=app.version(), kra=str(kra), layers=len(layers),
                                          transparencyMasks=len(masks), order=[n.name() for n in layers],
                                          pixelVerified=len(verified), canvas=[loaded.width(), loaded.height()]),
                                     ensure_ascii=False, indent=2) + '\n')
    except Exception:
        report.write_text(json.dumps(dict(ok=False, error=traceback.format_exc()), indent=2))
    finally:
        if os.environ.get('ASTRA_QUIT'):
            Krita.instance().action('file_quit').trigger()


QTimer.singleShot(2500, main)
