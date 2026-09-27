from color_common import *
D=Color('5.分批着色与成稿/color_waist/character.svg')

# White inner skirt: complete opaque body, including the hidden center/back.
for which in ['back','front']:
 p='skirt_inner_'+which
 stops=[(0,'#CFDCF1'),(.15,'#ECF2FA'),(.27,'#DEE8F7'),(.39,'#F7FAFD'),(.52,'#E7EFF9'),(.65,'#F3F6FC'),(.79,'#DCE7F6'),(.91,'#EDF3FA'),(1,'#C6D3F1')]
 if which=='back':stops=[(v,c) for v,c in [(0,'#BDCEE9'),(.18,'#E3ECF8'),(.35,'#D1DFF2'),(.53,'#ECF3FA'),(.74,'#D0DEF1'),(.91,'#E2ECF8'),(1,'#BACDE8')]]
 D.setfill(p+'_surface',D.grad('outfit_'+p+'_base',290,0,602,0,stops))
 D.recolor_lines(p,'#A7BAD8','.62','.59')
 mat=D.intrinsic(p)
 if which=='front':
  D.setfill(p+'_right_fold',D.grad('outfit_'+p+'_right_fold',304,0,389,0,[(0,'#CEDCF1'),(.35,'#ECF3FB'),(.67,'#D5E3F5'),(1,'#B9CDEB')]))
  D.setfill(p+'_left_fold',D.grad('outfit_'+p+'_left_fold',500,0,581,0,[(0,'#BCCFED'),(.37,'#E4EEF9'),(.64,'#F4F8FD'),(1,'#CDDBF0')]))
  D.setfill(p+'_hem_inner',D.grad('outfit_'+p+'_hem_inside',0,1487,0,1522,[(0,'#DBE6F6'),(.4,'#C6D3F1'),(.7,'#D6E1F4'),(1,'#E8EFF9')]))
  shadows=[
   'M 389 563 C 375 828 376 1102 358 1338 C 353 1412 350 1458 351 1506 L 358 1508 C 357 1431 363 1382 368 1317 C 382 1069 382 826 394 565 Z',
   'M 407 560 C 397 862 401 1207 393 1515 L 401 1517 C 405 1214 403 866 412 563 Z',
   'M 481 562 C 498 814 492 1138 504 1509 L 512 1516 C 502 1174 504 848 487 560 Z',
   'M 501 561 C 516 822 519 1080 535 1372 L 540 1509 L 547 1514 C 547 1465 543 1400 540 1346 C 523 1058 525 793 509 561 Z']
  lights=[
   'M 380 584 C 366 847 360 1135 342 1383 L 338 1499 L 345 1506 C 344 1462 349 1409 353 1362 C 371 1109 372 845 387 586 Z',
   'M 422 565 C 416 896 418 1217 416 1516 L 426 1518 C 425 1218 425 896 429 566 Z',
   'M 472 562 C 479 871 477 1209 484 1515 L 492 1516 C 484 1202 487 873 481 564 Z',
   'M 520 641 C 530 901 540 1144 555 1399 L 559 1509 L 566 1508 C 563 1434 560 1386 556 1320 C 542 1070 536 841 526 644 Z']
 else:
  shadows=['M 399 557 C 379 836 376 1210 347 1493 L 362 1494 C 385 1228 389 826 407 560 Z','M 488 558 C 512 835 508 1216 532 1498 L 546 1490 C 521 1203 526 825 497 558 Z']
  lights=['M 424 566 C 419 883 421 1217 414 1499 L 435 1502 C 437 1212 435 891 438 565 Z','M 467 568 C 479 870 474 1261 490 1499 L 505 1498 C 490 1246 494 875 482 568 Z']
 for j,ds in enumerate(shadows):path(mat,p+'_long_shadow_'+str(j),ds,D.grad('outfit_'+p+'_long_shadow_grad_'+str(j),0,550,0,1520,[(0,'#B6C9E5',.3),(.23,'#C6D3F1',.46),(.65,'#BBCDE8',.66),(1,'#C6D3F1',.82)]))
 for j,ds in enumerate(lights):path(mat,p+'_long_light_'+str(j),ds,D.grad('outfit_'+p+'_long_light_grad_'+str(j),0,558,0,1520,[(0,'#FCFDFF',.5),(.42,'#FFFFFF',.72),(.8,'#FDFEFF',.9),(1,'#F3F7FD',.6)]))
 if which=='front':
  path(mat,p+'_hem_silk_glint','M 315 1500 Q 338 1507 357 1506 Q 379 1515 394 1510 Q 417 1517 434 1514 Q 454 1520 470 1513 Q 493 1516 508 1510 Q 529 1515 543 1508 Q 565 1513 578 1501','none','#F8FBFF','1.15','material-edge-highlight',stroke_opacity='.83')
 D.mark(p,'22轻白内裙与23冷蓝细褶完整覆盖腰根至下摆；纵向长褶、局部亮脊和横向内折分离。前幅中心即使被蓝裙遮住仍完整，后幅色光及不可见褶向按同材料保守推断。保持不透明，非通过露出腿色制造薄感。')

