"""Fixed, read-only inspection of a saved shadow KRA in a private Krita instance."""
from krita import Krita, Extension, InfoObject
from PyQt5.QtCore import QTimer, QRect
from PyQt5.QtGui import QImage
from pathlib import Path
import json, os, traceback

JOB = json.loads(Path(os.environ['ASTRA_SHADOW_JOB']).read_text())
OUT = Path(JOB['output'])


def uid(node):
    return node.uniqueId().toString().strip('{}').lower()


def render(doc, name):
    doc.refreshProjection()
    doc.waitForDone()
    settings = InfoObject()
    for k, v in {'alpha': True, 'compression': 3, 'forceSRGB': True, 'indexed': False}.items():
        settings.setProperty(k, v)
    if not doc.exportImage(str(OUT / name), settings):
        raise ValueError('无法导出原生检查图：' + name)


def pixels(node, rect, name, raw=False):
    if rect.width() * rect.height() > 64_000_000:
        raise ValueError('检查区域超过 6400 万像素，不降低源图精度')
    data = bytes((node.pixelData if raw else node.projectionPixelData)(rect.x(), rect.y(), rect.width(), rect.height()))
    if len(data) != rect.width() * rect.height() * 4:
        raise ValueError('检查仅支持 RGBA U8 图层')
    image = QImage(data, rect.width(), rect.height(), rect.width() * 4, QImage.Format_ARGB32).copy()
    if not image.save(str(OUT / name), 'PNG'):
        raise ValueError('无法保存图层检查像素')


class Inspection(Extension):
    def createActions(self, window):
        pass

    def setup(self):
        Krita.instance().setBatchmode(True)
        # Let Krita finish creating its window before opening a document/export filters.
        QTimer.singleShot(500, self.run)

    def run(self):
        doc = None
        try:
            OUT.mkdir(parents=True, exist_ok=True)
            doc = Krita.instance().openDocument(JOB['document'])
            if not doc:
                raise ValueError('Krita 无法打开阴影工程')
            doc.setBatchmode(True)
            doc.waitForDone()
            if doc.colorModel() != 'RGBA' or doc.colorDepth() != 'U8':
                raise ValueError('原始像素检查需要 RGBA U8 工程；不自动转换源文件')
            nodes = {}
            def walk(parent):
                for node in parent.childNodes():
                    nodes[uid(node)] = node
                    walk(node)
            walk(doc.rootNode())
            rows = []
            shadow_nodes = [nodes[r['shadowLayerUuid'].strip('{}').lower()] for r in JOB['relations']]
            original_visibility = [n.visible() for n in shadow_nodes]
            render(doc, 'native-final.png')
            for n in shadow_nodes:
                n.setVisible(False)
            render(doc, 'without-shadows.png')
            for n, visible in zip(shadow_nodes, original_visibility):
                n.setVisible(visible)
            for index, relation in enumerate(JOB['relations']):
                shadow = nodes[relation['shadowLayerUuid'].strip('{}').lower()]
                receiver = nodes[relation['clipBaseLayerUuid'].strip('{}').lower()]
                rect = shadow.bounds().united(receiver.bounds())
                for dx, dy in relation['testOffsets']:
                    rect = rect.united(shadow.bounds().translated(dx, dy))
                if rect.isEmpty():
                    raise ValueError('阴影与受影范围为空：' + relation['id'])
                folder = 'relation-%03d' % index
                (OUT / folder).mkdir(exist_ok=True)
                pixels(shadow, rect, folder + '/full-paint.png', True)
                pixels(receiver, rect, folder + '/receiver.png')
                parent = shadow.parentNode()
                for n in shadow_nodes:
                    n.setVisible(False)
                doc.refreshProjection()
                doc.waitForDone()
                pixels(parent, rect, folder + '/clip-base.png')
                for n, visible in zip(shadow_nodes, original_visibility):
                    n.setVisible(visible)
                position = shadow.position()
                frames = []
                try:
                    for j, (dx, dy) in enumerate(relation['testOffsets']):
                        current = shadow.position()
                        shadow.move(position.x() + dx - current.x(), position.y() + dy - current.y())
                        name = folder + '/offset-%02d.png' % j
                        render(doc, name)
                        clipped = folder + '/clip-offset-%02d.png' % j
                        pixels(parent, rect, clipped)
                        frames.append({'offset': [dx, dy], 'file': name, 'clipped': clipped})
                finally:
                    current = shadow.position()
                    shadow.move(position.x() - current.x(), position.y() - current.y())
                    doc.refreshProjection()
                    doc.waitForDone()
                rows.append({'id': relation['id'], 'bounds': [rect.x(), rect.y(), rect.width(), rect.height()],
                             'fullPaint': folder + '/full-paint.png', 'receiver': folder + '/receiver.png',
                             'clipBase': folder + '/clip-base.png', 'frames': frames})
            result = {'success': True, 'width': doc.width(), 'height': doc.height(), 'relations': rows,
                      'nativeVersion': Krita.instance().version()}
        except Exception as e:
            result = {'success': False, 'error': str(e), 'trace': traceback.format_exc()}
        finally:
            if doc:
                doc.setModified(False)
                doc.close()
        temp = OUT / 'result.tmp'
        temp.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
        temp.replace(OUT / 'result.json')
        Krita.instance().quit()


Krita.instance().addExtension(Inspection(Krita.instance()))
