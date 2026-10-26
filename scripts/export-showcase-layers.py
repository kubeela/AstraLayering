"""Read saved KRA pixels in an isolated Krita instance for documentation plates."""
import json
import os
import traceback
from pathlib import Path
from krita import Krita, Extension
from PyQt5.QtCore import QTimer
from PyQt5.QtGui import QImage


class ShowcaseExport(Extension):
    def setup(self):
        Krita.instance().setBatchmode(True)
        QTimer.singleShot(100, self.run)

    def createActions(self, window):
        pass

    def run(self):
        job_path = Path(os.environ['ASTRA_SHOWCASE_JOB'])
        try:
            job = json.loads(job_path.read_text())
            results = []
            for item in job['cases']:
                doc = Krita.instance().openDocument(item['kra'])
                if not doc:
                    raise ValueError('Could not open ' + item['kra'])
                doc.waitForDone()
                if doc.colorModel() != 'RGBA' or doc.colorDepth() != 'U8':
                    raise ValueError('Showcase export requires an RGBA U8 source')
                output = Path(item['output'])
                (output / 'layers').mkdir(parents=True, exist_ok=True)
                records = []

                def walk(parent):
                    for node in parent.childNodes():
                        if node.type() == 'grouplayer':
                            walk(node)
                        elif node.type() == 'paintlayer':
                            bounds = node.bounds()
                            if bounds.isEmpty():
                                continue
                            if bounds.width() * bounds.height() > 40_000_000:
                                raise ValueError('Unexpected layer bounds: ' + node.name())
                            raw = bytes(node.pixelData(bounds.x(), bounds.y(), bounds.width(), bounds.height()))
                            if len(raw) != bounds.width() * bounds.height() * 4:
                                raise ValueError('Unexpected pixel format: ' + node.name())
                            image = QImage(raw, bounds.width(), bounds.height(), bounds.width() * 4, QImage.Format_ARGB32).copy()
                            file = 'layers/%03d.png' % len(records)
                            if not image.save(str(output / file), 'PNG'):
                                raise ValueError('Could not export ' + file)
                            records.append({'id': node.uniqueId().toString().strip('{}'), 'name': node.name(),
                                            'opacity': node.opacity(), 'blend': node.blendingMode(),
                                            'visible': node.visible(), 'original': {'file': file, 'x': bounds.x(), 'y': bounds.y()}})

                walk(doc.rootNode())
                payload = {'canvas': [doc.width(), doc.height()], 'order': 'back-to-front',
                           'sourceKra': item['relativeKra'], 'sourceSha256': item['sha256'], 'layers': records}
                (output / 'layers.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
                results.append({'name': item['name'], 'layers': len(records)})
                doc.close()
            job_path.with_suffix('.result.json').write_text(json.dumps({'cases': results}))
        except Exception:
            job_path.with_suffix('.result.json').write_text(json.dumps({'error': traceback.format_exc()}))
        finally:
            QTimer.singleShot(0, lambda: Krita.instance().action('file_quit').trigger())


Krita.instance().addExtension(ShowcaseExport(Krita.instance()))
