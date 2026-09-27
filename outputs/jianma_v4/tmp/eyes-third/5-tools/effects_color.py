import sys,json
from color_common import *
eye=sys.argv[1];left=eye=='eye_left';doc,source,out,tmp=start(eye,4)
box=(449,184,44,30) if left else (393,184,44,30);x0=box[0]
# This target clip follows the actual gaze group, while cast-shadow geometry remains outside it.
whiten=el('filter',id=eye+'_target_alpha_white',x='-10%',y='-10%',width='120%',height='120%',color_interpolation_filters='sRGB')
whiten.append(el('feColorMatrix',type='matrix',values='20 0 0 0 0  0 20 0 0 0  0 0 20 0 0  0 0 0 1 0'));adddef(doc,whiten)
clip=el('mask',id=eye+'_gaze_surface_mask',maskUnits='userSpaceOnUse',x=x0,y=184,width=44,height=30)
clip.append(el('use',href='#'+eye+'_gaze',fill='black',filter='url(#'+eye+'_target_alpha_white)'));adddef(doc,clip)
upper_grad=gradient(doc,eye+'_upper_cast_gradient',[(0,'#303448',.84),(.23,'#303448',.76),(.46,'#303448',.59),(.68,'#3C4058',.39),(1,'#3C4058',0)],x1=0,y1=194.5,x2=0,y2=199.1)
shadowd=f'M {x0},184 L {x0+44},184 L {x0+44},204 L {x0},204 Z'
adddef(doc,el('path',id=eye+'_upper_cast_full_geometry',d=shadowd))
lower_grad=gradient(doc,eye+'_lower_contact_gradient',[(0,'#66536F',0),(.40,'#66536F',.035),(1,'#66536F',.24)],x1=0,y1=201.7,x2=0,y2=204.0)
adddef(doc,el('path',id=eye+'_lower_contact_full_geometry',d=f'M {x0},201.7 L {x0+44},201.7 L {x0+44},208 L {x0},208 Z'))
def effect(suffix,sourceid,targetid,geometry,fill,iris=False):
 g=el('g',id=eye+'_'+suffix,data_effect='cast-shadow',data_source_part=eye,data_source_id=eye+'_'+sourceid,data_target_part=eye,data_target_id=eye+'_'+targetid,data_control_owner=eye+'_'+sourceid,clip_path='url(#'+eye+'_sclera_clip)')
 a=el('g',clip_path='url(#'+eye+'_aperture_clip)');g.append(a)
 if iris:
  b=el('g',mask='url(#'+eye+'_gaze_surface_mask)');a.append(b)
 else:b=a
 b.append(el('use',id=eye+'_'+suffix+'_surface',href='#'+eye+'_'+geometry,fill=fill,stroke='none'))
 return g
