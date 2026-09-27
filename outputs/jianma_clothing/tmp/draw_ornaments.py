from clothing_common import *
import math
D=Drawing('3.衣装线稿/line_skirt_outer/character.svg')
def ornament(i,desc,part=None):
 g=group(i,'ornaments',part,desc);g.set('data-kind','physics_details');return g
def oval(g,i,x,y,rx,ry,fill='#D2D9E3',stroke='#8994A3',sw='.75',**a):
 n=el('ellipse',id=i,cx=x,cy=y,rx=rx,ry=ry,fill=fill,stroke=stroke,stroke_width=sw,**a);g.append(n);return n
chest=ornament('chest_ornament','完整胸前蓝银硬饰，包含领下小冠、胸口双翼、中心宝石、银质托座与下缘卷脚。attach_to=inner_bodice 胸口固定 (413,403)/(474,403)/(444,414)，上冠在前领间 (444,329)；背座完整，前发可跨饰面。draw_order=前领根/内搭/外衣襟前，前发后；source=null，不与既有 forehead_jewel 合并。')
path(chest,'chest_ornament_back_mount','M 395 377 C 413 370 421 378 426 389 C 433 402 437 408 444 410 C 453 405 459 397 462 385 C 469 377 480 373 494 377 L 501 416 C 482 434 463 436 444 430 C 425 436 406 434 387 416 Z','#C1C8D2')
upper=ornament('chest_ornament_upper_crest','领下独立小冠及完整背部连接耳，attach_to=前领根两侧；和主体共用胸饰身份。','chest_ornament')
path(upper,'chest_ornament_neck_silver_mount','M 444 305 C 438 316 436 321 427 322 C 428 328 422 331 413 333 C 420 338 425 335 430 337 C 429 340 424 341 420 340 C 427 346 436 343 442 347 L 444 353 L 447 347 C 453 343 462 346 469 340 C 465 341 460 340 459 337 C 464 335 469 338 476 333 C 467 331 461 328 462 322 C 452 321 450 315 444 305 Z','#DCE0E6',stroke='#7F8998',width='.9')
path(upper,'chest_ornament_neck_gem_wings','M 444 313 C 440 320 433 320 431 326 C 429 331 433 337 438 339 L 444 334 L 451 340 C 457 336 461 330 458 325 C 455 319 448 319 444 313 Z','#B8C4D4',stroke='#8B99AD',width='.7')
path(upper,'chest_ornament_neck_gem','M 444 318 L 450 329 L 444 343 L 438 329 Z','#C9D6E6',stroke='#748699',width='.7')
line(upper,'chest_ornament_neck_facets','M 444 318 L 444 343 M 438 329 L 444 332 L 450 329','.55','#E7EDF5')
path(upper,'chest_ornament_upper_drop','M 444 348 C 439 354 440 358 444 361 C 448 358 449 354 444 348 Z','#BDC9D9',stroke='#909EAF',width='.65')
chest.append(upper)
wing='M 441 351 C 428 364 418 371 420 381 C 421 390 434 394 432 405 C 430 412 423 414 425 422 C 415 416 409 409 398 408 C 383 408 374 400 372 388 C 370 381 373 377 374 372 C 368 369 367 361 371 355 C 378 365 384 361 389 360 C 386 367 381 373 385 380 C 391 389 404 383 413 377 C 423 369 433 359 441 351 Z'
silver='M 380 399 C 391 398 401 404 407 409 C 414 413 420 409 426 411 C 436 412 438 419 444 427 C 437 434 430 443 421 438 C 411 432 412 423 403 423 C 394 423 389 431 380 431 C 382 420 384 408 380 399 Z'
for side,mir in [('right',False),('left',True)]:
 f=lambda d:mirror(d,444) if mir else d
 g=ornament('chest_ornament_wing_'+side,'蓝银翼完整前面与侧厚；随硬座同动，衣料底面在它后方保留。','chest_ornament')
 path(g,'chest_ornament_'+side+'_silver_base',f(silver),'#DBE0E7',stroke='#838E9E',width='.9')
 path(g,'chest_ornament_'+side+'_wing_side',f(wing),'#B8C2D1',stroke='#8391A4',width='1')
 path(g,'chest_ornament_'+side+'_wing_face',f('M 438 356 C 425 369 415 377 418 388 C 421 397 432 399 429 405 C 423 407 419 411 423 416 C 414 410 407 404 397 403 C 383 404 376 396 376 386 C 375 380 380 376 378 372 C 385 368 389 366 389 360 C 386 373 389 380 397 380 C 411 379 426 367 438 356 Z'),'#D1DAE5')
 line(g,'chest_ornament_'+side+'_wing_scroll',f('M 436 360 C 422 373 413 380 415 389 C 417 399 429 399 429 405 M 394 372 C 381 390 392 398 410 397 C 419 396 424 399 424 403 M 381 385 C 380 395 390 400 399 399'),'.85','#F7F9FB')
 line(g,'chest_ornament_'+side+'_silver_scroll',f('M 384 426 C 394 427 399 415 407 417 C 417 419 415 432 424 433 C 432 434 435 424 430 420 C 425 416 419 421 421 426 C 423 431 429 427 427 424'),'1.8','#9AA5B4')
 line(g,'chest_ornament_'+side+'_silver_scroll_light',f('M 384 426 C 394 427 399 415 407 417 C 417 419 415 432 424 433 C 432 434 435 424 430 420 C 425 416 419 421 421 426'),'.8','#F7F9FB')
 path(g,'chest_ornament_'+side+'_lower_leaf',f('M 409 431 C 399 425 395 432 398 442 C 400 451 398 459 392 465 C 403 461 410 452 410 444 C 410 438 414 435 417 437 L 414 449 C 423 442 421 435 416 431 Z'),'#E2E5EA',stroke='#949EAD',width='.75')
 line(g,'chest_ornament_'+side+'_pearl_rim',f('M 386 368 C 395 363 409 357 421 354 C 430 353 437 351 441 351'),'1.15','#DDE3EB')
 for j,(x,y) in enumerate([(394,361),(405,358),(417,355)]):
  xx=888-x if mir else x;oval(g,'chest_ornament_'+side+'_rim_pearl_'+str(j),xx,y,2,2.7,'#E8EAEE','#ABB3BF','.6')
 chest.append(g)
