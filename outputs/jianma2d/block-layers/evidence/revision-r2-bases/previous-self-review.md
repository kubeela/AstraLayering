# 第 3 步：大层分组色稿自查

当前候选完成 R1–R3 局部返修与绘制者自查，待同一独立 reviewer 复验。本次接续既有完整稿，没有重新绘制整图，也未开始第 4 步。

## 当前交付与版本

- `block-layers/character.svg`：1024 × 1536，透明背景；45 个独立叶 `<g>`，各有唯一 `id` 和完整 `data-group-path`，与 `structure/groups.json` 一致。额外的 `ear_visibility_windows` 是裁切资源，不是新叶组。
- `block-layers/preview.png`：绑定 `svg_preview.py` 从当前 SVG 渲染的白底预览；与当前透明渲染叠白底后的 RGBA 字节相同。
- 纯色标识各组，无嵌入位图、渐变、背景或临时连体服图层；左右名称按角色自身方向。

SVG SHA-256：`a8720ccafcac13cc71042c40b00d973d239ee87c9865fca1a131c48750a5dda3`。

Preview SHA-256：`61878a12dfdc668079af24b630b45c939efa73b047dcd242703d52d0e5f3bafc`。

首轮完整自查及独立审查版本：`e2cbc656722895d36bd977fe22b10d2e0e14f5bd5d39f75003e4cb7be9888cbc`。接续时已落盘、尚未完成返修自查的版本：`6e16fdc1cf27dc3da59a8f0bfc009d9ac54f3df8568d42005856f58ff2ad08aa`。旧九张逐叶对照页属于首轮版本；没有把它们标成当前稿的重新检查。

## R1–R3 结果

| 项目 | 当前处理与检查 | 当前证据 |
|---|---|---|
| R1 双肩透明楔缝 | 躯干肩缘与上臂保留重叠；身体独显时双肩连续。原缝附近两处内部采样框的最小 alpha 均为 255。上臂完整底形及整图叠放正常。 | `block-layers/evidence/revision-r1-r3/shoulder-check.png`、`shoulders/` |
| R2 双耳及发遮挡 | 双耳保留完整底形，外耳廓小片与窄耳垂同时可见。接续自查发现画面右耳裁切窗口超出底形，已微调角色左耳外缘与窗口，去除新出现的透明楔口；刘海、头顶发块和鬓发的其余轮廓保留。 | `block-layers/evidence/revision-r1-r3/right-ear-check.png`、`left-ear-check.png`、`current-right-ear/`、`current-left-ear/` |
| R3 耳坠上段 | 细连接颈、菱坠侧向膨出及下尖按参考恢复。接续自查将各实心片保留为同叶组内独立 path，避免 evenodd 在重叠连接处相消；下环仍保留真实孔洞。两侧耳坠在 alpha ≥ 128 的像素图中各为一个连通部分。 | `block-layers/evidence/revision-r1-r3/earring-check.png`、`ears/` |

相对首轮版本，修改叶组为 `body/torso`、`face/right_ear`、`face/left_ear`、`earrings/right_earring`、`earrings/left_earring`、`hair/crown_hair`、`hair/right_bangs`、`hair/left_bangs`、`hair/left_side_lock`。另外 36 个叶组的序列化内容与首轮一致。接续 worker 进一步修改的叶组仅为 `face/left_ear` 与双耳坠，并更新耳区裁切资源。

## 证据范围

- 本次使用绑定 `svg_preview.py` 重渲染交付、当前整图和局部诊断；使用绑定 `compare.py` 更新整图、头部、躯干及四个受影响大类 `face/hair/body/earrings` 的边界叠加与混合对照。目视重点为 R1–R3 及相邻遮挡。
- 针对 9 个修改叶组及双上臂、角色右鬓发，共 12 组重新独显和隐藏：12/12 独显非空，12/12 隐藏后整图实际变化。当前独显图在 `block-layers/evidence/revision-r1-r3/leaves/`。
- 首轮已经完成整图、六大类、全部 45 叶组检查，独立 reviewer 仅要求 R1–R3。其余 36 组保留首轮检查结论；本次不声称重新目视了全部 45 组。
- `block-layers/evidence/review-manifest.json` 逐项区分当前证据与首轮叶组页的 SHA；`block-layers/evidence/revision-r1-r3/manifest.json` 记录此次差异、显隐、肩部采样与候选版本。归档首轮 manifest 只描述历史测量，其中部分原路径已由当前大类／整图证据更新；九张首轮叶组页仍保留原图。
- 颜色提取的可见范围仍有约一像素的抗锯齿诊断近似，不据此宣称像素级复刻。结构、45 叶路径集合、唯一 ID、无嵌入图片／渐变、画布尺寸和背景透明性均已核对。

作者辅助脚本为 `block-layers/draw_layers.py`；首轮证据脚本为 `block-layers/review_layers.py`，局部返修证据脚本为 `block-layers/review_revision.py`。路径均相对本主体工作根，绑定技能工具只读。

## 仍不确定的轮廓

临时连体服遮住的胸腹、骨盆及大腿根，和冠饰／面部／身体遮住的发根与背后结构，继续采用首轮的合理底形延续。双耳小片、耳坠细颈、发梢、珠链等细部受参考图分辨率限制，局部边缘仍可能有约 1–3 像素偏差；本步没有增加耳内线条、材质、发丝、宝石切面或动画绑定。

参考图、groups、技能、独立审查报告及运行记录未修改。本记录仅为绘制者自查，独立复验结论另行产生。
