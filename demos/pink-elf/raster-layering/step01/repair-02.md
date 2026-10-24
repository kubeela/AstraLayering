结论：已修复

# Step01 repair02 逐项修复记录

依据 [review-02.md](review-02.md) 和本轮编号证据，继续修复 [character-depth.kra](character-depth.kra)。**本报告R1–R9仅指review02**。参考仍为 [base-subject.png](../../part-layering/references/base-subject.png)，932×1688，SHA-256 `811756ae2389b7e51eee0c0b683c0ca60d8db6adb0e833a07f5118148f44946e`；所有局部使用原坐标，没有移动或缩放参考掩盖偏差。

当前65逻辑part / 70平级普通绘画层，无蒙版/子节点，鼻层95/255透明度不变。返修前KRA/PNG/报告在 [before](repair-02-work/before/)，正式review01、repair01和review02保持。原生核对：61层完整RGBA不变，9层修画，全部70层alpha不变，未增加深度片或运动节点。

## 逐项处理、证据与自检

### R1 — 画面左厚后发：已修复

- 定位：0010 hair/back_hair/long_right。根至中段有拱形硬界、平直宽面及孤立圆头亮条。
- 修改：以本件下段为画风依据，上部灰化、逐件RGB控制补绘；连续RBF配准后保留原alpha，在Krita用渐收尖笔触接续新旧发面。
- 独显、隐藏上层及全部叠加：完整独显及只显头发看不到旧拱形分界/圆头亮条，亮暗带向下连续；原隐藏宽度、小尖、外卷尾及y≥585合格原像素保留。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R1.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

### R2 — 画面右厚后发：已修复

- 定位：0020 hair/back_hair/long_left。本侧根中段同样有拱形换色与片状亮条，不能镜像另一侧。
- 修改：本侧单独生成上部完整连续发面，按自身向外下弯曲配准，原生接通中段宽窄变化和柔线；同样保留原alpha及合格发尾。
- 独显、隐藏上层及全部叠加：单层、只显头发及全叠加核对发流连续；多尖末端、外卷尾、中央主尖、共同中央覆盖与0040在前关系保留。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R2.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

### R3 — 画面左肩后长侧发：已修复

- 定位：0030 hair/side_hair_right。y337附近是同一层内部的水平色面/发纹接头，不是cap切口。
- 修改：在本层跨界重画底色，以可变画笔尺寸的真实原生路径延展深粉分束、浅亮面及柔线，向隐藏圆端逐渐收尖。
- 独显、隐藏上层及全部叠加：独显、隐藏cap和叠加均无原横向接头；根端、长弧、回钩和开放空隙不变，没有并入0010或肩部像素。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R3.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

### R4 — 画面右耳下侧发：已修复

- 定位：0040 hair/side_hair_left。耳下浅粉亮条方头和短横折线破坏本侧曲率。
- 修改：在0040内消去方头色片，按耳后向下转弯的曲率延展亮暗带，原生渐收尖笔触接入长发。
- 独显、隐藏上层及全部叠加：单层、无cap及合成检查方头/阶梯块消除；小翘梢、完整根部和悬空长弧保留，耳朵/耳饰/前侧发未移动。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R4.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

### R5 — torso异属前侧发副本：已修复

- 定位：0250 body/torso；正确发梢0530保持。肩带内侧粉弧同时存在于torso和0530，不能因合成相似保留。
- 修改：只在明确粉发足迹附近恢复本torso既有生成承底的皮肤与衣料，再用Krita小笔接顺肤色；没有从参考的遮挡发梢取像素。
- 独显、隐藏上层及全部叠加：torso独显与隐藏前侧发后无粉发残痕；0530完整RGBA与返修前一致，合成只由0530显示正确长梢，原锁骨和肩带保留。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R5.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

### R6 — neck隐藏下端：已修复

- 定位：0240 neck。本层下端横向浅界和三角换色面是皮肤内部接缝。
- 修改：在neck内跨界重画连续肤色，以邻近皮肤暖色逐渐接向圆端，不复制被torso覆盖位置的原锁骨/衣料。
- 独显、隐藏上层及全部叠加：独显、隐藏torso及全叠加检查下端连续；上下完整圆端和alpha保留，上方颈侧体积保持，锁骨仍只由torso承担。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R6.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

### R7 — 画面左小腿至踝：已修复

- 定位：0060 legs/leg_right/leg。y1318附近浅色带和下方平直色区仍是宽区域接头。
- 修改：恢复本腿确实外露的参考皮肤，排除双靴支持及5px邻域，选择柔化仅控制合法可见像素混合；随后在Krita沿腿轴接顺。
- 独显、隐藏上层及全部叠加：单层、无前靴和叠加均无原横亮带；皮肤过渡连续，腿长、宽度、既有形体和完整靴内圆端保持，无靴色进入皮肤。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R7.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

### R8 — 画面左靴V前口：已修复

- 定位：0610 front；0056 rear保持。当前片界职责合理；主要缺少front内部连续滚边，旧描线偏切边且被低alpha削弱。
- 修改：在既有0610靴面内按实际本侧V口补通暗轮廓、浅粉滚边及上段浅亮，沿连续弧线接回两侧前翻口。
- 独显、隐藏上层及全部叠加：front/rear独显、同foot联合和合成均核对：V两支至底部连续，后衬仍在腿后；未扩靴、改alpha、挪腿或复制皮肤。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R8.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

### R9 — 画面右靴V前口：已修复

