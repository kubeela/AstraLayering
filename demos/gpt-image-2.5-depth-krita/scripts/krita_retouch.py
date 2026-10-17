"""Run inside Krita (see launch_krita.py): brush-retouch flawed part layers.

Opens delivery/character-depth.kra and, for every part in retouch/plan.json:
selects the defect mask (always inside the part's hidden, completed area),
alpha-locks the layer and paints the planned brush strokes with Krita's brush
engine. Visible source pixels and the part shape (alpha) cannot change. The KRA
is saved, reopened and verified; edited layers are dumped for apply_retouch.py.
"""
import hashlib
import json
import os
import time
import traceback
from pathlib import Path

from krita import InfoObject, Krita, ManagedColor, Selection
from PyQt5.QtCore import QPoint, QTimer
from PyQt5.QtGui import QImage


def sha(node, w, h):
    return hashlib.sha256(bytes(node.pixelData(0, 0, w, h))).hexdigest()


def main():
    out = Path(os.environ['ASTRA_DELIVERY_DIR'])  # project root
    ret = out / os.environ.get('ASTRA_RETOUCH_NAME', 'retouch')
    dname = os.environ.get('ASTRA_DELIVERY_NAME', 'delivery')
    dump = ret / 'krita-out'
    dump.mkdir(parents=True, exist_ok=True)
    report = ret / 'krita-retouch.json'
    log = dict(ok=False)
    try:
        app = Krita.instance()
        plan = json.loads((ret / 'plan.json').read_text())['parts']
        kra = out / dname / 'character-depth.kra'
        doc = app.openDocument(str(kra))
        view = app.activeWindow().addView(doc)
        w, h = doc.width(), doc.height()
        layers = {n.name(): n for n in doc.rootNode().childNodes()}
        before = {k: sha(n, w, h) for k, n in layers.items()}
        presets = app.resources('preset')
        parts_log = []
        for p in plan:
            t0 = time.time()
            node = layers[p['layer']]
            doc.setActiveNode(node)
            mask = QImage(str(out / p['selection'])).convertToFormat(QImage.Format_Grayscale8)
            bits = mask.constBits(); bits.setsize(mask.sizeInBytes())
            row = mask.bytesPerLine()
            sel = Selection()
            sel.setPixelData(b''.join(bytes(bits[y * row:y * row + w]) for y in range(h)), 0, 0, w, h)
            doc.setSelection(sel)
            node.setAlphaLocked(True)
            used = {}
            for s in p['strokes']:
                if used.get('preset') != s['preset']:
                    view.setCurrentBrushPreset(presets[s['preset']]); used['preset'] = s['preset']
                view.setBrushSize(float(s['size']))
                view.setPaintingOpacity(float(s['opacity']))
                c = ManagedColor('RGBA', 'U8', '')
                r, g, b = (v / 255 for v in s['color'])
                c.setComponents([b, g, r, 1.0])  # Krita RGBA/U8 component order is B, G, R, A
                view.setForeGroundColor(c)
                node.paintLine(QPoint(*s['p0']), QPoint(*s['p1']), 1.0, 1.0, '')
            doc.waitForDone()
            node.setAlphaLocked(False)  # alpha lock is only a painting aid
            data = bytes(node.pixelData(0, 0, w, h))
            (dump / f"{p['level']:02d}.bgra").write_bytes(data)
            parts_log.append(dict(id=p['id'], layer=p['layer'], strokes=len(p['strokes']),
                                  presets=sorted({s['preset'] for s in p['strokes']}),
                                  sizes=sorted({s['size'] for s in p['strokes']}),
                                  opacities=sorted({s['opacity'] for s in p['strokes']}),
                                  defectPixels=p['defectPixels'], changed=hashlib.sha256(data).hexdigest() != before[p['layer']],
                                  sha256=hashlib.sha256(data).hexdigest(), seconds=round(time.time() - t0, 2)))
        app.action('deselect').trigger()
        doc.waitForDone()
        if not doc.save():
            raise RuntimeError('KRA save failed')
        doc.waitForDone(); doc.close()
        loaded = app.openDocument(str(kra)); loaded.setBatchmode(True)
        app.activeWindow().addView(loaded)
        nodes = {n.name(): n for n in loaded.rootNode().childNodes()}
        edited = {p['layer']: p['sha256'] for p in parts_log}
        if list(nodes) != list(layers):
            raise RuntimeError('Layer order changed after save')
        for name, node in nodes.items():
            want = edited.get(name, before[name])
            if sha(node, w, h) != want:
                raise RuntimeError('Reopened pixels differ: ' + name)
            if node.childNodes() or node.alphaLocked():
                raise RuntimeError('Unexpected child nodes or alpha lock: ' + name)
        info = InfoObject(); info.setProperty('alpha', True)
        loaded.refreshProjection(); loaded.waitForDone()
        if not loaded.exportImage(str(out / dname / 'krita-reopened.png'), info):
            raise RuntimeError('PNG export failed')
        loaded.waitForDone()
        log = dict(ok=True, version=app.version(), kra=str(kra.relative_to(out)), layers=len(nodes),
                   editedLayers=len(parts_log), unchangedLayersVerified=len(nodes) - len(parts_log),
                   reopenedVerified=True, parts=parts_log)
    except Exception:
        log = dict(ok=False, error=traceback.format_exc())
    finally:
        report.write_text(json.dumps(log, ensure_ascii=False, indent=2) + '\n')
        if os.environ.get('ASTRA_QUIT'):
            Krita.instance().action('file_quit').trigger()


QTimer.singleShot(2500, main)
