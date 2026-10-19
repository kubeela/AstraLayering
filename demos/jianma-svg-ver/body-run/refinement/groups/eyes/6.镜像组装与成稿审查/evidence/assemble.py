from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/eyes/6.镜像组装与成稿审查');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/eyes/5.逐眼投影与高光/eye_right/character.svg')
EXPECTED='afd8eff767543f3ae9627066a1928ab1bba08d2176cbbd35d59bf6e1655128fe';assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
CLEAN=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.4.眼周皮肤明暗/character.svg');assert hashlib.sha256(CLEAN.read_bytes()).hexdigest()=='204149deb52a238e54af321258ca3059aa9a534cd2e9868b981f4418e01b71eb'
plan=json.loads(Path('refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'));assert plan['mirror']=={'source':'eye_right','target':'eye_left','axis':[[444,180],[444,220]]}
stage_paths=['2.逐眼线稿/eye_right','4.逐眼着色/eye_right/4.1.轮廓部件着色','4.逐眼着色/eye_right/4.2.眼黑颜色与层次','4.逐眼着色/eye_right/4.3.睫毛与眼皮着色','4.逐眼着色/eye_right/4.4.眼周皮肤明暗','5.逐眼投影与高光/eye_right']
deliveries={}
for step in stage_paths:
 base=Path('refinement/groups/eyes')/step
 for name in ['character.svg','preview.png','说明.md']:assert (base/name).exists(),str(base/name)
 deliveries[step]=hashlib.sha256((base/'character.svg').read_bytes()).hexdigest()
for name in ['palette.png','palette.json','说明.md']:assert (Path('refinement/groups/eyes/3.眼部色盘')/name).exists()
review=Path('reviews/refinement/eyes/line-art/eye_right/审查.md').read_text(encoding='utf-8');assert '结论：通过' in review and deliveries[stage_paths[0]] in review
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();r=deepcopy(S)
assert r.get('viewBox') in ['0 0 941 1672','0 0 941.0 1672.0']
def get(id,tree=None):return (r if tree is None else tree).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**attrs):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def target_id(id):return re.sub(r'^(eye\d+)_right_',r'\1_left_',id.replace('eye_right','eye_left'))
src=get('eye_right');idmap={e.get('id'):target_id(e.get('id')) for e in src.iter() if e.get('id')}
assert len(set(idmap.values()))==len(idmap) and all(k!=v for k,v in idmap.items())
def mirror_eye(tree):
 source=tree.xpath('.//*[@id="eye_right"]')[0];target=deepcopy(source)
 mapping={e.get('id'):target_id(e.get('id')) for e in source.iter() if e.get('id')}
 for e in target.iter():
  for k,v in list(e.attrib.items()):
   if k=='id':e.set(k,mapping[v])
   elif v in mapping:e.set(k,mapping[v])
   elif k=='href' and v.startswith('#') and v[1:] in mapping:e.set(k,'#'+mapping[v[1:]])
   else:e.set(k,re.sub(r'url\(#([^\)]+)\)',lambda m:'url(#'+mapping.get(m.group(1),m.group(1))+')',v))
 target.set('transform','matrix(-1 0 0 1 888 0)');target.set('data-mirror-source','eye_right');target.set('data-mirror-axis','444 180 444 220')
 target.find('{'+NS+'}title').text='角色左眼（画面右）· 按锁定轴完整镜像'
 # The target uses the actual shared face surface, not a mirrored copy of the face.
 # The inverse transform changes coordinates of this external clip only.
 support=target.xpath('.//*[@id="eye44_left_face_surface_support"]')[0]
 use=el('use',id='eye44_left_face_surface_support',href='#face_base_shape',transform='matrix(-1 0 0 1 888 0)',data_role='actual-face-surface-in-eye-local-coordinates')
 support.getparent().replace(support,use)
 old=tree.xpath('.//*[@id="eye_left"]')[0];old.getparent().replace(old,target)
 return target,mapping
target,_=mirror_eye(r)
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)
clean=E.parse(str(CLEAN)).getroot();mirror_eye(clean)

def save(name,tree):E.ElementTree(tree).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def view(name,tree,targets=None,box='394 182 100 34',hide=(),full=False,skin=False):
 if targets:
  nums=[float(x) for x in box.split()];out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox=box,width=str(int(nums[2]*12)),height=str(int(nums[3]*12)))
  for dd in tree.xpath('//*[local-name()="defs"]'):out.append(deepcopy(dd))
  # External face support is not in defs in the production SVG.
  globaldefs=el('defs');globaldefs.append(deepcopy(tree.xpath('.//*[@id="face_base_shape"]')[0]));out.append(globaldefs)
  for id in targets:
   obj=deepcopy(tree.xpath('.//*[@id="'+id+'"]')[0])
   for dd in obj.xpath('.//*[local-name()="defs"]'):dd.getparent().remove(dd)
   if id.startswith('eye_left_') or id.startswith('fx_eye_left_'):
    wrap=el('g',transform='matrix(-1 0 0 1 888 0)');wrap.append(obj);out.append(wrap)
   else:out.append(obj)
 else:
  out=deepcopy(tree)
  if not full:nums=[float(x) for x in box.split()];out.set('viewBox',box);out.set('width',str(int(nums[2]*12)));out.set('height',str(int(nums[3]*12)))
 for id in hide:
  for item in out.xpath('.//*[@id="'+id+'"]'):item.set('display','none')
 save(name,out)
