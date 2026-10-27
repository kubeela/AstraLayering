# raster step02 报告（black-white-doll）：边缘柔化与抗锯齿

> 调度器维护的文件（run.json、.running/.completed、../agents/steps/step02/prompt.md、../agents/steps/step02/attempts.jsonl、../agents/steps/step02/events.jsonl、../agents/steps/step02/result.json、error.txt）未改动，也未推进后续步骤。step01 目录只读，未被改写。

## 1. 输入与产出

| 项目 | 路径 / 内容 |
|---|---|
| 输入 KRA（实际使用） | `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/black-white-doll/raster-layering/step01/character-depth.kra`，sha256 `c929fe13b9cb21fb9b89bc2ab4ca3d67a4b28d477b916ca8185b3064779e8287` |
| 输入说明 | `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/black-white-doll/raster-layering/step01/report.md` |
| 参考图（实际使用） | `../../part-layering/references/base-subject.png`，1086×1448 RGBA，sha256 `567c5ff7a2d012496bc8fc5d97b04832ccd0646da35cd27fea4f67f30fbc0dd0` |
| 上游结构（沿用，未改动） | `part-layering/parts/`、`part-layering/groups.json`、`part-layering/occlusion.json` |
| 交付 KRA | `step02/character-soft-edges.kra`，12,969,933 B，sha256 `4c79448c6288b0e4309d940c3571b7cda30e6e37f6a795aec7b70e70543654d8`。1086×1448，81 个普通绘画层，层名、顺序、位置与 step01 一致，无蒙版、无子节点 |
| 交付 PNG | `character-soft-edges.png`，650,722 B，sha256 `eb5cdaa19c8614172e273c87eed62f36831f19de64e15b777293038350c7e609`。由复开后的最终 KRA 经 Krita 自身投影导出：1086×1448 RGBA，透明背景（1,219,359 px 完全透明），无底层、无缩放 |
| 过程产物 | `step02/checks/`（逐层对照图、区域对照图、总览图、阶段图）、`step02/workspace/records/`（每个算子的参数与变动记录、逐层表）、`step02/scripts/`（全部临时脚本与 Krita 运行脚本）、`step02/reopened-layers/`（复开 KRA 后逐层导出的 81 张 PNG）、`step02/pixel-review/`（像素差异定位工具的输出） |

工程只有一个：`character-soft-edges.kra`。每批改动之后用 `workspace/scripts/apply.py` 只把有变化的图层写回并保存，没有另建预览工程；检查一律使用最近一次保存的 KRA。

## 2. 方法

### 2.1 总体思路
- step01 的拼合结果边缘有轻微锯齿、硬边和接缝，而原图的线条与边缘很软。逐层对照参考后，改动只落在各层自己的边缘带、被上层遮住的补全边界、孤立杂点和细线上。
- 形状、层级、顺序、层名、归属均未变。每层的可见主体不动，轮廓只在过渡带内移动约 0.5–2 px。
- 参考图只用来**量**：过渡带该有多宽、该有多深（解出 α），以及在本层自己的几种颜色之间做取舍。**没有把参考像素贴进任何图层**，写入图层的颜色都取自该层自己的像素（最近邻、中值或 3×3 均值）。

