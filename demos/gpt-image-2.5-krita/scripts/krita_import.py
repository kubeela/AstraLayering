"""Run inside Krita's Python plugin host (see launch_krita.py).

Creates real paint layers and reversible transparency masks, saves KRA, then
reopens that saved file and exports its actual projection for verification.
"""
import json
import hashlib
import os
from pathlib import Path
import traceback

from krita import Krita, Selection, InfoObject
from PyQt5.QtCore import QTimer
from PyQt5.QtGui import QImage


def main():
    out=Path(os.environ['ASTRA_DELIVERY_DIR'])
    report=out/'krita-import.json'
    try:
        app=Krita.instance()
        manifest=json.loads((out/'manifest.json').read_text())
        tree=json.loads((out/'groups.json').read_text())
        w,h=manifest['canvas']
        doc=app.createDocument(w,h,'Astra — 90 complete character parts','RGBA','U8','sRGB-elle-V2-srgbtrc.icc',72)
        doc.setBatchmode(True)
        for initial in doc.rootNode().childNodes():
            initial.remove()  # createDocument otherwise supplies an opaque background.
        existing={p['id']:p for p in manifest['parts']}
        imported=[]
        expected_pixels={}

        def build(nodes,parent):
            for n in nodes:
                if n.get('groups'):
                    group=doc.createGroupLayer(n['id'].split('/')[-1])
                    parent.addChildNode(group,None)
                    group.setCollapsed(True)
                    build(n['groups'],group)
                elif n['id'] in existing:
                    folder=out/'parts'/n['id']
                    image=QImage(str(folder/'full.png')).convertToFormat(QImage.Format_ARGB32)
                    if image.isNull():raise RuntimeError('Cannot read '+str(folder/'full.png'))
                    node=doc.createNode(n['id'].split('/')[-1],'paintlayer')
                    parent.addChildNode(node,None)
                    ptr=image.constBits();ptr.setsize(image.sizeInBytes())
                    data=bytes(ptr)
                    expected_pixels[n['id']]=hashlib.sha256(data).hexdigest()
                    if not node.setPixelData(data,0,0,w,h):raise RuntimeError('Cannot set pixels '+n['id'])
                    mask_image=QImage(str(folder/'pose-mask.png')).convertToFormat(QImage.Format_Grayscale8)
                    ptr=mask_image.constBits();ptr.setsize(mask_image.sizeInBytes())
                    # Canvas width is 1024, so grayscale scan lines have no padding.
                    selection=Selection();selection.setPixelData(bytes(ptr),0,0,w,h)
                    mask=doc.createTransparencyMask('原姿势遮挡 · 关闭以显示完整补全')
                    node.addChildNode(mask,None);mask.setSelection(selection)
                    node.setCollapsed(True)
                    imported.append(n['id'])

        build(tree['groups'],doc.rootNode())
        doc.refreshProjection();doc.waitForDone()
        kra=out/'character.kra'
        if not doc.saveAs(str(kra)):raise RuntimeError('KRA save failed')
        doc.waitForDone()
        # Test persistence through the real application's file reader, not only
        # the in-memory creation path or hand-written KRA metadata.
        loaded=app.openDocument(str(kra))
        loaded.setBatchmode(True)
        app.activeWindow().addView(loaded)
        loaded.refreshProjection();loaded.waitForDone()
        info=InfoObject();info.setProperty('alpha',True)
        if not loaded.exportImage(str(out/'krita-reopened.png'),info):raise RuntimeError('PNG export failed')
        loaded.waitForDone()
        counts={'paintlayer':0,'transparencymask':0,'grouplayer':0}
        persisted=[]
        def inspect(node,path=''):
            for c in node.childNodes():
                counts[c.type()]=counts.get(c.type(),0)+1
                key=(path+'/' if path else '')+c.name()
                if c.type()=='paintlayer':
                    digest=hashlib.sha256(bytes(c.pixelData(0,0,w,h))).hexdigest()
                    if digest!=expected_pixels[key]:raise RuntimeError('Reopened full layer pixels changed: '+key)
                    persisted.append(key)
                inspect(c,key)
        inspect(loaded.rootNode())
        report.write_text(json.dumps(dict(ok=True,version=app.version(),imported=imported,
            reopenedNodeCounts=counts,fullLayersPixelVerified=persisted,
            manifestSha256=hashlib.sha256((out/'manifest.json').read_bytes()).hexdigest(),
            canvas=[loaded.width(),loaded.height()]),ensure_ascii=False,indent=2)+'\n')
        doc.close()
        # Leave the saved/reopened document visible in Krita for inspection.
        app.action('view_show_canvas_only').setChecked(False) if app.action('view_show_canvas_only') else None
    except Exception:
        report.write_text(json.dumps(dict(ok=False,error=traceback.format_exc()),indent=2))


QTimer.singleShot(2500,main)
