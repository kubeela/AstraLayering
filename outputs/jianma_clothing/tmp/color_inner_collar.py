from color_common import *
D=Color('3.衣装线稿/line_ornaments/character.svg')
bodybase=D.grad('outfit_inner_body_base',342,0,548,0,[(0,'#BECDE6'),(.17,'#E2EAF6'),(.34,'#F2F7FB'),(.47,'#EAF0FA'),(.59,'#F9FBFD'),(.79,'#DFE7F7'),(1,'#BACBE6')])
D.setfill('inner_bodice_front_surface',bodybase)
backbase=D.grad('outfit_inner_back_base',350,0,540,0,[(0,'#B9CBE6'),(.26,'#E2EAF6'),(.55,'#EDF3FA'),(.82,'#D5E1F2'),(1,'#B5C8E3')])
D.setfill('inner_bodice_back_surface',backbase)
D.setfill('inner_bodice_side_right_surface',D.grad('outfit_inner_right_side',342,0,385,0,[(0,'#AEBFDD'),(.55,'#D4DFF0'),(1,'#EDF3FB')]))
D.setfill('inner_bodice_side_left_surface',D.grad('outfit_inner_left_side',507,0,548,0,[(0,'#E5EDF9'),(.48,'#D5E0F2'),(1,'#A7BEDD')]))
D.setfill('inner_bodice_lower_overlap',D.grad('outfit_inner_waist_hidden',0,548,0,608,[(0,'#EBF2FA'),(.65,'#E1EAF6'),(1,'#D1DDED')]))
mat=D.intrinsic('inner_bodice')
wide=D.radial('outfit_inner_chest_broad_light',440,440,100,77,[(0,'#FFFFFF',.76),(.65,'#F7FAFD',.23),(1,'#F2F7FB',0)])
path(mat,'inner_bodice_broad_chest_light','M 337 340 L 552 340 L 552 530 L 337 530 Z',wide)
foldpaint=D.grad('outfit_inner_fold_color',0,415,0,504,[(0,'#B6C7E3',.48),(.3,'#CDD8EF',.9),(.72,'#C1D0E9',.75),(1,'#DAE4F4',.25)])
for i,ds in enumerate([
 'M 411 411 C 405 440 410 466 401 498 L 408 497 C 416 468 414 440 418 414 Z',
 'M 424 428 C 419 451 428 480 431 493 L 435 498 C 429 474 428 448 430 429 Z',
 'M 440 424 C 438 450 440 477 443 498 L 451 497 C 445 475 444 451 446 424 Z',
 'M 469 413 C 479 441 470 470 480 498 L 487 501 C 478 470 486 440 477 413 Z']):path(mat,'inner_bodice_pleat_shadow_'+str(i),ds,foldpaint)
lightpaint=D.grad('outfit_inner_pleat_light',0,420,0,500,[(0,'#FFFFFF',.18),(.6,'#FFFFFF',.85),(1,'#F8FBFD',.45)])
for i,ds in enumerate([
 'M 416 417 C 414 445 415 472 410 496 L 414 497 C 419 469 420 441 421 416 Z',
 'M 436 427 C 433 450 435 478 440 498 L 443 498 C 439 473 440 449 441 427 Z',
 'M 456 424 C 459 450 454 476 452 496 L 456 497 C 460 474 465 448 461 421 Z']):path(mat,'inner_bodice_pleat_light_'+str(i),ds,lightpaint)
D.recolor_lines('inner_bodice','#A8B7D1','.62','.74');D.node('inner_bodice_neckline').set('stroke','#8595AF');D.node('inner_bodice_neckline').set('stroke-width','.7')
D.recolor_lines('inner_bodice_back','#A5B6D0','.6','.5')
D.mark('inner_bodice','上色：样本01 #F2F7FB 与02 #DFE7F7 作完整中面/冷折基准；宽面胸光、腰侧转暗、细纵褶、褶脊亮带分别独立。R1 已审开口及外轮廓完全不变；侧背和 y>550 腰下颜色由相同白绸推断，不沿皮肤胸线着色。')
D.mark('inner_bodice_back','背片不可见，采用样本01/02 同材料冷白延续，宽面与侧暗属保守推断。')