### 2.2 算子（逐层表“处理”列的字母）
| 字母 | 算子（脚本） | 作用 | 影响范围 |
|---|---|---|---|
| M | 外缘重抠（`soft.py` / `runall.py`，最终参数 try10） | 对本层可见自由边缘的带状区域，按 R = α·C + (1−α)·B 逐像素解出过渡 α（稀疏对称正定方程，平滑项约束），颜色取本层自己的；低对比处退回到该层其他边缘测得的宽度 | 可见边缘带 |
| A | 隐藏边界几何抗锯齿（`hidaa.py` / `pass2.py`，p2–p5 链） | 被上层完全遮住的补全边界做几何抗锯齿，让取消上层后看到的边界不再是阶梯 | 仅上层 α≥0.998 覆盖的像素，合成逐位不变 |
| S | 去杂点（`speck.py`） | 隐藏区里别的部件的深色点、色偏线和旧轮廓碎片，用本层邻近颜色重涂 | 仅隐藏像素，合成逐位不变 |
| T | 色调平滑（`tonesoft.py`） | 隐藏补全区的保边色调平滑，去掉鬼影圈和补全拼块的色差（第 8、33 层） | 仅隐藏像素 |
| H | 调和填补（`heal.py`） | 隐藏补全区的调和函数填补，让补全与可见区连续（第 11 层脚踝） | 仅隐藏像素 |
| G | 切向平滑（`tangent.py`） | 沿笔画方向做平滑的“只拖不糊”涂抹：细线、轮廓残片的阶梯沿线拉开，笔画横截面剖面保留；无明显边缘处不动 | 指定小框内 |
| U | 下垫 / 补孔（`underpad.py`，模式 under / self） | under：在上层半透明过渡之下把下层 α 垫宽，补掉两层之间发白的半透明缝；self：补实一像素小孔 | 指定小框内 |
| D | 减薄过密 α（`alphadown.py`） | 过密的边缘 α 减薄，让线条回到原图的轻重（第 27 层粉色条纹） | 指定小框内 |
| B | 色点补色（`dab.py`） | 把本层里别处混入的色点（颜色偏离周围中值）重涂为本层中位色，α 不动 | 指定小圆内 |

所有算子的参数、框、变动像素数都记在 `workspace/records/*.json`（try1–try10、p2–p5、s1–s3、sp1、t1/t2、h1、u1–u11 及各 job-*.json）。

### 2.3 工作链
1. 起点：`step01/character-depth.kra` 逐层导出（base）。
2. try1→try10 外缘重抠（M），每一轮对照参考放大检查后调参。
3. p2–p5 隐藏边界抗锯齿（A）；s1–s3 接缝定位与处理；sp1 去杂点（S）；t1/t2 色调平滑（T）；h1 调和填补（H）。
4. u1–u9：切向平滑（G）、下垫 / 补孔（U）、α 减薄（D）、色点补色（B）逐处加入，每处先用像素差异工具和相对缺口扫描（参考 α>0.55 而合成 α<参考 α−0.25）定位，再放大对照参考。
5. u10：第 50 层 mouth_interior、第 53 层 lower_teeth 的外缘切向平滑；u11：第 3 层下垫补缝。u11 即交付内容。
6. 写回 KRA → 保存 → 重新打开校验 → 导出 Krita 投影为 PNG。

## 3. 逐层验收记录

- 层号 = 自下而上 0 起；名称列为 KRA 层名（“NNN” 前缀 + 部件路径）。
- “改动像素”为相对 step01 同层有任何通道变化的像素数；81 层全部有变化。
- “可见硬边 / 隐藏硬边”：本层 α≥0.9 且与 α<0.02 的像素 4 邻接的边缘像素数，分别统计没被上层盖住 / 被上层盖住（上层最大 α≥0.8）的部分，格式 step01→step02。数值越小，阶梯式硬边越少。
- 个别层的“可见硬边”数字上升（第 0、1、2、8、10、11、12、13、16、20、21、32、34、35、52、53、60 层）是统计口径造成的：上层边缘变软后，上层的覆盖范围（α≥0.8）略有收缩，原本被盖住的硬边像素被改计为可见。按 step01 的覆盖范围重算，这 17 层的可见硬边数都不高于 step01 的数字（例如第 1 层 33→33，第 60 层 34→34，第 11 层 3→3），并没有新增硬边。
- 多深度部件的各切片层（outer_loop_strand `010`/`015`，outer_loop_lock `012`/`016`）全部保留。
- 备注中的坐标为画布坐标 (x, y)，范围为 x1–x2 / y1–y2。

