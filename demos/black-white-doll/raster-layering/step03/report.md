# raster step03 报告（black-white-doll）：Live2D 换装分层底稿（去除连体服）

> 调度器维护的文件（run.json、.running/.completed、../agents/steps/step03/prompt.md、../agents/steps/step03/attempts.jsonl、../agents/steps/step03/events.jsonl、../agents/steps/step03/result.json、error.txt）未改动，也未推进后续步骤。step01、step02 目录只读，未被改写。

## 1. 输入与产出

| 项目 | 路径 / 内容 |
|---|---|
| 输入 KRA（实际使用） | `.run/black-white-doll/raster-layering/step02/character-soft-edges.kra`，12,969,933 B，sha256 `4c79448c6288b0e4309d940c3571b7cda30e6e37f6a795aec7b70e70543654d8`（复制到 step03 后在副本上工作，原件未动） |
| 输入说明 | `step02/report.md`、`step01/report.md` |
| 对照用输入 PNG | `../step02/character-soft-edges.png`，650,722 B，sha256 `eb5cdaa19c8614172e273c87eed62f36831f19de64e15b777293038350c7e609` |
| 参考图（只用于对位和定位） | `../../part-layering/references/base-subject.png`，1086×1448 RGBA，sha256 `567c5ff7a2d012496bc8fc5d97b04832ccd0646da35cd27fea4f67f30fbc0dd0`。图上带有预处理阶段给角色穿上的白色高开衩连体泳衣（内为棕色连裤袜） |
| 上游结构（沿用，未改动） | `part-layering/parts/`、`part-layering/groups.json`、`part-layering/occlusion.json` |
| 交付 KRA | `step03/character-dressup-base.kra`，12,826,540 B，sha256 `a0c0f526ba39a0248de1835ff5e660ac18fbf45c6ed4bca563493d99cfc8427c`。1086×1448，81 个普通绘画层，层名、顺序、位置、归属与 step02 完全一致，无蒙版、无子节点；多深度切片层（outer_loop_strand `010`/`015`、outer_loop_lock `012`/`016`）全部保留 |
| 交付 PNG | `character-dressup-base.png`，604,805 B，sha256 `7643b506924749ab4812f5acafce74de70597bf7fa80b5390f0a7c5fd666bf5c`。由复开后的最终 KRA 经 Krita 自身投影导出：1086×1448 RGBA，透明背景（1,219,355 px 完全透明；step02 为 1,219,359），无底层、无缩放、未做后处理 |
| 过程产物 | `step03/checks/`（29 张对照图：局部 3×–14× 对照、邻接层检查、被改层独显、整体总览）、`step03/workspace/records/`（逐层改动表、复开校验、原生笔刷操作日志）、`step03/scripts/`（全部驱动、检查、报告脚本）、`step03/reopened-layers/`（复开 KRA 后逐层导出的 81 张 PNG） |

工程只有一个：`character-dressup-base.kra`。每批改动之后在这个工程里保存（`checkpoint()`：清选区、解 α 锁、保存、再锁），检查图一律取自最近一次保存后的内容；没有另建预览工程。临时工作区里留有几份保存点拷贝，仅在个别局部画坏时用来回退该局部，不交付。Krita 自己留下的 `character-dressup-base.kra~` 备份已删除。

## 2. 方法

### 2.1 总体思路
- 任务是素材制作：去掉预处理阶段给非写实角色加上的临时连体服，只在原布料范围里补出一层低细节底层，供之后叠加衣服。不新增乳头、生殖器或其他衣下人体细节，不加性化内容；补出来的只有躯干的平整肤色、腰部裤袜色，以及原有的锁骨、腋下、躯干外轮廓线。
- 这套角色的躯干 / 胸 / 骨盆各是一个完整绘画层，布料就画在这几层里。逐层独显、再看合成图，确认布料的范围是：躯干层（肩带、领口、包边、接缝线、腹部整块白布）、胸层（胸部白布与胸下淡紫阴影）、骨盆层（腰线以下的白布与腿口）；两条腿层上有旧盆缘 / 腿口压出来的色边残留；两条上臂层上有旧肩带边缘的发白细边。其余 74 层逐像素与 step02 相同。
- 补法：躯干与胸层补成其他肤色层用的基础肤色 (250,232,225)；骨盆层补成连裤袜色 (128,97,96)（连裤袜本来就穿在连体服里面，腰带上缘在腰线处）；腿层、上臂层只修边缘残留，颜色取本层自己的中位色。过渡宽度跟着形体走：领口、肩带缘、腰带、腿口、侧腹各自按原形状下笔，没有统一羽化，也没有整层模糊。
- 参考图和 step02 合成只用来**对位和定位**（布料在哪、旧边在哪）。所有写进图层的颜色都取自该层或邻接肤色层自己的像素，没有把参考像素贴进任何图层。
- 保留的原画：躯干层里原有的裸肤领口弧与锁骨线（`protect29` 选区保护）、两侧躯干与腋下外轮廓、腰带之下的裤袜、腿与手臂的内部皮肤、74 个未改动层。

