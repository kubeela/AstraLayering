from pathlib import Path
from lxml import etree as E
from PIL import Image,ImageChops
import json,re,hashlib
out=Path('refinement/groups/eyes/4.眼周肤色与局部层次');ev=out/'evidence';r=E.parse(str(out/'character.svg')).getroot();ids={el.get('id') for el in r.iter() if el.get('id')};refs=[]
for el in r.iter():
 for k,v in el.attrib.items():
  refs+=re.findall(r'url\(#([^)]+)\)',v)
  if k.endswith('href') and v.startswith('#'):refs.append(v[1:])
assert set(refs)<=ids
preview=Image.open(out/'preview.png').convert('RGB');assert preview.size==(941,1672)
assert all(preview.getpixel(p)==(255,255,255) for p in [(0,0),(940,0),(0,1671),(940,1671)])
prior=Image.open('refinement/groups/eyes/3.关联部件校准/preview.png').convert('RGB')
assert ImageChops.difference(prior,Image.open(ev/'no-skin.png').convert('RGB')).getbbox() is None
assert ImageChops.difference(Image.open(ev/'baseline-no-eyes.png').convert('RGB'),Image.open(ev/'no-eyes.png').convert('RGB')).getbbox() is None
changes={}
for side in ['right','left']:
 part='eye_'+side;box=ImageChops.difference(preview,Image.open(ev/f'no-{side}-skin.png').convert('RGB')).getbbox();changes[part]=box
 if side=='right':assert box[2]<440
 else:assert box[0]>450
 clipshape=r.xpath('.//*[@id=$i]',i=part+'_skin_surface_shape')[0]
 face=r.xpath('.//*[@id="face_clean_skin_clip"]/*')[0].get('d');sclera=r.xpath('.//*[@id=$i]',i=part+'_sclera_shape')[0].get('d')
 assert clipshape.get('d')==face+' '+sclera
 assert clipshape.get('clip-rule')=='evenodd'
v=json.loads((ev/'validation.json').read_text(encoding='utf-8'))
v.update({'all_svg_references_valid':True,'resource_references':len(refs),'preview_size':list(preview.size),'preview_white_rgb':True,'all_new_skin_off_pixel_identical_to_step3':True,'all_eyes_off_pixel_identical_to_step3_eyes_off':True,'individual_skin_toggle_change_bboxes':changes,'skin_clip_geometry_matches_current_face_minus_own_sclera':True,'svg_sha256':hashlib.sha256((out/'character.svg').read_bytes()).hexdigest()})
(ev/'validation.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(v,ensure_ascii=False))
