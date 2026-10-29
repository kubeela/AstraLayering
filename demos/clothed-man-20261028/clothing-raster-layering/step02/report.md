# clothing raster step02 报告：边缘柔化与去锯齿

## 交付

- KRA：`/data/home/lockliu/workspaces/AstraLayering-merged-workspace-deploy-20261026/demos/clothed-man-20261028/clothing-raster-layering/step02/clothing-soft-edges.kra`
  - 由 step01 的 `clothing-depth.kra` 复制为工作文件 `workspace/clothing-soft-edges-work.kra`，在 Krita 中局部修改后保存，再整份复制到交付路径；`cmp` 确认两份字节相同。
  - 画布 1024×1536，RGBA 8 位，sRGB-elle-V2-srgbtrc。
  - 根节点下仍是 14 个普通绘画层，全部可见、不透明度 255、混合模式 normal，没有子节点、蒙版、剪贴或分组。step01 本来就没有这些原生结构，所以没有需要保留或丢失的。
  - 图层顺序、名称、UUID 与 step01 完全一致（10 → 160）。没有新增、合并或拆分图层。
- step01 的 `clothing-depth.kra`（06:37 写入）和 `report.md` 未改动。
- 上游 `groups.json`、`occlusion.json`、`parts/` 未改动，不需要调用 `edit_groups` / `edit_occlusion`。
- 证据：`step02/evidence/`（索引见文末）。
- 工作目录 `workspace/` 里的 `clothing-soft-edges-work.kra~` 是 Krita 自动备份，不是交付物。

## 输入使用

| 输入 | 用途 |
|---|---|
| `step01/clothing-depth.kra` | 被修改的对象。轮廓、比例、名称、归属、层序都以它为准 |
| `../../clothing-part-layering/references/clothing.png` | 纯衣服参考。过渡宽度、衣料/包边/褶线的粗细和深浅都以它为准；`locate_pixel_differences` 的参照也是它 |
| `clothing-part-layering/groups.json` | 归属：shorts / t_shirt 两组，6 个 part；逐层核对前后片仍各自独立 |
| `clothing-part-layering/occlusion.json` | 14 个深度区域，沿用 step01 的切片，本步不改 |
| `../../part-layering/references/simplified-subject.png` | 只用来判断穿插（颈部从圆领穿入、上臂从袖口出来、腿在筒内），没有取任何像素 |

没有粘贴任何原图像素；所有改动都是 Krita 笔刷、选区清除或像素画笔在 KRA 内完成。脚本只负责算位置和驱动笔刷。

## 方法

### 判断与分类

1. 对每层，用 `locate_pixel_differences` 的候选框作入口，对照参考核实，再把检查扩展到全部 14 层。
2. 对每层的外缘（alpha ≥ 128 的外圈 2 px 带）逐点分类：
   - **hid**：被上层覆盖率 ≥ 0.97，即最终不可见的切缝或搭接边。
   - **vis**：可见，且与下层合成的颜色差 ≤ 24。过渡可以放心做宽。
   - **mid**：颜色差 24–125，过渡宽度按差值收窄（`shift/差值`），保证合成颜色偏移不超过 10 级。
   - **skip**：颜色差 > 125，通常是深色包边、褶线与浅色衣料的重合边。保持硬边，不动，以免削弱包边的粗细和深浅。
3. 过渡宽度由所在位置的分类和颜色差决定，不做统一羽化。

### 实际改动手段

| 步骤 | 手段 | 说明 |
|---|---|---|
| r2 | Krita `b) Airbrush Soft`，尺寸 3，erase 混合，沿轮廓（marching squares，σ=2 平滑）逐段下笔 | 按分类取不透明度：hid 0.3；vis 不超过 0.3；mid 0.15；`shift=10` |
| x1r | Krita `u) Pixel Art` 尺寸 1，在下层补出被上层切缝压住的几像素 | 上层 alpha 被软化后，互补切片之间不会露缝。补出的像素全部在上层之下 |
| c3r | 覆盖率抗锯齿选区 + `Clear`（Krita `Selection.setPixelData` 灰度选区，`clear` 动作把 alpha 乘以 `1−sel/255`，RGB 不变） | 参数：`sigma 5, dmax 0.8, inset 0.2, smax 0.7, shift 10, budget 14, d_hi 125, minlen 8`；10/20/30/70/80 设 `hidden_only`；带孔洞 / 碎点 / 孤点保护 |
| 孔洞和针孔 | `u) Pixel Art` 尺寸 1 逐像素补 | step01 里有 4 个封闭针孔（140 三处、160 一处），已补；40 层一个 1 px 孔（358,552）用 [60,108,167] 补 |
| f1 | 70 层一个孤立像素擦除 | |
| f2 | 70 层 36 px 斑点用选区清除 | 软化后残留的离散点 |
| f3 | 80 层一处钩状残留清除 | |
| f4 | 10/20/30/60 层隐藏延伸产生的孤立碎点清除 | 都在上层之下，合成变化 ≤ 1 级、10 px |
| f5 | 30 层 5 个像素（674–675, 815–817）恢复为 step01 的包边色 | x1r 把这 5 px 误涂成偏亮色，只在单层视图可见，合成不变 |

