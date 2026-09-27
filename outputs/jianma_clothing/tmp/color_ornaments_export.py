from color_common import *
import math
D=Color('5.分批着色与成稿/color_skirt_outer/character.svg')

silver=D.grad('outfit_ornament_silver',0,306,0,464,[(0,'#DCEAF6'),(.15,'#F5FAFD'),(.31,'#8EA3BD'),(.46,'#E9EFF8'),(.6,'#FFFFFF'),(.71,'#768AA8'),(.87,'#DAE6F4'),(1,'#F4F8FC')])
D.setfill('chest_ornament_back_mount','#768CA9')
D.setfill('chest_ornament_neck_silver_mount',silver)
D.setfill('chest_ornament_neck_gem_wings',D.grad('outfit_chest_neck_blue',430,0,459,0,[(0,'#537FA8'),(.2,'#87BDE0'),(.42,'#C8E4F3'),(.56,'#689FCC'),(.79,'#A5D2E9'),(1,'#557FA8')]))
D.setfill('chest_ornament_neck_gem',D.grad('outfit_chest_neck_gem',438,320,450,341,[(0,'#DBF3FA'),(.25,'#6BB6DF'),(.5,'#BDE7F3'),(.52,'#5996C3'),(1,'#A7D9EE')]))
D.setfill('chest_ornament_upper_drop',D.grad('outfit_chest_neck_drop',440,348,448,361,[(0,'#EAF9FC'),(.44,'#B9DEF0'),(.52,'#6FADDA'),(1,'#A1CBE6')]))

for side,mir in [('right',False),('left',True)]:
 xx=lambda x:888-x if mir else x
 f=lambda ds:mirror(ds,444) if mir else ds
 p='chest_ornament_'+side
 D.setfill(p+'_silver_base',silver)
 D.setfill(p+'_wing_side',D.grad('outfit_'+p+'_wing_side',0,352,0,424,[(0,'#7D9BB9'),(.4,'#B6CEE3'),(.71,'#7695B5'),(.88,'#527596'),(1,'#454E64')]))
 D.setfill(p+'_wing_face',D.grad('outfit_'+p+'_enamel',xx(377),362,xx(431),414,[(0,'#B4D4EC'),(.23,'#D6E8F4'),(.47,'#C5D9EF'),(.7,'#91B7D8'),(.85,'#BBD4E9'),(1,'#7699BD')]))
 D.setfill(p+'_lower_leaf',D.grad('outfit_'+p+'_lower_leaf',xx(391),431,xx(419),465,[(0,'#AFC2D9'),(.23,'#E9EFF8'),(.47,'#FAFCFF'),(.59,'#A5B7CE'),(.8,'#D7E4F2'),(1,'#F2F8FC')]))
 for suffix in ['_silver_base','_wing_side','_lower_leaf']:
  D.node(p+suffix).set('stroke','#6D86A4');D.node(p+suffix).set('stroke-width','.63')
 for suffix,col,w in [('_wing_scroll','#F1F9FE','.9'),('_silver_scroll','#6383A7','1.65'),('_silver_scroll_light','#F7FAFD','.85'),('_pearl_rim','#DBECF8','.95')]:
  D.node(p+suffix).set('stroke',col);D.node(p+suffix).set('stroke-width',w)
 for j in range(3):
  n=D.node(p+'_rim_pearl_'+str(j));n.set('fill',D.radial('outfit_'+p+'_pearl_'+str(j),float(n.get('cx'))-.6,float(n.get('cy'))-.8,3,3.2,[(0,'#FFFFFF'),(.4,'#E8F3FC'),(1,'#93AECF')]))
  n.set('stroke','#A7BFD9');n.set('stroke-width','.35')
 # Small polished rim fragments are clipped to their real silver surfaces.
 cp=el('clipPath',id=p+'_silver_highlight_clip',clipPathUnits='userSpaceOnUse')
 for sid in [p+'_silver_base',p+'_lower_leaf']:cp.append(el('use',href='#'+sid,clip_rule='evenodd'))
 D.defs.append(cp)
 hi=el('g',id=p+'_silver_highlight',data_part='chest_ornament',data_kind='physics_details',data_outfit_id=OUTFIT,data_wear_layer='ornaments',data_effect='highlight',data_target_part='chest_ornament',data_target_id=p+'_silver_base',clip_path='url(#'+p+'_silver_highlight_clip)')
 path(hi,p+'_silver_highlight_edge',f('M 383 426 C 394 427 399 416 407 417 M 413 425 C 416 434 423 438 429 431 M 398 440 C 401 447 398 457 395 462'),'none','#FFFFFF','.73','polished-silver-reflection')
 D.node('chest_ornament_wing_'+side).append(hi)

