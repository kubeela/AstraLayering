# 剑妈穿戴稿：头部九宫格与连续跟随（v6）

本例使用基础表情工作台同一份 `jianma_clothing/final/character.svg`。SVG 原文件不改写；不替换人脸、发型、颜色或路径。原图 SHA-256 为 `5bce80aa35a0331f34f1905d03886d0a4c2318ab623b8420a5e52561a5a5cae9`，来源记录见 `source.json`。

v5 的横行位移仍然让脸型接近正面，头饰的局部旋转中心又彼此独立，转头时会出现挤压、错位和类似凹凸镜的效果。v6 改成共同头部坐标中的深度与透视投影，并保留必要的轮廓关键形校正。

![当前九个关键形](nine-poses.jpg)

## 变形关系

- `volume` 定义共同转动中心、镜头距离、左右转角与俯仰角。每个原图点先按自身深度反投影，再做同一次俯仰、转头与透视投影；正面姿态严格回到原坐标。
- `volume.face` 以眉、眼、鼻、嘴、下巴等纵向位置定义正面与侧面深度。五官的局部切平面挂到脸部深度，鼻尖适当突出；眉眼保留原设计，避免把睫毛当成整脸曲线任意弯折。
- `volume.scalp` 表达额前发量与头顶体积。近侧轮廓使用显式关键形修正保留颅部宽度，内部发缝仍随头部转向；前后发根使用同一父级，约束逐渐释放到发梢。
- 发髻有自己的深度截面与俯仰高度校正，底部接到头皮。圆环与两侧连接头饰共享一个装配平面，发冠和额饰也用共同头部中心投影，不再各自绕锚点旋转。
- 颈部上端跟随下颌，底端固定；领口开口部分跟随，缝合边固定。耳坠与长带从实际挂点垂下，保留有界阻尼惯性。

`deformer.mjs` 将这些关系编译为九个完整关键形，运行时 GPU 做张量二次插值，Z 绕颈部挂点转动。它是原 SVG 坐标上的变形研究与预览缓存实现，不是 Cubism 运行时，也不声称导出了精确的 SVG 曲线或 `.cmo3`。

## 投影与衔接

- 头发与额饰的原始投影路径从脸部缓存中分离，跟随投影来源的同一变形与惯性；接收面的裁剪交给实时变形后的脸/耳朵网格。
- 原下巴投影从脖子缓存中分离，跟随脸部并裁剪在实时脖子网格内。脖子上端跟随下巴，下端固定到身体，衣领开口部分跟随而缝合边固定。
- `tools/prepare-artwork.mjs` 只操作显示克隆。保留原始投影几何、颜色、模糊和局部分区；撤掉烘焙的接收面裁剪，并记录到 `layers.json`。正式 SVG 保持原字节。
- 嘴部重复肤色填充仍用原路径作为口腔遮罩；唇线、开口、局部颜色和阴影保留，肤色底面由脸层提供。
- 48 张可重建 PNG 只作预览缓存；透明纹理采样前预乘 Alpha。鼠标移动不重新栅格化 SVG。

## 参考与实测

参考用户的头部九轴视频，以及 [psd2live 3.0](https://github.com/tsunehimatoi/psd2live/tree/4002ac28c084112f3f0103b2575aa9841693d856) 的 `NinePoseFaceRig.kt`、`RigBuilder.kt` 层级与局部修正设计。实际运行了官方 3.0.0 Linux 包，先输入仓库 TML PSD，再输入由同一剑妈原 SVG 导出的 39 层 PSD；纯 X/Y 各采样九个位置，关闭 Z/物理，对照默认配置与开启 `featureDisplacementEnabled` 的配置。

实测说明：上游可以产生弧形纬线与局部五官变化，但直接输入这份长发、长配饰原稿仍有挂接和遮挡问题，不能把上游默认生成结果直接当成剑妈成品。本例按同一层级原则独立实现，没有移植上游代码、示例美术或将其输出冒充本例效果。

此前还实际加载了官方 [Haru](https://www.live2d.com/en/learn/sample/haru/)、[Hiyori](https://www.live2d.com/en/learn/sample/momose-hiyori/)、[Mark](https://www.live2d.com/en/learn/sample/mark/)；它们用于观察整体/局部变形与遮挡关系，不包含在发布资产中。

## 重建与检查

```sh
node --test rigging/jianma2d-head/deformer.test.mjs rigging/jianma2d-head/physics.test.mjs
git show 0049060aa29c684dda998d883a06947d4736cae1:outputs/jianma_clothing/final/character.svg > /tmp/jianma-source.svg
node rigging/jianma2d-head/tools/build-atlas.mjs /tmp/jianma-source.svg
python3 -m http.server 8796
# http://localhost:8796/rigging/jianma2d-head/
node rigging/jianma2d-head/tools/verify-browser.mjs http://localhost:8796/rigging/jianma2d-head/
```

缓存重建需要 Playwright/Chromium 与 Python Pillow；可通过 `ASTRA_PLAYWRIGHT`、`ASTRA_CHROMIUM` 指定工具路径。改曲面参数不需要重建纹理；改显示分层或遮挡准备时才重建。源 SVG 哈希不符时拒绝执行。

v6 的 15 项几何/来源检查与 5 项惯性检查覆盖共同投影、脸部深度传递、近远眼宽、发髻/发冠连接、原图身份、固定边、发根、投影来源、四角不翻折及物理收敛。可见面采样最小面积比为 0.2556。画面另检查纯 X/Y 各九个连续位置、四角和隐藏头发后的脸型。测试通过不代表用户已经认可美术效果。

本轮使用 GPT-Image-2 基于原穿戴稿生成九宫格，检查转向、头发体积和俯仰关系。参考及前版对照可在[剑妈工作台](https://gameclaw.woa.com/ai-weapon-spirit/workbench/#/spirit-expressions/jianlai-jianma?view=head)查看；参考有细节漂移，仅作为视觉指导，不是替换帧或精确多视图。`nine-poses.jpg` 是本例真实渲染截图。

48 张显示纹理与 GPU 插值渲染路径没有变化，但本轮未重新测量 Mac/Safari 帧率，不能将此前 v5 的 Chrome 60 fps 记录当作 v6 实测。仅有正面原画，鼻侧面、隐藏区域与遮挡仍是当前研究例的美术限制；没有用生成图覆盖原稿。

这是头部九轴研究例；基础表情与头部仍为独立预览。状态不写入存档、不导出、不同步。