path(chest,'chest_ornament_center_socket','M 444 386 L 453 402 L 459 411 C 455 423 451 430 444 437 C 436 430 432 423 429 411 L 436 400 Z','#CCD4DF',stroke='#8190A2',width='.9')
path(chest,'chest_ornament_center_gem','M 444 394 L 452 410 L 444 427 L 436 410 Z','#C4D3E5',stroke='#7E91AA',width='.8')
path(chest,'chest_ornament_center_gem_facet','M 444 394 L 444 414 L 436 410 Z','#E4EBF3')
line(chest,'chest_ornament_center_gem_edge','M 444 394 L 452 410 L 444 427 L 436 410 Z','.75','#DDE7F4')
D.before(chest,'hair_crown_complete_cap')

anchor=ornament('pendant_anchor','完整腰下金属固定座与背面挂带；上座固定于 waist_knot 下缘 (443,548)，柔软背带完整延至花座 (438,687)，随腰固定点垂落。花座正面、侧厚与背扣均完整，链从其挂眼穿过而保持连续；draw_order=腰带/双尾/蓝裙前，软链根与硬花座合理穿插；source=null。')
path(anchor,'pendant_anchor_hanging_tape','M 441 548 C 439 584 437 625 436 683 L 440 683 C 441 626 444 584 446 548 Z','#E4E6EC',stroke='#AFB7C4',width='.45')
path(anchor,'pendant_anchor_waist_mount','M 437 546 Q 443 542 450 546 L 449 555 L 443 562 L 437 555 Z','#E4E7EC',stroke='#919CAC',width='.8')
line(anchor,'pendant_anchor_mount_wrap','M 438 549 L 448 549 M 439 553 L 447 553','.7','#A0ABB9')
oval(anchor,'pendant_anchor_back_hook',438,685,8,17,'#C1C9D5','#8995A5','.7')
star='M 438 665 L 444 677 C 450 671 453 671 454 678 L 452 684 L 462 681 L 458 689 L 448 693 L 451 698 L 457 704 L 448 703 L 443 713 L 438 704 L 432 713 L 429 703 L 420 708 L 424 697 L 415 695 L 423 689 L 419 681 L 429 684 L 426 678 C 426 672 431 673 433 677 Z'
path(anchor,'pendant_anchor_flower_side',star,'#BBC4D0',stroke='#8390A2',width='.9')
path(anchor,'pendant_anchor_flower_face','M 438 670 L 442 681 L 449 676 L 447 687 L 455 685 L 447 691 L 450 700 L 442 695 L 438 707 L 434 696 L 425 702 L 430 691 L 421 689 L 431 686 L 430 678 L 435 683 Z','#E5E9EF',stroke='#9CA7B6',width='.65')
path(anchor,'pendant_anchor_flower_core','M 438 682 L 444 689 L 438 699 L 432 689 Z','#CBD5E2',stroke='#8898AB',width='.65')
oval(anchor,'pendant_anchor_bottom_eye',438,712,2.6,3.5,'none','#9BA6B5','.9')
D.before(anchor,'hair_crown_complete_cap')

