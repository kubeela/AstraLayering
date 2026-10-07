# 剑妈 · 头部九轴研究

这是一个可连续拖动的 Jianma2D 头部绑定例子：**X / Y 的九个组合关键形，加独立 Z 侧倾**。不是九种表情，也不是九张替换图片。入口是 [index.html](./index.html)。

![九个边界姿态](./nine-poses.jpg)

拖动方向盘或点击九宫格；三个滑杆可以叠加。暂停巡览后保持当前目标，不自动回正。打开“面部近景”“隐藏头发”和曲面辅助线，可以直接看脸型、五官与颈部的关系。键盘方向键可操作方向盘，页面在窄屏下正常滚动。参数只存在当前页面内，不读写游戏存档或 localStorage。

## 视频里学到的制作次序

参考用户提供的《头部九轴.mp4》，约 11 分 9 秒，960 × 544、21 fps，共 14,045 帧。整段已逐帧解码建立时间索引；按阶段查看大图，并对 01:57–01:58、06:08–06:09、10:21–10:22 的连续帧复看局部修形、整体框架和组合角度的过渡。没有把每秒缩略图当成全部帧已逐张人工审阅，也没有取得视频作者的 Cubism 工程。

| 视频位置（约） | 制作内容 | 本例中的对应办法 |
| --- | --- | --- |
| 00:00–01:15 | X 轴大框架 | 先确定颅骨与脸的体积；轮廓、下巴、眼线一起变 |
| 01:15–03:57 | X 轴调整 | 五官服从脸表面的透视，远近侧宽度不同；耳朵连接太阳穴 |
| 03:57–05:05 | Y 轴大框架 | 额头、眼线、下脸有不同深度，俯仰不等于整张脸上下平移 |
| 05:05–06:35 | Y 轴调整 | 保持眼睑、虹膜、睫毛与局部色层的关系，避免各层各变各的 |
| 06:35–08:45 | X / Y 细化 | 检查轮廓与五官的曲率和远近关系，而不是只对锚点做移动 |
| 08:45–10:33 | 四角合成 | 单轴完成后仍要检查斜上、斜下；用中线、眉线、眼线、嘴线比较 |
| 10:35–10:47 | Z 轴 | 围绕颈部侧倾，不能绕每个五官的中心各自旋转 |
| 10:49–结尾 | 复制粘贴 | 复用已验证的关键形；不强行镜像原画中已有的不对称细节 |

视频示范主体隐藏了头发。因此，本例的发根 / 长发 / 头饰绑定是把“父级整体变形”的原则扩展到剑妈的分层，不能称为视频给出了她的发型绑定参数。

## 当前模型与整体绑定

使用与游戏原表情页完全一致的 `outputs/jianma_clothing/final/character.svg`，固定提交 `0049060aa29c684dda998d883a06947d4736cae1`，SHA-256 为 `5bce80aa35a0331f34f1905d03886d0a4c2318ab623b8420a5e52561a5a5cae9`。此前误接的 Opus55 研究稿及其补绘已撤下。原 SVG 的路径、颜色、拓扑不变。

- `rig.json` 的 `bindings` 明确列出全部原始顶层组。未知组必须报错，不按名字猜测脸、头发或头饰。投影归属于接收表面。
- `cage.rows` 是作者设置的共同头部边界：头顶、额头、眼线、脸颊、嘴、下巴分别定义左右转向的中心位移、横向收缩和俯仰校正。脸、五官、头皮、前后发根使用同一个父变形，避免独立投影把它们拉开。
- 远侧宽度压缩、近侧展开；四角同时施加眉眼线倾斜。九个组合边界作 3 × 3 二次插值。±30 是参数端点，不冒充实测的三维欧拉角。
- 原图完整的后发帘和头皮底层承担遮挡。长发从共同发根平滑过渡到独立垂发导线；肩部以下逐渐减弱跟随。没有额外补绘白片。
- Z 使用绕颈部的旋转，颈根固定在衣领内，长发末端衰减；头饰保留刚性形状，耳坠根部跟随耳朵并受实际脸轮廓遮挡。
- 原颈部阴影含有静止衣领的预裁口。`tools/prepare-artwork.mjs` 只在显示克隆里移除该重复遮罩，由仍在原绘制顺序中的衣领遮挡完整颈部。操作在缓存清单中记录。
- 隐藏头发时使用不带头发、额饰投影的脸部诊断缓存，避免把投影误当成脸部结构。原表情绑定仍保持独立可用。