# Blue light silk stays opaque; the original shows light transmitted at folds,
# but supplies no unique fabric alpha separate from its white skirt backing.
for which in ['back','front']:
 p='skirt_blue_'+which
 if which=='front':
  stops=[(0,'#83ADE0'),(.13,'#A0C7EC'),(.29,'#AED5F4'),(.43,'#9AC2EA'),(.59,'#AAD3F4'),(.72,'#A1C9EE'),(.87,'#8EB9E6'),(1,'#AACDEF')]
  xx1,xx2=362,531
 else:
  stops=[(0,'#7C9FD0'),(.18,'#93BCE5'),(.34,'#81AADD'),(.52,'#A1C9EC'),(.67,'#88B0DE'),(.85,'#9DC5E9'),(1,'#7B9FCF')]
  xx1,xx2=296,599
 D.setfill(p+'_surface',D.grad('outfit_'+p+'_base',xx1,0,xx2,0,stops))
 D.recolor_lines(p,'#7C9CCA','.6','.56')
 mat=D.intrinsic(p)
 if which=='front':
  D.setfill(p+'_right_fold',D.grad('outfit_'+p+'_right_fold',362,0,417,0,[(0,'#9FC7EC'),(.28,'#8AB3E3'),(.59,'#94BEE9'),(.84,'#7DA6D6'),(1,'#A6CEF0')]))
  D.setfill(p+'_left_fold',D.grad('outfit_'+p+'_left_fold',452,0,530,0,[(0,'#9FC7EC'),(.23,'#8AB3E3'),(.5,'#A4CEF0'),(.8,'#8CB6E2'),(1,'#8FAFDC')]))
  for side in ['right','left']:
   D.setfill(p+'_lower_turn_'+side,D.grad('outfit_'+p+'_lower_turn_'+side,0,1294,0,1371,[(0,'#A8CBEA'),(.32,'#93B4DD'),(.62,'#86A4D4'),(1,'#9CBEE3')]))
   D.node(p+'_lower_turn_'+side).set('stroke','#89A8D1');D.node(p+'_lower_turn_'+side).set('stroke-width','.52')
  D.setfill(p+'_bottom_inner',D.grad('outfit_'+p+'_bottom_inner',432,1410,495,1532,[(0,'#8DACD8'),(.26,'#AACCE9'),(.47,'#86A4D4'),(.73,'#789BCA'),(1,'#A3C7E8')]))
  shadows=[
   'M 417 557 C 409 865 411 1098 403 1305 C 401 1366 401 1417 410 1459 L 421 1487 C 410 1424 412 1376 415 1311 C 422 1087 418 874 425 557 Z',
   'M 454 558 C 460 871 451 1148 452 1399 L 459 1383 C 462 1123 468 878 463 558 Z',
   'M 480 561 C 489 843 491 1099 503 1281 L 513 1314 C 500 1120 498 843 489 559 Z']
  lights=[
   'M 409 568 C 405 869 403 1099 395 1291 L 403 1300 C 411 1074 412 817 416 566 Z',
   'M 430 566 C 426 893 427 1196 430 1480 L 439 1509 C 437 1193 440 896 439 566 Z',
   'M 470 566 C 475 800 477 1077 486 1286 L 494 1293 C 485 1075 487 797 479 564 Z']
  path(mat,p+'_lower_curled_broad_light','M 401 1390 C 411 1427 416 1481 437 1512 L 443 1520 C 426 1485 424 1449 413 1420 Z M 460 1427 C 475 1435 486 1442 490 1454 C 484 1465 474 1470 465 1480 L 468 1471 C 481 1458 482 1452 476 1444 Z',D.grad('outfit_'+p+'_curl_light',0,1390,0,1531,[(0,'#BADDF4',.4),(.55,'#C8E5F8',.8),(1,'#D6EBFA',.48)]))
  path(mat,p+'_thin_transmitted_edge','M 368 1336 C 379 1341 390 1352 400 1364 M 449 1409 C 438 1421 456 1429 468 1435 C 483 1442 495 1449 493 1459 C 489 1474 465 1484 458 1501 M 435 1523 Q 445 1532 451 1529','none','#CFE8F9','1.3','material-transmitted-edge',stroke_opacity='.9')
 else:
  shadows=['M 396 558 C 379 845 374 1214 351 1488 L 367 1497 C 386 1217 391 849 407 558 Z','M 485 558 C 511 822 510 1232 540 1486 L 555 1477 C 525 1215 525 817 498 557 Z']
  lights=['M 422 565 C 412 888 418 1218 407 1499 L 427 1500 C 433 1211 434 886 438 568 Z','M 463 566 C 475 890 466 1222 484 1498 L 501 1499 C 487 1229 488 884 478 567 Z']
 for j,ds in enumerate(shadows):path(mat,p+'_long_cool_fold_'+str(j),ds,D.grad('outfit_'+p+'_cool_fold_grad_'+str(j),0,558,0,1528,[(0,'#749CCE',.2),(.35,'#76A1D5',.36),(.7,'#8AB3E3',.7),(1,'#7A9ECF',.5)]))
 for j,ds in enumerate(lights):
  ends_above_turn=which=='front' and j in [0,2]
  path(mat,p+'_long_transmitted_light_'+str(j),ds,D.grad('outfit_'+p+'_light_grad_'+str(j),0,563,0,1285 if ends_above_turn else 1515,[(0,'#C4E2F7',.46),(.25,'#AAD3F4',.25),(.56,'#CAE6F8',.6),(.83,'#B9DEF5',.52 if ends_above_turn else .74),(1,'#D2EAF9',0 if ends_above_turn else .38)]))
 if which=='front':
  owner=D.node(p)
  for suffix in ['_lower_turn_right','_lower_turn_left','_bottom_inner']:
   n=D.node(p+suffix);owner.remove(n)
   owner.insert(list(owner).index(mat)+1,n)
  finish=group(p+'_hem_material_finish','skirts',p,data_role='intrinsic-hem-reflection',clip_path='url(#'+p+'_surface_clip)')
  for suffix in ['_lower_curled_broad_light','_thin_transmitted_edge']:
   n=D.node(p+suffix);mat.remove(n);finish.append(n)
  owner.insert(list(owner).index(mat)+4,finish)
 D.mark(p,'24/25蓝轻绸宽面、26窄冷褶与27翻摆冷底分层；长纵亮面和末端横卷透光分别绘制。以完整不透明实体表现轻薄透光，单张合成图不足以唯一反求材质 alpha；背面光向和隐藏后摆折向为保守推断。')

