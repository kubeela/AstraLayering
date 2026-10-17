"""Run in the existing Krita document; human-authored regions and brush paths."""
from PyQt5.QtGui import QPainter,QLinearGradient,QColor

def write_node(pid,im):
    node=NODES[pid];im=im.convertToFormat(QImage.Format_ARGB32);b=im.constBits();b.setsize(im.sizeInBytes())
    node.setPixelData(bytes(b),0,0,1024,1536);DOC.waitForDone()
    target=OUT/'parts'/pid/'full.png';png(node,target);IMPORTED[pid]=hashlib.sha256(target.read_bytes()).hexdigest()

def underpaint(pid,strokes,note):
    n=NODES[pid];before=digest(n);data=pixels(n);original=QImage(data,1024,1536,4096,QImage.Format_ARGB32).copy()
    n.setPixelData(bytes(1024*1536*4),0,0,1024,1536);DOC.waitForDone()
    paint(pid,strokes,note)
    data=pixels(n);back=QImage(data,1024,1536,4096,QImage.Format_ARGB32).copy()
    qp=QPainter(back);qp.drawImage(0,0,original);qp.end();write_node(pid,back)
    EDIT_LOG[-1].update(mode='Krita brush underpainting, original generated paint composited above',before=before,after=digest(n))
    (OUT/'brush-edits.json').write_text(json.dumps(EDIT_LOG,ensure_ascii=False,indent=2)+'\n')

def restore_model_rect(pid,rect,feather,note):
    # Restore a hand-selected area of the already generated surface, replacing
    # unwanted original-source details. This is pixel compositing, not a fill.
    n=NODES[pid];before=digest(n);data=pixels(n);orig=QImage(data,1024,1536,4096,QImage.Format_ARGB32).copy()
    model=QImage(str(OUT/'parts'/pid/'model.png')).convertToFormat(QImage.Format_ARGB32)
    x,y,w,h=rect
    patch=model.copy(x,y,w,h)
    mask=QImage(w,h,QImage.Format_ARGB32);mask.fill(QColor(255,255,255,255))
    if feather:
        q=QPainter(mask);grad=QLinearGradient(0,h-feather,0,h);grad.setColorAt(0,QColor(255,255,255,255));grad.setColorAt(1,QColor(255,255,255,0));q.fillRect(0,h-feather,w,feather,grad);q.end()
    q=QPainter(patch);q.setCompositionMode(QPainter.CompositionMode_DestinationIn);q.drawImage(0,0,mask);q.end()
    q=QPainter(orig);q.drawImage(x,y,patch);q.end();write_node(pid,orig)
    EDIT_LOG.append(dict(id=pid,mode='hand-selected generated paint restoration',rect=rect,feather=feather,note=note,before=before,after=digest(n)))
    (OUT/'brush-edits.json').write_text(json.dumps(EDIT_LOG,ensure_ascii=False,indent=2)+'\n')