chain=ornament('pendant_chain','从腰挂眼到硬珠的完整软链和小珠连接，实际路径在花座和小叶饰后连续。attach_to=pendant_anchor 腰端/花座挂眼，并连接 pendant_beads 上方水滴；draw_order=蓝裙/腰尾前，花座硬面前后局部穿过。整链同组随动，不逐珠拆控；source=null。')
line(chain,'pendant_chain_complete_core','M 443 557 C 438 587 437 615 438 642 C 440 663 438 686 438 713 C 437 752 438 791 438 832 C 439 851 438 870 438 884','1.5','#B1B9C5')
line(chain,'pendant_chain_edge','M 443 557 C 438 587 437 615 438 642 C 440 663 438 686 438 713 C 437 752 438 791 438 832','.55','#F8FAFC')
path(chain,'pendant_chain_leaf_mount','M 429 624 C 432 631 437 630 438 635 C 441 629 444 629 446 624 C 449 634 444 643 438 646 C 432 642 426 634 429 624 Z','#DEE3EC',stroke='#8F9CAD',width='.7')
for j,(y,rx,ry) in enumerate([(597,2,3),(616,2.3,3),(648,3,4.5),(660,2,2.5),(719,3.3,4.5),(751,2.8,3.5),(761,3.8,4.8),(775,4.8,6.3),(786,2.1,3.2),(820,2.6,3.2),(831,2.5,3.2),(877,3,4)]):
 oval(chain,'pendant_chain_small_bead_'+str(j),438,y,rx,ry,'#DCE4EE','#93A0B1','.65')
# Fine paired ornamental cords start beneath the chest, distinct from the rigid
# chest crest and from the long central pendant's support.
for side,mir in [('right',False),('left',True)]:
 ds='M 427 437 C 426 493 420 551 416 593';ds=mirror(ds,441) if mir else ds
 line(chain,'pendant_chain_side_cord_'+side,ds,'1.55','#ECEFF4')
 line(chain,'pendant_chain_side_cord_edge_'+side,ds,'.35','#ABB5C4')
 oval(chain,'pendant_chain_side_cord_end_'+side,466 if mir else 416,594,1.6,3.6,'#DFE4EB','#ACB6C3','.5')
# The chain spans behind the flower; its foreground exposed sections stay visible
# through the actual cutouts. Reorder anchor's hard flower above the chain below.
D.before(chain,'pendant_anchor')

beads=ornament('pendant_beads','完整硬质水滴坠、三枚圆珠与连接孔，软链和硬珠材质分控。attach_to=pendant_chain 下端；珠心 (438,896)/(438,933)/(438,966)，上水滴 (438,852)；各珠含完整侧背和前面，连接托圈位于球体前后。draw_order=蓝裙前，流苏结位于最下珠下方；source=null。')
path(beads,'pendant_beads_upper_drop_socket','M 438 833 C 435 842 428 850 429 859 C 429 868 434 872 438 873 C 443 872 449 868 449 859 C 449 850 441 842 438 833 Z','#E0E5ED',stroke='#8897AB',width='.85')
path(beads,'pendant_beads_upper_drop_gem','M 438 842 C 434 850 432 853 432 859 Q 438 873 445 859 C 445 853 442 848 438 842 Z','#CAD6E6',stroke='#9DACBE',width='.65')
path(beads,'pendant_beads_upper_drop_facet','M 438 845 L 441 858 L 437 865 L 434 858 Z','#EEF3F8')
for j,(y,r) in enumerate([(896,19),(933,16),(966,15)]):
 bg=ornament('pendant_beads_sphere_'+str(j+1),'完整圆珠前后表面和银托，球体沿软连接独立随动；侧背面有实际实体。','pendant_beads')
 oval(bg,'pendant_beads_sphere_'+str(j+1)+'_back',438,y,r+1,r+1,'#AFBBCE','#8493AA','.85')
 oval(bg,'pendant_beads_sphere_'+str(j+1)+'_front',438,y-1,r-1,r-1,'#C8D4E5','#A0AEC1','.55')
 path(bg,'pendant_beads_sphere_'+str(j+1)+'_side',f'M {438+r-4} {y-r+4} C {438+r+2} {y-3} {438+r-1} {y+r-2} 436 {y+r} C {438+r-7} {y+4} {438+r-7} {y-5} {438+r-4} {y-r+4} Z','#B3BFD3')
 path(bg,'pendant_beads_sphere_'+str(j+1)+'_clasp',f'M 438 {y-r-3} C 433 {y-r+2} 433 {y-7} 435 {y-2} L 438 {y+5} L 441 {y-2} C 443 {y-7} 443 {y-r+2} 438 {y-r-3} Z','#E4E8EF',stroke='#96A2B4',width='.55')
 oval(bg,'pendant_beads_sphere_'+str(j+1)+'_hole',438,y+r-2,2.4,3.3,'#E6ECF5','#A1AEC1','.55')
 beads.append(bg)
 for yy in [y-r-4,y+r+3]:oval(beads,'pendant_beads_link_'+str(j)+'_'+str(yy),438,yy,2.2,2.7,'#DFE5EE','#96A4B8','.65')
