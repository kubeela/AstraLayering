from pathlib import Path
from lxml import etree as E
import json
root=Path('.');src=root/'refinement/groups/eyes/4.眼周肤色与局部层次/character.svg';out=root/'refinement/groups/eyes/5.眼黑与装饰部件绘制';out.mkdir(parents=True,exist_ok=True)
tree=E.parse(str(src));r=tree.getroot();NS=r.nsmap[None];defs=r.find('{'+NS+'}defs')
C={s['id']:s['hex'] for s in json.loads((root/'refinement/groups/eyes/1.眼部色盘/palette.json').read_text(encoding='utf-8'))['samples']}
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
def sub(p,tag,**a):n=el(tag,**a);p.append(n);return n
def title(p,t):sub(p,'title').text=t
def idnode(id):return r.xpath('//*[@id=$id]',id=id)[0]
def oval(cx,cy,rx,ry):
 k=.55228475
 return f'M {cx+rx},{cy} C {cx+rx},{cy+ry*k} {cx+rx*k},{cy+ry} {cx},{cy+ry} C {cx-rx*k},{cy+ry} {cx-rx},{cy+ry*k} {cx-rx},{cy} C {cx-rx},{cy-ry*k} {cx-rx*k},{cy-ry} {cx},{cy-ry} C {cx+rx*k},{cy-ry} {cx+rx},{cy-ry*k} {cx+rx},{cy} Z'
