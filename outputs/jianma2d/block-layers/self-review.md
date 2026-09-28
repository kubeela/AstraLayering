# 第 3 步：大层分组色稿自查

当前完成剩余 R2 发组隐藏底形返修及绘制者自查，待同一独立 reviewer 复验。上一版 `a8720ccafcac13cc71042c40b00d973d239ee87c9865fca1a131c48750a5dda3` 的独立复验已通过 R1、R3 和可见耳部；本次保持这些结果，只调整耳部与发层的叠放结构。

## 当前交付与版本

- `block-layers/character.svg`：1024 × 1536，透明背景；45 个不同的完整 `data-group-path`，共 47 个唯一 ID 的绘制 `<g>`。
- `block-layers/preview.png`：绑定 `svg_preview.py` 从当前 SVG 渲染的白底预览；像素与同版透明渲染叠白底后的 RGBA 字节一致。
- `block-layers/evidence/review-manifest.json`：当前总 manifest；各叶的 `ids` 列出全部绘制段，整体显隐须聚合这些 ID。
- `block-layers/evidence/revision-r2-bases/manifest.json`：本次 R2 差异、聚合显隐、证据及版本记录。

SVG SHA-256：`38bab0527ec626c10fbc531c5551a64b780a4955335870a5ef25b75859dce9e3`。

Preview SHA-256：`3aa6e4a7808f1d445725b5196eb59cdf8ae44feb5507a907e20b8221d7daad8a`。

## R2 结构修正

删除 `ear_visibility_windows`，不再裁切任何发组。`hair/crown_hair`、`hair/right_bangs`、`hair/left_bangs` 恢复为首轮已通过完整底形的原始向量几何，序列化内容与首轮一致；当前 8 倍绑定渲染确认原三角孔和边缘缺口消失。

双耳仍各保留原来的完整底形，并把参考中露出的耳廓小片作为同叶组的前置段，放在刘海之上、鬓发之下：

| 叶路径 | 整体控制的全部 ID |
|---|---|
| `face/right_ear` | `right_ear`、`right_ear_helix_front` |
| `face/left_ear` | `left_ear`、`left_ear_helix_front` |

新增的两段各有唯一 ID，并共享其所属耳叶的完整路径与颜色；它们不是新叶组。耳底形原有坐标未改，发底形没有替代性的遮罩、裁切或穿孔。参考图、groups 和其余内容结构保持不变。

相对上一版仅 5 个叶路径变化：双耳的分段结构，以及头顶发块、双侧刘海的裁切移除；其余 40 个叶路径序列化内容相同。当前整图只有 66 个 RGBA 像素变化，范围为 `x=446–587, y=272–282`，来自耳区叠放边缘；肩部和耳坠等该区域之外的像素完全一致。因此 R1、R3 沿用上一版独立通过结果，没有重新改动或重画。

## 本次检查与证据

- `block-layers/evidence/revision-r2-bases/hair-bases-comparison.png`：四处原窗口的旧稿／当前／混合板。当前列为绑定工具直接 8 倍 SVG 渲染；旧稿列来自上一版 1 倍独显图的放大，已在板上明确标记。
- `block-layers/evidence/revision-r2-bases/complete-hair-bases.png`：头顶发块、右刘海、左刘海的完整底形，当前没有耳形穿孔或裁切缺口。
- `block-layers/evidence/revision-r2-bases/ear-leaf-aggregation.png`：双耳分别按两个 ID 聚合后的完整叶组，以及隐藏整叶后的结果。外耳廓与内耳垂一起消失，不会残留前置段。
- `block-layers/evidence/revision-r2-bases/current-right-ear/`、`current-left-ear/`、`ears/`：绑定 `compare.py` 的局部轮廓叠加与混合对照。整图、头部以及 face/hair 大类证据也已刷新。
- 共复查 7 个相关叶路径：头顶发块、双侧刘海、双耳、双侧鬓发。7/7 按路径聚合独显非空，7/7 按路径聚合隐藏后实际改变整图；耳组操作始终包含全部段。
- 无 `clipPath`、mask、嵌入位图或渐变；45 个路径集合与 `groups.json` 相同，47 个绘制段 ID 唯一。当前 SVG 与 preview 的 SHA、画布和渲染一致性已核对。

作者辅助脚本为 `block-layers/draw_layers.py`。`block-layers/review_layers.py` 和 `block-layers/review_revision.py` 均已按 `data-group-path` 聚合所有段；不会将两个耳廓前置段当作新叶，也不会只检查一个耳底形 ID。脚本与文档使用相对工作根路径，绑定技能工具只读。

首轮整图、六大类及 45 叶组检查继续保留为历史；本次没有重新阅读全部叶组页。上一版 R1/R3 证据保留在 `block-layers/evidence/revision-r1-r3/`，本次 R2 证据使用独立目录与新 SHA，manifest 明确区分版本。

## 仍不确定的轮廓

临时连体服下的身体和其他完全遮挡结构继续采用已审查的合理底形延续。耳廓、细发梢、耳饰与珠链等细部受参考图分辨率限制，边缘仍可能有约 1–3 像素偏差。本步不增加耳内细线、材质、发丝精修或动画绑定。

未修改参考图、groups、技能、独立审查报告、workflow 或运行记录，未执行后续步骤。此记录仅为绘制者自查，独立复验尚待执行。
