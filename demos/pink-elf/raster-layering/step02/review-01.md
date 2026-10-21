结论：需要修复

# 第二步独立视觉 review 01

本次已检查整图、全部 65 个逻辑 part 对应的 69 个普通绘画层，以及 4 个多深度 part 的各片与同 part 合看。发现 10 项需要修复的问题，另有 3 项涉及既定标准的待确认事项。主要问题是可见线条淡失、发根拼接、手部绘画与遮挡失真、靴口镶边缺段，以及单层补全内容仍有接缝或异物残留。不能接受现有 `report.md` 中“全部通过”的判断。

## 输入与检查依据

- 当前实际工程：`step02/character-soft-edges.kra`，932×1688；检查时 SHA-256 为 `05eb5d54f2b908367b160ed1fcdcc0e5157e8b698d26481bb416bc11a47d9cda`。
- 唯一外观参考：`../part-layering/references/base-subject.png`。已由 `step01/report.md` 和 `step02/report.md` 双向确认，未更换参考。
- 结构依据：`../part-layering/parts/`、`../part-layering/groups.json`、`../part-layering/occlusion.json`；继承第一步已落实的深度分片、眉毛位置修正及连接件末端收窄。
- 第一阶段基线：`step01/character-depth.kra`，同时使用其对应整图与单层导出定位问题来源。
- 已阅读两步 `report.md`。本次检查时，`step02/` 内没有已发布的 `review*.md` 或 `repair*.md`。已有 acceptance/checks 和操作记录是制作过程资料，未将其自评或暂存文件视为修复完成。
- 本报告坐标均为原画布像素，原点在左上，表示定位范围而非建议的新轮廓。画面左/右是观看者方向；图层名 left/right 是角色自身方向。

## 实际检查方式与覆盖

在当前 Krita 5.3.1 显示环境中查看实际第二步 KRA、原图及第一步 KRA，先按 100% 看整体，再以 300% 分区平移覆盖头顶、脸、耳、肩、上臂、衣身、腰髋、长发、双手、大腿、膝、小腿、靴口与鞋底；小连接件以 400% 检查。疑点切换了全部叠加、独显、隐藏掌片等状态。头盖、双靴、连接件均分别查看深度片并合看，没有把同一 part 的多个绘画层判作重复。

逐层辅助证据由实际 KRA 的单层导出制作，共 69 张；本次将导出的原始层内容与当前打开 KRA 的节点内容逐一核对，确认来自当前工程，再逐张目视。整图及区域比较采用同一坐标、同一倍率；灰底只用来显示透明边缘。未使用像素差、PSNR 或数值相似度作视觉通过标准。哈希仅用于来源与只读保护核验。

主要检查证据（下列链接均相对本报告所在的 `step02/`）：

| 检查范围 | 对照证据 | Krita 实际窗口证据 |
|---|---|---|
| 原尺寸整体 | [当前/原图整体](review-01-evidence/overall-100.png) | [当前 100%](review-01-evidence/krita-final-100.jpg)、[原图 100%](review-01-evidence/krita-reference-100.png)、[第一步 100%](review-01-evidence/krita-step01-100.jpg) |
| 头顶、五官、耳及颈 | [300% 区域对照](review-01-evidence/region-head.png) | [300% 头部](review-01-evidence/krita-300-full-head.png) |
| 肩、胸、上臂 | [肩胸对照](review-01-evidence/region-shoulders.png) | [300% 头胸](review-01-evidence/krita-300-head-torso.png) |
| 腰髋、衣片 | [腰髋对照](review-01-evidence/region-waist.png) | [衣片独显](review-01-evidence/krita-300-torso-solo.jpg) |
| 两侧长发与手臂 | [画面左侧](review-01-evidence/region-left-side.png)、[画面右侧](review-01-evidence/region-right-side.png) | [300% 腰手](review-01-evidence/krita-300-waist-hands.png) |
| 双手 | [画面左手 400%](review-01-evidence/region-hand-screen-left.png)、[画面右手 400%](review-01-evidence/region-hand-screen-right.png) | [掌片独显](review-01-evidence/krita-300-palm-solo.jpg)、[隐藏掌片](review-01-evidence/krita-300-without-palm.jpg)、[右食指独显](review-01-evidence/krita-300-index-solo.jpg) |
| 大腿、膝、小腿 | [上段 300%](review-01-evidence/region-legs-upper.png)、[下段 300%](review-01-evidence/region-legs-lower.png) | [300% 双腿](review-01-evidence/krita-300-lower-legs.jpg) |
| 双靴、全部饰物、鞋底 | [400% 双靴](review-01-evidence/region-boots.png) | [300% 双靴全部叠加](review-01-evidence/krita-300-boots-all.jpg) |

