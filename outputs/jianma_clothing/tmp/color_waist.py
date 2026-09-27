from color_common import *
D=Color('5.分批着色与成稿/color_gauze_sleeves/character.svg')

D.setfill('waist_back_surface',D.grad('outfit_waist_back_base',357,0,537,0,[(0,'#B4C9E0'),(.27,'#E5EFF9'),(.6,'#ECF3FA'),(1,'#B7CEE5')]))
D.setfill('waist_back_upper_turn',D.grad('outfit_waist_back_turn',0,481,0,506,[(0,'#94B1D0'),(.55,'#CFDFF0'),(1,'#ECF4FB')]))
D.recolor_lines('waist_back','#96ACC8','.62','.63')
D.mark('waist_back','隐藏后环铺完整不透明白织带，侧弯变冷；蓝白叠带材料延续前腰，背向受光保守推断。')
bm=D.intrinsic('waist_back')
path(bm,'waist_back_center_blue','M 362 517 C 400 504 495 504 531 517 L 528 530 C 492 518 402 518 365 530 Z',D.grad('outfit_waist_back_blue',357,0,537,0,[(0,'#487BAE'),(.3,'#6395C4'),(.7,'#6D9ECC'),(1,'#497EB1')]))

D.setfill('waist_front_surface','#EDF5FB')
white=D.grad('outfit_waist_front_white',357,0,537,0,[(0,'#D0E0F0'),(.22,'#E3EFF9'),(.48,'#F9FCFF'),(.73,'#EDF5FB'),(1,'#C9DDF0')])
D.setfill('waist_front_top_band',white)
D.setfill('waist_front_lower_band',D.grad('outfit_waist_front_lower_white',0,533,0,561,[(0,'#C5D8EB'),(.26,'#E4EFF9'),(.61,'#F7FBFE'),(1,'#D7E6F4')]))
D.setfill('waist_front_center_band',D.grad('outfit_waist_front_center_blue',357,0,537,0,[(0,'#4684BF'),(.3,'#65A4D7'),(.52,'#79B5DF'),(.78,'#65A4D7'),(1,'#4583BA')]))
for side in ['right','left']:
 D.setfill('waist_front_side_'+side+'_turn',D.grad('outfit_waist_front_'+side+'_turn',0,495,0,561,[(0,'#D6E4F2'),(.38,'#BFD5EA'),(.385,'#4E86B9'),(.59,'#487DAC'),(.595,'#C0D6E9'),(1,'#CCDFF0')]))
D.recolor_lines('waist_front','#85A5C7','.62','.62')
wm=D.intrinsic('waist_front')
path(wm,'waist_front_upper_bias_fold','M 387 501 C 402 508 415 515 433 519 C 416 518 400 513 387 507 Z M 454 519 C 468 512 482 505 497 501 L 493 507 C 479 511 467 518 454 519 Z','#BDD2E9',opacity='.58')
path(wm,'waist_front_lower_bias_fold','M 388 549 C 402 542 415 541 431 541 C 414 545 402 549 392 555 Z M 460 543 C 479 545 491 551 505 553 L 503 556 C 486 554 476 550 460 543 Z','#C3D8ED',opacity='.63')
path(wm,'waist_front_center_upper_piping','M 364 521 Q 445 527 529 522','none','#A3D4F1','.9','woven-band-light')
path(wm,'waist_front_center_lower_piping','M 366 533 Q 445 538 527 533','none','#4684BF','1.15','woven-band-edge')
path(wm,'waist_front_lower_light_edge','M 370 555 Q 445 563 522 555','none','#FBFDFF','1.1','material-edge-highlight',stroke_opacity='.86')
for j,y in enumerate([509,512,515,543,546,549]):
 path(wm,'waist_front_weave_'+str(j),f'M 378 {y} Q 443 {y+5} 512 {y}','none','#EBF5FD','.32','woven-thread',stroke_opacity='.64')
D.mark('waist_front','16/17为中间蓝织带与深蓝细界，18为上下白叠带；水平腰围宽光、斜向压褶、窄纺织亮线分别塑形。结下与侧端底布连续完整，未改变叠带边界。')

