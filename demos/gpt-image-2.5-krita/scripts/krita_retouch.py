"""Apply reviewed local pixel patches to an existing KRA inside Krita.

The patch artwork and masks are computed outside Krita. This script edits only
the corresponding native layer rectangles and transparency selections, keeps
the existing tree, and verifies persistence by reopening the saved document.
"""
import hashlib
import json
import os
from pathlib import Path
import traceback

from krita import Krita, Selection, InfoObject
from PyQt5.QtCore import QTimer
from PyQt5.QtGui import QImage


def raw(image):
    ptr = image.constBits()
    ptr.setsize(image.sizeInBytes())
    return bytes(ptr)


def layers(document):
    result = {}
    counts = {'paintlayer': 0, 'transparencymask': 0, 'grouplayer': 0}

    def visit(node, prefix=''):
        for child in node.childNodes():
            counts[child.type()] = counts.get(child.type(), 0) + 1
            path = (prefix + '/' if prefix else '') + child.name()
            if child.type() == 'paintlayer':
                result[path] = child
            visit(child, path)

    visit(document.rootNode())
    return result, counts


def main():
    out = Path(os.environ['ASTRA_DELIVERY_DIR'])
    report = out / 'krita-retouch.json'
    try:
        app = Krita.instance()
        plan = json.loads((out / 'retouch-plan.json').read_text())
        manifest = json.loads((out / 'manifest.json').read_text())
        w, h = manifest['canvas']
        doc = app.openDocument(str(out / 'character.kra'))
        if doc is None:
            raise RuntimeError('Cannot open original KRA')
        doc.setBatchmode(True)
        nodes, before_counts = layers(doc)
        applied = []
        for patch in plan['parts']:
            pid = patch['id']
            folder = out / 'parts' / pid
            before = QImage(str(folder / 'before-retouch.png')).convertToFormat(QImage.Format_ARGB32)
            if bytes(nodes[pid].pixelData(0, 0, w, h)) != raw(before):
                raise RuntimeError('Original layer differs from reviewed input: ' + pid)
            after = QImage(str(folder / 'full.png')).convertToFormat(QImage.Format_ARGB32)
            if patch['bounds']:
                x0, y0, x1, y1 = patch['bounds']
                rect = after.copy(x0, y0, x1 - x0, y1 - y0)
                if not nodes[pid].setPixelData(raw(rect), x0, y0, x1 - x0, y1 - y0):
                    raise RuntimeError('Native patch failed: ' + pid)
            mask_image = QImage(str(folder / 'pose-mask.png')).convertToFormat(QImage.Format_Grayscale8)
            selection = Selection()
            selection.setPixelData(raw(mask_image), 0, 0, w, h)
            masks = [n for n in nodes[pid].childNodes() if n.type() == 'transparencymask']
            if len(masks) != 1:
                raise RuntimeError('Expected one native transparency mask: ' + pid)
            masks[0].setSelection(selection)
            applied.append(pid)
        doc.refreshProjection()
        doc.waitForDone()
        if not doc.saveAs(str(out / 'character.kra')):
            raise RuntimeError('KRA save failed')
        doc.waitForDone()
        loaded = app.openDocument(str(out / 'character.kra'))
        loaded.setBatchmode(True)
        app.activeWindow().addView(loaded)
        loaded.refreshProjection()
        loaded.waitForDone()
        reopened, counts = layers(loaded)
        if counts != before_counts:
            raise RuntimeError('Layer hierarchy changed during retouch')
        verified = []
        for entry in manifest['parts']:
            pid = entry['id']
            expected = QImage(str(out / 'parts' / pid / 'full.png')).convertToFormat(QImage.Format_ARGB32)
            if bytes(reopened[pid].pixelData(0, 0, w, h)) != raw(expected):
                raise RuntimeError('Persisted part differs: ' + pid)
            verified.append(pid)
        info = InfoObject()
        info.setProperty('alpha', True)
        if not loaded.exportImage(str(out / 'krita-reopened.png'), info):
            raise RuntimeError('PNG export failed')
        loaded.waitForDone()
        result = dict(ok=True, version=app.version(), applied=applied,
                      method='Native setPixelData on reviewed rectangles and transparency-mask selections',
                      reopenedNodeCounts=counts, fullLayersPixelVerified=verified,
                      manifestSha256=hashlib.sha256((out / 'manifest.json').read_bytes()).hexdigest(),
                      canvas=[loaded.width(), loaded.height()])
        report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        (out / 'krita-import.json').write_text(json.dumps(dict(result, imported=verified), ensure_ascii=False, indent=2) + '\n')
        doc.close()
    except Exception:
        report.write_text(json.dumps(dict(ok=False, error=traceback.format_exc()), indent=2))


QTimer.singleShot(2500, main)
