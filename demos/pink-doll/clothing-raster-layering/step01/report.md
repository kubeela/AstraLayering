# pink-doll 衣服绘画与分层报告（step01）

## 1. 交付与验收结论

- **状态**：已完成并通过原尺寸（`1254 × 1254`）逐层独显检查、隐藏上层连续性检查、整图组合比对、上游结构同步校验及 Krita 保存重开一致性核验。
- **最终 KRA 交付**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/clothing-depth.kra`
- **本步报告暂存路径**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/report.md.tmp`
- **检视与对比导出产物**：
  - 最终拼装导出：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/assembly-final.png`
  - 重开后导出：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/assembly-reopened.png`
  - 原图与最终成果并排比对：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/final-vs-reference.png`
  - 隐藏上层逐级检查表：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/progressive-hide-upper.png`
  - 8 个重开绘画层原尺寸独显检视表：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/solo-sheet-01.png` 及 `step01/review/layers/001..008-*.png`
- **画布与图层规格**：`1254 × 1254` RGBA，共 **7 个逻辑衣服部件**，按衣服深度从后到前（`level 1..8`）构建为 **8 个普通绘画层（`paintlayer`）**，无透明蒙版、无分组或子节点，全部可见且不透明度为 `255`。

## 2. 红、黄、绿三色控制图构建与模型生成记录

1. **输入图 1（中性灰遮罩图）与输入图 2（红黄绿控制图）准备**：
   - 直接读取上游 `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-part-layering/groups.json`、`occlusion.json`、`parts/` 及纯衣服参考图 `references/clothing.png`。
   - 为全部 7 个终止 part 主动生成局部等比放大及全画布对应的三色控制图 `control.png`（红色 `#FF0000` = 本片可见主体，黄色 `#FFFF00` = 被上层衣片遮挡需补全的本片搭接区，绿色 `#00FF00` = 不属于本片的外部及正常开口区域）与输入图 `input-gray.png`（将黄色中的遮挡物与绿色外部区域全部清空为中性灰 `#808080`，并在与上层遮挡物交界处内缩 4px 以彻底剥离上层深色描边，仅保留本片纯净可见衣料），完整清单记录于 `step01/input-manifest.json`。
2. **逐片模型生成与提示词调优重生成**：
   - 使用本步骤配置的 `image_generation` 工具对全部 7 个终止 part 执行了透明背景 PNG 生成，共完成 9 次调用（全部成功返回 `1024 × 1024` 透明 PNG，记录于 `step01/generation-records.json`），未发生接口拒绝或失败，绝未使用原图遮挡物像素代替补全。
   - **原尺寸逐张检查与重生记录**：
     - `chest_bow`、`bodice`、`skirt/upper_tier`、`skirt/middle_tier`、`skirt/lower_tier` 的 `v1` 生成结果（`generated-v1.png`）经原尺寸检查合格：红色区域准确保持原画风粉嫩光泽、纵向褶皱与深棕红描边，黄色补全区域（如 `bodice` 在蝴蝶结下方的平滑胸衣布面、三层荷叶裙顶部的向上收拢抽褶搭接区）自然连续，绿色区域完全透明。
     - `shoulder_straps/right_shoulder_strap` 与 `shoulder_straps/left_shoulder_strap` 的 `v1` 生成结果在黄色底部搭接舌片交界处出现了原本属于抹胸上沿的横向伪折线，判为不合格；随即调整提示词明确要求“内侧纵向主肩带条与外侧荷叶边褶皱平滑向下延伸穿过黄色底部搭接区，不画任何横向分界折线”，重新生成 `v2`（`generated-v2.png`），消除了横向折线并通过检查。

## 3. 多深度拆层与上游文件同步记录（区分已有标注与组装新发现）

对照纯衣服参考 `../../clothing-part-layering/references/clothing.png` 与简化穿衣角色辅助参考 `../../part-layering/references/simplified-subject.png` 核实分层结构：上游已标注 `skirt/lower_tier` 存在环绕双腿的多深度需求（`level 1` 与 `level 2`），本次在 Krita 中完成了实际绘画分片层切分与搭接补绘；实际拼装中未发现新的未标注穿插或逻辑部件拆分需求（组装新发现拆层：0 项）。全部拆层与图层映射已同步写回上游 `../clothing-part-layering/occlusion.json` 与 `preview.svg`（见 `step01/structure-changes.json` 与 `step01/upstream-sync.json`）：

