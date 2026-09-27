from pathlib import Path
import xml.etree.ElementTree as E
import sys

ROOT = Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_clothing')
SOURCE = Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_v4\refinement\groups\clothing\character.svg')
NS='http://www.w3.org/2000/svg'
E.register_namespace('',NS)
E.register_namespace('xlink','http://www.w3.org/1999/xlink')
tree=E.parse(SOURCE); root=tree.getroot()
outfit='jianma_blue_white_ceremonial'
def el(tag,**a): return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in a.items()})
def text(parent,tag,s):
 n=el(tag); n.text=s; parent.append(n); return n
def group(i,part=None,desc='',**a):
 g=el('g',id=i,data_part=part or i,data_kind='clothing',data_outfit_id=outfit,data_wear_layer='inner_top',**a)
 text(g,'desc',desc); return g
def path(g,i,d,fill='#F2F1F0',stroke='none',width='.9',role='complete-clothing-surface',**a):
 p=el('path',id=i,d=d,fill=fill,stroke=stroke,stroke_width=width,data_role=role,stroke_linejoin='round',stroke_linecap='round',**a)
 g.append(p); return p
def line(g,i,d,width='.8',stroke='#85878F'):
 return path(g,i,d,'none',stroke,width,'formal-clothing-line')
def put_before(g,i): root.insert(list(root).index(next(n for n in root if n.get('id')==i)),g)
def put_after(g,i): root.insert(list(root).index(next(n for n in root if n.get('id')==i))+1,g)

# The front and back are separate physical surfaces sharing the inner_bodice part.
back=group('inner_bodice_back','inner_bodice',desc='完整内搭背片；attach_to=torso 双肩/侧腰，固定点 (366,336)/(522,337)/(377,545)/(514,545)。draw_order=在 neck、torso 与上臂后、后发前；侧缝与前胸衣接合。原图背面不可见，依可见肩宽和胸腰布量保守补形。source=null。')
path(back,'inner_bodice_back_surface','M 414 303 C 427 299 462 299 476 303 C 488 319 516 326 537 330 C 532 345 530 366 532 388 C 538 409 540 446 537 471 C 532 503 517 532 518 553 L 524 590 Q 445 611 365 590 L 371 551 C 371 529 356 501 351 471 C 347 439 349 409 355 388 C 359 365 357 345 351 330 C 374 327 401 317 414 303 Z','#E2E3E4')
line(back,'inner_bodice_back_seam','M 445 309 C 444 378 445 456 445 591','.65','#A2A3AA')
put_before(back,'neck')

collar_back=group('collar_back',desc='独立后领环：完整后弧、内外壁及两侧折返。attach_to=neck 颈根与 inner_bodice 肩颈，固定点 (410,267)/(478,267)/(412,311)/(478,311)；draw_order=后发前、neck 后、两前领后，前发保持在外。后段属保守推断，侧端按原图；source=null。')
path(collar_back,'collar_back_outer_surface','M 405 260 C 417 246 468 245 484 258 C 480 273 480 293 486 311 C 472 326 416 327 400 312 C 409 293 410 275 405 260 Z','#E0E1E3')
path(collar_back,'collar_back_inner_surface','M 405 260 C 417 251 468 249 484 258 L 479 269 C 463 260 426 261 411 270 Z','#CCD1D7')
line(collar_back,'collar_back_upper_edge','M 405 260 C 417 246 468 245 484 258','1.05')
line(collar_back,'collar_back_inside_rim','M 410 266 C 427 255 463 255 479 265','.6','#A0A3AD')
put_before(collar_back,'neck')

