from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import json,re,hashlib
p=Path('tmp/eyes-rerun/step2')
src=Path('refinement/groups/face/6.投影与高光效果/character.svg')
out=Path('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/character.svg')
r=E.parse(str(out)).getroot()
NS={'s':r.nsmap[None]}
def clone(name,hide=(),isolate=False):
 c=deepcopy(r)
 if isolate:
  for n in list(c):
   if E.QName(n).localname not in ('defs','title') and n.get('id') not in ('eye_right','eye_left'): c.remove(n)
 for id in hide:
  for n in c.xpath('//*[@id=$id]',id=id): n.set('display','none')
 E.ElementTree(c).write(str(p/(name+'.svg')),encoding='utf-8',xml_declaration=True)
clone('no-iris',['eye_right_eye_black','eye_left_eye_black'])
clone('contours-only',['eye_right_eye_black','eye_left_eye_black'],True)
clone('white-only',['eye_right_eye_black','eye_left_eye_black','eye_right_lower_lid','eye_right_upper_lid','eye_left_lower_lid','eye_left_upper_lid'],True)
clone('eyes-off',['eye_right','eye_left'])
ids=[n.get('id') for n in r.iter() if n.get('id')]
assert len(ids)==len(set(ids))
refs=[]
for n in r.iter():
 for a,v in n.attrib.items():
  refs+=re.findall(r'url\(#([^)]*)\)',v)
  if a.endswith('href') and v.startswith('#'): refs.append(v[1:])
assert set(refs)<=set(ids),set(refs)-set(ids)
s=E.parse(str(src)).getroot()
source_groups={n.get('id'):E.tostring(n) for n in s if E.QName(n).localname=='g' and n.get('id') not in ('eye_right','eye_left')}
changed=[]
for k,v in source_groups.items():
 n=r.xpath('//*[@id=$id]',id=k)[0]
 if E.tostring(n)!=v: changed.append(k)
assert not changed,changed
for part in ['eye_right','eye_left']:
 e=r.xpath('//*[@id=$id]',id=part)[0]
 assert e.get('data-part')==part and e.get('data-kind')=='eyes'
 assert len(e.xpath('.//s:path[@id=$id]',namespaces=NS,id=part+'_sclera_shape'))==1
 clip=r.xpath('//*[@id=$id]',id=part+'_sclera_clip')[0]
 assert clip[0].get('href')=='#'+part+'_sclera_shape'
 assert len(e.xpath('.//s:path[@id=$id]',namespaces=NS,id=part+'_iris_base'))==1
assert not r.xpath('//s:image',namespaces=NS)
report={'source_svg':str(src),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'output_svg':str(out),'output_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'ids_unique':True,'references_resolve':True,'unaffected_top_level_groups':len(source_groups),'unaffected_groups_changed':changed,'eye_white_paths':2,'independent_clips':2,'raster_embeds':0,'crop_coordinates':[390,178,110,41],'direct_svg_scale':12}
(p/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
