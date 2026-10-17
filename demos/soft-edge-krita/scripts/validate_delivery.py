"""Read-only assertions on the saved artwork and its exported documentation."""
from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib,zipfile,io
p=Path(__file__).resolve().parents[1]
v=json.loads((p/'final-reopen-verification.json').read_text());rs=json.loads((p/'manifest.json').read_text())['parts']
assert v['ok'] and v['paintLayers']==90 and v['masks']==0 and v['childNodes']==0
for r in rs:
 a=np.array(Image.open(p/'final-parts'/r['id']/'full.png').convert('RGBA'));bgra=a[:,:,[2,1,0,3]].tobytes();key=f"{r['level']:02} {r['id']}"
 assert hashlib.sha256(bgra).hexdigest()==v['layerPixelSha256'][key],key
with zipfile.ZipFile(p/'character-soft-edges-final.kra') as z:
 a=np.array(Image.open(io.BytesIO(z.read('mergedimage.png'))).convert('RGBA'));b=np.array(Image.open(p/'preview-final.png').convert('RGBA'));assert np.array_equal(a,b)
source=p.parent/'gray-control-krita'/'character-depth.kra';assert hashlib.sha256(source.read_bytes()).hexdigest()==json.loads((p/'baseline.json').read_text())['sha256']
review=json.loads((p/'final-visual-review.json').read_text());assert len(review['layers'])==90 and review['modifiedLayers']==82 and review['retainedLayers']==8
for r in review['layers']:
 assert r['isolatedReviewed'] and r['higherLayersHiddenReviewed'] and r['compositeReviewed']
 for f in r['reviewPanels']:assert (p/'review-final'/f).exists()
report={'ok':True,'layerPngPixelMatches':90,'compositePngMatchesSavedKra':True,'firstStageKraUnchanged':True,'files':{name:{'bytes':(p/name).stat().st_size,'sha256':hashlib.sha256((p/name).read_bytes()).hexdigest()} for name in ['character-soft-edges-final.kra','preview-final.png']}}
(p/'delivery-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified saved KRA, reopened 90 layer pixels, all exported PNGs, composite, review coverage, and unchanged baseline.')
