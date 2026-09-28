from lxml import etree as E
from pathlib import Path
p=Path(r'C:/Users/22129/AppData/Local/Temp/astra-mouth-case-20260928')
r=E.parse(str(p/'base.svg')); ids={e.get('id'):e for e in r.getroot().iter() if e.get('id')}
def a(i,**kw):
 for k,v in kw.items(): ids[i].set(k.replace('_','-'),str(v))
def path(i,d): a(i,d=d)
def clip(i,d): ids[i][0].set('d',d)
# Original commissures at x430.60 / 456.78 and unequal Cupid peaks 438.80 / 448.15 stay identifiable.
upper='M 430.60,243.00 C 433.65,243.32 436.30,241.88 439.00,241.70 C 440.68,241.58 442.30,242.55 443.86,242.55 C 445.48,242.57 446.93,241.78 448.62,241.88 C 451.17,242.00 454.04,243.35 456.78,242.91'
lower='C 453.00,245.00 449.32,247.65 443.90,247.68 C 438.72,247.74 434.68,245.49 430.60,243.00'
aperture=upper+' '+lower+' Z'
up_lip='M 430.60,243.00 C 433.75,243.06 436.22,240.24 438.80,239.69 C 440.83,239.25 442.66,240.68 443.91,240.68 C 445.15,240.63 446.54,239.55 448.15,239.71 C 451.43,240.02 453.50,242.94 456.78,242.91 C 454.04,243.35 451.17,242.00 448.62,241.88 C 446.93,241.78 445.48,242.57 443.86,242.55 C 442.30,242.55 440.68,241.58 439.00,241.70 C 436.30,241.88 433.65,243.32 430.60,243.00 Z'
lo_lip='M 430.60,243.00 C 434.68,245.49 438.72,247.74 443.90,247.68 C 449.32,247.65 453.00,245.00 456.78,242.91 C 454.66,246.08 452.32,249.35 449.09,250.42 C 446.15,251.42 442.00,251.55 438.90,250.17 C 435.30,248.61 432.72,245.72 430.60,243.00 Z'
upskin='M 426.60,232.20 C 437.20,231.80 450.30,231.80 461.00,232.20 L 461.00,245.20 C 459.45,244.65 458.20,243.39 456.78,242.91 C 454.04,243.35 451.17,242.00 448.62,241.88 C 446.93,241.78 445.48,242.57 443.86,242.55 C 442.30,242.55 440.68,241.58 439.00,241.70 C 436.30,241.88 433.65,243.32 430.60,243.00 C 429.40,243.60 428.05,244.55 426.60,245.20 Z'
loskin='M 426.60,240.75 C 428.40,241.90 429.70,242.82 430.60,243.00 C 434.68,245.49 438.72,247.74 443.90,247.68 C 449.32,247.65 453.00,245.00 456.78,242.91 C 458.15,242.70 459.45,241.60 461.00,240.75 L 461.00,259.00 C 450.00,260.00 438.00,260.00 426.60,259.00 Z'
path('mouth_inside_clip_geometry',aperture);a('mouth_inside',clip_path='url(#mouth_inside_complete_clip)')
for i in ['mouth_upper_lip_color_shape','mouth_upper_right_volume']: path(i,up_lip)
for i in ['mouth_lower_lip_color_shape','mouth_lower_left_volume']: path(i,lo_lip)
path('mouth_upper_skin_complete_shape',upskin);path('mouth_lower_skin_complete_shape',loskin)
for i,d in [('mouth3_upper_skin_surface',upskin),('mouth3_lower_skin_surface',loskin),('mouth3_upper_lip_surface',up_lip),('mouth3_lower_lip_surface',lo_lip)]:clip(i,d)
# Contact is now two continuous wet edges, rather than the closed double-wave seam.
upedge=upper+' C 454.04,243.52 451.18,242.27 448.60,242.16 C 446.95,242.08 445.47,242.84 443.86,242.82 C 442.29,242.82 440.68,241.88 439.01,241.98 C 436.30,242.15 433.66,243.51 430.60,243.00 Z'
loedge='M 430.60,243.00 C 434.68,245.49 438.72,247.74 443.90,247.68 C 449.32,247.65 453.00,245.00 456.78,242.91 C 453.05,245.30 449.30,247.90 443.90,247.93 C 438.71,247.99 434.50,245.62 430.60,243.00 Z'
for i in ['mouth_upper_line_shape','mouth_upper_contact_diffusion','mouth_upper_inner_edge_color_shape']:path(i,upedge)
for i in ['mouth_lower_line_shape','mouth_lower_contact_diffusion']:path(i,loedge)
a('mouth_upper_inner_edge_color_shape',stroke_width='0.6');a('mouth_upper_contact_diffusion',opacity='.26');a('mouth_lower_contact_diffusion',opacity='.23');a('mouth_lower_line_shape',opacity='.7')
a('mouth_teeth_upper',transform='translate(0 -0.1)')
# Same full tongue body retained; translation reflects relaxed lowering, with root and unseen volume intact.
a('mouth_tongue',transform='translate(0 0.7)')
# Keep aperture clip in root coordinates by transform geometry/gradient instead of clipping groups after transform.
for i,dy in [('mouth_teeth_upper',-.1),('mouth_tongue',.7)]:
 ids[i].attrib.pop('transform',None)
 for e in ids[i]:
  if e.tag.endswith('path'):e.set('transform',f'translate(0 {dy})')