### 2.2 算子（逐层表“处理”列的字母）
| 字母 | 算子 | 作用 | 影响范围 |
|---|---|---|---|
| F | 大笔刷填色：Krita 预设 `b) Airbrush Soft`，26–150 px，真实鼠标事件扫过 | 在选区内把布料范围一次覆盖成底色（躯干 150 px 横扫两遍；胸 26 px；骨盆锁 α 后 36 px 两遍） | 选区内 |
| L | 细笔收边 / 勾线 / 渐隐：同一预设，3–14 px，不透明度 0.12–0.9 | 领口旧边、领口暗线、锁骨尾端、侧腹轮廓与淡阴影、腰带曲线、裆缝暗部与暗边、腿层与上臂层的色边修整 | 沿旧边的窄带 |
| K | 硬笔刷补点 / 补列：`b) Basic-5 Size Opacity`（硬圆）；`pxfix` 在 20× 视图用 3 px 硬笔逐点补 | 肩带缘列、x=594 淡列、骨盆α凹陷、裆缝顶点、零星像素 | 单列 / 单点 |
| E | 橡皮：同一批预设切到擦除模式（软 / 硬） | 腰角与侧缘的多余边、孤立 α 杂点、裆缝“盖子”残留 | 小块、选区内 |
| S | 涂抹：`k) Blender Blur` | 第 11 层 (574–584, 647–655) 缺口顺边抹开 | 小块、选区内 |
| Q | Python 辅助（只做定位、取色、做选区、切图层、导出对照图、校验） | 选区用 numpy 做成 uint8 蒙版，经 `Selection.setPixelData` 上传，只限制笔刷的作用范围；**不对任何绘画层调用 setPixelData** | 不直接改像素 |

绘画通道：私有 Xvfb（:197，1700×1100）上的 GUI Krita 5.3.4.1，用 `xdotool` 发真实的鼠标按下 / 移动 / 抬起，由 `workspace/scripts/drv.py`、`painter.py`、`pxfix.py` 驱动，压力恒为 1.0。合成的 QMouseEvent 不会下笔，所以没有用。逐条命令记录在 `workspace/records/native-stroke-log.md`（67 条命令、113 次 stroke / strokes / pxfix 调用，UTC 时间；第 0–2 条是在临时图层上做的笔刷试验，图层随后删除，不在交付工程里）。

### 2.3 工作链
1. 起点：复制 step02 KRA 到 `step03/character-dressup-base.kra`，在 GUI Krita 里打开。
2. 定位：逐个独显第 28–30 层及相邻层，对照参考图找出布料、肩带、包边、接缝线、淡紫阴影、腿口的范围；用 Python 只做出选区（布料区、保护区、腰角、凹陷、缺口、接缝等），不改像素。
3. 躯干：Airbrush 150 px 横扫填底色 → 领口旧边收边、领口暗线 → 肩带缘硬笔补列 → 腰带曲线 → 侧缘轮廓线、侧腹淡阴影 → 腰角擦除、杂点擦除。
4. 胸：选区内 26 px 填底色，补胸侧轮廓。
5. 骨盆：锁 α 填裤袜色 → 两腿根 V 形分界、裆缝暗部与暗边 → 髋部轮廓斜坡、α 凹陷硬笔修复 → 腰角局部擦除 → 裆缝“盖子”修复。
6. 腿层、上臂层：沿旧边残留逐处修边；第 11 层缺口、第 19 层左肩接缝单独处理。
7. 每批之后保存，导出该批的局部对照图，**打开查看**；发现问题就回到画笔继续修（见 2.4），不是只改报告。
8. 终审：保存、关闭、重新打开最终 KRA，逐层导出 81 张 PNG，核对层结构与合成，导出 PNG。