## 需要修复的问题

P1：影响当前整图还原度或内容表达，优先修复。P2：主要影响独立部件的完成度，仍须修复后复查。以下各项均有实际看图依据；第一步已有的问题仍属于本次交付缺陷，但不归因于第二步新制造。

### R01 / P1 — 皮肤的形体轮廓线大范围淡失，局部变成浅白、虚碎边

**相关图层与位置：** `0200/0210` 双前臂、`0220/0230` 双上臂；`0060/0070` 双腿；`0310 face/face_base` 下颌；`0270/0280` 双耳下缘；`0240 neck` 颈侧。重点看画面左臂 x265–365、y430–670，双腿 y820–1400，下颌 x395–525、y240–295，以及耳尖至耳根下斜边。

**当前表现与依据：** 原图这些位置有细、连续但浓淡变化的暖棕粉色轮廓。当前手臂与头发交界常只剩浅色蒙边，腿外缘呈断续淡点，下颌明显淡于原图，耳下缘偏白。眼睫和衣服包边仍较清楚，造成整图线条质感不协调。单层也存在此表现，不能全部解释为上层遮挡。这里要求的是保留形体的绘画线条，不是补投影或 AO。

**影响：** 手臂和腿的边界显得发虚、平，脸及耳的形体辨识弱于参考；原尺寸也能看到皮肤与服装、眼睛的清晰度失衡。

**修复方向与保留项：** 逐段对照参考恢复本件边缘的线色、粗细和收尖，清除误留的浅白边，保留原图本就柔软或消隐的段落。不能统一加黑描边，也不能继续整体模糊。保留现有比例、独立关节分层、皮肤本色、腮红和膝部已有绘画内容；不增加阴影效果。

**证据：** [手臂：第二步/第一步/原图](review-01-evidence/detail-skin-arm.png)、[下颌与颈侧](review-01-evidence/detail-skin-face-neck.png)、[小腿完整区域](review-01-evidence/region-legs-lower.png)、[头耳完整区域](review-01-evidence/region-head.png)。基线对照显示主要线条缺损在第一步已存在，第二步后仍未达到参考质感。

### R02 / P1 — 侧发回钩与脸侧细发的线条淡失、浅色碎边仍明显

**相关图层与位置：** `0030 hair/side_hair_right`、`0040 hair/side_hair_left` 的长弧和下端回钩；`0530/0540` 双前侧发及 `0550 hair/bangs` 的面侧尖端。定位：画面两侧 x210–340 / x590–690、y340–560；脸旁 x360–415 / x510–550、y195–340。

**当前表现与依据：** 原图回钩的内外细线共同表达弯曲的发束厚度，当前回钩部分变成大片浅粉、轮廓线断薄；脸旁窄发束保留了不均匀的白亮碎边和短点，线条有的发虚、有的呈颗粒。不能把实际粉色发束、正常亮线全部当杂色；问题是原图连续线条被破坏及不对应原图的碎边。

**影响：** 发束显得像平贴的粉色带，细发与脸侧的精致程度下降。单层边缘修软并不等于叠加后线条正确。

**修复方向与保留项：** 以原图逐段区分本件暗线、亮线和邻件残色，补回回钩内外弧应有的线色及收尖；只清理孤立浅点，不扩大涂抹范围。保留各发束分叉、真实负空间、发梢及原有高光走向；不填平回钩内空隙、不合并发层、不添加投影。

**证据：** [画面左侧 200%](review-01-evidence/region-left-side.png)、[画面右侧 200%](review-01-evidence/region-right-side.png)、[头部 300%](review-01-evidence/region-head.png)，以及逐层证据 `layers/0030.png`、`0040.png`、`0530.png`、`0540.png`、`0550.png`（均位于 `review-01-evidence/`）。

### R03 / P1 — 发旋与刘海根部出现横向平切色带

**相关图层与位置：** `0550 hair/bangs` 与 `0560 hair/back_hair/cap :: crown` 的交界，连同 `0050 ...cap :: back` 合看；x425–482、y92–108。

**当前表现与依据：** 原图根部两侧深粉弧形自然汇聚于分缝，当前被一条近水平的浅粉顶边截断，像把刘海贴在发旋下。cap 两片独显/合看本身没有整块缺失，但与刘海组合后仍有明确横接痕。第一步同处已存在。

**影响：** 头部视觉中心出现人为拼接，破坏原图发流和圆润头形。

