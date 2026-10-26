结论：已修复

## 一、 返修综述与交付概览

根据 `step01/review-01.md` 提出的 **R1、R2、R3** 三项反馈，已在当前工程 `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/clothing-depth.kra` 上逐项完成底层裙摆 `skirt/lower_tier` 前后分片层（`001 | skirt/lower_tier::back` 与 `002 | skirt/lower_tier::front`）的切分边界修正、隐藏搭接带无条纹平滑重绘与折角边缘柔化过渡，并保留已验收合格的 `003..008` 六个图层。

- **更新后 KRA 工程**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/clothing-depth.kra`（`1254 × 1254` RGBA，8 个普通绘画层 `paintlayer`，无蒙版、无子节点，全部可见且不透明度为 `255`）。
- **同步更新正式报告**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/report.md`
- **同步更新上游层级表與预览**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-part-layering/occlusion.json`、`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-part-layering/preview.svg`（校验记录见 `step01/upstream-sync.json`）。
- **返修对比与重开导出证据**：
  - R1（中央内凹折槽 600% 独显与腿部插层对比）：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/repair-01/R1-after-600x.png`
  - R2 & R3（左右回折翼片 500% 独显与腿部插层对比）：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/repair-01/R2-R3-after-500x.png`
  - 底摆全宽 400% 分片与叠合检视表：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/repair-01/hem-split-after-400x.png`
  - 重开后整图导出：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/assembly-reopened.png`
  - 原图与重开成果并排对比：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/final-vs-reference.png`
  - 逐级隐藏上层检视表：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/progressive-hide-upper.png`
  - 8 个重开图层原尺寸独显检视表：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/clothing-raster-layering/step01/review/solo-sheet-01.png`（及 `step01/review/layers/001..008-*.png`）

---

## 二、 逐项问题修复结果（R1–R3）

### 1. 问题 R1：底层裙摆中央内凹折槽底沿切线偏高导致前摆底边描边断裂缺失、后层搭接带出现深色纵向伪条纹
- **定位范围**：`[608, 820, 42, 26]`（核心区 `x=612..646, y=822..843`），涉及 `002 | skirt/lower_tier::front` 与 `001 | skirt/lower_tier::back`。
- **原因核实**：对照纯衣服参考 `../../clothing-part-layering/references/clothing.png` 与穿衣辅助参考 `../../part-layering/references/simplified-subject.png`，`x=613..645` 处仅有一条位于双腿内侧前方的正面裙摆底边深色弧线，并无向腿后翻折露出于底边下方的第二层翼片；原切分脚本在 `x=613..645` 设定 `y_cut=834..837`，错误切断了 `002 | skirt/lower_tier::front` 自身的底边深色描边并在 `001 | skirt/lower_tier::back` 中生成了带深色竖纹的多余残片。
- **处理措施**：
  1. 将 `x=613..645, y=834..843` 处的正面底边深色描边及其抗锯齿下缘 100% 完整归还至 `002 | skirt/lower_tier::front`，彻底消除 `x=612->613` 与 `x=645->646` 两侧的 `3px` 垂直切割台阶。
  2. 移除 `001 | skirt/lower_tier::back` 在 `x=613..645` 处被错误切入的前片底边描边残片与纵向伪条纹，仅保留左右两处真实腿后回折翼片，并同步更新上游 `../clothing-part-layering/occlusion.json` 中 `skirt/lower_tier` 的 `bounds`（`[472, 813, 303, 34]`）与区域说明。
- **自检与证据**：600% 放大检查（`step01/review/repair-01/R1-after-600x.png`）确认 `002 | skirt/lower_tier::front` 独显及与双腿前后插层时，中央内凹折槽底边深色描边连续完整、无任何台阶或缺口。

