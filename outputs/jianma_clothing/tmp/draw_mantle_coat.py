from clothing_common import *
D=Drawing('3.衣装线稿/line_inner_collar/character.svg')
coat=group('coat_back','outer_coat',desc='完整敞襟长外衣后片，后颈根、肩背、侧腰及独立长后摆均为实际布面。attach_to=inner_bodice 肩背与腰背，固定 (354,333)/(535,333)/(374,536)/(518,536)；draw_order=后发前、身体和前衣片后，后裙各层在其内。背面原图未示，按正面两侧衣量保守推断；source=null。')
path(coat,'coat_back_body_surface','M 411 302 Q 445 294 478 302 C 492 317 520 324 543 331 C 562 365 551 428 547 472 C 539 510 526 544 527 573 Q 445 608 362 573 C 363 542 351 508 344 471 C 338 426 329 366 347 332 C 372 323 399 315 411 302 Z','#E5E6E8')
hem=group('coat_back_hem','outer_coat','coat_back',desc='独立活动后衣摆，腰根 y=534–582 留真实搭接；attach_to=coat_back_body_surface 腰背，长摆与主体归同 part 而可分别控制。')
path(hem,'coat_back_hem_surface','M 367 534 Q 444 551 523 534 C 536 625 566 724 588 864 C 612 1017 650 1179 709 1313 C 744 1394 785 1451 827 1496 C 814 1523 774 1536 742 1535 C 645 1508 535 1480 446 1485 C 347 1482 235 1512 145 1534 C 118 1533 87 1520 73 1500 C 125 1458 169 1392 204 1312 C 264 1173 295 1017 313 864 C 329 724 352 625 367 534 Z','#E4E5E8')
line(hem,'coat_back_hem_edges','M 73 1500 C 87 1520 118 1533 145 1534 C 235 1512 347 1482 446 1485 C 535 1480 645 1508 742 1535 C 774 1536 814 1523 827 1496','1')
line(hem,'coat_back_hem_folds','M 385 575 C 367 802 352 1208 273 1506 M 440 588 C 434 900 442 1185 435 1485 M 504 575 C 529 812 551 1189 629 1505','.8','#A5A7AF')
coat.append(hem);D.before(coat,'pelvis')
D.clip('coat_back','coat_back_hem_surface')

mantle=group('mantle_back','shoulder_mantle',desc='完整短肩披后片，跨双肩背面、侧折返和颈后内面。attach_to=collar_back 与 inner_bodice 双肩，固定 (412,307)/(478,307)/(341,344)/(552,344)；两端接前肩披，随上臂牵动保留布量。draw_order=coat_back 前、torso/上臂后；背面按前片短肩披保守补形，无兜帽；source=null。')
path(mantle,'mantle_back_surface','M 411 303 C 426 299 463 299 478 303 C 495 316 527 321 554 331 C 578 344 591 371 594 398 C 578 415 565 426 544 439 Q 497 456 445 452 Q 394 456 347 439 C 326 426 313 415 296 398 C 300 371 311 344 337 331 C 364 321 396 316 411 303 Z','#E9E9EB')
path(mantle,'mantle_back_neck_facing','M 411 303 C 426 311 463 311 478 303 L 493 315 C 468 329 420 329 396 315 Z','#D9DCDF')
line(mantle,'mantle_back_lower_roll','M 296 398 C 314 414 326 426 347 439 Q 394 456 445 452 Q 497 456 544 439 C 565 426 578 415 594 398','.95')
D.before(mantle,'inner_bodice_back');D.clip('mantle_back','mantle_back_surface')