### 2.4 修正过程（实际遇到的问题与处理）
| 发现的问题 | 处理 | 结果 |
|---|---|---|
| 合成的 QMouseEvent 不下笔；视图重置后笔画落到画布外 | 改用 xdotool 真实输入；`drv.py` 持久化视图状态，每次下笔前重设视图并校验屏幕范围 | 之后每条命令都在画布内下笔；第一遍横扫在修好 `drv.py` 后重做 |
| 填色边缘有淡紫色边 | 沿旧边用本层中位色细笔收边（含两条上臂层的 4–5 px 修边） | 色边消失 |
| 低不透明度 Airbrush 一笔改动太小（第 11 层缺口、第 19 层左肩接缝的试验） | 缺口改用 Blender Blur 涂抹；接缝改为 12 px / 0.35 三遍 | 缺口与接缝不再可见 |
| 腰角出现锯齿状小牙；右髋 α 出现凹陷 | 腰角局部软擦（`_corL/_corR`）；髋部轮廓斜坡与凹陷硬笔修复 | 腰带轮廓平滑，无牙、无凹口 |
| 右侧腹本想擦除却画上了颜色：擦除模式是在预设激活之前切的，被预设重置 | 撤销；先激活预设，再切擦除，再只改尺寸 / 不透明度，下笔后再切回 | 擦除正确 |
| 侧腹淡阴影第一次太弱 | 每侧三遍 14 px / 0.12 | 与腋下肤色过渡自然 |
| x=594 一条偏浅的列；裆缝顶端“盖子”残留 | 硬笔补列；`_lid.raw` 选区内部分擦除 + 3 个硬笔点；个别像素用 `pxfix` 逐点补 | 已消失 |
| 孤立 α 杂点 | 原生橡皮清除 | 已清除 |
| 辅助脚本的小问题（解析 maindoc.xml 的命名空间、dump 层名 / 序号对不上、桥接代码里 W 未定义、相对通配符 rm 被拦截、未加引号的 heredoc 把反引号当命令执行） | 改脚本、改用绝对路径、日志头用带引号的 heredoc 重写 | 不影响成品 |

## 3. 逐层验收记录

- 层号 = 自下而上 0 起；名称列为 KRA 层名（“NNN” 前缀 + 部件路径）。
- “改动像素”为相对 step02 同层有任何通道变化的像素数；81 层中 **7 层有改动**（第 10、11、19、27、28、29、30 层），其余 74 层与 step02 逐像素相同（含 α=0 处的 RGB）。逐层数字来自 `workspace/records/layer-table.json`（同内容的表见 `workspace/records/layer-table.md`）。
- “α 减 / 增 / 仅颜色”：α 变小的像素数 / α 变大的像素数 / α 没变只改颜色的像素数。
- “处理”列字母见 2.2。
- 对每个被改层都做了三项目检：① 独显（`checks/solo-*.png`，布料、包边、接缝、残色是否干净，渐变是否柔和）；② 邻接肤色层显示、遮挡层隐藏（`checks/neighbours-*.png`，颈肩、肩臂、胸躯、腰腹、腿根的色、亮度、线条与体积）；③ 合成图原尺寸与 3×–14× 放大（`checks/overall-1x.png`、`checks/cmp-*.png`，与 step02 同坐标同倍率对照）。
- 坐标为画布坐标 (x, y)。

