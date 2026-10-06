# head 直属轮廓色块独立审查

- reviewer: group_child_layers:head:review
- 工作根: /Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s1
- candidate: block-layers/groups.svg；reference: references/base-subject.png；groups: structure/groups.json。
- 范围: 9 个直属 group + 3 个直属 part。候选、树、参考只读。各坐标均为原始 895×1758 参考像素。
- 范围报告：refinement/groups/head/2.直属拆分与色块/2.2.直属轮廓色块/轮廓检查.json 中 12/12 项 pass，outside_samples=0。此结论仅指父范围容纳，不替代下述视觉判定。
- 实际先查看 evidence/00-full.png：完整参考、完整候选、35% 混合和边缘叠加。长发主要整体走向齐备；头部当前图层显影覆盖属后续处理，本次逐个独显核对。

## 01 head/face — revise（初看 pass，邻接复核后更新）
- 容器 id: group-head-face；色块 id: head-face-skin。
- 实际查看: evidence/01-face.png（--only group-head-face --reference references/base-subject.png --crop 338 160 195 177 --scale 4 --edge-overlay）。
- 对照：下颌 (394,302)→(435,323)→(473,300) 的弧度、下巴位置与参考吻合；两侧耳部在 (372,258)-(378,276)、(491,252)-(504,273) 与可见耳根相接。上额边界位于前发遮挡区，为面部补全范围，允许重叠。
- 本层不检查五官内部刻画；下颌初看未见明显断裂。初次判视觉 pass，随后前发窄窗邻接复核发现左耳可见皮肤漏描，以下补充记录将最终结论更新为 revise。

## 02 head/front_hair — revise
- 容器 id: group-head-front-hair；色块 id: head-front-hair-cap。
- 实际查看: evidence/02-front-hair.png（crop 332 108 206 200，4×，独显+混合+edge-overlay），进一步查看 evidence/02-front-hair-gap.png（crop 340 225 65 67，8×）。
- 外缘：发冠 (435,120) 至两侧 (348,196)/(522,212)，以及两侧下弯大走向基本对应。发尾与肩前发根重叠属于允许范围。
- 明确问题：左侧叠发与主刘海之间有两处可见肤色窄窗，约 x=369–372,y=242–250 及 x=361–365,y=254–263；8× 参考清楚呈肤色三角缝，而候选整片实心色块覆盖两缝，edge-overlay 没有任何内孔边界。需按可见形状保留这两处开口/孔洞，不能当作内部发丝细节省略。
- 范围 pass，视觉 revise。

### 01 head/face 邻接复核补充 — 改为 revise
- 由 evidence/02-front-hair-gap.png 发现上述两处肤色窄窗后，回对 evidence/01-face.png 及 head-face-skin 左缘：当前面部左边界 y≈250–263 位于 x≈369–373，未覆盖 (361–365,254–263) 的可见耳肤。
- 需补齐左耳在前发孔洞后露出的肤色范围，并同 front_hair 的孔洞共同复核；此处属于可见耳部漏描，不能以隐藏区域重叠豁免。下颌原观察仍成立，整层结论更新为 revise。

## 03 head/face_framing_hair_left — revise
- 容器 id: group-head-face-framing-hair-left；色块 id: head-framing-left-main、head-framing-left-loop。
- 实际查看: evidence/03-framing-left.png（crop 303 235 99 365，3×）、evidence/03-framing-left-shoulder.png（crop 308 385 82 180，5×），均为逐个独显 reference+edge-overlay。
- 对照：耳外小弯发 (344,313)-(345,347) 的开口仍在；主束从鬓角经肩前下垂的主轴与 S 形转向基本对应。
- 问题：主束 y≈480–545 的实际参考是分开的窄发片，候选以连续宽带并合。5× 图中左侧细发弧与主发之间的肤色细缝没有保留；向下转折段（约 x=324–347,y=508–552）候选内缘压进肤色，参考白发明显窄于候选。需顺着实际白发两边复核宽度并保留细缝，不能只对齐总体 S 形中轴。末端仍需与后发相邻处复验。
- 范围 pass，视觉 revise。

## 04 head/face_framing_hair_right — revise
- 容器 id: group-head-face-framing-hair-right；色块 id: head-framing-right-main、head-framing-right-loop。
- 实际查看: evidence/04-framing-right.png（crop 470 235 106 365，3×）、evidence/04-framing-right-shoulder.png（crop 495 395 75 180，5×），独显+reference+edge-overlay。
- 对照：根部至肩部的主束连续，耳外环状细束有保留；下方主尖梢到 (546,589) 基本落在参考尖梢附近。
- 明确问题：胸侧外弯参考存在一条外侧细弧发片与主束之间的肤色长缝（约 x=552–562,y=473–512）；候选把这段大体填成一条实心宽带，且 y≈486–532 的主束内缘向身体侧偏、覆盖肤色。5× edge-overlay 可见候选内外边界并未同时贴住真实白发两侧。需还原外侧细弧与其内的皮肤开口，重核主束在转弯段的真实宽度。
- 范围 pass，视觉 revise。

## 05 head/rear_hair_left — revise
- 容器 id: group-head-rear-hair-left；色块 id: head-rear-left-main、head-rear-left-neck、head-rear-left-central-tail、head-rear-left-root、head-rear-left-hidden。
- 实际查看: evidence/05-rear-left-upper.png（crop 295 245 165 460，2×）、evidence/05-rear-left-middle.png（145 650 230 470，2×）、evidence/05-rear-left-lower.png（90 1060 375 470，2×）；疑点另看 evidence/05-rear-left-ear-loop.png（335 270 50 95，6×）。四图均独显 reference+edge-overlay。
- 上段：后脑根部、肩后遮挡延续允许重叠；但 (343–357,292–339) 耳外发环内的白色背景狭缝在候选中几乎被填满，仅底端残留极小白点。6× 图中参考完整狭长白孔清楚，候选没有对应的孔缘。需检查 main/neck/root 的合成孔洞，避免各子路径互相填掉可见空隙。
- 中段：外侧大环 (184–264,650–811) 与手旁孔 (183–212,846–975) 均存在，外轮廓和孔缘主要转折位置与参考对应；没有把手旁大孔填实。
- 下段：外卷尖 (140,1272)、(177,1455)、(147,1487)、(264,1510)、(273,1480)、内侧尖 (360,1423) 均已覆盖并保持分叉开口；中央腿间尾 (441,1310) 也在。隐藏于腿后的大块补全不当作越界。
- 范围 pass；因上段真实白孔丢失，视觉 revise。

