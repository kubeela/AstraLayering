from clothing_common import *
D=Drawing('3.衣装线稿/line_skirt_inner_blue/character.svg')
back=group('skirt_outer_back','skirts',desc='白外裙完整独立后幅：腰后、两侧展开面、折侧与宽后摆。attach_to=pelvis 后腰及前片两侧，固定 (370,541)/(522,541)；draw_order=coat_back 内、skirt_blue_back 外，双腿后。后幅按正面裙量保守推断，完全独立于内裙和蓝裙；source=null。')
path(back,'skirt_outer_back_surface','M 370 535 Q 445 547 522 535 C 550 639 568 771 588 915 C 616 1138 661 1358 732 1491 C 711 1524 676 1537 640 1527 C 580 1504 510 1497 447 1495 C 377 1498 303 1507 246 1526 C 210 1538 174 1523 154 1493 C 221 1359 267 1138 294 915 C 313 772 340 639 370 535 Z','#E5E7EB')
path(back,'skirt_outer_back_turn_left','M 510 548 C 542 786 559 1120 638 1527 C 676 1537 711 1524 732 1491 C 658 1365 617 1142 588 915 C 568 771 550 639 522 535 Z','#DDE1E7')
path(back,'skirt_outer_back_turn_right','M 383 548 C 351 786 332 1120 246 1526 C 210 1538 174 1523 154 1493 C 221 1359 267 1138 294 915 C 313 772 340 639 370 535 Z','#DDE1E7')
line(back,'skirt_outer_back_drape','M 386 558 C 355 894 342 1190 283 1513 M 421 558 C 411 861 411 1190 409 1498 M 469 558 C 482 861 483 1190 484 1497 M 505 558 C 535 894 550 1190 608 1517','.8','#AEB4BF')
line(back,'skirt_outer_back_hem','M 154 1493 C 174 1523 210 1538 246 1526 C 303 1507 377 1498 447 1495 C 510 1497 580 1504 640 1527 C 676 1537 711 1524 732 1491','1')
D.before(back,'skirt_blue_back');D.clip('skirt_outer_back','skirt_outer_back_surface')

