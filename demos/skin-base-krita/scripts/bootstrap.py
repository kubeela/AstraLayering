from krita import Krita, InfoObject
from PyQt5.QtCore import QTimer, QRect, QPoint
from PyQt5.QtGui import QImage, QColor, QPainter, QPainterPath, QPen, QLinearGradient, QRadialGradient
from pathlib import Path
import json, hashlib, traceback
OUT=Path('/Users/wutian/Desktop/coding/AstraLayering/demos/skin-base-krita')
SRC=Path('/Users/wutian/Desktop/coding/AstraLayering/demos/soft-edge-krita/character-soft-edges-final.kra')
APP=Krita.instance(); DOC=APP.activeDocument(); VIEW=APP.activeWindow().activeView()
assert DOC and DOC.fileName()==str(SRC)
W,H=DOC.width(),DOC.height(); assert (W,H)==(1024,1536)
NODES={n.name().split(' ',1)[1]:n for n in DOC.rootNode().childNodes()}
assert len(NODES)==90 and all(n.type()=='paintlayer' for n in NODES.values())
TARGETS={'pelvis','body/torso','body/breast'}
def pixels(n): return bytes(n.pixelData(0,0,W,H))
def digest(n): return hashlib.sha256(pixels(n)).hexdigest()
def image(n): return QImage(pixels(n),W,H,W*4,QImage.Format_ARGB32).copy()
def export_node(n,path):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);assert image(n).save(str(path))
def composite(path):
 DOC.refreshProjection();DOC.waitForDone();i=InfoObject();i.setProperty('alpha',True)
 assert DOC.exportImage(str(path),i);DOC.waitForDone()
def set_image(pid,im):
 im=im.convertToFormat(QImage.Format_ARGB32);b=im.constBits();b.setsize(im.sizeInBytes())
 NODES[pid].setPixelData(bytes(b),0,0,W,H);DOC.waitForDone()
def tick():
 cmd=OUT/'command.py'
 if not cmd.exists():return
 code=cmd.read_text();cmd.unlink()
 try:
  exec(compile(code,str(cmd),'exec'),globals())
  result={'ok':True}
 except Exception:result={'ok':False,'error':traceback.format_exc()}
 (OUT/'command-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
DOC.setBatchmode(True)
BASE={}
for pid,n in NODES.items():
 BASE[pid]={'name':n.name(),'sha256':digest(n),'label':n.colorLabel(),'visible':n.visible(),'opacity':n.opacity(),'type':n.type(),'bodysuitRelated':pid in TARGETS}
 export_node(n,OUT/'before-parts'/pid/'full.png')
 if pid in TARGETS:n.setColorLabel(1)
(OUT/'inventory.json').write_text(json.dumps({'source':str(SRC),'sourceFileSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'canvas':[W,H],'parts':BASE},ensure_ascii=False,indent=2))
composite(OUT/'before-composite.png')
assert DOC.saveAs(str(OUT/'character-skin-base.kra'));DOC.waitForDone()
DOC.setBatchmode(False)
VIEW.canvas().setZoomLevel(.9)
TIMER=QTimer();TIMER.timeout.connect(tick);TIMER.start(400)
(OUT/'ready.json').write_text(json.dumps({'ok':True,'parts':len(NODES),'marked':sorted(TARGETS),'file':DOC.fileName()},ensure_ascii=False))
print('Skin-base copy ready; 90 parts inspected, 3 bodysuit layers marked red.')
