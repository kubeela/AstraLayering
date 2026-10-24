结论：需要修复

# Step01 独立视觉 review 01

已完成本轮全部检查，确认 **15 个需要修复的位置（R1–R15）**。主要问题是掌指拼接、肩颈与衣料接合、双靴前口内容的深度归属，以及发面和骨盆补全区的硬接缝。整体人物比例和大轮廓接近参考，65 个逻辑部件均存在；这不能抵消下列局部还原及单件连续性问题。

## 检查对象、参考与执行方式

本文路径均相对任务根目录 `raster-layering/`，坐标均为原画布坐标；左右“画面左/右”与角色自身左右分开标明。

- 实际检查工程：`step01/character-depth.kra`，932 × 1688。KRA SHA-256：`247db470667f6e6a78c3e52eed0b8dfa3aa07e1980b22d42498c63e22a2a39c6`。
- 依据 `step01/report.md`，采用 `../part-layering/references/base-subject.png`，SHA-256：`811756ae2389b7e51eee0c0b683c0ca60d8db6adb0e833a07f5118148f44946e`。未更换参考，未移动、配准或缩放参考以掩盖位置偏差。局部放大仅用于观察。
- 已阅读 `step01/report.md`、当前 `groups.json`、`occlusion.json`、实际层映射及已有修画说明。`step01/` 没有此前正式的 `review-*.md` / `repair-*.md` 报告；制作报告中的“通过”和修画日志未作为本轮通过依据，旧截图也未替代本轮实际工程检查。
- 桌面工具首次连接 Krita 返回：`The Mac is locked and automatic unlock could not unlock it.` 已尝试正常连接并请求解锁；随后复用了当前已运行的 Krita Python bridge，成功由 **Krita 重新打开磁盘上的实际 KRA**。本轮通过原生文档 API 临时切换可见性、导出合成、69 层独显、65 个同 part 合看图和 9 种隐藏状态，完成实际视觉检查。没有伪称取得桌面 UI 截图；检查图是本轮 Krita 的实际投影导出。
- 先按原尺寸观察参考和本轮全图，再对全部部件的独显图按 200–400% 检查；头面、双手、肩胸、腰髋、双腿、双靴及两侧全部发束均有覆盖。所有比较采用相同原坐标裁切。疑似问题再看独显、同 part 合看及隐藏上层状态，只将已确认需要修改的内容列入下文。
- 本轮未调用保存工程或修改像素的操作。导出结束后恢复全部原可见性；实际 69 层的名称、类型、透明度、可见性和像素哈希与导出前一致，关闭本次检查文档而不保存。KRA 前后文件哈希一致；桥接命令也已恢复原内容。验证：`step01/review-01-evidence/krita-readonly-verification.json`。工程、上游分层文件、调度状态及调度日志未改。

## 证据入口与阶段边界

- 本轮原尺寸合成：`step01/review-01-evidence/current-krita.png`。
- **编号总图**：`step01/review-evidence/54f8ec3d-798b-4a04-a74d-e662ba3fe51a/marked.png`。
- **框坐标、图层和说明**：同目录 `regions.json`。每个问题均有 `R编号-reference.png`、`R编号-current.png` 和左参考/右当前的 `R编号-comparison.png`。下文简称此目录为 **标注目录**。
- 200–400% 独显检查图：`step01/review-01-evidence/sheet-*.png`；完整对应关系见 `sheet-index.json`。原画布独显为 `solos/<深度>.png`，同 part 合看为 `parts/<part_id>.png`，隐藏状态为 `hidden/*.png`。
- 对 R13、R14、R15，标注目录的全图同坐标比较只负责定位：原图相应位置可能是身体或上层衣料，**不是隐藏发面/骨盆补全应复制的内容**。这些问题的判断依据是下文引用的独显及补全/可见区内部连续性。

没有将未制作的阴影、AO、投影列为缺失。下述肤色、发束色阶和衣边是部件自身原有绘画内容；修复不需要新增上述效果。细微锯齿、半透明柔边、极细发梢边缘和细小线色差留给第二步。本轮未要求追求全图像素一致，也未用 PSNR 等指标判定通过。

## 确定问题及修复要求

### R1 — 画面左手：掌指和腕根出现拼接边

