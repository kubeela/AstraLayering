from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/eyes/4.逐眼投影与高光/eye_right');P.mkdir(parents=True,exist_ok=True)
(P/'evidence').mkdir(exist_ok=True)
SOURCE=Path('refinement/groups/eyes/3.逐眼着色/eye_right/character.svg')
EXPECTED='234806168e08ae68a4bcc7e844779209661a9f9440493b024015b9d723d6713f'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();r=deepcopy(S)
def el(tag,**attrs):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def get(id,tree=None):return (r if tree is None else tree).xpath('.//*[@id="'+id+'"]')[0]
eye=get('eye_right');defs=eye.find('{'+NS+'}defs');opening=get('eye_right_opening')
eye.set('data-stage','eye-effects')
def clip(id,surface):
 e=el('clipPath',id=id,clipPathUnits='userSpaceOnUse');e.append(el('use',href='#'+surface));defs.append(e)
clip('eye4_right_sclera_surface_clip','eye_right_sclera_complete_shape')
clip('eye4_right_iris_surface_clip','eye_right_iris_complete_shape')
for id,blur in [('eye4_right_lid_shadow_soft','0.47'),('eye4_right_glint_soft','0.16')]:
 f=el('filter',id=id,x='-40%',y='-60%',width='180%',height='220%',color_interpolation_filters='sRGB')
 f.append(el('feGaussianBlur',stdDeviation=blur));defs.append(f)
def gradient(id,stops):
 e=el('linearGradient',id=id,gradientUnits='userSpaceOnUse',x1='417',y1='192',x2='419',y2='200')
 for offset,color,opacity in stops:e.append(el('stop',offset=offset,stop_color=color,stop_opacity=opacity))
 defs.append(e)
gradient('eye4_right_sclera_cast_color',[('0','#7E4C68','.58'),('.4','#896077','.47'),('1','#986E7C','.23')])
gradient('eye4_right_iris_cast_color',[('0','#111329','.90'),('.42','#152039','.81'),('1','#22365B','.54')])

SHADOW='M 400.60,190.10 C 407.28,186.51 420.77,187.92 429.22,193.47 C 432.34,195.60 434.51,198.51 435.50,202.61 L 433.05,203.46 C 429.04,200.39 425.51,198.53 420.83,197.14 C 416.13,195.84 410.75,195.98 407.51,198.45 C 405.65,199.84 404.85,201.67 404.65,202.94 L 400.31,202.31 C 399.75,199.01 399.32,193.12 400.60,190.10 Z'
def shadow(id,target,clipid,colorid):
 g=el('g',id=id,data_part='eye_right',data_kind='eyes',data_effect='cast-shadow',data_source_part='eye_right',data_source_id='eye_right_upper_lid_ink',data_target_part='eye_right',data_target_id=target,data_motion='upper-eyelid-driven')
 # Blur the complete path inside both target-surface and aperture clips.
 a=el('g',id=id+'_target_clip',clip_path='url(#'+clipid+')');b=el('g',id=id+'_opening_clip',clip_path='url(#eye_right_aperture_clip)')
 p=el('path',id=id+'_complete_path',d=SHADOW,fill='url(#'+colorid+')',filter='url(#eye4_right_lid_shadow_soft)')
 b.append(p);a.append(b);g.append(a);return g
sclera=shadow('fx_eye_right_upper_lid_on_sclera','eye_right_sclera_complete_shape','eye4_right_sclera_surface_clip','eye4_right_sclera_cast_color')
iris=shadow('fx_eye_right_upper_lid_on_iris','eye_right_iris_complete_shape','eye4_right_iris_surface_clip','eye4_right_iris_cast_color')
# Sclera shadow is below the opaque gaze material; iris shadow is above it.
opening.insert(list(opening).index(get('eye_right_sclera'))+1,sclera)
opening.insert(list(opening).index(get('eye_right_gaze'))+1,iris)

