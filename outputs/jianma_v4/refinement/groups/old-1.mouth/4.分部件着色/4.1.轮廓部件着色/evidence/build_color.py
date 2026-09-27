from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re
P=Path('refinement/groups/mouth/4.分部件着色/4.1.轮廓部件着色');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/mouth/2.嘴型校准与部件线稿/character.svg')
PLAN=Path('refinement/groups/mouth/1.制作计划/plan.json');PALETTE=Path('refinement/groups/mouth/3.嘴部色盘/palette.json');INFER=Path('refinement/groups/mouth/3.嘴部色盘/补全配色.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
expected={'approved_line_art':'795ccce3dba7918e3341ef977631bcb2b87670dfa3da74910e101b4b55357e4a','plan':'1240d7a52009079c9dd8034a357edfe41b4fae823699567519c27e74d2462525','palette':'3730963c97a3b10351462070b45ff9fc585566e34c4e81a6bc015afebf47fa38'}
assert sha(SOURCE)==expected['approved_line_art'];assert sha(PLAN)==expected['plan'];assert sha(PALETTE)==expected['palette']
plan=json.loads(PLAN.read_text(encoding='utf-8'));palette=json.loads(PALETTE.read_text(encoding='utf-8'));inferred=json.loads(INFER.read_text(encoding='utf-8'))
assert plan['locked'] and plan['mouths'][0]['default_pose']=='closed';assert sha(Path('references/base-subject.png'))==plan['reference_sha256'].lower()
review=Path('reviews/refinement/mouth/line-art/审查.md').read_text(encoding='utf-8');assert expected['approved_line_art'] in review and '结论：通过' in review
colors={x['id']:x['hex'] for x in palette['samples']};cavity_base=next(c['hex'] for c in inferred['inferred_colors'] if c['role']=='mouth_inside')
S=E.parse(str(SOURCE)).getroot();r=deepcopy(S);NS='http://www.w3.org/2000/svg'
def get(id,t=None):return (r if t is None else t).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
mouth=get('mouth');defs=mouth.find('{'+NS+'}defs');mouth.set('data-stage','mouth-contour-coloring-4.1')
for side in ['upper','lower']:
 grad=el('linearGradient',id='mouth41_'+side+'_line_color',gradientUnits='userSpaceOnUse',x1='431.10',y1='0',x2='456.95',y2='0',data_palette_sample_ids='01 02 03 04 05')
 for x,sample,op in [(431.10,'01',.6),(431.8,'01',.95),(437,'02',1),(444,'03',1),(449,'04',1),(456.1,'05',.95),(456.95,'05',.55)]:
  grad.append(el('stop',offset=f'{(x-431.1)/25.85:.8f}',stop_color=colors[sample],stop_opacity=op))
 defs.append(grad);get('mouth_'+side+'_line_ink').set('fill','url(#mouth41_'+side+'_line_color)')
 get('mouth_'+side+'_formal_line').set('data-color-evidence','observed-palette-01-05')
 cover=get('mouth_'+side+'_skin_cover');cover.set('data-color-evidence','retained-neighbor-face-intrinsic-field; palette-26-30-reference')
 cover.set('data-stage41-status','existing-matched-base-retained; local-volume-reserved-for-4.4')

grad=el('linearGradient',id='mouth41_inside_depth_color',gradientUnits='userSpaceOnUse',x1='0',y1='237',x2='0',y2='251.2',data_color_evidence='inferred-hidden-cavity',data_inferred_base=cavity_base)
for at,color in [('0','#52303C'),('.42',cavity_base),('1','#7A4858')]:grad.append(el('stop',offset=at,stop_color=color))
defs.append(grad)
rad=el('radialGradient',id='mouth41_inside_center_color',gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform='translate(444 246.2) scale(15.9 9.2)',data_color_evidence='inferred-hidden-cavity-center-depth')
for at,op in [('0','.30'),('.45','.22'),('.8','.06'),('1','0')]:rad.append(el('stop',offset=at,stop_color='#89515F',stop_opacity=op))
defs.append(rad)
get('mouth_inside_fill').set('fill','url(#mouth41_inside_depth_color)')
inside=get('mouth_inside');inside.set('data-color-evidence','inferred-completion-palette-mouth_inside')
inside.append(el('g',id='mouth_inside_center_material',data_part='mouth',data_kind='mouth',data_role='intrinsic-cavity-center-depth',data_evidence='inferred'))
inside[-1].append(el('use',id='mouth_inside_center_paint',href='#mouth_inside_complete_shape',fill='url(#mouth41_inside_center_color)'))
get('mouth_construction_guides').set('display','none')
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

def save(name,t):E.ElementTree(t).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def view(name,t,targets=None,box='421 232 47 25',hide=(),unclip=False,full=False):
 nums=list(map(float,box.split()))
 if targets:
  out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox=box,width=str(int(nums[2]*24)),height=str(int(nums[3]*24)))
  for dd in t.xpath('//*[local-name()="defs"]'):out.append(deepcopy(dd))
  for id in targets:
   item=deepcopy(get(id,t))
   for dd in item.xpath('.//*[local-name()="defs"]'):dd.getparent().remove(dd)
   if unclip:
    for e in item.iter():
     if e.get('clip-path')=='url(#mouth_default_aperture_clip)':e.attrib.pop('clip-path')
   out.append(item)
 else:
  out=deepcopy(t)
  if not full:out.set('viewBox',box);out.set('width',str(int(nums[2]*24)));out.set('height',str(int(nums[3]*24)))
 for id in hide:
  for e in out.xpath('.//*[@id="'+id+'"]'):e.set('display','none')
 save(name,out)
