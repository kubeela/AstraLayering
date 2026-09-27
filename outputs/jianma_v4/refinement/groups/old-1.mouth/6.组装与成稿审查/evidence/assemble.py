from pathlib import Path
from copy import deepcopy
from lxml import etree as E
import hashlib,json,re
P=Path('refinement/groups/mouth/6.组装与成稿审查');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
FIVE=Path('refinement/groups/mouth/5.独立投影与高光/character.svg');CLEAN=Path('refinement/groups/mouth/4.分部件着色/4.4.嘴周皮肤明暗/character.svg');LINE=Path('refinement/groups/mouth/2.嘴型校准与部件线稿/character.svg');PLAN=Path('refinement/groups/mouth/1.制作计划/plan.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
inputs={'stage5':(FIVE,'bad441e66eb14b924bfc749e79ef4ba7648fc7206816d243b46a52311dee7aa8'),'clean4.4':(CLEAN,'ec289fd0c2f3cf03c64b57eb980c832f53667ce7522cf9a2eedbd36380e8e71d'),'approved_line_art':(LINE,'795ccce3dba7918e3341ef977631bcb2b87670dfa3da74910e101b4b55357e4a'),'plan':(PLAN,'1240d7a52009079c9dd8034a357edfe41b4fae823699567519c27e74d2462525')}
for p,h in inputs.values():assert sha(p)==h
plan=json.loads(PLAN.read_text(encoding='utf-8'));assert plan['locked'] and plan['mouths'][0]['default_pose']=='closed';assert sha(Path('references/base-subject.png'))==plan['reference_sha256'].lower()
NS='http://www.w3.org/2000/svg';r=E.parse(str(FIVE)).getroot();s=deepcopy(r);c=E.parse(str(CLEAN)).getroot();line=E.parse(str(LINE)).getroot()
def get(id,t=None):return (r if t is None else t).xpath('.//*[@id="'+id+'"]')[0]
mouth=get('mouth');mouth.set('data-stage','mouth-static-assembly-6');mouth.set('data-review-status','candidate-awaiting-independent-review')
mouth.find('{'+NS+'}title').text='嘴部 · 默认闭嘴完整静态着色与独立效果候选'
mouth.find('{'+NS+'}desc').text='冻结已审几何；保留独立上下线与肤色遮盖、完整隐藏口腔上牙舌头、上下唇自身层次、11个嘴周皮肤色区及独立下唇柔影。辅助线和闭嘴下正式线默认关闭。结构独显仅临时变更显隐或裁切，不是新表情；未绑定网格或动画。'
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)
(P/'4.4干净着色恢复点.svg').write_bytes(CLEAN.read_bytes())
def view(name,t=None,targets=None,hide=(),show=(),unclip=(),remove=(),box='421 232 47 27',full=False):
 t=r if t is None else t;nums=list(map(float,box.split()))
 if targets:
  out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox=box,width=str(int(nums[2]*24)),height=str(int(nums[3]*24)))
  for d in t.xpath('//*[local-name()="defs"]'):out.append(deepcopy(d))
  support=E.Element('{'+NS+'}defs');support.append(deepcopy(get('face_base_shape',t)));out.append(support)
  for id in targets:
   item=deepcopy(get(id,t))
   for d in item.xpath('.//*[local-name()="defs"]'):d.getparent().remove(d)
   out.append(item)
 else:
  out=deepcopy(t)
  if not full:out.set('viewBox',box);out.set('width',str(int(nums[2]*24)));out.set('height',str(int(nums[3]*24)))
 for id in hide:get(id,out).set('display','none')
 for id in show:get(id,out).attrib.pop('display',None)
 for id in unclip:get(id,out).attrib.pop('clip-path',None)
 for id in remove:
  item=get(id,out);item.getparent().remove(item)
 E.ElementTree(out).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
