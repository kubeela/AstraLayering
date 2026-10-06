# legs 直属輪廓色块独立审查

- 审查身份：`group_child_layers:legs:review`。
- 候选：`reviews/group_child_layers/legs/candidate-01.svg`；SHA-256：`d2d9c8adc763807cb7631e330ed0f56c7dad89e2a575e61853355ee4d18249e0`（已核验）。
- 参考：`references/base-subject.png`；树：`structure/groups.json`。
- 范围：`legs` 的四个直属 group；`guide-legs-parent` 是隐藏父形体，不计为直属孩子。白色临时连体衣忽略，腿根按肌肤连续形体审查。
- 范围证据：`refinement/groups/legs/2.直属拆分与色块/2.2.直属轮廓色块/轮廓检查.json`，四件均 pass，outside_samples=0、outside_area_px2=0。范围通过不替代可见轮廓审查。
- 首先实际查看 `evidence/00-full-blend.png`（全图参考／候选／35% blend），确认整图对齐与四直属组件位置。
- 本报告按部件完成即时追加；整体结论在所有部件完成后给出。

## 1. `legs/left_leg` — revise

- 容器 id：`group-legs-left-leg`；色块 id：`legs-left-leg-silhouette`。
- 实际查看图：`evidence/01-left-full.png`（1×整腿）；`evidence/02-left-root-thigh.png`（4×，290,640,155,410）；`evidence/03-left-knee.png`（4×，335,1025,115,235）；`evidence/04-left-calf.png`（4×，340,1210,105,340）；`evidence/05-left-ankle-foot.png`（4×，356,1510,90,210）；`evidence/06-left-toe-gap-8x.png`（8×，397,1666,34,42）。每图均包含 reference、only 候选、blend、edge-overlay，已实际逐图查看。
- 范围判定：**pass**，父范围外采样为 0。
- 视觉对照通过项：大腿可见内外缘及腿宽主要对准参考；从臀下可见起点向上延伸至约 y658 的圆弧为隐藏腿根补全，轮廓闭合且与下段连续，不按连体服裁切。膝内侧、小腿内侧、踝骨两侧转折、足背两侧与大趾最末圆弧总体位置一致。
- **需修 1：膝下至小腿上段画面左外缘偏外。** 约 y1170–1260（x352–365）候选从膝向小腿过渡过早、过宽，4×图 `03-left-knee` 下半部及 `04-left-calf` 上端可见洋红边持续落在参考外轮廓左侧，最明显处约数个原图像素；应沿参考把该段外缘收回、保留膝后凹再接小腿腹。它被父形体容纳，仍属于可见形状偏差。
- **需修 2：大趾与第二趾之间的真实白色细孔漏描。** 约 x413–417、y1686–1696，参考有细长白色开孔，候选只有 y1703 附近浅 V 底部凹口，上方整片实心；`06-left-toe-gap-8x` 的 reference／candidate／edge-overlay直接显示此差异。请补出可见孔及其尖端，不能仅留给后续内部趾线。其余趾底浅凹已形成，但需随该孔复核趾缝连接。
- 部件结论：范围 **pass**；视觉 **revise**。

## 2. `legs/right_leg` — revise

- 容器 id：`group-legs-right-leg`；色块 id：`legs-right-leg-silhouette`。
- 实际查看图：`evidence/07-right-full.png`（1×整腿）；`evidence/08-right-root-thigh.png`（4×，437,640,150,410）；`evidence/09-right-knee.png`（4×，432,1025,120,235）；`evidence/10-right-calf.png`（4×，437,1210,105,340）；`evidence/11-right-ankle-foot.png`（4×，438,1510,90,210）；`evidence/12-right-toe-gap-8x.png`（8×，451,1666,35,42）。每图均包含 reference、only 候选、blend、edge-overlay，已实际逐图查看。
- 范围判定：**pass**，父范围外采样为 0。
- 视觉对照通过项：大腿根隐藏圆帽与可见大腿连续，不以连体衣腿口为裁切；大腿内外缘的宽度和向膝收窄走向匹配。膝侧凹、小腿最宽处、胫部收窄、双侧踝骨凸起、足背展开与大趾末端主要形状均对准。右腿未发现与左腿膝下同级别的持续外扩；局部细小边线差异可在后续 geometry 顺线。
- **需修：大趾与第二趾之间的真实白色细孔漏描。** 约 x464–468、y1686–1697，参考是细长白色可见孔，候选整块填满，只在最下缘保留浅 V 凹口；`12-right-toe-gap-8x` 显示候选没有任何孔内边界。应补出细孔、上下尖端及与趾间凹口的关系，不能把真实负形当成后续内部线。
- 趾底与小趾检查：五趾底部起伏均有，未漏整趾；目前小趾几个凹口简化较浅，孔洞修复时应一并顺贴参考底缘，但本项主要阻断是上述白色孔缺失。
- 部件结论：范围 **pass**；视觉 **revise**。

## 3. `legs/left_anklet` — pass

