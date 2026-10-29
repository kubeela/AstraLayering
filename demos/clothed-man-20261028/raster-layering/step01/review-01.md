结论：通过

# 第一步（character-depth.kra）独立视觉 review

## 1. 检查对象与方法

- 交付物：`character-depth.kra`，1024×1536，54 个绘画层、3 个组、3 个透明度蒙版。sha256 与 `review-baseline.json` 一致，检查全程只读，未保存回原文件。
- 对照参考：`../../part-layering/references/base-subject.png`，同时参考 `part-layering/parts/`、`groups.json`、`occlusion.json` 与第一步 `report.md`。目前没有更早的 review/repair 报告。
- 在 Krita 5.3.4.1 中打开 KRA 的副本，做了下列检查：
  - 54 层逐层单层（solo）导出，在纯绿底上看形状、补全区和接缝。
  - 全图合成（蒙版开）与参考在灰底上做 alpha 合成后逐像素比较；不移动、不缩放参考。
  - 蒙版开 / 关对比（3 个蒙版）。
  - 隐藏上层：隐藏头发、眉、眼、口，看 face_base 与耳；隐藏头部以上的层，看颈与肩；隐藏 20 号及以上层，看腿、脚、手；隐藏 24 号及以上层，看上臂。
  - 2–12 倍局部放大（眼、口、耳、手指、脚趾、肩、发梢、肢体轮廓）。

## 2. 五项检查结论

| 检查项 | 结果 | 依据 |
|---|---|---|
| 内容完整性 | 通过 | 54 个部件层俱全。头发（含 side_hair 的 `[root]`/`[main]` 两片）、face_base、双耳、颈、躯干、骨盆、双腿与脚、双臂、双掌与五指、双眼各层、口各层、鼻、双眉都有完整内容。被遮挡处（额头、眼窝、口腔、耳后、颈、腿根、掌后指根、拇指根、上臂肩部）都已补全，没有空洞或截断。 |
| 形状、比例、构图 | 通过 | 合成与参考在同一画布上位置、比例、姿态一致，没有移位或缩放。合成相对参考 diff>80 的像素仅 734 px，全部是肢体轮廓边缘；内部 diff>30 只有约 195 px 的睫毛、边缘细点。左右对称的部件（双腿、双脚、双手、双眼）补全风格一致。 |
| 风格 | 通过 | 补全区的色调、明暗、线条粗细与可见部分连贯，没有 AI 补全常见的风格漂移、过饱和或异物。眼、口、手指的补全与可见部分同一画风。 |
| 补全区与可见区接缝 | 通过 | 隐藏上层后看各补全区，颜色与纹理在接缝处连续，没有明显色差或硬边。face_base 额头、耳后、颈、腿根、上臂肩部的补全边界都被上层遮住，默认姿态下看不到。 |
| 总体还原度 | 通过 | 100% 并排看全图，合成与参考无法区分。眼（含高光）、口（含牙、舌、唇）、手指、脚趾、发丝层次都与参考一致。 |

另外确认：
- 外观相关归属正确：做过异色扫描，头发与皮肤层之间没有明显的归属互串；没有看到把参考像素当作归属依据去改部件归属的痕迹。
- 蒙版：开 / 关两种状态仅有 99 px 差异，都在眼、口开口边缘一圈，说明补全内容藏在睑、唇之后，开口边缘由蒙版裁切。蒙版开启后的开口形状与参考一致。
- 同一逻辑部件的多片（`51/52 side_hair_*  [main]` 与 `01/02 side_hair_*_root`）是合法的分深度切片，没有要求合并。
- `52 side_hair_left [main]` 外缘下端看起来平直的切口，实际由 `03 back_hair` 在该处承接（(622,208)、(620,200) 处只有 03 有像素），合成后与参考的发梢一致，不是缺陷。

## 3. 已确认的必须修复问题

无。

没有发现影响还原度或完成度、必须在本步骤返修的问题，因此没有调用框选工具生成问题区域。

## 4. 留给第二步的观察（不是本步缺陷，仅供第二步收边参考）

