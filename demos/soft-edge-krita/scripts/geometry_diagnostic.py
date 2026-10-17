"""Read-only geometry support check, never generates or changes artwork."""
from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
from scipy.ndimage import distance_transform_edt
p=Path(__file__).resolve().parents[1];base=p.parent/'gray-control-krita';rs=json.loads((p/'manifest.json').read_text())['parts'];out=[]
for r in rs:
 a=np.array(Image.open(base/'parts'/r['id']/'full.png').convert('RGBA'));b=np.array(Image.open(p/'final-parts'/r['id']/'full.png').convert('RGBA'));m={}
 for t in [16,128]:
  aa=a[:,:,3]>=t;bb=b[:,:,3]>=t
  add=bb&~aa;rem=aa&~bb
  da=distance_transform_edt(~aa);db=distance_transform_edt(~bb)
  m[str(t)]={'newOutsideMaxPixels':float(da[add].max()) if add.any() else 0,'removedInsideMaxPixels':float(db[rem].max()) if rem.any() else 0,'areaDeltaPixels':int(bb.sum()-aa.sum())}
 out.append({'level':r['level'],'id':r['id'],'changed':bool(np.any(a!=b)),'thresholdChecks':m})
report={'note':'Read-only supporting diagnostics. Threshold distances do not replace visual acceptance. No pixel repair generated.','sourceUnchanged':hashlib.sha256((base/'character-depth.kra').read_bytes()).hexdigest()==json.loads((p/'baseline.json').read_text())['sha256'],'layers':out}
(p/'geometry-diagnostic.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('source unchanged',report['sourceUnchanged'],'changed',sum(r['changed'] for r in out))
print('128 threshold >2px',[(r['level'],r['thresholdChecks']['128']) for r in out if max(r['thresholdChecks']['128']['newOutsideMaxPixels'],r['thresholdChecks']['128']['removedInsideMaxPixels'])>2])
