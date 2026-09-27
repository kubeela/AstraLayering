from pathlib import Path
from lxml import etree as E
from PIL import Image,ImageChops
import json,re,hashlib
out=Path('refinement/groups/eyes/5.眼黑与装饰部件绘制');ev=out/'evidence';r=E.parse(str(out/'character.svg')).getroot();ids={el.get('id') for el in r.iter() if el.get('id')};refs=[]
for el in r.iter():
 for k,v in el.attrib.items():
  refs+=re.findall(r'url\(#([^)]+)\)',v)
  if k.endswith('href') and v.startswith('#'):refs.append(v[1:])
assert set(refs)<=ids
for part in ['eye_right','eye_left']:
 get=lambda id:r.xpath('.//*[@id=$id]',id=id)[0]
 assert get(part+'_interior').get('clip-path')=='url(#'+part+'_sclera_clip)'
 assert get(part+'_iris_surface_clip')[0].get('href')=='#'+part+'_eye_black_shape'
 shape=get(part+'_eye_black_shape');assert shape.get('d').count('M')==1 and shape.get('d').endswith('Z')
 assert get(part+'_upper_lashes_foreground').get('data-part')==part
 assert get(part+'_upper_lashes_foreground').get('data-kind')=='eyes'
 assert get(part+'_eye_black').get('data-status')=='complete-step-5'
 assert get(part+'_pupil_shape').tag.endswith('ellipse')
now=Image.open(out/'preview.png');assert now.size==(941,1672) and now.mode=='RGB'
assert all(now.getpixel(p)==(255,255,255) for p in [(0,0),(940,0),(0,1671),(940,1671)])
baseline=Image.open('refinement/groups/eyes/4.眼周肤色与局部层次/evidence/no-eyes.png').convert('RGB')
assert ImageChops.difference(baseline,Image.open(ev/'no-eyes.png').convert('RGB')).getbbox() is None
v=json.loads((ev/'validation.json').read_text(encoding='utf-8'))
v.update({'all_resource_references_valid':True,'resource_references':len(refs),'preview_white_rgb':True,'preview_size':list(now.size),'final_sclera_clips_restored':True,'complete_iris_path_and_pupil_geometry_verified':True,'all_eye_fragments_off_pixel_identical_to_step4_eyes_off':True,'visual_checks':['head-identity','same-origin-eye-detail','unclipped-complete-eye-black','decoration-only','decoration-off-contours','all-eye-fragments-off'],'svg_sha256':hashlib.sha256((out/'character.svg').read_bytes()).hexdigest()})
(ev/'validation.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(v,ensure_ascii=False))