| 层 | 名称 | 改动像素 | 处理 | α 减 / 增 / 仅颜色 | 验收备注 |
|---:|---|---:|---|---|---|
| 0 | `010` hair/ponytail_right/outer_loop_strand::back | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 1 | `011` hair/ponytail_left/inner_return_lock | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 2 | `012` hair/ponytail_left/outer_loop_lock::back | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 3 | `013` hair/ponytail_right/main_strand | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 4 | `014` hair/ponytail_left/main_lock | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 5 | `015` hair/ponytail_right/outer_loop_strand::front | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 6 | `016` hair/ponytail_left/outer_loop_lock::front | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 7 | `017` hair/ponytail_right/inward_curl_strand | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 8 | `018` hair/back_hair | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 9 | `019` neck | 0 | — | — | 未改动；作为邻接层复核（颈肩接缝） |
| 10 | `020` legs/leg_right/leg | 767 | L | 0 / 0 / 767 | 去掉旧连体服腿口（盆缘）压在右腿层上的色边残留，范围 (460–536, 565–682)。方法：沿残留走向用 Airbrush Soft 5–8 px、不透明度 0.85–0.9，颜色取本层腿内部的中位色；楔形过渡处改用 6 px、0.22–0.4 的轻笔。独显（`checks/solo-020_legs-leg_right.png`）无亮边、无色带；与骨盆层的 V 形分界色连续（`cmp-thigh-root-R-10x`）。α 与外轮廓未动；色变均值 7.8、最大 31。 |
| 11 | `021` legs/leg_left/leg | 963 | LS | 0 / 0 / 963 | 同第 10 层，范围 (559–634, 565–682)。另在 (574–584, 647–655) 有一处缺口：Airbrush 0.35 一笔改动太小，改用 Blender Blur 涂抹笔在 `_notch` 选区内顺边涂开。独显（`checks/solo-021_legs-leg_left.png`）干净。遗留：缺口楔尖偏钝，台阶 ≤3 级。α 未动；色变均值 10.4、最大 55。 |
| 12 | `022` arms/arm_right/hand/little_finger | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 13 | `023` arms/arm_right/hand/ring_finger | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 14 | `024` arms/arm_right/hand/middle_finger | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 15 | `025` arms/arm_right/hand/index_finger | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 16 | `026` arms/arm_right/hand/thumb | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 17 | `027` arms/arm_right/hand/palm | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 18 | `028` arms/arm_right/forearm | 0 | — | — | 未改动；作为邻接层复核（肩臂 / 前臂接缝） |
| 19 | `029` arms/arm_right/upper_arm | 182 | L | 0 / 0 / 182 | 画面左侧上臂（arm_right）的肩带边缘发白细边，范围 (472–482, 276–335)。方法：沿旧肩带边用 Airbrush 4–5 px，颜色取本层中位肤色修边；左肩带缘接缝另用 12 px / 0.35 的软笔三遍，限制在 `_seamL` 选区 (x470–480, y276–326)。独显（`checks/solo-029_arm_right-upper_arm.png`）无亮边；肩臂接缝（`cmp-shoulder-arm-join-L`）无色带。色变均值 6.5、最大 87（个别残留亮边像素）；α 未动。 |
| 20 | `030` arms/arm_left/hand/little_finger | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 21 | `031` arms/arm_left/hand/ring_finger | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 22 | `032` arms/arm_left/hand/middle_finger | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 23 | `033` arms/arm_left/hand/index_finger | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 24 | `034` arms/arm_left/hand/thumb | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 25 | `035` arms/arm_left/hand/palm | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 26 | `036` arms/arm_left/forearm | 0 | — | — | 未改动；作为邻接层复核（肩臂 / 前臂接缝） |
| 27 | `037` arms/arm_left/upper_arm | 186 | L | 0 / 0 / 186 | 画面右侧上臂（arm_left）的肩带边缘发白细边，范围 (611–621, 272–333)。方法同第 19 层：Airbrush 4–5 px 取本层中位肤色修边。独显（`checks/solo-037_arm_left-upper_arm.png`）无亮边，肩臂接缝（`cmp-shoulder-arm-join-R`）连续。色变均值 5.8、最大 30；α 未动。 |
| 28 | `038` pelvis | 19,579 | QFLKE | 163 / 120 / 19,296 | 连体服下半（腰线以下、腿口、裆部）整块去掉，范围 (450–644, 517–684)。底层是原本就穿在里面的棕色连裤袜，所以补成裤袜色 (128,97,96)。方法：锁 α 后用 Airbrush Soft 36 px 在连体服范围内两遍上色；腰带上缘沿拟合曲线手工收边；两腿根 V 形分界、裆缝暗部（Airbrush 34 px / 0.35 / (112,83,84)）、裆缝暗边与清晰轮廓线用 Airbrush 细笔；髋部轮廓、腰角、α 凹陷用硬笔刷、软橡皮分别补回或擦掉（`_corL/_corR` 选区内部分擦除）；裆缝上缘“盖子”残留用 `_lid.raw` 选区内的原生部分擦除 + 3 个硬笔点。独显（`checks/solo-038_pelvis.png`）为单色裤袜面，无布料、无接缝线、无任何下体细节。遗留见 §6。 |
| 29 | `039` body/torso | 39,374 | QFLKEP | 37 / 846 / 38,491 | 连体服上半（肩带、领口、包边、接缝线、胸下淡紫阴影、腹部布料）整块去掉，范围 (459–635, 269–565)。底层补成同部位其他肤色层使用的基础肤色 (250,232,225)。方法：用 Python 做出布料区选区 `F29.raw`（`protect29` 保留原有裸肤的领口弧与锁骨线），再用 Airbrush Soft 150 px 横扫两遍；领口旧边用 6 px 细笔收边，领口暗线用 3 px / 0.9 / (124,101,98) 与 2.5 px / 0.7 / (120,98,102) 补回；锁骨尾端渐隐笔画；肩带边缘列用硬笔刷补；腰带用裤袜色 9 px 细笔沿拟合曲线勾出；两侧躯干轮廓用 3 px / 0.85 / (128,96,92) 加 2.4 px / 0.55 / (196,160,152) 线，侧腹淡阴影用 14 px / 0.12 / (236,196,186) 每侧三遍；腰角与侧缘用软橡皮擦；孤立 α 杂点用原生橡皮清掉；x=594 淡列与零星像素用硬笔点补。独显（`checks/solo-039_body-torso.png`）无白布、无线条残留，锁骨线保留。填色区平（std 0），与原画肤色的细微噪点（std≈1.2–2）相比更平，均值一致。 |
| 30 | `040` body/breast | 13,039 | QFLK | 0 / 0 / 13,039 | 胸部层上的连体服布料与淡紫阴影整块去掉，范围 (462–633, 335–424)。方法：`sel_breast_fill.raw` 选区内 Airbrush Soft 26 px 填肤色 (250,232,225)；两侧胸侧轮廓用 3 px 细笔沿原轮廓补接；零星小点用硬笔点补。独显（`checks/solo-040_body-breast.png`）为平整肤色，**没有新增乳头或任何胸部细节**。遗留：(495, 419–421) 有 Δ2–3 的浅淡点。 |
| 31 | `042` face/ear_right | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 32 | `043` face/ear_left | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 33 | `044` face/face_base | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 34 | `045` face/eye_right/sclera | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 35 | `046` face/eye_left/sclera | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 36 | `047` face/eye_right/iris | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 37 | `048` face/eye_left/iris | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 38 | `049` face/eye_right/highlight | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 39 | `050` face/eye_left/highlight | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 40 | `051` face/eye_right/lower_eyelid | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 41 | `052` face/eye_left/lower_eyelid | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 42 | `053` face/eye_right/upper_eyelid | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 43 | `054` face/eye_left/upper_eyelid | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 44 | `055` face/eye_left/lower_eyelashes | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 45 | `056` face/eye_right/eyelid_crease | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 46 | `057` face/eye_left/eyelid_crease | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 47 | `058` face/eyebrow_right | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 48 | `059` face/eyebrow_left | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 49 | `060` face/nose | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 50 | `061` face/mouth/mouth_interior | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 51 | `062` face/mouth/tongue | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 52 | `063` face/mouth/upper_teeth | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 53 | `064` face/mouth/lower_teeth | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 54 | `065` face/mouth/lower_lip | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 55 | `066` face/mouth/upper_lip | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 56 | `067` head_accessories/left_hair_bow/white_ribbon_tail | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 57 | `068` head_accessories/left_hair_bow/long_black_ribbon_tail | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 58 | `069` head_accessories/left_hair_bow/short_black_ribbon_tail | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 59 | `070` head_accessories/left_hair_bow/bow_body | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 60 | `071` head_accessories/right_hair_bow/long_black_ribbon_tail | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 61 | `072` head_accessories/right_hair_bow/short_black_ribbon_tail | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 62 | `073` head_accessories/right_hair_bow/short_white_ribbon_tail | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 63 | `074` head_accessories/right_hair_bow/bow_body | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 64 | `075` hair/side_hair_left | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 65 | `076` hair/side_hair_right | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 66 | `077` hair/bangs | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 67 | `078` head_accessories/cross_hair_clip | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 68 | `079` head_accessories/heart_hair_clip | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 69 | `080` legs/leg_right/foot | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 70 | `081` legs/leg_left/foot | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 71 | `082` legs/leg_left/ankle_strap/strap_band | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 72 | `083` legs/leg_left/ankle_strap/rectangular_buckle | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 73 | `084` legs/leg_right/shoelace_bow/tail_right | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 74 | `085` legs/leg_right/shoelace_bow/tail_left | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 75 | `086` legs/leg_right/shoelace_bow/loop_right | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 76 | `087` legs/leg_right/shoelace_bow/loop_left | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 77 | `088` legs/leg_left/shoelace_bow/bow_loop_inner | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 78 | `089` legs/leg_left/shoelace_bow/bow_loop_outer | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 79 | `090` legs/leg_right/shoelace_bow/knot | 0 | — | — | 未改动（与 step02 逐像素相同） |
| 80 | `091` legs/leg_left/shoelace_bow/bow_knot | 0 | — | — | 未改动（与 step02 逐像素相同） |

