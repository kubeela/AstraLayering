from color_common import *
D=Color('5.分批着色与成稿/color_inner_collar/character.svg')
# Back fabric is completed from the same material family, with conservative light.
D.setfill('mantle_back_surface',D.grad('outfit_mantle_back_base',0,303,0,455,[(0,'#D8E3F2'),(.3,'#EEF3FA'),(.65,'#E5EDF8'),(1,'#BFCFE7')]))
D.setfill('mantle_back_neck_facing',D.grad('outfit_mantle_back_neck',0,303,0,329,[(0,'#A8BDD9'),(1,'#DAE6F5')]))
D.recolor_lines('mantle_back','#B5C3D8','.65','.8')
D.mark('mantle_back','后肩披不可见，采用05/06/07的白绸材料及保守背面冷光推断；完整内缘有04同族冷蓝，未从生成参考抄入新纹章。')
D.setfill('coat_back_body_surface',D.grad('outfit_coat_back_body',343,0,548,0,[(0,'#BCD0EB'),(.25,'#E8F0FA'),(.5,'#F1F5FB'),(.74,'#E5EDF8'),(1,'#BDD0E8')]))
D.setfill('coat_back_hem_surface',D.grad('outfit_coat_back_hem',73,0,827,0,[(0,'#CFDDF0'),(.18,'#E4ECF8'),(.35,'#C7D6ED'),(.52,'#EDF3FA'),(.73,'#CDDBEE'),(.9,'#E9F0F9'),(1,'#C9D8EC')]))
D.recolor_lines('coat_back','#ACBCD4','.65','.62')
D.mark('coat_back','后外衣身体段和长摆完整铺底；采用12/13与推断后片色 #E5EDF8，左右侧转暗、中背宽光和裙量纵褶独立，背面光照为保守推断。')

