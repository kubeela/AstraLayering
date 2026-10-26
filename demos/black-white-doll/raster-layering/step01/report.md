# raster step01 报告（black-white-doll）

> 暂存报告。调度器维护的文件（run.json、.running/.completed、../agents/steps/step01/prompt.md、../agents/steps/step01/attempts.jsonl、../agents/steps/step01/events.jsonl、../agents/steps/step01/result.json、error.txt）未改动，也未推进后续步骤。

## 1. 输入与产出

| 项目 | 内容 |
|---|---|
| 参考图 | `../../part-layering/references/base-subject.png`，1086×1448，sha256 `567c5ff7…0fbc0dd0`，剪影（alpha≥128）340126 px |
| 上游结构 | `part-layering/groups.json`（79 个逻辑部件）、各部件色块 SVG（`parts/`）、`occlusion.json`（79 行，81 个绘画深度） |
| 交付工程 | `step01/character-depth.kra`：1086×1448，81 个普通绘画层（paintlayer、normal、不透明度 255、可见、无子节点、无蒙版），自下而上与深度顺序一致 |
| 过程产物 | `step01/parts/<部件>/`：control/input/prompt/generated、patch、brush、work 等；`step01/generation-records.json`（109 条生成记录）；`step01/input-manifest.json`；`step01/inspect/`（composite、composite-diff、solo-sheet-0..5、各部件 work 检查图） |
| 上游改动 | 只在 `occlusion.json` 两条切片行的 note / check.note / check.regions[].note 末尾追加【raster step01】实现说明。层级、键、groups.json、SVG 均未改动，校验器输出 “document ok 79” |
| 临时脚本 | 本请求 workspace：prepare / mkprompt / patch / record / compose / brush / heal / tone / extrude / outline / reslice / assemble / sheet / occ_update / kr/*.py |

## 2. 方法

### 2.1 归属与形状（prepare.py）
- 每个部件的完整形状 = 上游色块 SVG 栅格化后的部件形状（complete-shape）。
- 可见区 = 形状中按 occlusion 深度排序后的最上层像素。owner.npy 记录每个参考像素的色块归属层。
- 色块图没有覆盖、但在参考剪影内的边缘抗锯齿像素（fringe）共 3589 px，分配给最近的色块，按 ≤2 px、同侧显示层计。剩余 9 px 在组装阶段处理（见 §5）。
- 色块形状超出参考剪影的部分共 3349 px。它们属于隐藏补全的外缘，或为抗锯齿余量。剪影外不显示的部分保持色块形状。
- 预处理阶段对色块做了修正（refinements，已计入偏差清单 §8）：
  - side_hair_left：回收暴露补全条带 183 px。
  - outer_loop_strand：交会圆弧补片回收 24 px。
  - pelvis：腿口回收 8679 px；外腿缘细条 169 px + 159 px 移给左右腿。

### 2.2 控制图与输入图
- 每个部件按形状外接框裁切（crop_box），并按比例放大到生成尺寸。长宽比决定 1024×1024、1024×1536 或 1536×1024。
- **控制图（图2）**：
  - 红 = 本部件可见区；
  - 黄 = 被上层遮挡、需补全的部分；
  - 绿 = 部件外。
- **输入图（图1）**：只保留本部件自己的可见像素。黄区的遮挡物抹成中性灰，绿区清空。

### 2.3 提示词模板（mkprompt.py / prompts.py）
- 每个部件都有中文目标描述和黄区专属说明，例如“连续补全被内卷发束、发结飘带、侧发、手臂遮住的宽发面……不画粉色宽卷束”。
- 模板固定写明以下内容：
  - 红色区域：保留原样，不改形状、颜色和线条。
  - 黄色区域：恢复目标部件本身，列出不要画的遮挡物名称。
  - 绿色区域：完全透明。
  - 保持精准编辑，画风与图1一致（柔和浅淡、低对比的日系动漫赛璐璐上色，干净纤细的线条，平滑色块与少量柔和阴影）。
  - 不要写实、厚涂或高细节，不加纹理、硬高光、宝石切面、发光或新颜色。
  - 最终只输出一张透明背景 PNG。
- 生成工具为 `mcp__layering__image_generation`（模型 gpt-image-2.5-sunburst），参考图依次为图1、图2。

### 2.4 生成与检查
- **生成数量**：79 个部件各做 1 次整件生成（v1），其中 4 个做了 v2（见 §3），共 83 次整件生成。另有 26 次局部补画（patch），共 109 条记录，全部登记在 `workspace/generation-records.json`（文件、提示词、控制图、输入图、sha256）。
- **检查**：每次生成都在原尺寸下逐部件对比。
  - 黄区必须延续本部件自身的结构和材质。
  - 不得复制遮挡物（发结飘带、手臂、刘海线等）。
  - 形状和画风必须一致。
- **不合格处理**：重新生成整件（v2）或局部补画（patch）。依据为 `inspect/work-*.png` 三联图：参考 / 洋红底 / 棋盘底，黄色标缺失，青色标隐藏边界。

## 3. 重生成与补画

### 3.1 v2 重生成（4 个部件）
- 涉及部件：
  - hair/ponytail_right/main_strand
  - hair/ponytail_left/main_lock
  - hair/side_hair_left
  - hair/side_hair_right
- v1 的问题：黄区只画了几缕细发丝，或留有透明缺口，没有画满。
- v2 提示词增加了明确要求：“黄色区域是目标部件被遮住部分的准确外形，必须用目标部件整块填满每一个黄色像素直到黄色外边界；输出中目标部件的外形等于红色与黄色区域的并集……不留透明缺口、空洞或细缝”，并点名不要画的遮挡物。

### 3.2 局部补画 patch（26 次，patch.py）
- **补画输入**：
  - 图1 = 当前 work 层（已完成部分）。
  - 图2：红 = 已画像素，黄 = 仍缺 / 需重画的部件像素（限定在 limit_box 内），绿 = 部件外。
  - `--redo`：丢弃框内原补全，整块重画。原补全复制了遮挡物或结构不对时使用。
  - `--underpaint`：给黄区铺本部件底色，供模型延续。
- **注册与合成**：补画结果对齐 patch 底图（平移和缩放搜索）后，只填自己的目标区域。

| 部件 | 补画 | 目标 px / 限定框 | 原因 |
|---|---|---|---|
| face/face_base | p1 | 1841 | v1 在被刘海遮住的额头和太阳穴处留有缺口，补成平整肤色，上沿收成圆弧 |
| main_strand | p1, p2, p3 (redo) | 630 / 339 / 15195，框 [330,150,455,420] | p1/p2 补内缘缺口；p3 在框内丢弃先前补全，整块重画宽发面，使分缕连续 |
| main_lock | p1, p2, p3 (redo) | 1435 / 431 / 1793 | p1 补扎根段，p2 补手臂后缺口，p3 整块重画手臂后段 |
| inner_return_lock | p1, p2 | 2051 / 1048 | 狭长发带上段和下端的连续补全 |
| inward_curl_strand | p1, p2 | 1005 / 887，框 [400,120,450,220] | 飘带后的扎根段 |
| side_hair_left / right | 各 p1–p3 | 1733→1140 / 4773→4011 | 侧发上段被刘海和发结遮住，需逐次补满 |
| leg_left / leg_right | p1, p2 (redo) / p1 (redo) | 约 11280 | 髋部和大腿根的丝袜补全，整块重画，使丝袜色和明暗与可见腿连续 |
| neck | p1 (redo) | 1599 | 颈上端和颈根 |
| pelvis | p1 (redo) | 6676 | 被上衣遮住的腰部白色衣面 |
| arm_left upper_arm | p1 (redo) | 1791 | 重画肩内侧（v1 补全不合格） |
| outer_loop_strand | p1 | 208 | 根端 |
| outer_loop_lock | p1, p2 | 563 / 269 | 回接楔、扎根伸入端 |

### 3.3 内容审核与替代
- arm_left upper_arm p1：首次被拒（output 阶段，sexual 类）。改用中性措辞重试后成功，结果 1803 px 已采用。被拒的原提示词保存为 `patch-1-blocked.txt`。
- arm_right upper_arm p1：连续 3 次被拒（原措辞、中性措辞、抽象“卡通色块”措辞）。
  - 替代做法：不使用该补画，保留 v1 生成补全，在框 [458,280,500,410] 内用 heal 画笔（thr 30，510 px）把复制进来的躯干轮廓笔触改画为周围自有补全色，保留生成的明暗。
  - **没有用原图像素替代补全。**
- 记录在 workspace `moderation.jsonl`。

## 4. 合成规则（compose.py，每个逻辑部件一张全画布 work 层）
- **safe**：本部件可见区中远离其他部件的像素，直接用参考像素。
- **band_hi**：与更高层相邻 2 px（face_base、neck 为 3 px）的本部件可见边带，以及隐藏区。使用注册后的生成像素：
  - 注册方式：平移和缩放搜索，误差 >15 时扩大搜索范围。
  - 逐通道线性校色，并用平滑偏移场衔接周围已知色。
  - 多个来源按优先级 pN > vN 取 alpha≥200 的像素。
- **band_lo**：与更低层相邻 1 px 的可见边。用最近内部自有像素颜色去边色（defringe）。
- **cont**（7291 px）：边带中颜色延续本部件局部色（差值 <30）的像素，保留参考像素。
- **contour_lo**（1276 px）：对下层的边带中，比本部件和下层局部色都暗、且本部件自己画得出这种暗度的像素，判定为本部件（遮挡方）的轮廓线，保留参考像素。眼睛高光不适用此规则。
- **keep**（76 px）：outer_loop_lock 框 [732,484,762,500] 内的内卷尖只画了轮廓，保持参考像素。
- **edge_clean**（2120 px）：对上层的边带，按本部件局部色修正颜色突变（>90；生成带 >60）。对下层的边带只用本部件可见像素作为局部色，避免把另一深度切片的补全色带进来。
- **seam_clean**（4261 px）：不同来源接缝处、生成器沿自身填充边画出的细描边，改为局部色（只改隐藏像素）。
- **alpha**：本部件可见像素和剪影外 2 px 区沿用参考 alpha，形状内其余补全像素为 255。
- **结果**：79 个部件需补全 171278 px，缺失 0。

## 5. 组装（assemble.py，81 个交付层）
1. **切片**：多深度部件的 work 层按切片蒙版（slice-*.png）裁成各深度层。
2. **线条移交 transfers**（3011 px / 125 条）：下层色块中、距上层可见区 ≤2 px（脸、颈 3 px）的参考像素，满足以下任一条件时移交给上层（按上层的参考像素）：
   - 颜色更接近上层边缘色（上层画出的轮廓线落在其色块外）；
   - 是比两侧都暗的遮挡轮廓，且上层自己画得出这种暗度。
3. **自有暗线/亮线 own_lines**（406 px / 31 条）：
   - 只有下层画得出的暗线留在下层，按参考像素。
   - 比两侧都亮的像素（黑发中的红色挑染等）留在下层，按参考像素。
4. **边缘回收 pullbacks**（152 px / 36 条）：同时满足以下条件的像素，在本层设为透明，由下层显示：
   - 位于显示边 2 px 内；
   - 与参考差值 >60；
   - 正下方已补全层与参考差值 <45。
5. **退回 returned**（54 px / 19 条）：移交后成为孤岛（≤20 px，且全为移交像素）的像素，退回原色块归属层。
6. **碎片 fragments**（11 px / 2 条）：大部件色块中脱离本体、≤12 px 且贴着上层轮廓的碎片，归入上层。
7. **无色块归属 unowned**（9 px）：剪影内无任何层携带的参考像素，归入最近 ≤2 px 的显示层（外缘抗锯齿）。
8. **邻件混色小点 specks**（7 px）：显示边上 ≤3 px、亮度偏离本层局部色 >70 的像素，下层在该处已复现参考（<60）时回收，由下层显示。以下情况保留在本层：
   - 遮挡轮廓（比两侧都暗）；
   - 本层高光（比两侧都亮）；
   - 本层自己画得出的暗线（pelvis 对丝袜的轮廓）。
9. **半透明只对背景 opaque_over_lower**（17389 px）：参考的半透明边（发梢）只在下面没有任何层时保留参考 alpha。压在下层补全像素上的显示像素改为不透明，避免透出下层补全。剪影 2 px 抗锯齿带除外。

## 6. 画笔修补（原尺寸实画，非颜色阈值自动填充）

共 99 个画笔文件、19384 px，分 5 类：

| 类型 | 数量 / px | 说明 |
|---|---|---|
| fill（brush.py） | 62 / 7388 | 合成后仍缺的像素，用本部件已画像素延续，归一化高斯从小支撑逐步扩大，并做轻度平滑。主要用于各部件生成边缘的细缝 |
| heal（heal.py） | 31 / 7016 | 隐藏补全中的异物笔触或小点（生成器复制的外部轮廓线、斑点），用同层周围自有像素改画 |
| tone（tone.py） | 4 / 3191 | 频率分离：保留生成细节，把低频色换成本部件可见色的延续，去除色偏 |
| extrude（extrude.py） | 1 / 1267 | arm_left forearm 近肘端，沿肢体轴延续本部件可见截面 |
| outline（outline.py） | 1 / 522 | inner_return_lock 补全边沿续接自身轮廓色 |

heal 中较大或本轮新增的：
- inner_return_lock brush-2：1880 px。
- face_base brush-3：881 px，额头补全中的线状异物。
- leg_right / leg_left brush-3：611 / 459 px，髋部补全中的线状异物。
- arm_right upper_arm brush-2：510 px，即 §3.3 的替代修补。
- main_strand brush-2 / 3 / 4：395 / 584 / 340 px。其中 brush-4（框 [412,198,446,242]，--dark，thr 18）去掉隐藏区中一块形似飘带尾端的暗色圆块。
- side_hair_right brush-2 / 4 / 5：487 / 142 / 135 px。其中 brush-4/5（框 [470,40,515,100]，只处理 ≤10 / ≤6 px 小点）去掉 x478–501、y58–85 隐藏区的斑驳接缝。
- 其余 heal 为各手指、手掌、前臂、颈、躯干、骨盆、脸的 ≤6 px 孤立斑点清理，每个 3–98 px。

tone 4 个：

| 部件 | 画笔 | px |
|---|---|---|
| arm_right little_finger | brush-3 | 419 |
| arm_left thumb | brush-3 | 231 |
| arm_left forearm | brush-2 | 1267 |
| side_hair_right | brush-3 | 1274 |

最后一轮小点扫描（隐藏区偏离局部色 >30、≤3 px 的分量）的候选逐一在原尺寸下看过：
- outer_loop_strand 根尖与下部交会、inward_curl_strand 上段、short_white_ribbon_tail 左缘、arm_right middle_finger 等处，都是本部件自身的发丝线、轮廓或参考暗边，未改。
- short_white_ribbon_tail (416,126) 的暗像素是剪影外缘本件的暗轮廓，下方无其他层，保留。

## 7. 深度穿插与切分

两处均为上游预标注，按 occlusion.json 原有层级实现。本步没有发现新的穿插，没有新增切分，逻辑部件不拆组，groups.json 和 SVG 不需同步。

| 原 ID | 图层名（自下而上） | 区域 | 最终深度 | 原因 | 来源 |
|---|---|---|---|---|---|
| hair/ponytail_right/outer_loop_strand | `010 \| hair/ponytail_right/outer_loop_strand::back`、`015 \| hair/ponytail_right/outer_loop_strand::front` | back = 根端（y≤131 且 x≥388；x388–404、y104–131，309 px）＋主面外缘交会以下 y≥429 的外细弧与细尖（x264–300、y429–554，1454 px）；front = 其余：上部外张细弧、x360–377 y255–280 交会斜带、外侧大弧至 y428（x279–389、y119–428，单连通） | 10 / 15（未改） | 同一外绕束：上部斜交带越过 main_strand(13)，根端和下部连接回到主面后 | 预标注 |
| hair/ponytail_left/outer_loop_lock | `012 \| hair/ponytail_left/outer_loop_lock::back`、`016 \| hair/ponytail_left/outer_loop_lock::front` | back = 扎根伸入端（x655–684、y119–158）＋长开口外岸回返面（x752–796、y292–399）＋回接楔（x751–774、y384–427）＋外细回环与末端（x783–830、y408–564）；front = 上部下行带＋长开口内侧斜下带＋宽前向卷弧与内卷尖（x684–811、y111–505，单连通） | 12 / 16（未改） | 前向斜带和卷弧在 main_lock(14) 与自身回返面前，扎根、回返楔、细回环在主面后 | 预标注 |

各切片层的像素（交付层，含组装移交）：

| 层 | 总 px | 构成 |
|---|---|---|
| 010 | 1763 | 可见 1178、隐藏补全 585 |
| 015 | 2954 | 切片 2942 + 移入 13 − 回收 1 |
| 012 | 4562 | 可见 3260、隐藏补全 1302 |
| 016 | 7704 | 切片 7611 + 移入 100 + 无归属 1 − 回收 8 |

- 两组切片在 KRA 中各自拼合为单连通整体（4717 px、12263 px），每片内部连续，与完整形状一致。
- outer_loop_lock 的前后接缝做过一次细化（reslice.py）：初切沿 (770,364)→(797,404) 直线，漏掉 y364 一行，并在前片留下回返面细条。现已在 y364–392 按原图前向白带自身右轮廓逐行重切，净 134 px 由前片归回后片。复跑幂等（仅 1 px 变动）。
- `occlusion.json` 两行的 note、check.note、check.regions[].note 末尾已追加【raster step01】说明（切分边界、各层像素、连通性、KRA 复核）。校验器（validateOcclusionDocument）通过，sourceHash 与 levels 不变。

## 8. 与色块图的偏差（全部）

| # | 偏差 | 规模 | 说明 |
|---|---|---|---|
| 1 | 预处理色块修正 refinements | 5 处 | 见 §2.1：side_hair_left 183 px、outer_loop_strand 24 px、pelvis 腿口 8679 px、pelvis→leg_left 169 px、pelvis→leg_right 159 px |
| 2 | fringe 归属 | 3589 px | 色块未覆盖的剪影内抗锯齿像素归最近色块 |
| 3 | 无色块归属 unowned | 9 px | 016 1 px (798,406)；017 8 px x368–375、y537–544 |
| 4 | 色块超出参考剪影 | 3349 px | 保持色块形状（隐藏补全外缘），剪影外不显示 |
| 5 | outer_loop_lock 前后接缝重切 | 净 134 px | §7 |
| 6 | 线条移交 transfers | 3011 px / 125 条 | 下层色块中属于上层轮廓线的像素 → 上层，明细见附录 B1。最大几条：face_base→bangs 425、main_strand→inward_curl_strand 242、main_lock→arm_left upper_arm 112、main_lock→016 100、leg_left foot→bow_loop_outer 87 |
| 7 | 自有暗线 / 亮线保留 own_lines | 406 px / 31 条 | 附录 B2 |
| 8 | 边缘回收 pullbacks | 152 px / 36 条 | 附录 B3 |
| 9 | 退回 returned | 54 px / 19 条 | 附录 B4。其中 17→13 的 19 px 含 x431、y220–235 一条 1 px 宽的移交残列（16 px） |
| 10 | 碎片 fragments | 11 px / 2 条 | 附录 B5 |
| 11 | 邻件混色小点 specks | 7 px | 附录 B7 |
| 12 | keep | 76 px | outer_loop_lock 内卷尖只画轮廓，保持参考 |
| 13 | cont / contour_lo | 7291 / 1276 px | 边带中保留参考的本部件延续色和本部件轮廓线（不去边、不改色） |
| 14 | 半透明改不透明 | 17389 px | §5-9 |
| 15 | alpha 不一致 | 197 px | 全部为“多出”（合成 alpha≥128 而参考 <128），没有“缺少”。原因是参考半透明边叠在下层半透明边上，例如 x655–659、y302–320 共 31 px，参考 alpha 约 100，合成约 165 |
| 16 | main_lock 方形淡紫“凸片” | x≈756–775、y≈386–422 | 按色块形状保留；可见，合成与参考一致 |
| 17 | torso 顶部含颈部阴影 | — | 按色块图保留在 torso |
| 18 | 小孤岛 | 极少 | eye_left lower_eyelid 两处 1 px（(595,178)、(593,179)）；side_hair_right 1 px (480,246) RGBA(2,2,2,86)；inner_return_lock 两块（8915 + 510 px，色块形状本身分为多段，被其他部件隔开）；eye_right highlight 两点、eye_right lower_eyelid 三段（原画即分笔） |
| 19 | 粉色半透明像素 | 4 px | x743–745、y363–365，参考原有 |
| 20 | 生成补全 | 隐藏区 171278 px | 全部为生成或画笔实画，不是参考像素 |

## 9. Krita 交付与复核
- **工程**：`step01/character-depth.kra`，md5 `94b16614aa654a9b1e2f45a224588eac`。
- **运行环境**：Krita `Krita（由 --krita 指定）`，版本 5.3.4.1（git bd6e8d0），DISPLAY=:121。
  - 只给 kritarunner 子进程设置隔离的 XDG_CONFIG_HOME / XDG_DATA_HOME / XDG_CACHE_HOME（workspace/kr/）。
  - HOME、登录环境、用户插件和全局 Krita 设置未改。
  - 先用最小操作探测通道（kr/probe-ok.json）确认可用。
- **构建**（kr/run.sh build）：按 layers.json 自下而上创建 81 个 paintlayer，写入像素，保存。order_ok 为真。之后删除了 `.kra~` 备份。
- **复核**（kr/run.sh verify）：重开工程逐层核对，all_ok = True：
  - 81/81 层；
  - 全部 paintlayer、normal、opacity 255、可见、0 子节点；
  - 层名一致；
  - 像素 md5 与 layers/*.png 一致。
- **合成图**：KRA 内 mergedimage.png 与 inspect/composite.png 的最大差值为 1（舍入）。
- **保存时机**：建立 KRA 后及每批实际修改后都已重新保存；本次是最后一批修改后的保存。

## 10. 验收
- **逐层独显**：solo-sheet-0..5 列出全部 81 层。每层都核对了归属：只有本部件的参考可见像素，加本部件的补全及移交来的本部件轮廓线。也隐藏上层核对了补全：
  - 头发各层（马尾宽面、扎根、侧发、刘海、后发头盖黑白分色）补全连续，未复制飘带、手臂、刘海线。
  - 肢体各层（上臂肩内侧、前臂近肘、手掌腕根、手指）圆润完整。
  - 腿（髋部丝袜）、骨盆、躯干、颈、脸（额头平整肤色、圆弧上沿）完整。
  - 鞋与鞋带、发结、发夹完整。
- **整图对照**：composite 与参考在形态、比例、位置、完整度、画风上一致，没有移动或缩放参考。
  - 剪影内平均 RGB 差 1.65。
  - 差值 >60 的像素 2626 个（剪影的 0.77%），其中 97.2% 位于显示层边界 1 px 内。按层：face_base 448、bangs 186、arm_right upper_arm 161、inward_curl_strand 142、main_lock 135、side_hair_left 114、main_strand 94、arm_left upper_arm 84。这些都是抗锯齿边由不同层显示造成的，留给 step02 细修。
  - alpha 不一致 197 px，全部为多出（§8-15）。
  - 以上数字只作定位参考，验收以逐层目视为准，没有依赖 PSNR。
- **接缝**：通过 seam_clean 和 heal / fill 画笔在原尺寸修补。

## 11. 留给 step02 的残留
- 层边界 1 px 的抗锯齿和混色细节：diff>60 的 97% 在此。
- 参考半透明边叠加造成的 alpha 多出：197 px。
- §8-18 所列 1 px 级孤立点：保留参考原有笔触。
- arm_right upper_arm 肩内侧补全来自 v1 加 heal 修补（补画 3 次被审核拒绝），结构完整，明暗略平。
- 少量 1–4 px 的遮挡轮廓归属：例如 arm_right upper_arm 左缘 x411–414、y478–479 的暗线，由线条移交规则判为上臂的遮挡轮廓，合成与参考一致。

## 附录 A：逐部件明细（按深度自下而上）

“形状/可见/隐藏”取自 input-manifest；“生成源”为 compose 实际采用的像素数；“交付像素”为 KRA 各层的非透明像素数。

| 深度 | 部件 ID | 图层 | 形状/可见/隐藏 px | 生成源（使用像素） | 画笔修补（像素） | 交付像素 | 缺失 |
|---|---|---|---|---|---|---|---|
| 10/15 | `hair/ponytail_right/outer_loop_strand` | 010 back<br>015 front | 4705/4080/625 | p1:225, v1:438 | brush-1(fill):61 | 1763+2954 | 0 |
| 11 | `hair/ponytail_left/inner_return_lock` | 011 | 9436/1821/7615 | p2:1448, p1:1114, v1:5219 | brush-1(fill):10; brush-2(heal):1880; brush-3(outline):522 | 9425 | 0 |
| 12/16 | `hair/ponytail_left/outer_loop_lock` | 012 back<br>016 front | 12173/10862/1311 | p2:311, p1:557, v1:391 | brush-1(fill):77 | 4562+7704 | 0 |
| 13 | `hair/ponytail_right/main_strand` | 013 | 30940/13348/17592 | p3:15491, p2:22, p1:180, v2:2564, v1:19 | brush-1(fill):168; brush-2(heal):395; brush-3(heal):584; brush-4(heal):340 | 30962 | 0 |
| 14 | `hair/ponytail_left/main_lock` | 014 | 36008/26994/9014 | p3:1861, p2:12, p1:1600, v2:6188, v1:9 | brush-1(fill):88 | 36055 | 0 |
| 17 | `hair/ponytail_right/inward_curl_strand` | 017 | 21920/20802/1118 | p2:831, p1:146, v1:205 | brush-1(fill):120 | 22157 | 0 |
| 18 | `hair/back_hair` | 018 | 37924/1359/36565 | v1:36767 | brush-1(fill):243 | 37931 | 0 |
| 19 | `neck` | 019 | 3063/519/2544 | p1:1689, v1:979 | brush-1(fill):103; brush-2(heal):12 | 3065 | 0 |
| 20 | `legs/leg_right/leg` | 020 | 59900/47748/12152 | p1:10262, v1:1088 | brush-1(fill):1010; brush-2(heal):11; brush-3(heal):611 | 59900 | 0 |
| 21 | `legs/leg_left/leg` | 021 | 60053/46800/13253 | p2:9494, v1:2305 | brush-1(fill):1698; brush-2(heal):89; brush-3(heal):459 | 60053 | 0 |
| 22 | `arms/arm_right/hand/little_finger` | 022 | 423/4/419 | v1:394 | brush-1(fill):29; brush-2(heal):25; brush-3(tone):419 | 423 | 0 |
| 23 | `arms/arm_right/hand/ring_finger` | 023 | 540/373/167 | v1:152 | brush-1(fill):57; brush-2(heal):12 | 541 | 0 |
| 24 | `arms/arm_right/hand/middle_finger` | 024 | 345/168/177 | v1:120 | brush-1(fill):73; brush-2(heal):20 | 360 | 0 |
| 25 | `arms/arm_right/hand/index_finger` | 025 | 358/233/125 | v1:116 | brush-1(fill):27; brush-2(heal):4 | 370 | 0 |
| 26 | `arms/arm_right/hand/thumb` | 026 | 560/308/252 | v1:240 | brush-1(fill):30; brush-2(heal):16 | 560 | 0 |
| 27 | `arms/arm_right/hand/palm` | 027 | 2558/2172/386 | v1:311 | brush-1(fill):85; brush-2(heal):31 | 2568 | 0 |
| 28 | `arms/arm_right/forearm` | 028 | 7668/6837/831 | v1:844 | brush-1(fill):22; brush-2(heal):12 | 7678 | 0 |
| 29 | `arms/arm_right/upper_arm` | 029 | 10223/8543/1680 | v1:1810 | brush-1(fill):77; brush-2(heal):510; brush-3(heal):61 | 10235 | 0 |
| 30 | `arms/arm_left/hand/little_finger` | 030 | 223/0/223 | v1:216 | brush-1(fill):7; brush-2(heal):20 | 223 | 0 |
| 31 | `arms/arm_left/hand/ring_finger` | 031 | 335/168/167 | v1:233 | brush-1(fill):29; brush-2(heal):18 | 335 | 0 |
| 32 | `arms/arm_left/hand/middle_finger` | 032 | 670/510/160 | v1:140 | brush-1(fill):33 | 696 | 0 |
| 33 | `arms/arm_left/hand/index_finger` | 033 | 337/207/130 | v1:111 | brush-1(fill):26; brush-2(heal):3 | 375 | 0 |
| 34 | `arms/arm_left/hand/thumb` | 034 | 505/274/231 | v1:208 | brush-1(fill):38; brush-2(heal):16; brush-3(tone):231 | 505 | 0 |
| 35 | `arms/arm_left/hand/palm` | 035 | 2474/1845/629 | v1:505 | brush-1(fill):139; brush-2(heal):11 | 2486 | 0 |
| 36 | `arms/arm_left/forearm` | 036 | 8000/6733/1267 | v1:1084 | brush-1(fill):212; brush-2(tone):1267; brush-3(extrude):1267 | 8075 | 0 |
| 37 | `arms/arm_left/upper_arm` | 037 | 10399/8608/1791 | p1:1803, v1:115 | brush-1(fill):87; brush-2(heal):22 | 10554 | 0 |
| 38 | `pelvis` | 038 | 18676/12024/6652 | p1:6713, v1:7 | brush-1(heal):34 | 18744 | 0 |
| 39 | `body/torso` | 039 | 44252/32304/11948 | v1:12084 | brush-1(fill):37; brush-2(heal):77 | 44425 | 0 |
| 40 | `body/breast` | 040 | 11948/11948/0 | —（仅参考可见像素） | — | 12134 | 0 |
| 42 | `face/ear_right` | 042 | 1092/4/1088 | v1:1068 | brush-1(fill):24 | 1092 | 0 |
| 43 | `face/ear_left` | 043 | 1259/13/1246 | v1:1158 | brush-1(fill):101 | 1258 | 0 |
| 44 | `face/face_base` | 044 | 16374/8047/8327 | p1:1950, v1:7724 | brush-1(fill):163; brush-2(heal):98; brush-3(heal):881 | 16428 | 0 |
| 45 | `face/eye_right/sclera` | 045 | 848/215/633 | v1:534 | brush-1(fill):141 | 850 | 0 |
| 46 | `face/eye_left/sclera` | 046 | 860/200/660 | v1:482 | brush-1(fill):231 | 859 | 0 |
| 47 | `face/eye_right/iris` | 047 | 556/515/41 | v1:96 | brush-1(fill):21 | 563 | 0 |
| 48 | `face/eye_left/iris` | 048 | 577/521/56 | v1:111 | brush-1(fill):11 | 586 | 0 |
| 49 | `face/eye_right/highlight` | 049 | 13/13/0 | —（仅参考可见像素） | — | 15 | 0 |
| 50 | `face/eye_left/highlight` | 050 | 39/39/0 | —（仅参考可见像素） | — | 33 | 0 |
| 51 | `face/eye_right/lower_eyelid` | 051 | 28/27/1 | —（仅参考可见像素） | brush-1(fill):2 | 48 | 0 |
| 52 | `face/eye_left/lower_eyelid` | 052 | 14/14/0 | —（仅参考可见像素） | brush-1(fill):1 | 36 | 0 |
| 53 | `face/eye_right/upper_eyelid` | 053 | 214/214/0 | v1:4 | — | 267 | 0 |
| 54 | `face/eye_left/upper_eyelid` | 054 | 258/251/7 | v1:17 | — | 276 | 0 |
| 55 | `face/eye_left/lower_eyelashes` | 055 | 3/3/0 | —（仅参考可见像素） | — | 4 | 0 |
| 56 | `face/eye_right/eyelid_crease` | 056 | 28/28/0 | —（仅参考可见像素） | — | 48 | 0 |
| 57 | `face/eye_left/eyelid_crease` | 057 | 23/23/0 | —（仅参考可见像素） | — | 33 | 0 |
| 58 | `face/eyebrow_right` | 058 | 79/35/44 | v1:22 | brush-1(fill):28 | 88 | 0 |
| 59 | `face/eyebrow_left` | 059 | 74/30/44 | v1:18 | brush-1(fill):32 | 78 | 0 |
| 60 | `face/nose` | 060 | 10/10/0 | —（仅参考可见像素） | — | 7 | 0 |
| 61 | `face/mouth/mouth_interior` | 061 | 379/99/280 | v1:180 | brush-1(fill):163; brush-2(fill):280 | 379 | 0 |
| 62 | `face/mouth/tongue` | 062 | 197/166/31 | v1:7 | brush-1(fill):28 | 207 | 0 |
| 63 | `face/mouth/upper_teeth` | 063 | 33/24/9 | v1:20 | brush-1(fill):3 | 33 | 0 |
| 64 | `face/mouth/lower_teeth` | 064 | 33/0/33 | v1:17 | brush-1(fill):16 | 33 | 0 |
| 65 | `face/mouth/lower_lip` | 065 | 64/54/10 | v1:5 | brush-1(fill):10 | 70 | 0 |
| 66 | `face/mouth/upper_lip` | 066 | 36/36/0 | —（仅参考可见像素） | — | 59 | 0 |
| 67 | `head_accessories/left_hair_bow/white_ribbon_tail` | 067 | 802/566/236 | v1:34 | brush-1(fill):225 | 845 | 0 |
| 68 | `head_accessories/left_hair_bow/long_black_ribbon_tail` | 068 | 1008/602/406 | v1:456 | brush-1(fill):72 | 1044 | 0 |
| 69 | `head_accessories/left_hair_bow/short_black_ribbon_tail` | 069 | 1086/861/225 | v1:189 | brush-1(fill):43 | 1125 | 0 |
| 70 | `head_accessories/left_hair_bow/bow_body` | 070 | 5702/4459/1243 | v1:1301 | brush-1(fill):91 | 5701 | 0 |
| 71 | `head_accessories/right_hair_bow/long_black_ribbon_tail` | 071 | 3318/853/2465 | v1:2300 | brush-1(fill):305 | 3318 | 0 |
| 72 | `head_accessories/right_hair_bow/short_black_ribbon_tail` | 072 | 1495/749/746 | v1:655 | brush-1(fill):136 | 1507 | 0 |
| 73 | `head_accessories/right_hair_bow/short_white_ribbon_tail` | 073 | 1638/856/782 | v1:714 | brush-1(fill):114 | 1660 | 0 |
| 74 | `head_accessories/right_hair_bow/bow_body` | 074 | 6062/4646/1416 | v1:1441 | brush-1(fill):93 | 6089 | 0 |
| 75 | `hair/side_hair_left` | 075 | 10782/5461/5321 | p3:1282, p2:40, p1:516, v2:3510 | brush-1(fill):48 | 10907 | 0 |
| 76 | `hair/side_hair_right` | 076 | 11338/5966/5372 | p3:4079, p2:246, p1:519, v2:565 | brush-1(fill):70; brush-2(heal):487; brush-3(tone):1274; brush-4(heal):142; brush-5(heal):135 | 11471 | 0 |
| 77 | `hair/bangs` | 077 | 14925/14426/499 | v1:674 | — | 15419 | 0 |
| 78 | `head_accessories/cross_hair_clip` | 078 | 273/273/0 | —（仅参考可见像素） | — | 294 | 0 |
| 79 | `head_accessories/heart_hair_clip` | 079 | 272/272/0 | —（仅参考可见像素） | — | 296 | 0 |
| 80 | `legs/leg_right/foot` | 080 | 12112/11191/921 | v1:1215 | brush-1(fill):17 | 12144 | 0 |
| 81 | `legs/leg_left/foot` | 081 | 11875/10863/1012 | v1:1274 | brush-1(fill):142 | 11877 | 0 |
| 82 | `legs/leg_left/ankle_strap/strap_band` | 082 | 861/802/59 | v1:31 | brush-1(fill):45 | 915 | 0 |
| 83 | `legs/leg_left/ankle_strap/rectangular_buckle` | 083 | 256/256/0 | —（仅参考可见像素） | — | 265 | 0 |
| 84 | `legs/leg_right/shoelace_bow/tail_right` | 084 | 96/39/57 | v1:43 | brush-1(fill):22 | 124 | 0 |
| 85 | `legs/leg_right/shoelace_bow/tail_left` | 085 | 98/46/52 | v1:61 | brush-1(fill):3 | 121 | 0 |
| 86 | `legs/leg_right/shoelace_bow/loop_right` | 086 | 542/476/66 | v1:50 | brush-1(fill):22 | 588 | 0 |
| 87 | `legs/leg_right/shoelace_bow/loop_left` | 087 | 524/467/57 | v1:6 | brush-1(fill):53 | 563 | 0 |
| 88 | `legs/leg_left/shoelace_bow/bow_loop_inner` | 088 | 467/433/34 | v1:42 | — | 529 | 0 |
| 89 | `legs/leg_left/shoelace_bow/bow_loop_outer` | 089 | 582/535/47 | v1:7 | brush-1(fill):46 | 667 | 0 |
| 90 | `legs/leg_right/shoelace_bow/knot` | 090 | 116/116/0 | —（仅参考可见像素） | — | 117 | 0 |
| 91 | `legs/leg_left/shoelace_bow/bow_knot` | 091 | 79/79/0 | —（仅参考可见像素） | — | 82 | 0 |


## 附录 B：组装偏差明细（layers/layers.json）

#### B1 线条移交（transfers，下层色块中属于上层轮廓线的参考像素 → 上层）

| 来源层（色块归属） | 接收层 | px | 范围 |
|---|---|---|---|
| 044 | face/face_base | 077 | hair/bangs | 425 | x481–612, y100–162 |
| 013 | hair/ponytail_right/main_strand | 017 | hair/ponytail_right/inward_curl_strand | 237 | x327–431, y132–536 |
| 014 | hair/ponytail_left/main_lock | 037 | arms/arm_left/upper_arm | 112 | x654–665, y305–389 |
| 014 | hair/ponytail_left/main_lock | 016 | hair/ponytail_left/outer_loop_lock::front | 100 | x684–788, y116–505 |
| 081 | legs/leg_left/foot | 089 | legs/leg_left/shoelace_bow/bow_loop_outer | 87 | x593–619, y1243–1277 |
| 037 | arms/arm_left/upper_arm | 040 | body/breast | 68 | x621–631, y339–398 |
| 081 | legs/leg_left/foot | 088 | legs/leg_left/shoelace_bow/bow_loop_inner | 62 | x558–580, y1243–1275 |
| 039 | body/torso | 040 | body/breast | 61 | x465–625, y337–422 |
| 029 | arms/arm_right/upper_arm | 040 | body/breast | 60 | x462–471, y339–392 |
| 044 | face/face_base | 075 | hair/side_hair_left | 58 | x589–609, y168–204 |
| 014 | hair/ponytail_left/main_lock | 036 | arms/arm_left/forearm | 56 | x691–706, y516–583 |
| 074 | head_accessories/right_hair_bow/bow_body | 076 | hair/side_hair_right | 55 | x444–459, y71–142 |
| 029 | arms/arm_right/upper_arm | 039 | body/torso | 52 | x464–481, y274–414 |
| 070 | head_accessories/left_hair_bow/bow_body | 075 | hair/side_hair_left | 52 | x629–644, y72–117 |
| 020 | legs/leg_right/leg | 038 | pelvis | 49 | x451–530, y560–676 |
| 038 | pelvis | 039 | body/torso | 49 | x460–632, y520–559 |
| 071 | head_accessories/right_hair_bow/long_black_ribbon_tail | 076 | hair/side_hair_right | 47 | x445–453, y144–202 |
| 014 | hair/ponytail_left/main_lock | 067 | head_accessories/left_hair_bow/white_ribbon_tail | 45 | x671–675, y137–179 |
| 019 | neck | 039 | body/torso | 45 | x509–582, y242–267 |
| 080 | legs/leg_right/foot | 087 | legs/leg_right/shoelace_bow/loop_left | 45 | x516–534, y1245–1274 |
| 044 | face/face_base | 053 | face/eye_right/upper_eyelid | 44 | x481–524, y149–170 |
| 080 | legs/leg_right/foot | 086 | legs/leg_right/shoelace_bow/loop_right | 44 | x473–496, y1244–1273 |
| 019 | neck | 044 | face/face_base | 39 | x524–569, y233–242 |
| 017 | hair/ponytail_right/inward_curl_strand | 073 | head_accessories/right_hair_bow/short_white_ribbon_tail | 35 | x414–426, y138–190 |
| 031 | arms/arm_left/hand/ring_finger | 033 | arms/arm_left/hand/index_finger | 35 | x711–723, y740–762 |
| 021 | legs/leg_left/leg | 082 | legs/leg_left/ankle_strap/strap_band | 34 | x572–606, y1169–1208 |
| 037 | arms/arm_left/upper_arm | 039 | body/torso | 33 | x613–626, y274–414 |
| 020 | legs/leg_right/leg | 080 | legs/leg_right/foot | 32 | x482–518, y1202–1219 |
| 044 | face/face_base | 076 | hair/side_hair_right | 32 | x480–505, y159–204 |
| 011 | hair/ponytail_left/inner_return_lock | 014 | hair/ponytail_left/main_lock | 31 | x665–717, y390–509 |
| 011 | hair/ponytail_left/inner_return_lock | 037 | arms/arm_left/upper_arm | 31 | x664–683, y392–492 |
| 018 | hair/back_hair | 075 | hair/side_hair_left | 31 | x605–642, y45–208 |
| 080 | legs/leg_right/foot | 084 | legs/leg_right/shoelace_bow/tail_right | 31 | x484–493, y1261–1275 |
| 014 | hair/ponytail_left/main_lock | 069 | head_accessories/left_hair_bow/short_black_ribbon_tail | 29 | x652–664, y179–218 |
| 076 | hair/side_hair_right | 077 | hair/bangs | 29 | x472–475, y96–134 |
| 031 | arms/arm_left/hand/ring_finger | 032 | arms/arm_left/hand/middle_finger | 28 | x713–723, y742–776 |
| 021 | legs/leg_left/leg | 038 | pelvis | 27 | x555–642, y560–681 |
| 018 | hair/back_hair | 077 | hair/bangs | 26 | x531–573, y14–22 |
| 073 | head_accessories/right_hair_bow/short_white_ribbon_tail | 074 | head_accessories/right_hair_bow/bow_body | 25 | x416–437, y123–141 |
| 080 | legs/leg_right/foot | 085 | legs/leg_right/shoelace_bow/tail_left | 23 | x508–517, y1261–1271 |
| 010 | hair/ponytail_right/outer_loop_strand::back | 013 | hair/ponytail_right/main_strand | 22 | x284–394, y105–451 |
| 044 | face/face_base | 056 | face/eye_right/eyelid_crease | 22 | x510–522, y146–151 |
| 081 | legs/leg_left/foot | 082 | legs/leg_left/ankle_strap/strap_band | 22 | x589–617, y1211–1234 |
| 077 | hair/bangs | 078 | head_accessories/cross_hair_clip | 21 | x595–618, y84–109 |
| 014 | hair/ponytail_left/main_lock | 068 | head_accessories/left_hair_bow/long_black_ribbon_tail | 20 | x638–650, y208–232 |
| 018 | hair/back_hair | 044 | face/face_base | 20 | x488–606, y198–232 |
| 077 | hair/bangs | 079 | head_accessories/heart_hair_clip | 20 | x604–618, y113–132 |
| 012 | hair/ponytail_left/outer_loop_lock::back | 014 | hair/ponytail_left/main_lock | 19 | x759–794, y385–562 |
| 048 | face/eye_left/iris | 052 | face/eye_left/lower_eyelid | 19 | x574–588, y177–181 |
| 068 | head_accessories/left_hair_bow/long_black_ribbon_tail | 069 | head_accessories/left_hair_bow/short_black_ribbon_tail | 17 | x645–649, y151–218 |
| 075 | hair/side_hair_left | 077 | hair/bangs | 17 | x585–614, y32–83 |
| 018 | hair/back_hair | 068 | head_accessories/left_hair_bow/long_black_ribbon_tail | 16 | x639–641, y188–204 |
| 023 | arms/arm_right/hand/ring_finger | 024 | arms/arm_right/hand/middle_finger | 15 | x370–377, y745–776 |
| 013 | hair/ponytail_right/main_strand | 029 | arms/arm_right/upper_arm | 14 | x411–433, y322–479 |
| 036 | arms/arm_left/forearm | 037 | arms/arm_left/upper_arm | 14 | x639–682, y488–498 |
| 013 | hair/ponytail_right/main_strand | 015 | hair/ponytail_right/outer_loop_strand::front | 13 | x317–372, y262–346 |
| 024 | arms/arm_right/hand/middle_finger | 025 | arms/arm_right/hand/index_finger | 13 | x373–382, y748–763 |
| 018 | hair/back_hair | 076 | hair/side_hair_right | 11 | x461–520, y19–216 |
| 047 | face/eye_right/iris | 051 | face/eye_right/lower_eyelid | 11 | x503–519, y175–181 |
| 063 | face/mouth/upper_teeth | 066 | face/mouth/upper_lip | 11 | x542–551, y205–207 |
| 028 | arms/arm_right/forearm | 029 | arms/arm_right/upper_arm | 10 | x412–453, y488–496 |
| 035 | arms/arm_left/hand/palm | 036 | arms/arm_left/forearm | 10 | x696–724, y658–679 |
| 044 | face/face_base | 057 | face/eye_left/eyelid_crease | 10 | x569–578, y146–151 |
| 061 | face/mouth/mouth_interior | 062 | face/mouth/tongue | 10 | x538–555, y211–216 |
| 071 | head_accessories/right_hair_bow/long_black_ribbon_tail | 072 | head_accessories/right_hair_bow/short_black_ribbon_tail | 10 | x444–444, y143–152 |
| 021 | legs/leg_left/leg | 083 | legs/leg_left/ankle_strap/rectangular_buckle | 9 | x587–600, y1173–1196 |
| 044 | face/face_base | 051 | face/eye_right/lower_eyelid | 9 | x488–520, y171–182 |
| 044 | face/face_base | 058 | face/eyebrow_right | 9 | x514–516, y121–127 |
| 046 | face/eye_left/sclera | 054 | face/eye_left/upper_eyelid | 8 | x572–601, y154–172 |
| 067 | head_accessories/left_hair_bow/white_ribbon_tail | 069 | head_accessories/left_hair_bow/short_black_ribbon_tail | 8 | x655–659, y145–166 |
| 014 | hair/ponytail_left/main_lock | 018 | hair/back_hair | 7 | x638–640, y202–209 |
| 044 | face/face_base | 048 | face/eye_left/iris | 7 | x571–586, y173–182 |
| 026 | arms/arm_right/hand/thumb | 027 | arms/arm_right/hand/palm | 6 | x382–395, y715–720 |
| 034 | arms/arm_left/hand/thumb | 035 | arms/arm_left/hand/palm | 6 | x699–710, y721–722 |
| 048 | face/eye_left/iris | 054 | face/eye_left/upper_eyelid | 6 | x575–588, y153–156 |
| 017 | hair/ponytail_right/inward_curl_strand | 028 | arms/arm_right/forearm | 5 | x385–405, y509–587 |
| 027 | arms/arm_right/hand/palm | 028 | arms/arm_right/forearm | 5 | x372–395, y664–671 |
| 043 | face/ear_left | 044 | face/face_base | 5 | x607–608, y196–200 |
| 044 | face/face_base | 054 | face/eye_left/upper_eyelid | 5 | x568–602, y147–174 |
| 044 | face/face_base | 066 | face/mouth/upper_lip | 5 | x535–555, y204–213 |
| 061 | face/mouth/mouth_interior | 066 | face/mouth/upper_lip | 5 | x539–555, y207–212 |
| 062 | face/mouth/tongue | 065 | face/mouth/lower_lip | 5 | x537–555, y217–220 |
| 075 | hair/side_hair_left | 079 | head_accessories/heart_hair_clip | 5 | x619–623, y113–127 |
| 032 | arms/arm_left/hand/middle_finger | 035 | arms/arm_left/hand/palm | 4 | x736–737, y731–732 |
| 044 | face/face_base | 045 | face/eye_right/sclera | 4 | x521–524, y159–163 |
| 044 | face/face_base | 047 | face/eye_right/iris | 4 | x511–521, y173–182 |
| 044 | face/face_base | 059 | face/eyebrow_left | 4 | x573–584, y122–127 |
| 047 | face/eye_right/iris | 053 | face/eye_right/upper_eyelid | 4 | x511–519, y154–159 |
| 059 | face/eyebrow_left | 077 | hair/bangs | 4 | x574–585, y123–126 |
| 067 | head_accessories/left_hair_bow/white_ribbon_tail | 070 | head_accessories/left_hair_bow/bow_body | 4 | x657–668, y138–144 |
| 082 | legs/leg_left/ankle_strap/strap_band | 083 | legs/leg_left/ankle_strap/rectangular_buckle | 4 | x578–582, y1171–1181 |
| 011 | hair/ponytail_left/inner_return_lock | 036 | arms/arm_left/forearm | 3 | x685–690, y500–515 |
| 017 | hair/ponytail_right/inward_curl_strand | 072 | head_accessories/right_hair_bow/short_black_ribbon_tail | 3 | x424–426, y193–195 |
| 022 | arms/arm_right/hand/little_finger | 023 | arms/arm_right/hand/ring_finger | 3 | x371–372, y749–753 |
| 023 | arms/arm_right/hand/ring_finger | 027 | arms/arm_right/hand/palm | 3 | x359–361, y736–737 |
| 032 | arms/arm_left/hand/middle_finger | 033 | arms/arm_left/hand/index_finger | 3 | x724–724, y739–741 |
| 043 | face/ear_left | 075 | hair/side_hair_left | 3 | x608–609, y195–199 |
| 044 | face/face_base | 052 | face/eye_left/lower_eyelid | 3 | x585–590, y182–182 |
| 045 | face/eye_right/sclera | 047 | face/eye_right/iris | 3 | x506–521, y163–182 |
| 045 | face/eye_right/sclera | 053 | face/eye_right/upper_eyelid | 3 | x489–503, y154–168 |
| 047 | face/eye_right/iris | 049 | face/eye_right/highlight | 3 | x502–503, y172–176 |
| 058 | face/eyebrow_right | 077 | hair/bangs | 3 | x506–516, y123–125 |
| 065 | face/mouth/lower_lip | 066 | face/mouth/upper_lip | 3 | x556–557, y214–217 |
| 084 | legs/leg_right/shoelace_bow/tail_right | 086 | legs/leg_right/shoelace_bow/loop_right | 3 | x487–489, y1262–1265 |
| 089 | legs/leg_left/shoelace_bow/bow_loop_outer | 091 | legs/leg_left/shoelace_bow/bow_knot | 3 | x592–593, y1250–1253 |
| 016 | hair/ponytail_left/outer_loop_lock::front | 070 | head_accessories/left_hair_bow/bow_body | 2 | x690–690, y114–115 |
| 018 | hair/back_hair | 019 | neck | 2 | x524–524, y243–254 |
| 018 | hair/back_hair | 070 | head_accessories/left_hair_bow/bow_body | 2 | x625–625, y55–56 |
| 021 | legs/leg_left/leg | 081 | legs/leg_left/foot | 2 | x585–611, y1209–1209 |
| 033 | arms/arm_left/hand/index_finger | 035 | arms/arm_left/hand/palm | 2 | x719–723, y729–729 |
| 042 | face/ear_right | 076 | hair/side_hair_right | 2 | x486–486, y196–197 |
| 044 | face/face_base | 046 | face/eye_left/sclera | 2 | x570–600, y162–174 |
| 046 | face/eye_left/sclera | 048 | face/eye_left/iris | 2 | x590–594, y154–165 |
| 051 | face/eye_right/lower_eyelid | 053 | face/eye_right/upper_eyelid | 2 | x489–490, y171–172 |
| 072 | head_accessories/right_hair_bow/short_black_ribbon_tail | 073 | head_accessories/right_hair_bow/short_white_ribbon_tail | 2 | x427–438, y140–191 |
| 072 | head_accessories/right_hair_bow/short_black_ribbon_tail | 074 | head_accessories/right_hair_bow/bow_body | 2 | x440–442, y141–142 |
| 013 | hair/ponytail_right/main_strand | 072 | head_accessories/right_hair_bow/short_black_ribbon_tail | 1 | x432–432, y216–216 |
| 013 | hair/ponytail_right/main_strand | 073 | head_accessories/right_hair_bow/short_white_ribbon_tail | 1 | x416–416, y131–131 |
| 025 | arms/arm_right/hand/index_finger | 027 | arms/arm_right/hand/palm | 1 | x375–375, y725–725 |
| 042 | face/ear_right | 044 | face/face_base | 1 | x487–487, y197–197 |
| 044 | face/face_base | 055 | face/eye_left/lower_eyelashes | 1 | x598–598, y179–179 |
| 044 | face/face_base | 065 | face/mouth/lower_lip | 1 | x552–552, y224–224 |
| 045 | face/eye_right/sclera | 051 | face/eye_right/lower_eyelid | 1 | x491–491, y172–172 |
| 054 | face/eye_left/upper_eyelid | 075 | hair/side_hair_left | 1 | x610–610, y165–165 |
| 080 | legs/leg_right/foot | 090 | legs/leg_right/shoelace_bow/knot | 1 | x497–497, y1256–1256 |

#### B2 下层自有暗线/亮线保留（own_lines，带内比两侧都暗/亮且只有本层画得出的像素，按参考像素留在本层）

| 图层 | px | 范围 |
|---|---|---|
| 010 | hair/ponytail_right/outer_loop_strand::back | 6 | x282–390, y130–484 |
| 011 | hair/ponytail_left/inner_return_lock | 26 | x665–671, y391–434 |
| 013 | hair/ponytail_right/main_strand | 32 | x296–436, y131–498 |
| 014 | hair/ponytail_left/main_lock | 12 | x664–699, y377–545 |
| 015 | hair/ponytail_right/outer_loop_strand::front | 1 | x370–370, y273–273 |
| 017 | hair/ponytail_right/inward_curl_strand | 34 | x396–426, y191–536 |
| 018 | hair/back_hair | 29 | x453–642, y13–219 |
| 019 | neck | 18 | x512–577, y242–266 |
| 021 | legs/leg_left/leg | 3 | x570–573, y1171–1207 |
| 029 | arms/arm_right/upper_arm | 7 | x472–481, y279–334 |
| 031 | arms/arm_left/hand/ring_finger | 10 | x713–714, y767–774 |
| 036 | arms/arm_left/forearm | 1 | x682–682, y490–490 |
| 037 | arms/arm_left/upper_arm | 6 | x614–620, y276–334 |
| 038 | pelvis | 6 | x460–632, y528–535 |
| 039 | body/torso | 9 | x469–624, y407–419 |
| 044 | face/face_base | 12 | x485–613, y155–203 |
| 047 | face/eye_right/iris | 11 | x500–520, y154–178 |
| 048 | face/eye_left/iris | 6 | x573–590, y154–179 |
| 058 | face/eyebrow_right | 2 | x504–505, y125–125 |
| 059 | face/eyebrow_left | 1 | x584–584, y125–125 |
| 061 | face/mouth/mouth_interior | 4 | x537–551, y208–216 |
| 068 | head_accessories/left_hair_bow/long_black_ribbon_tail | 4 | x643–644, y153–171 |
| 070 | head_accessories/left_hair_bow/bow_body | 69 | x635–645, y79–137 |
| 071 | head_accessories/right_hair_bow/long_black_ribbon_tail | 5 | x445–453, y143–201 |
| 072 | head_accessories/right_hair_bow/short_black_ribbon_tail | 20 | x431–443, y141–182 |
| 073 | head_accessories/right_hair_bow/short_white_ribbon_tail | 1 | x418–418, y127–127 |
| 074 | head_accessories/right_hair_bow/bow_body | 2 | x444–444, y127–128 |
| 076 | hair/side_hair_right | 24 | x472–474, y101–117 |
| 080 | legs/leg_right/foot | 21 | x473–536, y1254–1273 |
| 081 | legs/leg_left/foot | 22 | x570–620, y1216–1275 |
| 084 | legs/leg_right/shoelace_bow/tail_right | 2 | x487–488, y1263–1264 |

#### B3 边缘回收（pullbacks，色块边越过画出的边，回收后由下层已补全像素显示）

| 图层 | px | 范围 | 备注 |
|---|---|---|---|
| 089 | legs/leg_left/shoelace_bow/bow_loop_outer | 1 | x615–615, y1274–1274 |  |
| 087 | legs/leg_right/shoelace_bow/loop_left | 6 | x518–528, y1251–1269 |  |
| 086 | legs/leg_right/shoelace_bow/loop_right | 1 | x495–495, y1256–1256 |  |
| 084 | legs/leg_right/shoelace_bow/tail_right | 3 | x486–487, y1267–1273 |  |
| 083 | legs/leg_left/ankle_strap/rectangular_buckle | 3 | x581–582, y1186–1188 |  |
| 079 | head_accessories/heart_hair_clip | 1 | x619–619, y113–113 |  |
| 077 | hair/bangs | 6 | x526–618, y87–150 |  |
| 077 | hair/bangs | 1 | x574–574, y126–126 | 孤立残片 |
| 076 | hair/side_hair_right | 5 | x489–501, y197–201 |  |
| 075 | hair/side_hair_left | 18 | x637–642, y161–200 |  |
| 075 | hair/side_hair_left | 1 | x639–639, y199–199 | 孤立残片 |
| 073 | head_accessories/right_hair_bow/short_white_ribbon_tail | 16 | x431–437, y142–179 |  |
| 070 | head_accessories/left_hair_bow/bow_body | 7 | x626–688, y62–114 |  |
| 069 | head_accessories/left_hair_bow/short_black_ribbon_tail | 8 | x649–649, y191–198 |  |
| 067 | head_accessories/left_hair_bow/white_ribbon_tail | 2 | x672–673, y159–166 |  |
| 060 | face/nose | 3 | x545–547, y190–193 |  |
| 054 | face/eye_left/upper_eyelid | 1 | x603–603, y163–163 |  |
| 050 | face/eye_left/highlight | 6 | x580–584, y156–161 |  |
| 046 | face/eye_left/sclera | 3 | x570–591, y161–179 |  |
| 045 | face/eye_right/sclera | 2 | x490–522, y165–169 |  |
| 044 | face/face_base | 11 | x545–596, y210–241 |  |
| 043 | face/ear_left | 1 | x607–607, y201–201 |  |
| 040 | body/breast | 3 | x472–472, y414–416 |  |
| 039 | body/torso | 2 | x546–629, y243–528 |  |
| 038 | pelvis | 5 | x525–565, y666–678 |  |
| 037 | arms/arm_left/upper_arm | 2 | x662–662, y377–378 |  |
| 036 | arms/arm_left/forearm | 2 | x699–700, y557–562 |  |
| 032 | arms/arm_left/hand/middle_finger | 2 | x724–724, y734–735 |  |
| 029 | arms/arm_right/upper_arm | 12 | x415–432, y338–487 |  |
| 025 | arms/arm_right/hand/index_finger | 1 | x372–372, y745–745 |  |
| 023 | arms/arm_right/hand/ring_finger | 2 | x369–369, y742–743 |  |
| 017 | hair/ponytail_right/inward_curl_strand | 3 | x412–426, y292–363 |  |
| 017 | hair/ponytail_right/inward_curl_strand | 2 | x427–427, y296–297 | 孤立残片 |
| 016 | hair/ponytail_left/outer_loop_lock::front | 8 | x685–774, y117–497 |  |
| 015 | hair/ponytail_right/outer_loop_strand::front | 1 | x320–320, y339–339 |  |
| 014 | hair/ponytail_left/main_lock | 1 | x712–712, y489–489 |  |

#### B4 移交后成孤岛而退回原色块归属的像素（returned，≤20 px 且全为移交像素）

| 原接收层 | 退回到 | px | 范围 |
|---|---|---|---|
| 039 | body/torso | 019 | neck | 3 | x513–568, y254–266 |
| 039 | body/torso | 038 | pelvis | 1 | x631–631, y531–531 |
| 056 | face/eye_right/eyelid_crease | 044 | face/face_base | 2 | x513–515, y150–151 |
| 049 | face/eye_right/highlight | 047 | face/eye_right/iris | 1 | x503–503, y172–172 |
| 051 | face/eye_right/lower_eyelid | 047 | face/eye_right/iris | 1 | x503–503, y179–179 |
| 066 | face/mouth/upper_lip | 065 | face/mouth/lower_lip | 1 | x557–557, y217–217 |
| 077 | hair/bangs | 044 | face/face_base | 1 | x579–579, y115–115 |
| 077 | hair/bangs | 076 | hair/side_hair_right | 1 | x472–472, y106–106 |
| 014 | hair/ponytail_left/main_lock | 011 | hair/ponytail_left/inner_return_lock | 2 | x713–714, y480–483 |
| 017 | hair/ponytail_right/inward_curl_strand | 013 | hair/ponytail_right/main_strand | 19 | x336–431, y220–498 |
| 076 | hair/side_hair_right | 018 | hair/back_hair | 4 | x495–520, y19–31 |
| 076 | hair/side_hair_right | 044 | face/face_base | 3 | x490–491, y201–203 |
| 076 | hair/side_hair_right | 071 | head_accessories/right_hair_bow/long_black_ribbon_tail | 2 | x452–453, y197–202 |
| 069 | head_accessories/left_hair_bow/short_black_ribbon_tail | 068 | head_accessories/left_hair_bow/long_black_ribbon_tail | 7 | x645–645, y153–159 |
| 072 | head_accessories/right_hair_bow/short_black_ribbon_tail | 017 | hair/ponytail_right/inward_curl_strand | 2 | x424–424, y194–195 |
| 083 | legs/leg_left/ankle_strap/rectangular_buckle | 082 | legs/leg_left/ankle_strap/strap_band | 1 | x581–581, y1173–1173 |
| 082 | legs/leg_left/ankle_strap/strap_band | 021 | legs/leg_left/leg | 1 | x572–572, y1187–1187 |
| 082 | legs/leg_left/ankle_strap/strap_band | 081 | legs/leg_left/foot | 1 | x617–617, y1222–1222 |
| 089 | legs/leg_left/shoelace_bow/bow_loop_outer | 081 | legs/leg_left/foot | 1 | x618–618, y1277–1277 |

#### B5 大部件色块在上层轮廓上的碎片（fragments，≤12 px 脱离本体的色块碎片 → 相邻上层）

| 色块归属部件 | 接收层 | px | 范围 |
|---|---|---|---|
| hair/ponytail_left/inner_return_lock | 036 | arms/arm_left/forearm | 3 | x687–687, y506–508 |
| hair/ponytail_left/inner_return_lock | 036 | arms/arm_left/forearm | 8 | x688–690, y510–516 |

#### B6 无色块归属的参考像素（unowned，轮廓外缘抗锯齿 → 最近显示层）

| 接收层 | px | 范围 |
|---|---|---|
| 016 | hair/ponytail_left/outer_loop_lock::front | 1 | x798–798, y406–406 |
| 017 | hair/ponytail_right/inward_curl_strand | 8 | x368–375, y537–544 |

#### B7 显示边上的邻件混色小点（specks，回收后由下层显示）

| 图层 | 改由下层显示 | 像素 |
|---|---|---|
| 077 | hair/bangs | 059 | face/eyebrow_left | (586, 124) |
| 075 | hair/side_hair_left | 054 | face/eye_left/upper_eyelid | (612, 162) |
| 070 | head_accessories/left_hair_bow/bow_body | 018 | hair/back_hair | (631, 72) |
| 070 | head_accessories/left_hair_bow/bow_body | 016 | hair/ponytail_left/outer_loop_lock::front | (688, 112) |
| 038 | pelvis | 021 | legs/leg_left/leg | (565, 673) |
| 038 | pelvis | 020 | legs/leg_right/leg | (532, 677) |
| 038 | pelvis | 021 | legs/leg_left/leg | (562, 677) |