## 4. 复开验证

对最终保存的 `character-dressup-base.kra` 关闭后重新打开，再检查（`workspace/scripts/verify_final.py`，结果在 `workspace/records/_verify_final.json`）：

| 检查项 | 结果 |
|---|---|
| 画布与节点数 | 1086×1448（与 step02 相同），81 / 81 个节点，与 step02 的属性差异列表为空 |
| 层名与顺序 | 与 step02 完全一致（复开后顺序逐项比对） |
| 层属性 | 81 层均为 paintlayer、normal 混合、不透明度 255、可见、0 个子节点；无蒙版；复开后 α 锁均为关闭，没有残留选区 |
| 未改动层 | 74 层与 step02 逐像素相同；改动层只有 10、11、19、27、28、29、30 |
| 像素 | 复开后逐层导出（`workspace/reopened-layers/000–080.png`）与复开前的工程内容 81/81 逐像素相等（0 个不一致） |
| 实时画面 vs 复开投影 | 被改区域的实时裁图与复开后的 Krita 投影最大差 0 |
| Krita 投影 vs 自算合成 | RGB 最大差 0.95、α 最大差 0.89，差值 >1 的像素 0 个（取整误差） |
| PNG vs Krita 投影 | `character-dressup-base.png` 就是复开 KRA 的 Krita 投影，逐像素相等（最大差 0），1086×1448 RGBA，透明背景保留；完全透明 1,219,355 px |
| 对 step02 合成的改动范围 | 合成图中有 52,726 个像素与 step02 PNG 不同，全部落在 (450,269)–(643,683) 框内；框外与 step02 逐像素相同 |
| 文件 | KRA 12,826,540 B，sha256 `a0c0f526…c8427c`；`.kra~` 备份已删除 |

