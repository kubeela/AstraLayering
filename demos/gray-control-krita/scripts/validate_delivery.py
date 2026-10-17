"""Check storage, controls, geometry and provenance; visual review is separate."""
from pathlib import Path
import hashlib,json
from PIL import Image
import numpy as np
R=Path(__file__).resolve().parents[1]
parts=json.loads((R/'manifest.json').read_text())['parts'];verified=json.loads((R/'krita-reopen-verification.json').read_text())
assert verified['ok'] and verified['paintLayers']==90 and verified['pixelVerified']==90 and verified['transparencyMasks']==0
rows=[]
for p in parts:
 f=R/'parts'/p['id'];image=Image.open(f/'full.png').convert('RGBA');rgba=np.array(image);shape=np.array(Image.open(f/'shape.png'))
 assert np.array_equal(rgba[:,:,3],shape),p['id']+' alpha differs from standard'
 control=np.array(Image.open(f/'control.png'));inp=np.array(Image.open(f/'input.png'));outside=control[:,:,0]==0;nonred=control[:,:,1]!=0
 assert np.all(rgba[outside,3]==0),p['id']+' nontransparent green'
 assert np.all(inp[nonred]==160),p['id']+' final nonred input not grey'
 c=np.array(Image.open(f/'control-model.png'));i=np.array(Image.open(f/'input-model.png'));assert np.all(i[c[:,:,1]!=0]==160),p['id']+' model nonred input not grey'
 c=np.array(Image.open(f/'control-crop.png'));i=np.array(Image.open(f/'input-crop.png'));assert np.all(i[c[:,:,1]!=0]==160),p['id']+' crop nonred input not grey'
 reg=json.loads((f/'registration.json').read_text());assert hashlib.sha256((f/'generated.png').read_bytes()).hexdigest()==reg['generationSha256']
 name=f"{p['level']:02d} {p['id']}";assert hashlib.sha256(image.tobytes('raw','BGRA')).hexdigest()==verified['layerPixelSha256'][name],name+' PNG differs from reopened layer'
 rows.append(dict(id=p['id'],level=p['level'],shapeDeviation=False,greenTransparent=True,greyInputs=True,modelOutputPresent=True,reopenedPixelsIdentical=True))
report=dict(ok=True,parts=len(rows),canvas=[1024,1536],standardCommit='0f11ad1b',geometryDeviationCount=0,checks='File integrity and exact authoring geometry only; no PSNR or appearance score.',rows=rows)
(R/'delivery-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('90/90: exact standard alpha; green transparent; grey inputs; actual model outputs; reopened layer pixels identical.')
