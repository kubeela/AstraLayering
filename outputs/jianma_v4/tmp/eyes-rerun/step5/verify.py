from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import json,re,hashlib
p=Path('tmp/eyes-rerun/step5');source=Path('refinement/groups/eyes/4.眼周肤色与局部层次/character.svg');target=Path('refinement/groups/eyes/5.眼黑与装饰部件绘制/character.svg')
s=E.parse(str(source)).getroot();r=E.parse(str(target)).getroot();NS=r.nsmap[None]
def byid(doc,id):return doc.xpath('//*[@id=$id]',id=id)[0]
def save(doc,name):E.ElementTree(doc).write(str(p/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def shell():
 c=deepcopy(r)
 for n in list(c):
  if E.QName(n).localname not in ['defs','title']:c.remove(n)
 return c
def isolated_black(name,clipped):
 c=shell()
 for part in ['eye_right','eye_left']:
  outer=E.SubElement(c,'{'+NS+'}g',{'data-part':part,'data-kind':'eyes'})
  if clipped:outer.set('clip-path','url(#'+part+'_sclera_clip)')
  # Sclera paths must remain addressable for the existing clip references.
  sclera=deepcopy(byid(r,part+'_sclera_shape'));c.find('{'+NS+'}defs').append(sclera)
  outer.append(deepcopy(byid(r,part+'_eye_black')))
 save(c,name)
isolated_black('eye-black-isolated',True);isolated_black('eye-black-unclipped',False)
c=shell()
for part in ['eye_right','eye_left']:
 for suffix in ['eyelid','upper_lashes','upper_lashes_front']:c.append(deepcopy(byid(r,part+'_'+suffix)))
save(c,'decorations-isolated')
c=deepcopy(r)
for part in ['eye_right','eye_left']:
 for suffix in ['eyelid','upper_lashes','upper_lashes_front']:byid(c,part+'_'+suffix).set('display','none')
save(c,'decorations-off')
c=deepcopy(r)
for part in ['eye_right','eye_left']:byid(c,part+'_contents').attrib.pop('clip-path',None)
save(c,'sclera-clip-off-combined')
c=deepcopy(r)
for part in ['eye_right','eye_left']:byid(c,part+'_eye_black').set('display','none')
save(c,'eye-black-off')
c=deepcopy(r)
for n in c.xpath('//*[@data-part="eye_right" or @data-part="eye_left"]'):n.set('display','none')
save(c,'eyes-off')
c=deepcopy(s)
for n in c.xpath('//*[@data-part="eye_right" or @data-part="eye_left"]'):n.set('display','none')
save(c,'source-eyes-off')
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
 if E.tostring(n)!=E.tostring(byid(r,n.get('id'))):changed.append(n.get('id'))
assert set(changed)=={'eye_right','eye_left'}
for part in ['eye_right','eye_left']:
 for suffix in ['sclera','upper_lid','lower_lid','skin_volume','makeup']:
  assert E.tostring(byid(s,part+'_'+suffix))==E.tostring(byid(r,part+'_'+suffix))
 assert byid(r,part+'_contents').get('clip-path')=='url(#'+part+'_sclera_clip)'
 assert byid(r,part+'_iris_base').get('d').strip().endswith('Z')
 assert byid(r,part+'_pupil_shape').get('d').strip().endswith('Z')
 for suffix in ['upper_lashes','upper_lashes_front','eyelid','eye_black','pupil']:
  n=byid(r,part+'_'+suffix);assert n.get('data-part')==part and n.get('data-kind')=='eyes'
for n in s.find('{'+NS+'}defs'):assert E.tostring(n)==E.tostring(byid(r,n.get('id')))
report={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'changed_existing_top_level_groups':changed,'new_top_level_groups':['eye_right_upper_lashes_front','eye_left_upper_lashes_front'],'all_other_parts_unchanged':True,'existing_contours_sclera_skin_makeup_unchanged':True,'existing_definitions_unchanged':True,'ids_unique':True,'references_resolve':True,'complete_closed_iris_paths':2,'complete_closed_pupil_paths':2,'sclera_clips_restored_in_delivery':True,'highlights_added':False,'lower_lashes':'No separately discernible strands in the reference; no empty group added.'}
(p/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