## 5. 整体对比

主要判断依据是放大后的逐层与局部目测，下列数字只作旁证。

| 指标 | step02 | step03 |
|---|---:|---:|
| 完全透明像素数 | 1,219,359 | 1,219,355 |
| 合成图与 step02 不同的像素数 | — | 52,726（占画布 3.4%，全部在 (450,269)–(643,683) 内） |
| 其中色差 >30 / >60 / >120 | — | 16,890 / 13,822 / 12,007（即去掉白布后的变化主体） |
| 躯干腹部与胸的布料范围内像素 | 白 / 淡紫布色，腹部约 (244,242,247) | (250,232,225)，标准差 0 |
| 骨盆（腰带下）像素 | 白布 | (128.9, 97.7, 96.6)，标准差 ≈1.5–2.1 |
| 躯干上部（未动的原裸肤区，y 285–330） | (250.5, 231.9, 225.1) | 同左，标准差 1.3–2.0（原画自带的细微噪点） |
| 躯干/胸/骨盆框（x 440–660, y 260–700）内 α>200 的白 / 淡紫布色粗筛像素 | 47,271 | 338（全部是肤色高光 / 边缘上的临界像素，其中 305 个与 step02 逐位相同，属保留的原画；非布料） |

### 局部对照（同坐标、同倍率：step02 | 最终复开 KRA | 参考图）
| 对照图（`checks/`） | 区域与倍率 | 看到的具体问题 | 实际修法 | 结果 |
|---|---|---|---|---|
| `cmp-neck-shoulders-collar` | (440–660, 255–345) 3× | 两条白色肩带带灰边压过肩膀，领口圆弧带包边；肩带边缘在上臂层留发白细边 | 躯干层领口旧边 6 px 收边，领口暗线细笔补回，肩带缘列硬笔补；第 19 / 27 层沿旧带边用本层中位肤色修边 | 肩颈连成一片肤色，锁骨线与肩部外轮廓保留；肩臂接缝处仍有 1–3 级台阶（§6） |
| `cmp-shoulder-arm-join-L`、`-R` | (440–520 / 580–660, 270–350) 8× | 肩带边残留、左肩 (470–480, 276–326) 一道偏浅的接缝 | 第 19 层 12 px / 0.35 三遍，限于 `_seamL`；两侧上臂 4–5 px 修边 | 8× 下接缝不可见，只剩 1–3 级的细微台阶 |
| `cmp-chest-underarm` | (440–660, 330–480) 3× | 胸部白布、两条接缝线、胸下淡紫阴影；去掉后躯干两侧轮廓与腋下线要连续 | 躯干 150 px 填底色，胸层 26 px 填；侧缘轮廓线 3 px + 2.4 px，侧腹淡阴影三遍 | 裸躯干平整，无乳头、无任何胸部细节；侧缘轮廓线连续 |
| `cmp-armpit-flank-L`、`-R` | (440–520 / 580–660, 380–470) 8× | 布料去掉后躯干侧缘要重新成线，并与腋下线、手臂内缘连续 | 侧缘轮廓线 3 px + 2.4 px 补接；软橡皮擦掉多余边；侧腹淡阴影 | 腋下—侧腹轮廓连成一条；右侧擦除一度画上了颜色，已撤销重做 |
| `cmp-armpit-R-crease-14x` | (600–645, 315–360) 14× | 腋下褶线起笔处 | 保留原画，只补接 | 14× 下起笔处有 2–3 个偏浅灰像素，偏离 10–20 级（§6） |
| `cmp-waist-belly` | (440–660, 470–570) 3× | 腹部整块白布与接缝线；腰线处布料与裤袜的交界 | 躯干填肤色；腰带用裤袜色 9 px 细笔沿拟合曲线勾出；x=594 淡列硬笔补 | 腹部干净，腰带弧线清晰连续，无斜带、无亮边、无暗槽 |
| `cmp-hip-waistband-pelvis`、`cmp-waistband-4x` | (440–660, 540–640) 3×；(470–630, 520–600) 5× | 白布盖住裤袜，腰角处有牙状小缺口、右髋 α 凹陷 | 骨盆层锁 α 填裤袜色；腰角局部软擦；髋部轮廓斜坡与凹陷硬笔修复 | 腰带上缘平滑，无牙、无凹口；骨盆顶角有隐藏的小块暗三角（§6） |
| `cmp-thigh-root-R-10x`、`-L-10x`、`cmp-thigh-roots-crotch` | (545–615 / 470–540, 625–675) 12×；(440–660, 610–700) 3× | 旧腿口 / 盆缘在腿层上留色边；第 11 层有缺口；两腿根交界要自然 | 两腿层沿残留 5–8 px 修边、楔形 6 px 轻笔；缺口用 Blender Blur；骨盆层做 V 形分界 | 腿根与骨盆连续，无亮带；V 形边缘近 (508,632)、(585,628) 有细小折点（§6） |
| `cmp-crotch-gap-8x` | (520–600, 660–700) 8× | 裆缝顶端“盖子”残留，暗边不连续 | `_lid.raw` 内部分擦除 + 3 个硬笔点；暗边用 Airbrush 细笔 | 顶端干净；8× 下略呈方折（§6），与腿内侧轮廓一致 |
| `overall-1x`、`changed-composite-map` | 整身原尺寸；改动热图 3× | 整体对比去除前后；确认改动只在 (450,269)–(643,683) | — | 全身观感与 step02 一致，仅躯干 / 骨盆去掉连体服，头、头发、手、腿下部与鞋均未变 |