view('approved-closeup',S);view('candidate-closeup',r);view('candidate-context',r,box='414 215 62 58');view('approved-context',S,box='414 215 62 58')
view('inside-complete',r,['mouth_inside']);view('interior-complete',r,['mouth_internal_visibility'],unclip=True)
view('skin-covers',r,['mouth_upper_skin_cover','mouth_lower_skin_cover'])
view('upper-line-complete',r,['mouth_upper_formal_line'])
low=deepcopy(r);get('mouth_lower_formal_line',low).set('display','inline');view('lower-line-complete',low,['mouth_lower_formal_line'])
view('interior-hidden',r,hide=['mouth_internal_visibility'],full=True);view('interior-hidden-closeup',r,hide=['mouth_internal_visibility'])
unclip=deepcopy(r);get('mouth_internal_visibility',unclip).attrib.pop('clip-path');view('covers-only-closeup',unclip)
view('candidate-mouth-hidden',r,hide=['mouth'],full=True);view('approved-mouth-hidden',S,hide=['mouth'],full=True)
idlist=[e.get('id') for e in r.iter() if e.get('id')];refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs.extend(re.findall(r'url\(#([^\)]+)\)',v))
  if k=='href' and v.startswith('#'):refs.append(v[1:])
  if k=='data-follows-id':refs.append(v)
geometry_keys=['d','transform','x','y','cx','cy','rx','ry','r','points','width','height','viewBox','clip-path','mask','display','stroke-width','href']
shape_changes=[]
for e in S.iter():
 if not e.get('id'):continue
 now=get(e.get('id'))
 for k in geometry_keys:
  if e.get(k)!=now.get(k):shape_changes.append([e.get('id'),k,e.get(k),now.get(k)])
unchanged_ids=['mouth_teeth_upper','mouth_tongue','mouth_lip_upper','mouth_lip_lower']
audit={**expected,'candidate_sha256':sha(P/'character.svg'),'inferred_palette_sha256':sha(INFER),'geometry_changes':shape_changes,'non_mouth_top_level_xml_unchanged':len(S)==len(r) and all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='mouth'),
 'eyes_xml_unchanged':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in ['eye_right','eye_left']},'deferred_parts_xml_unchanged':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in unchanged_ids},
 'skin_coverage_geometry_and_material_unchanged':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in ['mouth_upper_skin_fill','mouth_lower_skin_fill','mouth_upper_skin_match','mouth_lower_skin_match']},
 'duplicate_ids':sorted({i for i in idlist if idlist.count(i)>1}),'broken_refs':sorted(set(refs)-set(idlist)), 'line_sample_ids':['01','02','03','04','05'],'skin_sample_reference_ids':['26','27','28','29','30'],'cavity_base_inferred':cavity_base,'cavity_own_color_layers':2,'new_cast_shadows':0,'new_highlights':0,'guides_display':get('mouth_construction_guides').get('display'),'lower_line_default_display':get('mouth_lower_formal_line').get('display'),'status':'stage-4.1-candidate'}
assert not shape_changes and audit['non_mouth_top_level_xml_unchanged'] and not audit['duplicate_ids'] and not audit['broken_refs']
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
