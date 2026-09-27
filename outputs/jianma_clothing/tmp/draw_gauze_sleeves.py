from clothing_common import *
D=Drawing('3.衣装线稿/line_opaque_sleeves/character.svg')
# Front/back share one explicit longitudinal partition. The two planes occupy
# distinct areas; only the physically turned cloth receives an extra fold face.
partition='C 290 469 268 546 240 623 C 216 687 195 732 179 765 C 175 797 184 830 194 859 C 188 938 169 1016 148 1095 C 128 1190 96 1300 43 1385 C 30 1407 18 1421 10 1428'
back='M 314 374 C 295 430 267 478 231 535 C 194 594 156 655 142 714 C 133 752 142 781 160 814 C 177 846 182 879 163 921 C 144 964 118 1004 122 1051 C 125 1092 145 1121 131 1166 C 122 1198 104 1212 88 1234 C 78 1251 89 1271 84 1292 C 73 1346 37 1411 10 1428 C 18 1421 30 1407 43 1385 C 96 1300 128 1190 148 1095 C 169 1016 188 938 194 859 C 184 830 175 797 179 765 C 195 732 216 687 240 623 C 268 546 290 469 314 392 Z'
front_upper='M 314 374 C 330 386 341 412 348 444 C 359 490 350 539 335 589 C 319 644 305 699 295 749 C 284 792 289 840 277 884 L 190 884 C 192 875 193 867 194 859 C 184 830 175 797 179 765 C 195 732 216 687 240 623 C 268 546 290 469 314 392 Z'
front_tail='M 190 884 L 277 884 C 267 932 250 982 233 1032 C 213 1092 211 1141 194 1201 C 177 1276 145 1345 100 1390 C 70 1418 42 1430 10 1428 C 18 1421 30 1407 43 1385 C 96 1300 128 1190 148 1095 C 169 1016 184 946 190 884 Z'
for side,mir in [('right',False),('left',True)]:
 def f(d):
  if not mir:return d
  tok=re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)',mirror(d));res=[];k=0
  while k<len(tok):
   if tok[k].isalpha():res.append(tok[k]);k+=1
   else:
    x,y=float(tok[k]),float(tok[k+1]);res.extend([f'{x+max(0,min(54,(y-880)*54/548)):g}',f'{y:g}']);k+=2
  return ' '.join(res)
 backg=group('gauze_sleeve_'+side+'_back','sleeves','gauze_sleeve_'+side,desc='透明垂袖完整后幅，含肩后固定根、臂后纱面及独立长尾的后侧；attach_to=mantle_front_'+side+' 肩外点与 opaque_upper_'+side+' 袖后点。draw_order=coat_front 前、opaque_upper/forearm 后；与前幅沿实际纵向折返线接合，无大圆弧重复透明覆盖。原图看不见后根部分为保守延伸，source=null。')
 mat=el('g',id='gauze_sleeve_'+side+'_back_material',opacity='.30')
 path(mat,'gauze_sleeve_'+side+'_back_surface',f(back),'#C8CDD4');backg.append(mat)
 line(backg,'gauze_sleeve_'+side+'_back_outer_edge',f('M 314 374 C 295 430 267 478 231 535 C 194 594 156 655 142 714 C 133 752 142 781 160 814 C 177 846 182 879 163 921 C 144 964 118 1004 122 1051 C 125 1092 145 1121 131 1166 C 122 1198 104 1212 88 1234 C 78 1251 89 1271 84 1292 C 73 1346 37 1411 10 1428'),'1','#ACB1BC')
 line(backg,'gauze_sleeve_'+side+'_back_roll',f('M 231 535 C 194 594 156 655 142 714 C 133 752 142 781 160 814 C 177 846 182 879 163 921 C 144 964 118 1004 122 1051 C 125 1092 145 1121 131 1166 C 122 1198 104 1212 88 1234'),'2.2','#F8F8F8')
 D.before(backg,'opaque_upper_right_back');D.clip('gauze_sleeve_'+side+'_back','gauze_sleeve_'+side+'_back_surface')
 front=group('gauze_sleeve_'+side,'sleeves',desc='完整透明垂袖前幅、翻折内面与长尾。attach_to=mantle_front_'+side+' 肩外 (314,385)/(575,385)，opaque_upper_'+side+' (305,425)/(584,425) 与 opaque_lower_'+side+' 腕外 (217,750)/(672,750)；肩臂两端实际固定，宽幅松量在两点之间自然下垂。draw_order=绣袖/躯干/裙前面，手掌和手指在前，肩根由肩披覆盖。前幅与后幅不重叠，前身/长尾接口 y=884 是平接；同一材质组统一 alpha，不制造拼接深带。原衣图决定可见形态；source=null。')
 mat=el('g',id='gauze_sleeve_'+side+'_front_material',opacity='.33')
 path(mat,'gauze_sleeve_'+side+'_front_surface',f(front_upper),'#C8CDD4')
 tail=group('gauze_sleeve_'+side+'_tail','sleeves','gauze_sleeve_'+side,desc='可独立摆动的长尾实体，上接口 y=884 与前幅平接；隐藏连接受共同材质层 alpha 控制，非半透明弧形搭接。')
 path(tail,'gauze_sleeve_'+side+'_tail_surface',f(front_tail),'#C8CDD4');mat.append(tail)
 # This folded face is a real fold around the wrist-side turn, not an interface.
 path(mat,'gauze_sleeve_'+side+'_turned_inner_surface',f('M 190 750 C 218 742 250 767 268 801 C 285 831 284 858 277 884 C 262 924 247 953 233 994 C 242 941 246 895 233 851 C 223 817 207 786 190 750 Z'),'#ADB6C3',role='real-fold-inner-surface')
 path(mat,'gauze_sleeve_'+side+'_tail_turn_surface',f('M 145 1168 C 139 1240 117 1311 88 1360 C 62 1403 32 1427 10 1428 C 42 1430 70 1418 100 1390 C 143 1347 174 1279 190 1214 C 177 1251 158 1289 142 1307 C 151 1253 156 1202 145 1168 Z'),'#B8C0CB',role='real-fold-inner-surface')
 front.append(mat)
 trim='M 190 750 C 219 742 250 768 268 801 C 285 831 284 858 277 884 C 267 932 250 982 233 1032 C 213 1092 211 1141 194 1201 C 177 1276 145 1345 100 1390 C 70 1418 42 1430 10 1428'
 line(front,'gauze_sleeve_'+side+'_opening_roll',f(trim),'2.5','#F8F8F9')
 line(front,'gauze_sleeve_'+side+'_opening_edge',f(trim),'.58','#A7AEBA')
 line(front,'gauze_sleeve_'+side+'_outer_flow',f('M 335 421 C 351 479 341 526 327 572 C 311 626 293 681 288 735 M 176 803 C 186 838 188 869 171 911 C 159 943 146 969 134 990 M 139 1103 C 150 1150 129 1199 110 1227 M 104 1272 C 91 1321 69 1367 43 1398'),'.9','#B8BEC7')
 # Complete narrow fixing tapes are separate opaque fabric, partly hidden at root.
 path(front,'gauze_sleeve_'+side+'_shoulder_tape',f('M 310 371 Q 324 378 332 395 L 329 406 Q 316 397 306 389 Z'),'#E9EAED',stroke='#AEB1B9',width='.55')
 path(front,'gauze_sleeve_'+side+'_wrist_tape',f('M 213 739 C 230 740 250 754 265 771 L 262 778 C 247 763 226 749 210 748 Z'),'#F3F3F5')
 # A few continuous embroidery stems locate the reference motif fields. Their
 # detailed silver/white rendering belongs to the coloring stage.
 line(front,'gauze_sleeve_'+side+'_embroidered_vines',f('M 299 493 C 305 477 315 475 318 488 C 323 509 301 514 299 530 C 297 546 305 552 296 566 C 288 579 277 578 270 590 M 235 642 C 247 646 253 655 249 665 C 244 677 231 677 229 692 C 227 704 233 712 225 724 M 218 681 C 229 675 237 680 238 689 M 211 709 C 219 702 229 707 231 715'), '1.4','#F8F8F9')
 D.before(front,'mantle_front_left')
 D.clip('gauze_sleeve_'+side,'gauze_sleeve_'+side+'_front_surface')
 D.node('gauze_sleeve_'+side+'_surface_clip').append(el('use',href='#gauze_sleeve_'+side+'_tail_surface',clip_rule='evenodd'))
D.node('coat_back_surface_clip').append(el('use',href='#coat_back_body_surface',clip_rule='evenodd'))
D.save('line_gauze_sleeves')