a('mouth3_upper_lip_color',y1='239.3',y2='243.4')
a('mouth3_lower_lip_color',y1='245.9',y2='251.4')
a('mouth3_upper_right_volume',gradientTransform='translate(448.5 240.7) scale(4.8 1.8)')
a('mouth3_lower_left_volume',gradientTransform='translate(437.5 248.1) scale(4.1 2.1)')
a('mouth3_lower_light_color',gradientTransform='translate(444 249.5) scale(5.7 1.1)')
a('mouth3_lower_cast_color',gradientTransform='translate(444 253.1) scale(8.5 3.5)')
a('fx_mouth_lower_soft_light_complete_shape',transform='translate(0 3.05)')
a('fx_mouth_lower_on_skin_complete_shape',transform='translate(0 2.8)')
# Geometry is transformed above; user-space paint is moved with it, so cancel the extra gradient translation.
a('mouth3_lower_light_color',gradientTransform='translate(444 246.45) scale(5.7 1.1)')
a('mouth3_lower_cast_color',gradientTransform='translate(444 250.3) scale(8.5 3.5)')
a('mouth3_cavity_color',gradientTransform='translate(443.8 249.5) scale(15 11)')
a('mouth',data_neutral_pose='half-open',data_mouth_open='0.5',data_mouth_valence='0')
ids['mouth'].find('{http://www.w3.org/2000/svg}title').text='中性半张嘴 · mouth_open 0.5 / mouth_valence 0'
r.write(str(p/'d/character.svg'),encoding='utf-8',xml_declaration=True)
(p/'d/notes.txt').write_text('中性半张 mouth_open=0.5 / mouth_valence=0。\n以原 SVG 口角、左右略不等的唇峰与唇厚作对应，重排上下内外缘控制点；口腔用新内缘闭合裁切。原完整上下牙和舌体保留，口内结构只作深度对应的微移，没有增加第二块舌头。唇色坐标、下唇高光、柔影与皮肤边界随体积调整。\n已查看原角色、面部及风格板放大嘴部；一次局部/面部自查。静态单目标，未验证动态插值或参数绑定。参考板无完全同表情的中性半张，开口量与内部露出属于依据现有结构的推断。\n',encoding='utf-8')
print('Written character.svg; preserved full SVG and existing mouth IDs.')
