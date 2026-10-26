结论：需要修复

## 一、 检查概况与方法说明

1. **检查对象与输入核对**：
   - **当前工程**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/clothing-depth.kra`（SHA256 `00b0401c7935a33d1548a66b8e9e983f665d74a9b663e6c6fb21ef11fe5c8186`，只读未修改；画布尺寸 `1254 × 1254` RGBA，共 8 个普通绘画层 `paintlayer`，无透明蒙版、无分组或子节点，全部可见且不透明度为 `255`）。
   - **纯衣服绘画参考**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-part-layering/references/clothing.png`（穿衣穿插辅助参考：`../../part-layering/references/simplified-subject.png`）。
   - **分层结构标准**：`../clothing-part-layering/parts/`、`../clothing-part-layering/groups.json`、`../clothing-part-layering/occlusion.json` 及 `step01/report.md`。
2. **Krita 独立只读检视与分区域放大检查**：
   - 使用 Krita `5.3.4.1 (git bd6e8d0)` 打开 `step01/clothing-depth.kra`，独立导出全部图层叠加投影（`review-01-evidence/krita-full-composite.png`）、8 个图层逐层独显视图（`review-01-evidence/solo/solo-001.png` .. `solo-008.png`）及逐级隐藏上层视图（`review-01-evidence/progressive/prog-001-to-001.png` .. `prog-001-to-008.png`）。
   - 先按 `100%` 原尺寸比对整体造型、比例与色调，再按 `200%–600%` 分区域放大覆盖全部 7 个逻辑部件（8 个绘画层），逐一核查可见区还原度、遮挡补全区连续性、接缝过渡及多深度分片切分质量。

---

## 二、 五项检查范围与衣服专属核查结果

1. **内容完整性**：
   - `008 | chest_bow`、`007 | bodice`、`006 | shoulder_straps/left_shoulder_strap`、`005 | shoulder_straps/right_shoulder_strap`、`004 | skirt/upper_tier`、`003 | skirt/middle_tier` 6 个图层内部绘画内容与遮挡补全完整，无遗漏或错误擦除。
   - **存在问题**：`skirt/lower_tier` 拆分为 `001 | skirt/lower_tier::back`（`level 1`）与 `002 | skirt/lower_tier::front`（`level 2`）时，中央内凹折槽底沿（`x=613..645, y=834..843`）分界切线 `y_cut(x)` 偏高 `3–4px`，将原本属于 `002 | skirt/lower_tier::front` 的正面底边深色描边下半截及右侧整段描边（`x=635..645, y=837..841`）切断剥离并移入 `001 | skirt/lower_tier::back`，造成 `002 | skirt/lower_tier::front` 独显及与双腿插层时底边描边断裂缺口（详见问题 **R1**）。
2. **形体与组合**：
   - 全部图层叠加（`001..008`）时外轮廓与原图一致；但切换至单层独显及前后分片插层检查时，`002 | skirt/lower_tier::front` 与 `001 | skirt/lower_tier::back` 在三处底摆分界处（中央 `x=613..645`、左侧 `x=471..530`、右侧 `x=720..774`）存在垂直切割台阶、未收口硬切侧边及 `1–2px` 残留黑点（详见问题 **R1、R2、R3**）。
3. **画风**：
   - 各衣片可见区与主补全区（抹胸蝴蝶结后方平滑布面、双肩带下端搭接舌片、三层荷叶裙顶部收褶搭接区）色调、纵向褶皱与深棕红描边风格协调一致。
   - **存在问题**：`001 | skirt/lower_tier::back` 向 `y_cut(x)` 上方延伸 `12px` 的隐藏搭接带在采样填充时，于中央分片右侧（`x=638..645`）、左侧回折片两侧（`x=472..476, 527..530`）及右侧回折片左侧（`x=721..724`）采样到了深色描边像素，形成突兀的深棕色与浅粉色纵向串色竖条纹（详见问题 **R1、R2、R3**）。