- **图层 / 位置**：角色右手 `0190 arms/arm_right/hand/palm`、`0180 .../thumb`、`0145 .../little_finger`、`0150 .../index_finger`、`0160 .../middle_finger`、`0170 .../ring_finger`，关联 `0210 arms/arm_right/forearm`；框 `[190,774,66,120]`。
- **当前表现与依据**：掌部远端的深色弧边横切各指根，在拇指近端形成套环状边界；腕根还有一条浅色弧形色带。原图是连续掌指皮肤，只有实际虎口、指缝和沿手指走向的纹理，没有横跨指根的封闭掌缘。独显 0190 后可直接看到这条被描出的掌部裁切边；隐藏掌层后，各完整指根存在，问题来自接合绘画，而不是缺少一根手指。
- **影响 / 修复 / 保留**：整手呈分段拼装，浅色指体和较暗掌面断开。按现有掌盖指根、前臂盖腕根的职责，在相应层用笔消除跨关节的人工描边并顺接色阶；保留真实虎口、指缝、五根完整手指、各指甲和原有指尖位置，不用整手参考覆盖把手指烘进掌层。
- **证据**：标注目录 `R1-comparison.png`；`step01/review-01-evidence/right-hand-comparison.png`（400%）、`hand-right-states.png`（合成 / 掌独显 / 拇指独显 / 无掌状态）。

### R2 — 画面右手：掌下横缝和拇指根断层

- **图层 / 位置**：角色左手 `0140 arms/arm_left/hand/palm`、`0130 .../thumb`、`0120 .../index_finger`、`0110 .../middle_finger`、`0100 .../ring_finger`、`0090 .../little_finger`，关联 `0200 arms/arm_left/forearm`；框 `[671,779,63,116]`。
- **当前表现与依据**：掌下缘形成一条明显的横向弧线，横穿画面右侧食指和中央屈指束；拇指根另有深边，腕接处有浅色半圆带。参考中的食指外缘从掌侧连续下行，不在此处被一道横线切开。掌独显和隐藏掌层对照确认：当前掌下缘描边叠在完整指体上。
- **影响 / 修复 / 保留**：改变手部体积阅读，像一截掌套在独立指体上。修顺掌/指根和腕/掌过渡，去掉不属于真实指缝的横切线，统一接合两侧肤色与纹理密度；保留当前手势、食指外侧轮廓、中央最低指尖及真实虎口空隙。保持各指独立，不合成一张手。
- **证据**：标注目录 `R2-comparison.png`；`step01/review-01-evidence/left-hand-comparison.png`、`hand-left-states.png`（均400%）。

### R3 — 颈根：重复线条和直角式接头

- **图层 / 位置**：`0240 neck`、`0250 body/torso`；框 `[400,327,131,36]`。
- **当前表现与依据**：躯干的锁骨线仍在，其上又多出左右短线，左颈根尤其有直角状深浅块。独显可见 neck 下缘自带线色，与 torso 上沿重复相叠。原图这里是一组自然锁骨线与连续颈胸皮肤。
- **影响 / 修复 / 保留**：在原尺寸形成多一道领口般的线条，颈与肩像两件硬接。锁骨绘画继续由 torso 承担；去掉 neck 接合端多余的外轮廓，顺接皮肤色阶，必要时微调局部覆盖余量，让颈的下端自然藏到 torso 后。保留完整颈部上下圆端和原有颈侧体积，不裁短为只剩当前可见颈段。
- **证据**：标注目录 `R3-comparison.png`；`step01/review-01-evidence/neck-join.png`（400%）、`solos/0240.png`、`solos/0250.png`。

### R4 — 画面左肩带/胸片交界：多出三角斜接边

- **图层 / 位置**：`0250 body/torso`、`0260 body/breast`；框 `[355,367,53,77]`。
- **当前表现与依据**：肩带在约 y374 附近被横截，向腋前多出一段斜向双线，形成参考没有的三角接片。隐藏 breast 后露出 torso 的上部衣料线；breast 独显可见另一组上角边线，两者拼合没有接成原图连续衣边。
- **影响 / 修复 / 保留**：改变连体衣领肩结构，属可见内容与组合问题。局部重画两层的上角接合，使窄肩带自然接回原图的领口与腋前曲线，去掉额外斜线及横截口；覆盖区的体积仍要补足，不因消缝删除完整 breast 或 torso 承底。保持当前两部件独立及 breast 在 torso 前的关系。
- **证据**：标注目录 `R4-comparison.png`；`step01/review-01-evidence/shoulders-chest-comparison.png`（300%）、`torso-hidden.png`（300%，含合成/无breast/双层独显）。

