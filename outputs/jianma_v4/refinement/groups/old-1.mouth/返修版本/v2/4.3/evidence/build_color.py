from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re
P=Path('refinement/groups/mouth/4.分部件着色/4.3.唇部颜色与层次');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/mouth/4.分部件着色/4.2.嘴内部件着色/character.svg');LINE=Path('refinement/groups/mouth/2.嘴型校准与部件线稿/character.svg');PLAN=Path('refinement/groups/mouth/1.制作计划/plan.json');PALETTE=Path('refinement/groups/mouth/3.嘴部色盘/palette.json')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
expected={'input':'c0d37c9b8dcf1c3806279a95e3d6ed3d53d5ac516ab89df4a10f7869b8d17bdc','approved_line_art':'795ccce3dba7918e3341ef977631bcb2b87670dfa3da74910e101b4b55357e4a','plan':'1240d7a52009079c9dd8034a357edfe41b4fae823699567519c27e74d2462525','palette':'3730963c97a3b10351462070b45ff9fc585566e34c4e81a6bc015afebf47fa38'}
for p,k in [(SOURCE,'input'),(LINE,'approved_line_art'),(PLAN,'plan'),(PALETTE,'palette')]:assert sha(p)==expected[k]
plan=json.loads(PLAN.read_text(encoding='utf-8'));palette=json.loads(PALETTE.read_text(encoding='utf-8'));assert plan['locked'] and plan['mouths'][0]['default_pose']=='closed';assert sha(Path('references/base-subject.png'))==plan['reference_sha256'].lower()
colors={x['id']:x['hex'] for x in palette['samples']}
(P/'着色前恢复点.svg').write_bytes(SOURCE.read_bytes())
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();L=E.parse(str(LINE)).getroot();r=deepcopy(S)
def get(id,t=None):return (r if t is None else t).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
mouth=get('mouth');defs=mouth.find('{'+NS+'}defs');mouth.set('data-stage','mouth-lip-intrinsic-coloring-4.3');mouth.set('data-mouth-revision','v2-F1-F2')
def linear(id,coords,stops):
 g=el('linearGradient',id=id,gradientUnits='userSpaceOnUse',**coords)
 for off,col,op in stops:g.append(el('stop',offset=off,stop_color=col,stop_opacity=op))
 defs.append(g)