D.setfill('chest_ornament_center_socket',D.grad('outfit_chest_center_socket',429,0,459,0,[(0,'#536C8D'),(.2,'#BFD7EB'),(.4,'#EAF6FC'),(.55,'#8DA9C5'),(.72,'#D8EBF5'),(1,'#526E91')]))
D.setfill('chest_ornament_center_gem',D.grad('outfit_chest_center_gem',436,0,452,0,[(0,'#397EB1'),(.23,'#73BDE3'),(.47,'#EAF9FC'),(.52,'#C9EFF7'),(.75,'#7BC7E8'),(1,'#3376A5')]))
D.setfill('chest_ornament_center_gem_facet','#EAF9FC')
D.node('chest_ornament_center_gem_edge').set('stroke','#CAE9F7');D.node('chest_ornament_center_gem_edge').set('stroke-width','.6')
for i in ['chest_ornament_neck_silver_mount','chest_ornament_neck_gem','chest_ornament_neck_gem_wings','chest_ornament_upper_drop','chest_ornament_center_socket','chest_ornament_center_gem']:
 D.node(i).set('stroke','#6689AB');D.node(i).set('stroke-width','.6')
D.mark('chest_ornament','38蓝釉中面、39小面积冷暗、40银边与41青蓝亮石分层；银饰宽面反射与宝石硬切面不同，珍珠和高光小而有实体裁切。首批既有五条胸饰→胸衣投影原 id 继续使用，不叠新影。')

metal=D.grad('outfit_pendant_silver',420,0,460,0,[(0,'#657B9C'),(.22,'#CFDFEF'),(.38,'#F7FAFD'),(.53,'#9AAFC9'),(.67,'#EDF5FC'),(.84,'#B3C6DF'),(1,'#607895')])
D.setfill('pendant_anchor_hanging_tape',D.grad('outfit_pendant_hanging_tape',436,0,446,0,[(0,'#91B7D8'),(.32,'#E4F1FA'),(.54,'#FFFFFF'),(1,'#A9C6E0')]))
for i in ['pendant_anchor_waist_mount','pendant_anchor_flower_face','pendant_chain_leaf_mount']:
 D.setfill(i,metal);D.node(i).set('stroke','#7289A8');D.node(i).set('stroke-width','.55')
D.setfill('pendant_anchor_back_hook','#6783A3');D.setfill('pendant_anchor_flower_side','#5D7899')
D.node('pendant_anchor_flower_side').set('stroke','#586F8F');D.node('pendant_anchor_flower_side').set('stroke-width','.7')
D.setfill('pendant_anchor_flower_core',D.grad('outfit_pendant_flower_core',432,682,444,699,[(0,'#6A93B5'),(.25,'#E4F5FB'),(.5,'#B6D8E9'),(.53,'#7AA9C7'),(1,'#D3ECF5')]))
D.node('pendant_anchor_bottom_eye').set('stroke','#A1BCD4')
D.recolor_lines('pendant_anchor','#7893AF','.55','.9')
D.mark('pendant_anchor','固定带为细白蓝织带，硬花座与背扣为灰银；以42银链同族色及40银边材料铺完整背/侧面。花瓣实体沿原几何保留，亮暗由金属反射区分。')

D.node('pendant_chain_complete_core').set('stroke','#69799B');D.node('pendant_chain_complete_core').set('stroke-width','1.2')
D.node('pendant_chain_edge').set('stroke','#E8F4FB');D.node('pendant_chain_edge').set('stroke-width','.45')
for n in D.node('pendant_chain').iter():
 i=n.get('id','')
 if n.tag.endswith('ellipse'):
  x,y=float(n.get('cx')),float(n.get('cy'));r=max(float(n.get('rx')),float(n.get('ry')))
  n.set('fill',D.radial('outfit_'+i+'_metal',x-.8,y-1,r*1.25,r*1.3,[(0,'#FAFDFF'),(.32,'#D5E8F5'),(.66,'#A7C3DE'),(1,'#617B9F')]))
  n.set('stroke','#7C96B3');n.set('stroke-width','.45')
 if '_side_cord_' in i and not 'edge_' in i and n.tag.endswith('path'):n.set('stroke','#E7F3FB');n.set('stroke-width','1.3')
 if '_side_cord_edge_' in i:n.set('stroke','#92B0CD');n.set('stroke-width','.32')
D.mark('pendant_chain','细软银链42灰银线与逐段珠光分开，完整芯线在花座后连续；两侧软绳为白银织线，阴影用完整开放路径描边而非无面积填色。')

for i in ['pendant_beads_upper_drop_socket','pendant_beads_bottom_connector']:
 D.setfill(i,metal);D.node(i).set('stroke','#607C9E');D.node(i).set('stroke-width','.65')