**修复方向与保留项：** 保持 cap 的共同归属和 50/560 层序，先在现有可见绘画范围内把刘海根部的色块、细发流与冠顶的弧形趋势接顺，消除横向平切感。保留呆毛、发旋双弧、冠顶亮带与刘海分束；不要为了消缝抹掉整个发旋，不要求合层。若必须移动既定切界，须先标明与上游曲线边界的冲突，不能自行改标准。

**证据：** [400% 三方对比](review-01-evidence/detail-hair-root.png)、[cap 两片合看](review-01-evidence/krita-300-cap-union.png)、[back 独显](review-01-evidence/krita-300-cap-back.png)、[crown 独显](review-01-evidence/krita-300-cap-crown.png)。

### R04 / P1 — 画面左手食指末节出现不符合参考朝向的亮白甲面和钝块

**相关图层与位置：** `0150 arms/arm_right/hand/index_finger`，x235–250、y845–869；与 `0160/0180/0190` 合看。

**当前表现与依据：** 当前短食指末端是较宽的钝圆块，正面有醒目的竖长白甲面；参考同处是侧转、较窄的粉色指端，没有这样正对观看者的大白甲面。独显 0150 后，白块和指端直接存在于该层；不是拇指甲面或其他层错叠。第一步已如此。

**影响：** 改变手指的朝向与屈曲读法，局部像多出一个亮白小指头。

**修复方向与保留项：** 依据参考重整食指可见末节的颜色与甲缘方向，去掉缺乏参考支持的正面大白块；保留真实指甲应有的轻微可见信息、完整指体、隐藏指根及其独立归属。不要删整根食指，不要把相邻拇指甲面抹掉。是否需要调整外轮廓见 C02，不能直接突破正式 SVG。

**证据：** [独显/基线/全部叠加/原图](review-01-evidence/detail-solo-0150.png)、[完整手部对照](review-01-evidence/detail-hand-screen-left.png)、[Krita 食指独显](review-01-evidence/krita-300-index-solo.jpg)。

### R05 / P1 — 画面右手掌片盖掉指根转折，形成不自然的浅色圆盖

**相关图层与位置：** `0140 arms/arm_left/hand/palm`，x696–729、y817–851；涉及被覆盖的 `0100/0110/0120` 指根及 `0130` 虎口邻接。

**当前表现与依据：** 0140 下部圆弧将掌内至手指的几条转折线遮住；整手看起来像一个浅色椭圆盖在指束上。原图从虎口向指束内部有连续的斜折线和较清楚的指根转向。隐藏 0140 后，可见底下的指根线条仍在，证明不是少了手指层；独显 0140 则能看到覆盖这些线条的圆盖绘画。

**影响：** 指节关系和手掌侧转形体被改写，掌指衔接缺乏连续性。

**修复方向与保留项：** 先在既定掌片归属范围内恢复参考支持的掌指转折与线色，避免在叠加边界留下圆盖形色差。保留腕根补全、掌肉、虎口真实开口与每根独立手指；不调换整套手指深度。若恢复原图外露范围必须缩掌片或改变指缝 alpha，须按 C02 核对标准，不能用“补全”解释可见形体失真，也不能任意擦掉合理隐藏根部。

**证据：** [实时掌片独显/隐藏掌片/全显/原图](review-01-evidence/live-palm-comparison.png)、[与第一步对照](review-01-evidence/detail-solo-0140.png)、[Krita 隐藏掌片](review-01-evidence/krita-300-without-palm.jpg)。

### R06 / P1 — 双靴前 V 口的卷边与浅色镶边不完整，部分被腿层遮掉

**相关图层与位置：** 左靴 `0055 rear / 0600 front`、右靴 `0056 rear / 0610 front`，以及中间的 `0060/0070` 腿层；画面左 x392–439、画面右 x486–534，y1404–1454。

**当前表现与依据：** 原图的前 V 口两侧有连续、带曲度的粉灰浅色包边。当前前片接近深色直斜边，浅色线在接腿位置断掉，V 口形态也更直、更硬。各片与合看切换显示：右靴尤其清楚，一部分 V 口浅沿确实留在 rear，单靴合看能见到，叠加腿层后被盖住；左靴合看时浅沿本身也偏弱、断续。因此既有内容分配/遮挡问题，也有可见前口绘画不完整，不能只检查前后片并集无洞。

**影响：** 靴口厚度、包边细节及腿伸入靴筒的关系失真，双靴呈硬切的黑色 V 形。