## 06 head/rear_hair_right — pass
- 容器 id: group-head-rear-hair-right；色块 id: head-rear-right-main、head-rear-right-neck、head-rear-right-root、head-rear-right-hidden。
- 实际查看: evidence/06-rear-right-upper.png（crop 430 245 185 460，2×）、evidence/06-rear-right-middle.png（520 650 240 475，2×）、evidence/06-rear-right-lower.png（510 1070 340 460，2×），均独显 reference+edge-overlay。
- 上段：耳外 (513–531,284–342) 狭长孔保留，肩后轮廓连接连续；面颈与躯干遮挡下的连续大块为补全范围。
- 中段：右外大环的内外边缘 (616–726,650–883) 及下方孔 (690–735,951–1102) 与参考转向对齐，未将孔口封闭。
- 下段：外甩长尖 (839,1313)、卷尖 (741,1480)、尾尖 (732,1492)、(617,1511)、小分叉 (609,1481)、内卷尖 (519,1423) 均存在，分叉及白色开口连贯；形状宽度、弧度没有明显变形。候选在腿后重叠部分不作为可见边缘问题。
- 范围 pass，视觉 pass。

## 07 head/crown — revise
- 容器 id: group-head-crown；色块 id: head-child-crown-arch、head-child-crown-left/right、head-child-crown-left/right-scroll、head-child-crown-jewel、head-crown-mid-chain、head-crown-mid-gems。
- 实际查看: evidence/07-crown.png（crop 275 10 330 215，3×），evidence/07-crown-left.png（280 35 115 125，5×），evidence/07-crown-right.png（477 35 115 125，5×），evidence/07-crown-center.png（390 65 95 160，5×）；均独显 reference+edge-overlay。
- 对照通过部分：上拱梁 (435,18) 与两侧主卷的大致走向存在；两侧较大镂空没有全部填平；额前大菱石 (424–449,175–203) 和底部小坠 (432–440,204–219) 的位置、尺寸基本对应。
- 明确问题 1（中冠蓝饰）：head-child-crown-jewel 用多边形概括后，左右外侧花瓣漏去可见外翼，约 (388–398,97–111)、(474–485,97–112)；中部底缘约 (405–420,112–121)、(455–471,112–121) 又压进前发。5× 中央图可见候选边界直接穿过实际瓣片。需按完整可见冠饰外缘重画，而非将外瓣归入发髻。
- 明确问题 2（两翼细部与孔）：约 (316–325,110–123) 及镜像 (547–556,110–123) 的实际连接卷饰被简化成悬浮小三角，连接形体漏描；两翼小孔约 (351–357,85–94)、(515–521,85–94) 在候选中变成触及外缘的白缺口，参考为窄长闭合小孔。需保留这些可见连接与镂空拓扑。
- 明确问题 3（右翼轮廓）：右侧上尖/竖卷约 (505–530,43–103) 比参考向左缩，部分边缘相差数像素；左右镜像替代实际轮廓使右侧尖梢和小孔错位。5× 右翼图中粉线与金属外缘连续分离。
- 范围 pass，视觉 revise。

## 08 head/hanging_ribbon_left — revise
- 容器 id: group-head-hanging-ribbon-left；色块 id: head-child-ribbon-left、head-child-chain-left。
- 实际查看: evidence/08-ribbon-left.png（crop 265 125 60 430，3×）、evidence/08-ribbon-left-chain.png（289 131 30 72，8×），独显 reference+edge-overlay。
- 对照通过部分：长蓝带约 (293,193)→(285,422)→(273,544)，外宽和下段收尖跟随参考；上部菱形坠与圆坠的位置大致对应。
- 明确问题：上接冠翼的金属链在参考中有两个细小开环（约 x=302–306,y=138–147 及 x=301–305,y=149–153），候选将上环实填成叶形、下环实填成三角，孔洞完全缺失；上接段还向左错开约 2px。圆坠与带头之间及带头中的白色小开孔（约 x=301–305,y=176–188）未保留。8× 图能直接区分参考环内背景与候选实心区域，需保留链节和带头的可见开孔并检查与 crown 翼端实际接点。
- 范围 pass，视觉 revise。

## 09 head/hanging_ribbon_right — revise
- 容器 id: group-head-hanging-ribbon-right；色块 id: head-child-ribbon-right、head-child-chain-right。
- 实际查看: evidence/09-ribbon-right.png（crop 550 125 65 430，3×）、evidence/09-ribbon-right-chain.png（552 131 32 72，8×），独显 reference+edge-overlay。
- 对照通过部分：带身从 (556–576,194) 延至 (607,545) 的宽度和弯向基本对应，末端尖梢完整，带身无断裂。
- 明确问题：与左侧一样，参考上链两个小环约 (564–570,138–153) 被实填为叶片/三角，圆坠至带头的细金属开环及带头白孔约 (564–569,176–188) 被填满；8× 图中参考开环背景可见，候选没有孔缘。上链及带头中心还较参考偏左约 1–2px，需与冠翼接点共同核准。
- 范围 pass，视觉 revise。

## 10 head/topknot_bun — pass
- 容器 id: part-head-topknot-bun；色块 id: head-child-topknot-bun。
- 实际查看: evidence/10-topknot.png（crop 380 38 115 95，5×，独显 reference+edge-overlay）。
- 对照：顶端 (433,47)、左右鼓起 (390,85)/(481,82) 与发髻可见外缘一致，圆弧无缺口；底部 (398,120)-(473,121) 位于冠饰/前发遮挡处，闭合补全可接受。冠饰外瓣不能由本发髻替代，已在 crown 项明确要求补齐。
- 范围 pass，视觉 pass。

## 11 head/earring_left — pass
- 容器 id: part-head-earring-left；色块 id: head-earring-left-chain、head-earring-left-jewel。
- 实际查看: evidence/11-earring-left.png（crop 372 265 23 130，6×）、evidence/11-earring-left-upper.png（375 271 17 48，8×），独显 reference+edge-overlay。
- 对照：可确认的蓝坠约 (380–386,285–299)，其上短连接与下方细链至 y≈313 连续；候选宽度、朝向、中心基本覆盖参考对应饰件，顶端藏在耳下允许小量重叠。
- 归属疑点已核看较长裁图：y≈313 以下的长白线沿肩前发束内缘持续下行、在肩胸处随发丝弯曲；短链本身在 y≈312–313 有折角/小端部，长白线紧邻它从发束延伸。本参考不足以将这条整段长白线确定为耳坠，不将其列作本 part 漏描；后续肩前发细分时保留该可见窄发丝。
- 范围 pass；可确认耳坠可见外形视觉 pass。