D.setfill('pendant_beads_upper_drop_gem',D.grad('outfit_pendant_drop_blue',430,838,446,871,[(0,'#7FA9CE'),(.22,'#DDF2FA'),(.55,'#B7D8EC'),(.8,'#8AB5D8'),(1,'#EAF7FC')]))
D.setfill('pendant_beads_upper_drop_facet','#F5FCFF')
for j,(y,r) in enumerate([(896,19),(933,16),(966,15)],1):
 p='pendant_beads_sphere_'+str(j)
 D.setfill(p+'_back',D.radial('outfit_'+p+'_back',433,y-7,r*1.38,r*1.38,[(0,'#C1D9EC'),(.45,'#849CC7'),(.78,'#45558A'),(1,'#364A7E')]))
 D.setfill(p+'_front',D.radial('outfit_'+p+'_front',432,y-8,r*1.38,r*1.32,[(0,'#D4EAF5'),(.17,'#B7CDE8'),(.37,'#6589C3'),(.64,'#4D67AB'),(.86,'#45558A'),(1,'#6684B8')]))
 D.setfill(p+'_side',D.grad('outfit_'+p+'_side',439,y-r,454,y+r,[(0,'#96B8DC'),(.4,'#516AA4'),(.75,'#405487'),(1,'#6E8EBA')]))
 D.setfill(p+'_clasp',metal);D.setfill(p+'_hole','#CDDFEF')
 for suffix in ['_back','_front','_clasp','_hole']:
  D.node(p+suffix).set('stroke','#647FA4');D.node(p+suffix).set('stroke-width','.52')
 cp=el('clipPath',id=p+'_highlight_clip',clipPathUnits='userSpaceOnUse');cp.append(el('use',href='#'+p+'_front'));D.defs.append(cp)
 hi=el('g',id=p+'_highlight',data_part='pendant_beads',data_kind='physics_details',data_outfit_id=OUTFIT,data_wear_layer='ornaments',data_effect='highlight',data_target_part='pendant_beads',data_target_id=p+'_front',clip_path='url(#'+p+'_highlight_clip)')
 hi.append(el('ellipse',id=p+'_catchlight',cx=432,cy=y-8,rx=2.5 if j==1 else 2.1,ry=4.5 if j==1 else 3.5,fill='#F5FBFF',opacity='.9',transform=f'rotate(28 432 {y-8})'))
 path(hi,p+'_lower_reflection',f'M {438-r+3} {y+1} Q {438-r+1} {y+8} {438-r+8} {y+r-4}','none','#A6CCE6','1.45','gem-reflection',stroke_opacity='.78')
 D.node(p).append(hi)
for n in D.node('pendant_beads'):
 if n.tag.endswith('ellipse'):
  n.set('fill',metal);n.set('stroke','#718CAC');n.set('stroke-width','.45')
D.mark('pendant_beads','43深蓝硬珠与44亮蓝面分离；球体有冷暗包边、渐变体积、细银夹托和裁于真球面的少量反射，滴形石保持浅青透亮而不整体降 alpha。三个球体仍各自可控。')

D.setfill('pendant_tassel_back_root','#657BA4')
D.setfill('pendant_tassel_translucent_bundle',D.grad('outfit_pendant_tassel_bundle',407,0,454,0,[(0,'#ADB8D2'),(.28,'#EEF3FC'),(.52,'#F7F9FE'),(.74,'#B9C5DE'),(1,'#D6E0F0')]))
D.node('pendant_tassel_translucent_bundle').set('opacity','.38')
for j in range(21):
 n=D.node('pendant_tassel_thread_'+str(j));n.set('stroke',['#F7F9FE','#D7E0F2','#F9FBFF','#AAB9D7','#F1F5FC'][j%5]);n.set('stroke-width','1.15' if j%3==0 else '.65');n.set('stroke-opacity','.92' if j%5!=3 else '.8')
for side in ['right','left']:
 D.setfill('pendant_tassel_knot_'+side,D.grad('outfit_pendant_tassel_knot_'+side,0,992,0,1014,[(0,'#AFCDE4'),(.28,'#9DBCD9'),(.62,'#7483AF'),(1,'#637CA6')]))
 D.node('pendant_tassel_knot_'+side).set('stroke','#647BA0');D.node('pendant_tassel_knot_'+side).set('stroke-width','.55')
D.setfill('pendant_tassel_knot_center',D.grad('outfit_pendant_tassel_knot_center',433,0,442,0,[(0,'#819FC3'),(.39,'#DBEBF5'),(.64,'#BCD6E9'),(1,'#7483AF')]))
D.node('pendant_tassel_knot_center').set('stroke','#7286AA');D.node('pendant_tassel_knot_center').set('stroke-width','.5')
D.mark('pendant_tassel','45蓝结头与46冷白丝束分控；浅束底只补丝束密度，21根独立丝线保留缝隙和不同长短，冷紫蓝细暗线避免整片白塑料。完整丝源用于很淡的布面投影。')

