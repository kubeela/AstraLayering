from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/mouth/2.嘴型校准与部件线稿');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/eyes/6.镜像组装与成稿审查/character.svg');EXPECTED='c7f775b90d84a970a528b9b56b9f7a43f3f484de002133270832f9dc8cadc83e';assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
PLAN=Path('refinement/groups/mouth/1.制作计划/plan.json');PLANHASH='1240d7a52009079c9dd8034a357edfe41b4fae823699567519c27e74d2462525';assert hashlib.sha256(PLAN.read_bytes()).hexdigest()==PLANHASH
plan=json.loads(PLAN.read_text(encoding='utf-8'));assert plan['locked'] and plan['closeup_needed']==False and plan['mouths'][0]['default_pose']=='closed'
assert hashlib.sha256(Path('references/base-subject.png').read_bytes()).hexdigest().lower()==plan['reference_sha256'].lower()
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();r=deepcopy(S)
def get(id,tree=None):return (r if tree is None else tree).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**attrs):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def group(id,role,**attrs):return el('g',id=id,data_part='mouth',data_kind='mouth',data_role=role,**attrs)
mouth=group('mouth','static-closed-mouth',data_stage='calibrated-mouth-line-art-2',data_default_pose='closed',data_previous_placeholder_color='#B85674')
title=el('title');title.text='嘴部 · 原画布校准闭合线稿与完整隐藏结构';mouth.append(title)
desc=el('desc');desc.text='中性线稿；完整口腔、上牙和舌头保留非退化底形，默认由口裂与上下肤色遮盖隐藏。诊断独显不是新表情。';mouth.append(desc)
defs=el('defs');mouth.append(defs)
shapes={
 'mouth_inside_complete_shape':'M 429.00,239.00 C 435.00,236.50 452.50,236.20 458.90,239.20 C 461.20,242.40 459.70,246.80 455.60,249.40 C 449.20,252.10 436.80,251.60 431.70,248.60 C 428.60,246.50 426.90,242.30 429.00,239.00 Z',
 'mouth_teeth_upper_complete_shape':'M 428.60,238.70 C 436.10,236.75 452.68,236.92 460.20,238.80 L 459.10,243.70 C 453.10,245.50 434.10,245.40 429.80,243.80 Z',
 'mouth_tongue_complete_shape':'M 434.50,248.70 C 433.00,245.30 437.20,243.40 444.30,244.00 C 451.00,243.10 455.50,245.10 454.80,248.40 C 451.50,251.10 438.20,251.30 434.50,248.70 Z',
 'mouth_default_aperture_shape':'M 431.15,243.34 C 434.50,243.87 436.75,243.21 439.68,242.76 C 441.20,242.65 442.60,243.56 444.25,243.55 C 445.83,243.56 446.70,242.81 448.12,242.81 C 451.20,242.95 453.30,243.72 456.90,243.18 C 453.30,243.88 451.20,243.11 448.12,242.97 C 446.70,242.97 445.83,243.72 444.25,243.71 C 442.60,243.72 441.20,242.81 439.68,242.92 C 436.75,243.37 434.50,244.03 431.15,243.50 Z',
 'mouth_upper_skin_shape':'M 426.00,237.00 C 434.20,234.40 453.10,234.30 462.80,237.10 L 463.00,244.40 C 460.60,245.30 459.20,244.85 456.90,243.25 C 453.30,243.79 451.20,243.02 448.12,242.88 C 446.70,242.88 445.83,243.63 444.25,243.62 C 442.60,243.63 441.20,242.72 439.68,242.83 C 436.75,243.28 434.50,243.94 431.15,243.40 L 425.90,245.10 Z',
 'mouth_lower_skin_shape':'M 425.90,241.70 C 428.06,242.38 429.80,242.75 431.15,243.02 C 434.50,243.57 436.75,242.91 439.68,242.46 C 441.20,242.35 442.60,243.26 444.25,243.25 C 445.83,243.26 446.70,242.51 448.12,242.51 C 451.20,242.65 453.30,243.42 456.90,242.88 C 459.10,242.25 461.20,241.58 463.00,242.10 L 463.10,251.90 C 453.70,254.78 434.65,254.57 425.75,251.70 Z',
 'mouth_lip_upper_complete_shape':'M 431.15,243.40 C 434.80,243.05 436.70,240.60 439.40,240.05 C 441.80,239.80 443.00,241.06 444.35,240.95 C 445.60,240.86 446.50,239.95 448.08,240.10 C 451.60,240.20 453.80,243.05 456.90,243.25 C 453.30,243.79 451.20,243.02 448.12,242.88 C 446.70,242.88 445.83,243.63 444.25,243.62 C 442.60,243.63 441.20,242.72 439.68,242.83 C 436.75,243.28 434.50,243.94 431.15,243.40 Z',
 'mouth_lip_lower_complete_shape':'M 431.15,243.40 C 434.50,243.94 436.75,243.28 439.68,242.83 C 441.20,242.72 442.60,243.63 444.25,243.62 C 445.83,243.63 446.70,242.88 448.12,242.88 C 451.20,243.02 453.30,243.79 456.90,243.25 C 455.00,245.03 452.68,247.53 449.44,248.60 C 445.80,249.64 441.15,249.22 438.30,247.90 C 435.80,246.76 433.40,244.95 431.15,243.40 Z',
 'mouth_upper_line_shape':'M 431.10,243.30 C 434.60,243.60 436.80,242.98 439.70,242.55 C 441.35,242.40 442.65,243.30 444.25,243.32 C 445.76,243.33 446.74,242.54 448.15,242.58 C 451.13,242.72 453.47,243.49 456.95,243.19 C 456.40,243.65 454.70,244.00 452.50,243.95 C 450.70,243.81 449.25,243.38 448.12,243.28 C 446.73,243.20 445.90,244.00 444.25,244.00 C 442.67,244.00 441.08,243.17 439.67,243.19 C 436.80,243.60 433.90,244.33 431.60,243.80 C 431.20,243.70 431.00,243.49 431.10,243.30 Z'
}
shapes['mouth_lower_line_shape']='M 431.60,243.47 C 434.52,243.79 436.82,243.17 439.69,242.75 C 441.28,242.62 442.62,243.52 444.25,243.54 C 445.80,243.54 446.74,242.76 448.13,242.80 C 451.14,242.93 453.40,243.68 456.30,243.43 C 454.90,243.74 453.30,243.73 452.50,243.71 C 450.65,243.57 449.25,243.16 448.12,243.06 C 446.71,242.98 445.88,243.78 444.25,243.78 C 442.65,243.78 441.14,242.94 439.68,242.97 C 436.81,243.39 434.13,244.06 431.60,243.60 Z'
for id,d in shapes.items():defs.append(el('path',id=id,d=d))
for id,target in [('mouth_inside_clip','mouth_inside_complete_shape'),('mouth_default_aperture_clip','mouth_default_aperture_shape'),('mouth_upper_skin_clip','mouth_upper_skin_shape'),('mouth_lower_skin_clip','mouth_lower_skin_shape')]:
 clip=el('clipPath',id=id,clipPathUnits='userSpaceOnUse');clip.append(el('use',href='#'+target));defs.append(clip)
