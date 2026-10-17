"""Restore source artwork in visible ownership, with hand-selected exclusions.

No hidden region gets source pixels. This is the requested visible-pixel overlay,
not an occlusion completion. Repairs remain the generated/Krita-painted surface.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1]
rows=json.loads((R/'manifest.json').read_text())['parts'];src=np.array(Image.open(R/'reference.png').convert('RGBA'))
owner=np.full((1536,1024),-1,np.int16)
for p in rows:
 a=np.array(Image.open(R/'work/parts'/p['id']/'shape.png'));owner[a>0]=p['level']
EX={49:[(450,120,575,191),(504,207,521,229)],10:[(445,1340,520,1460)],11:[(505,1378,582,1460)],13:[(466,223,558,267)],50:[(520,182,565,211)],51:[(456,181,501,211)],68:[(498,238,524,248)],69:[(498,225,525,239)]}
for p in rows:
 f=R/'parts'/p['id'];w=R/'work/parts'/p['id'];a=np.array(Image.open(w/'shape.png'));v=owner==p['level']
 # Also retain the earlier explicit source-contamination removals.
 if (w/'source-cleanup.png').exists():v&=np.array(Image.open(w/'source-cleanup.png'))==0
 for x0,y0,x1,y1 in EX.get(p['level'],[]):v[y0:y1,x0:x1]=False
 overlay=src.copy();overlay[:,:,3]=np.where(v,255,0);overlay[~v]=0
 out=R/'runtime/visible-overlays'/f"{p['level']:02}.png";out.parent.mkdir(exist_ok=True);Image.fromarray(overlay).save(out)
 Image.fromarray(np.where(v,255,0).astype('uint8')).save(f/'visible-overlay-mask.png')
(R/'visible-overlay-exclusions.json').write_text(json.dumps(EX,indent=2)+'\n')
print('90 visible-only overlays, excluding inspected contamination regions')