| 层 | 名称 | 改动像素 | 处理 | 可见硬边 step01→step02 | 隐藏硬边 step01→step02 | 验收备注 |
|---:|---|---:|---|---:|---:|---|
| 0 | `010` hair/ponytail_right/outer_loop_strand::back | 968 | MAS | 24→25 | 81→26 | 通过 |
| 1 | `011` hair/ponytail_left/inner_return_lock | 2215 | MAS | 33→56 | 556→63 | 通过（隐藏区去杂点） |
| 2 | `012` hair/ponytail_left/outer_loop_lock::back | 2849 | MAS | 73→74 | 194→47 | 通过 |
| 3 | `013` hair/ponytail_right/main_strand | 5609 | MASUB | 104→71 | 498→245 | 通过；(433,327–337) 下垫补半透明缝；(388–395,432–437) 用本层中位色补杂点 |
| 4 | `014` hair/ponytail_left/main_lock | 4468 | MASU | 118→82 | 524→161 | 通过；(715,471) 小孔补实 |
| 5 | `015` hair/ponytail_right/outer_loop_strand::front | 2797 | MA | 47→9 | 19→11 | 通过 |
| 6 | `016` hair/ponytail_left/outer_loop_lock::front | 5041 | MGU | 468→7 | 6→1 | **遗留**：灰色外轮廓线 x≈693–700、y≈115–148 比参考淡且略呈点状，切向平滑两轮后仍未恢复参考的密度 |
| 7 | `017` hair/ponytail_right/inward_curl_strand | 4976 | MASU | 470→44 | 116→48 | 通过；两处半透明缝下垫（398–410,512–530 与 384–399,544–580） |
| 8 | `018` hair/back_hair | 8660 | MASTB | 4→17 | 428→111 | 通过；隐藏弧线边缘与色调平滑；(601–605,206–208) 杂点补色。遗留：(466,213) 附近淡紫发丝略乱且有深色小点 |
| 9 | `019` neck | 513 | MA | 9→9 | 147→16 | 通过 |
| 10 | `020` legs/leg_right/leg | 6291 | MAS | 22→31 | 363→45 | 通过 |
| 11 | `021` legs/leg_left/leg | 6611 | MAH | 3→19 | 403→48 | 通过；脚踝隐藏区调和填补 |
| 12 | `022` arms/arm_right/hand/little_finger | 112 | A | 1→3 | 101→45 | 通过 |
| 13 | `023` arms/arm_right/hand/ring_finger | 244 | MA | 21→25 | 52→21 | 通过 |
| 14 | `024` arms/arm_right/hand/middle_finger | 188 | MA | 34→11 | 56→36 | 通过 |
| 15 | `025` arms/arm_right/hand/index_finger | 334 | MA | 31→14 | 46→13 | 通过 |
| 16 | `026` arms/arm_right/hand/thumb | 358 | MA | 0→2 | 28→9 | 通过 |
| 17 | `027` arms/arm_right/hand/palm | 939 | MA | 34→1 | 31→14 | 通过 |
| 18 | `028` arms/arm_right/forearm | 1883 | MAG | 100→1 | 43→13 | 通过；(396–410,506–533) 外缘细线切向平滑 |
| 19 | `029` arms/arm_right/upper_arm | 2002 | MA | 139→15 | 129→9 | 通过；补全部分偏平（仅一层淡色），右上有 1 个深色小点 (411,478) 未处理 |
| 20 | `030` arms/arm_left/hand/little_finger | 112 | A | 0→3 | 86→34 | 通过 |
| 21 | `031` arms/arm_left/hand/ring_finger | 169 | MAS | 9→16 | 83→31 | 通过 |
| 22 | `032` arms/arm_left/hand/middle_finger | 384 | MAU | 39→19 | 37→14 | 通过；(721,743) 小孔补实 |
| 23 | `033` arms/arm_left/hand/index_finger | 322 | MAU | 36→5 | 35→8 | 通过；(710,754) 小孔补实 |
| 24 | `034` arms/arm_left/hand/thumb | 273 | MA | 0→0 | 26→14 | 通过 |
| 25 | `035` arms/arm_left/hand/palm | 817 | MA | 27→0 | 31→15 | **遗留**：(720,658) 参考有连续灰色腕/掌轮廓线 (y 650–672)，本层只有粉色点状线；未补画缺失笔画 |
| 26 | `036` arms/arm_left/forearm | 1892 | MASU | 69→13 | 61→24 | 通过；(689,526) 小孔补实 |
| 27 | `037` arms/arm_left/upper_arm | 1931 | MASD | 191→21 | 133→16 | 通过；(657,317–334) 粉色条纹因过密 α 被减薄。遗留：条纹下方 y≥330 仍有一小团偏粉 |
| 28 | `038` pelvis | 2033 | MASG | 262→2 | 161→5 | 通过；(620–644,518–546) 轮廓残片切向平滑 |
| 29 | `039` body/torso | 3824 | MASGU | 449→42 | 130→72 | 通过；轮廓残片切向平滑（462–478,402–424；612–634,406–430；618–638,506–534）；(479,278) 小孔补实 |
| 30 | `040` body/breast | 2437 | MG | 460→10 | 0→0 | 通过；轮廓残片切向平滑（462–478,402–424；612–634,406–430） |
| 31 | `042` face/ear_right | 319 | AS | 0→0 | 112→2 | 通过 |
| 32 | `043` face/ear_left | 336 | AS | 0→1 | 116→5 | 通过 |
| 33 | `044` face/face_base | 6222 | MAST | 79→16 | 285→24 | 通过；脸部整层隐藏区色调平滑（鬼影圈去除），可见边缘重抠 |
| 34 | `045` face/eye_right/sclera | 95 | MA | 19→27 | 81→34 | 通过 |
| 35 | `046` face/eye_left/sclera | 108 | MAS | 18→19 | 81→30 | 通过 |
| 36 | `047` face/eye_right/iris | 59 | M | 53→25 | 25→20 | 通过 |
| 37 | `048` face/eye_left/iris | 63 | M | 53→21 | 21→18 | 通过 |
| 38 | `049` face/eye_right/highlight | 36 | M | 13→0 | 0→0 | 通过 |
| 39 | `050` face/eye_left/highlight | 41 | M | 18→0 | 0→0 | 通过 |
| 40 | `051` face/eye_right/lower_eyelid | 137 | M | 44→5 | 3→3 | 通过 |
| 41 | `052` face/eye_left/lower_eyelid | 104 | M | 35→1 | 0→0 | 通过 |
| 42 | `053` face/eye_right/upper_eyelid | 205 | M | 111→21 | 0→0 | 通过 |
| 43 | `054` face/eye_left/upper_eyelid | 225 | M | 108→7 | 7→4 | 通过 |
| 44 | `055` face/eye_left/lower_eyelashes | 12 | M | 4→0 | 0→0 | 通过 |
| 45 | `056` face/eye_right/eyelid_crease | 107 | M | 41→7 | 0→0 | 通过 |
| 46 | `057` face/eye_left/eyelid_crease | 96 | M | 32→0 | 0→0 | 通过 |
| 47 | `058` face/eyebrow_right | 107 | MA | 28→16 | 41→10 | 通过 |
| 48 | `059` face/eyebrow_left | 94 | MA | 23→11 | 45→17 | 通过 |
| 49 | `060` face/nose | 15 | M | 6→0 | 0→0 | 通过 |
| 50 | `061` face/mouth/mouth_interior | 294 | G | 0→0 | 60→7 | 单层外缘由阶梯变为柔和过渡（切向平滑）；栈内被唇/舌覆盖，合成与参考相符 |
| 51 | `062` face/mouth/tongue | 55 | M | 20→13 | 26→18 | 通过 |
| 52 | `063` face/mouth/upper_teeth | 4 | M | 6→7 | 16→15 | 通过 |
| 53 | `064` face/mouth/lower_teeth | 98 | G | 0→2 | 33→1 | 同上（体积很小） |
| 54 | `065` face/mouth/lower_lip | 135 | M | 53→10 | 12→6 | 通过 |
| 55 | `066` face/mouth/upper_lip | 131 | M | 57→1 | 0→0 | 通过 |
| 56 | `067` head_accessories/left_hair_bow/white_ribbon_tail | 363 | MAS | 64→4 | 59→3 | 通过 |
| 57 | `068` head_accessories/left_hair_bow/long_black_ribbon_tail | 379 | MAS | 60→59 | 154→43 | 通过 |
| 58 | `069` head_accessories/left_hair_bow/short_black_ribbon_tail | 521 | MA | 146→18 | 63→9 | 通过 |
| 59 | `070` head_accessories/left_hair_bow/bow_body | 1075 | MAS | 76→15 | 80→7 | 通过；遗留：隐藏左条带 (640–690,160–220) 为合理但略带斑点的补全 |
| 60 | `071` head_accessories/right_hair_bow/long_black_ribbon_tail | 722 | MAS | 34→63 | 257→44 | 通过 |
| 61 | `072` head_accessories/right_hair_bow/short_black_ribbon_tail | 857 | MAS | 111→12 | 159→7 | 通过 |
| 62 | `073` head_accessories/right_hair_bow/short_white_ribbon_tail | 382 | MA | 117→16 | 80→25 | 通过 |
| 63 | `074` head_accessories/right_hair_bow/bow_body | 1099 | MAS | 74→3 | 89→6 | 通过 |
| 64 | `075` hair/side_hair_left | 2376 | MAS | 303→69 | 201→13 | 通过 |
| 65 | `076` hair/side_hair_right | 2321 | MAU | 292→31 | 196→18 | 通过；(449,187) 小孔补实 |
| 66 | `077` hair/bangs | 2672 | MA | 687→20 | 28→14 | 通过；可见硬边 687→20（发尖/发丝） |
| 67 | `078` head_accessories/cross_hair_clip | 163 | M | 92→4 | 0→0 | 通过 |
| 68 | `079` head_accessories/heart_hair_clip | 111 | M | 59→7 | 0→0 | 通过 |
| 69 | `080` legs/leg_right/foot | 1799 | MASU | 87→5 | 28→19 | 通过；(478,1210) 小孔补实。遗留：隐藏的鞋带端头偏突兀 |
| 70 | `081` legs/leg_left/foot | 1672 | MAS | 26→10 | 64→38 | 通过；遗留：隐藏的鞋带端头偏突兀 |
| 71 | `082` legs/leg_left/ankle_strap/strap_band | 585 | MA | 137→18 | 34→23 | 通过 |
| 72 | `083` legs/leg_left/ankle_strap/rectangular_buckle | 418 | M | 86→0 | 0→0 | 通过 |
| 73 | `084` legs/leg_right/shoelace_bow/tail_right | 143 | MAS | 32→8 | 33→10 | 通过 |
| 74 | `085` legs/leg_right/shoelace_bow/tail_left | 121 | MA | 29→11 | 24→7 | 通过 |
| 75 | `086` legs/leg_right/shoelace_bow/loop_right | 600 | MA | 94→9 | 17→7 | 通过 |
| 76 | `087` legs/leg_right/shoelace_bow/loop_left | 458 | MA | 105→5 | 15→9 | 通过 |
| 77 | `088` legs/leg_left/shoelace_bow/bow_loop_inner | 573 | MA | 135→6 | 13→5 | 通过 |
| 78 | `089` legs/leg_left/shoelace_bow/bow_loop_outer | 609 | M | 127→9 | 15→9 | 通过 |
| 79 | `090` legs/leg_right/shoelace_bow/knot | 196 | M | 36→0 | 0→0 | 通过 |
| 80 | `091` legs/leg_left/shoelace_bow/bow_knot | 175 | M | 36→0 | 0→0 | 通过 |
## 4. 复开验证

