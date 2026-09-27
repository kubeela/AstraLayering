from pathlib import Path
from lxml import etree as E
from copy import deepcopy
from PIL import Image
import hashlib,json,re
P=Path('refinement/groups/mouth/4.分部件着色/4.4.嘴周皮肤明暗');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/mouth/4.分部件着色/4.3.唇部颜色与层次/character.svg');LINE=Path('refinement/groups/mouth/2.嘴型校准与部件线稿/character.svg');PLAN=Path('refinement/groups/mouth/1.制作计划/plan.json');PALETTE=Path('refinement/groups/mouth/3.嘴部色盘/palette.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
expected={'input':'e64ddafaf889d79137e34bc19a019975e77bc634fcb67580000c1a5ac8c142f8','approved_line_art':'795ccce3dba7918e3341ef977631bcb2b87670dfa3da74910e101b4b55357e4a','plan':'1240d7a52009079c9dd8034a357edfe41b4fae823699567519c27e74d2462525','palette':'3730963c97a3b10351462070b45ff9fc585566e34c4e81a6bc015afebf47fa38'}
for p,k in [(SOURCE,'input'),(LINE,'approved_line_art'),(PLAN,'plan'),(PALETTE,'palette')]:assert sha(p)==expected[k]
plan=json.loads(PLAN.read_text(encoding='utf-8'));assert plan['locked'] and plan['mouths'][0]['default_pose']=='closed';assert sha(Path('references/base-subject.png'))==plan['reference_sha256'].lower()
(P/'4.3恢复基准.svg').write_bytes(SOURCE.read_bytes())
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();L=E.parse(str(LINE)).getroot();r=deepcopy(S)
def get(id,t=None):return (r if t is None else t).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
mouth=get('mouth');defs=mouth.find('{'+NS+'}defs');mouth.set('data-stage','mouth-clean-intrinsic-coloring-4.4')
clip=el('clipPath',id='mouth44_face_surface_clip',clipPathUnits='userSpaceOnUse');clip.append(el('use',href='#face_base_shape'));defs.append(clip)
exclude=el('mask',id='mouth44_exclude_lips_and_seam',maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x=422,y=233,width=44,height=25,style='mask-type:luminance');exclude.append(el('rect',x=422,y=233,width=44,height=25,fill='white'))
for id in ['mouth_lip_upper_complete_shape','mouth_lip_lower_complete_shape','mouth_upper_line_shape','mouth_lower_line_shape']:
 exclude.append(el('use',href='#'+id,fill='black',stroke='black',stroke_width='.45',stroke_linejoin='round'))
defs.append(exclude)
# All paint is local low-contrast skin color, never a duplicate opaque skin-cover sheet.
regions=[
 ('upper','philtrum_lower_warm',443.5,236.4,1.9,1.25,'#F7E7E6',.94,'28','visible small warm patch below nose; no philtrum groove'),
 ('upper','philtrum_left_transition',441.4,237.8,2.5,1.4,'#FFF9F7',.64,'probe-441-237','lighter skin beside warm patch'),
 ('upper','philtrum_right_transition',445.6,237.8,1.7,1.25,'#FFF9F8',.72,'probe-445-237','right-side skin plane is slightly lighter'),
 ('upper','upper_left_soft_warm',435.8,240.1,2.8,1.35,'#F8E6E5',.54,'probe-435-240','localized warm transition outside upper-left lip'),
 ('upper','left_corner_skin_plane',428.5,241.5,3.2,4.0,'#FFF9F8',.76,'26 probe-428-241','left corner outside skin slightly lighter than current face field'),
 ('upper','right_corner_skin_plane',461.5,242.3,2.1,3.7,'#FCF3F2',.82,'27','right corner outside skin has a subtle warmer tone'),
 ('lower','lower_left_side_warm',432.7,249.4,4.4,2.8,'#FBEEED',.86,'probe-432-249','left lateral skin below corner; low-contrast warm transition'),
 ('lower','lower_left_skin_transition',435.5,252.0,4.5,1.8,'#FBF0EE',.92,'29','left outside lower lip toward chin'),
 ('lower','lower_right_skin_transition',454.5,251.9,4.9,2.0,'#FCF0EE',.92,'30','right outside lower lip toward chin'),
 ('lower','upper_chin_warm_plane',445.5,253.3,4.3,1.9,'#F8ECEA',.94,'probe-445-253','observed slight upper-chin warm color plane; distinct from sample31 at y250'),
 ('lower','right_lower_corner_transition',457.5,247.0,2.9,2.5,'#FDF3F2',.76,'probe-457-247','soft right lower corner transition, no ring')
]
controllers={}
for side in ['upper','lower']:
 g=el('g',id='mouth_'+side+'_skin_volume',data_part='mouth',data_kind='mouth',data_role='local-perioral-skin-intrinsic-color',data_follows_id='mouth_'+side,clip_path='url(#mouth44_face_surface_clip)',mask='url(#mouth44_exclude_lips_and_seam)',data_toggle_stage='4.4')
 control=get('mouth_'+side);control.insert(list(control).index(get('mouth_'+side+'_skin_cover'))+1,g);controllers[side]=g