- 定位：0600 front；0055 rear保持。本侧同类前口绘画弱失；不是需要再提rear的深度问题。
- 修改：依本侧独立弧线在0600内补通暗边和浅粉滚边，保持本侧弯曲与V底暖粉层次，不镜像另一侧。
- 独显、隐藏上层及全部叠加：front/rear、联合与合成检查边沿结构完整；现有腿部范围、靴尺寸、固定花叶和独立链串保留，片界与层序不变。
- [本轮当前多状态证据](repair-02-evidence/05-final/checks/R9.png)。全部实际分片原尺寸PNG在 `repair-02-evidence/05-final/<四位深度>.png`，完整part在 `repair-02-evidence/05-final/parts/<part_id>.png`。

## 补绘、归属与保存保留

R1/R2采用内置image_gen.imagegen，各生成1张独立透明PNG。每件主动制作同坐标RGB控制：红为合格保留的本件下段，黄为待修上部，绿为件外；图1黄、绿先置中性灰，未保留原拱形补丁或参考遮挡物。两张结果逐张查看后采用，黄色均画成完整连续粉发，无脸、颈、身体、衣物、饰品或邻发内容。新发面连续配准到现有支持，少量边缘只外推本次生成纹理，再在Krita沿发流实画接续，保留y≥585原生合格下段。原始生成、输入和完整提示词见 [R1生成记录](repair-02-work/generation/hair/back_hair/long_right/)、[R2生成记录](repair-02-work/generation/hair/back_hair/long_left/)，采用/配准范围见 [hair-registration.json](repair-02-work/hair-registration.json)。

R3/R4通过本层画笔跨接头重画，并逐段改变真实画笔尺寸，使亮暗带自然收尖；未裁隐藏圆端或借其他发片遮盖。R5清理torso异属副本，采用的是原本已生成的torso自身承底，随后皮肤小笔接顺；0530原生完整RGBA未变。R6只在neck实画连续肤色，未复制参考中其下方torso内容。R7只覆盖真实外露本腿皮肤，双靴支持及邻域排除后再原生接顺。R8/R9仅在front内画连续暗边/浅粉滚边，rear保持原RGBA、腿层范围不变。来源及选择记录见 [skin-source-log.json](repair-02-work/skin-source-log.json)。

本轮共25条原生绘画路径记录，见 [strokes.json](repair-02-work/strokes.json)。没有用颜色阈值填色、整层模糊、抬靴口、移上层或原图遮挡物代替修画/补全，也未新增阴影、AO、投影。选择柔化仅混合已确认合法的可见本件像素。

为保留合格修改，最终从同part返修前KRA恢复了两片后发y≥585、torso明确修补盒外及左小腿修补盒外的原生字节，避免PNG往返造成未修区的数值变化；这不是以原图遮挡物填隐藏区。61个未修改层完整RGBA与基线一致，全部70层原生alpha逐字节一致，详见 [shape-and-preservation.json](repair-02-evidence/shape-and-preservation.json)。鼻层在review独显PNG与当前原生导出间存在透明度应用方式差异，故核对采用原生像素和层透明度，确认其未改动。

## 结构与上游

review02未要求改动已正确的多深度职责，实际核对也未发现新穿插：cap保留0005/0050/0560，左foot0055/0600，右foot0056/0610，连接件0599/0620。共同逻辑part和运动身份保持；其余61件单层完整。R3/R4为同层色面问题、R8/R9为front内容问题，不用重排替代。R5归属按既有0530修正torso绘画，不增删控制节点。

本轮相对当前色块图没有形状超出、缺失或层序/归属节点变更。65份SVG文件保持；groups中9件当前修画记录、occlusion检查及指纹、当前完整part/绘画预览/产物记录已同步。全部JSON、SVG和内部引用可解析，65件/70层映射完整，最终支持符合当前SVG，见 [report.md](report.md)、[structure-layer-map.json](structure-layer-map.json)、[形状验证](shape-conformance.json)、[来源验证](source-hash-verification.json)。merge来源 `e0d8e8a6527a10b5edfb0584289ca94173bb8504391e817f9eaffb41ba18ea23`，occlusion来源 `77a30b9c785756a5397ac6097e50c3289ec919a6621dfe43d06156d0021d232f`。上游修改继续作为后续有效输入；未重启上游或修改调度器维护文件。

## 最后重开检查与结果

最后一批修改保存当前KRA后，由Krita实际关闭并重新打开。70层名称、类型、顺序、透明度、可见性、子节点数及完整RGBA一致，差异0，见 [重开验证](repair-02-evidence/reopen-verification.json)。[character-depth.png](character-depth.png)、[重开PNG](character-depth-reopened.png) 与05-final合成像素一致，已观察实际重开全图及当前独显汇总。保存稳定性只作持久化核验，视觉结论依据上列9处多状态图和完整part独显，未用PSNR/全图相似代替。

KRA SHA-256 `f9de3407e4c8c6e589ff9ce9ae3992ace16145b9ad3b35f7ce66566b2be940f9`；PNG SHA-256 `bf2f6be1856590a51d100bf4c739898ba17384a10c0eadea9286931f66cf3899`。[delivery-integrity.json](delivery-integrity.json) 确认65件/70普通层、支持完整、层序匹配、无蒙版/子节点、KRA CRC及重开导出一致。

9项反馈均适用并已处理，没有留待确认或不适用项。既有手部、肩胸、骨盆、五官及饰品结果保留。当前未留下已知本阶段缺口、明显内部接头或异属像素副本；细微柔边和抗锯齿按用户既定边界留第二步。本报告仅写指定暂存文件，未自行发布正式repair或推进后续步骤。