# Reuse the approved independent highlight, above the cast shadows.
highlight=get('eye_right_highlights');highlight.getparent().remove(highlight)
highlight.attrib.update({'data-part':'eye_right','data-kind':'eyes','data-effect':'highlight','data-target-part':'eye_right','data-target-id':'eye_right_iris_complete_shape','data-relative-to':'eye_right_gaze','data-motion':'iris-relative-independent-control','display':'inline'})
use=get('eye_right_highlight_main',highlight)
highlight.remove(use)
a=el('g',id='eye4_right_highlight_surface_clip',clip_path='url(#eye4_right_iris_surface_clip)')
b=el('g',id='eye4_right_highlight_opening_clip',clip_path='url(#eye_right_aperture_clip)')
use.set('fill','#F5FFFF');use.set('opacity','0.96');use.set('filter','url(#eye4_right_glint_soft)')
b.append(use);a.append(b);highlight.append(a);opening.append(highlight)
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

FX=['fx_eye_right_upper_lid_on_sclera','fx_eye_right_upper_lid_on_iris','eye_right_highlights']
def save_variant(name,hidefx=False,nosource=False,nohair=False,isolated=False):
 t=deepcopy(r)
 if hidefx:
  for id in FX:get(id,t).set('display','none')
 if nosource:
  for id in ['eye_right_upper_eyelid','eye_right_upper_lashes']:get(id,t).set('display','none')
 if nohair:
  for e in t.xpath('//*[@data-kind="hair"]'):e.set('display','none')
 if isolated:
  for e in list(t):
   if E.QName(e).localname not in ('defs','title','desc') and e.get('id')!='eye_right':t.remove(e)
 if name not in ('effects-off-full','source-off-full'):
  t.set('viewBox','394 185 45 28');t.set('width','1080');t.set('height','672')
 E.ElementTree(t).write(str(P/'evidence'/(name+'.svg')),encoding='utf-8',xml_declaration=True)
save_variant('effects-off-full',hidefx=True)
save_variant('source-off-full',hidefx=True,nosource=True)
save_variant('effects-nohair',nohair=True)
save_variant('effects-isolated',isolated=True)
save_variant('effects-off-isolated',hidefx=True,isolated=True)
save_variant('source-and-shadow-off',hidefx=True,nosource=True,isolated=True)

# Isolate each effect with and without clipping. All original editable shapes stay complete.
for id in FX:
 for mode in ('clipped','unclipped'):
  t=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672')
  for dd in r.xpath('//*[local-name()="defs"]'):t.append(deepcopy(dd))
  g=deepcopy(get(id))
  if mode=='unclipped':
   for e in g.iter():e.attrib.pop('clip-path',None)
  t.append(g)
  E.ElementTree(t).write(str(P/'evidence'/(id+'-'+mode+'.svg')),encoding='utf-8',xml_declaration=True)

ids=[e.get('id') for e in r.iter() if e.get('id')];before={e.get('id'):e for e in S.iter() if e.get('id')};after={e.get('id'):e for e in r.iter() if e.get('id')}
keys=['d','cx','cy','rx','ry','x','y','transform','clip-path','clipPathUnits','fill-rule','stroke-width']
changes=[]
for id,e in before.items():
 for k in keys:
  if e.get(k)!=after[id].get(k):changes.append({'id':id,'attr':k,'before':e.get(k),'after':after[id].get(k)})
refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
audit={'clean_coloring_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),
 'frozen_geometry_changes':changes,'non_eye_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='eye_right'),
 'duplicate_ids':sorted({x for x in ids if ids.count(x)>1}),'broken_refs':sorted(set(refs)-set(ids)),
 'effects':[dict(get(id).attrib) for id in FX],
 'eye_top_level_index':list(r).index(eye),'hair_front_indexes':[list(r).index(get('hair_front_right')),list(r).index(get('hair_front_left'))],
 'new_masks':len(r.xpath('//*[local-name()="mask"]'))-len(S.xpath('//*[local-name()="mask"]'))}
(P/'evidence/audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