## 12 head/earring_right — pass
- 容器 id: part-head-earring-right；色块 id: head-earring-right-chain、head-earring-right-jewel。
- 实际查看: evidence/12-earring-right.png（crop 480 263 27 165，5×）、evidence/12-earring-right-upper.png（485 270 16 48，8×），独显 reference+edge-overlay。
- 对照：蓝坠约 (489–495,283–298)、耳下细连接及下端至 y≈312 的短链在候选中连续，中心、最大宽度和尖端位置基本对应，未发现可确认的断链或蓝坠漏描。
- y>312 的相邻长白线也沿肩前发束连续弯向胸侧，不能仅因颜色相同认作耳坠延续；左右证据共同支持不对此归属不确定段提出耳坠返修要求。
- 范围 pass；可确认耳坠可见外形视觉 pass。

## 本轮完整结论 — revise

12/12 个直属孩子已经实际独显查看并记录，范围报告 12/12 pass；视觉 4 pass（rear_hair_right、topknot_bun、earring_left、earring_right）、8 revise。返修必须处理下列明确可见问题：

| 路径 | 容器 id | 返修重点 | 主要图证 |
|---|---|---|---|
| head/face | group-head-face | 左耳两处发片缝后的皮肤覆盖，尤其 (361–365,254–263) | 01-face.png、02-front-hair-gap.png |
| head/front_hair | group-head-front-hair | 左侧两个肤色窄窗被实填 | 02-front-hair-gap.png |
| head/face_framing_hair_left | group-head-face-framing-hair-left | 胸侧窄发片间皮肤细缝与主束宽度 | 03-framing-left-shoulder.png |
| head/face_framing_hair_right | group-head-face-framing-hair-right | 胸侧外弧发片内的皮肤开口与主束宽度 | 04-framing-right-shoulder.png |
| head/rear_hair_left | group-head-rear-hair-left | 耳外发环孔 (343–357,292–339) 被合成填满 | 05-rear-left-ear-loop.png |
| head/crown | group-head-crown | 中冠外瓣漏描、两翼小卷断连与小孔拓扑、右翼轮廓偏移 | 07-crown-left.png、07-crown-right.png、07-crown-center.png |
| head/hanging_ribbon_left | group-head-hanging-ribbon-left | 链环与带头白孔缺失、接点偏移 | 08-ribbon-left-chain.png |
| head/hanging_ribbon_right | group-head-hanging-ribbon-right | 链环与带头白孔缺失、接点偏移 | 09-ribbon-right-chain.png |

- 此结论来自上列实际图像对照，未采用制作自检作为视觉判定。
- 隐藏根部和身体/腿后补全重叠没有被误判为越界；当前组合的最终显影顺序留后续。
- 本轮仅写审查与证据，没有修改候选、树或参考。返修交原 group:head worker；复验须同时看前发/脸/前束/左后发间的相接处，以及 crown 与两侧 hanging_ribbon 的接点。
- 总控冻结候选：reviews/group_child_layers/head/candidate-01.svg，SHA256 8a679bb10aba057c8ea29fe065e7a01842548a1b81aa8e24bce5ed841e672871；本轮所有证据来自同稿 block-layers/groups.svg。

# 第二版冻结候选复验（candidate-02）

- 复验身份仍为 group_child_layers:head:review；重新读取当前 2.2 流程、review 提示词、review/gpt-6-astra-xhigh.model（空标记文件）及 structure/groups.json。
- 只读候选：reviews/group_child_layers/head/candidate-02.svg；实际 SHA256 = 1a184ae27a7706a5ad20da61cbc0dc14e98f571709a86173300bfe0610edaf55。
- 本轮范围报告指向 revision-02-batch-03-parent-recovered/input-parent.groups.svg，12/12 项 pass 且 outside_samples=0；视觉单独判定。
- 新图证均在 reviews/group_child_layers/head/evidence-candidate-02/，由 svg_preview.py 从冻结 candidate-02 现场生成。先实际查看 00-full.png（整图混合+edge-overlay）、00-children-only.png（9 group + 3 part 一起 --only）、00-children-ear-junction.png（相同12孩子、crop 330 235 210 135，4×）。合成检查排除了 group-head 父底稿；后者保留在文件里会填某些孩子的孔，不能用它判孩子漏孔。

## 复验 01 head/face — pass
- 容器 id: group-head-face；色块 id: head-face-skin、head-face-left-ear-completion。
- 实际查看: evidence-candidate-02/01-face.png（only，crop 338 160 195 177，4×，reference+edge-overlay）及 00-children-ear-junction.png 的12孩子组合。
- 新增左耳皮肤覆盖原 (361–365,254–263) 窄窗以及上方 (369–372,243–251) 的可见肤色；在12孩子组合中两个窗口内均显为面部肤色，未露背景或后发色。补全范围余部藏于前发下，允许重叠。
- 下颌、右耳原通过轮廓无退化，原左耳漏描修复。范围 pass，视觉 pass。

## 复验 02 head/front_hair — pass
- 容器 id: group-head-front-hair；色块 id: head-front-hair-cap。
- 实际查看: evidence-candidate-02/02-front-hair.png（crop 332 108 206 200，4×）、02-front-hair-gap.png（340 225 65 67，8×），均 only/reference/edge-overlay；另回看12孩子耳侧组合。
- 两个新孔约 (368.4–372.3,242.9–251.0)、(360.8–364.9,253.1–262.4) 与参考肤色三角缝对应，8× 可见孔边沿着肤色而非发丝高光。组合中孔未被其他孩子堵住并由 face 覆盖；发冠外缘、中分额缘和左右末端未新增断裂。
- 原两孔实填问题修复，范围 pass，视觉 pass。

## 复验 03 head/face_framing_hair_left — pass
- 容器 id: group-head-face-framing-hair-left；色块 id: head-framing-left-main、head-framing-left-loop、head-framing-left-chest-loop。
- 实际查看: evidence-candidate-02/03-framing-left.png（crop 303 235 99 365，3×）及 03-framing-left-shoulder.png（308 385 82 180，5×），only/reference/edge-overlay。
- 新增胸侧外细弧沿 (328,468)→(317,493)→(328,514) 独立成窄条，与缩窄后的主束之间保留连续肤色缝；原 x324–347,y508–552 的粗宽带已收窄，内外边缘回到参考白发两侧。细弧两端与主束汇入连续，原耳侧小弯发和末端 (336,587) 回归无缺失。
- 上根重叠仍允许；原细缝和宽度问题修复。范围 pass，视觉 pass。

## 复验 04 head/face_framing_hair_right — pass
- 容器 id: group-head-face-framing-hair-right；色块 id: head-framing-right-main、head-framing-right-loop、head-framing-right-chest-loop。
- 实际查看: evidence-candidate-02/04-framing-right.png（crop 470 235 106 365，3×）、04-framing-right-shoulder.png（495 395 75 180，5×），only/reference/edge-overlay。
- 参考外侧细弧现由独立窄条沿 (539,447)→(562,490)→(551,513) 保留；内侧肤色长缝清楚，未再用宽带填满。主发弯折段 y≈486–532 已收窄，边界回到白发主体，细弧汇入主束无明显断口。耳侧原环、肩部连接及末梢 (546,589) 回归通过。
- 原开口与宽度问题修复。范围 pass，视觉 pass。