**修复方向与保留项：** 保留同一个 foot part 的 rear/front 身份及 55/600、56/610 层序。按原图核对哪些是应露在腿前的前口卷边，在前片范围内恢复其连续色带与线条；保留真实开口、两侧蓝灰内衬、后唇、鞋身、鞋底及固定饰件。不要把整条腿移到靴后，也不要把 rear 全挪前；涉及切界重分配的部分先解决 C03。

**证据：** [左靴实时五状态对比](review-01-evidence/live-left-boot-comparison.png)、[右靴实时五状态对比](review-01-evidence/live-right-boot-comparison.png)、[第二步/第一步/原图](review-01-evidence/detail-boot-openings.png)。Krita 证据含 `krita-300-left-boot-rear.jpg`、`left-boot-front.jpg`、`left-boot-union.jpg` 及同命名 right 组，均位于 `review-01-evidence/`。

### R07 / P2（颈部叠加也可见）— 皮肤补全区仍有横向色带接头

**相关图层与位置：** `0060/0070` 双腿上端，x320–450 / x475–605、y735–755 一带；`0240 neck`，x430–495、y290–310 一带。

**当前表现与依据：** 腿独显时，较平的上端肤色与下方有高光的肤色通过横向折线突变，局部还有接头尖角；全显时主要被 pelvis 遮住。颈独显和全显中则可见颌下浅色平带与现有颈部色块的突接，像一道横领。基线同处已存在。遮挡区域没有原图的直接可见答案，本项依据是同一皮肤部件内部应连续，不能要求复制被遮挡的未知细节。

**影响：** 独立部件尚未完成，后续合理位移时接头会显露；颈部当前静态组合已有不自然横带。

**修复方向与保留项：** 沿已有皮肤色彩平顺连接上下两端，去掉直线式拼接和尖角；保持完整隐藏根部，不用挖洞隐藏接头。保留已有本色、正常高光与膝部形体。颈部只要求处理当前色块的衔接，不要求恢复原图颌下投影或新增阴影、AO；若按阶段规则淡化原有投影，也应留下连续、没有横接痕的本色。

**证据：** [右腿根四状态](review-01-evidence/detail-leg-right-transition.png)、[左腿根四状态](review-01-evidence/detail-leg-left-transition.png)、[颈部四状态](review-01-evidence/detail-neck-transition.png)。

### R08 / P2 — torso 衣料补全处的两条结构线断开

**相关图层与位置：** `0250 body/torso`，两侧约 x380–400 / x530–552、y495–530；大部分处于 `0260 body/breast` 下方。

**当前表现与依据：** 独显 0250 时，两侧衣料结构线先模糊终止，中间跨过一条浅色带，再从不同方向继续，呈明显断线/拼接；上层胸片盖住后不易察觉。参考可见衣料线有连续方向，隐藏补全应根据两端延续，而不是把现有结构线中途切断。第一步已有。

**影响：** torso 独立时衣料不连续，不能满足已完成遮挡补全的阶段目标。

**修复方向与保留项：** 在 torso 内依据上下已存在的线端平顺接续，调整接头处突兀的颜色带，控制线宽与原衣料一致。保留白色连体服和足量隐藏衣片，保留 breast 的独立控制与层序；不凭空加装饰线，不新增阴影，也不要为了藏线把胸片放大。

**证据：** [单层/基线/全显/原图](review-01-evidence/detail-torso-seams.png)、[Krita torso 独显](review-01-evidence/krita-300-torso-solo.jpg)。

### R09 / P2 — torso 左肩带旁仍混入属于前侧发的粉色发丝

**相关图层与位置：** `0250 body/torso`，画面左肩带旁约 x395–412、y338–364；实际发束属于 `0530 hair/front_side_hair_right`。

**当前表现与依据：** 隐藏全部头发后，torso 内仍有从上边缘斜下来的粉色细发尾。原图此处确实有发丝，但按既定分层它应随 0530 运动，不能烘焙在衣身/皮肤上。独显 KRA 确认该残留存在，第一步也已存在。

**影响：** 当前叠加处增加碎边；头发移动后，肩带及锁骨旁会留下固定的“幽灵发丝”，破坏部件归属与完成度。

**修复方向与保留项：** 仅清理 torso 中这段外来粉色发丝，依据相邻肩带/皮肤连续补回底色和应有线条；保留 0530 上的真实完整发束、白色肩带边线与锁骨绘画，不能把两个层的真实发尾一并擦去。

**证据：** [400% 四方对比](review-01-evidence/detail-torso-hair-residue.png)、[Krita 衣片独显](review-01-evidence/krita-300-torso-solo.jpg)。

### R10 / P2 — 两片长后发补全处仍有直线拼色和被截断的发流