front=group('inner_bodice',desc='完整白色内搭前片，左右侧转面与腰下隐藏余量各为实际闭合路径；背片 inner_bodice_back 在身体后。attach_to=torso，肩点 (365,335)/(525,336)，侧腰 (373,535)/(518,535)，裙腰延伸至 y=607；draw_order=torso 与其原有皮肤投影前，肩披/外衣/胸饰/腰带后，发束前置不动。胸口开口按原图的领下三角与中轴菱形组织，胸腹纵褶依衣料受力，不复制皮肤胸下线。reference 与 SVG 均 941×1672，直接同坐标校准。source=null；外衣遮住的肩侧、腋侧与下摆按布量补全。')
outer='M 410 309 C 398 320 378 326 353 332 C 360 351 359 372 354 390 C 349 412 341 431 342 451 C 343 470 351 491 358 507 C 365 525 371 542 371 556 C 371 572 368 588 365 599 Q 403 609 445 608 Q 488 609 525 599 C 521 583 518 568 519 554 C 520 537 526 520 533 501 C 542 477 548 462 548 444 C 547 426 541 406 536 390 C 531 372 530 351 538 333 C 512 328 492 320 479 309 L 460 327 Q 446 333 430 327 Z'
opening='M 444 327 C 434 335 417 339 403 349 C 411 359 420 363 431 365 C 430 372 424 376 426 382 C 430 390 437 397 443 411 C 449 398 458 390 462 381 C 464 376 459 371 459 365 C 472 362 483 358 490 349 C 474 339 458 335 444 327 Z'
path(front,'inner_bodice_front_surface',outer+' '+opening,fill_rule='evenodd',clip_rule='evenodd')
path(front,'inner_bodice_side_right_surface','M 354 390 C 357 416 356 442 365 466 C 375 491 383 526 382 551 L 379 603 L 365 599 C 369 582 372 568 371 556 C 371 542 365 525 358 507 C 351 491 343 470 342 451 C 341 431 349 412 354 390 Z','#E5E5E7')
path(front,'inner_bodice_side_left_surface','M 536 390 C 534 418 533 444 524 468 C 514 496 506 525 508 551 L 510 603 L 525 599 C 521 583 518 568 519 554 C 520 537 526 520 533 501 C 542 477 548 462 548 444 C 547 426 541 406 536 390 Z','#E6E6E8')
line(front,'inner_bodice_neckline',opening,'.9')
line(front,'inner_bodice_armhole_right','M 353 332 C 360 351 359 372 354 390 C 349 412 341 431 342 451','1')
line(front,'inner_bodice_armhole_left','M 538 333 C 530 351 531 372 536 390 C 541 406 547 426 548 444','1')
line(front,'inner_bodice_side_seams','M 354 404 C 357 437 364 465 374 489 C 381 511 383 535 381 563 M 535 405 C 533 439 525 468 516 492 C 508 515 507 538 509 562','.7','#A3A3AA')
line(front,'inner_bodice_long_folds','M 412 413 C 407 439 410 467 401 498 M 424 431 C 422 453 429 479 431 493 M 440 424 C 438 450 440 477 443 498 M 454 425 C 456 448 452 471 450 493 M 472 414 C 478 443 471 470 480 498','.76','#9D9FA6')
line(front,'inner_bodice_waist_gathers','M 402 467 Q 400 485 393 501 M 413 480 L 429 498 M 432 482 L 442 499 L 454 482 M 467 480 L 458 499 M 483 468 Q 485 487 493 501','.72','#91949D')
path(front,'inner_bodice_lower_overlap','M 372 550 Q 444 562 519 550 C 517 568 521 584 525 599 Q 445 618 365 599 C 369 582 372 565 372 550 Z','#EDEDEE')
put_after(front,'fx_hair5_left_long_on_torso')

