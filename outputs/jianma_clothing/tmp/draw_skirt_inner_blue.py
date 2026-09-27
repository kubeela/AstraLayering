from clothing_common import *
D=Drawing('3.衣装线稿/line_waist/character.svg')
ib=group('skirt_inner_back','skirts',desc='独立完整白内裙后片；腰后、腿后包围面、左右侧与后摆连续。attach_to=pelvis 后腰 (376,543)/(516,543)，侧缝接 skirt_inner_front；draw_order=coat_back / 蓝裙后片内侧，双腿后。隐藏裆部与腿根区域补足，不删身体；source=null，后幅依正面布量保守推断。')
path(ib,'skirt_inner_back_surface','M 375 538 Q 445 550 516 538 C 537 603 544 683 548 767 C 561 1009 579 1251 607 1466 C 589 1481 560 1493 536 1493 Q 445 1505 351 1493 C 326 1492 300 1483 282 1470 C 310 1251 328 1009 342 767 C 347 682 354 602 375 538 Z','#E1E3E7')
line(ib,'skirt_inner_back_folds','M 398 558 C 380 773 380 1245 350 1493 M 443 561 C 439 938 447 1240 442 1500 M 493 558 C 512 773 512 1245 536 1493','.7','#AAAFB8')
line(ib,'skirt_inner_back_hem','M 282 1470 C 300 1483 326 1492 351 1493 Q 445 1505 536 1493 C 560 1493 589 1481 607 1466','.9')
D.before(ib,'pelvis');D.clip('skirt_inner_back','skirt_inner_back_surface')
bb=group('skirt_blue_back','skirts',desc='独立完整蓝中裙后片，从腰背绕腿后到独立下摆。attach_to=pelvis 后腰 (381,540)/(510,540)，接 skirt_blue_front 两侧；draw_order=coat_back 内、skirt_inner_back 外，白外裙后片内。后宽按前片和裙量保守补全，不与其它后摆合并；source=null。')
path(bb,'skirt_blue_back_surface','M 381 538 Q 446 549 510 538 C 533 641 543 775 552 926 C 561 1146 582 1332 599 1462 C 576 1480 539 1497 511 1498 C 480 1501 465 1494 445 1497 C 419 1505 389 1500 362 1497 C 334 1492 314 1479 296 1463 C 316 1326 332 1145 341 926 C 350 775 360 641 381 538 Z','#C3CBD7')
line(bb,'skirt_blue_back_fold_lines','M 400 555 C 382 794 376 1216 355 1478 M 444 557 C 439 872 446 1206 444 1497 M 488 555 C 515 794 514 1224 548 1477','.8','#9AA5B5')
line(bb,'skirt_blue_back_hem','M 296 1463 C 314 1479 334 1492 362 1497 C 389 1500 419 1505 445 1497 C 465 1494 480 1501 511 1498 C 539 1497 576 1480 599 1462','.9')
D.before(bb,'skirt_inner_back');D.clip('skirt_blue_back','skirt_blue_back_surface')

front=group('skirt_inner_front','skirts',desc='白内裙完整前幅，从腰根盖过双腿延到近踝；左右侧接后幅，裙口内折为独立实体。attach_to=pelvis 前腰、skirt_inner_back 侧缝；draw_order=腿前、蓝裙和白外裙后，腰带覆盖 y=538–558 根部。中心虽被蓝裙盖住仍连续；source=null。')
inner='M 374 539 Q 444 550 518 539 C 532 594 537 680 543 766 C 558 1006 572 1230 585 1467 L 580 1503 C 566 1516 553 1515 543 1511 C 531 1520 518 1518 508 1513 C 493 1520 481 1517 470 1516 C 457 1524 446 1522 434 1517 C 420 1522 406 1518 394 1513 C 380 1517 368 1512 357 1509 C 342 1510 327 1505 314 1503 L 304 1495 C 320 1243 329 1006 344 766 C 351 680 357 594 374 539 Z'
path(front,'skirt_inner_front_surface',inner,'#F1F1F2')
path(front,'skirt_inner_front_left_fold','M 501 550 C 518 740 524 937 534 1137 C 543 1311 550 1431 552 1514 L 579 1503 C 565 1267 555 1033 541 777 C 536 681 528 603 518 539 Z','#E4E7EC')
path(front,'skirt_inner_front_right_fold','M 388 549 C 372 740 366 937 356 1137 C 347 1311 340 1422 342 1508 L 314 1503 L 304 1495 C 320 1243 329 1006 344 766 C 351 680 357 594 374 539 Z','#E3E6EB')
path(front,'skirt_inner_front_hem_inner','M 304 1487 Q 330 1497 357 1498 Q 396 1510 434 1507 Q 481 1511 508 1503 Q 550 1512 582 1492 L 580 1503 C 566 1516 553 1515 543 1511 C 531 1520 518 1518 508 1513 C 493 1520 481 1517 470 1516 C 457 1524 446 1522 434 1517 C 420 1522 406 1518 394 1513 C 380 1517 368 1512 357 1509 C 342 1510 327 1505 314 1503 L 304 1495 Z','#E5E7EC')
line(front,'skirt_inner_front_long_pleats','M 390 564 C 377 763 377 1011 362 1234 C 355 1351 349 1439 351 1498 M 409 562 C 399 784 402 1041 395 1271 L 394 1501 M 429 564 C 423 803 424 1166 424 1508 M 463 564 C 469 803 468 1166 470 1509 M 484 562 C 495 784 492 1041 498 1271 L 508 1503 M 503 564 C 517 763 518 1011 530 1234 C 537 1351 541 1446 543 1508','.75','#AFB4BD')
line(front,'skirt_inner_front_hem_line','M 304 1495 L 314 1503 C 327 1505 342 1510 357 1509 C 368 1512 380 1517 394 1513 C 406 1518 420 1522 434 1517 C 446 1522 457 1524 470 1516 C 481 1517 493 1520 508 1513 C 518 1518 531 1520 543 1511 C 553 1515 566 1516 580 1503','.9')
D.before(front,'coat_front_right');D.clip('skirt_inner_front','skirt_inner_front_surface')

