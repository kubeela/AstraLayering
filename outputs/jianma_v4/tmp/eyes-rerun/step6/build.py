from pathlib import Path
from lxml import etree as E
import json
root=Path('.');src=root/'refinement/groups/eyes/5.眼黑与装饰部件绘制/character.svg';out=root/'refinement/groups/eyes/6.投影与高光效果';out.mkdir(parents=True,exist_ok=True)
tree=E.parse(str(src));r=tree.getroot();NS=r.nsmap[None];defs=r.find('{'+NS+'}defs')
C={s['id']:s['hex'] for s in json.loads((root/'refinement/groups/eyes/1.眼部色盘/palette.json').read_text(encoding='utf-8'))['samples']}
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
def sub(p,tag,**a):n=el(tag,**a);p.append(n);return n
def title(p,t):sub(p,'title').text=t
def byid(id):return r.xpath('//*[@id=$id]',id=id)[0]
def oval(cx,cy,rx,ry):
 k=.55228475
 return f'M {cx+rx},{cy} C {cx+rx},{cy+ry*k} {cx+rx*k},{cy+ry} {cx},{cy+ry} C {cx-rx*k},{cy+ry} {cx-rx},{cy+ry*k} {cx-rx},{cy} C {cx-rx},{cy-ry*k} {cx-rx*k},{cy-ry} {cx},{cy-ry} C {cx+rx*k},{cy-ry} {cx+rx},{cy-ry*k} {cx+rx},{cy} Z'
def blur(id,sd):
 f=sub(defs,'filter',id=id,x='-30%',y='-100%',width='160%',height='300%',color_interpolation_filters='sRGB');sub(f,'feGaussianBlur',stdDeviation=sd)
def radial(id,cx,cy,rx,ry,stops):
 g=sub(defs,'radialGradient',id=id,gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for off,col,op in stops:sub(g,'stop',offset=off,stop_color=col,stop_opacity=op)
 return id
blur('eyes6_sclera_shadow_soft','.95');blur('eye_right_eyes6_iris_shadow_soft','.8');blur('eye_left_eyes6_iris_shadow_soft','1.05');blur('eyes6_reflection_soft','.2')
spec={
 'eye_right':dict(shape=(418.8,196.35,6.65,7.55),shadow='M 400,187 C 413,185 430,190 436,199 L 436,205 C 431.5,203.1 428.2,200.5 424.5,198.5 C 420.4,196.75 416.2,196.4 412.9,196.6 C 409.6,196.8 407.6,198 405,200.5 L 400,200 Z',glint='M 418.28,196.48 C 418.68,196.23 419.27,196.35 419.55,196.72 C 419.82,197.14 419.5,197.67 419.0,197.82 C 418.47,197.98 418.0,197.57 418.03,197.08 C 418.05,196.82 418.1,196.62 418.28,196.48 Z',gx=419.08,gy=197.20,gfill='#EAF2FD',gtransform='translate(419.08 197.20) scale(1.25 1.1) translate(-418.9 -197.15)'),
 'eye_left':dict(shape=(469.45,196.3,6.7,7.55),shadow='M 451,201 C 456,188 475,185 489,189 L 489,202 C 485.5,201 481.3,197.8 477.9,197.4 C 474,197.2 469.7,197.75 466.5,196.6 C 463.3,196.6 459.2,200.3 455.1,202.3 L 451,202 Z',glint='M 468.18,195.98 C 468.6,195.76 469.23,195.93 469.43,196.34 C 469.65,196.78 469.36,197.28 468.86,197.42 C 468.32,197.5 467.93,197.17 467.95,196.7 C 467.93,196.42 468.01,196.14 468.18,195.98 Z',gx=469.03,gy=196.95,gfill='#E6E8F2',gtransform='translate(469.03 196.95) scale(1.2 1.2) translate(-468.75 -196.65)')
}
for part,s in spec.items():
 # Small evidence-based correction to the complete lower iris contour.
 cx,cy,rx,ry=s['shape'];d=oval(cx,cy,rx,ry)
 byid(part+'_iris_base').set('d',d);byid(part+'_iris_edge_shape').set('d',d)
 byid(part+'_iris_edge_color').set('gradientTransform',f'translate({cx} {cy}) scale({rx} {ry})')
 eye=byid(part);contents=byid(part+'_contents')
 white=el('g',id='fx_'+part+'_upper_lid_on_sclera',data_part=part,data_kind='eyes',data_effect='cast-shadow',data_source_part=part,data_source_id=part+'_upper_lid',data_target_part=part,data_target_id=part+'_sclera',data_follows_id=part+'_upper_lid',clip_path='url(#'+part+'_sclera_clip)')
 title(white,'上眼睑在眼白上的投影；随上眼睑，眼白范围裁切；虹膜后绘制覆盖其区域')
 sub(white,'path',id='fx_'+part+'_upper_lid_sclera_path',d=s['shadow'],fill='#3B293C',opacity='.9',filter='url(#eyes6_sclera_shadow_soft)')
 eye.insert(list(eye).index(contents),white)
 iris=sub(contents,'g',id='fx_'+part+'_upper_lid_on_eye_black',data_part=part,data_kind='eyes',data_effect='cast-shadow',data_source_part=part,data_source_id=part+'_upper_lid',data_target_part=part,data_target_id=part+'_eye_black',data_follows_id=part+'_upper_lid',clip_path='url(#'+part+'_iris_full_clip)')
 title(iris,'上眼睑在眼黑上的独立投影；不属于眼黑移动组；外层眼白与本层虹膜裁切取交集')
 sub(iris,'path',id='fx_'+part+'_upper_lid_iris_path',d=s['shadow'],fill='#17182A',opacity='.965',filter='url(#'+part+'_eyes6_iris_shadow_soft)')
 hi=sub(contents,'g',id=part+'_highlight',data_part=part,data_kind='eyes',data_effect='highlight',data_target_part=part,data_target_id=part+'_eye_black',data_carrier_id=part+'_eye_black',clip_path='url(#'+part+'_iris_full_clip)')
 title(hi,'角膜主反光，独立于眼黑；同眼眼白与虹膜双重裁切')
 halo=radial(part+'_corneal_reflection_halo',s['gx'],s['gy'],1.55,1.35,[(0,'#D9E8FB',.24),(.35,'#D9E8FB',.19),(.7,'#D9E8FB',.055),(1,'#D9E8FB',0)])
 sub(hi,'ellipse',id=part+'_reflection_edge',cx=s['gx'],cy=s['gy'],rx=1.55,ry=1.35,fill=f'url(#{halo})')
 sub(hi,'path',id=part+'_reflection_core',d=s['glint'],transform=s['gtransform'],fill=s['gfill'],opacity='.96',filter='url(#eyes6_reflection_soft)')
r.find('{'+NS+'}title').text='剑妈 · 完整分层稿 · eyes 第6步投影与独立高光'
r.set('data-refinement-step','6')
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
print(out/'character.svg')
