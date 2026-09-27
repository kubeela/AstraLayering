from pathlib import Path
from lxml import etree as E
import json
out=Path('refinement/groups/eyes/4.眼周肤色与局部层次');ev=out/'evidence'
source=Path('refinement/groups/eyes/3.关联部件校准/character.svg')
parser=E.XMLParser(remove_blank_text=False);tree=E.parse(str(source),parser);r=tree.getroot();ns='http://www.w3.org/2000/svg';q=lambda x:'{'+ns+'}'+x
make=lambda tag,**a:E.Element(q(tag),{k.replace('_','-'):str(v) for k,v in a.items()})
get=lambda i:r.xpath('.//*[@id=$i]',i=i)[0]
defs=r.find(q('defs'));face_d=get('face_clean_skin_clip')[0].get('d')
def radial(id,cx,cy,rx,ry,color,opacity):
 g=make('radialGradient',id=id,gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for off,op in [(0,opacity),(.45,opacity*.7),(.78,opacity*.22),(1,0)]:g.append(make('stop',offset=off,stop_color=color,stop_opacity=op))
 defs.append(g)
def linear(id,x1,x2,color,stops):
 g=make('linearGradient',id=id,gradientUnits='userSpaceOnUse',x1=x1,y1=0,x2=x2,y2=0)
 for off,op in stops:g.append(make('stop',offset=off,stop_color=color,stop_opacity=op))
 defs.append(g)
resources={
'eye_right':{'upper':['417.5','188.4','16','4.7','#FBEEEC',.45],'lower':['418','207.1','14.5','3.6','#FCE7E3',.40],
 'upper_makeup_d':'M 403.0,194.1 C 406.0,189.5 410.8,188.7 415.6,189.1 C 422.6,189.7 428.8,194.2 432.1,199.8 C 427.8,195.5 421.7,192.65 415.0,192.25 C 409.5,191.8 405.75,192.55 403.0,194.1 Z',
 'upper_makeup_color':'#C4A19F','upper_stops':[(0,.04),(.18,.44),(.35,.76),(.55,.61),(.80,.28),(1,0)],
 'lower_form_d':'M 404.0,201.0 C 410.0,205.4 419.9,205.6 429.1,202.6 C 426.8,205.4 420.2,207.2 414.3,206.8 C 409.6,206.5 405.7,204.45 404.0,201.0 Z',
 'lower_form_color':'#EACDC9','lower_stops':[(0,.20),(.22,.67),(.52,.53),(.82,.47),(1,0)],
 'corner':[405.8,202.0,3.3,3.6,'#EACDC9',.47]},
'eye_left':{'upper':['470','188.2','15.2','4.4','#FBF4F1',.44],'lower':['469.3','207.3','14','3.4','#FDE7E5',.24],
 'upper_makeup_d':'M 454.6,199.9 C 458.4,194.2 464.5,190.05 470.65,189.35 C 477.1,188.65 482.1,190.5 485.55,194.1 C 482.35,192.25 477.4,191.8 472.0,192.2 C 464.9,192.7 459.1,196.05 454.6,199.9 Z',
 'upper_makeup_color':'#EAC5C2','upper_stops':[(0,0),(.20,.18),(.38,.33),(.61,.52),(.83,.55),(1,.06)],
 'lower_form_d':'M 457.0,202.35 C 462.2,204.25 467.8,205.3 473.4,204.65 C 478.2,204.0 481.15,202.0 483.65,200.1 C 482.05,204.3 478.7,206.6 473.35,207.05 C 467.8,207.5 462.05,205.6 457.0,202.35 Z',
 'lower_form_color':'#BE8486','lower_stops':[(0,0),(.25,.10),(.49,.25),(.70,.48),(.89,.59),(1,.17)],
 'corner':[480.7,201.85,3.0,3.4,'#BE8486',.23]}
}
for part,d in resources.items():
 white=get(part+'_sclera_shape').get('d')
 clip=make('clipPath',id=part+'_skin_surface_clip',clipPathUnits='userSpaceOnUse',data_surface='face_base',data_exclude_shape=part+'_sclera_shape')
 clip.append(make('path',id=part+'_skin_surface_shape',d=face_d+' '+white,clip_rule='evenodd',fill_rule='evenodd'));defs.append(clip)
 radial(part+'_upper_skin_temperature',*d['upper'])
 radial(part+'_lower_skin_temperature',*d['lower'])
 radial(part+'_corner_skin_warmth',*d['corner'])
 x1,x2=(402,433) if part=='eye_right' else (454,486)
 linear(part+'_upper_makeup_color',x1,x2,d['upper_makeup_color'],d['upper_stops'])
 linear(part+'_lower_makeup_color',x1,x2,d['lower_form_color'],d['lower_stops'])
 f=make('filter',id=part+'_skin_soft_edge',filterUnits='userSpaceOnUse',x=x1-4,y=184,width=x2-x1+8,height=30,color_interpolation_filters='sRGB');f.append(make('feGaussianBlur',stdDeviation='.46'));defs.append(f)
 eye=get(part)
 skin=make('g',id=part+'_periocular_skin',data_part=part,data_kind='eyes',data_role='periocular-skin',clip_path='url(#'+part+'_skin_surface_clip)')
 intrinsic=make('g',id=part+'_skin_intrinsic',data_part=part,data_kind='eyes',data_role='intrinsic-skin-color-and-volume');skin.append(intrinsic)
 for region,key in [('upper','upper'),('lower','lower')]:
  cx,cy,rx,ry,_,_=d[key]
  intrinsic.append(make('ellipse',id=part+'_'+region+'_skin_temperature_field',cx=cx,cy=cy,rx=rx,ry=ry,fill='url(#'+part+'_'+region+'_skin_temperature)'))
 # The narrow outer-corner tint models skin, not a cast shadow from hair or eyelids.
 cx,cy,rx,ry,_,_=d['corner']
 intrinsic.append(make('ellipse',id=part+'_outer_corner_skin_shape',cx=cx,cy=cy,rx=rx,ry=ry,fill='url(#'+part+'_corner_skin_warmth)'))
 makeup=make('g',id=part+'_makeup',data_part=part,data_kind='eyes',data_role='local-eyeshadow');skin.append(makeup)
 makeup.append(make('path',id=part+'_upper_eyeshadow_shape',d=d['upper_makeup_d'],fill='url(#'+part+'_upper_makeup_color)',filter='url(#'+part+'_skin_soft_edge)'))
 makeup.append(make('path',id=part+'_lower_eyeshadow_shape',d=d['lower_form_d'],fill='url(#'+part+'_lower_makeup_color)',filter='url(#'+part+'_skin_soft_edge)'))
 # After title, before complete sclera and all internal/contour elements.
 eye.insert(1,skin)
r.find(q('title')).text='剑妈 · 完整分层稿 · eyes 第4步眼周肤色与局部层次'
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
# Four independent layer toggle tests plus whole eyes off.
for mode,hideids in [('no-right-skin',['eye_right_periocular_skin']),('no-left-skin',['eye_left_periocular_skin']),('no-skin',['eye_right_periocular_skin','eye_left_periocular_skin']),('no-right-eye',['eye_right']),('no-left-eye',['eye_left']),('no-eyes',['eye_right','eye_left'])]:
 t=E.parse(str(out/'character.svg'),parser)
 for i in hideids:t.xpath('.//*[@id=$i]',i=i)[0].set('display','none')
 t.write(str(ev/f'{mode}.svg'),encoding='utf-8',xml_declaration=True)
# Verify previously saved features/effects remained exact, apart from inserted eye skin groups.
src=E.parse(str(source),parser).getroot();now=E.parse(str(out/'character.svg'),parser).getroot()
for a,b in zip(src,now):
 if a.tag in [q('defs'),q('title')]:continue
 if a.get('id') in resources:
  b.remove(b.xpath('./*[@data-role="periocular-skin"]')[0])
 assert E.tostring(a)==E.tostring(b),a.get('id')
for old in src.find(q('defs')):
 new=now.xpath('.//*[@id=$i]',i=old.get('id'))[0];assert E.tostring(old)==E.tostring(new),old.get('id')
ids=[x.get('id') for x in r.iter() if x.get('id')];assert len(ids)==len(set(ids))
summary={'all_preexisting_top_level_layers_preserved':True,'existing_eye_sclera_contour_and_interior_preserved':True,'all_preexisting_defs_preserved':True,'skin_groups_added':['eye_right_periocular_skin','eye_left_periocular_skin'],'ids':len(ids),'unique_ids':len(set(ids)),'skin_clips_exclude_own_complete_sclera':True,'new_external_cast_shadows':0,'new_independent_highlights':0}
(ev/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary))

