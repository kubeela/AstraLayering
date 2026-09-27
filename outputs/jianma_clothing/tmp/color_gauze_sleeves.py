from color_common import *
D=Color('5.分批着色与成稿/color_opaque_sleeves/character.svg')

for side,mir in [('right',False),('left',True)]:
 def f(ds):
  if not mir:return ds
  tok=re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)',mirror(ds));out=[];k=0
  while k<len(tok):
   if tok[k].isalpha():out.append(tok[k]);k+=1
   else:
    x,y=float(tok[k]),float(tok[k+1]);out.extend([f'{x+max(0,min(54,(y-880)*54/548)):g}',f'{y:g}']);k+=2
  return ' '.join(out)
 xx=lambda x:889-x if mir else x
 p='gauze_sleeve_'+side;front=D.node(p);fm=D.node(p+'_front_material');bm=D.node(p+'_back_material')
 fm.set('opacity','.38');bm.set('opacity','.35')
 fm.set('data-role','single-alpha-gauze-material');bm.set('data-role','single-alpha-gauze-material')
 base=D.grad('outfit_'+p+'_single_gauze_base',xx(135),810,xx(330),850,[(0,'#77AFE5'),(.24,'#A6C9ED'),(.43,'#76B0E8'),(.69,'#9AC5EE'),(1,'#76B0E8')])
 for suffix in ['_front_surface','_tail_surface','_back_surface']:D.setfill(p+suffix,base)
 # Full color/fold patches are inside the one-alpha base. They change its
 # intrinsic color, so front-to-tail joints cannot accumulate two exposures.
 fvol=el('g',id=p+'_front_intrinsic_volume',data_role='intrinsic-gauze-volume',clip_path='url(#'+p+'_surface_clip)')
 fm.append(fvol)
 path(fvol,p+'_long_outer_transmitted_light',f('M 314 397 C 298 479 266 564 235 651 C 209 723 197 754 199 797 C 206 841 218 876 209 925 C 196 1011 170 1111 152 1198 C 131 1303 83 1389 34 1422 L 59 1415 C 105 1374 153 1291 174 1184 C 193 1094 220 1000 230 916 C 236 865 223 825 219 789 C 211 750 228 708 254 640 C 285 554 314 478 325 410 Z'),D.grad('outfit_'+p+'_transmitted_light',0,380,0,1430,[(0,'#D1E7FB',.45),(.24,'#BBDDF8',.7),(.44,'#CDE7FB',.9),(.57,'#ACD1F2',.55),(.8,'#D0E8FA',.7),(1,'#CAE4F8',.9)]))
 path(fvol,p+'_inside_long_fold',f('M 337 425 C 345 487 331 541 314 594 C 295 655 281 707 278 756 C 274 801 280 847 266 890 C 252 951 228 1004 218 1062 C 207 1123 201 1181 185 1232 L 175 1239 C 188 1179 195 1116 204 1057 C 214 992 237 939 248 882 C 255 839 251 799 254 754 C 259 699 276 643 294 588 C 314 527 330 478 327 423 Z'),D.grad('outfit_'+p+'_long_fold',0,425,0,1240,[(0,'#609ACA',.55),(.25,'#76ACDF',.35),(.45,'#6D9FD8',.75),(.68,'#6699D1',.74),(.87,'#94BFE9',.3),(1,'#609BD6',.55)]))
 path(fvol,p+'_tail_diagonal_light',f('M 155 1117 C 171 1145 194 1157 211 1155 L 203 1182 C 180 1178 160 1162 149 1143 Z M 94 1309 C 111 1311 135 1298 154 1282 L 143 1314 C 125 1331 107 1340 81 1340 Z'),D.grad('outfit_'+p+'_cross_fold_light',0,1110,0,1350,[(0,'#D1E7FA',.9),(.5,'#AACFF1',.3),(1,'#D9ECFB',.85)]))
 # Back folds turn independently along the undulating exterior perimeter.
 bvol=el('g',id=p+'_back_intrinsic_volume',data_role='intrinsic-gauze-volume',clip_path='url(#'+p+'_back_surface_clip)');bm.append(bvol)
 path(bvol,p+'_back_wave_shadow',f('M 202 584 C 167 641 143 701 151 751 C 158 793 183 820 187 862 C 193 905 164 951 148 992 C 127 1042 142 1090 147 1123 C 153 1163 127 1216 99 1245 L 97 1262 C 134 1229 163 1177 158 1131 C 154 1088 143 1053 159 1014 C 177 966 205 916 200 868 C 196 817 174 790 167 752 C 157 706 174 648 210 589 Z'),D.grad('outfit_'+p+'_back_wave',0,580,0,1265,[(0,'#6D9FD8',.7),(.23,'#7FB0DF',.5),(.41,'#568BC4',.8),(.64,'#92BCE5',.35),(.86,'#679DCF',.72),(1,'#78AFE2',.4)]))
 path(bvol,p+'_back_fold_light',f('M 225 548 C 194 597 166 650 155 696 C 143 741 151 773 171 810 L 177 813 C 160 774 157 744 166 709 C 180 654 202 603 230 556 Z M 148 951 C 130 986 117 1021 123 1054 C 127 1083 139 1102 140 1127 L 149 1120 C 145 1086 134 1065 136 1037 C 136 1009 148 980 158 955 Z M 92 1253 C 98 1279 83 1320 61 1356 L 71 1352 C 91 1323 104 1288 102 1264 Z'),'#CAE4F8')

 # Only these reviewed true folded faces receive a second transparent exposure.
 fold=group(p+'_physical_fold_overlay','sleeves',p,desc='真实腕边反折与尾端翻卷为第二层纱；单层 alpha .38、叠层额外 alpha .22，局部有效覆盖约 .5164。平接接口不在此逻辑中增加 alpha。',clip_path='url(#'+p+'_surface_clip)')
 fold.set('opacity','.22');fold.set('data-role','physical-double-gauze-fold')
 for suffix in ['_turned_inner_surface','_tail_turn_surface']:
  n=D.node(p+suffix);fm.remove(n);n.set('fill',D.grad('outfit_'+p+suffix+'_fold',0,745,0,1428,[(0,'#87B6E1'),(.22,'#6D9FD8'),(.49,'#86B1DF'),(.78,'#6D9FD8'),(1,'#9AC1E8')]))
  fold.append(n)
 front.insert(list(front).index(fm)+1,fold)
 # Roll edges and thread embroidery remain fully opaque outside gauze groups.
 for target,color,width in [('_opening_roll','#E8F2FC','2.35'),('_opening_edge','#A8C0DD','.48'),('_outer_flow','#9DBBE0','.68'),('_back_outer_edge','#A4BBD9','.7'),('_back_roll','#E4F0FC','1.95'),('_embroidered_vines','#F2F8FE','1.45')]:
  n=D.node(p+target);n.set('stroke',color);n.set('stroke-width',width);n.set('stroke-opacity','1');n.set('data-role','opaque-gauze-trim' if target!='_outer_flow' else 'formal-clothing-line')
 D.setfill(p+'_shoulder_tape',D.grad('outfit_'+p+'_shoulder_tape',0,371,0,406,[(0,'#F0F6FD'),(.5,'#E0EBF8'),(1,'#BBD0E9')]))
 D.node(p+'_shoulder_tape').set('stroke','#B3C7E1')
 D.setfill(p+'_wrist_tape',D.grad('outfit_'+p+'_wrist_tape',0,738,0,778,[(0,'#F4F9FE'),(.5,'#E6F0FB'),(1,'#D0E1F3')]))
 embroidery=group(p+'_white_embroidery','sleeves',p,desc='独立不透明白银绣纹；按原图较疏的卷纹与叶瓣排列，纹路随前臂及长尾布面弯曲。',clip_path='url(#'+p+'_surface_clip)')
 motifs=[
  'M 295 503 C 287 496 290 485 298 483 C 293 490 295 496 301 500 M 313 504 C 322 497 328 501 326 509 C 321 506 317 510 314 516',
  'M 299 530 C 289 527 280 538 284 546 C 285 538 292 538 297 541 M 298 557 C 305 553 310 558 307 564 C 302 561 299 565 295 570',
  'M 239 650 C 230 645 225 653 230 660 M 245 666 C 255 663 260 670 254 677 C 251 672 245 677 240 680',
  'M 228 695 C 219 688 214 694 216 701 M 226 715 C 234 713 238 720 231 726',
  'M 208 781 C 216 785 223 791 225 800 C 216 797 213 790 208 781 Z',
  'M 240 828 C 246 833 252 845 247 854 C 244 847 244 840 240 828 Z',
  'M 249 950 C 243 958 240 967 242 978 C 233 969 235 956 241 951 M 237 987 C 229 983 224 992 228 999',
  'M 185 1169 C 190 1178 186 1190 179 1199 C 184 1184 174 1179 170 1177',
  'M 123 1315 C 118 1328 107 1336 96 1338 C 106 1339 113 1343 118 1338']
 for j,ds in enumerate(motifs):path(embroidery,p+'_silver_vine_leaf_'+str(j),f(ds),'none','#E8F3FD','1.08','opaque-silver-embroidery')
 front.append(embroidery)
 # Sparse surface reflections are separate from intrinsic folded color.
 for suffix,ds in [('_front_surface','M 327 435 C 334 475 323 518 311 553 L 308 550 C 319 511 326 474 321 438 Z M 207 783 C 211 803 219 821 226 837 L 228 831 C 221 815 216 797 214 784 Z'),('_tail_surface','M 265 918 C 251 970 232 1015 225 1061 L 221 1064 C 225 1015 244 966 257 922 Z M 173 1207 C 154 1289 114 1364 69 1398 L 78 1397 C 125 1361 164 1284 179 1210 Z')]:
  target=p+suffix;cid=target+'_reflection_clip';cp=el('clipPath',id=cid,clipPathUnits='userSpaceOnUse');cp.append(el('use',href='#'+target,clip_rule='evenodd'));D.defs.append(cp)
  hi=group(target+'_reflection','sleeves',p,data_effect='highlight',data_target_part=p,data_target_id=target,clip_path='url(#'+cid+')',opacity='.32')
  path(hi,target+'_reflection_shape',f(ds),'#FFFFFF',role='gauze-surface-reflection');front.append(hi)
 # Full projected sources, lightly weighted and clipped to transparent fabric.
 for src,srcpart,alpha,dy in [('mantle_front_'+side+'_surface','mantle_front_'+side,'.14',2.3),('opaque_upper_'+side+'_surface','opaque_upper_'+side,'.13',2.1),('opaque_lower_'+side+'_surface','opaque_lower_'+side,'.12',1.7)]:
  si='fx_outfit_'+srcpart+'_on_'+p
  sh=D.shade(si,src,srcpart,p+'_front_surface',p,'sleeves','shoulder_mantle' if srcpart.startswith('mantle') else 'sleeves',dx=.6 if mir else -.6,dy=dy,color='#7295C0',alpha=alpha,sigma='.8')
  if srcpart.startswith('opaque'):
   mask=el('mask',id=si+'_contact_visibility',maskUnits='userSpaceOnUse',x=0,y=0,width=941,height=1672,data_outfit_id=OUTFIT,data_wear_layer='sleeves',data_source_id=src)
   mask.append(el('rect',x=0,y=0,width=941,height=1672,fill='white'));mask.append(el('path',d=D.node(src).get('d'),fill='black',stroke='none'));D.defs.append(mask);sh.set('mask','url(#'+mask.get('id')+')')
   text(sh,'desc','绣袖实际轮廓附近的轻接触影；完整源形的原位覆盖被抑制，不在纱下袖身区域重复涂一遍实体阴影。')
 D.mark(p,'依据推断本色 #76B0E8 校准，单层前幅 alpha .38、后幅 .35；亮褶改变组内固有色，真实内翻面另加 .22 层（合成覆盖 .5164）。y=884 前幅/长尾同组同色连续平接，不积双 alpha。36/37 只指导不透明绣边，32–35 为合成对照而非再透明的布料本色。透明参数与不可见肩后根部为保守推断；纱下人物、绣袖与裙实体完整保留。')
 D.mark(p+'_back','背幅用同组单次 alpha .35，并独立沿弯曲轮廓制作透光及冷蓝褶面；与前幅沿已审纵向分界分区，无重叠接口。后根底色和受光为推断。')

D.save_color('color_gauze_sleeves')