- 容器 id：`group-legs-left-anklet`；色块 id：`legs-left-anklet-connector-01` 至 `-10`、`legs-left-anklet-anchor-1`、`legs-left-anklet-anchor-2`、`legs-left-anklet-link-01` 至 `-08`、`legs-left-anklet-clasp`、`legs-left-anklet-clasp-to-bail`、`legs-left-anklet-bail`、`legs-left-anklet-bail-to-gem`、`legs-left-anklet-pendant`、`legs-left-anklet-small-charm`。
- 实际查看图：`evidence/13-left-anklet-4x.png`、`evidence/14-left-anklet-8x.png`（裁切均为 376,1596,64,84，分别 4×、8×，均含 reference／only／blend／edge-overlay）。
- 范围判定：**pass**，父范围外采样为 0。
- 视觉逐段对照：左挂点约 (383,1607)、右挂点约 (432,1618) 的上下高差符合参考，锚环细孔保留；从两侧挂点向中央的全部斜向链环均覆盖参考可见蓝饰，链接间的细连接线连续。左侧四个主环和右侧四个主环的位置、下降弧度与转向基本对齐，较小的近挂点环没有漏掉；8×图可见各环内孔、中央约 (410,1642) 圆环孔、下方细吊环孔均真实镂空且没有被连接线封死。右挂点与近旁小环相交但可辨，未发现断链。
- 中央吊环到宝石顶部连续；宝石约 x406–415、y1650–1671 的左右折角、上尖端与下尖端落在参考主要轮廓上，未缺尖端。左下独立小饰片约 (400.5,1647) 已描出，参考所见零散蓝色区域未漏整片；其内部亮色在本轮视作材质亮面，未据此强制额外打孔。链饰与足背的遮挡关系正确，两端接近足侧边界。
- 部件结论：范围 **pass**；视觉 **pass**。内部明暗、宝石切面与线色留给后续步骤。

## 4. `legs/right_anklet` — revise

- 容器 id：`group-legs-right-anklet`；色块 id：`legs-right-anklet-connector-01` 至 `-10`、`legs-right-anklet-anchor-1`、`legs-right-anklet-anchor-2`、`legs-right-anklet-link-01` 至 `-08`、`legs-right-anklet-clasp`、`legs-right-anklet-clasp-to-bail`、`legs-right-anklet-bail`、`legs-right-anklet-bail-to-gem`、`legs-right-anklet-pendant`、`legs-right-anklet-small-charm`。
- 实际查看图：`evidence/15-right-anklet-4x.png`、`evidence/16-right-anklet-8x.png`（裁切 442,1596,65,84，4×／8×）；另查看 `evidence/17-right-clasp-tail-8x.png`（466,1635,17,16，8×）。全部图均含 reference／only／blend／edge-overlay。
- 范围判定：**pass**，父范围外采样为 0。
- 视觉逐段通过项：较高的画面右挂点 (499,1608) 与画面左挂点 (450,1618) 位置、上下高差正确；从两侧到中央的 8 个环与 10 段连接线完整，近挂点小环保留。链条下降斜率、链环转向与主要宽度对准参考；8×中两挂点孔、各链环孔、中央圆环孔和下垂吊环孔可见，连接处未断裂也未将环孔填实。宝石约 x466–475、y1650–1672 的上尖、横向折角及下尖位置基本一致；右下独立小饰片 (483,1647) 已描出。
- **需修：中央圆环右下方一小段可见蓝色链尾漏描。** 约 x474–478、y1642–1644，参考在中央环右侧、现有 `legs-right-anklet-connector-05` 下方有一段斜向短蓝饰边／链尾；`17-right-clasp-tail-8x.png` 的参考第一格可见该短段，独显第二格为空，第四格的洋红边也完全未包住它。现有 `legs-right-anklet-clasp` 被概括成整圆，`connector-05` 只连接上侧，因此漏掉此可见窄条。请补到该直属容器，维持与环及右侧链条的相接关系；这属于可见蓝色零散轮廓漏描，不是宝石内部切面。
- 部件结论：范围 **pass**；视觉 **revise**。

## 整体结论

**overall: revise**。四个直属 group 均已逐件实看并记录，范围均 pass；其中 `legs/left_anklet` 视觉 pass，另外三件有需修项，不能以父范围通过给整体视觉通过。

| 完整路径 | 容器 id | 范围 | 视觉 | 必须修复 |
|---|---|---|---|---|
| legs/left_leg | group-legs-left-leg | pass | revise | 膝下外缘偏宽；大趾与第二趾白色孔漏描 |
| legs/right_leg | group-legs-right-leg | pass | revise | 大趾与第二趾白色孔漏描 |
| legs/left_anklet | group-legs-left-anklet | pass | pass | 无 |
| legs/right_anklet | group-legs-right-anklet | pass | revise | 中央圆环右下可见细链尾漏描 |

返修复验需逐项核对上述 4 项，并重看双腿膝下过渡、双脚趾缝与足底相接，以及右踝饰新增链尾与圆环／相邻链条的连接。现阶段没有要求提前补全内部膝线、全部趾线、链饰高光或最终显影。

候选与参考、树和技能资料均未修改；本次只在指定 `reviews/group_child_layers/legs/` 写入图证和本报告。