**相关图层与位置：** `0010 hair/back_hair/long_right` 下部斜补全带，约 x260–330、y640–725；`0020 hair/back_hair/long_left` 斜向补全带及其上端，约 x580–655、y520–700。

**当前表现与依据：** 独显长后发时，已有细长发流遇到大块斜色带后突然截断；0010 下部出现明显的深粉横折/三角块，0020 的亮带与相邻发面有几何式截断。部分全显时被手臂挡住，但不是一个独立发片的自然外缘。这里不要求未知隐藏区域与原图逐像素一致；问题在于同一部件内部现成发流与色面的接头不连贯。第一步已有，第二步局部混色后仍看得出。

**影响：** 长后发作为独立部件缺乏完整绘画连续性，手臂移开就会露出拼接条带。

**修复方向与保留项：** 利用两侧已存在的发流方向把补全带接顺，逐段衔接细线与色面，消除尖锐直线色界；保留本来应有的宽亮带、粉色层次和发束分叉，不把所有明暗边界糊平。保留真实孔隙、完整隐藏发体和原有 part 范围，不新增阴影、不借改轮廓绕过接缝。

**证据：** [0010 四状态对比](review-01-evidence/detail-long-right-transitions.png)、[0020 四状态对比](review-01-evidence/detail-long-left-transitions.png)，另见完整单层 [0010](review-01-evidence/layers/0010.png)、[0020](review-01-evidence/layers/0020.png)。

## 待确认事项与标准冲突

### C01 — 眉毛最终可见量与既定刘海遮挡规则

`0510 face/eyebrow_left`、`0520 face/eyebrow_right` 单层完整，0510 沿用第一步上移后的坐标；没有证据要求把它移回睑褶附近。原图能看到跨在粉色刘海区域上的较长浅眉弧，当前全部叠加只余很短的一段或几乎全被盖住，影响表情。但 `occlusion.json` 明确规定完整眉在刘海和前侧发之后，`step01/report.md` 也明确沿用 510/520，因此不能自行建议把整眉提到刘海前，也不能把“眉层缺失”作为结论。

需由标准维护方确认：这种原图的透显/绘画表现应如何在既定眉归属与刘海遮挡中表达；若决定当前隐藏量就是阶段目标，应明确记录这一原图差异。确认前标记为待确认，不判通过。证据：[第二步/第一步/参考眉区](review-01-evidence/detail-brows.png)、[0510 独显](review-01-evidence/layers/0510.png)、[0520 独显](review-01-evidence/layers/0520.png)。

### C02 — R04、R05 的可见轮廓修复是否涉及正式手部 SVG

R04 的错误甲面和 R05 的圆盖/折线失真有明确绘画依据，可先在现有范围内修复。若进一步需要缩窄右食指末端、缩短左掌远缘或重新打开指缝，这会触及正式 `arms/arm_right/hand/index_finger`、`arms/arm_left/hand/palm` 等 part 的形状及既定覆盖关系。应把原图可见边、正式 SVG 和实际 KRA 三者同坐标列出，由标准维护方确认修正范围；本 review 不授权改变形状标准，不要求删除完整隐藏指根或改变各指归属。

### C03 — R06 的前口镶边与已落实前后片切界

`occlusion.json` 已将前 V 口与后唇/侧内衬分到不同深度，当前分片边界却把应与前口连续的部分浅沿留在会被腿覆盖的 rear 中。先核对浅沿实际归属与已写入的 V 形切界；如需把同一 foot 内的一条窄边分配给 front，应明确记录所需切界调整并取得标准层面的结论。保持 55/600、56/610 数值、同 part 身份和普通绘画层结构。本项不是要求撤销深度分片，也不是要求把两片合层。

## 多深度 part 专项结果

| 逻辑 part | 当前分片 | 检查判断 |
|---|---|---|
| `hair/back_hair/cap` | 0050 back + 0560 crown | 各片与同 part 合看已检查。未发现需要删片或合层的依据；与刘海组合的根部拼接仍须 R03 修复。[合看证据](review-01-evidence/union-cap-comparison.png) |
| `legs/leg_left/foot` | 0055 rear + 0600 front | 两片归属有效；固定花叶属于靴本体。前口内容/遮挡有 R06、C03 问题。[合看证据](review-01-evidence/union-boot-left-comparison.png) |
| `legs/leg_right/foot` | 0056 rear + 0610 front | 两片归属有效；固定小珠点属于靴本体，不按重复饰物清除。前口内容/遮挡有 R06、C03 问题。[合看证据](review-01-evidence/union-boot-right-comparison.png) |
| `legs/leg_left/boot_gem_chain/flexible_connector` | 0599 hidden_tip + 0620 visible | 各片独显及合看已检查，短尾和可见段可接续；宝石/珠子位置处的分段不判断裂。沿用第一步收窄隐藏末端，不要求加链环或把隐藏短片提到靴前。[局部合看](review-01-evidence/union-connector-comparison.png)、[Krita 400%](review-01-evidence/krita-400-connector-union.jpg) |