effects_right=[e.get('id') for e in src.xpath('.//*[@data-effect]')];effects_left=[idmap[id] for id in effects_right]
view('all-effects-off',r,hide=effects_right+effects_left,full=True);save('expected-mirrored-clean',clean)
view('both-eyes-closeup',r);view('before-assembly-closeup',S)
view('right-eye-off',r,hide=['eye_right']);view('left-eye-off',r,hide=['eye_left'])
view('all-effects-off-closeup',r,hide=effects_right+effects_left)
view('both-eyes-isolated',r,['eye_right','eye_left'])
view('source-before-isolated',S,['eye_right'],box='394 182 49 34');view('source-after-isolated',r,['eye_right'],box='394 182 49 34')
view('target-isolated',r,['eye_left'],box='445 182 49 34')
expected=deepcopy(S);get('eye_right',expected).set('transform','matrix(-1 0 0 1 888 0)');view('expected-target-from-source',expected,['eye_right'],box='445 182 49 34')
view('target-skin-isolated',r,['eye_left_surround_skin'],box='445 182 49 34')
view('source-skin-isolated',r,['eye_right_surround_skin'],box='394 182 49 34')
view('target-gaze-isolated',r,['eye_left_gaze'],box='445 182 49 34');view('source-gaze-isolated',r,['eye_right_gaze'],box='394 182 49 34')
for id in effects_left:view(id,r,[id],box='445 182 49 34')

old={e.get('id'):e for e in src.iter() if e.get('id')};new={e.get('id'):e for e in target.iter() if e.get('id')}
geom_keys=['d','cx','cy','rx','ry','x','y','fill-rule','stroke-width','stroke-linecap','gradientTransform','viewBox']
geom_diff=[{'source':id,'target':idmap[id],'attr':k} for id,e in old.items() if id!='eye44_right_face_surface_support' for k in geom_keys if e.get(k)!=new[idmap[id]].get(k)]
resource_tags=['linearGradient','radialGradient','clipPath','mask','filter']
resources={tag:{'source':len(src.xpath('.//*[local-name()="'+tag+'"]')),'target':len(target.xpath('.//*[local-name()="'+tag+'"]'))} for tag in resource_tags}
iris_right=json.loads(Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.2.眼黑颜色与层次/evidence/audit.json').read_text(encoding='utf-8'))['new_material_layers']
skin_right=json.loads(Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.4.眼周皮肤明暗/evidence/audit.json').read_text(encoding='utf-8'))['skin_layer_ids']
ids=[e.get('id') for e in r.iter() if e.get('id')];refs=[];target_refs=[]
def refs_of(e):
 out=[]
 for k,v in e.attrib.items():
  out+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):out.append(v[1:])
  if k in ['data-source-id','data-target-id','data-complete-path','data-driven-by','data-follows-id']:out.append(v)
 return out
for e in r.iter():refs+=refs_of(e)
for e in target.iter():target_refs+=refs_of(e)
rootids=[e.get('id') for e in r if e.get('id')]
relations=[dict(e.attrib) for e in target.xpath('.//*[@data-effect]')]
attribute_differences=[]
for id,orig in old.items():
 if id=='eye44_right_face_surface_support':continue
 clone=new[idmap[id]]
 for k,v in orig.attrib.items():
  if k=='id':want=idmap[v]
  elif v in idmap:want=idmap[v]
  elif k=='href' and v.startswith('#') and v[1:] in idmap:want='#'+idmap[v[1:]]
  else:want=re.sub(r'url\(#([^\)]+)\)',lambda m:'url(#'+idmap.get(m.group(1),m.group(1))+')',v)
  if clone.get(k)!=want:attribute_differences.append({'source':id,'target':idmap[id],'attr':k})
audit={'input_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'plan_sha256':'459f82982d648c44f4b54468c9d4a8c391f68ea16be896fb7ae9126717e87569','stage_deliveries':deliveries,
 'mirror':plan['mirror'],'target_transform':target.get('transform'),'source_xml_unchanged':E.tostring(get('eye_right',S))==E.tostring(get('eye_right',r)),
 'non_target_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='eye_left'),
 'source_target_local_geometry_differences':geom_diff,'rewritten_attribute_differences':attribute_differences,'cloned_id_count':len(idmap),'resource_counts':resources,
 'target_iris_material_layers':[idmap[id] for id in iris_right],'target_skin_material_layers':[idmap[id] for id in skin_right],
 'target_effects':relations,'target_internal_refs_to_source_eye':sorted(set(target_refs)&set(old)),
 'target_external_refs':sorted(set(target_refs)-set(new)),
 'actual_face_clip_reference':'eye44_left_face_surface_support -> face_base_shape; inverse local-coordinate transform only',
 'eye_hair_order':{eyeid:{hair:rootids.index(eyeid)<rootids.index(hair) for hair in ['hair_front_right','hair_front_left']} for eyeid in ['eye_right','eye_left']},
 'construction_guides_hidden':all(get(id,r).get('display')=='none' for id in ['eye_right_construction_guides','eye_left_construction_guides']),
 'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),
 'status':'candidate-awaiting-independent-final-review'}
(Q/'id-map.json').write_text(json.dumps(idmap,ensure_ascii=False,indent=2),encoding='utf-8');(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