对最终保存的 `character-soft-edges.kra` 重新打开后检查（`workspace/scripts/verify.py`，记录在 `workspace/records/verify-log.json`、`workspace/records/apply-log.json`）：

| 检查项 | 结果 |
|---|---|
| 节点数 | 81 / 81，`problems` 为空 |
| 层名与顺序 | 与 step01 `character-depth.kra` 完全一致（逐项比对） |
| 层属性 | 81 层均为 paintlayer、normal 混合、不透明度 255、可见、0 个子节点；位置 (0,0)；无蒙版 |
| 像素 | 复开后逐层导出（`workspace/reopened-layers/000–080.png`）与保存前的源内容 81/81 逐像素相等（`equal_src` 全为 true） |
| Krita 投影 vs 自算合成 | 最大差 1（289 px），来自取整 |
| PNG vs Krita 投影 | `character-soft-edges.png` 就是复开 KRA 的 Krita 投影（`workspace/records/projection-log.json`），与该投影逐像素相等（最大差 0），1086×1448，透明背景保留 |

## 5. 整体对比（合成图 vs 参考图）

主要判断依据是放大后的逐层与整图目测（`workspace/checks/layer-solo/`、`workspace/checks/regions/`、`checks/overview-reference-step01-step02.png`）。下列数字只作旁证，不作验收标准。

