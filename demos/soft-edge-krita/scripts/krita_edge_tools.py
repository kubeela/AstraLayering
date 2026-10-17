"""Execute explicit, visually chosen local brush paths in the step-two KRA.

No image filter, alpha formula, source-image transfer or automatic edge tracing
is used to alter art. Each operation is a real Krita brush stroke.
"""
from PyQt5.QtCore import QPointF

def brush(pid, strokes, issue, note):
    node=NODES[pid]
    DOC.setActiveNode(node)
    APP.action('deselect').trigger()
    before=digest(node)
    for s in strokes:
        preset=s.get('preset','k) Blender Blur')
        VIEW.setCurrentBrushPreset(APP.resources('preset')[preset])
        VIEW.setBrushSize(float(s['size']))
        VIEW.setPaintingOpacity(float(s.get('opacity',.45)))
        node.setAlphaLocked(bool(s.get('alphaLock',False)))
        if 'color' in s:
            c=ManagedColor('RGBA','U8','')
            r,g,b=s['color'];c.setComponents([b/255,g/255,r/255,1])
            VIEW.setForeGroundColor(c)
        pts=s['points']
        for a,b in zip(pts,pts[1:]):
            node.paintLine(QPoint(int(a[0]),int(a[1])),QPoint(int(b[0]),int(b[1])),1,1,'')
        DOC.waitForDone()
    node.setAlphaLocked(False)
    after=digest(node)
    png(node,OUT/'parts'/pid/'full.png')
    EDIT_LOG.append(dict(id=pid,issue=issue,note=note,strokes=strokes,before=before,after=after,changed=before!=after))
    (OUT/'brush-edits.json').write_text(json.dumps(EDIT_LOG,ensure_ascii=False,indent=2)+'\n')
    DOC.refreshProjection();DOC.waitForDone()

def composite(path='preview-working.png'):
    DOC.refreshProjection();DOC.waitForDone()
    info=InfoObject();info.setProperty('alpha',True)
    assert DOC.exportImage(str(OUT/'runtime'/path),info)
    DOC.waitForDone()

def export_below(pid):
    # Native projection with exactly the higher layers hidden, for visual review.
    order=list(NODES);level=order.index(pid)
    for i,(key,n) in enumerate(NODES.items()):n.setVisible(i<=level)
    composite('below/'+pid+'.png')
    for n in NODES.values():n.setVisible(True)
    DOC.refreshProjection();DOC.waitForDone()
