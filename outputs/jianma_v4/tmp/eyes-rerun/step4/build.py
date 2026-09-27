from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import json
root=Path('.')
src=root/'refinement/groups/eyes/3.关联部件校准/character.svg'
out=root/'refinement/groups/eyes/4.眼周肤色与局部层次';out.mkdir(parents=True,exist_ok=True)
tree=E.parse(str(src));svg=tree.getroot();NS=svg.nsmap[None];defs=svg.find('{'+NS+'}defs')
palette=json.loads((root/'refinement/groups/eyes/1.眼部色盘/palette.json').read_text(encoding='utf-8'));C={s['id']:s['hex'] for s in palette['samples']}
def el(tag,**a):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
def sub(p,tag,**a):n=el(tag,**a);p.append(n);return n
def title(p,t):sub(p,'title').text=t
def radial(id,cx,cy,rx,ry,color,stops):
 g=sub(defs,'radialGradient',id=id,gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for off,op in stops:sub(g,'stop',offset=off,stop_color=color,stop_opacity=op)
 return id
def field(p,id,cx,cy,rx,ry,color,stops):
 radial(id+'_color',cx,cy,rx,ry,color,stops)
 return sub(p,'ellipse',id=id,cx=cx,cy=cy,rx=rx,ry=ry,fill=f'url(#{id}_color)')
def xgradient(id,x1,x2,stops):
 g=sub(defs,'linearGradient',id=id,gradientUnits='userSpaceOnUse',x1=x1,y1=0,x2=x2,y2=0)
 for off,col,op in stops:sub(g,'stop',offset=off,stop_color=col,stop_opacity=op)
 return id
soft=sub(defs,'filter',id='eyes4_makeup_edge',x='-20%',y='-100%',width='140%',height='300%',color_interpolation_filters='sRGB')
sub(soft,'feGaussianBlur',stdDeviation='.4')
for part in ['eye_right','eye_left']:
 eye=svg.xpath('//*[@id=$id]',id=part)[0]
 skin=el('g',id=part+'_skin_volume',data_part=part,data_kind='eyes',data_role='skin-own-color-and-volume',clip_path='url(#face_clean_skin_clip)')
 title(skin,'眼眶皮肤自身冷暖与连续体积色；不含外来投影或独立高光')
 makeup=el('g',id=part+'_makeup',data_part=part,data_kind='eyes',data_role='eye-makeup',clip_path='url(#face_clean_skin_clip)')
 title(makeup,'按参考范围绘制的上眼缘棕玫瑰妆色与下眼缘晕色')
 eye.insert(1,skin);eye.insert(2,makeup)
 upper=sub(makeup,'g',id=part+'_upper_socket_makeup',data_part=part,data_kind='eyes')
 lower=sub(makeup,'g',id=part+'_lower_makeup',data_part=part,data_kind='eyes')
 if part=='eye_right':
  field(skin,part+'_upper_inner_warmth',425,191,10.5,5.0,'#F0D2D1',[(0,.82),(.4,.56),(.75,.16),(1,0)])
  field(skin,part+'_upper_skin_plane',416,188.5,8.3,2.25,C['15'],[(0,.8),(.65,.55),(1,0)])
  field(skin,part+'_lower_warm_plane',415.8,204.9,12,4.4,'#F0CDCA',[(0,.48),(.45,.27),(.8,.055),(1,0)])
  field(skin,part+'_inner_lower_plane',430,204.4,6.0,4.0,'#FEFAF8',[(0,.75),(.5,.4),(1,0)])
  grad=xgradient(part+'_upper_makeup_color',407,432,[(0,'#A97E7E',.98),(.32,'#CBA6A5',.95),(.5,'#D8B5B2',.95),(.67,'#CDA5A6',.95),(1,'#DAB5B4',.45)])
  sub(upper,'path',id=part+'_upper_makeup_shape',d='M 405.9,194.6 C 407.5,191.8 409.3,190.9 412.9,191.05 C 417,190.9 420,191 423,191.85 C 426.2,193.4 429.2,197.3 431.5,200.9 L 429.8,201.3 C 425.7,198 421.8,196 417.4,195 C 412.3,194 408.8,195.1 406.2,197.4 Z',fill=f'url(#{grad})',filter='url(#eyes4_makeup_edge)')
  field(lower,part+'_lower_soft_pigment',416,203.8,11.2,3.4,C['21'],[(0,.96),(.22,.89),(.5,.56),(.77,.19),(1,0)])
  field(lower,part+'_outer_lower_pigment',410.8,202.6,5.6,3.1,'#98686F',[(0,.72),(.36,.6),(.7,.27),(1,0)])
 else:
  field(skin,part+'_upper_inner_warmth',461.2,190.9,10.5,5.0,'#F0D3D0',[(0,.82),(.4,.57),(.75,.17),(1,0)])
  field(skin,part+'_upper_skin_plane',470.6,188.4,8.4,2.4,C['17'],[(0,.95),(.6,.6),(1,0)])
  field(skin,part+'_lower_warm_plane',475,205.5,9.6,5.0,'#E9B8B6',[(0,.41),(.4,.25),(.8,.065),(1,0)])
  field(skin,part+'_inner_lower_plane',461.1,204.5,6.6,4.1,'#FFFBFA',[(0,.86),(.5,.6),(1,0)])
  grad=xgradient(part+'_upper_makeup_color',455,482,[(0,'#DAB5B4',.45),(.34,'#D2A5A6',.86),(.55,'#CFABA9',.95),(.77,'#AC7B80',.98),(1,'#A57579',.99)])
  sub(upper,'path',id=part+'_upper_makeup_shape',d='M 455.5,200.4 C 459.1,196.5 463.6,193 467.4,191.35 C 472,190.6 477.4,190.6 480.6,192.8 L 483,198.9 C 480.2,196.4 477.4,195.6 472.8,195.2 C 466.1,195.05 461.5,197 457.1,201.5 Z',fill=f'url(#{grad})',filter='url(#eyes4_makeup_edge)')
  field(lower,part+'_lower_soft_pigment',470.1,203.5,7.2,2.4,C['21'],[(0,.96),(.36,.86),(.55,.4),(.78,.045),(1,0)])
  field(lower,part+'_outer_lower_pigment',474.8,203.95,6.4,3.5,C['22'],[(0,.98),(.23,.9),(.53,.52),(.79,.16),(1,0)])
svg.find('{'+NS+'}title').text='剑妈 · 完整分层稿 · eyes 第4步眼周肤色与局部层次'
svg.set('data-refinement-step','4')
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
print(out/'character.svg')
