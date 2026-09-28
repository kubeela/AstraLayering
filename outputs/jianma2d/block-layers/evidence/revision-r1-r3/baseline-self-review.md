# 第 3 步：大层分组色稿自查

本次只完成 `group_layer_drawing`。未开始细化、服装恢复、绑定或动画，也未改动参考图、`groups.json`、workflow、绑定工具或运行记录。

## 交付

- `block-layers/character.svg`：1024 × 1536，背景透明；45 个独立叶 `<g>`，45 个唯一 `id`，完整 `data-group-path` 与 `structure/groups.json` 一致。左右按角色自身方向命名。
- `block-layers/preview.png`：由同一 SVG 经绑定 `svg_preview.py` 渲染的白底预览。
- 所有内容均为可编辑路径，使用每组唯一的纯色标记；没有嵌入位图、渐变、背景或临时连体服图层。组色仅用于分组识别。
- `block-layers/draw_layers.py`：本次作者辅助脚本，读取参考图完成少量外轮廓追踪和手工曲线组合；SVG 本身不依赖参考图。
- `block-layers/review_layers.py`：调用绑定预览、对照工具生成证据；从当前主体输出目录运行，所用文件路径均为相对路径。

SVG SHA-256：`e2cbc656722895d36bd977fe22b10d2e0e14f5bd5d39f75003e4cb7be9888cbc`。

## 检查与证据

使用 workflow 绑定的 `tools/svg_preview.py` 与 `3.大层分层稿/tools/compare.py`，检查了整图、六个大类和全部 45 个叶组。

- 整图：`block-layers/evidence/full/comparison.png`、`overlay.png`、`blend.png`。
- 头部、躯干、脚部放大：`block-layers/evidence/head/`、`torso/`、`feet/` 下的 `comparison.png`、`overlay.png`、`blend.png`。
- 六大类：`block-layers/evidence/categories/{face,hair,body,headdress,earrings,sandals}.png`。
- 全部叶组：`block-layers/evidence/leaf-sheets/01.png` 至 `09.png`，每页五组。编号、路径、可见范围和对应页记录于 `block-layers/evidence/review-manifest.json`。

大类和逐叶板四列依次为：参考图、完整底形、最终叠放中的可见轮廓叠加、最终可见色块混合。每行四列采用相同裁切和比例。完整底形是绑定预览工具直接按 `id` 隔离的结果；可见部分从全图的唯一组色提取，抗锯齿混色边缘有约一像素的诊断近似，不能据此宣称像素级复刻。

已逐项自查并修正：额饰末端原先偏低、莲冠侧瓣过窄、两侧前发束过薄、饰架与垂饰误带入的隐蔽碎片、大腿隐藏上端的生硬切口及脚链连接位置。保留了手指间开口、冠架与枝饰间的透明空隙、发丝回弯间隙，以及脚链围合区的裸足底形。前额、发根、后发、颈肩、胸腹、骨盆与上腿均留有可继续编辑的遮挡下底形。

静态校验通过：45 个唯一叶组和唯一组色，路径集合与输入完全相同；无嵌入图片或渐变；SVG 画布与参考图一致；透明渲染角像素透明，交付预览角像素为不透明白色。

## 仍不确定的轮廓

- 临时连体服下面的胸腹、骨盆及大腿根没有直接可见的解剖边界，本稿按姿态和外轮廓补成连续身体底形。腰、髋、肘、腕、膝与踝的组间切分是大层结构分界，不是衣服接缝。
- 被冠饰、面部或身体遮住的发根、枝饰根部和后发内侧属于合理延续；单张参考图无法确定其真实背面结构。
- 两侧细发梢、耳饰细链、脚链珠粒及趾端薄底受原图分辨率与抗锯齿影响，局部边界仍可能存在约 1–3 像素偏差。此步未补做后续的珠粒刻画、发丝纹理或足趾内部细节。

本文件是绘制 worker 的自查记录；独立 reviewer 的验收由主控另行执行。