for side,name,cx,cy,rx,ry,color,opacity,samples,basis in regions:
 id='mouth_skin_'+name
 grad=el('radialGradient',id='mouth44_'+name+'_color',gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for at,op in [('0',opacity),('.35',opacity*.95),('.65',opacity*.42),('.86',opacity*.08),('1',0)]:grad.append(el('stop',offset=at,stop_color=color,stop_opacity=op))
 defs.append(grad)
 g=el('g',id=id,data_part='mouth',data_kind='mouth',data_role='local-skin-color-region',data_follows_id='mouth_'+side,data_evidence='observed-color-region',data_source_samples=samples,data_basis=basis)
 g.append(el('ellipse',id=id+'_paint',cx=cx,cy=cy,rx=rx,ry=ry,fill='url(#mouth44_'+name+'_color)'));controllers[side].append(g)
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)
def save(name,t):E.ElementTree(t).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def view(name,t,targets=None,hide=(),box='421 232 47 27',full=False):
 nums=list(map(float,box.split()))
 if targets:
  out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox=box,width=str(int(nums[2]*24)),height=str(int(nums[3]*24)))
  for dd in t.xpath('//*[local-name()="defs"]'):out.append(deepcopy(dd))
  support=el('defs');support.append(deepcopy(get('face_base_shape',t)));out.append(support)
  for id in targets:
   item=deepcopy(get(id,t))
   for dd in item.xpath('.//*[local-name()="defs"]'):dd.getparent().remove(dd)
   out.append(item)
 else:
  out=deepcopy(t)
  if not full:out.set('viewBox',box);out.set('width',str(int(nums[2]*24)));out.set('height',str(int(nums[3]*24)))
 for id in hide:
  for e in out.xpath('.//*[@id="'+id+'"]'):e.set('display','none')
 save(name,out)
view('input-closeup',S);view('candidate-closeup',r);view('input-context',S,box='414 215 62 58');view('candidate-context',r,box='414 215 62 58');view('input-default',S,full=True)
toggles=['mouth_upper_skin_volume','mouth_lower_skin_volume'];view('stage44-off',r,hide=toggles,full=True);view('stage44-off-closeup',r,hide=toggles);view('upper-skin-only',r,['mouth_upper_skin_volume']);view('lower-skin-only',r,['mouth_lower_skin_volume'])
view('skin-only',r,toggles);view('internal-hidden-closeup',r,hide=['mouth_internal_visibility'])
unclip=deepcopy(r);get('mouth_internal_visibility',unclip).attrib.pop('clip-path');view('covers-only-closeup',unclip)
view('input-mouth-hidden',S,hide=['mouth'],full=True);view('candidate-mouth-hidden',r,hide=['mouth'],full=True)
view('protected-lip-support',r,['mouth_lip_upper','mouth_lip_lower','mouth_upper_formal_line'])
keys=['d','transform','x','y','cx','cy','rx','ry','r','points','width','height','viewBox','clip-path','mask','display','stroke-width','href'];changes={}
for label,t in [('input',S),('approved_line_art',L)]:
 changes[label]=[]
 for e in t.iter():
  if not e.get('id'):continue
  for k in keys:
   if e.get(k)!=get(e.get('id')).get(k):changes[label].append([e.get('id'),k,e.get(k),get(e.get('id')).get(k)])
ids=[e.get('id') for e in r.iter() if e.get('id')];refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
  if k=='data-follows-id':refs.append(v)
unchanged=['mouth_internal_visibility','mouth_upper_formal_line','mouth_lower_formal_line','mouth_upper_skin_cover','mouth_lower_skin_cover','mouth_lip_upper','mouth_lip_lower','mouth_construction_guides','mouth_default_aperture_clip','mouth_inside_clip']
audit={**expected,'candidate_sha256':sha(P/'character.svg'),'restore_sha256':sha(P/'4.3恢复基准.svg'),'geometry_attribute_changes':changes,'non_mouth_top_level_xml_unchanged':len(S)==len(r) and all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='mouth'),'eyes_xml_unchanged':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in ['eye_right','eye_left']},'preserved_components_xml':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in unchanged},'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),'skin_controller_ids':toggles,'skin_region_ids':['mouth_skin_'+x[1] for x in regions],'skin_region_count':len(regions),'new_effects':[],'status':'stage-4.4-clean-color-candidate'}
rollback=deepcopy(r)
for id in toggles:
 e=get(id,rollback);e.getparent().remove(e)
rd=get('mouth',rollback).find('{'+NS+'}defs')
for e in list(rd):
 if (e.get('id') or '').startswith('mouth44_'):rd.remove(e)
get('mouth',rollback).set('data-stage',get('mouth',S).get('data-stage'))
audit['rollback_serialized_sha256']=hashlib.sha256(E.tostring(E.ElementTree(rollback),encoding='UTF-8',xml_declaration=True)).hexdigest()
audit['rollback_bytes_equal_input']=audit['rollback_serialized_sha256']==expected['input']
audit['intrinsic_color_inventory']={'cavity_layers':2,'upper_teeth_layers':2,'tongue_layers':2,'lip_color_layers':len([i for i in ids if re.match(r'mouth_lip_(upper|lower)_(base|center|right)_material$',i)]),'skin_region_layers':len(regions),'independent_effects_added_in_4_4':0}
assert not any(changes.values()) and audit['non_mouth_top_level_xml_unchanged'] and all(audit['preserved_components_xml'].values()) and not audit['duplicate_ids'] and not audit['broken_refs']
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
ref=Image.open('references/base-subject.png').convert('RGB');probe_points=[(443,236),(441,237),(445,237),(435,240),(428,241),(432,249),(435,252),(454,252),(445,253),(457,247),(444,255),(438,257),(450,257),(445,250)]
(Q/'source-skin-probes.json').write_text(json.dumps({'reference_sha256':sha(Path('references/base-subject.png')),'method':'direct source pixels; supplementary observations, frozen palette remains unchanged','probes':[{'pixel':p,'rgb':ref.getpixel(p),'hex':'#%02X%02X%02X'%ref.getpixel(p)} for p in probe_points]},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