## 复验 05 head/rear_hair_left — pass
- 容器 id: group-head-rear-hair-left；色块 id: head-rear-left-main、head-rear-left-neck、head-rear-left-central-tail、head-rear-left-root、head-rear-left-hidden；新增孔洞裁剪 head-rear-left-ear-opening-clip / head-rear-left-ear-opening-geometry。
- 实际查看: evidence-candidate-02/05-rear-left-upper.png（295 245 165 460，2×）、05-rear-left-middle.png（145 650 230 470，2×）、05-rear-left-lower.png（90 1060 375 470，2×）、05-rear-left-ear-loop.png（335 270 50 95，6×），均 only/reference/edge-overlay；另实际查看 00-children-ear-junction.png。
- 耳侧可见狭孔现沿约 (352,303)→(345,319)→(346,333) 完整打开，6× 粉线围住参考白孔；12孩子组合中仍为背景色，没有被前发、脸或肩前发束再填。原上段实填问题修复。
- 中段大环、手旁孔和下段全部卷尖、中央腿间尾均回归与第一轮通过形态一致，无新增漏梢/断口；补全躯干与腿后区域保持连续。
- 保留父底稿造成的整图孔填充不计为该孩子问题；本条已由真实孩子组合核验。范围 pass，视觉 pass。

## 复验 06 head/rear_hair_right — pass
- 容器 id: group-head-rear-hair-right；色块 id: head-rear-right-main、head-rear-right-neck、head-rear-right-root、head-rear-right-hidden。
- 实际查看: evidence-candidate-02/06-rear-right-upper.png（430 245 185 460，2×）、06-rear-right-middle.png（520 650 240 475，2×）、06-rear-right-lower.png（510 1070 340 460，2×），only/reference/edge-overlay。
- 上段耳外长孔与肩后连接仍在；中段外大环及 y951–1102 下环没有封口；下段最外 (839,1313)、内卷 (519,1423)、底部各尖与分叉完整，形状和第一轮通过结果一致。补全区仍仅藏于身体/腿后，不影响本轮可见边缘结论。
- 回归范围 pass，视觉 pass。

## 复验 07 head/crown — revise（剩一处明确左翼白隙问题）
- 容器 id: group-head-crown；色块 id: head-child-crown-arch、head-child-crown-left/right、head-child-crown-left/right-scroll、head-child-crown-jewel、head-crown-mid-chain、head-crown-mid-gems。
- 实际查看: evidence-candidate-02/07-crown.png（275 10 330 215，3×）、07-crown-left.png（280 35 115 125，5×）、07-crown-right.png（477 35 115 125，5×）、07-crown-center.png（385 65 105 160，5×）；另外 07-crown-left-join.png（307 106 34 29，8×）与 07-crown-right-join.png（531 106 34 29，8×）。全部 only/reference/edge-overlay。
- 已修复：中冠蓝饰左右外瓣达到参考 (389,98)/(484,97) 外翼，底缘与前发交界基本贴住参考；两翼小孔已闭合，不再触及外缘；左右小卷饰不再悬浮，右翼已经独立形状且上段偏移明显改善；额饰及链中大菱石未回退。
- 剩余明确问题：左翼大卷与新补小卷之间的上方白色楔隙约 x=314–319,y=112–120，参考 8× 图中可见一块连续的白背景，candidate 把它填成蓝色，只剩外缘上一点浅缺口。07-crown-left-join.png 的 candidate 第2格是实心连块；第4格粉线在本应白隙的上方横跨，不能围出参考楔隙。对应合成的 head-child-crown-left 与 head-child-crown-left-scroll，需调整两者合成边界，保留卷饰连接同时重新打开此白隙。下方另一小三角孔存在，不能替代上方白隙。
- 右侧 07-crown-right-join.png 则有相应白色月牙/开口，不把它视为左右必须镜像；仅按左参考要求上述左侧修正。
- 范围 pass；因仍有明确可见负形被填，视觉 revise。

## 复验 08 head/hanging_ribbon_left — pass
- 容器 id: group-head-hanging-ribbon-left；色块 id: head-child-ribbon-left、head-child-chain-left。
- 实际查看: evidence-candidate-02/08-ribbon-left.png（265 125 60 430，3×）、08-ribbon-left-chain.png（289 131 30 72，8×），only/reference/edge-overlay。
- 上方 y138–142 和 y147–151 的两个细环孔、圆坠下 y177.5–181.8 的小环孔、带头 y183.8–188.8 的白孔均真实透空；上接环中心已移回参考约 x303.7。环到菱石、菱石到圆坠、下环到带头连续，无肉眼可见断链。
- 带身 (293,193)→(273,544) 的边缘及尖梢回归与原通过部分相符。原实填环孔和接点偏移修复。范围 pass，视觉 pass（与冠端组合另列统一邻接核验）。

## 复验 09 head/hanging_ribbon_right — pass
- 容器 id: group-head-hanging-ribbon-right；色块 id: head-child-ribbon-right、head-child-chain-right。
- 实际查看: evidence-candidate-02/09-ribbon-right.png（550 125 65 430，3×）与 09-ribbon-right-chain.png（552 131 32 72，8×），only/reference/edge-overlay。
- 顶端两链环、圆坠下环和带头白孔均打开，孔位置分别在 x≈567 的 y138–142、147–151、177.5–181.8、183.7–189，跟随参考细链；各饰件之间保持接续。带头中心和上链接点已纠正，带身两边和末端 (607,545) 未退化。
- 原实填孔与偏移问题修复。范围 pass，视觉 pass（与冠端组合另列统一邻接核验）。

## 复验 10 head/topknot_bun — pass
- 容器 id: part-head-topknot-bun；色块 id: head-child-topknot-bun。
- 实际查看: evidence-candidate-02/10-topknot.png（380 38 115 95，5×，only/reference/edge-overlay）。
- 顶部和两侧可见鼓圆边缘仍贴合，未随本次冠饰外瓣补全发生变形；下缘仍为冠饰遮挡下的允许补全区。原通过项无退化。
- 范围 pass，视觉 pass。

## 复验 11 head/earring_left — pass
- 容器 id: part-head-earring-left；色块 id: head-earring-left-chain、head-earring-left-jewel。
- 实际查看: evidence-candidate-02/11-earring-left.png（372 265 23 130，6×）、11-earring-left-upper.png（375 271 17 48，8×），only/reference/edge-overlay。
- 蓝坠轮廓、上下短连接及 y≈313 端部保持原通过形态，与扩展后的左耳和前发相邻处无新裂隙。第一轮关于下方长白发丝归属的审慎判断沿用，未产生新的耳坠漏描证据。
- 范围 pass，视觉 pass。