### R5 — 画面右肩带/胸片交界：折角与双轮廓

- **图层 / 位置**：`0250 body/torso`、`0260 body/breast`；框 `[513,367,54,77]`。
- **当前表现与依据**：右肩带下端和腋缘之间多出斜接线，交界形成折角和叠出的轮廓。参考该侧衣边连续，没有额外胸片分界；独显与隐藏检查证实来自两层边缘绘画的接合。
- **影响 / 修复 / 保留**：左右均出现新的服装结构感，削弱原图还原。按该侧参考单独接顺窄肩带、领边和腋前曲线，去掉附加接线，保留胸部外弧、衣料本身明暗及隐藏体积。不要直接镜像另一侧，也不新增运动部件。
- **证据**：标注目录 `R5-comparison.png`；`step01/review-01-evidence/shoulders-chest-comparison.png`、`torso-hidden.png`。

### R6 — 画面左踝：竖条式肤色与小腿断开

- **图层 / 位置**：`0060 legs/leg_right/leg`；框 `[383,1340,65,111]`。
- **当前表现与依据**：踝部有近乎平行的桃色竖条及较硬的起笔色带，形成柱状平涂区域。隐藏前靴、独显腿层后仍存在。参考中相应可见皮肤由小腿向踝部连续收束，色阶没有这种矩形笔触边界。
- **影响 / 修复 / 保留**：这是大范围皮肤绘画过渡变化，原尺寸也显出踝部材质变平，不是单像素边缘问题。只在该腿层沿小腿轴线、按邻近肤色用笔接顺条带起止和两侧过渡；保留参考已有的腿部形体及明暗，不新增投影。保留完整靴内圆端，不把靴缘颜色画回皮肤。
- **证据**：标注目录 `R6-comparison.png`；`step01/review-01-evidence/ankle-hidden.png`（300%）、`sheet-legs-1.png`（200%）、`boots-comparison.png`。

### R7 — 画面右踝：同类色柱和硬起止

- **图层 / 位置**：`0070 legs/leg_left/leg`；框 `[479,1340,66,111]`。
- **当前表现与依据**：小腿下端变成浅桃色竖向色柱，边缘与上方皮肤过渡突变；独显和无前靴状态可见同一问题。参考该侧没有独立的踝部色块。
- **影响 / 修复 / 保留**：两踝均显得后贴上去。按本侧腿形重画较宽区域的连续皮肤过渡，软接既有部件体积，保留原有外轮廓、腿长和靴内补全。该问题与 R9 的前口层序问题分别处理，不能靠抬高靴口遮住。
- **证据**：标注目录 `R7-comparison.png`；`step01/review-01-evidence/ankle-hidden.png`、`sheet-legs-1.png`、`boots-comparison.png`。

### R8 — 画面左靴：V口前沿被切入后衬并遭腿层遮挡

- **图层 / 位置**：`0056 legs/leg_right/foot :: rear`、`0610 legs/leg_right/foot :: front`，关联 `0060 legs/leg_right/leg`；框 `[385,1406,67,51]`。
- **当前表现与依据**：参考中沿皮肤开口的浅粉滚边和暗轮廓连续成 V。当前其中长段缺失，皮肤直接贴在深色靴面上。rear 独显含沿前 V 口下行的长线段；这些线段在 leg 后被挡住，front 没有完整承接相应前沿。同 part 合看还可见部分线色本身已弱于参考，需一并修画。
- **影响 / 结构要求**：缺失的是靴本身的可见边沿内容，不能仅作为第二步抗锯齿处理。**保留一件 foot 的两深度分片**：蓝灰后衬/后唇在 leg 后；实际贴着皮肤开口的前翻边、其暗轮廓和浅粉滚边须归 front，在 leg 前。依据真实边线细化互补分片，补顺损失的边沿，不把 rear 整层提到腿前。
- **保留 / 证据**：保留当前靴尺寸、后衬、前筒和独立宝石/花饰职责，不合层、不退回拆组。标注目录 `R8-comparison.png`；`step01/review-01-evidence/boot-right-split.png`（400%，参考/合成/foot联合/rear/front/无前靴六状态）。

### R9 — 画面右靴：V口前沿同类深度归属问题

