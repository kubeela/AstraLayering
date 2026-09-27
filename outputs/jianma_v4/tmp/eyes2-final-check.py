from pathlib import Path
from lxml import etree as ET
from PIL import Image
import json,re,hashlib
out=Path('refinement/groups/eyes/2.眼型校准与轮廓部件绘制')
r=ET.parse(str(out/'character.svg')).getroot()
ids={e.get('id') for e in r.iter() if e.get('id')}
refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^)]+)\)',v)
  if k.endswith('href') and v.startswith('#'):refs.append(v[1:])
assert set(refs)<=ids,sorted(set(refs)-ids)
im=Image.open(out/'preview.png')
assert im.size==(941,1672) and im.mode=='RGB'
assert all(im.getpixel(p)==(255,255,255) for p in [(0,0),(940,0),(0,1671),(940,1671)])
vpath=out/'evidence'/'validation.json';v=json.loads(vpath.read_text(encoding='utf-8'))
v.update({'all_svg_resource_references_valid':True,'svg_resource_reference_count':len(refs),'preview_size':list(im.size),'preview_mode':im.mode,'preview_white_background':True,'svg_sha256':hashlib.sha256((out/'character.svg').read_bytes()).hexdigest(),'visual_checks':['normal-size','same-coordinate-overlay','contours-only','complete-sclera-with-eye-black-hidden','clean-face-with-entire-eyes-hidden'],'visual_ambiguity':'Minor: source outer corners are partially obscured by hair; hidden eye surface is inferred from the visible arcs.'})
vpath.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v[k] for k in ['all_svg_resource_references_valid','svg_resource_reference_count','preview_size','preview_mode','preview_white_background','svg_sha256']},ensure_ascii=False))