## 复验 12 head/earring_right — pass
- 容器 id: part-head-earring-right；色块 id: head-earring-right-chain、head-earring-right-jewel。
- 实际查看: evidence-candidate-02/12-earring-right.png（480 263 27 165，5×）、12-earring-right-upper.png（485 270 16 48，8×），only/reference/edge-overlay。
- 右蓝坠和上下短链仍与参考相接，位置、宽度及短链下端 y≈312 无退化；与右脸/肩前发根重叠未产生新的可见断裂。未将相邻长白发丝误判为耳坠延续。
- 范围 pass，视觉 pass。

## 第二版邻接与12孩子组合回归

- 实际查看 00-children-ear-junction.png：仅12孩子合成，左侧两个肤色窗显出 face，左后发新白孔仍透空；前发/脸/肩前发/后发之间没有把修复孔洞互相填掉。
- 实际查看 13-children-crown-links.png（仅12孩子，crop 275 105 325 100，3×）、13-children-left-link.png（290 129 28 68，8×）、13-children-right-link.png（554 129 28 68，8×），全部 reference+edge-overlay。两侧冠翼底端至最上链环均有接触，环孔保留；上、下链环与各宝石/带头接续无裂缝。两侧垂带复验 pass 得到组合确认。
- 候选组内隐藏根部仍可叠加，保留父底稿和实际孩子显影的差别已区分；父底稿填孔不计作孩子失败。组合中左冠上白楔隙仍是同一明确残留，非父底稿造成。

## 第二版完整结论 — revise

- 12/12 个直属孩子全部实际独显并放大查看，9 group + 3 part 覆盖完整；原8项返修均逐项核对，另外4项也重新渲染回归。
- 范围报告 12/12 pass；视觉 **11 pass、1 revise（head/crown）**。
- 原 face/front_hair、双 face_framing_hair、rear_hair_left、双 hanging_ribbon 共7个返修孩子已通过；crown 主要返修均改善，仅下面一项可见负形残留：

| 返修路径 | 容器及相关色块 id | 坐标/问题 | 实际证据 |
|---|---|---|---|
| head/crown | group-head-crown；head-child-crown-left 与 head-child-crown-left-scroll 的合成 | x314–319,y112–120，左大卷与新小卷之间的上白楔隙被蓝色填住，需保留卷饰连接并打开该白隙 | evidence-candidate-02/07-crown-left-join.png（8×，reference/candidate/blend/edge）及 07-crown-left.png |

- 其余本轮检查部分无新增明确问题；修复应限于该左翼局部并回归相邻下方小三角孔、上端轮廓和卷饰连续性，不需为该问题重做其他孩子。
- 本轮仅写图证与追加原审查报告，未改候选、参考、树、父文件或技能。最终显影顺序仍留后续。该 revise 已可交原 group:head worker 修复后给同一 review 身份复验。


# 第三版冻结候选局部恢复复验（candidate-03）— pass

- 本段实际独立审查 worker_id：`/root/review_head_crown_wedge_recovery`；节点身份：`group_child_layers:head:review`。本段为中断后的独立恢复审查，不冒用原 worker。
- 前面第一版和第二版完整逐件审查记录及原作者归属原样保留：原独立审查 worker 为 `/root/review_head_children`，原报告 reviewer 为 `group_child_layers:head:review`。本 worker 只重新实看本次冠部白楔局部及相关连接，未重新逐件实看全部 12 个直属孩子。
- 当前只读候选：`reviews/group_child_layers/head/candidate-03.svg`，SHA256 `cba25d38af900a7836261c32ec53fdf40aa65e5c5c767e1757affb238bea2cf6`。对照基线 candidate-02 SHA256 `1a184ae27a7706a5ad20da61cbc0dc14e98f571709a86173300bfe0610edaf55`。
- 已读取本节点流程、review 提示词与 review/gpt-6-astra-xhigh.model 空标记文件、当前树、参考、标准轮廓检查和原报告第二版结论。

## 独立核验变更范围与结论继承依据

- 本 worker 自行解析并对照两个候选：均为 91 个 XML 元素，元素 id 集相同；唯一属性差异为 `head-child-crown-left` 的 `d`。去除这个 `d` 值后，整个 SVG 逐字一致，说明父/根、定义资源、其他路径、变换、显隐、顺序和样式均未改变。
- 原 `head-child-crown-left` 的完整 `d` 为新 `d` 的原文前缀，所有旧外缘和旧孔原文保留；仅在末尾追加从 `(314.8,113.1)` 经 `(317.6,115.8)` 至 `(315.0,120.6)` 回闭的白楔子路径。前后 `fill-rule` 均为 `evenodd`。没有新增元素、白色填片、mask 或 clip。
- `head-child-crown-left-scroll` 逐字不变；另外 11 个直属孩子的完整 XML 子树均相同。当前 tree 与 revision 输入 tree 逐字相同，tree/reference 实际 SHA256 与返修前冻结值相同。独立核验明细：`evidence-candidate-03-recovery/independent-xml-check.json`。
- 因此继承第二版原作者已完成的 11 件 pass：head/face、head/front_hair、head/face_framing_hair_left、head/face_framing_hair_right、head/rear_hair_left、head/rear_hair_right、head/hanging_ribbon_left、head/hanging_ribbon_right、head/topknot_bun、head/earring_left、head/earring_right。crown 中与本次局部无关且逐字不变的第二版已通过部分也沿用原结论。
- 标准 `2.2.直属轮廓色块/轮廓检查.json` 为 12/12 pass、outside_samples 总计 0；其中记录的 draft.groups.svg 与冻结 candidate-03 实际字节一致。范围检查仅确认父范围容纳，以下视觉结论来自当前候选现场生成并实际查看的图像。

## 本 worker 实际生成并查看的图证

本次新图均在 `evidence-candidate-03-recovery/`，以只读 candidate-03 调用技能源 `tools/svg_preview.py` 现场生成，统一为 reference / candidate / 35% blend / edge-overlay 四格。运行均使用指定 runtime 的 `python -B`，临时渲染也写在本审查目录。参数与每张图 SHA256 见 `render-manifest.json`。

