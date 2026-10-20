# 静态角色光照工作流 v1

这是 AstraLayering 人物预览台的操作契约。入口：制作工作台顶部 **人物预览**（`./studio`）。本期验证固定视角、固定姿态下的光照；后续物理、表情和动作仍需在同一预览台扩展，不将静态通过当作动画通过。

## 选择依据

直接使用 `@pixiv/three-vrm-materials-mtoon@3.5.5` 的 `MToonMaterial`，由 `three@0.180.0` 的 WebGLRenderer、DirectionalLight、PCFShadowMap 执行渲染与投影。没有拷贝或改写 MToon 明暗公式，也没有沿用上一版器灵工作台的光照 shader。附加的深度接收适配器只计算实际像素的投影坐标和几何法线偏移，阴影比较与过滤仍由 Three.js 执行。

| 考察方案 | 可复用能力 | 本期选择 |
| --- | --- | --- |
| [Pixiv three-vrm / MToon](https://github.com/pixiv/three-vrm/tree/v3.5.5/packages/three-vrm-materials-mtoon) | 浏览器材质、独立 lit / shade 色、明暗位置及过渡、法线、标准投影、轮廓光；MIT | 直接使用正式 npm 包，锁定版本 |
| [VRMC_materials_mtoon 1.0](https://github.com/vrm-c/vrm-specification/tree/master/specification/VRMC_materials_mtoon-1.0) | 公开参数与着色规范 | 校对颜色空间、法线和明暗语义 |
| [Unity Toon Shader](https://github.com/Unity-Technologies/com.unity.toonshader) | 成熟的美术控制和 Unity 集成 | Unity 依赖及 Companion License；不移植到当前网页 |
| [lilToon](https://github.com/lilxyzw/lilToon) | 丰富的动画材质参数，MIT | 主要依赖 Unity 的 shader / 编辑器体系；本期不另做网页移植 |

MToon 的目标是卡通材质与 PBR 场景协调；其规范明确说明，它不专门解决日本手绘动画的全部表达问题。采用成熟材质消除了自制着色器的诸多不确定性，但**不保证任意 AI 法线能得到漂亮的脸**。脸部法线仍须简化成合适的大面；更严格的角色脸部明暗造型，后续可加入美术绘制的 shading-shift / 方向遮罩或 SDF，这些不属于本期已经实现的能力。

## 固定步骤及产物

| 步骤 | 输入 → 输出 | 通过条件 | 失败时回到 |
| --- | --- | --- | --- |
| 01 原画确认 | 参考 / 平涂 → `color.png` | 固有色、轮廓、线稿、透明背景清楚；已烘焙阴影有明确记录 | 原画制作 |
| 02 数据图制作 | 同一原画 → `normal.png`、`depth.png` | 三图同尺寸、同构图，法线方向一致，深度白近黑远 | 对应数据图生成或修图 |
| 03 数据检查 | 三图 → 法线 / 深度视图检查 | 不把头发颜色当深度；不把眼线当凹槽；手、刘海、颈部的前后关系合理 | 02 |
| 04 光照验证 | 三图 + 预设 → 左 / 正 / 右 / 上四个灯位 | 脸部明暗造型、线稿、固有色、接触处与投影都可读 | 02 或调节光照配方 |
| 05 留存复用 | 当前灯位 + 判断 → 检查记录、`lighting-recipe.json`、原尺寸 PNG | 参数与三张输入 SHA-256、渲染器版本一致；明确记录可用灯位和失败范围 | 对变更输入重新验证 |

“已载入”只表示完成素材载入；不是艺术检查通过。服务器检查记录保存在 `.web/studio/<sample>/`；记录绑定实际输入版本，每次检查独立追加，不覆盖其他人的记录。配方可以下载和重新导入；版本或素材不同会拒绝恢复。用户上传的自选图留在浏览器，可通过导出配方保留检查输入哈希；不会冒充内置已审素材。

制作流程页中的人物预览入口保留任务名。在预览台“使用制作任务产物”选择对应原画、法线、深度；缺文件时不能假装当前拆分流程已自动生成它。现有五条拆分 / 绘制管线的状态机保持其原有权威，光照检查不篡改 `.completed`。

## 样例生成与可追溯性

`demos/lighting-lab/` 包含三个原创平涂角色及 Jianma 导入。每个新角色的三个 prompt、生成原画、处理后的 PNG 和 `sample.json` 一并保留。样例用 `gpt-image-2`、high、1536×2048；生成不可保证字节可重现，因此留存输入、prompt、实际输出与哈希，不能把相同 seed / 提示词当作资产身份。

生成脚本只编排已安装的 imagegen CLI，不内置模型密钥，也不另写 SDK 调用。环境或私有配置提供服务信息：

```sh
python tools/lighting/generate-samples.py \
  --cli /path/to/imagegen/scripts/image_gen.py --stage color
# 查看原画，确认平涂及构图后，再生成对应数据图
python tools/lighting/generate-samples.py \
  --cli /path/to/imagegen/scripts/image_gen.py --stage maps
python tools/lighting/prepare-samples.py \
  --chroma-cli /path/to/imagegen/scripts/remove_chroma_key.py
```

可用 `--config /private/config.json` 读取 `base_url` / `api_key`，用 `--sample front` 限定一个样例。运行 Python 环境需要 imagegen CLI 的依赖以及 Pillow。已存在的生成文件只在 prompt、参考图及输出哈希与 generation receipt 一致时复用；有意重做时先备份旧版本，不覆写已审核的原始输出。生成日志在忽略目录 `.web/lighting-generation/`。

透明化只去除 chroma 背景，随后把原画 alpha 同步给法线 / 深度；不缩小、不放大，也不有损压缩源图。轮廓 alpha 相同并不代表内部几何自动对齐，仍需逐项目检。

## 渲染契约

- 原画 / 阴影颜色使用 sRGB，光照运算在线性空间完成；法线 / 深度始终是非颜色数据。关闭 tone mapping，不以曝光把脸提白。
- 亮面与暗面都乘同一张原画，线稿不被额外的白色高光覆盖。默认不启用轮廓补光；不使用塑料质感的高光项。
- 法线使用相机对齐的 object-space：+X 画面向右、+Y 向上、+Z 面向观察者。提供 Y 翻转和法线起伏检查；法线重新归一化。
- 主光与环境补光按固定总能量分配，环境增加时不会把亮面叠白。MToon 的 `shadingToonyFactor` 控制分界宽度，`shadingShiftFactor` 控制分界位置；投影强度独立。
- 深度先在原尺寸进行保留断层的滤波，保存为半精度浮点工作纹理，避免 8 位量化台阶被放大成碎阴影。原始 PNG 不变。该浮点深度同时用于固定正交视角的表面网格和逐像素接收坐标；颜色 UV / XY 不变。接收面连续，投影网格在深度断层处移除跨面三角形，避免虚构连接手和脸的侧壁。投影交给 Three.js 的标准深度阴影与 PCF 过滤，柔度单独可调。接收深度固定采样第 0 级，不把颜色纹理的 mipmap 缩小规则套给几何断层。
- 阴影网格约为 512 行，纹理仍以完整分辨率上传。网格分辨率和源图分辨率是不同预算；关闭或移动光源都不会降低原画尺寸。PNG 导出使用原图尺寸和透明背景，不截取低分辨率网页。

## 边界与下一步

单张深度只有当前视角可见表面。断层两侧的隐藏表面、背面和真实厚度无法凭空恢复；极侧光 / 背光、长距离投影、非常薄的手指可能失真。深度只是一张相对高度图，起伏参数不具有米制含义。边界穿帮先检查深度与投影偏移，不通过降低整图画质解决。

Jianma 原画已经有画师的明暗；导入预设偏保守。它是“保留原画后的附加打光”对照，不能宣称等价于真正无光照 albedo。

动画阶段必须共享颜色、法线、深度的最终变形，并更新方向；本期没有实现九轴、物理、表情或 Cubism 文件导出。完整生产计划仍依据[正式教程](../formal/README.md)，本文件仅固化已经可执行的静态光照流程。

本期的[实际验收记录](../../../web/studio/VALIDATION.md)包含浏览器标定、交互与美术检查范围。