# Stiff collar surfaces carry their own crosswise roll and vertical light.
D.setfill('collar_back_outer_surface',D.grad('outfit_collar_back_base',0,250,0,324,[(0,'#D9E4F2'),(.34,'#E9F0F9'),(1,'#B8CBE4')]))
D.setfill('collar_back_inner_surface',D.grad('outfit_collar_back_inside',0,252,0,270,[(0,'#94AECF'),(.58,'#C7D7ED'),(1,'#DEE8F4')]))
D.recolor_lines('collar_back','#8294AE','.7','.75')
D.mark('collar_back','后领环外面由样本03亮领面延续；内面沿样本04 #C7D7ED 冷蓝推断，后背受光与颈后接触均无直接参考，不新增背面花纹。')
for side,mir in [('right',False),('left',True)]:
 part='collar_front_'+side;f=lambda d:mirror(d) if mir else d
 x1,x2=(444,506) if mir else (385,444)
 stops=[(0,'#C2D4EB'),(.2,'#F4F8FC'),(.43,'#FDFEFF'),(.69,'#E2E8F3'),(1,'#BBCFE8')]
 if mir:stops=[(1-p,c) for p,c in reversed(stops)]
 D.setfill(part+'_outer_surface',D.grad('outfit_'+part+'_base',x1,0,x2,0,stops))
 D.setfill(part+'_inner_surface',D.grad('outfit_'+part+'_inner',0,258,0,339,[(0,'#A5BBD9'),(.4,'#C7D7ED'),(.74,'#E5EDF7'),(1,'#B7CBE5')]))
 D.setfill(part+'_side_surface',D.grad('outfit_'+part+'_side',x1,270,x2,331,[(0,'#DBE7F6'),(.5,'#F4F8FC'),(1,'#C4D6EC')]))
 cm=D.intrinsic(part)
 path(cm,part+'_broad_fold_light',f('M 414 269 C 420 279 425 283 426 294 C 429 309 429 323 416 334 L 410 331 C 422 316 421 304 419 293 C 418 285 414 277 414 269 Z'),D.grad('outfit_'+part+'_roll_light',0,265,0,340,[(0,'#FFFFFF',.35),(.55,'#FFFFFF',.88),(1,'#EDF4FB',.2)]))
 path(cm,part+'_root_turn',f('M 408 307 C 402 321 395 325 385 330 L 399 336 C 410 331 416 325 421 316 Z'),D.grad('outfit_'+part+'_root_blue',0,305,0,343,[(0,'#C0D2EB',0),(.7,'#B9CEE8',.75),(1,'#D4E2F3',.55)]))
 D.node(part+'_outer_surface').set('stroke','#8493AA');D.node(part+'_outer_surface').set('stroke-width','.72')
 D.recolor_lines(part,'#A1B3CD','.62','.78')
 D.node(part+'_roll').set('stroke','#F7FBFF');D.node(part+'_roll').set('stroke-width','.95')
 D.mark(part,'立领样本03/04为底；横向挺布转面、纵向根部冷暗和弧形宽反光分别处理。外/内/侧面不透明，后根隐藏颜色沿材质推断，正式线条保留实际折角并以蓝灰融入。')
 D.shade('fx_outfit_'+part+'_on_inner_bodice',part+'_outer_surface',part,'inner_bodice_front_surface','inner_bodice','inner_top','inner_top',dx=.5,dy=2.4,alpha='.28',sigma='.85')

D.clip('inner_bodice_back','inner_bodice_back_surface')
D.shade('fx_outfit_collar_back_on_inner_bodice_back','collar_back_outer_surface','collar_back','inner_bodice_back_surface','inner_bodice_back','inner_top','inner_top',dx=0,dy=2.5,alpha='.24',sigma='1')

# Preserve the base effect while applying reversible outfit-specific occlusion.
mask=el('mask',id='outfit_inner_collar_neck_occlusion',maskUnits='userSpaceOnUse',x=0,y=0,width=941,height=1672,mask_type='luminance',data_outfit_id=OUTFIT,data_wear_layer='inner_top')
mask.append(el('rect',x=0,y=0,width=941,height=1672,fill='white'))
for side in ['left','right']:mask.append(el('path',d=D.node('collar_front_'+side+'_outer_surface').get('d'),fill='black',stroke='none',data_source_id='collar_front_'+side+'_outer_surface'))
D.defs.append(mask)
fx=D.node('fx_body5_face_on_neck');fx.set('mask','url(#outfit_inner_collar_neck_occlusion)');fx.set('data-outfit-occlusion-layer','inner_top')
D.dependency({'id':'fx_body5_face_on_neck','type':'base_effect_outfit_occlusion','layers':['inner_top'],'source_id':'face_base','target_id':'neck','original_attributes':{'mask':None},'default_attributes':{'mask':'url(#outfit_inner_collar_neck_occlusion)'},'when_layer_disabled':'remove mask attribute; retain original face-to-neck effect and original body3_neck_surface_clip','mask_id':'outfit_inner_collar_neck_occlusion'})

# This task also asks for the chest-ornament receiver shadow. It is created once
# here; the ornament batch can reuse the same IDs after coloring its sources.
shadowset=group('inner_bodice_chest_ornament_shadows','inner_top','inner_bodice',desc='胸饰各真实内部来源在胸衣上的完整接触影，共同透明度避免人工叠黑；ornaments 或 inner_top 关闭时一并关闭。',opacity='.33',data_role='shared-opacity-shadow-set')
sources=['chest_ornament_right_silver_base','chest_ornament_left_silver_base','chest_ornament_right_lower_leaf','chest_ornament_left_lower_leaf','chest_ornament_center_socket']
for src in sources:D.shade('fx_outfit_'+src+'_on_inner_bodice',src,'chest_ornament','inner_bodice_front_surface','inner_bodice','inner_top','ornaments',dx=.6,dy=2.3,color='#91A5C8',alpha='1',sigma='.85',parent=shadowset)
D.node('inner_bodice').append(shadowset)
D.save_color('color_inner_collar')