| 实际查看图 | 隔离范围、原图裁切与倍率 | 实看目的 |
|---|---|---|
| `00-full.png` | 完整候选与完整参考，1× | 先查看全图混合/轮廓，确认定位；不将这张概览视为本 worker 对 12 件的逐件复验 |
| `01-crown-left-join-8x.png` | only group-head-crown；crop 307 106 34 29；8× | 白楔、大小卷相接、下方三角孔和近旁上外缘 |
| `02-crown-left-5x.png` | only group-head-crown；crop 280 35 115 125；5× | 白楔在整个左翼内的位置、大小卷连续性、上端外缘及邻近旧孔 |
| `03-children-left-join-8x.png` | 树中 9 group + 3 part 一起 only，排除父底稿；crop 307 106 34 29；8× | 核对白楔未被其他孩子/相邻路径合成堵住 |
| `04-children-crown-links-3x.png` | 同上 12 孩子局部组合；crop 275 105 325 100；3× | 冠与左右吊带顶部连接和孔洞 |
| `05-children-left-link-8x.png` | 同上 12 孩子局部组合；crop 290 129 28 68；8× | 左冠端—上链环—菱坠/圆坠—带头连接 |
| `06-children-right-link-8x.png` | 同上 12 孩子局部组合；crop 554 129 28 68；8× | 右冠端—上链环—菱坠/圆坠—带头连接 |

另实际查看原 `evidence-candidate-02/07-crown-left-join.png`，只用于明确修复前实填状态，当前视觉结论由上表新图给出。

## head/crown 局部修项与邻接结论 — pass

- 完整路径 `head/crown`；容器 `group-head-crown`；本次变更色块 `head-child-crown-left`，相邻色块 `head-child-crown-left-scroll`。
- 当前 8× 图中，约 x314–319/y112–120 的上白楔由原来的蓝色实填打开为连续背景孔。其窄上端、右侧弧面和向下收尖方向与参考白背景楔隙对应；edge-overlay 现在围出这处孔缘，不再仅横跨其上方。混合图中白隙位于金属大小卷之间，没有把金属高光误作新的大孔。
- 新孔右下侧的小卷与左大卷仍通过下方实体连续相接，约 (320,122) 的连接未被切断；没有形成悬浮小片。下方旧小三角孔约 x313–318/y126–128 仍清楚独立存在，未与新上白楔合并，也未被填平。
- 5× 左翼图与 8× 接口图共同确认：原上端外缘的走向连续、左大卷和小卷的外形没有新增豁口；原左大卷内孔、上方细长孔及卷间长孔均保留。修复范围没有扩散到其他外缘。
- 仅 12 孩子的局部组合图在同一白楔位置仍透空，视觉形态与 crown 独显一致，因此 `head-child-crown-left-scroll` 及相邻孩子没有再将新孔堵住。此结论排除了保留父底稿的叠加影响。
- 冠端与左右吊带局部组合中，两侧最上链环仍接触冠翼底端；上、下链环、菱坠、圆坠及带头连续，环孔和带头白孔均保留。两侧相关连接复验 pass。

## candidate-03 整体结论 — pass（原完整审查 + 严格无变更继承 + 本次局部复验）

第二版唯一剩余 head/crown 上白楔问题已修复，本次实看相关连接无新增明确问题。12/12 范围通过；原作者第二版的 11 件视觉 pass 依严格无变更证据继承，crown 的唯一修项由本 worker 当前现场图证复验 pass，因此当前 candidate-03 整体可判 pass。此结论不声称本 worker 重新逐件查看过全部 12 件。

本次未发现需要继续返修的具体剩余问题。仅在本审查目录写入独立核验、图证和本追加段；候选、素材、树、技能、cursor 未改动。当前组合最终显影顺序仍按原流程留后续。


# 第四版冻结候选父改动续审（candidate-04）— overall revise

- 实际独立审查 worker_id：`/root/review_head_crown_wedge_recovery`，沿用第三版同会话；节点身份 `group_child_layers:head:review`。本次只复验父发髻底根改动、发髻/冠/前发的实际连接及冠白楔邻近孔洞，没有重新逐件实看全部 12 个孩子。
- 所有旧报告原文和作者保留。本段明确区分原 `/root/review_head_children` 的第一、二版完整逐件审查，与本 worker 第三版冠白楔局部恢复审查；旧结论保留为历史记录，本轮发现的可见发髻根部截口按下文更新。
- 当前候选 `reviews/group_child_layers/head/candidate-04.svg` 实际 SHA256：`c5fdd35e3fa2c34d1ee34f86bd3876494b79f0b29289099417db66480ae5ab04`。基线 candidate-03 实际 SHA256：`cba25d38af900a7836261c32ec53fdf40aa65e5c5c767e1757affb238bea2cf6`。
- 已重新读取当前 2.2 YAML、review 提示词、review/gpt-6-astra-xhigh.model 空标记文件、标准范围报告，并读制作侧 `revision-04-parent-only-revalidation/复核记录.md`、`preservation-check.json` 与父修复目录的说明、路径变更、保护检查和图证。

## 独立 XML 与范围核验

- 自行解析两个冻结候选，元素均为 91 个、id 集相同，唯一改变的是父 `group-head` 中 `head-bun` 的 `d`。原可见上缘、左右曲线全文保留；原末尾平闭合 `Z` 前增加两段经过 `(436,134)` 的圆顺底根曲线。
- 将这一 `d` 值剔除后，整个 SVG 原文逐字一致。全部 12 个直属孩子完整子树相同，定义、顺序、显隐、其他父路径、孔洞、根属性与邻组也没有变化。当前 tree/reference 实际 SHA 与第三版独立审查记录一致。详见 `evidence-candidate-04/independent-xml-check.json`。
- 标准范围报告记录的新父输入与 candidate 实际 SHA 均等于冻结 candidate-04；12/12 pass，outside_samples 总计 0。此结果仅说明孩子在父范围内，不证明可见接界连续。
- 自行以同一技能源渲染父范围，4×、alpha≥128 的新增为 802 samples，bbox x398–473/y120–123.5，删除 0；孩子组合在对应头冠裁切内与 candidate-03 像素完全相同。该量化补充见 `independent-raster-check.json`，视觉判定仍以以下已实看新图为准。

## 本轮当前候选现场图证与实际查看范围

所有新图位于 `evidence-candidate-04/`，均由指定 runtime 的 `python -B` 调用技能源 `tools/svg_preview.py` 从冻结 candidate-04 现场生成。四格顺序为 reference / candidate / 35% blend / candidate outline on reference；临时文件也仅位于本审查目录。逐图参数与 SHA 见 `render-manifest.json`。