def radial(id,cx,cy,rx,ry,stops):
 g=sub(defs,'radialGradient',id=id,gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for off,col,opacity in stops:sub(g,'stop',offset=off,stop_color=col,stop_opacity=opacity)
 return id
def linear(id,x1,y1,x2,y2,stops):
 g=sub(defs,'linearGradient',id=id,gradientUnits='userSpaceOnUse',x1=x1,y1=y1,x2=x2,y2=y2)
 for off,col,op in stops:sub(g,'stop',offset=off,stop_color=col,stop_opacity=op)
 return id
f=sub(defs,'filter',id='eyes5_fine_mark_soft',x='-50%',y='-50%',width='200%',height='200%',color_interpolation_filters='sRGB');sub(f,'feGaussianBlur',stdDeviation='.16')
spec={
'eye_right':dict(cx=418.5,cy=196.55,rx=6.3,ry=7.25,pupil=(418.3,197.8,3.0,2.6),color=[(0,'#45648E',1),(.35,'#507AA7',1),(.61,'#8AB7DE',1),(.84,'#C7DFF2',1),(1,'#C0CCE0',1)],pupilcolor='#263F6B',ink=C['11'],
crease='M 410.2,190.55 C 416.7,189.95 424.1,191.7 430.3,198.6',
lash='M 407.9,196.2 C 406.8,195.6 405.6,195.4 404.35,195.8 C 405.2,196 405.7,196.9 406.65,197.1 C 407.2,197.2 407.7,196.9 407.9,196.2 Z',
frontlash='M 405.1,195.25 C 404.7,196.3 404.1,196.8 403.15,196.95 C 403.45,197.55 404.5,197.55 405.35,196.9 C 405.65,196.35 405.65,195.9 405.1,195.25 Z'),
'eye_left':dict(cx=469.2,cy=196.35,rx=6.45,ry=7.3,pupil=(468.8,197.7,2.8,2.55),color=[(0,'#485F88',1),(.33,'#5D81AC',1),(.62,'#99C6E8',1),(.83,C['10'],1),(1,'#C1CEDF',1)],pupilcolor='#1C3562',ink=C['13'],
crease='M 456.8,199 C 461.35,193.9 466.9,190.3 472.75,190.3 C 475.4,190.3 478,190.85 479.4,192.0',
lash='M 480.3,195.9 C 482.7,196.5 483.7,195.5 483.9,194.2 C 484.6,196.3 484.5,197.5 483.1,197.9 C 481.9,198 481.3,197.3 480.3,196.9 Z',
frontlash='M 483.3,194.4 C 483.95,195.4 484.6,196 485.6,196.35 C 485.25,197.55 484.6,197.85 483.8,197.25 C 483.2,196.6 483.15,195.55 483.3,194.4 Z')
}
front_groups=[]
for part,s in spec.items():
 eye=idnode(part);black=idnode(part+'_eye_black');black.attrib.pop('data-stage',None)
 for child in list(black):black.remove(child)
 title(black,'完整虹膜、连续固有蓝色与独立瞳孔；眼睑投影及高光另层处理')
 cx,cy,rx,ry=s['cx'],s['cy'],s['rx'],s['ry'];shape=oval(cx,cy,rx,ry)
 grad=linear(part+'_iris_body_color',cx,193,cx,203.8,s['color'])
 sub(black,'path',id=part+'_iris_base',d=shape,fill=f'url(#{grad})')
 clip=sub(defs,'clipPath',id=part+'_iris_full_clip',clipPathUnits='userSpaceOnUse');sub(clip,'use',href='#'+part+'_iris_base')
 fields=sub(black,'g',id=part+'_iris_color_fields',data_part=part,data_kind='eyes',clip_path='url(#'+part+'_iris_full_clip)')
 title(fields,'虹膜自身的连续蓝色变化；没有独立高光或规则纹样')
 # Very broad, soft variations are deliberately not hard color patches.
 g=radial(part+'_iris_lower_color_variation',cx-.9,201.0,4.5,2.65,[(0,'#D8F0FF',.19),(.38,'#D8F0FF',.14),(.75,'#D8F0FF',.035),(1,'#D8F0FF',0)])
 sub(fields,'ellipse',id=part+'_iris_lower_color_field',cx=cx-.9,cy=201,rx=4.5,ry=2.65,fill=f'url(#{g})')
 g=radial(part+'_iris_side_color_variation',cx+3.0,199.15,2.8,3.4,[(0,'#477CB4',.14),(.5,'#477CB4',.07),(1,'#477CB4',0)])
 sub(fields,'ellipse',id=part+'_iris_side_color_field',cx=cx+3,cy=199.15,rx=2.8,ry=3.4,fill=f'url(#{g})')
 edge=sub(black,'g',id=part+'_iris_edge',data_part=part,data_kind='eyes')
 g=radial(part+'_iris_edge_color',cx,cy,rx,ry,[(0,'#596F96',0),(.73,'#596F96',0),(.87,'#596F96',.08),(.96,'#596F96',.52),(1,'#596F96',.78)])
 sub(edge,'path',id=part+'_iris_edge_shape',d=shape,fill=f'url(#{g})')
 px,py,prx,pry=s['pupil'];pupil=sub(black,'g',id=part+'_pupil',data_part=part,data_kind='eyes')
 title(pupil,'独立完整瞳孔，边缘向蓝色虹膜连续过渡')
 g=radial(part+'_pupil_color',px,py,prx,pry,[(0,s['pupilcolor'],1),(.38,s['pupilcolor'],1),(.68,'#365A8C',.98),(.9,'#537CAE',.72),(1,'#779FD0',0)])
 sub(pupil,'path',id=part+'_pupil_shape',d=oval(px,py,prx,pry),fill=f'url(#{g})')
 eyelid=el('g',id=part+'_eyelid',data_part=part,data_kind='eyes',data_category='decoration',data_role='eyelid-fold',clip_path='url(#face_clean_skin_clip)')
 title(eyelid,'细淡的上眼皮褶线，与开合边界分离')
 linegrad=linear(part+'_fold_color',409 if part=='eye_right' else 456,0,431 if part=='eye_right' else 480,0,[(0,'#B68D8F',.24),(.35,'#B68D8F',.57),(.73,'#B68D8F',.47),(1,'#B68D8F',.1)])
 sub(eyelid,'path',id=part+'_eyelid_fold_path',d=s['crease'],fill='none',stroke=f'url(#{linegrad})',stroke_width='.42',stroke_linecap='round',filter='url(#eyes5_fine_mark_soft)')
 sclera=idnode(part+'_sclera');eye.insert(list(eye).index(sclera),eyelid)
 lash=sub(eye,'g',id=part+'_upper_lashes',data_part=part,data_kind='eyes',data_category='decoration',data_role='upper-eyelashes')
 title(lash,'外眼角上睫毛完整连接段；中间由前发遮挡')
 sub(lash,'path',id=part+'_upper_lash_root',d=s['lash'],fill=s['ink'])
 front=el('g',id=part+'_upper_lashes_front',data_part=part,data_kind='eyes',data_category='decoration',data_role='upper-eyelashes-front-fragment')
 title(front,'参考中越过前发可见的外侧睫毛尖端；与所属眼同步显隐')
 sub(front,'path',id=part+'_upper_lash_visible_tip',d=s['frontlash'],fill=s['ink'],opacity='.8' if part=='eye_right' else '.94',filter='url(#eyes5_fine_mark_soft)')
 front_groups.append(front)
# The visible lash tips are separate fragments above the foreground hair.
anchor=idnode('hair_front_left');parent=anchor.getparent();idx=list(parent).index(anchor)+1
for offset,g in enumerate(front_groups):parent.insert(idx+offset,g)
r.find('{'+NS+'}title').text='剑妈 · 完整分层稿 · eyes 第5步眼黑与装饰部件'
r.set('data-refinement-step','5')
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
print(out/'character.svg')
