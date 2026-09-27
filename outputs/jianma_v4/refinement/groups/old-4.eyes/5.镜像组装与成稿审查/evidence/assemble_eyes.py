from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/eyes/5.镜像组装与成稿审查');P.mkdir(parents=True,exist_ok=True);(P/'evidence').mkdir(exist_ok=True)
SOURCE=Path('refinement/groups/eyes/4.逐眼投影与高光/eye_right/character.svg')
EXPECTED='79ab7771c490cecc98203e8d1f3a63557ee74802070938b5df5916d859298b8e'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
plan=json.loads(Path('refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'))
assert plan['mirror']=={'source':'eye_right','target':'eye_left','axis':[[444,180],[444,220]]}
stages={}
for folder,comparison in [('2.逐眼线稿','校准对照.png'),('3.逐眼着色','着色对照.png'),('4.逐眼投影与高光','效果对照.png')]:
 q=Path('refinement/groups/eyes')/folder/'eye_right'
 for n in ['character.svg','preview.png','说明.md',comparison]:assert (q/n).is_file(),str(q/n)
 stages[folder]={'svg_sha256':hashlib.sha256((q/'character.svg').read_bytes()).hexdigest(),'required_outputs_present':True}
review=Path('reviews/refinement/eyes/line-art/eye_right/审查.md').read_text(encoding='utf-8')
assert '结论：通过' in review and stages['2.逐眼线稿']['svg_sha256'] in review

S=E.parse(str(SOURCE)).getroot();r=deepcopy(S);NS='http://www.w3.org/2000/svg'
def get(t,id):return t.xpath('.//*[@id="'+id+'"]')[0]
source=get(r,'eye_right');old=get(r,'eye_left');target=deepcopy(source)
mapping={e.get('id'):e.get('id').replace('eye_right','eye_left').replace('eye3_right','eye3_left').replace('eye4_right','eye4_left') for e in source.iter() if e.get('id')}
assert all(a!=b for a,b in mapping.items())
for e in target.iter():
 for k,v in list(e.attrib.items()):
  if k=='id':e.set(k,mapping[v]);continue
  if v in mapping:e.set(k,mapping[v]);continue
  v=re.sub(r'url\(#([^\)]+)\)',lambda m:'url(#'+mapping.get(m[1],m[1])+')',v)
  if k in ('href','{http://www.w3.org/1999/xlink}href') and v.startswith('#'):v='#'+mapping.get(v[1:],v[1:])
  e.set(k,v)
assert source.get('transform') is None
target.set('transform','matrix(-1 0 0 1 888 0)')
target.set('data-mirror-source-part','eye_right');target.set('data-mirror-axis','444 180 444 220');target.set('data-mirror-count','1')
target.find('{'+NS+'}title').text='角色左眼（画面右）· 沿锁定轴独立镜像组装'
target.find('{'+NS+'}desc').text='按 x=444 一次镜像已完成主眼；完整路径、颜色、投影、高光和裁切资源均为当前眼独立副本。辅助线默认关闭。'
r.replace(old,target)
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

def isolated(part,off=False):
 t=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox=('394 185 45 28' if part=='eye_right' else '449 185 45 28'),width='1080',height='672')
 g=deepcopy(get(r,part))
 if off:
  for e in g.iter():
   if e.get('data-effect') in ('cast-shadow','highlight'):e.set('display','none')
 t.append(g)
 E.ElementTree(t).write(str(P/'evidence'/(part+('-off' if off else '-on')+'.svg')),encoding='utf-8',xml_declaration=True)
for part in ['eye_right','eye_left']:
 for off in [False,True]:isolated(part,off)
clean=E.parse('refinement/groups/eyes/3.逐眼着色/eye_right/character.svg').getroot()
t=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672');t.append(deepcopy(get(clean,'eye_right')))
E.ElementTree(t).write(str(P/'evidence/source-clean-reference.svg'),encoding='utf-8',xml_declaration=True)

ids=[e.get('id') for e in r.iter() if e.get('id')];idset=set(ids);refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k in ('href','{http://www.w3.org/1999/xlink}href') and v.startswith('#'):refs.append(v[1:])
  if k in ('data-source-id','data-target-id','data-relative-to'):refs.append(v)
targetrefs=[]
for e in target.iter():
 for k,v in e.attrib.items():
  targetrefs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k in ('href','{http://www.w3.org/1999/xlink}href') and v.startswith('#'):targetrefs.append(v[1:])
  if k in ('data-source-id','data-target-id','data-relative-to'):targetrefs.append(v)
owned=set(mapping.values());effects=[]
for part in ['eye_right','eye_left']:
 for e in get(r,part).iter():
  if e.get('data-effect') in ('cast-shadow','highlight'):effects.append(dict(e.attrib))
audit={'input_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),
 'stages':stages,'line_art_review_passed_and_hash_matched':True,
 'plan_sha256':hashlib.sha256(Path('refinement/groups/eyes/1.制作计划/plan.json').read_bytes()).hexdigest(),
 'canvas':dict(r.attrib),'mirror':plan['mirror'],'mirror_matrix':target.get('transform'),
 'source_eye_xml_unchanged':E.tostring(get(S,'eye_right'))==E.tostring(source),
 'all_non_target_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='eye_left'),
 'cloned_unique_id_count':len(mapping),'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),
 'unresolved_resource_or_effect_references':sorted(set(refs)-idset),
 'target_references_to_source_owned_nodes':sorted(set(targetrefs)&set(mapping)),
 'target_external_references':sorted(set(targetrefs)-owned),
 'eye_layer_indexes':{p:list(r).index(get(r,p)) for p in ['eye_right','eye_left']},
 'hair_front_indexes':[list(r).index(get(r,'hair_front_right')),list(r).index(get(r,'hair_front_left'))],
 'construction_guides':{p:get(r,p+'_construction_guides').get('display') for p in ['eye_right','eye_left']},
 'effects':effects}
(P/'evidence/audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
(P/'evidence/id-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