| 指标 | step01 | step02 | 参考 |
|---|---:|---:|---:|
| 平均绝对色差 | 1.645 | 1.370 | — |
| 色差 >30 的像素数 | 5505 | 4307 | — |
| 色差 >60 | 2626 | 1608 | — |
| 色差 >120 | 1181 | 556 | — |
| 合成图上的阶梯式硬边像素数 | 208 | 5 | 0 |
| 平均梯度能量 | 7.02 | 6.09 | 6.81 |
| 每周长像素的过渡带像素数 | 1.77 | 2.22 | 3.30 |
| 过渡带内 α 平均误差 | 0.083 | 0.054 | — |
| α≥128 与参考不一致的像素数 | 197 | 1133 | — |

- α≥128 不一致数上升是预期内的：原来的硬边被换成了软过渡，半透明像素落在 128 阈值两侧。其中除 8 个像素外，其余都在参考 0.5 轮廓线 1 px 以内。
- 像素差异定位工具（`mcp__layering__locate_pixel_differences`）按默认阈值给出 0 个候选区域；颜色差异像素数 471→101。改用更敏感的阈值（color 60、coarse 24、最小 12 px）仍有 4 个候选：(635,82)、(700,554)、(466,213)、(720,658)，已逐个放大对照参考，除 (466,213)、(720,658)、(635,82) 在 §6 记为遗留外，其余与参考接近。输出在 `workspace/pixel-review/`。
- 逐层统计：可见硬边合计 7143→1259，隐藏硬边合计 7177→1745。
- 内部梯度能量约为参考的 89%，整体比参考略软；过渡带平均宽度（2.22）仍窄于参考（3.30），即边缘比 step01 软得多，但没有软到与参考完全相同。