for side in ['right','left']:
 p='waist_tail_'+side;short=side=='right';xmin,xmax=(421,444) if short else (442,468)
 D.setfill(p+'_back_surface',D.grad('outfit_'+p+'_back',xmin,0,xmax,0,[(0,'#4877A9'),(.4,'#608CBC'),(.7,'#709BC4'),(1,'#416F9D')]))
 D.setfill(p+'_surface',D.grad('outfit_'+p+'_front',xmin,0,xmax,0,[(0,'#4C7EAD'),(.23,'#6F9CC9'),(.48,'#91BADD'),(.67,'#77A6D0'),(1,'#517FAE')]))
 D.setfill(p+'_inner_fold',D.grad('outfit_'+p+'_inner_fold',0,620 if short else 677,0,646 if short else 710,[(0,'#759FC7'),(.55,'#608CBC'),(1,'#426D9B')]))
 D.node(p+'_surface').set('stroke','#648AB6');D.node(p+'_surface').set('stroke-width','.6')
 D.recolor_lines(p,'#416F9D','.55','.57')
 mat=D.intrinsic(p)
 if short:
  bright='M 435 548 C 431 568 434 583 430 603 C 428 615 427 625 429 634 L 431 634 C 430 615 436 596 435 580 C 434 567 437 555 438 548 Z'
  shade='M 427 554 C 423 574 428 590 424 610 L 426 620 C 430 599 429 578 430 558 Z'
  thread='M 437 549 C 432 573 436 586 431 612 C 429 624 430 630 431 635'
 else:
  bright='M 449 545 C 453 566 448 581 452 607 C 457 635 457 662 454 684 L 457 681 C 461 658 459 634 456 608 C 452 582 456 562 453 546 Z'
  shade='M 443 554 C 445 579 447 600 451 621 C 454 645 452 665 452 680 L 455 675 C 459 650 456 630 454 612 C 450 585 449 569 448 552 Z'
  thread='M 454 548 C 457 569 452 582 456 609 C 460 637 460 656 459 676'
 path(mat,p+'_flowing_satin_light',bright,D.grad('outfit_'+p+'_satin_light',0,544,0,690,[(0,'#ABD2EC',.82),(.35,'#8BB8DC',.3),(.63,'#C0E0F2',.7),(1,'#A1C9E5',.43)]))
 path(mat,p+'_long_soft_fold',shade,'#426F9F',opacity='.22')
 path(mat,p+'_silver_woven_thread',thread,'none','#C4E2F3','.65','woven-thread',stroke_opacity='.67')
 D.mark(p,'20亮蓝垂带与21冷背折分别着色，长短尾正背和藏结根部完整；反光随各自纵向曲折，细织纹不跨到反折背面。')

D.setfill('waist_knot_back_mount','#41678F')
for side in ['right','left']:
 p='waist_knot_'+side+'_wing'
 D.setfill(p,D.grad('outfit_'+p,0,522,0,543,[(0,'#6E9DC8'),(.23,'#8CB6D9'),(.47,'#709EC7'),(.7,'#5680B1'),(1,'#476E9B')]))
 D.setfill(p+'_inner',D.grad('outfit_'+p+'_inner',0,529,0,542,[(0,'#345D8B'),(.5,'#5680B1'),(1,'#6F9BC3')]))
 D.node(p).set('stroke','#557DA9');D.node(p).set('stroke-width','.6')
D.setfill('waist_knot_center',D.grad('outfit_waist_knot_center',438,0,449,0,[(0,'#6390BB'),(.34,'#AFD2EB'),(.55,'#D2E8F6'),(.8,'#8DB7D9'),(1,'#648DB7')]))
D.node('waist_knot_center').set('stroke','#547DA7');D.node('waist_knot_center').set('stroke-width','.6')
D.recolor_lines('waist_knot','#5E82AA','.5','.6')
km=D.intrinsic('waist_knot')
path(km,'waist_knot_right_shoulder_light','M 426 529 C 430 525 433 529 438 533','none','#BCDCEC','.8','woven-fold-light',stroke_opacity='.85')
path(km,'waist_knot_left_shoulder_light','M 450 531 Q 455 524 460 530','none','#B5D6EB','.8','woven-fold-light',stroke_opacity='.83')
path(km,'waist_knot_center_wrap_gleam','M 442 531 Q 441 536 443 540','none','#ECF6FB','.55','woven-fold-light',stroke_opacity='.86')
D.mark('waist_knot','19蓝缎软结，横向结翼宽亮、卷入暗口和结心绕布分开；结后固定压面完整，保留双尾根的遮挡。')

# The waistband covers the receivers above its lower edge, so these complete
# source projections appear only at actual exposed contact boundaries.
for recv,surface in [('inner_bodice','inner_bodice_front_surface'),('skirt_inner_front','skirt_inner_front_surface'),('skirt_blue_front','skirt_blue_front_surface'),('skirt_outer_right','skirt_outer_right_surface'),('skirt_outer_left','skirt_outer_left_surface')]:
 D.shade('fx_outfit_waist_front_on_'+recv,'waist_front_surface','waist_front',surface,recv,'inner_top' if recv=='inner_bodice' else 'skirts','waist',dy=2.4,color='#A7B2D8',alpha='.24',sigma='.7')
# Knot casts onto the actual front belt and tail roots. Three full source
# surfaces share one opacity to avoid multiplying their overlapping silhouettes.
for recv,surface in [('waist_front','waist_front_surface'),('waist_tail_right','waist_tail_right_surface'),('waist_tail_left','waist_tail_left_surface')]:
 shared=group('fx_outfit_waist_knot_on_'+recv+'_composite','waist',recv,opacity='.26',data_role='shared-source-shadow-composite')
 D.node(recv).append(shared)
 for src in ['waist_knot_back_mount','waist_knot_right_wing','waist_knot_left_wing']:
  D.shade('fx_outfit_'+src+'_on_'+recv,src,'waist_knot',surface,recv,'waist','waist',dx=.35,dy=1.6,color='#607A9F',alpha='1',sigma='.58',parent=shared)
D.save_color('color_waist')