skin_gradients=['face_clean_skin_base','forehead_neutral_skin_gradient','left_lower_warm_skin_gradient','right_lower_cool_skin_gradient']
for id in skin_gradients:
 grad=deepcopy(get(id));grad.set('id','mouth_match_'+id);defs.append(grad)
fade=el('linearGradient',id='mouth_upper_skin_outer_fade_color',gradientUnits='userSpaceOnUse',x1='0',y1='235.00',x2='0',y2='237.00')
for at,op in [('0','0'),('.25','.05'),('.55','.32'),('.8','.75'),('1','1')]:fade.append(el('stop',offset=at,stop_color='white',stop_opacity=op))
defs.append(fade)
fade_mask=el('mask',id='mouth_upper_skin_outer_fade',maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x='424',y='233',width='41',height='15',style='mask-type:luminance')
fade_mask.append(el('rect',x='424',y='233',width='41',height='15',fill='url(#mouth_upper_skin_outer_fade_color)'));defs.append(fade_mask)
interior=group('mouth_internal_visibility','default-aperture-visibility',clip_path='url(#mouth_default_aperture_clip)')
inside=group('mouth_inside','contour-complete-inside',data_evidence='inferred');inside.append(el('use',id='mouth_inside_fill',href='#mouth_inside_complete_shape',fill='#77737A'));interior.append(inside)
contents=group('mouth_internal_parts','inside-clipped-contents',clip_path='url(#mouth_inside_clip)')
teeth=group('mouth_teeth_upper','inner-upper-teeth',data_evidence='inferred',data_follows_id='mouth_upper');teeth.append(el('use',id='mouth_teeth_upper_fill',href='#mouth_teeth_upper_complete_shape',fill='#E9E7E8'));contents.append(teeth)
tongue=group('mouth_tongue','inner-tongue',data_evidence='inferred',data_follows_id='mouth_inside');tongue.append(el('use',id='mouth_tongue_fill',href='#mouth_tongue_complete_shape',fill='#AAA2AA'));contents.append(tongue);interior.append(contents);mouth.append(interior)
def lip_control(which,color):
 control=group('mouth_'+which,'contour-'+which+'-control')
 cover=group('mouth_'+which+'_skin_cover','skin-cover',data_follows_id='mouth_'+which)
 if which=='upper':cover.set('mask','url(#mouth_upper_skin_outer_fade)')
 cover.append(el('use',id='mouth_'+which+'_skin_fill',href='#mouth_'+which+'_skin_shape',fill='url(#mouth_match_face_clean_skin_base)'))
 tones=group('mouth_'+which+'_skin_match','skin-color-match',clip_path='url(#mouth_'+which+'_skin_clip)',data_follows_id='mouth_'+which)
 for id in ['forehead_neutral_skin','left_lower_warm_skin','right_lower_cool_skin']:
  e=deepcopy(get(id));e.set('id','mouth_'+which+'_match_'+id);e.set('fill','url(#mouth_match_'+id+'_gradient)');tones.append(e)
 cover.append(tones);control.append(cover)
 lip=group('mouth_lip_'+which,'decoration-'+which+'-lip',data_evidence='observed',data_follows_id='mouth_'+which);lip.append(el('use',id='mouth_lip_'+which+'_fill',href='#mouth_lip_'+which+'_complete_shape',fill=color));control.append(lip)
 line=group('mouth_'+which+'_formal_line','formal-'+which+'-mouth-line',data_follows_id='mouth_'+which)
 if which=='lower':
  line.set('data-default-visibility','closed-pose-overlap-disabled');line.set('display','none')
 line.append(el('use',id='mouth_'+which+'_line_ink',href='#mouth_'+which+'_line_shape',fill='#75676E'));control.append(line)
 return control