## 6. 仍未解决 / 只是部分完成的项目

1. 第 6 层（outer_loop_lock::front）：x≈693–700、y≈115–148 的灰色外轮廓线比参考淡、略呈点状。切向平滑两轮后仍未恢复参考的密度。
2. 第 25 层（arm_left/hand/palm）：参考在 (720,658) 一带 y 650–672 有一条连续的灰色腕 / 掌轮廓线，本层只有粉色点状线。缺失的笔画未补画——补画等于新增内容，不属于本步范围。
3. 第 65 层 / 第 8 层：(466,213) 附近的淡紫发丝略乱，带深色小点。
4. (635,82) 一处深色边缘比参考略硬。
5. 第 27 层（arm_left/upper_arm）粉色条纹下方 y≥330 仍有一小团偏粉。
6. 参考中约 1.7k px 真实存在的半透明淡紫楔形区域，在合成图里是不透明的。
7. 第 59 层（left_hair_bow/bow_body）隐藏左条带 (640–690,160–220) 是合理但略带斑点的补全；第 69 / 70 层隐藏的鞋带端头偏突兀。
8. 第 19 层（arm_right/upper_arm）的补全部分偏平，右上有 1 个深色小点 (411,478) 未处理。
9. 头发边缘 (430–433,340–362) 一带像素相对参考的中性灰有约 10–30 级的紫 / 酒红偏色。
10. 剩余的单像素半透明缝：(405,510–511)、(389,581–582)、(387,584)、(718,474)、(713,757)、(621,509)、(406,508)、(624,413)。
11. 第 50 层（mouth_interior）单层外缘已由阶梯变为柔和过渡，但整体栈里的嘴部观感由唇和舌承担，该层自身不是验收重点。
12. **补全区的“轻微柔光渐变”只做了连续性处理（A / S / T / H 与 U），没有额外绘制渐变。**第 8、33、11 层做了色调平滑 / 调和填补，其余补全保持 step01 的生成内容；平面感最强的是第 19 层。为避免触碰“不画阴影 / AO / 投影”的限制，没有再往补全里加明暗。

