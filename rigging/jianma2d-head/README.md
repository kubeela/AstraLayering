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
- `faceCage` 只塑造脸型；`features` 独立保存双眼、双眉、鼻、嘴的局部关键形。每只眼睛整体平移、压缩与倾斜，内部不再受到变化强度不同的横向弯曲。
- `scalpCage` 塑造头壳与发际线，前后发根挂在同一头皮。长发沿垂发导线过渡到肩部以下，顶部锁定，发梢可以延迟摆动。
- X/Y 的九个组合边界作 3 × 3 二次插值。四角包含眼线倾斜校正；±30 是参数端点，不冒充实测的三维欧拉角。
- 头饰、光环、发髻使用锚定透视平面，耳坠按真实脸轮廓遮挡。飘带的根挂在变形后的发饰挂点。
- Z 绕颈部旋转。颈根和衣领缝合边固定，领口以小于头部的比例跟随扭动。
- `physics.mjs` 的两级阻尼弹簧驱动八组发束、飘带、耳坠的弯曲幅度；顶部权重及一阶导数为零。振幅限制在作者边界内，停止输入后仍计算到收敛，随后停止 RAF。隐藏页面、关闭惯性或长时间中断会清空旧速度。
- 原 SVG 不变。`tools/prepare-artwork.mjs` 在显示克隆中把衣领遮挡交回实际绘制顺序；嘴部重复肤色填充的路径改用于遮挡完整口腔，保留原唇线、开口、局部颜色和阴影，由脸层提供底色，避免移动矩形肤色块。操作记入缓存清单。
- 隐藏头发时使用不带头发、额饰投影的脸部诊断缓存。原表情绑定仍独立可用。

## psd2live 九轴参考

阅读 [psd2live](https://github.com/tsunehimatoi/psd2live/tree/4002ac28c084112f3f0103b2575aa9841693d856)，固定提交 `4002ac28c084112f3f0103b2575aa9841693d856`。本轮具体查阅 `NinePoseFaceRig.kt`、`RigBuilder.kt` 的 `headContainerPoint` / `hairFollowPoint` / `hairPhysicsPoint` / `buildDeformers`、`RigTuning.kt` 和 `SwingDeformer.kt`。

可借鉴的核心是层级：头壳容器下，脸部与前后发是同级；脸型有单独轮廓校正，五官有局部校正；头发先跟随头部角度，再接受物理输出。近侧眼睛尽量保持原宽度，远侧做受限收缩；四角单独加入透视校正。物理的固定边与摆动边分开定义，不能直接晃动整个头皮。

本例据此重新组织剑妈的绑定，使用自己的关键形、透视与弹簧实现，没有移植仓库代码，也没有把该仓库示例效果当成剑妈已通过的证据。本轮未重新将剑妈转 PSD 跑该程序；此前的 PSD 对照与这次源码研究是不同工作。

## 官方 Live2D 对照

实际下载、加载并设置了官方 [Haru](https://www.live2d.com/en/learn/sample/haru/)、[Hiyori](https://www.live2d.com/en/learn/sample/momose-hiyori/)、[Mark](https://www.live2d.com/en/learn/sample/mark/) 的模型。来源为 [CubismWebSamples](https://github.com/Live2D/CubismWebSamples/tree/b1de66b0b1f1cb881d95fb6158622aeb6a2827bd/Samples/Resources)，固定提交 `b1de66b0b1f1cb881d95fb6158622aeb6a2827bd`。在私有对照页设置 `ParamAngleX/Y` 为 0、±30，查看左右与右上、右下，保留了比较截图。下载模型仅作研究，没有收入本项目或替代剑妈。

对照观察：Haru 的脸部中心、下巴与刘海一起转向，远侧眼睛和脸宽收缩；Hiyori 的头发连接面保有遮挡余量；Mark 的整体形变较简单，仍维持五官与头壳的一致性。不同画风的具体关键形不能直接复制给剑妈。

参考官方 [Warp Deformer](https://docs.live2d.com/en/cubism-editor-manual/making-and-placement-of-warp-deformer/)、[About Deformers](https://docs.live2d.com/en/cubism-editor-manual/deformer/) 和 [Auto generation of facial motion](https://docs.live2d.com/en/cubism-editor-manual/face-auto-edit/)：父变形器共同带动子对象，面部各部件保留独立语义，X/Y 后仍要生成并检查四角，刚性转动用旋转变形器。此例实现相同的组织原则，不声称读取或复现了官方 `.cmo3` 内部变形器树。

## 显示缓存与重建

SVG 是作者源；PNG 只作可重建显示缓存。按实际 Alpha 计算纹理范围，避免 `getBBox()` 把隐藏引导线或 defs 算入包围盒。脸、五官与衣领保持独立缓存，纹理在采样前预乘 Alpha，避免透明边缘暗线。GPU 插值九套关键形和 Z，鼠标移动时不重新栅格化 SVG。

```sh
python3 -m http.server 8796
# http://localhost:8796/rigging/jianma2d-head/
node --test rigging/jianma2d-head/deformer.test.mjs rigging/jianma2d-head/physics.test.mjs
git show 0049060aa29c684dda998d883a06947d4736cae1:outputs/jianma_clothing/final/character.svg > /tmp/jianma-source.svg
node rigging/jianma2d-head/tools/build-atlas.mjs /tmp/jianma-source.svg
node rigging/jianma2d-head/tools/verify-browser.mjs http://localhost:8796/rigging/jianma2d-head/
```

重建需要 Playwright/Chromium 与 Python Pillow。`ASTRA_PLAYWRIGHT` 可指定 Playwright 模块路径，`ASTRA_CHROMIUM` 可指定浏览器。源图哈希不匹配时拒绝重建。仅调整关键形或物理参数不需要重建纹理。

## 验证范围与限制

14 项几何、来源及惯性测试覆盖独立五官的比例、发根挂接、衣领固定边、透视直线、组合姿态不翻折、快速反向限幅、停止后的收敛，以及 30 / 60 / 144 帧下的物理一致性。Chromium 交互检查覆盖九宫格、连续巡览、惯性开关、上下文恢复和窄屏滚动。静态边界与连续反转序列另作画面复看；数值通过不等于用户已认可视觉效果。

Mac M4 Pro / Chrome 154 的 6 秒连续巡览实测 60.00 fps，p95 帧间隔 18.4 ms，GPU 提交 CPU 耗时 p95 0.5 ms，画布 1564 × 1640，40 个缓存图层（普通视图绘制其中 39 个）。该数字只代表此设备与视图。Safari 自动化尚未启用。

这是穿戴稿头部九轴研究例。头发物理为独立阻尼弹簧，并非 Cubism 求解器；尚无动态照明、Cubism 工程导出，也未把表情参数和头部参数合成同一个渲染器。`deformer.mjs` 可映射 SVG 坐标，当前没有精确变形 SVG 曲线导出。姿态与物理状态不写入存档、不导出或同步。
