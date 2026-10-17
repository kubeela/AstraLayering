"""Private Krita document with explicit command files for inspected brush edits."""
import hashlib
import json
import os
import traceback
from pathlib import Path
from krita import Krita, InfoObject, ManagedColor, Selection
from PyQt5.QtCore import QTimer, QPoint
from PyQt5.QtGui import QImage

OUT=Path(os.environ['ASTRA_DELIVERY_DIR'])
RUN=OUT/'runtime'
APP=Krita.instance()
DOC=None
VIEW=None
NODES={}
IMPORTED={}
EDIT_LOG=[]

def pixels(n):return bytes(n.pixelData(0,0,1024,1536))
def digest(n):return hashlib.sha256(pixels(n)).hexdigest()
def png(n,path):
    path.parent.mkdir(parents=True,exist_ok=True)
    data=pixels(n)
    if not QImage(data,1024,1536,4096,QImage.Format_ARGB32).copy().save(str(path)):
        raise RuntimeError('PNG save failed '+str(path))

def import_ready():
    for pid,node in NODES.items():
        f=OUT/'parts'/pid/'full.png'
        if not f.exists():continue
        h=hashlib.sha256(f.read_bytes()).hexdigest()
        if IMPORTED.get(pid)==h:continue
        im=QImage(str(f)).convertToFormat(QImage.Format_ARGB32)
        b=im.constBits();b.setsize(im.sizeInBytes())
        node.setPixelData(bytes(b),0,0,1024,1536);IMPORTED[pid]=h
    DOC.refreshProjection();DOC.waitForDone()
    return len(IMPORTED)

def paint(pid,strokes,note):
    node=NODES[pid];DOC.setActiveNode(node)
    before=digest(node)
    # Original SVG alpha is the selection, and alpha lock is an editing aid.
    a=QImage(str(OUT/'parts'/pid/'shape.png')).convertToFormat(QImage.Format_Grayscale8)
    b=a.constBits();b.setsize(a.sizeInBytes());sel=Selection();sel.setPixelData(bytes(b),0,0,1024,1536)
    DOC.setSelection(sel);node.setAlphaLocked(False)
    for s in strokes:
        VIEW.setCurrentBrushPreset(APP.resources('preset')[s.get('preset','b) Basic-5 Size Opacity')])
        VIEW.setBrushSize(float(s['size']));VIEW.setPaintingOpacity(float(s.get('opacity',1)))
        c=ManagedColor('RGBA','U8','');r,g,b=s['color'];c.setComponents([b/255,g/255,r/255,1]);VIEW.setForeGroundColor(c)
        pts=s['points']
        for p0,p1 in zip(pts,pts[1:]):node.paintLine(QPoint(*p0),QPoint(*p1),1,1,'')
        DOC.waitForDone()
    node.setAlphaLocked(False);APP.action('deselect').trigger();DOC.waitForDone()
    # Restore only the authoring alpha after real brush work, without a mask.
    painted=bytearray(pixels(node));shape=a.constBits();shape.setsize(a.sizeInBytes())
    painted[3::4]=bytes(min(v,limit) for v,limit in zip(painted[3::4],bytes(shape)))
    node.setPixelData(bytes(painted),0,0,1024,1536);DOC.waitForDone()
    target=OUT/'parts'/pid/'full.png';png(node,target);IMPORTED[pid]=hashlib.sha256(target.read_bytes()).hexdigest()
    EDIT_LOG.append(dict(id=pid,note=note,strokes=strokes,before=before,after=digest(node)))
    (OUT/'brush-edits.json').write_text(json.dumps(EDIT_LOG,ensure_ascii=False,indent=2)+'\n')

def inspect_all():
    for pid,n in NODES.items():
        if pid in IMPORTED:png(n,OUT/'krita-layers'/f'{pid}.png')
    DOC.refreshProjection();DOC.waitForDone()
    info=InfoObject();info.setProperty('alpha',True)
    DOC.exportImage(str(OUT/'current-composite.png'),info);DOC.waitForDone()
    return len(IMPORTED)

def tick():
    task=RUN/'command.py'
    if not task.exists():return
    code=task.read_text();task.unlink()
    try:
        exec(compile(code,'krita-command.py','exec'),globals())
        result={'ok':True,'imported':len(IMPORTED),'edits':len(EDIT_LOG)}
    except Exception:result={'ok':False,'error':traceback.format_exc()}
    (RUN/'command-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))

def start():
    global DOC,VIEW
    try:
        DOC=APP.createDocument(1024,1536,'Astra — grey-control parts','RGBA','U8','sRGB-elle-V2-srgbtrc.icc',72)
        DOC.setBatchmode(True)
        for n in DOC.rootNode().childNodes():n.remove()
        last=None
        for p in json.loads((OUT/'manifest.json').read_text())['parts']:
            n=DOC.createNode(f"{p['level']:02d} {p['id']}",'paintlayer');DOC.rootNode().addChildNode(n,last);last=n;NODES[p['id']]=n
        VIEW=APP.activeWindow().addView(DOC)
        import_ready()
        (RUN/'krita-ready.json').write_text(json.dumps(dict(ok=True,version=APP.version(),presets=list(APP.resources('preset')),imported=len(IMPORTED))))
        timer=QTimer();timer.timeout.connect(tick);timer.start(300);globals()['TIMER']=timer
    except Exception:(RUN/'krita-ready.json').write_text(json.dumps(dict(ok=False,error=traceback.format_exc())))

QTimer.singleShot(2500,start)