以下几项都属于本阶段明确不要求的轮廓/边缘收边、半透明过渡和细小瑕疵，`report.md` 第 8 节也已列出。写在这里是为了让第二步有定位依据，不作为本步返修项。

1. **肢体外轮廓偏细、偏浅。** 合成的 alpha 在 SVG 剪影处二值切断，参考里外缘一圈半透明（alpha 约 126–142）的深褐描边像素没有保留，导致手臂、腿、脚的外轮廓约少 1 px，局部呈虚线感。例：
   - 画面右侧手臂外缘 x≈650–700、y≈408–660；
   - 腿内缘 x≈491–502、y≈827–1078；
   - 脚趾下缘、右脚外缘。
   证据：[手臂外缘](review01_assets/z_o1.png)、[腿内缘](review01_assets/z_o2.png)、[手臂另一段](review01_assets/z_o3.png)、[双脚](review01_assets/z_feet.png)（均为左参考 / 右当前）。
2. **轮廓细缝（参考 alpha≥200 而合成 alpha<128）共 301 px / 104 处。** 较大的两处：
   - 前臂外缘 x376–384、y644–666（约 22 行深褐描边缺失，露出浅色阶梯边）：[证据](review01_assets/z_gap1.png)；
   - 腋下/泳衣侧缝 x610–613、y499–515（约 4×16 px 的透明小缺口）：[证据](review01_assets/z_gap2.png)。
3. **face_base 与耳上的残留线圈和发缘细线**：眼窝、口周的圈线，刘海边缘的深色细线（约 359 px 暗像素、96 处，最大一处 x531–540、y126–171）。默认姿态下全被上层遮住，只在眼睑、刘海错位（如眨眼、刘海动作）时才会露出。证据：[隐藏头发/眉/眼/口](review01_assets/hide_A_crop.png)、[face_base 与耳](review01_assets/hide_B_crop.png)。
4. **眼白上的虹膜外圈、虹膜上的高光圈残影、上臂肩带线、腿上泳衣下摆线、发梢的棕粉色细点。** 均为 1 px 级别，证据见 [左眼各层](review01_assets/eyeL_layers.png)、[隐藏上臂以上](review01_assets/hide_D_shoulders.png)、[隐藏 20 号以上](review01_assets/hide_CD.png)。

## 5. 证据文件（均在 `review01_assets/`）

整体与对照：
- [全图参考 | 当前](review01_assets/full_side.png)
- [头部参考 | 当前](review01_assets/head_side.png)
- [双眼参考 | 当前](review01_assets/z_eyes_both.png)
- [diff 图](review01_assets/diff.png)（差异放大 3 倍；只有肢体轮廓线有亮点）

状态测试：
- [蒙版关 | 开（眼、口）](review01_assets/masks_off_vs_on.png)
- [隐藏头发/眉/眼/口](review01_assets/hide_A_crop.png)
- [隐藏 30 号及以上，只留 face_base、耳、后发等下层](review01_assets/hide_B_crop.png)
- [参考 | 隐藏 20 号以上 | 隐藏 24 号以上](review01_assets/hide_CD.png)
- [肩部：当前 / 隐藏 24 号以上](review01_assets/hide_D_shoulders.png)

单层：
- 头发：[hair_solo](review01_assets/hair_solo.png)、[刘海与两片侧发](review01_assets/hair_top.png)、[52 外缘](review01_assets/z_52_cut.png)
- 脸：[face_solo](review01_assets/face_solo.png)、[眉与鼻](review01_assets/brows_nose.png)、[右眼各层](review01_assets/z_eyeR_layers.png)、[左眼各层](review01_assets/eyeL_layers.png)、[口各层](review01_assets/z_mouth_layers.png)
- 身体：[torso](review01_assets/torso.png)、[腿与骨盆](review01_assets/legs_solo.png)、[右臂](review01_assets/armR_solo.png)、[左臂](review01_assets/armL_solo.png)
- 手：[左拇指](review01_assets/z_thumbL.png)、[右拇指](review01_assets/z_thumbR.png)

## 6. 复查结论

五项检查都已做完，未发现必须修复的缺陷。第 4 节的轮廓、边缘、残留线圈属于第二步的收边范围，建议在第二步集中处理。