| 实际查看图 | 范围及原图裁切 | 具体用途 |
|---|---|---|
| `00-full.png` | 整图，1× | 先检查当前整体混合定位；不作为本 worker 逐件实看 12 孩子的声明 |
| `01-parent-bun-root-4x.png` | only group-head；385 38 106 106，4× | 父发髻根部与顶部外缘 |
| `02-children-bun-crown-4x.png` | 树中 9 group + 3 part 一起 only，排除父；同上裁切，4× | 真实孩子发髻/冠/前发组合 |
| `03-parent-children-bun-crown-4x.png` | 父 + 同上 12 孩子；同上裁切，4× | 分辨父底稿填色对组合的影响 |
| `04-children-left-join-8x.png` | 12 孩子；394 115 33 17，8× | 左侧可见薄缝 |
| `05-children-right-join-8x.png` | 12 孩子；446 115 33 18，8× | 右侧可见薄缝 |
| `06-parent-children-left-join-8x.png` | 父 + 12 孩子；394 115 33 17，8× | 父对左薄缝的填色 |
| `07-parent-children-right-join-8x.png` | 父 + 12 孩子；446 115 33 18，8× | 父对右薄缝的填色 |
| `08-children-crown-wedge-8x.png` | 12 孩子；307 106 34 29，8× | 原上白楔、下三角孔与大小卷连续性 |
| `09-parent-children-crown-wedge-8x.png` | 父 + 12 孩子；同上裁切，8× | 分辨父底稿对冠孔的既有影响 |

另实际查看制作侧父修复目录 `parent-recovery-20261005-02-bun/01-left-join-8x.png`、`02-right-join-8x.png`、`03-bun-root-4x.png`，用于理解前后父形；这些制作图证不替代上表当前候选的独立图证。

## 父 `group-head/head-bun` 本次补全 — pass

新父圆顺底根把左 x398–419/y120–122.75 与右 x450.25–473/y120.75–123.5 的两条父范围薄缝承接起来，底形进入前发覆盖区；顶部和左右可见鼓圆外缘没有改变。当前父独显及父子合成的 4×/8× 图中，连接方向连续，发髻两侧外部背景开口仍在，没有扩大到冠翼白孔的位置。本次父补全自身 pass。

但该父通过结论不能替代下面的真实孩子组合检查。

## head/topknot_bun 与 crown/front_hair 接界 — revise（本轮发现的既存可见截口）

- 主返修路径 `head/topknot_bun`；容器 `part-head-topknot-bun`；色块 `head-child-topknot-bun`。相邻核验对象为 `head/crown`（`group-head-crown`，含 `head-child-crown-jewel`）与 `head/front_hair`（`group-head-front-hair` / `head-front-hair-cap`）。
- 在 `02-children-bun-crown-4x.png` 及左右两张孩子独显 8× 图中，原发髻孩子底部仍从 `(398,120)` 向 `(473,121)` 平截闭合。蓝冠底缘、棕色发髻底边与紫色前发顶缘之间各有一条白色背景薄缝：左约 x398–419/y120–122.75，右约 x450.25–473/y120.75–123.5。左右不是连续的实形接界。
- 参考对应区域为冠带/发髻根与前发相接的连续形体，没有这两条背景白缝。8× edge-overlay 可清楚分辨候选两条彼此分离的边线；这已在静态孩子组合中露空，不能仅因被称为“隐藏根部”而归作运动补全问题。
- `06/07-parent-children-*-join-8x.png` 中两条白缝消失，是父底稿的淡紫填色承接了缺口。独立 alpha 取样亦确认 `(405,121.5)`、`(466,122)` 处孩子 alpha=0，而新父 alpha=255；旧父为 0。由此不能以父子合成的连续外观认定孩子已修好。
- 全部孩子原文相同证明该缺口是既存问题，不是本次父修复新造成的退化。原第二版 `head/topknot_bun` 的 pass 建立在当时独显与“下缘被冠饰遮挡”的判断上；本轮定点组合图提供了明确的实际露空证据，因此在保留历史原文、作者与图证的同时，将该孩子的当前结论更新为 revise。第三版本 worker 仅核验冠白楔并继承过旧发髻结论，未曾检查这两条发髻接界，不能据该继承继续给 pass。
- 具体修复要求：让真实 `head-child-topknot-bun` 底根在左右两处与 crown/front_hair 的相接区域连续，并被现有新父范围容纳；保留已通过的发髻顶部、两侧可见外缘与冠孔。此次必要修复针对静态可见截口，不应靠显示父底稿补偿。复验继续使用无父底稿的 12 孩子组合及左右 8× 图。

## head/crown 原白楔与邻接孔回归 — pass

当前仅 12 孩子的 `08-children-crown-wedge-8x.png` 中，x314–319/y112–120 的上白楔与约 x313–318/y126–128 的下方小三角孔仍分别透空，大小卷实体相接未断。上白楔与下孔形态同第三版实看结果，`head-child-crown-left` 与小卷路径没有变化。

父 + 孩子的 `09` 图会在上白楔显出淡紫父色，这是父冠底稿的既有填充。独立取样 `(316,116)` 证实旧父/新父均 alpha=255、孩子 alpha=0；下三角孔 `(315,126.75)` 三者均 alpha=0。本次 `head-bun` 增量只在 x398–473/y120–123.5，不会触及该冠翼区域。因此不将父底稿的既有显示影响误判为孩子白楔退化，也不据父合成图宣称白楔背景仍透空；孩子自身孔洞回归 pass。

## 继承范围、作者与当前整体结论

本次未重新逐件复看其他孩子。除本轮更新为 revise 的 `head/topknot_bun` 外，沿用原 `/root/review_head_children` 第二版实际逐件证据所支持且内容不变的 10 件 pass（face、front_hair、双 face_framing_hair、双 rear_hair、双 hanging_ribbon、双 earring），具体旧图仍在 `evidence-candidate-02/`，原逐件条目和其对照说明均保留。本 worker 第三版 `evidence-candidate-03-recovery/01/02/03/04/05/06` 的冠白楔与邻接结论继续有效，且本轮 `08` 再次实际确认冠孔 pass。当前不变检查覆盖所有相关样式、父子属性和根定义，继承不限于路径坐标。

**candidate-04 当前 2.2 overall = revise：范围 12/12 pass；直属孩子当前视觉结论 11 pass、1 revise（head/topknot_bun）。父补全自身 pass。** 唯一需修的是上述两处真实孩子组合里的可见发髻底根截口。报告没有把本轮局部复验描述为新的 12 件完整逐件审查。

本轮只读候选/guide/tree/reference，在原报告末尾追加本段并将新证据写入 `evidence-candidate-04/`；未修改素材、技能、cursor，未执行或发布任何下游制作。


# 第五版冻结候选发髻根部局部复验（candidate-05）— overall pass