4. **区域衔接**：
   - `007 | bodice`（`x=590..666, y=415..475` 蝴蝶结遮挡补全区）、`005` / `006` 双肩带底部搭接舌片（`y=413..442`）、`004 | skirt/upper_tier` 顶部搭接区（`y=482..505`）、`003 | skirt/middle_tier` 顶部搭接区（`y=603..627`）及 `002 | skirt/lower_tier::front` 顶部搭接区（`y=708..740`）与各自可见区过渡自然连续（见 `step01/review-01-evidence/zoom-01..04` 及 `zoom-10`）。
   - **存在问题**：`001 | skirt/lower_tier::back` 的三处 `12px` 上延搭接带采用按列常数填色，不仅带入深色描边纵向伪条纹，且在 `y_cut(x)` 附近与下方回折片原有的明暗过渡之间形成横向硬接缝（详见问题 **R1、R2、R3**）。
5. **整体还原度与衣服专属检查**：
   - 7 个逻辑部件职责、前后衣片独立分层、正常开口透明性及不画人体像素的要求均已落实；部件外轮廓与层间 `1px` 亚像素抗锯齿过渡留给第二步处理。当前唯一影响单层完整性与腿部前后插层还原度的问题集中在 `001 | skirt/lower_tier::back` 与 `002 | skirt/lower_tier::front` 的底摆切分边界及搭接带修画上。

---

## 三、 确认需修复的问题清单（R1–R3）

### 标注证据总览
- **整图框选标注图**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-evidence/4c755be0-b471-448a-b984-37047741e72b/marked.png`
- **标注坐标与元数据清单**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-evidence/4c755be0-b471-448a-b984-37047741e72b/regions.json`
- **400%–600% 独显与插层放大检查图**：
  - `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-01-evidence/zoom-05b-lower-tier-hem-split-400x.png`
  - `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-01-evidence/zoom-05c-three-folds-detail-500x.png`
  - `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-01-evidence/zoom-07-center-fold-defect-600x.png`
  - `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-01-evidence/zoom-08-left-right-folds-sandwich-500x.png`
  - `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-01-evidence/zoom-09-hem-vs-legs-400x.png`

---

### 问题 R1：底层裙摆中央内凹折槽底沿切线偏高导致前摆底边描边断裂缺失、后层搭接带出现深色纵向伪条纹

- **相关图层**：`002 | skirt/lower_tier::front`、`001 | skirt/lower_tier::back`
- **具体位置（原画布 `bounds`）**：`[608, 820, 42, 26]`（核心问题区 `x=612..646, y=822..843`）
- **当前表现**：
  1. 在 `002 | skirt/lower_tier::front` 独显时，中央内凹折槽（`x=613..645`）的分界切线 `y_cut(x)` 被设在 `y=834..837`，比原图该处底边深色描边的实际下缘（`y=837..842`）偏高 `3–4px`。这导致 `002 | skirt/lower_tier::front` 在 `x=612->613` 与 `x=645->646` 两侧出现明显的 `3px` 垂直切割台阶，且在 `x=635..645, y=837..841` 处前裙面底边的深色描边被完全剥离缺失，只剩裸露的浅粉色布面下缘（`s2` 底缘像素为 `[221, 156, 161]` 至 `[249, 200, 206]`）。
  2. 在 `001 | skirt/lower_tier::back` 独显时，本属于 `002 | skirt/lower_tier::front` 的前裙底边深色描边下半截残片（`x=613..645, y=835..840`）被错误切入后层，且其 `12px` 上延搭接带右侧（`x=638..645, y=823..837`）因采样到了深色描边与右侧亮粉像素，形成了深棕与浅粉相间的纵向伪条纹。
- **参考依据**：
  - 对照原图 `../../clothing-part-layering/references/clothing.png` 及穿衣辅助参考 `../../part-layering/references/simplified-subject.png`，`x=613..645` 处仅有一条位于双腿内侧前方的正面裙摆底边深色弧线，并无向腿后翻折露出于底边下方的第二层翼片；且上游 `../clothing-part-layering/occlusion.json` 明确规定 `002 | skirt/lower_tier::front`“下界精确止于底摆正面波浪下沿深色描边下缘连续分界线 `y_cut(x)`（完整保留正面波浪下沿深色描边于本层）”。