所有改动都是边缘过渡带内 0.x–2 px 的局部微调，没有整层模糊、全局羽化或阈值批处理；二次笔刷叠加会破坏边缘，没有采用。

## 逐层记录

“锯齿像素”指 alpha ≥ 230 且 4 邻域里有 alpha ≤ 25 的像素，即 1 px 二值 alpha 台阶；`metrics.py` 统计，step01 → step02。

“alpha 变化”是与 step01 比 alpha 值不同的像素数；“新增”是 step01 alpha=0、现在 alpha>0 的像素（隐藏延伸）。

| 图层 | 问题（step01） | 修复 | 锯齿像素 | alpha 变化 / 新增 | 剩余与说明 |
|---|---|---|---|---|---|
| 10 right_pant_leg::back_return | 隐藏续料条外缘 1 px 二值台阶 | `hidden_only` 覆盖率抗锯齿；f4 清掉隐藏延伸碎点 | 459 → 29 | 1109 / 0 | 5 px 轮廓色微调（最大 ΔRGB 18），不可见 |
| 20 left_pant_leg::back_return | 同上 | 同上；r2/x1r | 448 → 31 | 1147 / 1 | 3 px 轮廓色微调（最大 ΔRGB 20） |
| 30 waist_crotch::side_back_return | 两侧后返续料条外缘 1 px 台阶 | 同上；f5 恢复 5 px 包边色 | 263 → 23 | 874 / 2 | 4 px 轮廓色微调（最大 ΔRGB 16） |
| 40 right_sleeve::inner_cuff | 内侧口沿外缘台阶，1 px 孔，游离点 | r2/c3r；x1r 隐藏延伸；补孔 | 61 → 21 | 223 / 9 | 游离点 3 → 1，微小块 1 → 0；剩 1 个与参考一致的 AA 尾点 |
| 50 left_sleeve::inner_cuff | 同上 | 同上 | 52 → 20 | 125 / 8 | 剩 1 个与参考一致的 AA 尾点 |
| 60 body::back_collar | 后领外缘台阶 | r2/c3r；x1r；f4 清隐藏碎点 | 98 → 30 | 507 / 10 | |
| 70 right_pant_leg::front_overlap | 补全带和内裆舌的长斜边台阶，1 个孤立像素 | `hidden_only` c3r；f1/f2 去孤点、斑点 | 361 → 16 | 854 / 0 | 单层看斜边仍有块状步进，是软化后宽度极窄的隐藏边；合成没有 |
| 80 left_pant_leg::front_overlap | 同上，另外有钩状残留 | c3r；x1r 延伸；f3 清钩 | 394 → 78 | 973 / 355 | 355 个新增像素是隐藏延伸，形成 AA 过渡，其中 242 个完全在不透明上层之下 |
| 110 right_pant_leg::front | 外缘与裤口折边 1 px 台阶 | r2/c3r（vis/mid 段） | 273 → 65 | 354 / 0 | skip 类重合切边保持硬边 |
| 120 left_pant_leg::front | 同上 | 同上 | 266 → 96 | 209 / 0 | 同上；6 个与参考一致的 AA 尾点 |
| 130 waist_crotch::front | 腰带、侧缘外缘台阶 | r2/c3r | 456 → 16 | 1242 / 0 | 包边和褶线的粗细、深浅没有改 |
| 140 left_sleeve::outer | 袖外缘 1 px 台阶；3 个封闭针孔 | r2/c3r；补针孔 | 281 → 41 | 521 / 4 | 针孔 3 → 0；剩 1 个游离点和 1 个微小块（与参考一致） |
| 150 right_sleeve::outer | 同上 | r2/c3r | 237 → 18 | 616 / 0 | 16 个与参考一致的 AA 尾点 |
| 160 body::front | 领口、肩缘、袖笼、下摆外缘台阶；1 个封闭针孔 | r2/c3r；补针孔 | 946 → 241 | 1474 / 1 | 下摆与领口的 skip 类硬边仍在；14 个与参考一致的 AA 尾点 |
| 合计 | | | 4595 → 725（−84%） | | |