- **图层 / 位置**：`0055 legs/leg_left/foot :: rear`、`0600 legs/leg_left/foot :: front`，关联 `0070 legs/leg_left/leg`；框 `[484,1406,67,51]`。
- **当前表现与依据**：前 V 口部分浅粉边线与暗边被切到 rear，叠加时被腿挡掉，V口剩下断续的裸肤边。参考为连续、自然弯曲的前口滚边；rear、front 及联合图的同坐标检查确认了内容归属和绘画两个层面的缺口。
- **影响 / 修复 / 保留**：按本侧真实前翻口曲线重新安排局部片界，并补回属于靴面的连续边线。后衬仍在腿后、前口仍在腿前，保持两片同属 `legs/leg_left/foot`；保留固定花叶饰和链串各自归属，不把腿皮肤烘入靴层，也不能以扩靴盖皮肤的方法消差。
- **证据**：标注目录 `R9-comparison.png`；`step01/review-01-evidence/boot-left-split.png`（400%，同样六状态）。

### R10 — 画面左下颌后至颈旁：头盖与长发的横斜硬接

- **图层 / 位置**：`0050 hair/back_hair/cap :: back`、`0010 hair/back_hair/long_right`、`0030 hair/side_hair_right`；框 `[387,248,53,77]`。
- **当前表现与依据**：下颌后方露出一条横斜深粉带，向下又接多边形亮块、断续色面。原图该处是向下连续的发流。去前发及各发层独显后，仍可辨认头盖下部和长/侧发之间没有自然接顺；并非把合理的隐藏发面误当作多余头发。
- **影响 / 修复 / 保留**：面部附近的横带把长发读成几块拼片。保留 cap 的后脑承底和冠顶分片，修顺其下缘与长/侧发的可见接合；在各自发层内沿发流接续深浅和线条，使隐藏余量与可见段相容。保留 `0530` 的颈旁细长分梢及独立耳饰，不能用耳饰/脸/颈的参考像素补发面。
- **证据**：标注目录 `R10-comparison.png`；`step01/review-01-evidence/head-comparison.png`、`head-hidden.png`（300%）、`neck-hair-ownership.png`（400%，0010/0030/0050/0530/0300同坐标独显）。

### R11 — 画面右颈旁：折线接边和碎片化色阶

- **图层 / 位置**：`0050 hair/back_hair/cap :: back`、`0020 hair/back_hair/long_left`、`0040 hair/side_hair_left`；框 `[488,251,58,78]`。
- **当前表现与依据**：该侧颈旁有折线状深粉接边与零碎明暗片，和下方发流接不上。参考是连续向下的粉发；隐藏前发后这组不自然的接合仍在，前侧细梢只是叠在其前。
- **影响 / 修复 / 保留**：与 R10 共同使头发在头颈交界突然换质感。分清头盖承底、侧束与厚后发职责后，局部重画发色和发束转折，消除横切发流的接头；保留 `0540` 的细梢和耳饰，不以合并头盖/长发、删去合理补全或将前侧发归给后发解决。
- **证据**：标注目录 `R11-comparison.png`；`step01/review-01-evidence/head-comparison.png`、`head-hidden.png`、`front-hair-left.png`（400%，用于区分前侧梢与后方问题，不要求逐像素复制遮挡物）。

### R12 — 画面左回钩末端附近：方形浅粉补丁横切发流

- **图层 / 位置**：主要 `0010 hair/back_hair/long_right`，邻接 `0030 hair/side_hair_right`；框 `[218,516,82,47]`。
- **当前表现与依据**：回钩末端的后方发面出现数个方形浅粉补丁，纹理和深色分束线在补丁边缘中断；在 0010 独显上也清楚存在。参考这里是连续后发，表层回钩覆盖其上，没有方块式填补。
- **影响 / 修复 / 保留**：属于整图可见的大块拼贴感。主要在 0010 内重画色块接头并延续同一束发流，再检查 0030 回钩叠上后的接合；保留回钩前于厚后发的层序、末端位置和开放空隙。只使用本发件自己的可见参考内容，不能把整个回钩复制进厚后发。
- **证据**：标注目录 `R12-comparison.png`；`step01/review-01-evidence/hair-patch-right.png`（300%，参考/合成/0030/0010），`hair-left-upper-comparison.png`。

### R13 — 画面左厚后发独显：补全与可见区之间仍留旧遮挡边界