def vertical(id,start,end,stops):linear(id,{'x1':0,'y1':start,'x2':0,'y2':end},[(f'{(y-start)/(end-start):.8f}',c,1) for y,c in stops])
def mask_region(id,cx,cy,rx,ry,peak=1):
 g=el('radialGradient',id=id+'_color',gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for at,op in [('0',peak),('.32',peak),('.7',peak*.5),('1',0)]:g.append(el('stop',offset=at,stop_color='white',stop_opacity=op))
 defs.append(g);m=el('mask',id=id,maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x=429,y=238,width=31,height=14,style='mask-type:luminance');m.append(el('rect',x=429,y=238,width=31,height=14,fill='url(#'+id+'_color)'));defs.append(m)

vertical('mouth43_upper_base_color',239.6,243.8,[(239.6,'#F2D1CF'),(240.5,colors['06']),(241.5,colors['09']),(242.5,colors['12']),(243.8,'#BE737B')])
vertical('mouth43_upper_center_color',239.6,243.8,[(239.6,'#F5DAD8'),(240.5,colors['07']),(241.5,colors['10']),(242.5,colors['13']),(243.8,'#D29197')])
vertical('mouth43_upper_right_color',239.6,243.8,[(239.6,'#F2CCC9'),(240.5,colors['08']),(241.5,colors['11']),(242.5,colors['14']),(243.8,'#BC727D')])
vertical('mouth43_lower_base_color',243.25,249.4,[(243.25,'#B66C79'),(244.5,colors['15']),(245.5,colors['18']),(246.5,'#F7BFC1'),(247.5,colors['23']),(248.5,colors['23']),(249.4,'#EFC8CA')])
vertical('mouth43_lower_center_color',243.25,249.4,[(243.25,'#AD626A'),(244.5,colors['16']),(245.5,colors['19']),(246.5,colors['21']),(247.5,'#F0B5B8'),(248.5,colors['24']),(249.4,'#EABFC0')])
vertical('mouth43_lower_right_color',243.25,249.4,[(243.25,'#BD6979'),(244.5,colors['17']),(245.5,colors['20']),(246.5,colors['22']),(247.5,colors['25']),(248.5,colors['25']),(249.4,'#ECC3C4')])
mask_region('mouth43_upper_center_region',443.9,242,3.9,10,.98);mask_region('mouth43_upper_right_region',449.4,242,5.2,10,.98)
mask_region('mouth43_lower_center_region',444,246.2,5.3,12,1);mask_region('mouth43_lower_right_region',449.6,246.2,5.4,12,.97)
linear('mouth43_corner_fade_color',{'x1':431.1,'y1':0,'x2':456.95,'y2':0},[('0','white',.65),('.08','white',.95),('.18','white',1),('.85','white',1),('.95','white',.82),('1','white',.6)])
mc=el('mask',id='mouth43_corner_fade',maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x=429,y=238,width=31,height=14,style='mask-type:luminance');mc.append(el('rect',x=429,y=238,width=31,height=14,fill='url(#mouth43_corner_fade_color)'));defs.append(mc)
seam_soft=el('filter',id='mouth43_seam_mask_soft',filterUnits='userSpaceOnUse',x=429,y=238,width=31,height=14,color_interpolation_filters='sRGB');seam_soft.append(el('feGaussianBlur',stdDeviation='.30'));defs.append(seam_soft)
layer_ids=[]
for side in ['upper','lower']:
 shape='mouth_lip_'+side+'_complete_shape'
 clip=el('clipPath',id='mouth43_'+side+'_material_clip',clipPathUnits='userSpaceOnUse');clip.append(el('use',href='#'+shape));defs.append(clip)
 soft=el('filter',id='mouth43_'+side+'_edge_soft',filterUnits='userSpaceOnUse',x=429,y=238,width=31,height=14,color_interpolation_filters='sRGB')
 if side=='upper':soft.append(el('feMorphology',operator='erode',radius='.20'))
 soft.append(el('feGaussianBlur',stdDeviation='.40' if side=='upper' else '.22'));defs.append(soft)
 mask=el('mask',id='mouth43_'+side+'_edge_fade',maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x=429,y=238,width=31,height=14,style='mask-type:luminance')
 mask.append(el('use',href='#'+shape,fill='white',filter='url(#mouth43_'+side+'_edge_soft)'))
 mask.append(el('use',href='#mouth_upper_line_shape',fill='white',stroke='white',stroke_width='1.3' if side=='upper' else '1.6',stroke_linejoin='round',filter='url(#mouth43_seam_mask_soft)'))
 defs.append(mask)
 lip=get('mouth_lip_'+side);lip.set('data-color-evidence','observed-palette-06-14' if side=='upper' else 'observed-palette-15-25')
 material=el('g',id='mouth_lip_'+side+'_materials',data_part='mouth',data_kind='mouth',data_role='lip-intrinsic-materials',clip_path='url(#mouth43_'+side+'_material_clip)',mask='url(#mouth43_'+side+'_edge_fade)')
 corner=el('g',id='mouth_lip_'+side+'_corner_fade',data_part='mouth',data_kind='mouth',data_role='lip-color-corner-fade',mask='url(#mouth43_corner_fade)')
 base=el('g',id='mouth_lip_'+side+'_base_material',data_part='mouth',data_kind='mouth',data_role='lip-base-and-vertical-volume',data_sample_ids='06 09 12' if side=='upper' else '15 18 23')
 fill=get('mouth_lip_'+side+'_fill');fill.set('fill','url(#mouth43_'+side+'_base_color)');fill.getparent().remove(fill);base.append(fill);corner.append(base);layer_ids.append(base.get('id'))
 for region,samples in [('center','07 10 13' if side=='upper' else '16 19 21 24'),('right','08 11 14' if side=='upper' else '17 20 22 25')]:
  g=el('g',id='mouth_lip_'+side+'_'+region+'_material',data_part='mouth',data_kind='mouth',data_role='lip-'+region+'-color-volume',data_sample_ids=samples,mask='url(#mouth43_'+side+'_'+region+'_region)')
  g.append(el('use',id=g.get('id')+'_paint',href='#'+shape,fill='url(#mouth43_'+side+'_'+region+'_color)'));corner.append(g);layer_ids.append(g.get('id'))
 material.append(corner);lip.append(material)
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

def save(name,t):E.ElementTree(t).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def view(name,t,targets=None,hide=(),box='421 232 47 25',full=False):
 nums=list(map(float,box.split()))
 if targets:
  out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox=box,width=str(int(nums[2]*24)),height=str(int(nums[3]*24)))
  for dd in t.xpath('//*[local-name()="defs"]'):out.append(deepcopy(dd))
  for id in targets:
   item=deepcopy(get(id,t))
   if E.QName(item).localname=='path':item.set('id',id+'_diagnostic_support')
   for dd in item.xpath('.//*[local-name()="defs"]'):dd.getparent().remove(dd)
   out.append(item)
 else:
  out=deepcopy(t)
  if not full:out.set('viewBox',box);out.set('width',str(int(nums[2]*24)));out.set('height',str(int(nums[3]*24)))
 for id in hide:
  for e in out.xpath('.//*[@id="'+id+'"]'):e.set('display','none')
 save(name,out)