- **对还原度或完整性的影响**：
  - `002 | skirt/lower_tier::front` 单层底边轮廓在中央折槽处断裂缺边；当与角色双腿（右腿内侧 `x=544..616`、左腿内侧 `x=640..712`）按前后层级叠放或发生轻微相对变形时，大腿内侧会遮挡 `001 | skirt/lower_tier::back`，直接暴露出 `002 | skirt/lower_tier::front` 在 `x=613..616` 与 `x=635..645` 处的描边缺失和 `3–4px` 阶梯缺口（见 `zoom-07-center-fold-defect-600x.png`）。
- **建议修复方向与需保留内容**：
  - **修复方向**：将 `x=613..645, y=834..843` 处的正面底边深色描边及其下缘完整归还至 `002 | skirt/lower_tier::front`，消除 `x=612..613` 与 `x=645..646` 处的垂直切割台阶，确保 `002 | skirt/lower_tier::front` 独显时中央折槽底边深色描边连续完整。对于 `001 | skirt/lower_tier::back` 在该区域（`x=613..645`）：须清除其中被错误切入的前片底边深色描边残片以及 `x=638..645` 的纵向深色伪条纹（若保留后方隐藏搭接片，仅使用干净平滑的中央折槽暗粉底色填充于 `002` 底边描边内侧上方；若移除该处多余分片并仅保留左右两处真实腿后回折翼片，则同步更新 `../clothing-part-layering/occlusion.json` 中的 `bounds` 与区域说明）。
  - **需保留内容**：保留 `002 | skirt/lower_tier::front` 中央折槽原有的纵向明暗色彩与顶部补全区（`y=708..740`），保持 `001` 与 `002` 叠加后与原图底摆的一致性。
- **证据路径**：
  - 标注局部对比：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-evidence/4c755be0-b471-448a-b984-37047741e72b/R1-comparison.png`（及 `R1-current.png`、`R1-reference.png`）
  - 600% 独显与插层对比：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-01-evidence/zoom-07-center-fold-defect-600x.png`

---

### 问题 R2：底层裙摆左侧腿后回折翼片（`x=472..530`）搭接带纵向串色条纹及分界侧缘硬切瑕疵

- **相关图层**：`001 | skirt/lower_tier::back`、`002 | skirt/lower_tier::front`
- **具体位置（原画布 `bounds`）**：`[468, 810, 66, 38]`（核心问题区 `x=471..531, y=812..846`）
- **当前表现**：
  1. 在 `001 | skirt/lower_tier::back` 独显时，左侧回折翼片向 `y_cut(x)` 上方延伸的 `12px` 隐藏搭接带（`y=813..825`）在左缘（`x=472..476`）和右缘（`x=527..530`）采样到了下方斜向折线与侧边深色描边，形成纵向深浅跳变条纹，且在 `y=824..825` 处与下方回折片原有的明暗表面形成横向硬接缝。
  2. 在 `002 | skirt/lower_tier::front` 独显时，左侧切线在 `x=471..472, y=826..840` 处直接从左侧外折裥粉面中间垂直硬切，未顺应 `(472, 840) -> (475, 824)` 的内折边走向自然过渡，且在右端 `x=527, y=825..826` 处残留 `1–2px` 属于后折片右竖边的垂落黑点。
- **参考依据**：
  - 对照原图 `../../clothing-part-layering/references/clothing.png` 及 `../clothing-part-layering/occlusion.json` 中“用不含前摆深色描边的里侧折面纯粉色平滑补绘”的要求，后层隐藏搭接带应与里侧折面自然衔接、无深色描边串色，前层下沿应干净止于正面波浪底边深色描边下缘。
- **对还原度或完整性的影响**：
  - 单层独显或前后裙片随腿部摆动发生相对位移时，`001 | skirt/lower_tier::back` 搭接带两侧的深色竖纹与横向硬接缝，以及 `002 | skirt/lower_tier::front` 在 `x=527` 的残留黑点和 `x=471..472` 的垂直硬切边会露底穿帮。