coat_outline='M 395 321 C 380 324 357 328 342 336 C 341 364 345 385 346 411 C 344 455 344 499 337 544 C 325 625 310 714 298 808 C 277 994 246 1181 194 1327 C 160 1421 111 1480 34 1501 C 27 1510 37 1525 63 1530 C 93 1563 119 1575 149 1563 C 208 1534 253 1513 278 1471 C 295 1357 307 1228 323 1105 C 341 965 349 829 370 704 C 380 646 386 590 383 552 C 382 506 396 449 399 415 C 402 381 402 347 395 321 Z'
coat_front_inner='M 394 331 C 390 359 387 383 382 406 C 388 448 386 486 376 530 C 367 571 352 603 330 626 C 350 614 373 596 387 573 C 390 548 387 529 390 505 C 395 471 402 443 404 410 C 408 379 403 351 394 331 Z'
coat_lapel='M 395 321 C 395 340 388 354 386 371 C 383 387 378 399 380 416 C 382 435 380 465 373 485 C 382 479 389 472 396 460 C 401 430 402 402 408 378 C 410 354 407 337 395 321 Z'
for side,mir in [('right',False),('left',True)]:
 f=lambda d:mirror(d) if mir else d
 g=group('coat_front_'+side,'outer_coat',desc=f'角色{side}侧敞襟长前片；连续肩胸、侧腰及外侧拖摆，内翻面单独实体，活动长摆有自控身份。attach_to=coat_back 肩侧及 inner_bodice 胸腰；肩 (342,336)/(547,336)，腰 (376,530)/(513,530)。draw_order=内搭前、肩披前片后，后续裙前摆覆盖内缘而白长衣摆保留外侧；腰结/胸饰在其前，发束位置不变。内侧被饰物与裙覆盖区域完整；source=null。')
 path(g,'coat_front_'+side+'_surface',f(coat_outline),stroke='#9A9DA6',width='1')
 inner=group('coat_front_'+side+'_turn','outer_coat','coat_front_'+side,desc='独立翻襟及侧厚；固定于相应前襟胸腰内缘，侧向转动时可显露完整内面。')
 path(inner,'coat_front_'+side+'_inner_surface',f(coat_front_inner),'#DADDDF')
 path(inner,'coat_front_'+side+'_lapel_surface',f(coat_lapel),'#F6F5F3',stroke='#A7A9B0',width='.7')
 line(inner,'coat_front_'+side+'_lapel_roll',f('M 396 333 C 401 356 400 379 395 407 C 391 439 388 462 380 478'),'.75')
 g.append(inner)
 lower=group('coat_front_'+side+'_lower_folds','outer_coat','coat_front_'+side,desc='长前衣摆的可编辑纵向折面，从侧腰隐藏延入外裙后；随对应前襟下摆同动。')
 path(lower,'coat_front_'+side+'_long_turn',f('M 335 609 C 317 788 294 968 257 1178 C 232 1336 182 1456 121 1523 C 106 1537 86 1539 63 1530 C 93 1563 119 1575 149 1563 C 211 1490 243 1367 270 1214 C 298 1054 316 857 342 701 Z'),'#E7E8EB')
 line(lower,'coat_front_'+side+'_flow_lines',f('M 345 600 C 318 817 300 1051 262 1241 C 229 1401 189 1509 149 1563 M 329 796 C 310 983 289 1196 246 1367 M 214 1385 C 174 1471 122 1526 84 1544'),'.8','#B0B2B9')
 g.append(lower);D.before(g,'upper_arm_right');D.clip('coat_front_'+side,'coat_front_'+side+'_surface')

mantle_outline='M 411 308 C 405 318 399 324 391 329 C 377 324 358 327 340 332 C 322 337 310 348 304 366 C 298 380 295 398 295 413 C 306 416 315 411 323 404 C 334 393 340 388 350 388 C 362 385 375 376 385 368 C 389 372 395 371 400 366 L 393 357 C 397 348 402 342 410 337 L 401 328 Z'
for side,mir in [('right',False),('left',True)]:
 f=lambda d:mirror(d) if mir else d
 g=group('mantle_front_'+side,'shoulder_mantle',desc='完整肩披前片与隐藏肩臂双连接。attach_to=mantle_back 同侧肩、inner_bodice 锁骨及 upper_arm_'+side+' 肩顶；锁骨固定点 (402,324)/(487,324)，肩端固定点 (342,339)/(547,339)，袖根滑移余量 y=346–397。draw_order=coat_front / inner_bodice 与上臂前，前发及胸饰后。短肩披外缘按原图，腋侧补隐藏连续面；source=null。')
 path(g,'mantle_front_'+side+'_surface',f(mantle_outline),stroke='#8C909B',width='1')
 path(g,'mantle_front_'+side+'_underturn',f('M 305 381 C 312 360 325 348 341 345 C 342 365 339 382 330 392 C 319 402 309 410 295 413 C 295 402 299 392 305 381 Z'),'#E4E6E9')
 path(g,'mantle_front_'+side+'_inner_flap',f('M 391 329 L 401 328 L 410 337 C 402 342 397 348 393 357 L 400 366 C 395 371 389 372 385 368 L 378 369 C 383 362 386 354 384 347 Z'),'#F6F5F4',stroke='#AAACB4',width='.7')
 line(g,'mantle_front_'+side+'_shoulder_drape',f('M 395 323 C 374 331 350 329 331 339 C 317 346 309 358 306 369 M 335 347 C 340 357 344 365 349 371 C 356 366 364 362 371 357'),'.85','#B0B2BB')
 line(g,'mantle_front_'+side+'_fold_marks',f('M 322 353 Q 329 358 332 367 M 351 336 C 361 338 370 342 375 349 M 303 387 Q 309 386 315 380 M 360 378 Q 368 375 373 370'),'.7','#ADAFB8')
 D.after(g,'forearm_left');D.clip('mantle_front_'+side,'mantle_front_'+side+'_surface')

D.save('line_mantle_coat')