mouth.append(lip_control('lower','#D8D3D7'));mouth.append(lip_control('upper','#C9C2C7'))
guides=group('mouth_construction_guides','construction-guide',display='none',fill='none',stroke='#6675A3',stroke_width='.22',stroke_dasharray='1.2 .8')
for id in ['mouth_inside_complete_shape','mouth_teeth_upper_complete_shape','mouth_tongue_complete_shape','mouth_upper_skin_shape','mouth_lower_skin_shape','mouth_lip_upper_complete_shape','mouth_lip_lower_complete_shape','mouth_default_aperture_shape']:guides.append(el('use',id='mouth_guide_'+id,href='#'+id))
mouth.append(guides)
old=get('mouth');old.getparent().replace(old,mouth)
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

def save(name,tree):E.ElementTree(tree).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def view(name,tree,targets=None,hide=(),unclip=False,box='421 232 47 25',full=False):
 if targets:
  nums=list(map(float,box.split()));out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox=box,width=str(int(nums[2]*24)),height=str(int(nums[3]*24)))
  for dd in tree.xpath('//*[local-name()="defs"]'):out.append(deepcopy(dd))
  for id in targets:
   item=deepcopy(get(id,tree))
   for dd in item.xpath('.//*[local-name()="defs"]'):dd.getparent().remove(dd)
   if unclip:
    for e in item.iter():
     if e.get('clip-path')=='url(#mouth_default_aperture_clip)':e.attrib.pop('clip-path')
   out.append(item)
 else:
  out=deepcopy(tree)
  if not full:nums=list(map(float,box.split()));out.set('viewBox',box);out.set('width',str(int(nums[2]*24)));out.set('height',str(int(nums[3]*24)))
 for id in hide:
  for item in out.xpath('.//*[@id="'+id+'"]'):item.set('display','none')
 save(name,out)
view('input-closeup',S);view('candidate-closeup',r);view('without-interior',r,hide=['mouth_internal_visibility'],full=True)
view('without-lower-line',r,hide=['mouth_lower_formal_line'],full=True)
view('without-interior-closeup',r,hide=['mouth_internal_visibility'])
view('without-lower-line-closeup',r,hide=['mouth_lower_formal_line'])
cover_diagnostic=deepcopy(r);get('mouth_internal_visibility',cover_diagnostic).attrib.pop('clip-path');view('covers-without-aperture-closeup',cover_diagnostic)
view('candidate-context',r,box='414 215 62 58');view('input-context',S,box='414 215 62 58')
view('only-interior-complete',r,['mouth_internal_visibility'],unclip=True)
view('inside-complete',r,['mouth_inside']);view('teeth-complete',r,['mouth_teeth_upper']);view('tongue-complete',r,['mouth_tongue'])
view('mouth-upper-complete',r,['mouth_upper'])
lower_diagnostic=deepcopy(r);get('mouth_lower_formal_line',lower_diagnostic).set('display','inline');view('mouth-lower-complete',lower_diagnostic,['mouth_lower'])
view('skin-covers',r,['mouth_upper_skin_cover','mouth_lower_skin_cover'])
view('isolated-mouth',r,['mouth'])
guide=deepcopy(r);get('mouth_construction_guides',guide).set('display','inline');view('guides-on',guide,['mouth'])
view('input-mouth-hidden',S,hide=['mouth'],full=True)

ids=[e.get('id') for e in r.iter() if e.get('id')];refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
  if k=='data-follows-id':refs.append(v)
audit={'input_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'plan_sha256':PLANHASH,
 'non_mouth_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='mouth'),
 'eyes_xml_unchanged':{id:E.tostring(get(id,S))==E.tostring(get(id,r)) for id in ['eye_right','eye_left']},
 'default_pose':'closed','actual_components':['mouth_upper','mouth_lower','mouth_inside','mouth_teeth_upper','mouth_tongue','mouth_lip_upper','mouth_lip_lower'],'omitted_components':['teeth_lower','lip_gloss'],
 'complete_shape_ids':list(shapes),'mouth_group_order':[e.get('id') for e in mouth],
 'guides_display':guides.get('display'),'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),
 'status':'candidate-awaiting-independent-line-art-review'}
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
