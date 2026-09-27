from color_common import *
D=Color('5.分批着色与成稿/color_skirt_inner_blue/character.svg')

p='skirt_outer_back'
D.setfill(p+'_surface',D.grad('outfit_'+p+'_base',155,0,732,0,[(0,'#C5D5ED'),(.16,'#E2ECF8'),(.29,'#D2DFF2'),(.43,'#F2F6FB'),(.58,'#E8F0F9'),(.73,'#D4E1F3'),(.86,'#E8F0FA'),(1,'#C3D4ED')]))
for side in ['right','left']:
 D.setfill(p+'_turn_'+side,D.grad('outfit_'+p+'_turn_'+side,0,550,0,1530,[(0,'#D2DFF2'),(.35,'#BECFE9'),(.62,'#D5E2F4'),(.86,'#C3D4ED'),(1,'#DFE9F6')]))
D.recolor_lines(p,'#A4B7D3','.62','.57')
bm=D.intrinsic(p)
for j,ds in enumerate([
 'M 384 559 C 360 848 347 1128 281 1487 L 273 1516 L 293 1510 C 355 1181 377 859 397 559 Z',
 'M 414 559 C 398 873 399 1244 399 1499 L 415 1500 C 418 1245 419 874 427 560 Z',
 'M 501 557 C 535 838 548 1201 609 1519 L 627 1523 C 566 1189 552 822 514 557 Z']):
 path(bm,p+'_broad_long_cool_fold_'+str(j),ds,D.grad('outfit_'+p+'_fold_'+str(j),0,557,0,1520,[(0,'#BACDE7',.12),(.33,'#BFCEE8',.58),(.7,'#AFBFDD',.54),(1,'#C5D6ED',.22)]))
path(bm,p+'_hem_horizontal_reflection','M 164 1488 C 184 1512 217 1526 246 1518 C 303 1497 378 1490 447 1487 C 513 1488 581 1494 640 1519 C 674 1529 704 1517 723 1488 L 724 1503 C 699 1528 670 1534 640 1527 C 578 1505 511 1498 447 1495 C 377 1498 303 1507 246 1526 C 211 1537 179 1522 160 1498 Z',D.grad('outfit_'+p+'_hem_light',0,1487,0,1538,[(0,'#EFF5FC',.25),(.6,'#F7FAFE',.82),(1,'#DFEAF7',.4)]))
D.mark(p,'白外裙独立后幅采用28/29/30同族色，完整腰后至展开后摆均铺满；大纵褶、侧返冷面与下摆横向反射分开，隐藏光向和后裙量褶向均为保守推断。')

