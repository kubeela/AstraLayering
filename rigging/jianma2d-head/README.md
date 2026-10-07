# 剑妈穿戴稿：头部九宫格与连续跟随（v5）

本例使用基础表情工作台同一份 `jianma_clothing/final/character.svg`。SVG 原文件不改写；不替换人脸、发型、颜色或路径。原图 SHA-256 为 `5bce80aa35a0331f34f1905d03886d0a4c2318ab623b8420a5e52561a5a5cae9`，来源记录见 `source.json`。

v4 的纯 Y 形变只改变各横行的高度，五官又使用独立仿射变换，导致抬低头缺少弧形眼线、五官与脸型脱节。v5 重新建立共同曲面与局部校正；这不是对旧总位移再加大幅度。

![当前九个关键形](nine-poses.jpg)

## 变形关系

```text
侧倾 / 头壳
├── 脸部曲面：眉线、眼线、鼻线、嘴线、下巴的曲率与间距
│   ├── 脸轮廓：眼窝与下颌校正
│   ├── 双眼 / 双眉：局部形状、近远侧宽度校正
│   ├── 鼻：鼻尖相对鼻根的位移
│   └── 嘴：嘴角滞后与局部弧度
├── 头发表面
│   ├── 刘海 / 完整头皮
│   └── 鬓发 / 后发：发根跟随，向发梢逐渐释放约束
└── 配饰：锚点跟随所属部位，平面透视与挂件惯性
```

`faceSurface` 与 `scalpSurface` 是头壳下的同级变形器。五官在原图坐标中作局部校正，再经过脸部曲面与头壳；不会另加一份绝对位移，也不会重复应用父曲面。横行的中心与边缘分别定义抬头/低头关键形，形成方向相反的弧线；纵向间距随俯仰调整。X 通过近侧宽度保持、远侧收缩与不同纬度的位移建立转向。四角在同一曲面中叠加倾斜与修正。

`deformer.mjs` 将这些关系编译为九个完整关键形，运行时 GPU 做张量二次插值，Z 绕颈部挂点转动。它是 SVG 坐标可调用的映射函数与预览缓存实现，不是 Cubism 运行时，也不声称导出了精确的 SVG 曲线或 `.cmo3`。

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

v5 的 12 项几何/来源检查与 5 项惯性检查覆盖俯仰横行曲率、父变形传递、近远眼宽、原图身份、固定边、发根、投影来源、四角不翻折及物理收敛。画面另检查纯 X/Y 的九个连续位置、四角、隐藏头发后的脸型和反向移动。测试通过不代表用户已经认可美术效果。

Mac M4 Pro / Chrome 154 的 6 秒实际连续巡览为 60.00 fps，p95 帧间隔 18.2 ms，CPU 绘制提交 p95 0.5 ms，画布 1564×1640，48 个显示缓存。只代表该设备和该视图；未据此宣称 Safari 实测通过。

这是头部九轴研究例；基础表情与头部仍为独立预览。状态不写入存档、不导出、不同步。
