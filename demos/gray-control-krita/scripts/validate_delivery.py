"""Check storage, controls, geometry and provenance; visual review is separate."""
from pathlib import Path
import hashlib,json
from io import BytesIO
import cairosvg
from PIL import Image
import numpy as np
R=Path(__file__).resolve().parents[1]
parts=json.loads((R/'manifest.json').read_text())['parts'];verified=json.loads((R/'krita-reopen-verification.json').read_text())
revisions={p['id']:p for p in json.loads((R/'shape-revisions.json').read_text())['parts']} if (R/'shape-revisions.json').exists() else {}
assert verified['ok'] and verified['paintLayers']==90 and verified['pixelVerified']==90 and verified['transparencyMasks']==0
rows=[]
for p in parts:
 f=R/'parts'/p['id'];image=Image.open(f/'full.png').convert('RGBA');rgba=np.array(image);shape=np.array(Image.open(f/'shape.png'))
 assert np.array_equal(rgba[:,:,3],shape),p['id']+' alpha differs from delivery contour'
 standard=np.array(Image.open(BytesIO(cairosvg.svg2png(url=str(R/'standard/parts'/f"{p['id']}.svg")))).convert('RGBA'))[:,:,3]
 deviation=not np.array_equal(shape,standard)
 assert deviation==(p['id'] in revisions),p['id']+' unrecorded standard geometry difference'
 if deviation:
  assert hashlib.sha256((f/'shape.png').read_bytes()).hexdigest()==revisions[p['id']]['shapeSha256'],p['id']+' revision contour differs from reviewed contour'
 control=np.array(Image.open(f/'control.png'));inp=np.array(Image.open(f/'input.png'));outside=control[:,:,0]==0;nonred=control[:,:,1]!=0
 assert np.all(rgba[outside,3]==0),p['id']+' nontransparent green'
 assert np.all(inp[nonred]==160),p['id']+' final nonred input not grey'
 c=np.array(Image.open(f/'control-model.png'));i=np.array(Image.open(f/'input-model.png'));assert np.all(i[c[:,:,1]!=0]==160),p['id']+' model nonred input not grey'
 c=np.array(Image.open(f/'control-crop.png'));i=np.array(Image.open(f/'input-crop.png'));assert np.all(i[c[:,:,1]!=0]==160),p['id']+' crop nonred input not grey'
 reg=json.loads((f/'registration.json').read_text());assert hashlib.sha256((f/'generated.png').read_bytes()).hexdigest()==reg['generationSha256']
 name=f"{p['level']:02d} {p['id']}";assert hashlib.sha256(image.tobytes('raw','BGRA')).hexdigest()==verified['layerPixelSha256'][name],name+' PNG differs from reopened layer'
 rows.append(dict(id=p['id'],level=p['level'],shapeDeviation=deviation,greenTransparent=True,greyInputs=True,modelOutputPresent=True,reopenedPixelsIdentical=True))
report=dict(ok=True,parts=len(rows),canvas=[1024,1536],standardCommit='0f11ad1b',geometryDeviationCount=sum(p['shapeDeviation'] for p in rows),geometryRevisions='shape-revisions.json' if revisions else None,checks='File integrity, frozen standard and explicitly reviewed contour revisions only; no PSNR or appearance score.',rows=rows)
(R/'delivery-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f"90/90: verified delivery alpha ({len(revisions)} recorded standard deviations); green transparent; grey inputs; actual model outputs; reopened layer pixels identical.")