- **建议修复方向与需保留内容**：
  - **修复方向**：在 `001 | skirt/lower_tier::back` 中将左侧回折翼片上方 `12px` 隐藏搭接带（`x=472..530, y=813..826`）两侧的纵向串色条纹与 `y=824..825` 横向接缝用里侧回折面干净暗粉色（避开折线与外描边采样）平滑修补，并延续右侧深色竖描边自然向上收口；在 `002 | skirt/lower_tier::front` 中清理 `x=527, y=825..826` 残留的 `1–2px` 垂落黑点，并顺畅处理 `x=471..475, y=824..840` 左折角衔接处的切分边缘。
  - **需保留内容**：保留 `001 | skirt/lower_tier::back` 左下回折翼片（`x=472..530, y=824..846`）原有的斜向内折线、里侧深粉阴影与底边描边，保持 `001` 与 `002` 叠合后的完整外观。
- **证据路径**：
  - 标注局部对比：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-evidence/4c755be0-b471-448a-b984-37047741e72b/R2-comparison.png`（及 `R2-current.png`、`R2-reference.png`）
  - 500% 独显对比：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-01-evidence/zoom-08-left-right-folds-sandwich-500x.png`

---

### 问题 R3：底层裙摆右侧腿后回折翼片（`x=721..773`）搭接带左侧深棕竖条纹及前摆交界台阶瑕疵

- **相关图层**：`001 | skirt/lower_tier::back`、`002 | skirt/lower_tier::front`
- **具体位置（原画布 `bounds`）**：`[717, 814, 62, 36]`（核心问题区 `x=720..775, y=815..846`）
- **当前表现**：
  1. 在 `001 | skirt/lower_tier::back` 独显时，右侧回折翼片向 `y_cut(x)` 上方延伸的 `12px` 隐藏搭接带在左侧缘（`x=721..724, y=818..831`）采样到了下方回折翼片左侧的深色竖描边，形成一条宽 `3–4px`、贯穿搭接带全高的深棕色伪竖条纹；同时在 `y=825..833` 处存在按列常数填色与下方回折片折面明暗之间的横向硬接缝。
  2. 在 `002 | skirt/lower_tier::front` 独显时，前摆波浪底边在进入右侧回折口起点 `x=720..722, y=829..832` 处深色描边下缘有 `2px` 阶梯缺口，并在右端 `x=773..774, y=827..842` 处从右侧外折裥粉面中间垂直硬切。
- **参考依据**：
  - 对照原图 `../../clothing-part-layering/references/clothing.png` 及 `../clothing-part-layering/occlusion.json`，`001 | skirt/lower_tier::back` 的隐藏搭接区应为平滑连续的里侧折面纯粉色（左侧外缘可延续干净收边，但不应把描边采样成粗糙的多列棕色条带），`002 | skirt/lower_tier::front` 在 `x=720..725` 的波浪底边描边应平顺连续。
- **对还原度或完整性的影响**：
  - 单层独显或裙摆变形时，`001 | skirt/lower_tier::back` 左侧 `x=721..724` 的粗重深棕竖条纹、横向硬接缝以及 `002 | skirt/lower_tier::front` 在 `x=720..722` 的描边台阶缺口会造成局部质感断层与边缘瑕疵。
- **建议修复方向与需保留内容**：
  - **修复方向**：在 `001 | skirt/lower_tier::back` 中清除 `x=721..724, y=818..831` 处的深棕色伪竖条纹（仅在最左外缘保留干净的侧边收口线，内部统一用里侧回折面干净暗粉色平滑过渡），并柔化 `y=825..833` 处搭接带与可见回折面之间的接缝；在 `002 | skirt/lower_tier::front` 中修平 `x=720..723, y=829..832` 处前摆波浪底边深色描边的 `2px` 阶梯缺口，并顺畅处理 `x=770..774, y=826..842` 右折角衔接处的切分边缘。
  - **需保留内容**：保留 `001 | skirt/lower_tier::back` 右下回折翼片（`x=721..773, y=827..846`）原有的斜向内折线、里侧深粉阴影与底边描边，保持 `001` 与 `002` 叠合后的完整外观。
- **证据路径**：
  - 标注局部对比：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-evidence/4c755be0-b471-448a-b984-37047741e72b/R3-comparison.png`（及 `R3-current.png`、`R3-reference.png`）
  - 500% 独显对比：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review-01-evidence/zoom-08-left-right-folds-sandwich-500x.png`