> 注：110/120/130/140 的“与 step01 逐像素相同”统计里，另有一批像素 RGB 不同，这些全部是 alpha=0 的像素（Krita 保存时把完全透明像素的 RGB 清零），不可见，不算改动。alpha ≥ 128 且 RGB 变化的像素只有 10/20/30 三层的 5 / 3 / 4 个。

### 前后片和归属

- 逐层核对：10/70/110 属右腿，20/80/120 属左腿，30/130 属腰裆，40/150 属右袖，50/140 属左袖，60/160 属衣身，与 `groups.json` 的 6 个 part 和 `occlusion.json` 的深度区域一致。
- 前后片仍是各自独立的图层，没有合并，也没有把任何一块画成整体。
- 没有闭合正常开口（领口、袖口、裤口）、没有补身体、没有擦除真实的内侧衣料；10/20/30/40/50/60 的隐藏延伸只在上层之下，solo 视图能看到，合成不变。

## 合成与整体指标

| 指标 | step01 | step02 |
|---|---|---|
| 锯齿像素合计 | 4595 | 725 |
| 合成 vs 参考，step01 `verify.py` 口径：最大 premult 差 | 6.09 | 19.88 |
| 同上，>8 的像素数 | 0 | 319 |
| 同上，>4 的像素数 | 99 | 1152 |
| 同上，平均 | 1.0956 | 1.1182 |
| 同上，`metrics.py` 口径（rounded 合成）最大 / 平均 | 10.00 / 0.323 | 19.54 / 0.327 |
| 同上，`metrics.py` >4 / >8 / >16 | 960 / 20 / 0 | 1850 / 338 / 2 |
| 合成 alpha vs 参考 | — | 最差 ±8，没有 <−8 或 >8 |
| 合成中参考不透明但合成 alpha<250 的像素 | — | 1 个（511,1037），alpha 249 对 253 |
| 封闭孔洞（每层） | 140:3、160:1 | 全部 0 |

- 合成偏离参考主要在边缘的 AA 过渡带：软化后外缘 alpha 变成斜坡，合成颜色在 319 个像素上偏离参考超过 8 级，最大 19.88，其中 2 个超过 16。这是柔化的直接代价，没有再放宽。
- `verify.py`（step01 的校验脚本）结果：`visible_missing` 全 0，`outside_shape_px` 与 `exterior_nonzero_px` 全 0，`visible_rgb_mismatch` 只有 body 1 个、left_sleeve 2 个。
- `interior_gap_px`（body 105，left_sleeve 3，right_pant_leg 64，left_pant_leg 71，waist_crotch 57）是被相邻层盖住的切边像素 alpha 降低，合成没有洞，不是缺口。

## 验证

### 重开验证

保存后在 Krita 里重新打开交付的 KRA 并导出：

- 14 层，顺序、名称、UUID、可见性、不透明度、混合模式、alphaLocked、子节点数与 step01 完全相同；颜色空间 RGBA / U8 / sRGB-elle-V2-srgbtrc。
- `maindoc.xml` 里没有 mask、clone、group 节点。
- 14 层像素与最后一次导出（`exp_f5`）逐像素相同；合成投影相同。

### 逐层检查

- **单层（solo）**：每一层在灰底上放大到 200–1600% 看外缘（证据：`solo_layers.png`、`zoom_*.png`）。
- **上层隐藏**：按深度累计到各层再隐藏更上层，看补全缝（证据：`cumulative_upper_hidden.png`、`stack_upto_*.png`）。
- **全合成**：100% 与 200–400% 对照参考（证据：`composite_vs_reference.png`、`zoom_*.png`）。
- **针孔和补孔**：`zoom_pinholes.png`，三排依次为 step01 / step02 / 参考，16 倍。

### `locate_pixel_differences`