def shadow(i,src,srcpart,receiver,alpha='.23',dx=.85,dy=1.7,sigma='.65',parent=None):
 target=receiver+'_surface' if receiver!='waist_front' else 'waist_front_surface'
 source=D.node(src)
 if source.tag.endswith('path'):
  sh=D.shade(i,src,srcpart,target,receiver,'waist' if receiver=='waist_front' else 'skirts','ornaments',dx=dx,dy=dy,color='#7188B4',alpha=alpha,sigma=sigma,parent=parent)
 else:
  cache=copy.deepcopy(source);cache.set('id',i+'_complete_projection');cache.set('transform',f'translate({dx} {dy})');cache.set('fill','#7188B4');cache.set('stroke','none');cache.set('data-role','complete-projection-geometry');cache.set('data-source-id',src);D.defs.append(cache)
  sh=el('g',id=i,data_part=receiver,data_kind='clothing',data_effect='cast-shadow',data_source_part=srcpart,data_source_id=src,data_target_part=receiver,data_target_id=target,data_outfit_id=OUTFIT,data_wear_layer='skirts',data_source_layer='ornaments',data_target_layer='skirts',data_complete_path=cache.get('id'),clip_path='url(#'+receiver+'_surface_clip)',opacity=alpha)
  sh.append(el('use',id=i+'_paint',href='#'+cache.get('id'),filter=D.blur(i+'_soft',sigma)));(parent if parent is not None else D.node(receiver)).append(sh)
 if source.get('fill')=='none':
  u=sh.find('{'+NS+'}use');u.set('fill','none');u.set('stroke','#7188B4');u.set('stroke-width',source.get('stroke-width','1'));u.set('stroke-linecap','round')
 return sh

# Reuse the first batch's exact five chest receiver relationships.
for s in ['right_silver_base','left_silver_base','right_lower_leaf','left_lower_leaf','center_socket']:
 assert D.node('fx_outfit_chest_ornament_'+s+'_on_inner_bodice').get('data-source-id')=='chest_ornament_'+s
shadow('fx_outfit_pendant_anchor_waist_mount_on_waist_front','pendant_anchor_waist_mount','pendant_anchor','waist_front',alpha='.2',dy=1.3)
for src in ['pendant_anchor_hanging_tape','pendant_anchor_flower_side']:
 shadow('fx_outfit_'+src+'_on_skirt_blue_front',src,'pendant_anchor','skirt_blue_front',alpha='.24' if 'flower' in src else '.16',dy=2)
for recv in ['waist_front','skirt_blue_front']:
 shadow('fx_outfit_pendant_chain_on_'+recv,'pendant_chain_complete_core','pendant_chain',recv,alpha='.22',dx=1.1,dy=1.2,sigma='.5')
for src in ['pendant_beads_upper_drop_socket']+['pendant_beads_sphere_'+str(j)+'_back' for j in [1,2,3]]:
 shadow('fx_outfit_'+src+'_on_skirt_blue_front',src,'pendant_beads','skirt_blue_front',alpha='.24',dx=1.5,dy=2.1,sigma='.95')
tg=group('fx_outfit_pendant_tassel_on_skirt_blue_front_composite','skirts','skirt_blue_front',opacity='.13',data_role='shared-source-shadow-composite');D.node('skirt_blue_front').append(tg)
for j in range(21):
 src='pendant_tassel_thread_'+str(j);shadow('fx_outfit_'+src+'_on_skirt_blue_front',src,'pendant_tassel','skirt_blue_front',alpha='1',dx=1.2,dy=1.5,sigma='.55',parent=tg)

# Foot chains remain base-owned and retain their existing material and shadows.
base=E.parse(r'D:\Resources\workspace\AstraLayering\outputs\jianma_v4\refinement\groups\clothing\character.svg').getroot()
original={n.get('id'):n for n in base.iter() if n.get('id')}
for sid in ['foot_chain_right','foot_chain_left','foot_chain_right_2','foot_chain_left_2']+[f'fx_lower3_foot_chain_{s}_on_{r}' for s in ['left','right'] for r in ['calf','foot']]:
 node=D.node(sid);assert not node.get('data-outfit-id'),sid
 assert E.tostring(node)==E.tostring(original[sid]),sid+' base jewelry changed'
next(n for n in D.root if n.tag.endswith('title')).text='剑麻 · 蓝白衣装成稿 · 完整分层 SVG'
D.save_color('color_ornaments_export')
final=ROOT/'final';final.mkdir(exist_ok=True)
out=ROOT/'5.分批着色与成稿/color_ornaments_export/character.svg'
(final/'character.svg').write_bytes(out.read_bytes())
print(final/'character.svg')