- **图层 / 位置**：`0010 hair/back_hair/long_right`；框 `[260,278,205,465]`，框内重点包括中段多边形明暗块及下段约 y690–730 的斜向接缝。
- **当前表现与依据**：独显中，多处填补区和可见覆盖区形成硬多边形、突然截断的分束线；下段有沿原前臂遮挡边界延伸的浅色斜缝。隐藏全部身体后仍存在，故不是上方身体的合法边缘。原图在这些隐藏位置画的是遮挡物，不能用于要求像素一致；判断依据是本层应为从后枕到发尾的连续宽发面，以及它自身两侧已经明确的发流。
- **影响 / 修复 / 保留**：当前站姿掩盖了部分接缝，分件露出后会出现拼补轮廓，尚不满足第一步补全连续性。沿发束方向重新画通接缝两侧的色阶、高光和线色，清掉旧遮挡边界，不凭机械淡接保留平直/斜直切口。保留整片宽度、合理隐藏发面、外弧卷尾、中央小尖及同一运动身份；不以缩窄后发或从身体参考取像素盖缝。
- **证据**：标注目录 `R13-comparison.png` 仅作位置参考；主要依据 `step01/review-01-evidence/long-right-hidden.png`（200%）、`sheet-hair-1.png`、`solos/0010.png`、`hidden/only-hair.png`。

### R14 — 画面右厚后发独显：宽斜带和三角亮块的质感断层

- **图层 / 位置**：`0020 hair/back_hair/long_left`；框 `[449,258,190,486]`。
- **当前表现与依据**：上中部补全区有宽斜带与三角亮块，明暗和线条在硬边处骤变；下半部还有沿旧身体/手臂边界的细长接缝。独显及只显示头发状态均成立。这里不是要求隐藏区复刻身体像素，而是要求同一片发面内部的连续性。
- **影响 / 修复 / 保留**：转动或露出后片时会显出身体形状的拼补痕迹，绘画质感与可见长发不协调。沿现有发流用笔重画过渡，接续宽面高光和分束线，去掉与旧遮挡轮廓一致的缝；保留完整宽发面、外轮廓、多尖发尾及中央回卷主尖，不裁掉补全，不用另一发片或身体的参考内容跨归属覆盖。
- **证据**：标注目录 `R14-comparison.png` 仅作位置参考；主要依据 `step01/review-01-evidence/long-left-hidden.png`（200%）、`sheet-hair-1.png`、`solos/0020.png`、`hidden/only-hair.png`。

### R15 — 骨盆独显：上部补全与衣料可见区的水平硬缝

- **图层 / 位置**：`0080 pelvis`，当前被 `0250 body/torso` 局部覆盖；框 `[345,614,235,28]`，重点 y624 附近。
- **当前表现与依据**：上方圆弧补全与下方衣料在一条水平线上换色，两条衣料纵线也在该处断开/跳接。pelvis 独显清楚可见；全部叠加时大部分被 torso 遮住。该处应是同一件骨盆衣料的连续表面，不能把暂时藏住视为已修复。
- **影响 / 修复 / 保留**：本件单独露出时有横腰拼接痕迹。保留已补足的上部圆弧，用本件衣料颜色和笔触将接缝两侧接顺，延续自身纵向线条；不新增横腰线，不删除上部隐藏余量，不把 torso 原像素归入 pelvis。合理的 torso 覆盖关系保持。
- **证据**：标注目录 `R15-comparison.png` 仅作位置参考；主要依据 `step01/review-01-evidence/pelvis-join.png`（300%，参考/合成/pelvis/torso）、`sheet-body-1.png`、`solos/0080.png`。

## 全部部件覆盖与未列问题的处理

已检查当前 65 个逻辑 part 对应的全部 69 个实际普通绘画层，均无子节点/蒙版；鼻层保留 95/255 原透明度。cap、双 foot、flexible_connector 的两片分别独显并同 part 合看，没有把多层当作重复部件。cap 联合为完整后脑承底；连接两片共同保留原有连接职责；R8/R9 只要求纠正靴前沿的片界与内容，仍保留共同 foot 身份。

脸底、双耳、五官和口内部件均有完整承底；嘴腔未按舌/牙挖空、眼白未按虹膜挖空，双虹膜独显为完整主体，独立高光存在。上下臂和前臂的遮挡端有完整实体，五指各自存在且未发现需新增指体的证据。双腿与靴内端、两靴面在饰件后的补全均检查过。眼口极小的线色/柔边差异、细发梢和极细指边未另列第一步返修项；未发现证据充分的额外缺件或需撤销已落实深度分片的问题。