| 原逻辑 part ID | 拆层类别（已有标注 / 组装新发现） | 实际 KRA 图层名 | 最终深度 | 区域范围与连续分界 | 拆层原因与搭接处理 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `skirt/lower_tier` | **已有标注**（上游 `occlusion.json` 已标注 `levels: [1, 2]`，并按 `review-01.md` R1–R3 精修分界与搭接） | `001 \| skirt/lower_tier::back`<br>`002 \| skirt/lower_tier::front` | `level 1`<br>`level 2` | **`001 \| skirt/lower_tier::back`**（包围盒 `[472, 813, 303, 34]`）：涵盖底摆开口处向后内侧翻折的左右两处真实里侧回折翼片——画面左下回折翼片（`x=472..529, y=824..846`）与画面右下回折翼片（`x=722..774, y=827..846`），及沿左右回折口正面波浪下沿深色描边下缘连续分界线 `y_cut(x)` 向上延伸 `12px`（左翼 `y=813..824`、右翼 `y=816..833`）的无条纹、无接缝隐藏搭接带。<br>**`002 \| skirt/lower_tier::front`**（包围盒 `[380, 708, 493, 135]`）：涵盖第三层底摆正面宽幅波浪抽褶主衣面（含两腿间中央内凹折槽完整正面底边描边 `x=613..645, y=834..842`）及顶部隐藏搭接区（`y=708..740`），在左右回折口处下界精确止于正面波浪底边深色描边下缘连续分界线 `y_cut(x)`（外侧折角 `x=472..474` 与 `x=772..774` 顺应斜向折边平顺过渡）。 | 第三层底摆下沿开口环绕夹持角色左右大腿，前裙面（含大腿内侧前方的中央内凹折槽底边）在腿前、左右回折翼片在腿后，单张图层无法同时置于双腿前后，且前后片随底层裙摆共同摆动不能拆为独立控制组。因此在 Krita 中拆分为两个普通绘画层，并在 `001` 上缘向 `002` 后方补绘 `12px` 平滑里侧暗粉搭接带（避开斜向折线与侧描边采样并与下方折面无接缝融合），使两层合起来仍为完整连续的同一衣片。 |

## 4. 逐层独显检查、隐藏上层检查与 Krita 修画记录

在 Krita 5.3.4.1 中按色块图逐片配准、叠加纯衣服参考中本片自己的可见像素、清理混入相邻衣片颜色的半透明接缝边缘，并对每个补全区按原尺寸及 400%–600% 放大逐层独显与隐藏上层检查修画（详见 `step01/review/solo-sheet-01.png`、`step01/review/progressive-hide-upper.png` 及 `step01/review/repair-01/`）：

1. **`001 | skirt/lower_tier::back`（`level 1`，底层裙摆腿后回折沿）**：
   - **独显与隐藏上层检查**：左右两处后折翼片（左下 `x=472..529`、右下 `x=722..774`）的里侧深粉阴影、斜向折线与底部描边清晰完整；已按 `review-01.md` R1–R3 移除中央折槽处多余残片，将左右两处向 `y_cut(x)` 上方延伸的 `12px` 隐藏搭接带用纯里侧暗粉平滑重绘并与下方可见回折面无接缝融合，彻底消除了 `x=472..476`、`x=527..530`、`x=721..724` 的纵向串色条纹及 `y_cut(x)` 处的横向硬接缝；当上层 `002 | skirt/lower_tier::front` 叠放其上时，沿 `y_cut(x)` 无缝衔接。
2. **`002 | skirt/lower_tier::front`（`level 2`，底层裙摆腿前主裙面）**：
   - **独显与隐藏上层检查**：正面宽幅荷叶抽褶色彩、明暗折面与底边波浪描边同原图一致；已按 `review-01.md` R1–R3 将中央内凹折槽（`x=613..645, y=834..842`）的正面底边深色描边完整归还本层，消除了 `x=612..613` 与 `x=645..646` 的切割台阶、`x=527, y=825..826` 的垂落黑点、`x=720..722, y=829..832` 的描边阶梯缺口以及 `x=471..474`、`x=772..774` 的垂直硬切边；顶部隐藏搭接区（`y=708..740`）纵向褶皱及深色折线平滑延伸至顶缘并圆润收口，隐藏 `003 | skirt/middle_tier` 时衣料纵向连续自然。
3. **`003 | skirt/middle_tier`（`level 3`，中层裙摆）**：
   - **独显与隐藏上层检查**：可见区抽褶与波浪下沿描边清晰；底部波浪接缝处的半透明边缘已作去混色收边，消除了底层裙摆粉色混入；顶部隐藏搭接区（`y=603..627`）纵向褶皱与明暗条带连续延伸，隐藏 `004 | skirt/upper_tier` 时过渡平滑无断层。
4. **`004 | skirt/upper_tier`（`level 4`，上层裙摆）**：
   - **独显与隐藏上层检查**：可见区高腰抽褶与下沿波浪描边完整，底边半透明像素已去除中层裙摆混色；顶部向抹胸后方延伸的隐藏搭接区（`x=536..719, y=482..505`）与可见区纵向抽褶精准衔接，隐藏 `007 | bodice` 时腰部收褶连续。
5. **`005 | shoulder_straps/right_shoulder_strap`（`level 5`，右侧荷叶边肩带）**：
   - **独显与隐藏上层检查**：基于 `v2` 生成图配准并精修底部插入抹胸后方的隐藏搭接舌片（`y=413..442`），内侧主肩带纵向条带、中缝暗线与外侧荷叶边粉光自然向下延伸，彻底消除了抹胸领口横线残影。
