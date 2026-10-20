# 人物光照验证素材

三个生成测试角色已退出日常工作台入口；原图、提示词和验证记录留在此处作为研究归档。打开制作工作台顶部 **角色工作台**（`./studio`），以 KRA / PSD 文件开始；Jianma 快捷入口直接打开其 159 层 KRA。渲染基础为 Pixiv MToon 3.5.5 + Three.js 0.180.0；完整操作与选型依据见[静态光照工作流](../../tutorial/live2d-guidance/workflows/lighting-preview.md)。

| 样例 | 原画 / 法线 / 深度 | 来源 | 适合观察 |
| --- | --- | --- | --- |
| 正面长发 | [原画](front/color.png) · [法线](front/normal.png) · [深度](front/depth.png) | gpt-image-2，1536×2048 | 脸部大面、前发与衣褶 |
| 手靠近侧脸 | [原画](hand-face/color.png) · [法线](hand-face/normal.png) · [深度](hand-face/depth.png) | gpt-image-2，1536×2048 | 手指、刘海、下颌与颈部关系 |
| 转身抬臂 | [原画](turn/color.png) · [法线](turn/normal.png) · [深度](turn/depth.png) | gpt-image-2，1536×2048 | 抬臂、宽袖、腰带、裙子与腿 |
| Jianma | [原画](jianma/color.png) · [法线](jianma/normal.png) · [深度](jianma/depth.png) | 现有皮套及配套贴图，1024×1536，逐字节导入 | 已有绘制明暗上的附加打光 |

每个目录的 `sample.json` 记录来源、尺寸、法线 / 深度约定、处理过程与 SHA-256。三个新样例保留 `generated-color.png`、`normal-generated.png`、`depth-generated.png` 原始生图输出；对应 prompt 和 `*-generation.json` 记录也保留。绿幕透明化不缩放、不有损压缩人物；法线和深度复制同一原画 alpha。

[工作台界面](../../web/demo-screenshots/05-character-studio.png) · [四个人物 × 三种灯位对照](review-sheet.png)。对照表是审阅缩略图，完整贴图见上表，工作台可按原尺寸导出 PNG。

## 本轮观察

- 正面样例的左右光可以辨认脸部、发束及布料的明暗面；亮面保持原来的固有色。
- 手靠近脸样例在左光下更接近常见的动画明暗造型。右光与顶光会出现更复杂的脸部投影，可用于检查 AI 深度是否需要进一步修图；不能把它当作“所有灯位都已达到画师手绘质量”。
- 抬臂样例展示了宽袖、领口和裙摆的方向变化；高位侧光下大片暗面是当前法线和参数的结果，仍可调整明暗位置、环境补光和投影强度。
- Jianma 使用“保留原画”预设，重点是克制附加明暗。源图已有阴影和高光，因此不能当成真正去光照的 albedo。

本轮建立了可比较和复用的静态预览基线；未宣称任意 AI 数据图都能自动达到 B 站作品的美术水平，也未宣称单张深度等价于完整三维模型。后续根据实际角色选择修法线、修深度或加入美术明暗控制，仍在这一预览台验证。
