"""Step 3 authoring helper. All art is editable SVG paths; no raster is embedded.
Run from the subject output directory: python3 block-layers/draw_layers.py.
Reference contours are sampled only for fine external edges and real openings.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter
import json, math, html

OUT=Path('block-layers'); OUT.mkdir(exist_ok=True)
im=Image.open('references/base-subject.png').convert('RGB')
fg=ImageChops.lighter(ImageChops.lighter(*im.split()[:2]), im.split()[2]).point(lambda a:255 if a>48 else 0)
parts=[]
segment_ids=[]
palette={
'face_base':'#EDAF96','left_eye':'#165D95','right_eye':'#284B8D','left_eyebrow':'#8A4368','right_eyebrow':'#87462E','nose':'#A0493D','mouth':'#D93669','left_ear':'#F4CA84','right_ear':'#DF8B66',
'crown_hair':'#A998E2','top_bun':'#BDD58B','left_bangs':'#7E64C3','right_bangs':'#C065B9','left_side_lock':'#706CCB','right_side_lock':'#CE7191','left_back_hair':'#569BA6','right_back_hair':'#A89A50',
'neck':'#E2B54E','torso':'#E6A16A','left_upper_arm':'#D57063','left_forearm':'#DB9561','left_hand':'#E5B66E','right_upper_arm':'#B278BA','right_forearm':'#CC81AA','right_hand':'#E4A493',
'pelvis':'#CABA61','left_thigh':'#81B891','left_calf':'#429C9C','left_foot':'#5C85B8','right_thigh':'#D88979','right_calf':'#BF788E','right_foot':'#A182BD',
'rear_arch':'#78B696','lotus_crest':'#45A7CA','forehead_ornament':'#486FCE','left_branch_base':'#CF8CB8','right_branch_base':'#DD9760','left_hanging_streamer':'#6E9FDC','right_hanging_streamer':'#59B8AF',
'left_earring':'#F0BB3C','right_earring':'#50C7CA','left_jeweled_strap':'#ECBF38','right_jeweled_strap':'#64E0D8','left_sole':'#8AAC45','right_sole':'#E0B249'}

def path(d):return '<path d="'+d+'"/>'
def add(group,body,note='',segment_id=None):
    name=group.split('/')[-1]
    identity=segment_id or name
    assert identity not in segment_ids,identity
    segment_ids.append(identity)
    parts.append((group, '<g id="'+identity+'" data-group-path="'+group+'" fill="'+palette[name]+'" fill-rule="'+('evenodd' if name in ('forehead_ornament','left_earring','right_earring') else 'nonzero')+'">'+('\n<title>'+html.escape(note)+'</title>' if note else '')+'\n'+body+'\n</g>'))
def pp(group,d,note=''):
    if group.startswith('earrings/'):
        # Solid pieces unite by compositing, without evenodd cancelling their overlaps.
        # Keep the lower ring's outer contour and inner hole together in one path.
        contours=['M '+segment for segment in d.removeprefix('M ').split(' M ')]
        assert len(contours)==5,group
        add(group,''.join(path(part) for part in (contours[0],contours[1],contours[2]+' '+contours[3],contours[4])),note)
    else:add(group,path(d),note)
def poly(points):return 'M '+' L '.join(f'{x:g} {y:g}' for x,y in points)+' Z'
def dist(p,a,b):
    if a==b:return math.hypot(p[0]-a[0],p[1]-a[1])
    u=((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/((b[0]-a[0])**2+(b[1]-a[1])**2)
    u=max(0,min(1,u));return math.hypot(p[0]-a[0]-u*(b[0]-a[0]),p[1]-a[1]-u*(b[1]-a[1]))
def rdp(points,tol=.42):
    if len(points)<3:return points
    m,i=max((dist(p,points[0],points[-1]),i) for i,p in enumerate(points[1:-1],1))
    if m<=tol:return [points[0],points[-1]]
    return rdp(points[:i+1],tol)[:-1]+rdp(points[i:],tol)
def traced(region,min_area=1.5,source_mask=None,min_outer_area=0,preserve_top_y=None):
    """Trace a semantic polygon against the original external silhouette."""
    mask=Image.new('L',im.size);ImageDraw.Draw(mask).polygon(region,fill=255)
    mask=ImageChops.multiply(mask,fg if source_mask is None else source_mask)
    box=mask.getbbox()
    if not box:raise ValueError(region)
    x0,y0,x1,y1=box
    p=mask.load();edges={}
    def edge(a,b):edges.setdefault(a,[]).append(b)
    for y in range(y0,y1):
        for x in range(x0,x1):
            if not p[x,y]:continue
            if y==0 or not p[x,y-1]:edge((x,y),(x+1,y))
            if x==im.width-1 or not p[x+1,y]:edge((x+1,y),(x+1,y+1))
            if y==im.height-1 or not p[x,y+1]:edge((x+1,y+1),(x,y+1))
            if x==0 or not p[x-1,y]:edge((x,y+1),(x,y))
    loops=[];dirs={(1,0):0,(0,1):1,(-1,0):2,(0,-1):3}
    while edges:
        start=next(iter(edges));cur=start;pts=[start];prev=None
        while True:
            candidates=edges[cur]
            if prev is None:nxt=candidates[0]
            else:
                direct=dirs[(cur[0]-prev[0],cur[1]-prev[1])]
                nxt=min(candidates,key=lambda q:[1,0,3,2].index((dirs[(q[0]-cur[0],q[1]-cur[1])]-direct)%4))
            candidates.remove(nxt)
            if not candidates:del edges[cur]
            prev,cur=cur,nxt;pts.append(cur)
            if cur==start:break
        signed_area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,pts[1:]))/2
        area=abs(signed_area)
        if signed_area>0 and area<min_outer_area and (preserve_top_y is None or max(p[1] for p in pts)>preserve_top_y):continue
        if area>=min_area:
            pts=rdp(pts)
            loops.append(poly(pts[:-1]))
    return ' '.join(loops)

def auto(group,region,note=''):
    metal=group.startswith('headdress/')
    pp(group,traced(region,min_outer_area=100 if metal else 0,preserve_top_y=240 if 'hanging_streamer' in group else None),note)
def stroke(d,w):return '<path d="'+d+'" fill="none" stroke="currentColor" stroke-width="'+str(w)+'" stroke-linecap="round" stroke-linejoin="round"/>'
def bead(cx,cy,rx,ry):return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>'

# Rear hair has full scalp-to-tip bases, including the masses hidden by the torso.
pp('hair/right_back_hair','M 485 253 C 467 259 455 280 448 307 C 437 337 425 363 421 388 C 414 431 420 477 425 520 C 430 562 417 601 431 641 C 422 626 416 598 419 567 C 421 548 414 526 416 501 C 417 484 413 462 414 445 C 412 421 417 402 420 383 C 431 353 442 319 451 289 C 459 267 471 254 485 253 Z M 485 253 C 501 277 499 318 497 353 C 494 405 485 451 478 494 C 469 544 455 588 439 626 C 426 600 429 569 427 541 C 422 504 425 463 424 430 C 420 389 434 343 446 308 C 456 278 467 258 485 253 Z','Character right: screen left. Hidden base continues behind shoulder and torso.')
pp('hair/left_back_hair','M 547 252 C 563 255 577 277 586 308 C 597 341 609 366 615 397 C 619 429 617 463 614 491 C 610 529 616 567 608 604 C 605 620 601 632 597 640 C 606 615 611 596 609 573 C 608 539 603 518 608 486 C 612 453 616 418 609 391 C 601 356 588 332 580 304 C 571 278 559 258 547 252 Z M 547 252 C 531 277 534 322 537 355 C 541 400 548 452 555 494 C 563 543 575 588 593 626 C 608 596 604 568 606 538 C 612 499 608 461 610 425 C 615 389 599 345 588 309 C 579 279 565 256 547 252 Z','Character left: screen right. Full hidden hair base is retained.')
# Crown framework, with the central opening left transparent.
auto('headdress/rear_arch',[(431,137),(450,99),(481,78),(518,75),(552,84),(579,101),(593,139),(580,149),(565,126),(555,108),(536,99),(506,91),(477,106),(463,124),(450,149)],'The arch is a continuous narrow band; its large inner opening is transparent.')
pp('hair/top_bun','M 478 148 C 474 138 476 126 481 117 C 488 103 501 95 514 94 C 528 93 541 101 548 113 C 556 126 557 141 550 151 C 535 160 493 161 478 148 Z')
auto('headdress/right_branch/right_branch_base',[(379,151),(410,148),(418,138),(425,138),(429,150),(432,145),(431,132),(441,119),(454,117),(464,122),(466,139),(473,156),(477,172),(462,193),(450,199),(430,191),(416,184),(399,188),(382,174)],'Branch cutout retains the small exterior curls and internal negative spaces.')
auto('headdress/left_branch/left_branch_base',[(557,156),(563,127),(577,117),(589,121),(598,133),(599,148),(604,145),(610,139),(619,145),(626,149),(651,149),(650,171),(636,185),(619,188),(604,191),(587,199),(572,186),(558,172)])
# Pendant strings and long tapered streamers; no background bridge is drawn.
auto('headdress/right_branch/right_hanging_streamer',[(397,183),(408,183),(409,227),(414,239),(411,285),(404,372),(397,441),(386,518),(370,601),(339,609),(352,555),(365,490),(376,422),(386,350),(389,283),(390,239),(395,232)],'The bead-chain gaps remain real transparency; the ribbon is one solid editable contour.')
auto('headdress/left_branch/left_hanging_streamer',[(626,183),(638,183),(638,231),(647,238),(649,299),(655,370),(666,449),(677,518),(693,608),(662,602),(650,528),(640,455),(631,376),(625,305),(621,239),(627,231)])
# Sandal soles lie behind the completed bare foot shapes.
auto('sandals/right_sandal/right_sole',[(438,1434),(504,1434),(507,1460),(493,1475),(448,1475),(437,1457)])
auto('sandals/left_sandal/left_sole',[(525,1434),(588,1434),(592,1455),(579,1476),(533,1476),(522,1459)])
# Independent leg masses have overlap at knees and under pelvis, preserving the crotch opening.
auto('body/lower_body/right_leg/right_calf',[(426,1000),(517,1000),(519,1308),(504,1335),(455,1335),(424,1306)],'Hidden knee overlap runs to y=1000; no gap between thigh and calf.')
auto('body/lower_body/left_leg/left_calf',[(519,1000),(608,1000),(613,1307),(576,1335),(526,1335),(517,1308)])
pp('body/lower_body/right_leg/right_thigh',traced([(399,775),(516,775),(515,1012),(511,1030),(449,1030),(437,996),(399,871)])+' M 403 785 C 400 748 407 710 429 690 C 450 676 483 678 498 701 C 508 722 509 751 507 785 Z','Rounded upper thigh continues beneath pelvis. The visible lower boundary is the knee split.')
pp('body/lower_body/left_leg/left_thigh',traced([(520,775),(631,775),(633,868),(598,987),(587,1030),(523,1030),(519,1012)])+' M 523 785 C 522 750 528 714 543 694 C 561 679 589 680 608 696 C 625 716 630 750 629 785 Z')
# Bare feet completed beneath the decorative chains, with a scalloped toe contour.
pp('body/lower_body/right_leg/right_foot','M 464 1309 C 463 1318 459 1325 461 1333 C 462 1342 460 1351 459 1361 C 456 1384 451 1405 447 1424 C 444 1434 441 1439 442 1447 C 442 1454 445 1456 449 1455 C 449 1460 455 1462 459 1459 C 460 1465 467 1465 471 1462 C 472 1468 480 1468 484 1462 C 487 1467 496 1464 499 1457 C 502 1452 503 1445 502 1438 C 499 1421 498 1406 497 1389 C 496 1370 498 1354 498 1341 C 499 1334 501 1328 498 1320 L 496 1309 Z')
pp('body/lower_body/left_leg/left_foot','M 535 1309 C 535 1318 530 1325 531 1333 C 533 1342 531 1351 532 1361 C 531 1381 530 1404 528 1425 C 526 1436 524 1444 527 1454 C 528 1462 531 1466 538 1465 C 542 1465 545 1461 546 1459 C 547 1466 553 1468 557 1462 C 561 1465 568 1462 570 1458 C 575 1461 580 1457 580 1454 C 585 1455 586 1450 586 1446 C 586 1437 583 1427 582 1418 C 579 1399 577 1381 573 1363 C 570 1352 568 1342 569 1333 C 572 1326 568 1318 567 1309 Z')
# Pelvis and torso are unclothed structural bases. No suit edge, strap, seam or garment object is retained.
pp('body/lower_body/pelvis','M 450 592 C 447 617 428 648 418 675 C 407 706 401 738 403 774 C 429 780 467 786 506 784 L 507 774 C 513 776 521 776 527 774 L 525 784 C 561 787 601 781 629 774 C 631 740 626 705 616 676 C 607 650 587 618 582 592 C 550 606 482 606 450 592 Z','Anatomical construction block: completes the hips under the temporary suit. No garment styling.')
pp('body/torso','M 437.8 374.4 C 458 370 479 368 493 358 L 539 358 C 553 369 575 371 595.2 375.3 C 597 392 596 418 601 443 C 611 465 607 487 594 506 C 589 530 582 563 580 586 C 579 604 586 619 589 630 C 558 644 480 644 443 630 C 448 617 455 602 454 585 C 453 561 446 530 437 505 C 425 488 424 466 432 446 C 441 422 439 395 437.8 374.4 Z','Temporary leotard removed. Chest, abdomen and waist are a continuous plain body block without garment outlines.')
# Upper arms and forearms are completed behind wrist and elbow joints.
pp('body/arms/right_arm/right_upper_arm','M 439 374 C 423 376 411 380 406 390 C 399 403 399 420 398 441 L 396 481 C 395 510 390 547 385 576 L 381 596 C 390 604 404 609 415 600 C 424 575 429 543 433 521 L 438 499 C 431 488 427 474 431 456 C 435 444 443 430 444 415 C 445 399 443 384 439 374 Z')
pp('body/arms/left_arm/left_upper_arm','M 594 375 C 610 377 621 381 627 391 C 635 404 637 421 637 443 L 639 483 C 639 511 643 547 648 577 L 653 597 C 644 607 629 610 617 601 C 609 574 605 547 601 524 L 594 505 C 602 491 607 477 602 458 C 597 442 592 429 590 413 C 589 399 590 385 594 375 Z')
auto('body/arms/right_arm/right_forearm',[(380,579),(419,584),(422,607),(405,651),(385,696),(360,752),(356,775),(331,775),(327,756),(344,705),(357,659),(370,611)])
auto('body/arms/left_arm/left_forearm',[(613,584),(653,579),(665,614),(675,656),(689,714),(704,759),(701,775),(675,775),(669,750),(645,699),(626,654),(610,608)])
auto('body/arms/right_arm/right_hand',[(332,746),(360,747),(362,799),(358,830),(359,858),(338,872),(308,851),(308,802),(321,773)],'All finger silhouettes, tips and the thumb–index opening are retained.')
auto('body/arms/left_arm/left_hand',[(674,747),(700,746),(709,778),(719,806),(720,850),(697,873),(671,862),(667,833),(670,799)])
pp('body/neck','M 493 310 C 493 325 493 340 487 350 C 480 361 464 368 451 373 C 470 380 488 377 502 382 C 509 385 510 389 517 389 C 524 389 526 383 534 381 C 551 377 570 379 582 373 C 567 367 552 360 546 349 C 540 337 541 323 541 310 C 526 306 509 306 493 310 Z')
# Ears and face sit before the rear hair; face base completes the hidden forehead.
pp('face/right_ear','M 461 264 C 454 262 450 267 452 274 C 453 280 457 283 462 284 C 465 284 467.5 285 468.5 288.5 C 469.5 291.5 472 292 473.5 290 C 476 287 479 275 475 268 C 470 262 466 262 461 264 Z','Complete ear base includes the helix behind the bangs and the narrow visible inner lobe.')
pp('face/left_ear','M 574 264 C 581 262 586 267 584 274 C 584 278 583.4 282.3 579 283.6 C 576 284.6 574 284 572 284 C 568.8 284 565.8 285 563.8 288.5 C 562.7 291.5 560 292 558.5 289.5 C 555 286 553 275 557 268 C 563 262 569 262 574 264 Z','Complete ear base includes the helix behind the bangs and the narrow visible inner lobe.')
pp('face/face_base','M 474 221 C 482 199 506 191 521 193 C 543 194 559 207 562 231 C 565 254 563 273 559 286 C 555 301 544 311 530 321 C 525 325 521 330 516 330 C 511 330 506 326 501 323 C 487 313 477 304 472 290 C 465 271 466 244 474 221 Z','Full forehead base retained behind the hair and forehead jewellery.')
# Earring chains are filled contours, with open lower loops.
pp('earrings/right_earring','M 472.1 290.5 C 471.4 293.4 471.2 295.3 471.3 298.1 L 472.9 298.5 C 472.8 295.6 473.2 293.3 473.4 291.3 Z M 472.1 297.5 L 475.6 302.5 L 469.2 311.7 L 465.9 306.1 Z M 469.2 311.1 L 470.3 313.4 L 473 316 L 470 321 L 467 324 L 463 319 L 466 313 Z M 468.8 314.2 L 466 318 L 467 321 L 470 317 Z M 466 322 L 468 323 L 468 327 L 466 327 Z')
pp('earrings/left_earring','M 560.8 290.5 C 561.1 293 562.1 295 562.1 297.5 L 563.5 297.7 C 563.2 295.2 562.6 292.8 562.2 290.6 Z M 562.3 297.2 L 568.5 304.6 L 565.1 311 L 558.6 303.3 Z M 565.1 310.4 L 563.7 313.8 L 564 319 L 568 324 L 572 319 L 568 313 Z M 566 314.8 L 565 317 L 568 321 L 570 318 Z M 568 323 L 570 323 L 571 331 L 569 331 Z')
# Crown mass and two front bangs. The hairline stays separate from the facial base.
pp('hair/crown_hair','M 514 167 C 504 156 485 159 473 166 C 460 175 455 188 451 201 C 448 211 449 220 446 230 C 443 242 448 250 445 258 C 443 269 448 279 456 286 L 474 274 C 480 253 487 230 499 219 C 506 221 510 224 517 224 C 524 224 529 222 534 220 C 546 232 553 254 559 274 L 580 285 C 588 277 591 267 587 255 C 591 244 588 232 584 222 C 585 210 581 197 576 187 C 569 173 557 163 543 160 C 532 157 523 159 514 167 Z')
pp('hair/right_bangs','M 516 211 C 508 196 497 190 487 192 C 471 197 460 211 453 228 C 445 245 445 266 453 279 L 459 285 C 469 270 477 250 484 233 C 489 222 496 213 503 211 C 509 210 511 216 516 220 Z')
pp('hair/left_bangs','M 517 211 C 525 197 537 189 549 193 C 563 198 575 213 582 229 C 589 248 590 266 582 280 L 575 286 C 565 270 557 250 550 233 C 545 222 537 213 531 212 C 525 211 522 216 518 220 Z')
# Each full ear base stays behind the hair. Its exposed helix is a front segment
# of the same leaf, above the complete bangs and below the side locks.
# This controls occlusion without cutting any opening into a hair base.
add('face/right_ear',path('M 453.7 277 C 456 276 460.6 273.7 462 272.3 L 459 281.2 L 457.8 283 C 455.5 281.8 454.4 279.1 453.7 277 Z'),'Front helix segment of the complete right ear; aggregate with right_ear.',segment_id='right_ear_helix_front')
add('face/left_ear',path('M 574.4 272.5 C 576.8 275 580.2 277.1 583 277.8 C 582.8 280.2 581.8 282.3 579.7 283 C 578.5 281 576.3 277.4 574.4 272.5 Z'),'Front helix segment of the complete left ear; aggregate with left_ear.',segment_id='left_ear_helix_front')
# Side locks flow in front of the rear masses and around the ears. Fine detached turns preserve the background slits.
pp('hair/right_side_lock','M 477 252 C 473 274 464 295 458 312 C 453 330 449 349 441 367 L 436 373 L 429 375 C 438 355 443 336 448 318 C 451 304 454 288 462 270 Z M 449 305 C 440 316 433 329 434 339 C 434 344 437 349 439 351 C 435 340 436 331 442 322 C 444 317 446 311 449 305 Z M 459 309 C 454 327 452 345 454 358 C 454 365 451 371 449 374 C 452 363 450 350 451 340 C 452 328 455 317 459 309 Z','Main front lock plus its two thin returning wisps; the outer curl keeps the black opening.')
pp('hair/left_side_lock','M 557 252 C 561 274 570 294 577 312 C 582 330 586 350 594 367 L 599 374 L 606 376 C 596 354 590 336 585 318 C 582 303 579 287 572 270 Z M 584 305 C 593 316 600 331 598 341 C 597 346 595 350 593 353 C 597 340 596 330 591 322 C 588 315 586 310 584 305 Z M 573 308 C 578 327 580 345 578 362 C 576 374 571 381 567 385 C 575 371 576 357 576 344 C 575 330 573 317 573 308 Z M 561.5 273 C 561.6 277 561.2 280 561 282 L 563.8 288 L 568 291 L 566 282 L 564 273 Z')
# Facial feature block silhouettes (not the later fine-detail artwork).
pp('face/right_eyebrow','M 480 249 C 487 249 498 251 503 255 C 495 253 487 253 480 252 Z')
pp('face/left_eyebrow','M 528 255 C 534 251 545 249 553 249 L 554 252 C 545 252 536 253 528 255 Z')
pp('face/eyes/right_eye','M 478 264 C 482 259 488 259 493 261 C 498 262 502 264 504 268 C 499 265 498 266 497 270 C 491 276 482 273 479 269 L 477 266 Z M 475 262 L 474 265 L 476 265 L 477 262 Z')
pp('face/eyes/left_eye','M 530 268 C 534 263 539 261 545 260 C 551 259 556 260 558 264 L 557 269 C 553 273 544 275 539 272 C 535 270 536 265 530 268 Z M 559 262 L 562 263 L 563 266 L 560 265 Z')
pp('face/nose','M 512 292 C 513 291 514 293 514 295 C 512 295 511 293 512 292 Z M 518 294 C 518 292 520 292 520 293 C 520 295 519 296 518 294 Z')
pp('face/mouth','M 505 305 C 510 306 512 304 516 305 C 519 304 521 306 529 305 C 526 308 522 310 517 310 C 512 310 508 308 505 307 Z')
# Lotus crest and the line of faceted gems on the central part.
pp('headdress/lotus_crest','M 517 115 C 511 121 503 122 496 127 C 489 132 485 140 485 147 L 471 142 C 471 153 478 160 489 162 L 481 163 L 481 166 C 494 163 506 164 516 170 C 527 163 541 164 552 166 L 552 162 L 544 161 C 553 157 558 151 559 142 L 544 147 C 544 137 539 128 530 123 C 524 120 520 116 517 115 Z','The single leaf combines the contiguous lotus petals, central faceted plaque and lower silver flourishes.')
pp('headdress/forehead_ornament','M 516 171 C 510 171 510 177 513 183 L 515 186 L 510 197 C 510 202 513 206 515 209 L 503 220 L 515 232 L 514 236 C 512 239 514 241 517 244 C 520 241 522 239 520 236 L 518 232 L 531 220 L 519 209 C 522 204 524 199 521 193 L 518 185 C 521 179 522 172 516 171 Z M 516 174 C 514 175 514 179 516 181 C 518 178 519 174 516 174 Z','The top hanging loop is open. Gem tips follow y=209, 232 and 244 from the reference.')
# Pearl-and-gem sandals. Both ankle chains and toe connectors remain open structures.
# Extract the bluish/silver chain boundary from skin; then author closed vector paths.
# This mask is a temporary analysis input only, never an SVG image or an asset layer.
jewels=Image.new('L',im.size);jpx=jewels.load();rgb=im.load()
for y in range(1338,1446):
    for x in range(451,580):
        r,g,b=rgb[x,y]
        if b-r>-15 and b-g>=-5 and b>120:jpx[x,y]=255
jewels=jewels.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
right_region=[(459,1340),(503,1340),(503,1357),(496,1375),(487,1388),(490,1396),(484,1405),(484,1424),(486,1435),(484,1444),(479,1444),(476,1439),(473,1434),(474,1425),(474,1408),(469,1399),(466,1391),(456,1380),(451,1361)]
left_region=[(530,1340),(574,1340),(578,1361),(572,1380),(563,1391),(560,1400),(555,1408),(552,1425),(553,1434),(550,1439),(548,1444),(542,1444),(543,1433),(546,1424),(546,1405),(540,1396),(542,1386),(534,1375),(529,1357)]
pp('sandals/right_sandal/right_jeweled_strap',traced(right_region,min_area=2,source_mask=jewels)+' '+poly([(478,1375),(485,1388),(479,1396),(471,1387)]),'Pearls, faceted pendant and toe connector traced as one flat marker; foot skin stays visible through the ankle opening.')
pp('sandals/left_sandal/left_jeweled_strap',traced(left_region,min_area=2,source_mask=jewels)+' '+poly([(550,1375),(557,1387),(551,1396),(543,1388)]))

# Validate against the exact declared leaves: IDs are unique and paths complete.
groups=json.loads(Path('structure/groups.json').read_text())
def leaves(groups,prefix=''):
    for g in groups:
        p=prefix+'/'+g['name'] if prefix else g['name']
        if g['groups']:yield from leaves(g['groups'],p)
        else:yield p
expected=set(leaves(groups['groups']));actual=[p for p,_ in parts]
assert set(actual)==expected,(expected-set(actual),set(actual)-expected)
assert len(set(actual))==45
assert len(actual)==len(segment_ids)==47
svg='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">\n<title>Jianma — step 3 editable group colour drawing</title>\n<desc>45 independent leaf paths in 47 drawing segments; each ear has a complete base and a front helix segment. Left/right are the character’s own directions. No background, embedded raster, garment layer, shading or animation. Hidden body and hair bases are completed.</desc>\n'+'\n'+'\n'.join(v for _,v in parts)+'\n</svg>\n'
(OUT/'character.svg').write_text(svg)
(OUT/'group-colors.json').write_text(json.dumps({p:palette[p.split('/')[-1]] for p,_ in parts},indent=2)+'\n')
print('Wrote 45 leaf groups in 47 unique-id drawing segments to',OUT/'character.svg')
