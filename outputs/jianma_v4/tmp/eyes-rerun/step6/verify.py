from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import json,re,hashlib
p=Path('tmp/eyes-rerun/step6');source=Path('refinement/groups/eyes/5.眼黑与装饰部件绘制/character.svg');target=Path('refinement/groups/eyes/6.投影与高光效果/character.svg')
s=E.parse(str(source)).getroot();r=E.parse(str(target)).getroot();NS=r.nsmap[None]
def byid(doc,id):return doc.xpath('//*[@id=$id]',id=id)[0]
def save(doc,name):E.ElementTree(doc).write(str(p/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def hide_ids(doc,ids):
 for id in ids:byid(doc,id).set('display','none')
def effects(doc,part=None):return [n for n in doc.xpath('//*[@data-effect and @data-kind="eyes"]') if part is None or n.get('data-part')==part]
def shell():
 c=deepcopy(r)
 for n in list(c):
  if E.QName(n).localname not in ['defs','title']:c.remove(n)
 return c
for name,parts in [('right-effects-off',['eye_right']),('left-effects-off',['eye_left']),('effects-off',['eye_right','eye_left'])]:
 c=deepcopy(r)
 for part in parts:
  for n in effects(c,part):n.set('display','none')
 save(c,name)
for name,parts in [('right-lid-source-off',['eye_right']),('left-lid-source-off',['eye_left']),('lid-sources-off',['eye_right','eye_left'])]:
 c=deepcopy(r)
 for part in parts:
  id=part+'_upper_lid';byid(c,id).set('display','none')
  for n in c.xpath('//*[@data-source-id=$id]',id=id):n.set('display','none')
 save(c,name)
c=deepcopy(r)
for part in ['hair_front_right','hair_front_left']:
 for n in c.xpath('//*[@data-part=$part or @data-source-part=$part]',part=part):n.set('display','none')
save(c,'front-hair-sources-off')
for name,doc in [('eyes-off',r),('source-eyes-off',s)]:
 c=deepcopy(doc)
 for n in c.xpath('//*[@data-part="eye_right" or @data-part="eye_left"]'):n.set('display','none')
 save(c,name)
for name,parts,effectkind in [('effects-only',['eye_right','eye_left'],None),('right-effects-only',['eye_right'],None),('left-effects-only',['eye_left'],None),('highlights-only',['eye_right','eye_left'],'highlight')]:
 c=shell();defs=c.find('{'+NS+'}defs')
 for part in ['eye_right','eye_left']:
  for suffix in ['sclera_shape','iris_base']:defs.append(deepcopy(byid(r,part+'_'+suffix)))
 for part in parts:
  for n in effects(r,part):
   if effectkind and n.get('data-effect')!=effectkind:continue
   wrap=E.SubElement(c,'{'+NS+'}g',{'clip-path':'url(#'+part+'_sclera_clip)'})
   wrap.append(deepcopy(n))
 save(c,name)
c=shell()
for part in ['eye_right','eye_left']:c.append(deepcopy(byid(r,part+'_sclera')))
save(c,'complete-sclera')
c=shell()
for part in ['eye_right','eye_left']:c.append(deepcopy(byid(r,part+'_eye_black')))
save(c,'complete-eye-black')
c=deepcopy(r)
for part in ['eye_right','eye_left']:
 byid(c,part+'_contents').attrib.pop('clip-path',None)
 for n in effects(c,part):n.set('display','none')
save(c,'unclipped-eye-black-context')
ids=[n.get('id') for n in r.iter() if n.get('id')];assert len(ids)==len(set(ids))
refs=[]
for n in r.iter():
 for a,v in n.attrib.items():
  refs+=re.findall(r'url\(#([^)]*)\)',v)
  if a.endswith('href') and v.startswith('#'):refs.append(v[1:])
assert set(refs)<=set(ids)
partids=set(re.findall(r'^\s*- id:\s*(\S+)',Path('structure/parts.yaml').read_text(encoding='utf-8'),re.M))
relations=[]
for n in effects(r):
 assert n.get('data-target-part') in partids
 assert n.get('data-target-id') in ids
 assert n.get('data-part') in ['eye_left','eye_right']
 assert n.get('data-effect') in ['cast-shadow','highlight']
 if n.get('data-effect')=='cast-shadow':
  assert n.get('data-source-part') in partids and n.get('data-source-id') in ids
  assert E.QName(byid(r,n.get('data-source-id'))).localname!='clipPath'
 assert E.QName(byid(r,n.get('data-target-id'))).localname!='clipPath'
 part=n.get('data-part')
 assert byid(r,part+'_eye_black') not in n.iterancestors()
 if n.get('data-target-id')==part+'_eye_black':
  assert n.get('clip-path')=='url(#'+part+'_iris_full_clip)'
  assert any(a.get('clip-path')=='url(#'+part+'_sclera_clip)' for a in n.iterancestors())
 relations.append(dict(n.attrib))
changed=[]
for n in s:
 if E.QName(n).localname!='g':continue
 if E.tostring(n)!=E.tostring(byid(r,n.get('id'))):changed.append(n.get('id'))
assert set(changed)=={'eye_right','eye_left'}
for part in ['eye_right','eye_left']:
 for suffix in ['sclera','upper_lid','lower_lid','skin_volume','makeup','eyelid','upper_lashes','upper_lashes_front','pupil']:
  assert E.tostring(byid(s,part+'_'+suffix))==E.tostring(byid(r,part+'_'+suffix))
 assert byid(r,part+'_contents').get('clip-path')=='url(#'+part+'_sclera_clip)'
 assert byid(r,part+'_iris_base').get('d')==byid(r,part+'_iris_edge_shape').get('d')
 for suffix in ['iris_base','pupil_shape','sclera_shape']:assert byid(r,part+'_'+suffix).get('d').strip().endswith('Z')
changeddefs=[]
for n in s.find('{'+NS+'}defs'):
 if E.tostring(n)!=E.tostring(byid(r,n.get('id'))):changeddefs.append(n.get('id'))
assert set(changeddefs)=={'eye_right_iris_edge_color','eye_left_iris_edge_color'}
report={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'declared_parts':len(partids),'changed_existing_top_level_groups':changed,'unchanged_face_and_front_lash_fragments':True,'unchanged_contours_sclera_skin_makeup_decorations_pupils':True,'iris_lower_completion_adjusted':True,'changed_existing_definitions':changeddefs,'new_effects':len(relations),'relations':relations,'shadow_groups_outside_eye_black':True,'iris_effects_double_clipped':True,'ids_unique':True,'references_resolve':True,'delivery_sclera_clips_active':True,'animation_binding_tested':False}
(p/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Verified',len(ids),'ids;',len(partids),'parts;',len(relations),'new eye effects.')