blue=group('skirt_blue_front','skirts',desc='正中蓝色长裙前幅，腰至近踝单片连续，两侧和翻起下摆内面独立。attach_to=skirt_blue_back 腰侧与 waist_front 下缘，固定 (405,548)/(489,548)；draw_order=白内裙前、白外裙开口后，腰带/双尾/裙坠在其前。保留饰物和外裙后被遮的完整中段；不把长流苏画进裙面；source=null。')
blue_d='M 402 538 Q 445 549 490 538 C 496 669 502 824 509 982 C 515 1125 523 1251 530 1329 C 513 1338 495 1343 483 1354 C 476 1373 463 1392 450 1405 C 439 1416 444 1422 458 1428 C 477 1436 493 1442 497 1457 C 500 1472 474 1485 461 1501 C 454 1510 451 1520 451 1531 C 446 1533 442 1530 438 1527 C 420 1511 413 1475 400 1450 L 400 1370 C 389 1354 376 1343 363 1337 C 373 1250 380 1124 387 982 C 394 824 397 669 402 538 Z'
path(blue,'skirt_blue_front_surface',blue_d,'#D2D9E2')
path(blue,'skirt_blue_front_right_fold','M 403 558 C 399 801 391 1103 385 1307 L 363 1337 C 376 1343 389 1354 400 1370 C 402 1156 409 857 416 557 Z','#BEC8D6')
path(blue,'skirt_blue_front_left_fold','M 479 551 C 486 779 493 1062 504 1300 L 530 1329 C 513 1338 495 1343 483 1354 C 476 1373 463 1392 450 1405 C 462 1191 460 863 464 553 Z','#C2CCD9')
path(blue,'skirt_blue_front_lower_turn_right','M 366 1294 C 383 1308 399 1313 415 1320 L 400 1370 C 389 1354 376 1343 363 1337 Z','#B8C3D3',stroke='#A3AEBD',width='.65')
path(blue,'skirt_blue_front_lower_turn_left','M 526 1295 C 509 1310 490 1322 483 1333 L 483 1354 C 495 1343 513 1338 530 1329 Z','#B6C1D1',stroke='#A3AEBD',width='.65')
path(blue,'skirt_blue_front_bottom_inner','M 450 1405 C 439 1416 444 1422 458 1428 C 477 1436 493 1442 497 1457 C 500 1472 474 1485 461 1501 C 454 1510 451 1520 451 1531 L 435 1514 C 447 1489 472 1470 478 1454 C 466 1435 449 1439 445 1424 Q 441 1414 450 1405 Z','#BBC6D5')
line(blue,'skirt_blue_front_vertical_pleats','M 415 558 C 410 805 409 1045 404 1266 M 435 563 C 432 906 433 1190 435 1499 M 455 561 C 458 820 455 1087 459 1358 M 481 562 C 487 803 493 1114 503 1284','.8','#A3ADBB')
line(blue,'skirt_blue_front_hem_edge','M 363 1337 C 376 1343 389 1354 400 1370 L 400 1450 C 413 1475 420 1511 438 1527 C 442 1530 446 1533 451 1531 C 451 1520 454 1510 461 1501 C 474 1485 500 1472 497 1457 C 493 1442 477 1436 458 1428 C 444 1422 439 1416 450 1405 C 463 1392 476 1373 483 1354 C 495 1343 513 1338 530 1329','1','#929DAE')
D.before(blue,'coat_front_right');D.clip('skirt_blue_front','skirt_blue_front_surface')
# The belt must occlude the now-materialized skirt waist. Move only its existing
# root; identity, geometry, resources, and transforms are retained unchanged.
wf=D.node('waist_front');D.root.remove(wf);D.before(wf,'coat_front_right')
D.save('line_skirt_inner_blue')