path(beads,'pendant_beads_bottom_connector','M 438 981 C 433 987 433 992 438 997 C 443 992 443 987 438 981 Z','#DDE4ED',stroke='#929FB1',width='.7')
D.before(beads,'hair_crown_complete_cap')

tassel=ornament('pendant_tassel','完整下端丝束，含结后固定面、软翼结、丝线前后束及渐长末端；attach_to=pendant_beads 最下连接 (438,992)。线束从 y=1004 延至 y≈1409，丝隙透出蓝裙，不逐丝拆成控制部件；draw_order=蓝裙正前；source=null。')
path(tassel,'pendant_tassel_back_root','M 430 999 L 446 999 L 449 1015 L 426 1015 Z','#C5CFDD')
path(tassel,'pendant_tassel_translucent_bundle','M 428 1006 L 445 1007 C 447 1122 449 1274 454 1412 C 439 1402 421 1382 407 1366 C 414 1222 420 1091 428 1006 Z','#E7EBF2',opacity='.30')
for j in range(21):
 x0=427+j*.9;x1=407+j*2.25;yend=1365+j*2.3
 ds=f'M {x0:g} 1005 C {x0-4:g} 1114 {x1+3:g} 1278 {x1:g} {yend:g}'
 line(tassel,'pendant_tassel_thread_'+str(j),ds, '.8' if j%3 else '1.3','#F5F6F9' if j%2 else '#CCD4E1')
path(tassel,'pendant_tassel_knot_right','M 437 992 C 433 997 428 1001 419 1004 L 418 1013 L 425 1010 L 437 1000 Z','#BECBDD',stroke='#8699B2',width='.7')
path(tassel,'pendant_tassel_knot_left','M 439 992 C 443 997 449 1001 457 1005 L 456 1014 L 449 1010 L 439 1000 Z','#BECBDD',stroke='#8699B2',width='.7')
path(tassel,'pendant_tassel_knot_center','M 435 991 L 441 991 L 442 1002 L 437 1008 L 433 1001 Z','#D9E2EE',stroke='#92A3B9',width='.6')
D.before(tassel,'hair_crown_complete_cap')

# Relocate existing front ankle-jewelry nodes without changing their geometry,
# metadata, resources or ownership. Opaque skirts now naturally occlude the top.
for sid in ['foot_chain_right','foot_chain_left']:
 n=D.node(sid);D.root.remove(n);D.before(n,'skirt_inner_front')

# Preserve complete material receivers for the new hard entities.
for part,shapes in {
 'chest_ornament':['chest_ornament_back_mount','chest_ornament_neck_silver_mount','chest_ornament_right_wing_side','chest_ornament_left_wing_side','chest_ornament_right_silver_base','chest_ornament_left_silver_base','chest_ornament_center_socket','chest_ornament_right_lower_leaf','chest_ornament_left_lower_leaf'],
 'pendant_anchor':['pendant_anchor_waist_mount','pendant_anchor_flower_side'],
 'pendant_beads':['pendant_beads_upper_drop_socket','pendant_beads_sphere_1_back','pendant_beads_sphere_2_back','pendant_beads_sphere_3_back','pendant_beads_bottom_connector']
}.items():
 D.clip(part,shapes[0])
 for sid in shapes[1:]:D.node(part+'_surface_clip').append(el('use',href='#'+sid,clip_rule='evenodd'))
D.save('line_ornaments')
