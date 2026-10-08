# 剑妈：头脸修型与头部九宫格

2026-10-08 用户明确授权修改原 SVG 头型与五官，依据此前生成九轴参考进行美术修订。当前原稿为 `artwork/character.svg`，与游戏工作台的基础表情使用相同字节；历史原稿、提交和 SHA-256 记录在 `source.json.base`。

- 收紧上部发团，在耳旁恢复原发束宽度，保持前后发的连续轮廓。缩短隐藏上颅轮廓，使其不再上宽下窄地突变。
- 重画头脸填充、可见下颌轮廓及其所有接收面/投影副本，给下巴适量宽度并缩短约 5px。
- 眼睛略微打开，眉形减薄，嘴唇略微收窄；用轻鼻翼线代替两个深色圆点，减轻鼻尖高光和腮红。
- 眼口眉的局部路径与关键形不改，作者调整位于各区域父组，因此睫毛/眼皮/虹膜/遮罩和整套极值一起跟随。嘴巴开合的纵向范围保留。
- 仍用 v7 连续脸面与颅底颈柱挂接，只校正发根/配饰挂点及物理起始点；按新源图重建显示缓存。

![实际九个关键形](nine-poses.jpg)

## 变形关系

- 头部仍使用共同转动中心与镜头，但深度按原脸宽收敛，避免鼻口大幅滑出颅部。正面严格回到修型稿坐标。
- 脸、五官、皮肤自身色与耳根使用同一个连续深度场。眼、鼻、嘴的切平面约束平滑融入该场，不能再各自成为独立移动的平面。
- 所有图层共享源坐标采样格和三角形方向。`meshGeometry` 输出真实渲染数据；即使理想映射一致，也不能让各层不同的插值误差重新撕开边缘。
- 脖子跟随位于下巴后方的颅底挂点，肩端固定，保留颈柱宽度。原有隐藏颈顶在转动时向头内延伸，保持下颌覆盖；颈柱的原始宽度保持。
- 耳根继承同一脸面；远侧耳朵按转角连续遮挡。前后发、发髻、头饰、长带及其惯性保留。

`deformer.mjs` 将这些关系编译为九个完整关键形，运行时 GPU 做张量二次插值，Z 绕颈部挂点转动。它是原 SVG 坐标上的变形研究与预览缓存实现，不是 Cubism 运行时，也不声称导出了精确的 SVG 曲线或 `.cmo3`。

## 投影与衔接

- 头发与额饰的原始投影路径从脸部缓存中分离，跟随投影来源的同一变形与惯性；接收面的裁剪交给实时变形后的脸/耳朵网格。
- 原下巴投影先还原来源坐标，再变形并加回原画的光照偏移，最后裁剪在实时脖子网格内。不能把阴影像素的纵坐标误当成脸上对应点。衣领只小幅跟随颅底，缝合边固定。
- `tools/prepare-artwork.mjs` 只操作显示克隆。保留原始投影几何、颜色、模糊和局部分区；撤掉烘焙的接收面裁剪，并记录到 `layers.json`。显示准备不再二次修改修型稿。
- 嘴部重复肤色填充仍用原路径作为口腔遮罩；唇线、开口、局部颜色和阴影保留，肤色底面由脸层提供。
- 48 张可重建 PNG 只作预览缓存；透明纹理采样前预乘 Alpha。鼠标移动不重新栅格化 SVG。

## 参考与实测

参考用户的头部九轴视频，以及 [psd2live 3.0](https://github.com/tsunehimatoi/psd2live/tree/4002ac28c084112f3f0103b2575aa9841693d856) 的 `NinePoseFaceRig.kt`、`RigBuilder.kt` 层级与局部修正设计。实际运行了官方 3.0.0 Linux 包，先输入仓库 TML PSD，再输入由同一剑妈原 SVG 导出的 39 层 PSD；纯 X/Y 各采样九个位置，关闭 Z/物理，对照默认配置与开启 `featureDisplacementEnabled` 的配置。

实测说明：上游可以产生弧形纬线与局部五官变化，但直接输入这份长发、长配饰原稿仍有挂接和遮挡问题，不能把上游默认生成结果直接当成剑妈成品。本例按同一层级原则独立实现，没有移植上游代码、示例美术或将其输出冒充本例效果。

此前还实际加载了官方 [Haru](https://www.live2d.com/en/learn/sample/haru/)、[Hiyori](https://www.live2d.com/en/learn/sample/momose-hiyori/)、[Mark](https://www.live2d.com/en/learn/sample/mark/)；它们用于观察整体/局部变形与遮挡关系，不包含在发布资产中。

## 重建与检查

```sh
git show 0049060aa29c684dda998d883a06947d4736cae1:outputs/jianma_clothing/final/character.svg > /tmp/jianma-source.svg
python3 rigging/jianma2d-head/tools/refine-portrait.py /tmp/jianma-source.svg /tmp/jianma-refined.svg
# /tmp/jianma-refined.svg must match artwork/character.svg byte for byte.
node rigging/jianma2d-head/tools/build-atlas.mjs rigging/jianma2d-head/artwork/character.svg
node --test rigging/jianma2d-head/deformer.test.mjs rigging/jianma2d-head/physics.test.mjs
```

缓存重建需要 Playwright/Chromium 与 Python Pillow，可通过 `ASTRA_PLAYWRIGHT`、`ASTRA_CHROMIUM` 指定工具路径。源哈希不符时拒绝执行。

24 项几何、来源与惯性检查通过。实际检查了静止正脸、裸脸、左右中间位置、九宫格和原 12 项表情的极值与中性恢复。工作台同时提供生成参考、当前九宫格和同构图修型前后对照。美术参考仍有侧鼻、配饰和衣领差异；不宣称完全复刻。没有重新测量 Mac/Safari 帧率。

基础表情与头部仍为独立预览。状态不写入存档、不导出、不同步。