inneredge='C 407 587 407 616 392 635 C 379 650 348 653 353 673 C 357 694 378 711 376 732 C 375 749 356 760 361 779 C 367 798 394 816 401 841 C 408 868 385 892 361 910 C 340 925 324 943 330 965 C 337 990 365 1010 371 1036 C 379 1067 353 1091 332 1117 C 313 1141 316 1164 330 1187 C 347 1214 345 1232 328 1259 C 311 1286 296 1317 288 1348 C 277 1387 247 1407 237 1430 C 230 1454 270 1471 284 1494 C 297 1514 285 1526 262 1528'
outline='M 370 535 Q 392 540 414 537 L 409 557 '+inneredge+' C 237 1533 210 1527 188 1513 C 182 1509 176 1502 171 1495 C 224 1372 255 1230 278 1058 C 300 889 322 735 346 618 C 355 579 363 550 370 535 Z'
flounce='M 408 545 L 409 557 '+inneredge+' C 244 1530 230 1528 218 1524 C 255 1431 278 1321 295 1201 C 315 1075 327 949 338 843 C 348 748 364 646 386 570 Z'
for side,mir in [('right',False),('left',True)]:
 def f(d):
  if not mir:return d
  tok=re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)',mirror(d));res=[];k=0
  while k<len(tok):
   if tok[k].isalpha():res.append(tok[k]);k+=1
   else:
    x,y=float(tok[k]),float(tok[k+1]);res.extend([f'{x+max(0,min(18,(y-700)*18/830)):g}',f'{y:g}']);k+=2
  return ' '.join(res)
 g=group('skirt_outer_'+side,'skirts',desc='完整白外裙前片、侧转面与腰根。attach_to=skirt_outer_back 同侧侧缝及 waist_front 下缘，腰固定 (375,547)/(514,547)；draw_order=蓝中裙/白内裙前，外衣长摆在其外侧，连续荷叶翻边于裙侧从外衣内缘前方翻出。前片没有逐褶拆成独立部件，隐藏腰根和侧背相连；source=null。')
 path(g,'skirt_outer_'+side+'_surface',f(outline),'#F1F1F3')
 path(g,'skirt_outer_'+side+'_side_surface',f('M 370 535 L 385 543 C 364 668 345 821 329 962 C 304 1181 268 1391 224 1526 C 210 1524 188 1513 171 1495 C 224 1372 255 1230 278 1058 C 300 889 322 735 346 618 C 355 579 363 550 370 535 Z'),'#E3E7ED')
 line(g,'skirt_outer_'+side+'_side_seam',f('M 371 558 C 343 720 323 923 302 1098 C 281 1275 251 1421 225 1512'),'.7','#B4B9C2')
 D.before(g,'waist_front');D.clip('skirt_outer_'+side,'skirt_outer_'+side+'_surface')
 roll=group('skirt_outer_'+side+'_flounce','skirts','skirt_outer_'+side,desc='与前裙连续的整条荷叶翻边，含正面及真实折返内面；控制身份归同一前片，不把每一褶拆成部件。draw_order=外衣内缘前、纱袖后；从完整腰根延至独立下摆，真实翻转处保留尖折与负形，source=null。')
 path(roll,'skirt_outer_'+side+'_flounce_surface',f(flounce),'#F4F4F5')
 folds=[
  ('upper','M 392 635 C 379 650 348 653 353 673 C 357 694 378 711 376 732 C 372 708 356 702 346 686 C 336 666 348 652 367 645 Z'),
  ('middle_upper','M 361 779 C 367 798 394 816 401 841 C 408 868 385 892 361 910 C 340 925 324 943 330 965 C 323 942 331 914 356 898 C 382 881 397 866 389 846 C 381 823 362 811 361 779 Z'),
  ('middle','M 330 965 C 337 990 365 1010 371 1036 C 379 1067 353 1091 332 1117 C 313 1141 316 1164 330 1187 C 313 1173 305 1148 317 1124 C 329 1098 363 1072 361 1049 C 360 1018 333 1007 330 965 Z'),
  ('lower','M 330 1187 C 347 1214 345 1232 328 1259 C 311 1286 296 1317 288 1348 C 281 1374 266 1392 253 1409 C 263 1374 274 1343 290 1318 C 310 1284 335 1250 330 1225 Z'),
  ('hem','M 237 1430 C 230 1454 270 1471 284 1494 C 297 1514 285 1526 262 1528 C 276 1514 274 1504 259 1491 C 238 1471 222 1458 237 1430 Z')]
 for name,ds in folds:path(roll,'skirt_outer_'+side+'_fold_inner_'+name,f(ds),'#DDE3EB',role='real-fold-inner-surface')
 line(roll,'skirt_outer_'+side+'_flounce_roll',f('M 409 557 '+inneredge),'1.55','#FFFFFF')
 line(roll,'skirt_outer_'+side+'_flounce_edge',f('M 409 557 '+inneredge),'.58','#A6AFBD')
 line(roll,'skirt_outer_'+side+'_flow_accents',f('M 394 575 C 383 608 379 624 368 638 M 357 711 Q 365 733 356 753 M 345 921 Q 330 940 333 951 M 314 1106 C 307 1151 299 1179 294 1221 M 260 1341 Q 250 1383 241 1403'),'.75','#C1C7D0')
 # Attach the whole flounce above the inner edge of the corresponding coat,
 # without raising the entire skirt layer above sleeves or hands.
 D.before(roll,'waist_tails')
 D.node('skirt_outer_'+side+'_surface_clip').append(el('use',href='#skirt_outer_'+side+'_flounce_surface',clip_rule='evenodd'))
D.save('line_skirt_outer')