| 运行 | 对象 | 阈值 | 结果 |
|---|---|---|---|
| step01 整图 | exp0 合成 vs 参考 | 默认 | 0 个区域 |
| step01 整图，敏感 | 同上 | color 10、coarse 5、alpha 8、min 3 | extra 67 px / 8 个区域 |
| step02 整图 | 最终合成 vs 参考 | 默认 | 0 个区域 |
| step02 整图，敏感 | 同上 | color 10、coarse 5、alpha 8、min 3 | extra 8 px，color 161 px，共 18 个区域 |
| step02 逐部件 | 14 个 `clothing:` 部件（用 `.ora` 展开） | color 14、coarse 8、min 4 | 2 个区域，各 4 px：[662,818,8,3]、[564,841,4,1]（下摆接合处） |

敏感运行的 18 个区域是 AA 过渡带上 10–20 级的颜色偏差，分布在 160 下摆（y 828–844）、袖子接合处 (661,509)、(352,424)、(750,510)、(367,515)、领口 (465,331)，以及两腿之间 x≈511 的竖缝（y 961–998）。我放大看了最大的两个（`residual_sensitive_*.png`）：位置和形状与参考一致，只有边缘明暗的细微差别；其余区域按位置和大小判断属于同一类，未逐个放大。

## 未解决与局限

1. **硬边仍在**：skip 类（与下层颜色差 > 125 的包边、褶线重合边）保持硬边，所以单层视图里 160 的下摆缘与领口内缘、110/130/140/150 的部分重合边、80/120/160 的残余台阶还在（80:78、120:96、160:241、110:65）。合成视图里这些位置看起来是平滑的。
2. **合成偏离参考**：见上，319 px 超过 8 级，最大 19.88。如果后续要求合成严格不超过 8，需要缩小 `shift` 或放弃部分 mid 类柔化。
3. **刻意保留的 AA 尾点**：40:1、50:1、120:6、140:1（另有 1 个微小块）、150:16、160:14 个游离低 alpha 点，与参考里的抗锯齿尾点完全一致，没有当成杂点清除。
4. **笔刷擦除量**：Krita 笔刷擦除的实际量是标称的约 1.2–1.5 倍，所以 r2 步骤的像素偏移略大于预设值；c3r 选区清除是精确的。
5. **轮廓色微调**：10/20/30 共 12 个 alpha ≥ 128 的像素 RGB 有变化（最大 ΔRGB 20），是 x1r 延伸笔刷把边缘像素吸附成包边色 [30,37,56]（原为稍浅的过渡色）的结果。逐个核对过，这 12 个像素的合成 RGB 不变，合成 alpha 最多差 2。
6. **没做的事**：没有做身体装配或动画检查，没有改 `run.json` 等运行状态文件，也没有推进后续步骤。

## 证据索引（`step02/evidence/`）

| 文件 | 内容 |
|---|---|
| `composite_vs_reference.png` | 参考 / step01 合成 / step02 合成 / 两者对参考的差异图（×16） |
| `solo_layers.png` | 14 层单层视图 |
| `cumulative_upper_hidden.png` | 逐层累计（上层隐藏）视图 |
| `stack_upto_120_waist_hidden.png`、`stack_upto_130_shirt_hidden.png`、`stack_upto_150_body_hidden.png` | 腰裆 / 上衣隐藏后的补全缝检查 |
| `zoom_80_120_waist_diagonal.png`、`zoom_front_overlap_70_80.png`、`zoom_legs_110_120.png`、`zoom_waist_130.png` | 短裤各层 before / after 放大 |
| `zoom_back_return_10_20_30.png` | 后返续料 before / after |
| `zoom_cuffs_40_50.png`、`zoom_sleeves_140_150.png` | 袖口、袖子 before / after |
| `zoom_160_front_collar.png`、`zoom_160_hem_and_shoulder.png` | 衣身领口、下摆、肩部 before / after |
| `zoom_pinholes.png` | 4 个针孔补孔前后与参考 |
| `residual_sensitive_661_509_reference_vs_step02.png`、`residual_sensitive_352_424_reference_vs_step02.png` | 敏感阈值下最大的两个残余候选框，左参考右 step02，12 倍 |
| `locate_tool/step01_full_default`、`step01_full_sensitive` | step01 的整图差异候选 |
| `locate_tool/step02_full_default`、`step02_full_sensitive`、`step02_parts_14layers` | step02 的整图与逐部件差异候选（含 comparison、heatmap、marked、scope） |
| `verify_step01.json`、`verify_step02.json` | step01 `verify.py` 对两版的输出 |