view('input-closeup',S);view('candidate-closeup',r);view('candidate-context',r,box='414 215 62 58');view('input-context',S,box='414 215 62 58')
view('input-default',S,full=True)
view('upper-lip-complete',r,['mouth_lip_upper']);view('lower-lip-complete',r,['mouth_lip_lower'])
view('upper-support',r,['mouth_lip_upper_complete_shape']);view('lower-support',r,['mouth_lip_lower_complete_shape'])
for id in layer_ids:view(id,r,[id])
no_local=deepcopy(r)
for id in layer_ids:
 if 'base' not in id:get(id,no_local).set('display','none')
view('base-colors-only-closeup',no_local)
view('internal-hidden-closeup',r,hide=['mouth_internal_visibility']);view('internal-hidden',r,hide=['mouth_internal_visibility'],full=True)
unclip=deepcopy(r);get('mouth_internal_visibility',unclip).attrib.pop('clip-path');view('covers-only-closeup',unclip)
view('input-mouth-hidden',S,hide=['mouth'],full=True);view('candidate-mouth-hidden',r,hide=['mouth'],full=True)
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
unchanged=['mouth_internal_visibility','mouth_upper_formal_line','mouth_lower_formal_line','mouth_upper_skin_cover','mouth_lower_skin_cover','mouth_construction_guides','mouth_default_aperture_clip','mouth_inside_clip']
audit={**expected,'candidate_sha256':sha(P/'character.svg'),'restore_sha256':sha(P/'着色前恢复点.svg'),'geometry_attribute_changes':changes,'non_mouth_top_level_xml_unchanged':len(S)==len(r) and all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='mouth'),'eyes_xml_unchanged':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in ['eye_right','eye_left']},'preserved_components_xml':{i:E.tostring(get(i,S))==E.tostring(get(i,r)) for i in unchanged},'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),'editable_lip_color_layers':layer_ids,'new_effects':[],'edge_policy':'only color masks softened; all color paint clipped to approved complete lip geometry; seam kept opaque by mask references to approved line','status':'stage-4.3-candidate'}
assert not any(changes.values()) and audit['non_mouth_top_level_xml_unchanged'] and all(audit['preserved_components_xml'].values()) and not audit['duplicate_ids'] and not audit['broken_refs']
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