逐 part 的实际层、独显证据及本轮问题归属如下；“无另列问题”表示该件已经看过，不表示对整份交付另作通过结论。

|逻辑 part|实际深度层（逐片独显）|本轮记录|
|---|---|---|
|`hair/back_hair/long_right`|[0010](review-01-evidence/solos/0010.png)|R10、R12、R13|
|`hair/back_hair/long_left`|[0020](review-01-evidence/solos/0020.png)|R11、R14|
|`hair/side_hair_right`|[0030](review-01-evidence/solos/0030.png)|R10、R12（接合）|
|`hair/side_hair_left`|[0040](review-01-evidence/solos/0040.png)|R11（接合）|
|`hair/ahoge`|[0045](review-01-evidence/solos/0045.png)|已查，无另列问题|
|`hair/back_hair/cap`|[0050](review-01-evidence/solos/0050.png)、[0560](review-01-evidence/solos/0560.png)|R10、R11（下缘接合）|
|`legs/leg_left/foot`|[0055](review-01-evidence/solos/0055.png)、[0600](review-01-evidence/solos/0600.png)|R9|
|`legs/leg_right/foot`|[0056](review-01-evidence/solos/0056.png)、[0610](review-01-evidence/solos/0610.png)|R8|
|`legs/leg_right/leg`|[0060](review-01-evidence/solos/0060.png)|R6、R8（接合）|
|`legs/leg_left/leg`|[0070](review-01-evidence/solos/0070.png)|R7、R9（接合）|
|`pelvis`|[0080](review-01-evidence/solos/0080.png)|R15|
|`arms/arm_left/hand/little_finger`|[0090](review-01-evidence/solos/0090.png)|R2（掌指接合）|
|`arms/arm_left/hand/ring_finger`|[0100](review-01-evidence/solos/0100.png)|R2（掌指接合）|
|`arms/arm_left/hand/middle_finger`|[0110](review-01-evidence/solos/0110.png)|R2（掌指接合）|
|`arms/arm_left/hand/index_finger`|[0120](review-01-evidence/solos/0120.png)|R2（掌指接合）|
|`arms/arm_left/hand/thumb`|[0130](review-01-evidence/solos/0130.png)|R2（掌指接合）|
|`arms/arm_left/hand/palm`|[0140](review-01-evidence/solos/0140.png)|R2（掌指接合）|
|`arms/arm_right/hand/little_finger`|[0145](review-01-evidence/solos/0145.png)|R1（掌指接合）|
|`arms/arm_right/hand/index_finger`|[0150](review-01-evidence/solos/0150.png)|R1（掌指接合）|
|`arms/arm_right/hand/middle_finger`|[0160](review-01-evidence/solos/0160.png)|R1（掌指接合）|
|`arms/arm_right/hand/ring_finger`|[0170](review-01-evidence/solos/0170.png)|R1（掌指接合）|
|`arms/arm_right/hand/thumb`|[0180](review-01-evidence/solos/0180.png)|R1（掌指接合）|
|`arms/arm_right/hand/palm`|[0190](review-01-evidence/solos/0190.png)|R1（掌指接合）|
|`arms/arm_left/forearm`|[0200](review-01-evidence/solos/0200.png)|R2（腕接合）|
|`arms/arm_right/forearm`|[0210](review-01-evidence/solos/0210.png)|R1（腕接合）|
|`arms/arm_left/upper_arm`|[0220](review-01-evidence/solos/0220.png)|已查，无另列问题|
|`arms/arm_right/upper_arm`|[0230](review-01-evidence/solos/0230.png)|已查，无另列问题|
|`neck`|[0240](review-01-evidence/solos/0240.png)|R3|
|`body/torso`|[0250](review-01-evidence/solos/0250.png)|R3、R4、R5|
|`body/breast`|[0260](review-01-evidence/solos/0260.png)|R4、R5|
|`face/ear_left`|[0270](review-01-evidence/solos/0270.png)|已查，无另列问题|
|`face/ear_right`|[0280](review-01-evidence/solos/0280.png)|已查，无另列问题|
|`head_accessories/left_earring`|[0290](review-01-evidence/solos/0290.png)|已查，无另列问题|
|`head_accessories/right_earring`|[0300](review-01-evidence/solos/0300.png)|已查，无另列问题|
|`face/face_base`|[0310](review-01-evidence/solos/0310.png)|已查，无另列问题|
|`face/mouth/mouth_interior`|[0320](review-01-evidence/solos/0320.png)|已查，无另列问题|
|`face/mouth/lower_teeth`|[0330](review-01-evidence/solos/0330.png)|已查，无另列问题|
|`face/mouth/tongue`|[0340](review-01-evidence/solos/0340.png)|已查，无另列问题|
|`face/mouth/upper_teeth`|[0350](review-01-evidence/solos/0350.png)|已查，无另列问题|
|`face/mouth/lower_lip`|[0360](review-01-evidence/solos/0360.png)|已查，无另列问题|
|`face/mouth/upper_lip`|[0370](review-01-evidence/solos/0370.png)|已查，无另列问题|
|`face/nose`|[0380](review-01-evidence/solos/0380.png)|已查，无另列问题|
|`face/eye_left/sclera`|[0390](review-01-evidence/solos/0390.png)|已查，无另列问题|
|`face/eye_right/sclera`|[0400](review-01-evidence/solos/0400.png)|已查，无另列问题|
|`face/eye_left/iris`|[0410](review-01-evidence/solos/0410.png)|已查，无另列问题|
|`face/eye_right/iris`|[0420](review-01-evidence/solos/0420.png)|已查，无另列问题|
|`face/eye_left/highlight`|[0430](review-01-evidence/solos/0430.png)|已查，无另列问题|
|`face/eye_right/highlight`|[0440](review-01-evidence/solos/0440.png)|已查，无另列问题|
|`face/eye_left/lower_eyelid`|[0450](review-01-evidence/solos/0450.png)|已查，无另列问题|
|`face/eye_right/lower_eyelid`|[0460](review-01-evidence/solos/0460.png)|已查，无另列问题|
|`face/eye_left/upper_eyelid`|[0470](review-01-evidence/solos/0470.png)|已查，无另列问题|
|`face/eye_right/upper_eyelid`|[0480](review-01-evidence/solos/0480.png)|已查，无另列问题|
|`face/eye_left/eyelid_crease`|[0490](review-01-evidence/solos/0490.png)|已查，无另列问题|
|`face/eye_right/eyelid_crease`|[0500](review-01-evidence/solos/0500.png)|已查，无另列问题|
|`hair/front_side_hair_right`|[0530](review-01-evidence/solos/0530.png)|已查，无另列问题|
|`hair/front_side_hair_left`|[0540](review-01-evidence/solos/0540.png)|已查，无另列问题|
|`hair/bangs`|[0550](review-01-evidence/solos/0550.png)|已查，无另列问题|
|`face/eyebrow_left`|[0570](review-01-evidence/solos/0570.png)|已查，无另列问题|
|`face/eyebrow_right`|[0580](review-01-evidence/solos/0580.png)|已查，无另列问题|
|`legs/leg_left/boot_gem_chain/flexible_connector`|[0599](review-01-evidence/solos/0599.png)、[0620](review-01-evidence/solos/0620.png)|已查，无另列问题|
|`legs/leg_left/boot_gem_chain/large_diamond_gem`|[0630](review-01-evidence/solos/0630.png)|已查，无另列问题|
|`legs/leg_left/boot_gem_chain/small_diamond_charm`|[0640](review-01-evidence/solos/0640.png)|已查，无另列问题|
|`legs/leg_left/boot_gem_chain/round_bead`|[0650](review-01-evidence/solos/0650.png)|已查，无另列问题|
|`legs/leg_right/boot_gem`|[0660](review-01-evidence/solos/0660.png)|已查，无另列问题|
|`legs/leg_right/boot_flower_ornament`|[0670](review-01-evidence/solos/0670.png)|已查，无另列问题|

完整检查索引：`step01/review-01-evidence/sheet-index.json`；隐藏状态清单为 `no-front-hair`、`no-breast`、`no-front-boots-and-ornaments`、`no-palms-and-forearms`、`only-hair`、`no-eyes-mouth-nose`、`hands-no-palms`、`arms-no-upper`、`head-no-face`，均来自本轮打开的实际 KRA。

建议先处理 R8/R9 的前口归属，再修 R1–R7 与 R10–R12 的可见接合，最后完成 R13–R15 的单件内部连续性，并复查整图。所有 15 项都是本轮确定需要修复的内容；工程保持未修改，待绘制 agent 逐项落实。