view('candidate-closeup');view('candidate-context',box='414 215 62 58');view('clean-context',c,box='414 215 62 58');view('stage5-default',s,full=True);view('clean-default',c,full=True);view('clean-closeup',c)
view('default-internal-hidden',hide=['mouth_internal_visibility'],full=True);view('internal-hidden-closeup',hide=['mouth_internal_visibility']);view('covers-only-closeup',unclip=['mouth_internal_visibility']);view('guides-removed',remove=['mouth_construction_guides'],full=True);view('lower-line-removed',remove=['mouth_lower_formal_line'],full=True)
fx='fx_mouth_lower_lip_on_surround_skin'
view('effects-off',hide=[fx],full=True);view('effects-off-closeup',hide=[fx]);view('mouth-hidden',hide=['mouth'],full=True);view('stage5-mouth-hidden',s,hide=['mouth'],full=True)
view('complete-interior',targets=['mouth_internal_visibility'],unclip=['mouth_internal_visibility'])
for name,ids in [('complete-inside',['mouth_inside']),('complete-upper-teeth',['mouth_teeth_upper']),('complete-tongue',['mouth_tongue']),('upper-control',['mouth_upper']),('lower-control',['mouth_lower']),('upper-skin-cover',['mouth_upper_skin_cover']),('lower-skin-cover',['mouth_lower_skin_cover']),('upper-lip',['mouth_lip_upper']),('lower-lip',['mouth_lip_lower']),('skin-own-colors',['mouth_upper_skin_volume','mouth_lower_skin_volume']),('independent-effect',[fx])]:view(name,targets=ids,show=['mouth_lower_formal_line'] if name=='lower-control' else [])
view('upper-formal-line',targets=['mouth_upper_formal_line']);view('lower-formal-line',targets=['mouth_lower_formal_line'],show=['mouth_lower_formal_line'])
geometry_keys=['d','transform','x','y','cx','cy','rx','ry','r','points','width','height','viewBox','clip-path','mask','display','stroke-width','href']
geometry=[]
for e in line.iter():
 if e.get('id'):
  for k in geometry_keys:
   if e.get(k)!=get(e.get('id')).get(k):geometry.append([e.get('id'),k,e.get(k),get(e.get('id')).get(k)])
ids=[e.get('id') for e in r.iter() if e.get('id')];refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
  if k in ['data-follows-id','data-source-id','data-target-id','data-driven-by','data-complete-path']:refs.append(v)
roles={'mouth_upper':'mouth_upper','mouth_lower':'mouth_lower','mouth_inside':'mouth_inside','teeth_upper':'mouth_teeth_upper','tongue':'mouth_tongue','lip_upper':'mouth_lip_upper','lip_lower':'mouth_lip_lower'}
components=[]
for part in plan['mouths'][0]['components']:
 id=roles.get(part['role']);e=get(id) if id else None
 components.append({**part,'actual_id':id,'present':e is not None,'data-part':e.get('data-part') if e is not None else None,'data-kind':e.get('data-kind') if e is not None else None})
stable=[]
for e in get('mouth',s):
 if e.get('id'):stable.append({'id':e.get('id'),'stage5_xml_preserved':E.tostring(e)==E.tostring(get(e.get('id')))})
skin=[e.get('id') for e in mouth.iter() if e.get('data-role')=='local-skin-color-region'];lip=[e.get('id') for e in mouth.iter() if e.get('data-role') in ['lip-base-and-vertical-volume','lip-center-color-volume','lip-right-color-volume']]
audit={'candidate_sha256':sha(P/'character.svg'),'verified_inputs':{k:h for k,(p,h) in inputs.items()},'metadata_only_changes':['mouth/data-stage','mouth/data-review-status','mouth/title','mouth/desc'],'geometry_changes_vs_approved_line':geometry,'stage5_all_mouth_children_preserved':stable,'non_mouth_top_level_xml_equal_stage5':all(E.tostring(e)==E.tostring(get(e.get('id'))) for e in s if e.get('id') and e.get('id')!='mouth'),'eyes_xml_preserved':{id:E.tostring(get(id,s))==E.tostring(get(id)) for id in ['eye_left','eye_right']},'plan_components':components,'skin_regions':skin,'lip_color_layers':lip,'effects':[dict(e.attrib) for e in mouth.iter() if e.get('data-effect')],'duplicate_ids':sorted({id for id in ids if ids.count(id)>1}),'broken_refs':sorted(set(refs)-set(ids)),'id_count':len(ids),'reference_count':len(refs),'guides_hidden':get('mouth_construction_guides').get('display')=='none','lower_formal_line_closed_overlap_hidden':get('mouth_lower_formal_line').get('display')=='none','status':'static-final-candidate-awaiting-independent-review'}
restore=deepcopy(r);rm=get('mouth',restore);rm.attrib.clear();rm.attrib.update(get('mouth',s).attrib)
for tag in ['title','desc']:rm.find('{'+NS+'}'+tag).text=get('mouth',s).find('{'+NS+'}'+tag).text
audit['whole_svg_equal_stage5_after_metadata_restore']=E.tostring(restore)==E.tostring(s)
assert not geometry and not audit['duplicate_ids'] and not audit['broken_refs'];assert len(skin)==11 and len(lip)==6;assert all(e['stage5_xml_preserved'] for e in stable)
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'candidate_sha256':audit['candidate_sha256'],'geometry_changes':len(geometry),'skin_regions':len(skin),'lip_color_layers':len(lip),'effects':len(audit['effects']),'duplicate_ids':audit['duplicate_ids'],'broken_refs':audit['broken_refs'],'stage5_children_preserved':all(e['stage5_xml_preserved'] for e in stable)},ensure_ascii=False))
