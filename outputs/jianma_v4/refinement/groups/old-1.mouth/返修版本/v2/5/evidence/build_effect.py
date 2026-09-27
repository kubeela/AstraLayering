from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re
P=Path('refinement/groups/mouth/5.独立投影与高光');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/mouth/4.分部件着色/4.4.嘴周皮肤明暗/character.svg');LINE=Path('refinement/groups/mouth/2.嘴型校准与部件线稿/character.svg');PLAN=Path('refinement/groups/mouth/1.制作计划/plan.json');PALETTE=Path('refinement/groups/mouth/3.嘴部色盘/palette.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
expected={'clean_coloring':'ec289fd0c2f3cf03c64b57eb980c832f53667ce7522cf9a2eedbd36380e8e71d','approved_line_art':'795ccce3dba7918e3341ef977631bcb2b87670dfa3da74910e101b4b55357e4a','plan':'1240d7a52009079c9dd8034a357edfe41b4fae823699567519c27e74d2462525','palette':'3730963c97a3b10351462070b45ff9fc585566e34c4e81a6bc015afebf47fa38'}
for p,k in [(SOURCE,'clean_coloring'),(LINE,'approved_line_art'),(PLAN,'plan'),(PALETTE,'palette')]:assert sha(p)==expected[k]
plan=json.loads(PLAN.read_text(encoding='utf-8'));assert plan['locked'] and plan['mouths'][0]['default_pose']=='closed';assert sha(Path('references/base-subject.png'))==plan['reference_sha256'].lower()
(P/'4.4干净着色恢复点.svg').write_bytes(SOURCE.read_bytes())
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();L=E.parse(str(LINE)).getroot();r=deepcopy(S)
def get(id,t=None):return (r if t is None else t).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
mouth=get('mouth');defs=mouth.find('{'+NS+'}defs');mouth.set('data-stage','mouth-independent-effects-5')
required=['mouth_inside_center_material','mouth_teeth_upper_edge_material','mouth_tongue_body_material']+['mouth_lip_'+s+'_'+v+'_material' for s in ['upper','lower'] for v in ['base','center','right']]+['mouth_upper_skin_volume','mouth_lower_skin_volume']
for id in required:assert get(id) is not None
skin_ids=[e.get('id') for e in r.iter() if e.get('data-role')=='local-skin-color-region' and e.get('data-part')=='mouth'];assert len(skin_ids)==11
complete=el('path',id='mouth5_lower_lip_cast_complete',d='M 432.50,245.20 C 436.80,243.80 451.40,244.00 456.30,245.50 C 457.30,250.20 453.90,254.70 449.00,255.60 C 442.50,256.50 435.40,255.20 432.40,251.70 Z');defs.append(complete)
surface=el('clipPath',id='mouth5_lower_skin_surface_clip',clipPathUnits='userSpaceOnUse');surface.append(el('use',href='#mouth_lower_skin_shape'));defs.append(surface)
skin_mask=el('mask',id='mouth5_skin_visible_mask',maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x=424,y=236,width=41,height=21,style='mask-type:luminance',data_role='skin-visible-behind-actual-lip-alpha');skin_mask.append(el('rect',x=424,y=236,width=41,height=21,fill='white'))
for id in ['mouth_lip_upper_complete_shape','mouth_upper_line_shape','mouth_lower_line_shape']:skin_mask.append(el('use',href='#'+id,fill='black'))
actual=el('g',id='mouth5_actual_lower_lip_alpha_exclusion',clip_path='url(#mouth43_lower_material_clip)',mask='url(#mouth43_lower_edge_fade)')
corners=el('g',mask='url(#mouth43_corner_fade)');corners.append(el('use',href='#mouth_lip_lower_complete_shape',fill='black'));actual.append(corners);skin_mask.append(actual)
defs.append(skin_mask)
tone=el('linearGradient',id='mouth5_lower_lip_cast_tone',gradientUnits='userSpaceOnUse',x1=0,y1=248.5,x2=0,y2=253.5)
for y,col in [(248.5,'#CB7880'),(249.5,'#C87378'),(250.5,'#D3A6A8'),(252,'#D9C1C2'),(253.5,'#E5D8D8')]:tone.append(el('stop',offset=(y-248.5)/5,stop_color=col))
defs.append(tone)
fade=el('radialGradient',id='mouth5_lower_lip_cast_coverage',gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform='translate(444.8 250.5) scale(7.2 2.8)')
for at,op in [('0','1'),('.20','.95'),('.45','.67'),('.72','.23'),('1','0')]:fade.append(el('stop',offset=at,stop_color='white',stop_opacity=op))
defs.append(fade)
coverage=el('mask',id='mouth5_lower_lip_cast_coverage_mask',maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x=430,y=244,width=29,height=14,style='mask-type:luminance');coverage.append(el('rect',x=430,y=244,width=29,height=14,fill='url(#mouth5_lower_lip_cast_coverage)'));defs.append(coverage)
soft=el('filter',id='mouth5_cast_soft',filterUnits='userSpaceOnUse',x=429,y=242,width=32,height=17,color_interpolation_filters='sRGB');soft.append(el('feGaussianBlur',stdDeviation='.45'));defs.append(soft)
fxid='fx_mouth_lower_lip_on_surround_skin'
fx=el('g',id=fxid,data_part='mouth',data_kind='mouth',data_effect='cast-shadow',data_source_part='mouth',data_source_id='mouth_lip_lower_complete_shape',data_target_part='mouth',data_target_id='mouth_lower_skin_shape',data_driven_by='mouth_lower',data_follows_id='mouth_lower',data_complete_path='mouth5_lower_lip_cast_complete',data_evidence='observed-dark-region; inferred-lower-lip-overhang-attribution',data_source_sample_ids='31',clip_path='url(#mouth5_lower_skin_surface_clip)')
visible=el('g',id=fxid+'_visible_skin',mask='url(#mouth5_skin_visible_mask)')
blur=el('g',id=fxid+'_softening',filter='url(#mouth5_cast_soft)')
field=el('g',id=fxid+'_coverage',mask='url(#mouth5_lower_lip_cast_coverage_mask)')
field.append(el('use',id=fxid+'_paint',href='#mouth5_lower_lip_cast_complete',fill='url(#mouth5_lower_lip_cast_tone)',opacity='.47'));blur.append(field);visible.append(blur);fx.append(visible)
lower=get('mouth_lower');lower.insert(list(lower).index(get('mouth_lower_skin_volume'))+1,fx)
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
   if E.QName(item).localname=='path':item.set('id',id+'_diagnostic_support')
   out.append(item)
 else:
  out=deepcopy(t)
  if not full:out.set('viewBox',box);out.set('width',str(int(nums[2]*24)));out.set('height',str(int(nums[3]*24)))
 for id in hide:
  for e in out.xpath('.//*[@id="'+id+'"]'):e.set('display','none')
 save(name,out)