for which in ['front','back']:
 source='skirt_blue_'+which;target='skirt_inner_'+which
 sh=D.shade('fx_outfit_'+source+'_on_'+target,source+'_surface',source,target+'_surface',target,'skirts','skirts',dx=.5,dy=2.8,color='#A7B2D8',alpha='.25' if which=='front' else '.18',sigma='1.15')
 if which=='back':
  # Back fabric order exposes only its contact perimeter, not an opaque copy
  # of the complete outside skirt over the inner skirt back.
  mask=el('mask',id='outfit_blue_back_contact_visibility',maskUnits='userSpaceOnUse',x=0,y=0,width=941,height=1672,data_outfit_id=OUTFIT,data_wear_layer='skirts',data_source_id=source+'_surface')
  mask.append(el('rect',x=0,y=0,width=941,height=1672,fill='white'));mask.append(el('path',d=D.node(source+'_surface').get('d'),fill='black',stroke='none'));D.defs.append(mask);sh.set('mask','url(#'+mask.get('id')+')')
for side in ['right','left']:
 for region in ['calf','foot']:
  eid='fx_lower3_foot_chain_'+side+'_on_'+region
  node=D.node(eid)
  D.dependency({'id':eid,'type':'base_effect_physical_occlusion','layers':['skirts'],'source_id':node.get('data-source-id'),'target_id':node.get('data-target-id'),'original_attributes':{'display':node.get('display'),'clip-path':node.get('clip-path')},'default_attributes':{'display':node.get('display'),'clip-path':node.get('clip-path')},'when_layer_disabled':'keep original foot-chain skin shadow unchanged; removal of skirt surfaces naturally reveals the original complete leg and foot shading','covering_ids':['skirt_inner_front','skirt_blue_front','skirt_outer_right','skirt_outer_left']})
D.save_color('color_skirt_inner_blue')