for side,mir in [('right',False),('left',True)]:
 def f(ds):
  if not mir:return ds
  tok=re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)',mirror(ds));out=[];k=0
  while k<len(tok):
   if tok[k].isalpha():out.append(tok[k]);k+=1
   else:
    x,y=float(tok[k]),float(tok[k+1]);out.extend([f'{x+max(0,min(18,(y-700)*18/830)):g}',f'{y:g}']);k+=2
  return ' '.join(out)
 xx=lambda x:889-x if mir else x
 p='skirt_outer_'+side;roll=p+'_flounce'
 D.setfill(p+'_surface',D.grad('outfit_'+p+'_base',xx(185),0,xx(414),0,[(0,'#D0DDF4'),(.2,'#E6EEF9'),(.44,'#F8FAFD'),(.67,'#EFF3FA'),(.86,'#E0EAF8'),(1,'#F8FAFD')]))
 D.setfill(p+'_side_surface',D.grad('outfit_'+p+'_side',xx(210),0,xx(365),0,[(0,'#D2DFF2'),(.3,'#E7EFF9'),(.57,'#CEDDF3'),(.81,'#DBE6F6'),(1,'#C7D7EE')]))
 D.recolor_lines(p,'#AABCD6','.58','.55')
 mat=D.intrinsic(p)
 path(mat,p+'_falling_broad_light',f('M 367 584 C 338 810 321 1007 290 1211 C 272 1334 247 1443 226 1517 L 244 1524 C 271 1430 294 1322 310 1198 C 338 989 354 790 379 584 Z'),D.grad('outfit_'+p+'_broad_light',0,580,0,1530,[(0,'#FAFCFF',.7),(.27,'#FFFFFF',.43),(.58,'#FCFDFF',.8),(.79,'#FFFFFF',.9),(1,'#EFF5FC',.4)]))
 path(mat,p+'_long_cool_crease',f('M 354 645 C 330 829 319 1017 292 1181 C 272 1314 255 1422 228 1517 L 236 1523 C 266 1423 286 1315 305 1187 C 329 1011 343 820 365 643 Z'),D.grad('outfit_'+p+'_long_cool',0,640,0,1525,[(0,'#B9CDE8',.3),(.45,'#CED8EF',.64),(.73,'#B9CBE5',.47),(1,'#D0DDF4',.35)]))
 path(mat,p+'_side_silk_gleam',f('M 360 616 C 333 795 318 1004 291 1196 C 274 1324 257 1418 234 1493'),'none','#F8FBFE','1.1','material-edge-highlight',stroke_opacity='.55')
 D.mark(p,'28白外裙主体、29浅蓝宽褶和30冷折分别沿裙面落下；保持完整白底及侧缝隐藏余量，细边为绸布光而非金属线。')

 D.setfill(p+'_flounce_surface',D.grad('outfit_'+p+'_flounce_base',xx(232),0,xx(407),0,[(0,'#D8E3F5'),(.25,'#F1F5FB'),(.51,'#FFFFFF'),(.72,'#EFF3FA'),(.9,'#D5E1F3'),(1,'#F7F9FD')]))
 D.clip(roll,p+'_flounce_surface')
 rm=D.intrinsic(roll)
 # Broad face reflections sit below the actual fold-back faces.
 owner=D.node(roll);owner.remove(rm);owner.insert(list(owner).index(D.node(p+'_fold_inner_upper')),rm)
 waves=[
  ('upper','M 384 576 C 376 611 367 635 353 654 C 361 647 378 640 389 633 C 401 611 401 589 403 574 Z',574,670),
  ('middle_upper','M 352 750 C 350 778 363 805 382 828 C 390 839 393 850 389 861 C 384 836 363 825 351 803 C 343 785 344 765 347 752 Z',747,869),
  ('middle','M 325 955 C 324 983 338 1007 355 1030 C 363 1047 360 1060 350 1079 C 370 1058 371 1044 362 1024 C 348 1002 334 986 330 957 Z',953,1084),
  ('lower','M 302 1155 C 301 1182 312 1203 326 1222 C 333 1239 323 1255 313 1275 C 333 1250 339 1235 329 1214 C 316 1196 311 1176 312 1156 Z',1153,1280),
  ('hem','M 230 1439 C 225 1459 241 1478 260 1495 C 271 1507 267 1518 258 1527 C 281 1516 281 1507 264 1488 C 248 1473 234 1458 240 1440 Z',1438,1529)]
 for name,ds,y1,y2 in waves:
  path(rm,p+'_flounce_broad_light_'+name,f(ds),D.grad('outfit_'+p+'_flounce_light_'+name,0,y1,0,y2,[(0,'#F7FAFD',.22),(.28,'#FFFFFF',.8),(.6,'#FDFEFF',.94),(1,'#DCE7F6',.12)]))
 folds=[('upper',635,732),('middle_upper',779,965),('middle',965,1187),('lower',1187,1409),('hem',1430,1528)]
 for name,y1,y2 in folds:
  D.setfill(p+'_fold_inner_'+name,D.grad('outfit_'+p+'_fold_inner_'+name,xx(320),y1,xx(368),y2,[(0,'#DAE5F5'),(.19,'#C2D1EB'),(.43,'#AFBFDC'),(.62,'#CED8EF'),(.85,'#D0DDF4'),(1,'#E6EDF8')]))
 D.recolor_lines(roll,'#A7B9D4','.57','.64')
 D.node(p+'_flounce_roll').set('stroke','#F8FAFD');D.node(p+'_flounce_roll').set('stroke-width','1.45');D.node(p+'_flounce_roll').set('stroke-opacity','.95')
 D.node(p+'_flounce_edge').set('stroke','#9EAFCC');D.node(p+'_flounce_edge').set('stroke-width','.45');D.node(p+'_flounce_edge').set('stroke-opacity','.62')
 D.node(p+'_flow_accents').set('stroke','#B7C8E1');D.node(p+'_flow_accents').set('stroke-width','.55');D.node(p+'_flow_accents').set('stroke-opacity','.45')
 finish=group(p+'_flounce_material_finish','skirts',p,clip_path='url(#'+roll+'_surface_clip)',data_role='intrinsic-fold-edge-reflections')
 for j,ds in enumerate([
  'M 354 665 C 350 678 362 693 369 706',
  'M 368 802 C 380 816 395 831 399 844 C 402 859 392 873 382 883',
  'M 334 982 C 344 1001 362 1019 367 1036 C 372 1053 365 1068 352 1083',
  'M 321 1208 C 332 1223 334 1233 327 1249',
  'M 245 1463 C 262 1477 279 1489 283 1501 C 286 1511 277 1517 266 1521']):
  path(finish,p+'_flounce_turn_glint_'+str(j),f(ds),'none','#FFFFFF','.82','material-thin-edge-reflection',stroke_opacity='.82')
 owner.append(finish)
 D.mark(roll,'连续荷叶边各大折分别设局部方向渐变：外翻面宽白光、内回面29/30冷蓝及31薄边亮。真实内折压在主体纵褶之上，未把一条通长渐变当作全部翻卷明暗。')
 for recv in ['skirt_blue_front','skirt_inner_front']:
  D.shade('fx_outfit_'+p+'_on_'+recv,p+'_surface',p,recv+'_surface',recv,'skirts','skirts',dx=-1.1 if mir else 1.1,dy=2.5,color='#A7B2D8',alpha='.27',sigma='1.05')

for recv in ['skirt_blue_back','skirt_inner_back']:
 source='skirt_outer_back';sh=D.shade('fx_outfit_'+source+'_on_'+recv,source+'_surface',source,recv+'_surface',recv,'skirts','skirts',dx=.3,dy=2.6,color='#A7B2D8',alpha='.18',sigma='1.1')
 mask=el('mask',id='fx_outfit_'+source+'_on_'+recv+'_visibility',maskUnits='userSpaceOnUse',x=0,y=0,width=941,height=1672,data_outfit_id=OUTFIT,data_wear_layer='skirts',data_source_id=source+'_surface')
 mask.append(el('rect',x=0,y=0,width=941,height=1672,fill='white'));mask.append(el('path',d=D.node(source+'_surface').get('d'),fill='black',stroke='none'));D.defs.append(mask);sh.set('mask','url(#'+mask.get('id')+')')
D.save_color('color_skirt_outer')
