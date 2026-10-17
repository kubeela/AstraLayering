"""Open the checkpoint; apply only individually authored native Krita strokes."""
import json,hashlib
from pathlib import Path
from krita import Krita,InfoObject,ManagedColor
from PyQt5.QtCore import QPoint
from PyQt5.QtGui import QImage
OUT=Path('/Users/wutian/Desktop/coding/AstraLayering/demos/soft-edge-krita')
RUN=OUT/'runtime'; RUN.mkdir(exist_ok=True)
APP=Krita.instance()
DOC=next((d for d in APP.documents() if d.fileName()==str(OUT/'character-soft-edges.kra')),None)
if DOC is None:DOC=APP.openDocument(str(OUT/'character-soft-edges.kra'))
assert DOC
DOC.setBatchmode(True)
VIEW=APP.activeWindow().addView(DOC)
rows=json.loads((OUT/'manifest.json').read_text())['parts']
NODES={n.name().split(' ',1)[1]:n for n in DOC.rootNode().childNodes()}
assert list(NODES)==[p['id'] for p in rows]
assert all(n.type()=='paintlayer' and not n.childNodes() for n in NODES.values())
EDIT_LOG=[]
def pixels(n):return bytes(n.pixelData(0,0,1024,1536))
def digest(n):return hashlib.sha256(pixels(n)).hexdigest()
def png(n,path):
 path.parent.mkdir(parents=True,exist_ok=True)
 assert QImage(pixels(n),1024,1536,4096,QImage.Format_ARGB32).copy().save(str(path))
def composite(path):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 DOC.refreshProjection();DOC.waitForDone()
 info=InfoObject();info.setProperty('alpha',True)
 assert DOC.exportImage(str(path),info);DOC.waitForDone()
def native_states(level):
 for i,n in enumerate(NODES.values()):n.setVisible(i==level)
 composite(RUN/'native-isolated'/f'{level:02}.png')
 for i,n in enumerate(NODES.values()):n.setVisible(i<=level)
 composite(RUN/'native-below'/f'{level:02}.png')
 for n in NODES.values():n.setVisible(True)
 DOC.refreshProjection();DOC.waitForDone()
def brush(level,strokes,issue,note):
 pid=rows[level]['id'];node=NODES[pid]
 DOC.setActiveNode(node);APP.action('deselect').trigger();DOC.waitForDone()
 before=digest(node)
 for s in strokes:
  VIEW.setCurrentBrushPreset(APP.resources('preset')[s.get('preset','x) Filter Blur')])
  VIEW.setBrushSize(float(s['size']));VIEW.setPaintingOpacity(float(s.get('opacity',.5)))
  node.setAlphaLocked(s.get('alphaLock',False))
  if 'color' in s:
   c=ManagedColor('RGBA','U8','');r,g,b=s['color'];c.setComponents([b/255,g/255,r/255,1]);VIEW.setForeGroundColor(c)
  for a,b in zip(s['points'],s['points'][1:]):
   node.paintLine(QPoint(*a),QPoint(*b),1,1,'')
  DOC.waitForDone()
 node.setAlphaLocked(False)
 after=digest(node);png(node,OUT/'final-parts'/pid/'full.png')
 EDIT_LOG.append(dict(level=level,id=pid,issue=issue,note=note,strokes=strokes,before=before,after=after,changed=before!=after))
 (OUT/'continuation-brush-edits.json').write_text(json.dumps(EDIT_LOG,ensure_ascii=False,indent=2)+'\n')
 native_states(level)
def B(points,size,opacity=.5,**kw):return dict(points=points,size=size,opacity=opacity,preset='x) Filter Blur',**kw)
def M(points,size,opacity=.35):return dict(points=points,size=size,opacity=opacity,preset='k) Blender Blur',alphaLock=True)
def C(points,size,color,opacity=.4):return dict(points=points,size=size,color=color,opacity=opacity,preset='b) Airbrush Soft',alphaLock=True)
def checkpoint():
 for p in rows:png(NODES[p['id']],OUT/'final-parts'/p['id']/'full.png')
 for n in NODES.values():n.setVisible(True)
 DOC.refreshProjection();DOC.waitForDone()
 assert DOC.saveAs(str(OUT/'character-soft-edges-final.kra'));DOC.waitForDone()
 composite(OUT/'preview-final.png')
for p in rows:png(NODES[p['id']],OUT/'final-parts'/p['id']/'full.png')
DOC.setBatchmode(False)
VIEW.canvas().setZoomLevel(.6)
print('Continuation ready',len(NODES),'paint layers. Presets:',[s for s in APP.resources('preset') if 'Blur' in s or 'Airbrush Soft' in s])