6. **`006 | shoulder_straps/left_shoulder_strap`（`level 6`，左侧荷叶边肩带）**：
   - **独显与隐藏上层检查**：与右侧肩带对称，基于 `v2` 生成图配准并精修底部隐藏搭接区（`y=413..441`），纵向肩带与外侧飞袖荷叶边连续完整，隐藏 `007 | bodice` 时无断层或色差。
7. **`007 | bodice`（`level 7`，高腰抹胸主体）**：
   - **独显与隐藏上层检查**：四周平口领、侧胸弧线与高腰底边描边完整锐利，上下沿接缝半透明边缘已完成去混色处理；前片正中被 `008 | chest_bow` 遮挡的区域（`x=590..666, y=415..475`）已平滑修补为柔和连续的浅粉胸衣受光面，隐藏 `008 | chest_bow` 时胸衣表面干净无蝴蝶结残迹。
8. **`008 | chest_bow`（`level 8`，胸前蝴蝶结）**：
   - **独显与组合检查**：中心结头、左右环翼与两条下垂飘带造型与内部折纹清晰完整，外轮廓半透明边缘已去除底层 `bodice` 混色，直接叠放于 `007 | bodice` 之上。

## 5. 7 个逻辑部件与 8 个 Krita 绘画层完整映射表

| 图层序号与名称 | 深度 (Level) | 逻辑部件 ID | 图层类型 | 子节点数 | 包围盒 [x, y, w, h] | 保存前/重开后像素 SHA256 |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- |
| `001 \| skirt/lower_tier::back` | `1` | `skirt/lower_tier` | `paintlayer` | `0` | `[472, 813, 303, 34]` | `bc5c8e041f8ea0f0...` |
| `002 \| skirt/lower_tier::front` | `2` | `skirt/lower_tier` | `paintlayer` | `0` | `[380, 708, 493, 135]` | `2d72d1d7f06a0f26...` |
| `003 \| skirt/middle_tier` | `3` | `skirt/middle_tier` | `paintlayer` | `0` | `[436, 603, 381, 138]` | `34f60672a2843417...` |
| `004 \| skirt/upper_tier` | `4` | `skirt/upper_tier` | `paintlayer` | `0` | `[482, 482, 289, 146]` | `aa0cdc7e344d62b2...` |
| `005 \| shoulder_straps/right_shoulder_strap` | `5` | `shoulder_straps/right_shoulder_strap` | `paintlayer` | `0` | `[502, 345, 68, 97]` | `ae4b91482eb78ef6...` |
| `006 \| shoulder_straps/left_shoulder_strap` | `6` | `shoulder_straps/left_shoulder_strap` | `paintlayer` | `0` | `[685, 345, 68, 96]` | `abafb5db73f026eb...` |
| `007 \| bodice` | `7` | `bodice` | `paintlayer` | `0` | `[530, 412, 194, 94]` | `c928c1ab17f9a327...` |
| `008 \| chest_bow` | `8` | `chest_bow` | `paintlayer` | `0` | `[590, 415, 76, 61]` | `549e8538a74474f0...` |

## 6. 组合比对、重开核对与偏差记录

1. **Krita 保存与重新打开核对（`step01/reopen-verification.json`）**：
   - 交付文件：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/clothing-depth.kra`（画布尺寸 `1254 × 1254` RGBA）。
   - 图层数量与结构：保存前 `8` 层，关闭后重新打开 `8` 层；全部满足 `all_paintlayers = True`、`no_masks_or_children = True`、`layer_mismatches = []`。
   - 像素一致性：保存前与重开后的整图合成投影 SHA256 均为 `451d9e6252015a3b9e3539d88abe633c568be7384a6b2cc1694df3cac1cdb8f5`（`projection_identical = True`，`all_8_layers_identical = True`）。
2. **整图组合比对与偏差记录（`step01/review/final-vs-reference.png`）**：
   - 对照纯衣服参考 `../../clothing-part-layering/references/clothing.png` 与重开后的 KRA 合成图 `step01/review/assembly-reopened.png`：整体造型、粉嫩色调、荷叶边抽褶走向、蝴蝶结与肩带细节高度还原，无轮廓缺口、无错位、无明显画风差异，也无归属或层级冲突。
   - **细微偏差说明**：部件边界基于上游矢量 SVG 栅格化配准，在整衣外轮廓及部件接缝的 `1px` 抗锯齿半透明边缘处存在微小的亚像素抗锯齿过渡差异（按本步规范，“细微抗锯齿与半透明柔边留给第二步”处理）。
3. **上游文件解析与一致性验证（`step01/upstream-sync.json`）**：
   - `../clothing-part-layering/groups.json`（SHA256 `ad0fc79b61f78c6b9378b95b25786a9e7174b4bf0174b9610a36845901825b0b`）、`../clothing-part-layering/occlusion.json`（sourceHash `b71352b6e16462bbedc05ae0a26a7a341ef3418405013752dac030e722795f32`）及 `../../clothing-part-layering/preview.svg`（mergeSourceHash `6e8be9567ea655ef61f22ff69a71a22efcf35ad366b4ca5fdc7c2e1700e9dc64`）均通过解析与引用完整性校验，7 个终止 part、9 个分组树节点与 8 个 Krita 绘画层完全一致，无未解决问题。
