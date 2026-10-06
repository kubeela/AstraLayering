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