# Role names left/right follow the character: left is screen right.
R=group('collar_front_right',desc='角色右前领（画面左）完整外面、内折面与侧厚；attach_to=collar_back 右颈侧和 inner_bodice 右锁骨，固定 (408,263)/(413,313)；draw_order=颈前、胸衣前，胸饰与肩披将覆盖 y=326–346 根部，前发仍在外。领端保留布厚和中心开口；source=null。')
rd='M 405 258 L 414 264 C 416 276 430 276 433 289 C 436 300 438 306 444 314 C 442 328 432 338 416 344 C 406 339 397 333 385 330 C 400 320 407 307 407 292 C 408 279 406 267 405 258 Z'
path(R,'collar_front_right_outer_surface',rd,stroke='#85878F',width='1')
path(R,'collar_front_right_inner_surface','M 405 258 L 414 264 C 416 276 430 276 433 289 C 436 300 438 306 444 314 L 440 323 C 435 310 430 301 429 292 C 427 282 417 279 410 275 L 408 265 Z','#D8DCE0')
path(R,'collar_front_right_side_surface','M 405 258 L 410 264 C 414 283 413 301 406 315 C 402 322 394 328 385 330 L 391 334 C 401 329 409 322 413 313 C 419 296 416 278 412 265 Z','#E7E8E9')
line(R,'collar_front_right_roll','M 412 266 C 416 279 428 280 429 292 C 431 306 437 319 432 327 C 428 333 421 337 416 338','.78')
line(R,'collar_front_right_fold','M 409 305 Q 406 315 397 320 M 415 317 Q 412 326 404 331','.65','#ACADB3')
L=group('collar_front_left',desc='角色左前领（画面右）完整外面、内折面与侧厚；attach_to=collar_back 左颈侧和 inner_bodice 左锁骨，固定 (478,263)/(477,313)；draw_order=颈前、胸衣前，胸饰与肩披覆盖根部，前发前置不动。上缘与颈皮肤间保留布厚；source=null。')
ld='M 482 258 L 474 264 C 472 276 459 276 456 289 C 452 300 450 306 444 314 C 446 328 457 339 473 344 C 483 339 493 333 506 330 C 490 321 482 308 482 292 C 481 279 482 267 482 258 Z'
path(L,'collar_front_left_outer_surface',ld,stroke='#85878F',width='1')
path(L,'collar_front_left_inner_surface','M 482 258 L 474 264 C 472 276 459 276 456 289 C 452 300 450 306 444 314 L 448 323 C 453 310 458 301 460 292 C 462 282 471 279 478 275 L 480 265 Z','#D8DCE0')
path(L,'collar_front_left_side_surface','M 482 258 L 477 264 C 473 283 475 301 482 315 C 486 322 496 328 506 330 L 499 334 C 488 329 480 322 476 313 C 470 296 473 278 476 265 Z','#E7E8E9')
line(L,'collar_front_left_roll','M 475 266 C 471 279 462 280 460 292 C 457 306 451 319 456 327 C 460 333 468 337 473 338','.78')
line(L,'collar_front_left_fold','M 480 305 Q 484 315 493 320 M 474 317 Q 479 326 485 331','.65','#ACADB3')
put_after(R,'inner_bodice');put_after(L,'collar_front_right')

# Exact cloth shapes are reusable material/occlusion receivers, without group refs.
defs=next(n for n in root if n.tag.endswith('defs'))
for part,shape in [('inner_bodice','inner_bodice_front_surface'),('collar_back','collar_back_outer_surface'),('collar_front_right','collar_front_right_outer_surface'),('collar_front_left','collar_front_left_outer_surface')]:
 clip=el('clipPath',id=part+'_surface_clip',clipPathUnits='userSpaceOnUse')
 u=el('use',href='#'+shape,clip_rule='evenodd');clip.append(u);defs.append(clip)
# Existing skin shadows remain on their complete skin targets and physically
# below every new opaque front surface; no skin source or target has changed.
for i in ['fx_body5_face_on_neck','fx_hair5_right_long_on_torso','fx_hair5_left_long_on_torso']:
 n=next(n for n in root.iter() if n.get('id')==i)
 text(n,'desc','衣装线稿核对：保留完整原来源和皮肤裁切；新增不透明 inner_bodice / collar_front_* 在本影前自然遮挡，隐藏覆盖区不烙入衣料。新衣上的投影交后续所属上色批次。')

out=ROOT/'3.衣装线稿'/'line_inner_collar'/'character.svg';out.parent.mkdir(parents=True,exist_ok=True)
tree.write(out,encoding='utf-8',xml_declaration=True)
sys.path.insert(0,r'D:\Resources\workspace\AstraLayering\workflows\tools')
from svg_preview import validate_svg_resources
validate_svg_resources(root)
print(out)
print('complete: inner_bodice collar_back collar_front_left collar_front_right')