被改层独显：`solo-020_legs-leg_right`、`solo-021_legs-leg_left`、`solo-029_arm_right-upper_arm`、`solo-037_arm_left-upper_arm`、`solo-038_pelvis`、`solo-039_body-torso`、`solo-040_body-breast`：布料、包边、接缝线、残色已无；躯干 / 胸为平整肤色，骨盆为裤袜色面。邻接检查：`neighbours-neck-shoulder-4x`、`neighbours-chest-torso-arms-4x`、`neighbours-waist-belly-4x`、`neighbours-thigh-root-4x`、`neighbours-skin-only-2x`、`neighbours-torso-hidden-2x`（只显示邻接肤色层、隐藏遮挡层）：颈—肩—臂—躯干的色、亮度、线条连续；隐藏躯干 / 胸后看到的手臂与骨盆切边被躯干遮住，合成里不可见。

- 本步打开并查看了上面全部检查图；肉眼没有看到残留布料、旧边线、斜带、亮边或暗槽。
- 保留的原画：领口弧、锁骨线、两侧躯干与腋下轮廓、腰带之下的裤袜、两腿内侧轮廓、74 个未改动层；改动只在布料范围和必要的邻接过渡。
- 色调：躯干与胸的补色区均值 (250,232,225)，与相邻的前臂 (249,231,224)、画面右侧上臂 (250.3,230.7,223.9) 一致；颈部本来更暗 (234,206,197)，未改。

## 6. 仍未解决 / 只是部分完成的项目