- 实际独立审查 worker_id 仍为 `/root/review_head_crown_wedge_recovery`；节点身份 `group_child_layers:head:review`。已重新读取当前 2.2 YAML、review 提示词和 model 空标记文件，以及 revision-05-topknot-root 的保护检查与当前标准范围报告。
- 本次仅实际复验第四版唯一未过项 `head/topknot_bun`、其与 crown/front_hair 的左右连接及原冠白楔邻接孔洞；没有新做全部 12 孩子的完整逐件视觉检查。第一、二版原 `/root/review_head_children` 作者与证据，以及本 worker 第三、四版的独立实看记录和结论，全部原文保留。
- 当前只读候选 `reviews/group_child_layers/head/candidate-05.svg` 的实际 SHA256：`326916dff2ec8f2d635de1bc6755f2a040e2c187102f913f26a3d88a804a6276`；基线 candidate-04 的实际 SHA256：`c5fdd35e3fa2c34d1ee34f86bd3876494b79f0b29289099417db66480ae5ab04`。

## 独立变更核验与范围检查

自行解析冻结 candidate-04/05，均为 91 个元素、id 集相同，唯一差异为 `head-child-topknot-bun` 的 `d`。原发髻顶部及两侧曲线全文保留，只将末尾从 `(473,121)` 直接闭合的平底改为经 `(436,134)` 返回 `(398,120)` 的连续圆顺底根。删除这一 `d` 值后的完整 SVG 原文逐字一致。

父 `group-head` 完整子树不变，另外 11 个孩子的完整子树不变，根属性、定义、顺序、显隐、参考与结构树也与第四版一致。独立证据为 `evidence-candidate-05/independent-xml-check.json`。当前范围报告的 parent 输入 SHA 等于 candidate-04，candidate 输入 SHA 等于 candidate-05；12/12 pass、outside_samples 总计 0。此检查证明新孩子仍被已通过的新父容纳，不代替下述视觉判定。

## 本轮实际生成并查看的图证

以下 7 张均由指定 runtime 的 `python -B` 调用技能源 `tools/svg_preview.py`，从冻结 candidate-05 现场生成于 `evidence-candidate-05/`。每张为 reference / candidate / 35% blend / edge-overlay 四格；参数和图像 SHA 见 `render-manifest.json`。

| 实际图证 | 隔离范围、原图裁切与倍率 | 检查结果 |
|---|---|---|
| `00-full.png` | 整图，1× | 先查看整体混合定位，未用概览冒充逐件审查 |
| `01-bun-only-4x.png` | only part-head-topknot-bun；385 38 106 106，4× | 原顶部、左右鼓圆边缘保持；底根圆顺闭合 |
| `02-bun-root-only-8x.png` | only part-head-topknot-bun；393 112 84 26，8× | 左右侧弧连续汇入底根，底部延入前发覆盖区，无新折断或孤片 |
| `03-children-left-join-8x.png` | 9 group + 3 part 一起 only，排除父；394 115 33 17，8× | 左薄缝由棕色发髻孩子填合，接界连续 |
| `04-children-right-join-8x.png` | 同上 12 孩子；446 115 33 18，8× | 右薄缝由棕色发髻孩子填合，接界连续 |
| `05-children-bun-crown-4x.png` | 同上 12 孩子；385 38 106 106，4× | 发髻、冠饰、前发组合无原两条白缝；两侧真实外部背景仍保留 |
| `06-children-crown-wedge-8x.png` | 同上 12 孩子；307 106 34 29，8× | 上白楔、下三角孔透空且分开，大小卷仍相接 |

另实际查看制作侧 `revision-05-topknot-root/06-children-bun-crown-4x.png` 的前后对照，作为对照来源；本结论依据仍为上表本 worker 现场生成并实际查看的新图，不由制作保护报告推出视觉 pass。

## head/topknot_bun 可见截口复验 — pass

完整路径 `head/topknot_bun`；容器 `part-head-topknot-bun`；色块 `head-child-topknot-bun`。相邻核验为 `head/crown` 的 `group-head-crown` / `head-child-crown-jewel` 及 `head/front_hair` 的 `group-head-front-hair` / `head-front-hair-cap`。

第四版的左 x398–419/y120–122.75 与右 x450.25–473/y120.75–123.5 白缝，在当前排除父底稿的 12 孩子组合中均已消失。8× 候选格明确显示棕色发髻从蓝冠后连续衔接到紫色前发上缘，edge-overlay 不再围出两条内部背景缝。混合图与参考的连续根部相接关系对应。发髻孩子自身的 4×/8× 图确认新增底根是一块完整圆顺形体；进入前发遮挡区的延续属于允许补全，原顶部与左右可见外轮廓没有偏移。

本 worker 另从冻结候选独立渲染只含 12 孩子的 alpha，`(405,121.5)` 与 `(466,122)` 均由第四版 0 变为第五版 255；父底稿未参与渲染。该补证写入 `independent-alpha-check.json`，和实际图像共同确认两缝由真实孩子闭合。原两侧外部背景开口仍保留，没有把背景楔形区填成发髻。因此第四版唯一返修项已经解决，当前 `head/topknot_bun` 由 revise 更新为 pass。

## 冠饰负形与连接回归 — pass

`06-children-crown-wedge-8x.png` 中，原 x314–319/y112–120 上白楔仍沿参考窄上端与弯曲右侧透空；约 x313–318/y126–128 的下三角孔仍单独保留。两个孔没有相连、填平或被新发髻根侵入。大小卷在约 `(320,122)` 的实体连接连续，没有产生悬浮小片。

独立 alpha 补证同时给出 `(316,116)` 与 `(315,126.75)` 前后均为 0、`(320,122)` 前后均为 255。冠、左右吊带等另外 11 个孩子完整原文均未改变；本次可见连接局部与负形回归 pass。

## 继承依据与当前整体结论

沿用第四版已确认、且本次完整原文不变的其他 11 件 pass。其中 face、front_hair、双 face_framing_hair、双 rear_hair、双 hanging_ribbon、双 earring 的完整逐件视觉依据归原 `/root/review_head_children` 第二版作者，具体图证在 `evidence-candidate-02/` 的对应逐件条目；crown 依据本 worker 第三版 `evidence-candidate-03-recovery/` 的白楔/左右冠带连接图与第四版 `08-children-crown-wedge-8x.png` 的实际回归，并由本轮 `06` 再次实看其孔洞和卷饰连接。父补全沿用本 worker 第四版已通过结论，完整父原文不变。

**candidate-05 当前 2.2 overall = pass：范围 12/12 pass；第四版唯一 head/topknot_bun 修项本轮实看 pass，其余 11 件按上述完整无变更证据继承，因此当前 12 个直属孩子结论均为 pass。没有具体剩余返修项。** 该结论来自历史完整审查、严格无变更核验及本轮局部复验，不声称本 worker 本轮重新逐件查看了全部 12 个孩子。

本轮仅追加报告和 `evidence-candidate-05/` 内证据；候选、guide、树、参考、技能与 cursor 均只读，未执行或发布任何后续节点。