### 2. 问题 R2：底层裙摆左侧腿后回折翼片（`x=472..530`）搭接带纵向串色条纹及分界侧缘硬切瑕疵
- **定位范围**：`[468, 810, 66, 38]`（核心区 `x=471..531, y=812..846`），涉及 `001 | skirt/lower_tier::back` 与 `002 | skirt/lower_tier::front`。
- **处理措施**：
  1. **`001 | skirt/lower_tier::back` 搭接带与接缝修画**：避开左侧斜向内折线（`x=472..478`）与右侧深色外描边（`x=526..529`），仅从里侧回折面平坦内部区（`x=482..523, y=y_dark+3..y_crease-2`）提取纯净暗粉色并经横向高斯平滑，重绘 `y=813..824` 的 `12px` 隐藏搭接带，同时向下跨过 `y_dark+1..y_dark+3` 平滑融合以消除原前片描边抗锯齿暗边与亮边振铃造成的 `y=824..825` 横向硬接缝；右侧外缘（`x=526..529`）延续深棕红竖向描边自然向上收口。
  2. **`002 | skirt/lower_tier::front` 边缘精修**：在右端 `x=526..527` 将切线精确收至 `y=823`，彻底清除 `x=527, y=825..826` 处原本属于后折片右竖边的 `1–2px` 垂落黑点；在中间段 `x=475..525` 对底边深色描边下缘（`y_dark+1`）作去背景混色半透明抗锯齿解算；在左端折角 `x=472..474, y=825..838` 顺应内折边走向作斜向阶梯柔化过渡，消除 `x=471..472` 的垂直硬切边（同时 `001 | skirt/lower_tier::back` 在后方保持完整回折翼片承托，确保叠合无缺口）。
- **自检与证据**：500% 放大检查（`step01/review/repair-01/R2-R3-after-500x.png` 上排）确认 `001 | skirt/lower_tier::back` 搭接带色彩均匀平滑、无纵向串色条纹与横向接缝，`002 | skirt/lower_tier::front` 底边无垂落黑点、左折角过渡自然。

### 3. 问题 R3：底层裙摆右侧腿后回折翼片（`x=721..773`）搭接带左侧深棕竖条纹及前摆交界台阶瑕疵
- **定位范围**：`[717, 814, 62, 36]`（核心区 `x=720..775, y=815..846`），涉及 `001 | skirt/lower_tier::back` 与 `002 | skirt/lower_tier::front`。
- **处理措施**：
  1. **`001 | skirt/lower_tier::back` 搭接带与左缘修画**：清除 `x=721..724, y=818..831` 因采样到左竖描边而形成的宽幅深棕色伪竖条纹，在最左外缘 `x=723`（含 `x=722` 半透明柔边）保留干净的 `1px` 侧边收口线，`x=724..773` 内部统一采用从回折面平坦内部区（`x=727..764`）提取并平滑的纯净里侧暗粉色填充，同时平滑融合 `y=826..835` 交界带以彻底消除横向硬接缝。
  2. **`002 | skirt/lower_tier::front` 边缘精修**：在 `x=720..724, y=829..833` 沿正面波浪底边深色描边下缘逐列平顺衔接（`829 -> 830 -> 831 -> 832 -> 833`），消除 `x=720..722` 的 `2px` 阶梯缺口；在右端折角 `x=772..774, y=827..839` 顺应斜向折边作平滑过渡，消除 `x=773..774` 的垂直硬切边。
- **自检与证据**：500% 放大检查（`step01/review/repair-01/R2-R3-after-500x.png` 下排）确认 `001 | skirt/lower_tier::back` 左侧无粗重深棕竖条纹、无横向接缝，`002 | skirt/lower_tier::front` 波浪底边平顺连续。

---

## 三、 保存重开核验与图层像素清单

通过 `step01/scripts/save_and_reopen_verify.py` 在 Krita 5.3.4.1 中保存 `step01/clothing-depth.kra`，关闭文档后重新打开核验（记录于 `step01/reopen-verification.json` 与 `step01/layer-manifest.json`）：

- **画布尺寸**：`1254 × 1254` RGBA
- **图层数量与结构**：保存前 `8` 层，重开后 `8` 层；`all_paintlayers = true`，`no_masks_or_children = true`，`layer_mismatches = []`。
- **整图投影 SHA256**：保存前与重开后均为 `451d9e6252015a3b9e3539d88abe633c568be7384a6b2cc1694df3cac1cdb8f5`（`projection_identical = true`，`all_8_layers_identical = true`）。

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