view('clean-closeup',S);view('candidate-closeup',r);view('clean-context',S,box='414 215 62 58');view('candidate-context',r,box='414 215 62 58');view('clean-default',S,full=True)
view('all-effects-off',r,hide=[fxid],full=True);view('all-effects-off-closeup',r,hide=[fxid]);view('effect-only',r,[fxid]);view('effect-full-before-surface-clip',r,[fxid+'_softening']);view('effect-complete-path',r,['mouth5_lower_lip_cast_complete'])
view('clean-source-hidden',S,hide=['mouth_lip_lower'],full=True);view('candidate-source-and-effect-hidden',r,hide=['mouth_lip_lower',fxid],full=True)
view('clean-mouth-hidden',S,hide=['mouth'],full=True);view('candidate-mouth-hidden',r,hide=['mouth'],full=True)
view('internal-hidden-closeup',r,hide=['mouth_internal_visibility']);view('protected-lip-support',r,['mouth_lip_upper','mouth_lip_lower','mouth_upper_formal_line']);view('target-skin-support',r,['mouth_lower_skin_shape'])
keys=['d','transform','x','y','cx','cy','rx','ry','r','points','width','height','viewBox','clip-path','mask','display','stroke-width','href'];changes={}
for label,t in [('clean_coloring',S),('approved_line_art',L)]:
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
  if k in ['data-follows-id','data-source-id','data-target-id','data-driven-by','data-complete-path']:refs.append(v)
unchanged=['mouth_internal_visibility','mouth_upper_formal_line','mouth_lower_formal_line','mouth_upper_skin_cover','mouth_lower_skin_cover','mouth_lip_upper','mouth_lip_lower','mouth_upper_skin_volume','mouth_lower_skin_volume','mouth_construction_guides']
rollback=deepcopy(r);e=get(fxid,rollback);e.getparent().remove(e);rd=get('mouth',rollback).find('{'+NS+'}defs')
for e in list(rd):
 if (e.get('id') or '').startswith('mouth5_'):rd.remove(e)
get('mouth',rollback).set('data-stage',get('mouth',S).get('data-stage'));rollback_hash=hashlib.sha256(E.tostring(E.ElementTree(rollback),encoding='UTF-8',xml_declaration=True)).hexdigest()
audit={**expected,'candidate_sha256':sha(P/'character.svg'),'restore_sha256':sha(P/'4.4干净着色恢复点.svg'),'geometry_attribute_changes':changes,'non_mouth_top_level_xml_unchanged':len(S)==len(r) and all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='mouth'),'eyes_xml_unchanged':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in ['eye_right','eye_left']},'preserved_clean_components_xml':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in unchanged},'preserved_skin_regions':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in skin_ids},'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),'effects':[dict(fx.attrib)],'cast_shadow_count':1,'independent_highlight_count':0,'hidden_effects_inferred_added':0,'rollback_sha256':rollback_hash,'rollback_bytes_equal_clean':rollback_hash==expected['clean_coloring'],'status':'stage-5-effects-candidate'}
assert not any(changes.values()) and audit['non_mouth_top_level_xml_unchanged'] and all(audit['preserved_clean_components_xml'].values()) and all(audit['preserved_skin_regions'].values()) and not audit['duplicate_ids'] and not audit['broken_refs'] and audit['rollback_bytes_equal_clean']
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