## 检查边界、保留内容与复查要求

没有因工具或文件不可用而跳过的身体区域、逻辑 part 或深度片。覆盖表中“未另列问题”表示本次在所查条件下没有发现可明确要求修复的问题，并非用图层存在、数字校验或先前报告替代视觉通过。C01–C03 属于已看图但尚未消解的标准冲突，不是未经检查的空白。

本次未开展变形/绑定测试；用户要求的静态组合、单层完整性及遮挡切换已检查。完全被遮挡区域的原始绘画没有直接参考，只检查结构、归属、完整性和内部连续性，不猜测隐藏饰纹或额外细节。耳饰按既定粉色垂饰与顶部金属色带判断，未无依据要求挖环孔；口腔下齿正常被舌片遮盖，不按缺失处理。没有把缺少新增阴影、AO 或投影列为缺陷。

修复后应逐项回复 R01–R10，附对应图层独显、必要的遮挡切换及相同坐标原图对比，再恢复全部叠加复查 100% 整体。C01–C03 必须给出明确处理依据。仅修改 alpha、仅柔化像素阶梯、仅证明分片并集完整，均不能单独关闭绘画内容问题。

输入保护结果：前后核对的 89 个输入/标准文件均未改变；当前 KRA 的 69 个层名称、类型及绘画内容均未改变，全部图层已恢复显示。没有保存输入 KRA，没有修改参考、正式 SVG、groups/occlusion、正式 review/repair 或调度状态。详见 [输入及图层保护核验](review-01-evidence/input-preservation.json)；该核验不参与美术质量打分。

## 全部绘画层覆盖表

以下各项均已查看单层内容、隐藏上层的辅助对照及所属区域的全部叠加效果。证据每行对应 `review-01-evidence/layers/` 中的同深度编号三联图；四个多深度 part 还包含上面的实际分片切换与合看。

