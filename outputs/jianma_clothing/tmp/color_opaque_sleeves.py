from color_common import *
D=Color('5.分批着色与成稿/color_mantle_coat/character.svg')

for side,mir in [('right',False),('left',True)]:
 f=lambda d:mirror(d) if mir else d
 xx=lambda x:889-x if mir else x
 up='opaque_upper_'+side;lo='opaque_lower_'+side
 # Full backs and sleeve facings retain the same cloth, including hidden roots.
 for p in [up,lo]:
  D.setfill(p+'_back_surface',D.grad('outfit_'+p+'_back_base',xx(250),570,xx(342),596,[(0,'#D5E2F3'),(.3,'#E9F0F9'),(.68,'#E1EAF6'),(1,'#BACDE8')]))
  D.mark(p+'_back','完整背袖以09/10白绸及保守背面冷蓝延续；被手臂遮住的根部同样铺满，不以当前露出边条代替后片。隐藏照明为推断。')
 D.setfill(lo+'_cuff_back_surface',D.grad('outfit_'+lo+'_cuff_back',0,735,0,784,[(0,'#D7E5F5'),(.5,'#A9BDDD'),(1,'#D7E4F3')]))
 D.recolor_lines(lo+'_back','#9FADC7','.65','.68')

 D.setfill(up+'_surface',D.grad('outfit_'+up+'_base',xx(287),433,xx(353),450,[(0,'#CADAF0'),(.18,'#E4EDFA'),(.45,'#FAFBFE'),(.72,'#F0F3F9'),(1,'#C8D8ED')]))
 D.setfill(up+'_side_surface',D.grad('outfit_'+up+'_side',xx(326),430,xx(359),435,[(0,'#DFE9F8'),(.5,'#C5D5EB'),(1,'#AFC1DD')]))
 D.recolor_lines(up,'#9CABC4','.65','.61')
 um=D.intrinsic(up)
 path(um,up+'_outer_plane_light',f('M 310 367 C 311 411 310 442 302 478 C 296 511 283 553 276 577 L 286 590 C 293 561 306 526 312 493 C 321 451 325 408 322 369 Z'),D.grad('outfit_'+up+'_outer_light',0,360,0,597,[(0,'#FFFFFF',.62),(.37,'#FFFFFF',.72),(.73,'#F7FBFF',.18),(1,'#D6E3F6',0)]))
 path(um,up+'_inner_drape_shadow',f('M 340 396 C 334 429 340 460 332 492 C 326 518 322 546 319 572 L 325 587 C 330 550 337 522 342 495 C 349 458 344 427 346 395 Z'),D.grad('outfit_'+up+'_inner_shadow',xx(326),0,xx(347),0,[(0,'#C2D3ED',0),(.45,'#AFC2E0',.67),(1,'#CBDDF2',.45)]))
 path(um,up+'_elbow_compressed_plane',f('M 275 530 C 291 542 305 544 322 538 C 312 548 293 549 278 542 Z M 270 549 C 282 562 300 566 315 559 C 303 573 284 568 268 561 Z'),D.grad('outfit_'+up+'_elbow_shade',0,529,0,574,[(0,'#C2D5EE',.15),(.42,'#AFBFDA',.7),(1,'#D4E2F3',.3)]))
 path(um,up+'_elbow_fold_light',f('M 276 536 C 290 548 306 549 318 544 M 271 553 C 281 564 296 568 311 563'),'none','#F7FAFF','1.5','material-fold-highlight',stroke_opacity='.84')
 path(um,up+'_soft_outer_edge',f('M 301 380 C 299 415 297 445 292 475 C 287 506 278 536 265 568'),'none','#F7FAFF','1.1','material-edge-highlight',stroke_opacity='.65')

 D.setfill(lo+'_surface',D.grad('outfit_'+lo+'_base',xx(246),650,xx(314),681,[(0,'#C6D9EF'),(.2,'#E4EDF9'),(.43,'#F0F3F9'),(.67,'#F8FAFD'),(1,'#CBDDF1')]))
 D.setfill(lo+'_side_surface',D.grad('outfit_'+lo+'_side',xx(268),656,xx(300),674,[(0,'#E4EDFA'),(.58,'#C6D7EE'),(1,'#AFC4E2')]))
 D.recolor_lines(lo,'#9FACBF','.62','.58')
 lm=D.intrinsic(lo)
 # Match the upper sleeve color at the hidden insertion root, then gradually
 # transition into the forearm's own directional lighting below the elbow.
 rootmask=el('mask',id='outfit_'+lo+'_root_blend',maskUnits='userSpaceOnUse',x=0,y=520,width=941,height=100)
 rootmask.append(el('rect',x=0,y=520,width=941,height=100,fill=D.grad('outfit_'+lo+'_root_blend_ramp',0,538,0,615,[(0,'#FFFFFF',1),(.24,'#FFFFFF',1),(.64,'#FFFFFF',.37),(1,'#FFFFFF',0)])))
 D.defs.append(rootmask)
 rg=el('g',id=lo+'_root_color_continuity',mask='url(#'+rootmask.get('id')+')',data_role='intrinsic-root-color-transition')
 path(rg,lo+'_root_continuity_base',D.node(lo+'_surface').get('d'),'url(#outfit_'+up+'_base)')
 path(rg,lo+'_root_continuity_side',D.node(up+'_side_surface').get('d'),'url(#outfit_'+up+'_side)')
 lm.append(rg)
 path(lm,lo+'_forearm_broad_silk_light',f('M 290 600 C 288 633 270 674 254 704 C 248 719 243 736 239 751 L 248 758 C 255 731 264 708 279 680 C 295 649 305 625 307 607 Z'),D.grad('outfit_'+lo+'_broad_light',0,594,0,764,[(0,'#FFFFFF',.18),(.2,'#FFFFFF',.77),(.63,'#FCFDFF',.65),(1,'#EFF6FE',.25)]))
 path(lm,lo+'_elbow_fold_planes',f('M 273 571 C 287 581 301 577 318 582 L 310 587 C 294 583 283 587 273 578 Z M 275 586 C 289 595 300 589 314 596 L 307 601 C 294 596 280 600 273 592 Z M 284 603 C 294 600 306 607 313 612 C 302 610 291 610 283 608 Z'),D.grad('outfit_'+lo+'_elbow_planes',0,570,0,615,[(0,'#AEBFDB',.68),(.42,'#C3D5ED',.59),(.82,'#AFC5E3',.48),(1,'#D7E4F5',.16)]))
 path(lm,lo+'_elbow_fold_highs',f('M 277 578 C 291 585 303 581 314 585 M 277 591 C 288 598 299 594 308 599 M 286 609 Q 298 607 308 614'),'none','#F9FCFF','1.25','material-fold-highlight',stroke_opacity='.82')
 path(lm,lo+'_wrist_gather_shadows',f('M 222 717 C 232 722 241 736 247 750 L 243 752 C 238 738 230 727 220 723 Z M 254 709 C 257 724 251 737 251 753 L 254 760 C 258 741 263 724 259 711 Z M 217 735 C 223 739 229 745 235 749 L 229 751 L 214 742 Z'),D.grad('outfit_'+lo+'_wrist_folds',0,711,0,766,[(0,'#B4C9E5',.15),(.54,'#B5CBE8',.74),(1,'#D8E5F5',.45)]))
 path(lm,lo+'_wrist_gather_lights',f('M 226 718 C 236 727 241 739 245 748 M 259 713 C 260 729 254 741 256 755 M 217 737 Q 226 744 233 746'),'none','#FAFCFF','1.2','material-fold-highlight',stroke_opacity='.87')
 path(lm,lo+'_outer_edge_silver',f('M 254 599 C 250 626 246 653 239 679 C 232 706 225 726 217 745'),'none','#F8FBFE','1.1','material-edge-highlight',stroke_opacity='.74')

 # The existing applique silhouette stays exact; relief lines follow each curl.
 for p in [up,lo]:
  app=D.node(p+'_scroll_applique')
  app.set('fill',D.grad('outfit_'+p+'_embroidery',xx(267),430,xx(318),740,[(0,'#F3F7FD'),(.23,'#D6E3F7'),(.48,'#ECF2FC'),(.72,'#D9E6F8'),(1,'#F6F9FE')]))
  app.set('stroke','#AEC0DC');app.set('stroke-width','.5');app.set('data-role','opaque-silver-blue-embroidery')
  # Embroidery and highlights follow material volume, without changing the outline.
  owner=D.node(p);owner.remove(app);owner.append(app)
  gleam=group(p+'_embroidery_gleam','sleeves',p,clip_path='url(#'+p+'_surface_clip)')
  if p==up:
   gd='M 309 458 C 302 444 310 431 319 436 C 326 441 324 453 319 466 M 306 480 C 307 486 313 489 319 491 M 303 509 C 314 518 327 511 331 500'
  else:
   gd='M 279 640 C 276 628 284 623 287 629 M 279 650 C 277 662 282 669 280 674 M 260 701 C 264 698 270 690 265 686 M 231 741 C 244 741 246 725 256 725'
  path(gleam,p+'_silver_thread_highlight',f(gd),'none','#F9FBFF','.8','embroidery-highlight',stroke_opacity='.92');owner.append(gleam)
  D.mark(p,'09白绸完整铺底，10冷蓝褶影沿臂部布量、肘压褶与腕部收束分别塑形；11银蓝绣纹保持原卷纹几何并添加顺纹细亮。隐藏侧面和连接内面采用相邻白绸保守延续，正式线柔化而接头不添封口描边。')

 cuff=lo+'_cuff_front'
 D.setfill(lo+'_cuff_front_surface',D.grad('outfit_'+lo+'_cuff_front',0,745,0,784,[(0,'#DCE8F7'),(.4,'#F8FAFE'),(.69,'#ECF2FB'),(1,'#C9D9EF')]))
 D.setfill(lo+'_cuff_inner_lip',D.grad('outfit_'+lo+'_cuff_lip',0,747,0,779,[(0,'#9EB3D4'),(.56,'#B4C6E0'),(1,'#D3E1F3')]))
 D.recolor_lines(cuff,'#A4B7D1','.6','.8')
 D.clip(cuff,lo+'_cuff_front_surface')
 cm=D.intrinsic(cuff)
 path(cm,lo+'_cuff_satin_rim',f('M 210 756 C 229 758 249 767 259 779'),'none','#FBFDFF','1.05','material-edge-highlight')
 D.mark(cuff,'前后袖口与内缘完整不透明着色，窄亮边依布厚塑形，内唇为冷蓝反折而非皮肤补片。')

 # Cross-part shadows use full source paths and the actual receiver clips.
 mp='mantle_front_'+side
 D.shade('fx_outfit_'+mp+'_on_'+up,mp+'_surface',mp,up+'_surface',up,'sleeves','shoulder_mantle',dx=.4 if mir else -.4,dy=2.6,color='#96ACCD',alpha='.35',sigma='.82')
 si='fx_outfit_'+up+'_on_'+lo
 sg=D.shade(si,up+'_surface',up,lo+'_surface',lo,'sleeves','sleeves',dx=.5 if mir else -.5,dy=2.3,color='#A7B2D8',alpha='.36',sigma='.7')
 # Occluded overlap is removed by the unshifted complete source. Only the
 # projected perimeter remains, preventing a dark slab across the elbow.
 mask=el('mask',id=si+'_contact_visibility',maskUnits='userSpaceOnUse',x=0,y=0,width=941,height=1672,mask_type='luminance',data_outfit_id=OUTFIT,data_wear_layer='sleeves',data_source_id=up+'_surface')
 mask.append(el('rect',x=0,y=0,width=941,height=1672,fill='white'))
 mask.append(el('path',d=D.node(up+'_surface').get('d'),fill='black',stroke='none'))
 D.defs.append(mask);sg.set('mask','url(#'+mask.get('id')+')')
 text(sg,'desc','同袖段的连接接触影只保留完整源轮廓之外的平移窄影；真实投影形仍为完整可编辑路径，原位源形抑制并非删去源形。')
 hand='hand_'+side+'_palm'
 sh=D.shade('fx_outfit_'+lo+'_cuff_on_'+hand,lo+'_cuff_front_surface',lo,hand+'_complete_shape',hand,'base:arms','sleeves',dx=.4 if mir else -.4,dy=1.7,color='#AA99B7',alpha='.27',sigma='.6')
 sh.set('data-kind','arms');sh.set('data-wear-layer','sleeves')
 for body in ['upper_arm_'+side,'forearm_'+side]:
  old='arms2_'+body+'_material'
  D.dependency({'id':old,'type':'base_material_physical_occlusion','layers':['sleeves'],'source_id':body,'target_id':body,'original_attributes':{'display':None},'default_attributes':{'display':None},'when_layer_disabled':'keep original skin material and visibility unchanged; removing opaque sleeve surfaces exposes its complete intrinsic arm shading','covering_ids':[up,lo]})

D.save_color('color_opaque_sleeves')
