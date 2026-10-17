"""Save the painted live Krita document, reopen, and verify storage integrity."""
import hashlib,json
from krita import InfoObject
from PyQt5.QtGui import QImage

parts=json.loads((OUT/'manifest.json').read_text())['parts']
expected={}
for p in parts:
    pid=p['id'];n=NODES[pid];data=bytearray(pixels(n))
    shape=QImage(str(OUT/'parts'/pid/'shape.png')).convertToFormat(QImage.Format_Grayscale8)
    b=shape.constBits();b.setsize(shape.sizeInBytes());alpha=bytes(b)
    if any(a and not v for a,v in zip(alpha,data[3::4])):raise RuntimeError('Unpainted shape support: '+pid)
    data[3::4]=alpha
    n.setPixelData(bytes(data),0,0,1024,1536);n.setVisible(True);n.setOpacity(255);n.setAlphaLocked(False)
    n.setColorLabel({'hair':2,'face':1,'head_accessories':4,'body':6,'arms':3,'legs':5,'neck':7,'pelvis':8}.get(pid.split('/')[0],0))
    DOC.waitForDone();expected[n.name()]=digest(n);png(n,OUT/'parts'/pid/'full.png')
DOC.refreshProjection();DOC.waitForDone()
kra=OUT/'character-depth.kra'
if not DOC.saveAs(str(kra)):raise RuntimeError('KRA save failed')
DOC.waitForDone();DOC.close()
DOC=APP.openDocument(str(kra))
if DOC is None:raise RuntimeError('KRA reopen failed')
DOC.setBatchmode(True);VIEW=APP.activeWindow().addView(DOC)
layers=DOC.rootNode().childNodes()
order=[f"{p['level']:02d} {p['id']}" for p in parts]
if [n.name() for n in layers]!=order:raise RuntimeError('Reopened layer order changed')
for n in layers:
    if n.type()!='paintlayer' or n.childNodes():raise RuntimeError('Unexpected non-paint layer or mask')
    if digest(n)!=expected[n.name()]:raise RuntimeError('Reopened pixels changed: '+n.name())
NODES={n.name().split(' ',1)[1]:n for n in layers}
info=InfoObject();info.setProperty('alpha',True)
DOC.refreshProjection();DOC.waitForDone()
if not DOC.exportImage(str(OUT/'preview.png'),info):raise RuntimeError('Preview export failed')
DOC.waitForDone();DOC.setBatchmode(False)
VIEW.canvas().setZoomLevel(.65)
report=dict(ok=True,kritaVersion=APP.version(),file='character-depth.kra',canvas=[DOC.width(),DOC.height()],paintLayers=len(layers),childNodes=0,transparencyMasks=0,order=order,pixelVerified=len(expected),layerPixelSha256=expected)
(OUT/'krita-reopen-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
APP.activeWindow().qwindow().grab().save(str(RUN/'krita-final-window.png'))