| 图层（由下到上） | 目视结果 / 对应问题 | 逐层证据 |
|---|---|---|
| `0010 hair/back_hair/long_right` | R02 可见发线；R10 内部斜接头。 | [0010](review-01-evidence/layers/0010.png) |
| `0020 hair/back_hair/long_left` | R02 可见发线；R10 内部斜接头。 | [0020](review-01-evidence/layers/0020.png) |
| `0030 hair/side_hair_right` | R02 回钩内外线淡失。 | [0030](review-01-evidence/layers/0030.png) |
| `0040 hair/side_hair_left` | R02 长弧与回钩碎边。 | [0040](review-01-evidence/layers/0040.png) |
| `0045 hair/ahoge` | 已查内外弧、根端和尖端，未另列问题。 | [0045](review-01-evidence/layers/0045.png) |
| `0050 hair/back_hair/cap :: back` | 与0560同part合看；组合交界见R03，不要求合层。 | [0050](review-01-evidence/layers/0050.png) |
| `0055 legs/leg_left/foot :: rear` | R06、C03；后片独显并与0600合看。 | [0055](review-01-evidence/layers/0055.png) |
| `0056 legs/leg_right/foot :: rear` | R06、C03；后片独显并与0610合看。 | [0056](review-01-evidence/layers/0056.png) |
| `0060 legs/leg_right/leg` | R01 轮廓线；R07 隐藏髋根接头；参与R06遮挡验证。 | [0060](review-01-evidence/layers/0060.png) |
| `0070 legs/leg_left/leg` | R01 轮廓线；R07 隐藏髋根接头；参与R06遮挡验证。 | [0070](review-01-evidence/layers/0070.png) |
| `0080 pelvis` | 已查衣片、髋侧与腿根组合，未另列独立问题。 | [0080](review-01-evidence/layers/0080.png) |
| `0090 arms/arm_left/hand/little_finger` | 已查短指体、根端、指尖与指束遮挡，未发现需要另露指尖的依据。 | [0090](review-01-evidence/layers/0090.png) |
| `0100 arms/arm_left/hand/ring_finger` | 指体存在；R05涉及掌片盖住的近端。 | [0100](review-01-evidence/layers/0100.png) |
| `0110 arms/arm_left/hand/middle_finger` | 指体存在；R05涉及掌片盖住的近端。 | [0110](review-01-evidence/layers/0110.png) |
| `0120 arms/arm_left/hand/index_finger` | 指体及外侧指尖存在；R05涉及近端衔接。 | [0120](review-01-evidence/layers/0120.png) |
| `0130 arms/arm_left/hand/thumb` | 拇指与甲面存在；结合R05检查虎口，保留真实开口。 | [0130](review-01-evidence/layers/0130.png) |
| `0140 arms/arm_left/hand/palm` | R05圆盖及掌指转折；C02涉及形状标准。 | [0140](review-01-evidence/layers/0140.png) |
| `0145 arms/arm_right/hand/little_finger` | 已查小指体、指尖与真指缝，未另列独立问题。 | [0145](review-01-evidence/layers/0145.png) |
| `0150 arms/arm_right/hand/index_finger` | R04末节甲面方向；C02涉及形状标准。 | [0150](review-01-evidence/layers/0150.png) |
| `0160 arms/arm_right/hand/middle_finger` | 已查指身与折弯，作为R04邻接参考，未另列独立问题。 | [0160](review-01-evidence/layers/0160.png) |
| `0170 arms/arm_right/hand/ring_finger` | 已查根端、指身与指尖，未另列独立问题。 | [0170](review-01-evidence/layers/0170.png) |
| `0180 arms/arm_right/hand/thumb` | 真实拇指甲面须保留，与R04食指白块区分。 | [0180](review-01-evidence/layers/0180.png) |
| `0190 arms/arm_right/hand/palm` | 已查掌体、腕根与虎口，未另列独立问题。 | [0190](review-01-evidence/layers/0190.png) |
| `0200 arms/arm_left/forearm` | R01边线淡失；已查肩肘、腕掌相邻组合。 | [0200](review-01-evidence/layers/0200.png) |
| `0210 arms/arm_right/forearm` | R01边线淡失；已查肘腕衔接。 | [0210](review-01-evidence/layers/0210.png) |
| `0220 arms/arm_left/upper_arm` | R01肩弧及臂缘线色。 | [0220](review-01-evidence/layers/0220.png) |
| `0230 arms/arm_right/upper_arm` | R01肩弧及臂缘线色。 | [0230](review-01-evidence/layers/0230.png) |
| `0240 neck` | R01颈侧边线；R07横向接头；不要求恢复投影。 | [0240](review-01-evidence/layers/0240.png) |
| `0250 body/torso` | R08衣料结构线；R09外来发丝残留。 | [0250](review-01-evidence/layers/0250.png) |
| `0260 body/breast` | 胸片自身已查；其下隐藏的torso问题见R08。 | [0260](review-01-evidence/layers/0260.png) |
| `0270 face/ear_left` | R01耳下缘线色；耳尖、根部及内耳绘画存在。 | [0270](review-01-evidence/layers/0270.png) |
| `0280 face/ear_right` | R01耳下缘线色；耳尖、根部及内耳绘画存在。 | [0280](review-01-evidence/layers/0280.png) |
| `0290 head_accessories/left_earring` | 按粉色垂饰与顶部金属带检查，未无依据要求挖环孔。 | [0290](review-01-evidence/layers/0290.png) |
| `0300 head_accessories/right_earring` | 按粉色垂饰与顶部金属带检查，未无依据要求挖环孔。 | [0300](review-01-evidence/layers/0300.png) |
| `0310 face/face_base` | R01下颌轮廓；脸底隐区完整，不要求打眼口洞。 | [0310](review-01-evidence/layers/0310.png) |
| `0320 face/mouth/mouth_interior` | 口腔完整，已查与齿、舌、唇组合，未另列问题。 | [0320](review-01-evidence/layers/0320.png) |
| `0330 face/mouth/lower_teeth` | 下齿片存在，舌片遮挡正常，未判缺失。 | [0330](review-01-evidence/layers/0330.png) |
| `0340 face/mouth/tongue` | 已查舌面和边缘，未另列问题。 | [0340](review-01-evidence/layers/0340.png) |
| `0350 face/mouth/upper_teeth` | 已查窄牙带与口腔衔接，未另列问题。 | [0350](review-01-evidence/layers/0350.png) |
| `0360 face/mouth/lower_lip` | 已查下唇细线及嘴角，未另列问题。 | [0360](review-01-evidence/layers/0360.png) |
| `0370 face/mouth/upper_lip` | 已查上唇细线及嘴角，未另列问题。 | [0370](review-01-evidence/layers/0370.png) |
| `0380 face/nose` | 鼻部小片存在，未要求放大或加重。 | [0380](review-01-evidence/layers/0380.png) |
| `0390 face/eye_left/sclera` | 已查眼白及上下眼睑组合，未另列问题。 | [0390](review-01-evidence/layers/0390.png) |
| `0400 face/eye_right/sclera` | 已查眼白及上下眼睑组合，未另列问题。 | [0400](review-01-evidence/layers/0400.png) |
| `0410 face/eye_left/iris` | 已查虹膜、瞳孔和遮挡，未另列问题。 | [0410](review-01-evidence/layers/0410.png) |
| `0420 face/eye_right/iris` | 已查虹膜、瞳孔和遮挡，未另列问题。 | [0420](review-01-evidence/layers/0420.png) |
| `0430 face/eye_left/highlight` | 高光小点与亮面存在，未另列问题。 | [0430](review-01-evidence/layers/0430.png) |
| `0440 face/eye_right/highlight` | 高光小点与亮面存在，未另列问题。 | [0440](review-01-evidence/layers/0440.png) |
| `0450 face/eye_left/lower_eyelid` | 已查下睑细线及端点，未另列问题。 | [0450](review-01-evidence/layers/0450.png) |
| `0460 face/eye_right/lower_eyelid` | 已查下睑细线及端点，未另列问题。 | [0460](review-01-evidence/layers/0460.png) |
| `0470 face/eye_left/upper_eyelid` | 睫毛主体、外端及上眼线存在，未另列问题。 | [0470](review-01-evidence/layers/0470.png) |
| `0480 face/eye_right/upper_eyelid` | 睫毛主体、外端及上眼线存在，未另列问题。 | [0480](review-01-evidence/layers/0480.png) |
| `0490 face/eye_left/eyelid_crease` | 已查独立睑褶与眼线间隙，未另列问题。 | [0490](review-01-evidence/layers/0490.png) |
| `0500 face/eye_right/eyelid_crease` | 已查独立睑褶与眼线间隙，未另列问题。 | [0500](review-01-evidence/layers/0500.png) |
| `0510 face/eyebrow_left` | 完整眉存在，保留第一步位置修正；C01可见量待确认。 | [0510](review-01-evidence/layers/0510.png) |
| `0520 face/eyebrow_right` | 完整眉存在；C01可见量待确认。 | [0520](review-01-evidence/layers/0520.png) |
| `0530 hair/front_side_hair_right` | R02窄发边线；与R09 torso残留区分归属。 | [0530](review-01-evidence/layers/0530.png) |
| `0540 hair/front_side_hair_left` | R02面侧发尖及内外线。 | [0540](review-01-evidence/layers/0540.png) |
| `0550 hair/bangs` | R02发尖碎边；R03根部横接头；C01涉及对眉的遮挡。 | [0550](review-01-evidence/layers/0550.png) |
| `0560 hair/back_hair/cap :: crown` | R03与刘海交界；已与0050合看，不判重复。 | [0560](review-01-evidence/layers/0560.png) |
| `0599 legs/leg_left/boot_gem_chain/flexible_connector :: hidden_tip` | 隐藏短尾独显、与0620合看；保留599深度及末端收窄。 | [0599](review-01-evidence/layers/0599.png) |
| `0600 legs/leg_left/foot :: front` | R06、C03；与0055合看，固定花叶属本体。 | [0600](review-01-evidence/layers/0600.png) |
| `0610 legs/leg_right/foot :: front` | R06、C03；与0056合看，固定小珠点属本体。 | [0610](review-01-evidence/layers/0610.png) |
| `0620 legs/leg_left/boot_gem_chain/flexible_connector :: visible` | 三段连接线及与0599接续已查，不要求填平硬件位置的分段。 | [0620](review-01-evidence/layers/0620.png) |
| `0630 legs/leg_left/boot_gem_chain/large_diamond_gem` | 大菱形宝石与切面完整，未另列问题。 | [0630](review-01-evidence/layers/0630.png) |
| `0640 legs/leg_left/boot_gem_chain/small_diamond_charm` | 小菱坠双尖与线端遮挡已查，未另列问题。 | [0640](review-01-evidence/layers/0640.png) |
| `0650 legs/leg_left/boot_gem_chain/round_bead` | 圆珠及连接件相邻段已查，未另列问题。 | [0650](review-01-evidence/layers/0650.png) |
| `0660 legs/leg_right/boot_gem` | 右靴宝石形体与切面已查，未另列问题。 | [0660](review-01-evidence/layers/0660.png) |
| `0670 legs/leg_right/boot_flower_ornament` | 独立花叶饰物已查，未将左靴固定花叶当作重复层。 | [0670](review-01-evidence/layers/0670.png) |