for side,mir in [('right',False),('left',True)]:
 f=lambda d:mirror(d) if mir else d
 part='coat_front_'+side;x1,x2=(484,855) if mir else (34,405)
 stops=[(0,'#DCE6F5'),(.2,'#F9FAFD'),(.42,'#CFDDF0'),(.61,'#F4F8FC'),(.79,'#E1EAF7'),(1,'#F5F7FB')]
 if mir:stops=[(1-p,c) for p,c in reversed(stops)]
 D.setfill(part+'_surface',D.grad('outfit_'+part+'_base',x1,0,x2,0,stops))
 D.setfill(part+'_inner_surface',D.grad('outfit_'+part+'_inner_turn',0,330,0,626,[(0,'#DEE8F6'),(.3,'#C3D3E9'),(.67,'#D8E5F5'),(1,'#9FB6D9')]))
 D.setfill(part+'_lapel_surface',D.grad('outfit_'+part+'_lapel',484 if mir else 376,0,513 if mir else 407,0,[(0,'#D3E1F3'),(.37,'#F5F7FB'),(.65,'#FFFFFF'),(1,'#D2E0F2')]))
 D.setfill(part+'_long_turn',D.grad('outfit_'+part+'_long_turn',0,580,0,1565,[(0,'#CAD9F0'),(.34,'#E2EBF7'),(.57,'#C8D9EF'),(.8,'#E3ECF8'),(1,'#B9CBE5')]))
 D.node(part+'_surface').set('stroke','#A4B3CC');D.node(part+'_surface').set('stroke-width','.72');D.node(part+'_lapel_surface').set('stroke','#AABAD0');D.node(part+'_lapel_surface').set('stroke-width','.55')
 D.recolor_lines(part,'#A9BBD6','.67','.62')
 # Wide coat planes follow curved cloth paths instead of a single canvas wash.
 mat=D.intrinsic(part)
 path(mat,part+'_long_silk_light',f('M 357 397 C 357 549 327 700 309 861 C 287 1074 246 1320 190 1456 C 169 1510 143 1545 124 1568 L 144 1565 C 181 1528 215 1453 239 1371 C 282 1222 308 1021 327 843 C 344 687 378 527 372 400 Z'),D.grad('outfit_'+part+'_long_light',0,390,0,1565,[(0,'#FFFFFF',.88),(.42,'#FDFEFF',.76),(.76,'#F6FAFF',.65),(1,'#EDF5FE',.2)]))
 path(mat,part+'_inner_edge_cool_fold',f('M 386 503 C 382 565 376 625 362 707 C 340 860 331 1031 316 1175 C 303 1330 289 1465 276 1475 L 259 1496 C 285 1349 289 1219 303 1089 C 322 905 332 751 351 651 C 362 588 373 549 376 509 Z'),D.grad('outfit_'+part+'_fold_gradient',0,495,0,1500,[(0,'#BED0EA',.8),(.45,'#C9D9EF',.76),(.77,'#ABC3E3',.67),(1,'#D9E6F5',.5)]))
 path(mat,part+'_outer_lower_broad_light',f('M 171 1366 C 134 1445 87 1488 34 1501 C 27 1510 37 1525 63 1530 C 117 1500 157 1449 184 1404 Z'),D.grad('outfit_'+part+'_hem_light',0,1365,0,1550,[(0,'#F9FCFF',0),(.6,'#FFFFFF',.88),(1,'#ECF4FC',.55)]))
 # Existing flowing seams become soft material transitions with narrow highlights.
 path(mat,part+'_long_satin_edge',f('M 346 427 C 343 498 337 549 327 612 C 311 718 297 846 285 960 C 267 1132 239 1303 193 1432 C 167 1497 132 1543 106 1560'),'none','#F9F9FC','1.15','material-edge-highlight',stroke_opacity='.72')
 path(mat,part+'_inside_silver_edge',f('M 388 443 C 388 506 375 554 359 588 C 352 603 342 617 330 626'),'none','#F9FBFE','1.2','material-edge-highlight')
 D.mark(part,'前襟与长摆以12 #F5F7FB、13 #E7EFF9、15 #F9F9FC 为主，宽绸面、曲线长褶冷面、下摆横向返光与细滚边分别落在实际布面；侧内面与隐藏长摆依据相邻白绸推断。线稿轮廓/长度/翻襟不变。')
 # Mantle surfaces use shoulder-centered volume and independent embossed motifs.
 mp='mantle_front_'+side;gx1,gx2=(483,594) if mir else (295,411)
 mst=[(0,'#BFCFE8'),(.22,'#EFF4FB'),(.56,'#E2EAF5'),(.8,'#F7FAFD'),(1,'#C8D0E2')]
 if mir:mst=[(1-p,c) for p,c in reversed(mst)]
 D.setfill(mp+'_surface',D.grad('outfit_'+mp+'_base',gx1,325,gx2,409,mst))
 D.setfill(mp+'_underturn',D.grad('outfit_'+mp+'_underturn',0,345,0,417,[(0,'#D8E4F3'),(.66,'#CBD9EC'),(1,'#B2B9D0')]))
 D.setfill(mp+'_inner_flap',D.grad('outfit_'+mp+'_inner_flap',0,328,0,371,[(0,'#F4F8FC'),(.4,'#FDFEFF'),(.82,'#E2ECF8'),(1,'#B7CAE5')]))
 D.node(mp+'_surface').set('stroke','#9AAAC3');D.node(mp+'_surface').set('stroke-width','.72');D.node(mp+'_inner_flap').set('stroke','#A1B2CB');D.node(mp+'_inner_flap').set('stroke-width','.55')
 D.recolor_lines(mp,'#B1C0D7','.6','.6')
 mm=D.intrinsic(mp)
 path(mm,mp+'_shoulder_broad_light',f('M 310 352 C 329 330 366 327 398 322 L 400 337 C 370 338 341 341 326 355 C 316 366 311 382 299 397 C 301 377 304 363 310 352 Z'),D.grad('outfit_'+mp+'_wide_light',0,328,0,401,[(0,'#FFFFFF',.95),(.4,'#F9FCFF',.52),(1,'#E2ECF8',0)]))
 path(mm,mp+'_chest_root_cool',f('M 373 336 C 380 342 384 350 378 360 C 372 371 357 379 347 385 L 355 391 C 373 382 389 371 396 359 L 394 339 Z'),D.grad('outfit_'+mp+'_root_turn',0,335,0,391,[(0,'#CAD8EE',.1),(.62,'#B7C6E0',.54),(1,'#A9B9D5',.65)]))
 motifs=[
 'M 326 342 C 337 341 340 348 335 355 C 330 361 327 356 331 352 C 325 354 321 365 325 372 C 331 381 326 387 317 390',
 'M 345 338 C 358 338 355 348 364 351 C 371 354 371 359 366 364 C 364 358 359 358 355 362 C 352 352 342 350 345 338 Z',
 'M 316 362 C 310 372 312 381 319 384 C 323 386 322 393 316 397 C 317 391 312 389 308 390',
 'M 371 334 C 373 341 384 342 383 348 C 381 352 377 350 378 346',
 'M 340 360 C 346 363 348 371 345 377 C 342 381 339 377 340 373',
 'M 394 335 C 390 344 387 349 390 355']
 for j,ds in enumerate(motifs):
  path(mm,mp+'_embroidery_shallow_shadow_'+str(j),f(ds),'none','#BECDE4','2','embroidery-relief-shadow',stroke_opacity='.5',transform='translate(.45 .65)')
  path(mm,mp+'_embroidery_silver_'+str(j),f(ds),'none','#F0F4FA','1.15','opaque-silver-embroidery')
 path(mm,mp+'_embroidery_top_gleam',f('M 332 335 C 351 328 374 328 391 325'),'none','#FFFFFF','.8','opaque-silver-embroidery')
 D.mark(mp,'肩披按05/06/08分别铺完整白绸、肩圆蓝灰体积与短反折暗面；07银白卷纹随肩坡和胸侧折向分布，细凸纹阴/亮分离，未穿过折面贴平花纹。腋前与隐藏根部沿相同材料延续。')
 # Hair sources keep the same complete silhouette and offset as the existing
 # body projection; each new cloth receiver has its own exact surface clipping.
 hsrc='hair_front_'+side+'_long_ribbon_shape'
 for receiver in [mp,part]:
  D.shade('fx_outfit_hair_front_'+side+'_on_'+receiver,hsrc,'hair_front_'+side,receiver+'_surface',receiver,'shoulder_mantle' if receiver==mp else 'outer_coat','base:hair',dx=.85 if mir else -.85,dy=1.25,color='#859BBF',alpha='.31',sigma='.72')
 D.shade('fx_outfit_'+mp+'_on_inner_bodice',mp+'_surface',mp,'inner_bodice_front_surface','inner_bodice','inner_top','shoulder_mantle',dx=.4,dy=2.1,alpha='.24',sigma='.8')
 D.shade('fx_outfit_'+part+'_on_inner_bodice',part+'_surface',part,'inner_bodice_front_surface','inner_bodice','inner_top','outer_coat',dx=1.3 if mir else -1.3,dy=2.1,alpha='.28',sigma='1')
 skirt='skirt_outer_'+side
 D.shade('fx_outfit_'+part+'_on_'+skirt,part+'_surface',part,skirt+'_surface',skirt,'skirts','outer_coat',dx=1.4 if mir else -1.4,dy=2.6,alpha='.28',sigma='1.2')
 # Existing skin effects need no destructive attribute change: actual opaque
 # cloth covers them in the SVG order, and hiding the layers reveals them again.
 old='fx_hair5_'+side+'_long_on_torso'
 D.dependency({'id':old,'type':'base_effect_physical_occlusion','layers':['inner_top','shoulder_mantle','outer_coat'],'source_id':'hair_front_'+side+'_long_ribbon','target_id':'torso','original_attributes':{'display':None,'clip-path':'url(#hair5_surface_torso)'},'default_attributes':{'display':None,'clip-path':'url(#hair5_surface_torso)'},'when_layer_disabled':'keep original torso effect unchanged; visibility follows actual torso exposure after removing disabled opaque layer roots','covering_ids':['inner_bodice','mantle_front_'+side,'coat_front_'+side]})
D.save_color('color_mantle_coat')
