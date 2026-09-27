import sys,json
from color_common import *
eye=sys.argv[1];left=eye=='eye_left';doc,source,out,tmp=start(eye,3);x0=449 if left else 393
# Keep the approved lid surface, using the face's established clean skin field to remove its flat placeholder seam.
node(doc,eye+'_upper_lid_surface').set('fill','url(#face_clean_skin_base)')
mask=el('mask',id=eye+'_periocular_skin_mask',maskUnits='userSpaceOnUse',x=x0,y=184,width=44,height=31,**{'mask-type':'luminance'})
mask.append(el('rect',x=x0,y=184,width=44,height=31,fill='white'))
for suffix in ['aperture_geometry','upper_lid_contour','lower_lid_contour']:mask.append(el('use',href='#'+eye+'_'+suffix,fill='black',stroke='none'))
adddef(doc,mask)
f=el('filter',id=eye+'_skin_diffusion',x='-40%',y='-150%',width='180%',height='400%',color_interpolation_filters='sRGB');f.append(el('feGaussianBlur',stdDeviation='.65'));adddef(doc,f)
upper=gradient(doc,eye+'_upper_skin_pigment',[(0,'#D8B5B4',0),(.35,'#D8B5B4',.42),(.70,'#CA989D',.65),(1,'#CA989D',.2)],x1=0,y1=189.2,x2=0,y2=196.2)
lower=radial(doc,eye+'_lower_warm_diffusion',[(0,'#DAA9A8' if left else '#D6AAA9',.92),(.35,'#DAA9A8' if left else '#D6AAA9',.62),(.7,'#DAA9A8' if left else '#D6AAA9',.18),(1,'#DAA9A8' if left else '#D6AAA9',0)],474.5 if left else 411.1,204.5,10.5 if left else 9.3,4.0)
corner=radial(doc,eye+'_inner_corner_warmth',[(0,'#C4858D',.28),(.5,'#C4858D',.13),(1,'#C4858D',0)],456.8 if left else 429.2,200.6 if left else 201.0,3.5,3.0)
g=el('g',id=eye+'_periocular_skin',data_eye_component='periocular-skin',data_control_owner=eye,data_part=eye,data_kind='eyes',clip_path='url(#face_clean_skin_clip)',mask='url(#'+eye+'_periocular_skin_mask)')
if left:upperd='M 455.8,199.4 C 458,194.1 463.1,190.3 468.8,190.1 C 474.5,189.8 479.2,191.7 482.2,194.4 L 481.7,196.8 C 476,192.8 468.4,192.0 462,195.2 C 459.3,196.6 457.4,198.3 455.8,199.4 Z'
else:upperd='M 405.7,196.1 C 409.1,191.0 414.2,189.8 419.7,191.0 C 424.8,192.0 428.6,195.8 431.0,200.8 L 428.7,199.7 C 423.8,194.9 418.7,192.6 414.0,193.0 C 410.6,193.3 408.1,194.5 405.7,196.1 Z'
g.append(el('path',id=eye+'_upper_skin_form',d=upperd,fill=upper,filter='url(#'+eye+'_skin_diffusion)',data_role='skin-fold-and-local-pigment'))
g.append(el('ellipse',id=eye+'_lower_skin_warmth',cx=474.5 if left else 411.1,cy=204.5,rx=10.5 if left else 9.3,ry=4.0,fill=lower,data_role='local-warm-pigment'))
g.append(el('ellipse',id=eye+'_nasal_skin_warmth',cx=456.8 if left else 429.2,cy=200.6 if left else 201,rx=3.5,ry=3,fill=corner,data_role='corner-skin-color'))
parent=node(doc,eye);parent.insert(list(parent).index(node(doc,eye+'_upper_lashes')),g)
# Source liner is softer and warmer toward the nose; its reviewed filled contour remains exact.
line=gradient(doc,eye+'_lower_lid_color_transition',[(0,'#C29C9D',1),(.35,'#B18187',1),(.76,'#8A4F56' if left else '#8B525B',1),(1,'#80505D',1)],x1=455.75 if left else 430.65,y1=0,x2=482.2 if left else 406.25,y2=0)
node(doc,eye+'_lower_lid_contour').set('fill',line)
notes=f'''新增 `{eye}_periocular_skin`，归当前眼眶/眼皮控制，不挂在 gaze。它包含上眼皮局部暖色、下缘偏外侧暖红晕及内眼角轻暖色三件独立色形。上方使用原图褶皱附近 `#D8B5B4` 与暖色混合，下方以色盘第 {'23' if left else '24'} 项为依据。原图外侧较浓、鼻侧较轻，因此没有整眼均匀一圈模糊或新增眼袋暗线。

`{eye}_periocular_skin_mask` 保留皮肤范围，排除本眼眼裂和正式上下眼线；外层再裁入 `face_clean_skin_clip`。效果无法涂进眼白、虹膜或遮盖下眼缘转折。短褶皱保留原层序，以皮肤暖色柔和融合，避免反向挖出白线。实际发层自然位于其前方。

已审上睑遮挡面改用已存在的 `face_clean_skin_base` 颜色场，与干净脸底衔接，几何、裁切不改。正式下眼线保留原填充轮廓，颜色由鼻侧浅暖渐变到外侧红褐，没有额外黑框。原有 face 干净肤色、红晕、前发投影均未重画。

头发/上眼睑对眼内的外来暗带留给 5.4。当前眼周暖色按皮肤/妆色分层，低清原图不支持更细的独立妆纹；没有采用生成板的泪痣或闪粉。`periocular-off.png` 关闭本步新增色形；`eyes-hidden-face.png` 隐藏两眼 data-part（含跨层及皮肤组），验证脸底不留重复眼睛。它们和同坐标对照用于确认图层归属。
'''
report=finish(doc,source,out,tmp,eye,3,{'notes':notes,'skin_effect_group':eye+'_periocular_skin','skin_mask':eye+'_periocular_skin_mask','added_shading_shapes':[eye+'_upper_skin_form',eye+'_lower_skin_warmth',eye+'_nasal_skin_warmth']})
box=tuple(report['box']);local(doc,tmp/'periocular-off.svg',box,30,lambda d:node(d,eye+'_periocular_skin').set('display','none'))
def hidden(d):
 for x in d.xpath('//*[@data-kind="eyes"]'):x.set('display','none')
local(doc,tmp/'eyes-hidden-face.svg',(390,175,109,62),12,hidden)
print(json.dumps({k:v for k,v in report.items() if k!='details'},ensure_ascii=False,indent=2))
