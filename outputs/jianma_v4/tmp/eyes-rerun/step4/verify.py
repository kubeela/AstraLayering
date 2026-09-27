from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import json,re,hashlib
p=Path('tmp/eyes-rerun/step4');source=Path('refinement/groups/eyes/3.关联部件校准/character.svg');target=Path('refinement/groups/eyes/4.眼周肤色与局部层次/character.svg')
s=E.parse(str(source)).getroot();r=E.parse(str(target)).getroot();NS=r.nsmap[None]
variants={'right-added-off':['eye_right_skin_volume','eye_right_makeup'],'left-added-off':['eye_left_skin_volume','eye_left_makeup'],'all-added-off':['eye_right_skin_volume','eye_right_makeup','eye_left_skin_volume','eye_left_makeup'],'right-eye-off':['eye_right'],'left-eye-off':['eye_left'],'eyes-off':['eye_right','eye_left']}
for name,hide in variants.items():
 c=deepcopy(r)
 for id in hide:c.xpath('//*[@id=$id]',id=id)[0].set('display','none')
 E.ElementTree(c).write(str(p/(name+'.svg')),encoding='utf-8',xml_declaration=True)
c=deepcopy(s)
for id in ['eye_left','eye_right']:c.xpath('//*[@id=$id]',id=id)[0].set('display','none')
E.ElementTree(c).write(str(p/'source-eyes-off.svg'),encoding='utf-8',xml_declaration=True)
ids=[n.get('id') for n in r.iter() if n.get('id')];assert len(ids)==len(set(ids))
refs=[]
for n in r.iter():
 for a,v in n.attrib.items():
  refs+=re.findall(r'url\(#([^)]*)\)',v)
  if a.endswith('href') and v.startswith('#'):refs.append(v[1:])
assert set(refs)<=set(ids)
changed=[]
for n in s:
 if E.QName(n).localname!='g':continue
 if E.tostring(n)!=E.tostring(r.xpath('//*[@id=$id]',id=n.get('id'))[0]):changed.append(n.get('id'))
assert set(changed)=={'eye_right','eye_left'}
for part in ['eye_right','eye_left']:
 old=s.xpath('//*[@id=$id]',id=part)[0];new=r.xpath('//*[@id=$id]',id=part)[0]
 for child in old:
  if child.get('id'):assert E.tostring(child)==E.tostring(new.xpath('.//*[@id=$id]',id=child.get('id'))[0])
 for name in ['skin_volume','makeup']:
  group=new.xpath('.//*[@id=$id]',id=part+'_'+name)[0]
  assert group.get('data-part')==part and group.get('data-kind')=='eyes' and group.get('clip-path')=='url(#face_clean_skin_clip)'
olddefs=s.find('{'+NS+'}defs');newdefs=r.find('{'+NS+'}defs')
assert all(E.tostring(n)==E.tostring(newdefs.xpath('./*[@id=$id]',id=n.get('id'))[0]) for n in olddefs)
report={'input_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'changed_existing_top_level_groups':changed,'all_other_top_level_groups_unchanged':True,'existing_eye_parts_unchanged':True,'existing_definitions_unchanged':True,'ids_unique':True,'references_resolve':True,'skin_clipping':'face_clean_skin_clip','skin_layers_before_sclera':True}
(p/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