upper_sclera=effect('upper_lid_shadow_on_sclera','upper_lid','sclera','upper_cast_full_geometry',upper_grad)
upper_iris=effect('upper_lid_shadow_on_iris','upper_lid','eyeball','upper_cast_full_geometry',upper_grad,True)
lower_iris=effect('lower_lid_contact_on_iris','lower_lid','eyeball','lower_contact_full_geometry',lower_grad,True)
parent=node(doc,eye);parent.insert(list(parent).index(node(doc,eye+'_interior')),upper_sclera)
parent.insert(list(parent).index(node(doc,eye+'_upper_lid')),upper_iris);parent.insert(list(parent).index(node(doc,eye+'_upper_lid')),lower_iris)
hi=node(doc,eye+'_highlight');hi.set('data-effect','highlight');hi.set('data-target-part',eye);hi.set('data-target-id',eye+'_eyeball');hi.set('data-control-owner',eye+'_gaze')
hgrad=radial(doc,eye+'_highlight_light',[(0,'#E2E5EF',1),(.52,'#D8DEEB',1),(.85,'#CBD4E3',.94),(1,'#BBCADB',.80)],468.65 if left else 418.9,196.65 if left else 196.95,.9,1.0)
node(doc,eye).set('fill',hgrad)
node(doc,eye+'_highlight_surface').set('fill','inherit')
f=el('filter',id=eye+'_highlight_soft',x='-60%',y='-60%',width='220%',height='220%',color_interpolation_filters='sRGB');f.append(el('feGaussianBlur',stdDeviation='.22'));adddef(doc,f)
node(doc,eye+'_highlight_surface').set('filter','url(#'+eye+'_highlight_soft)')
effect_ids=[eye+'_upper_lid_shadow_on_sclera',eye+'_upper_lid_shadow_on_iris',eye+'_lower_lid_contact_on_iris',eye+'_highlight']
notes=f'''新增三组独立外来效果，完整投影底形保存在 defs，显示由承影面裁切决定：

| 效果 id | 来源 / source-id | 目标 / target-id | 跟随和裁切 |
| --- | --- | --- | --- |
| `{eye}_upper_lid_shadow_on_sclera` | 当前眼 / `{eye}_upper_lid` | 当前眼 / `{eye}_sclera` | 位于 gaze 之外，随上睑职责；眼白 + 固定眼裂双裁切，眼内在前方遮住该层 |
| `{eye}_upper_lid_shadow_on_iris` | 当前眼 / `{eye}_upper_lid` | 当前眼 / `{eye}_eyeball` | 同一完整上睑暗带源，位于 gaze 之外；再用引用实际 gaze 的 `{eye}_gaze_surface_mask` 限制承影区域 |
| `{eye}_lower_lid_contact_on_iris` | 当前眼 / `{eye}_lower_lid` | 当前眼 / `{eye}_eyeball` | 较轻的下缘接触暗化，同样在 gaze 之外，裁入实际眼内承影范围 |
| `{eye}_highlight` | 独立反光 | 当前眼 / `{eye}_eyeball` | 原有独立形状留在 `{eye}_gaze`，随视线，使用原眼白/眼裂裁切 |

投影组均带 `data-effect="cast-shadow"`、source/target part 及内部 id；高光带 `data-effect="highlight"` 和目标字段。字段引用逐项解析。眼白与眼黑分别承影，上睑影没有焊入随 gaze 移动的虹膜颜色。承影 clip 引用实际 gaze，副本移动眼珠时投影几何保持世界坐标，承影区域随实际眼珠变化。

原图上缘约 y195–198 有深蓝灰暗带，按固定 y 梯度向下衰减；下缘只加很轻的冷紫接触暗化，不画成新硬环。5.2 自身蓝色渐变、5.3 眼周妆色继续独立。两侧真实前发投影已由 `fx_hair_front_{'left' if left else 'right'}_on_face` 及其真实发形引用承担，本步保留，未再画重叠发影。

高光只使用已审的一枚轮廓，颜色、低幅柔边和强度按源像素调整，没有添加点状反光、亮圈或眼角碎点。高光填色继承本眼外层的高光渐变；其他部件各有明确填色。承影 mask 引用实际 gaze 时继承黑色，高光因而在承影 mask 中排除，避免把独立角膜反光也压成阴影。其余眼内颜色经 mask 滤镜转白形成目标覆盖；此结构仍只引用同一 gaze，不复制高光几何。静态关系及 controller 标注不代表完成动态绑定。

额外证据：`effects-off.png` 关闭本眼投影和高光检查完整底形；`gaze-offset.png` 检查本色/高光跟随眼珠而投影几何不动；`lash-controller-moved.png` 和 `lash-source-edited.png` 验证彩色正式前后睫毛仍同源；`approved-line-art-direct-30x.png` 与着色稿同坐标叠加，另有 `approved-color-blend50.png`。原有眼角、下缘转折、虹膜及睫毛源的所有几何属性精确保持已审值。
'''
report=finish(doc,source,out,tmp,eye,4,{'notes':notes,'effect_ids':effect_ids,'reused_hair_shadow':'fx_hair_front_'+('left' if left else 'right')+'_on_face'})
def off(d):
 for i in effect_ids:node(d,i).set('display','none')
local(doc,tmp/'effects-off.svg',box,30,off)
local(doc,tmp/'gaze-offset.svg',(390,175,109,47),12,lambda d:node(d,eye+'_gaze').set('transform','translate(2 0)'))
local(doc,tmp/'lash-controller-moved.svg',(390,175,109,47),12,lambda d:node(d,eye+'_upper_lash_outer_controller').set('transform','translate(.8 .35)'))
def change(d):
 x=node(d,eye+'_upper_lash_outer_geometry');old,new=('481.77,198.2','481.77,198.75') if left else ('405.48,196.15','405.48,195.65');x.set('d',x.get('d').replace(old,new))
local(doc,tmp/'lash-source-edited.svg',(390,175,109,47),12,change)
local(parse(APPROVED),tmp/'approved-line-art-direct-30x.svg',box,30)
print(json.dumps({k:v for k,v in report.items() if k!='details'},ensure_ascii=False,indent=2))