## 7. 与任务要求的偏差（如实记录）

1. **改动是脚本化的“软笔刷算子”，不是在 Krita 界面里手绘的笔触。**每个算子都按层、按区域给定参数并记录，改动后逐处放大对照参考目测复查；但这不等同于任务要求的“在 Krita 中用柔边笔刷 / 涂抹 / 模糊笔刷”。Krita 只用于写入、保存、重新打开、逐层导出和投影（经 kritarunner 的 Python API）。
2. 外缘重抠（M）里，**参考图被数值使用**：用来解每个边缘带像素的过渡 α，并在本层自己的几种颜色之间取舍。写入图层的颜色都来自该层自身，没有粘贴任何参考像素；但这一步是公式式批量处理，不是逐点手绘。
3. 柔化是逐层、逐边缘带进行的，没有整层模糊，也没有全局羽化；隐藏区算子（A / S / T / H）只改被上层覆盖的像素，合成逐位不变。
4. 没有改动部件形状、层级、顺序、名称和归属；没有画阴影 / AO / 投影；没有混入邻居内容。轮廓只在过渡带内移动约 0.5–2 px。
5. 运行环境：Krita 5.3.4.1（`/data/home/lockliu/.local/share/astra-layering-codex/krita`），仅给 Krita 子进程使用独立的 XDG 目录，DISPLAY=:121；没有改动本进程的 HOME、登录环境、用户插件和全局 Krita 设置，没有碰机器上其他 Krita / Xvfb 实例。日志里的 “QtSingleCoreApplication listen failed”、“tiles leaked” 警告无害。

## 8. 文件索引

- `character-soft-edges.kra` / `character-soft-edges.png`：交付物。
- `workspace/records/layer-table.md`、`workspace/records/layer-table.json`：§3 逐层表的来源；`workspace/records/verify-log.json`、`workspace/records/apply-log.json`、`workspace/records/projection-log.json`、`workspace/records/export-log.json`：写回、复开、投影日志；`workspace/records/layer-stats.json` 是更早（u9 阶段）的统计，最终数字以 `layer-table.json` 为准。
- `workspace/records/try*-info.json`、`p*-info.json`、`s*-seam.json`、`sp1`、`t1/t2`、`h1`、`u*-*.json`、`job-*.json`：各算子的参数与变动记录。
- `workspace/checks/layer-solo/`：78 张逐层对照图（参考 | step01 单层 | step02 单层 | step02 叠到本层为止）；`workspace/checks/regions/`：11 张区域放大对照；`checks/overview-reference-step01-step02.png`：整图总览；`workspace/checks/stage-images/`：过程阶段图。
- `workspace/reopened-layers/`：复开 KRA 后导出的 81 张逐层 PNG。
- `workspace/pixel-review/`：像素差异定位工具输出（heatmap、marked、comparison、differences.json）。
- `workspace/scripts/`：全部脚本（算子、`apply.py`、`verify.py`、`projection.py`、`run.sh` 等）。