## 官方 Live2D 对照

实际下载、加载并设置了官方 [Haru](https://www.live2d.com/en/learn/sample/haru/)、[Hiyori](https://www.live2d.com/en/learn/sample/momose-hiyori/)、[Mark](https://www.live2d.com/en/learn/sample/mark/) 的模型。来源为 [CubismWebSamples](https://github.com/Live2D/CubismWebSamples/tree/b1de66b0b1f1cb881d95fb6158622aeb6a2827bd/Samples/Resources)，固定提交 `b1de66b0b1f1cb881d95fb6158622aeb6a2827bd`。在私有对照页设置 `ParamAngleX/Y` 为 0、±30，查看左右与右上、右下，保留了比较截图。下载模型仅作研究，没有收入本项目或替代剑妈。

对照观察：Haru 的脸部中心、下巴与刘海一起转向，远侧眼睛和脸宽收缩；Hiyori 的头发连接面保有遮挡余量；Mark 的整体形变较简单，仍维持五官与头壳的一致性。不同画风的具体关键形不能直接复制给剑妈。

参考官方 [Warp Deformer](https://docs.live2d.com/en/cubism-editor-manual/making-and-placement-of-warp-deformer/)、[About Deformers](https://docs.live2d.com/en/cubism-editor-manual/deformer/) 和 [Auto generation of facial motion](https://docs.live2d.com/en/cubism-editor-manual/face-auto-edit/)：父变形器共同带动子对象，面部各部件保留独立语义，X/Y 后仍要生成并检查四角，刚性转动用旋转变形器。此例实现相同的组织原则，不声称读取或复现了官方 `.cmo3` 内部变形器树。

## 显示缓存与重建

SVG 是作者源；PNG 只作可重建显示缓存。按实际 Alpha 计算纹理范围，避免 `getBBox()` 把隐藏引导线或 defs 算入包围盒。脸与五官在九轴页使用共同缓存，消除独立纹理边界的采样缝。GPU 插值九套关键形和 Z，鼠标移动时不重新栅格化 SVG。

```sh
python3 -m http.server 8796
# http://localhost:8796/rigging/jianma2d-head/
node --test rigging/jianma2d-head/deformer.test.mjs
git show 0049060aa29c684dda998d883a06947d4736cae1:outputs/jianma_clothing/final/character.svg > /tmp/jianma-source.svg
node rigging/jianma2d-head/tools/build-atlas.mjs /tmp/jianma-source.svg
node rigging/jianma2d-head/tools/verify-browser.mjs http://localhost:8796/rigging/jianma2d-head/
```

重建需要 Playwright/Chromium 与 Python Pillow。`ASTRA_PLAYWRIGHT` 可指定 Playwright 模块路径，`ASTRA_CHROMIUM` 可指定浏览器。源图哈希不匹配时拒绝重建。仅调整 cage 不需要重建纹理。

## 验证范围与限制

7 项数学/来源测试和 Chromium 交互检查通过；Mac M4 Pro / Chrome 154 实测 6 秒连续巡览为 59.99 fps，p95 帧间隔 18.2 ms，画布 1564 × 1640，31 个缓存图层（普通视图绘制其中 30 个）。该数字只代表此设备与视图。

本轮检查覆盖原画一致性、显式图层归属、共同发根、颈根固定、刚性饰品、零位连续性及组合极限不翻折。九个边界及叠加 Z 的实际画面单独复看；数学测试不代替视觉验收。原表情页的 SVG 和表情 JSON 没有改写。

这是穿戴稿头部九轴研究例，尚无头发物理、动态照明或 Cubism 工程导出；未把表情参数和头部参数合成同一个渲染器。`deformer.mjs` 可映射 SVG 坐标，但当前没有精确的变形 SVG 曲线导出。Safari 自动化尚未启用，不把其他浏览器的结果写成 Safari 验收通过。