1. 躯干与胸的补色区是纯平色（标准差 0），原画肤色有约 1.2–2 的细微噪点和笔触起伏。均值一致、目测不突兀，但在 8× 以上拉对比度能看出补色区更平。
2. 肩臂交界与旧肩带缘处残留 1–3 级的细微台阶，只在 8–10× 并强拉对比时可见。
3. 画面右臂内缘 (x≈630, y 358–394) 有若干原画自带的偏亮边缘像素，属于保留的原画，未动。
4. 右腋褶线起笔处 (619–620, 335–336) 有 2–3 个偏浅灰像素，偏离 10–20 级；14× 下可见。
5. 第 11 层缺口的楔尖偏钝，≤3 级。
6. 胸层 (495, 419–421) 有 Δ2–3 的浅淡点。
7. 躯干层下缘（腰带处）有若干小突起，但该处为裤袜色并带 α 渐变，叠在骨盆层上合成干净；只有单独显示躯干层时才看得到。
8. 骨盆层是平裤袜色（标准差 ≈1.5–2），与两腿层以 V 形软分界相接；骨盆顶角有隐藏的小块偏暗三角；骨盆边缘有少量 α 凹陷（右髋 ≤30 级、左髋 ≤18 级）、(461, 531–532) 一处轮廓错位、(471,343) 与 (470,346) 两个淡紫像素；V 形边缘近 (508,632)、(585,628) 有细小折点。
9. 裆缝顶端现为一条水平暗线，8× 下略方，与腿内侧轮廓一致。
10. 骨盆层顶部的隐藏凸出部分、手臂层的切断边缘被躯干层遮住，没有改，只有隐藏躯干层时才看得到。
11. 其余 74 个未改动层沿用 step02 的状态，step02 报告 §6 记录的遗留项本步未处理。

## 7. 与任务要求的偏差（如实记录）

1. **大面积填色（躯干、胸、骨盆）是原生笔刷在 Python 做出的选区内扫出来的底色，属于“选区限制 + 大笔刷平涂”，不是逐笔手绘的明暗；补色区因此是平色。**颜色取自邻接肤色层 / 裤袜自己的像素，没有用 NumPy、Pillow、QPainter 生成色场、渐变或阈值填色再写入。选区蒙版由 numpy 生成，经 `Selection.setPixelData` 上传，这是整个工程里唯一用到 setPixelData 的地方，从未对任何绘画层调用。
2. 下笔是脚本给定坐标折线、经 xdotool 发出的真实鼠标事件，不是手持笔的自由笔触；压力恒为 1.0，没有压感变化。收边、勾线、渐隐是这样的细笔；领口暗线、锁骨尾端、侧腹淡阴影、裆缝暗部都是这样逐笔加的。
3. 没有在补色区里额外画渐变或阴影（躯干 / 胸 std 0）；只在原有轮廓处补线和很淡的侧腹阴影、裆缝暗部。
4. 参考图与 step02 合成只用于对位和定位，没有贴进图层。
5. 骨盆层的楔形 / 侧缘轮廓本来是被连体服和躯干遮住的“补全区”，躯干收回到裸体轮廓以后露出来了，所以在骨盆层上补了髋部轮廓和 α 修整。
6. 运行环境：Krita 5.3.4.1（`Krita（由 --krita 指定）`），仅给 Krita 子进程用独立的 XDG 目录、私有 Xvfb :197；没有改动本进程的 HOME、登录环境、用户插件和全局 Krita 设置，没有碰机器上其他 Krita / Xvfb 实例。
7. 哈希检查、零差异、层数与复开检查（§4）只用于证明工程没被破坏，不替代 §5 的目测验收。

## 8. 文件索引

- `character-dressup-base.kra` / `character-dressup-base.png`：交付物。
- `workspace/records/layer-table.json`、`workspace/records/layer-table.md`：§3 逐层改动表的来源；`workspace/records/_verify_final.json`、`workspace/records/_reopen_names.json`、`workspace/records/_layer_changes.json`：复开校验、层名、逐层改动；`workspace/records/native-stroke-log.md`、`workspace/records/native-stroke-commands.json`：原生笔刷操作日志（命令、时间、笔刷参数）。
- `checks/cmp-*.png`：同坐标同倍率的局部对照（step02 | 最终 | 参考）共 14 张；`checks/neighbours-*.png`：邻接层检查 6 张；`checks/solo-*.png`：被改层独显 7 张；`checks/overall-1x.png`、`checks/changed-composite-map.png`：整体总览与改动热图。
- `workspace/reopened-layers/`：复开 KRA 后导出的 81 张逐层 PNG。
- `scripts/`：驱动（`drv.py`、`painter.py`、`pxfix.py`、`br.py`）、检查（`mk_checks.py`、`mk_checks2.py`、`mk_inventory.py`、`verify_final.py`、`solo_cmp.py`、`solo18.py`、`enh.py`、`vz.py`）、报告（`mk_report.py`、`report_template.md`），`analysis/` 是定位与拟合脚本，`bridge-calls/` 是发给 Krita 端的 273 个临时代码文件。
