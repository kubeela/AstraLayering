from pathlib import Path
from lxml import etree as E
from PIL import Image,ImageChops
import json,re,hashlib
out=Path('refinement/groups/eyes/3.关联部件校准');e=out/'evidence'
r=E.parse(str(out/'character.svg')).getroot();ids={x.get('id') for x in r.iter() if x.get('id')};refs=[]
for el in r.iter():
 for k,v in el.attrib.items():
  refs+=re.findall(r'url\(#([^)]+)\)',v)
  if k.endswith('href') and v.startswith('#'):refs.append(v[1:])
assert set(refs)<=ids
im=Image.open(out/'preview.png');assert im.size==(941,1672) and im.mode=='RGB'
assert all(im.getpixel(p)==(255,255,255) for p in [(0,0),(940,0),(0,1671),(940,1671)])
before=Image.open('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/preview.png').convert('RGB')
bbox=ImageChops.difference(before,im).getbbox()
assert bbox[0]>=370 and bbox[1]>140 and bbox[2]<=516 and bbox[3]<220,bbox
threshold=ImageChops.difference(before,im).convert('RGB').point(lambda p: 255 if p>1 else 0)
meaningful_bbox=threshold.getbbox()
assert meaningful_bbox[0]>=390 and meaningful_bbox[2]<500 and meaningful_bbox[3]<220,meaningful_bbox
for side in ['left','right']:
 casts=r.xpath('.//*[@data-source-part=$p]',p='hair_front_'+side)
 assert len(casts)==1
 assert casts[0].get('data-target-part')=='face_base'
 assert casts[0].get('clip-path')=='url(#face6_surface_face_base)'
v=json.loads((e/'validation.json').read_text(encoding='utf-8'))
v.update({'all_svg_references_valid':True,'resource_references':len(refs),'preview_size':list(im.size),'preview_white_rgb':True,'pixel_change_bbox_from_step2':list(bbox),'pixel_change_bbox_above_one_channel_level':list(meaningful_bbox),'one_cast_shadow_per_front_hair_source':True,'svg_sha256':hashlib.sha256((out/'character.svg').read_bytes()).hexdigest(),'visual_checks':['whole-head','same-origin-eye-overlay','normal-size','front-hair-hidden','front-hair-and-linked-shadows-hidden']})
(e/'validation.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(v,ensure_ascii=False))

