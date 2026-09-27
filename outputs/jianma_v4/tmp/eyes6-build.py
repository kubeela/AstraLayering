from pathlib import Path
from lxml import etree as E
import json
out=Path('refinement/groups/eyes/6.投影与高光效果');ev=out/'evidence';source=Path('refinement/groups/eyes/5.眼黑与装饰部件绘制/character.svg')
parser=E.XMLParser(remove_blank_text=False);tree=E.parse(str(source),parser);r=tree.getroot();ns='http://www.w3.org/2000/svg';q=lambda s:'{'+ns+'}'+s
mk=lambda tag,**a:E.Element(q(tag),{k.replace('_','-'):str(v) for k,v in a.items()});get=lambda i:r.xpath('.//*[@id=$i]',i=i)[0];defs=r.find(q('defs'))
def lg(id,y1,y2,color,stops):
 grad=mk('linearGradient',id=id,gradientUnits='userSpaceOnUse',x1=0,y1=y1,x2=0,y2=y2)
 for off,op in stops:grad.append(mk('stop',offset=off,stop_color=color,stop_opacity=op))
 defs.append(grad)
def rg(id,cx,cy,rx,ry,color,stops):
 grad=mk('radialGradient',id=id,gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for off,op in stops:grad.append(mk('stop',offset=off,stop_color=color,stop_opacity=op))
 defs.append(grad)
data={
'eye_right':{'shadow':'M 399.9,191.5 C 410.4,189.85 422.75,191.3 433.3,201.4 L 432.2,204.0 C 425.25,198.6 418.1,197.2 410.5,197.4 C 406.2,197.4 402.75,199.4 399.4,201.6 Z',
 'iris_stops':[(0,.84),(.29,.78),(.55,.65),(.80,.13),(1,0)],'iris_y':[194.5,198.3],
 'sclera_stops':[(0,.43),(.34,.29),(.72,.08),(1,0)],'sclera_color':'#8E798B',
 'glint_center':[418.8,197.15],
 'glint':'M 418.05,196.4 C 418.5,196.25 419.25,196.25 419.65,196.45 L 419.73,197.7 C 419.25,197.97 418.57,197.98 418.17,197.72 Z',
 'glint_opacity':'.87'},
'eye_left':{'shadow':'M 453.9,198.4 C 461.1,190.8 474.15,189.85 485.6,191.6 L 487.1,200.7 C 482.85,197.5 478.0,197.0 472.65,197.2 C 465.8,197.4 459.1,199.0 454.5,203.1 Z',
 'iris_stops':[(0,.66),(.22,.60),(.44,.44),(.65,.28),(.83,.06),(1,0)],'iris_y':[194.45,198.7],
 'sclera_stops':[(0,.39),(.35,.27),(.72,.07),(1,0)],'sclera_color':'#8A7480',
 'glint_center':[468.65,196.4],
 'glint':'M 467.75,195.75 C 468.3,195.48 469.1,195.55 469.73,195.85 L 469.75,196.68 C 469.2,197.03 468.35,197.1 467.93,196.8 Z',
 'glint_opacity':'.88'}
}
new_effects=[]
for part,d in data.items():
 eye=get(part);lg(part+'_lid_shadow_on_white_color',194.25,198.5,d['sclera_color'],d['sclera_stops']);lg(part+'_lid_shadow_on_iris_color',*d['iris_y'],'#171A2B',d['iris_stops'])
 x=398 if part=='eye_right' else 452
 f=mk('filter',id=part+'_lid_shadow_soft',filterUnits='userSpaceOnUse',x=x,y=189,width=38,height=19,color_interpolation_filters='sRGB');f.append(mk('feGaussianBlur',stdDeviation='.38'));defs.append(f)
 f=mk('filter',id=part+'_glint_soft',filterUnits='userSpaceOnUse',x=x,y=190,width=38,height=16,color_interpolation_filters='sRGB');f.append(mk('feGaussianBlur',stdDeviation='.16'));defs.append(f)
 cx,cy=d['glint_center'];rg(part+'_glint_halo_color',cx,cy,1.85,1.32,'#DCEBFA',[(0,.42),(.5,.21),(1,0)])
 def effect(id,type,target,source_id=None):
  g=mk('g',id=id,data_part=part,data_kind='eyes',data_effect=type,data_target_part=part,data_target_id=target,clip_path='url(#'+part+'_sclera_clip)')
  if source_id is not None:g.set('data-source-part',part);g.set('data-source-id',source_id)
  new_effects.append(id);return g
 # Sclera cast is behind iris; the same source's iris surface cast is a separate target fragment.
 white=effect(part+'_upper_lid_on_sclera','cast-shadow',part+'_sclera_shape',part+'_upper_eyelid')
 white.append(mk('path',id=part+'_upper_lid_sclera_shadow_path',d=d['shadow'],fill='url(#'+part+'_lid_shadow_on_white_color)',filter='url(#'+part+'_lid_shadow_soft)'))
 iris=get(part+'_interior');eye.insert(list(eye).index(iris),white)
 iris_cast=effect(part+'_upper_lid_on_iris','cast-shadow',part+'_eye_black_shape',part+'_upper_eyelid')
 scope=mk('g',id=part+'_upper_lid_iris_surface_limit',clip_path='url(#'+part+'_iris_surface_clip)');iris_cast.append(scope)
 scope.append(mk('path',id=part+'_upper_lid_iris_shadow_path',d=d['shadow'],fill='url(#'+part+'_lid_shadow_on_iris_color)',filter='url(#'+part+'_lid_shadow_soft)'))
 eye.insert(list(eye).index(iris)+1,iris_cast)
 highlight=effect(part+'_highlight','highlight',part+'_eye_black_shape')
 scope=mk('g',id=part+'_highlight_iris_surface_limit',clip_path='url(#'+part+'_iris_surface_clip)');highlight.append(scope)
 scope.append(mk('ellipse',id=part+'_highlight_soft_halo',cx=cx,cy=cy,rx=1.85,ry=1.32,fill='url(#'+part+'_glint_halo_color)'))
 scope.append(mk('path',id=part+'_highlight_core_shape',d=d['glint'],fill='#F9FDFF',opacity=d['glint_opacity'],filter='url(#'+part+'_glint_soft)'))
 eye.insert(list(eye).index(iris_cast)+1,highlight)
r.find(q('title')).text='剑妈 · 完整分层稿 · eyes 第6步投影与高光完成'
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
# Effect toggle and surface completion evidence derived from SAVED file.
for mode in ['no-right-effects','no-left-effects','no-eye-effects','effects-only','no-upper-lids-or-their-shadows','no-front-hair-or-their-shadows','no-eyes','no-eye-black-or-highlights','eye-black-highlights-unclipped']:
 t=E.parse(str(out/'character.svg'),parser);root=t.getroot()
 effects=root.xpath('.//*[@data-kind="eyes" and @data-effect]')
 if mode in ['no-right-effects','no-left-effects','no-eye-effects']:
  for el in effects:
   if mode=='no-eye-effects' or el.get('data-part')=='eye_'+mode.split('-')[1]:el.set('display','none')
 elif mode=='effects-only':
  # Preserve referenced geometry in hidden definitions before removing render layers.
  import copy
  dd=root.find(q('defs'))
  for part in data:
   for suffix in ['sclera_shape','eye_black_shape']:
    dd.append(copy.deepcopy(root.xpath('.//*[@id=$i]',i=part+'_'+suffix)[0]))
  for el in list(root):
   if el.tag not in [q('defs'),q('title'),q('desc')]:root.remove(el)
  for el in effects:
   el.getparent().remove(el);root.append(el)
 elif mode=='no-upper-lids-or-their-shadows':
  for part in data:
   root.xpath('.//*[@id=$i]',i=part+'_upper_eyelid')[0].set('display','none')
   for el in root.xpath('.//*[@data-source-id=$id]',id=part+'_upper_eyelid'):el.set('display','none')
 elif mode=='no-front-hair-or-their-shadows':
  for part in ['hair_front_right','hair_front_left']:
   root.xpath('.//*[@id=$i]',i=part)[0].set('display','none')
   for el in root.xpath('.//*[@data-source-part=$id]',id=part):el.set('display','none')
 elif mode=='no-eyes':
  for el in root.xpath('.//*[@data-part="eye_right" or @data-part="eye_left"]'):el.set('display','none')
 elif mode=='no-eye-black-or-highlights':
  for part in data:
   for suffix in ['eye_black','highlight','upper_lid_on_iris']:root.xpath('.//*[@id=$i]',i=part+'_'+suffix)[0].set('display','none')
 elif mode=='eye-black-highlights-unclipped':
  import copy
  wanted=[]
  for part in data:
   for suffix in ['eye_black','highlight']:
    el=root.xpath('.//*[@id=$i]',i=part+'_'+suffix)[0];el.attrib.pop('clip-path',None);wanted.append(el)
  for el in list(root):
   if el.tag not in [q('defs'),q('title'),q('desc')]:root.remove(el)
  for el in wanted:
   if el.getparent() is not None:el.getparent().remove(el)
   root.append(el)
 t.write(str(ev/f'{mode}.svg'),encoding='utf-8',xml_declaration=True)
# Preserve all previous geometry, skin/decorations, face effects, and prior resources exactly.
src=E.parse(str(source),parser).getroot();now=E.parse(str(out/'character.svg'),parser).getroot()
for id in new_effects:
 el=now.xpath('.//*[@id=$i]',i=id)[0];el.getparent().remove(el)
for old,new in zip(src,now):
 if old.tag in [q('defs'),q('title')]:continue
 assert E.tostring(old)==E.tostring(new),old.get('id')
for old in src.find(q('defs')):
 new=now.xpath('.//*[@id=$i]',i=old.get('id'))[0];assert E.tostring(old)==E.tostring(new),old.get('id')
ids=[el.get('id') for el in r.iter() if el.get('id')];assert len(ids)==len(set(ids))
summary={'all_previous_render_layers_preserved':True,'all_previous_defs_preserved':True,'eye_effect_groups_added':new_effects,'unique_ids':len(ids),'skin_cast_shadows_added':0,'prior_hair_cast_shadows_unchanged':True,'static_material_and_relation_check_only':True}
(ev/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))

