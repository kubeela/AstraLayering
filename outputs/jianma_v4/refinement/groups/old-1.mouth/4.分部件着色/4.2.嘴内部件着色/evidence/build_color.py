from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re
P=Path('refinement/groups/mouth/4.分部件着色/4.2.嘴内部件着色');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/mouth/4.分部件着色/4.1.轮廓部件着色/character.svg');LINE=Path('refinement/groups/mouth/2.嘴型校准与部件线稿/character.svg');PLAN=Path('refinement/groups/mouth/1.制作计划/plan.json');PALETTE=Path('refinement/groups/mouth/3.嘴部色盘/palette.json');INFER=Path('refinement/groups/mouth/3.嘴部色盘/补全配色.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
expected={'input':'6d1b29f9ad8c3435f9ea33e2feb7a2cc262659e1a0fafe278365148c5e994ce3','approved_line_art':'795ccce3dba7918e3341ef977631bcb2b87670dfa3da74910e101b4b55357e4a','plan':'1240d7a52009079c9dd8034a357edfe41b4fae823699567519c27e74d2462525','palette':'3730963c97a3b10351462070b45ff9fc585566e34c4e81a6bc015afebf47fa38'}
for p,k in [(SOURCE,'input'),(LINE,'approved_line_art'),(PLAN,'plan'),(PALETTE,'palette')]:assert sha(p)==expected[k]
plan=json.loads(PLAN.read_text(encoding='utf-8'));assert plan['locked'] and plan['mouths'][0]['default_pose']=='closed';assert sha(Path('references/base-subject.png'))==plan['reference_sha256'].lower()
required={x['role']:x['evidence'] for x in plan['mouths'][0]['components']};assert required['teeth_upper']=='inferred' and required['tongue']=='inferred' and required['teeth_lower']=='omitted'
inf={x['role']:x for x in json.loads(INFER.read_text(encoding='utf-8'))['inferred_colors']};NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();L=E.parse(str(LINE)).getroot();r=deepcopy(S)
def get(id,t=None):return (r if t is None else t).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
mouth=get('mouth');defs=mouth.find('{'+NS+'}defs');mouth.set('data-stage','mouth-inner-parts-coloring-4.2')
def linear(id,coords,stops):
 g=el('linearGradient',id=id,gradientUnits='userSpaceOnUse',data_evidence='inferred',**coords)
 for off,col,op in stops:g.append(el('stop',offset=off,stop_color=col,stop_opacity=op))
 defs.append(g)
linear('mouth42_teeth_upper_curve_color',{'x1':0,'y1':237.2,'x2':0,'y2':245.1},[('0','#E4D8D9',1),('.45',inf['teeth_upper']['hex'],1),('.7','#F9F1EC',1),('1','#EBDDE0',1)])
linear('mouth42_teeth_upper_edge_color',{'x1':428.6,'y1':0,'x2':460.2,'y2':0},[('0','#C8C0CE',.32),('.25','#DCD1D6',.10),('.50','#EEDCDA',0),('.77','#DDCAD0',.09),('1','#D2C4CD',.28)])
teeth=get('mouth_teeth_upper');teeth.set('data-color-evidence','inferred-completion-palette-teeth_upper');teeth.set('data-source-sample-ids','26 27 29');get('mouth_teeth_upper_fill').set('fill','url(#mouth42_teeth_upper_curve_color)')
layer=el('g',id='mouth_teeth_upper_edge_material',data_part='mouth',data_kind='mouth',data_role='intrinsic-teeth-edge-color',data_evidence='inferred',data_follows_id='mouth_teeth_upper');layer.append(el('use',id='mouth_teeth_upper_edge_paint',href='#mouth_teeth_upper_complete_shape',fill='url(#mouth42_teeth_upper_edge_color)'));teeth.append(layer)
linear('mouth42_tongue_root_tip_color',{'x1':0,'y1':243.75,'x2':0,'y2':250.55},[('0','#955763',1),('.23','#AD6776',1),('.57',inf['tongue']['hex'],1),('1','#BC7883',1)])
grad=el('radialGradient',id='mouth42_tongue_body_color',gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform='translate(444.5 247.1) scale(9.5 3.7)',data_evidence='inferred')
for at,op in [('0','.52'),('.42','.40'),('.75','.15'),('1','0')]:grad.append(el('stop',offset=at,stop_color='#D28E99',stop_opacity=op))
defs.append(grad)
tongue=get('mouth_tongue');tongue.set('data-color-evidence','inferred-completion-palette-tongue');tongue.set('data-source-sample-ids','14 16 19');get('mouth_tongue_fill').set('fill','url(#mouth42_tongue_root_tip_color)')
layer=el('g',id='mouth_tongue_body_material',data_part='mouth',data_kind='mouth',data_role='intrinsic-tongue-raised-body',data_evidence='inferred',data_follows_id='mouth_tongue');layer.append(el('use',id='mouth_tongue_body_paint',href='#mouth_tongue_complete_shape',fill='url(#mouth42_tongue_body_color)'));tongue.append(layer)
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)
def save(name,t):E.ElementTree(t).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def view(name,t,targets=None,hide=(),unclip=False,box='421 232 47 25',full=False):
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
view('input-closeup',S);view('candidate-closeup',r)
view('input-default',S,full=True)
for label,t in [('input',S),('candidate',r)]:
 view(label+'-interior-complete',t,['mouth_internal_visibility'],unclip=True)
 view(label+'-inside-complete',t,['mouth_inside']);view(label+'-teeth-complete',t,['mouth_teeth_upper']);view(label+'-tongue-complete',t,['mouth_tongue'])
view('internal-colors-hidden',r,hide=['mouth_teeth_upper','mouth_tongue'],full=True)
view('internal-colors-hidden-closeup',r,hide=['mouth_teeth_upper','mouth_tongue'])
view('all-interior-hidden-closeup',r,hide=['mouth_internal_visibility'])
unclip=deepcopy(r);get('mouth_internal_visibility',unclip).attrib.pop('clip-path');view('covers-only-closeup',unclip)
keys=['d','transform','x','y','cx','cy','rx','ry','r','points','width','height','viewBox','clip-path','mask','display','stroke-width','href']
changes={}
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
unchanged=['mouth_inside','mouth_inside_complete_shape','mouth41_inside_depth_color','mouth41_inside_center_color','mouth_upper','mouth_lower','mouth_construction_guides','mouth_default_aperture_clip','mouth_inside_clip']
audit={**expected,'candidate_sha256':sha(P/'character.svg'),'inferred_palette_sha256':sha(INFER),'geometry_attribute_changes':changes,'non_mouth_top_level_xml_unchanged':len(S)==len(r) and all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='mouth'),'eyes_xml_unchanged':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in ['eye_right','eye_left']},'preserved_components_xml':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in unchanged},'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),'colored_parts':{'mouth_teeth_upper':{'base':inf['teeth_upper']['hex'],'editable_color_layers':2,'evidence':'inferred'},'mouth_tongue':{'base':inf['tongue']['hex'],'editable_color_layers':2,'evidence':'inferred'}},'omitted_parts':['teeth_lower','lip_gloss'],'new_cast_shadows':0,'new_independent_highlights':0,'status':'stage-4.2-candidate'}
assert not any(changes.values()) and audit['non_mouth_top_level_xml_unchanged'] and all(audit['preserved_components_xml'].values()) and not audit['duplicate_ids'] and not audit['broken_refs']
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
