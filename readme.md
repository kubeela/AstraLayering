# AstraLayering

用 AI 将角色参考图制作成**可编辑、带遮挡补全的分层素材**。目前已有 Krita 人物分层、独立衣装与穿戴合成，也保留完整 SVG 重绘案例和面部参数实验。

[全部成果](./demos/readme.md) · [人物分件](./workflow-next/part-layering/README.md) · [Krita 绘制](./workflow-next/raster-layering/README.md) · [衣服工作流](./workflow-next/clothing-part-layering/README.md) · [SVG 对比预览器](./loading/part-preview.html)

## 现在能做到什么

### 人物与衣装：159 层 Krita 穿戴合成

左侧是简化后的穿衣参考，右侧是 **90 层人物素体 + 69 层衣装**的实际装配结果。头发、身体、袖片与衣襟按前后关系穿插，另有 12 个可关闭的穿戴遮罩；159 个源绘画层的像素保留，已核对保存重开。

[![穿衣参考与 159 层 Krita 穿戴合成对照](./demos/jianma-assembled/comparison.png)](./demos/jianma-assembled/README.md)

[案例与交互预览](./demos/jianma-assembled/README.md) · [下载 KRA](./demos/jianma-assembled/jianma-assembled.kra) · [人物分层与补全](./demos/gray-control-krita/README.md) · [边缘修画终稿](./demos/soft-edge-krita/README.md) · [换装素体](./demos/skin-base-krita/README.md)

### 独立衣服：从参考提取到分层修画

依次为简化穿衣角色、提取后的纯衣服参考和最终衣服。该次实跑拆出 **68 个逻辑 part、69 个普通绘画层**，保留薄纱、开口和跨深度衣片，交付可继续编辑的 KRA。

[![穿衣角色、纯衣服参考与最终 69 层衣装](./demos/clothing-workflows-20261019/images/comparison.png)](./demos/clothing-workflows-20261019/README.md)

[过程与限制](./demos/clothing-workflows-20261019/README.md) · [下载衣装 KRA](./demos/clothing-workflows-20261019/clothing-soft-edges.kra) · [透明 PNG](./demos/clothing-workflows-20261019/images/final-composite.png)

### SVG：Milly 与 Miku 分层重绘

以下两例均完成旧流程阶段 1–5，输出可编辑的分层 SVG；每张对照图左侧为该轮基础角色彩图，右侧为实际 SVG 终稿。

**Milly v1**：保留完整阶段产物与四个指定节点的独立审查；头发材质、手足局部仍有差异。

[![Milly v1 基础角色彩图与分层 SVG 终稿](./demos/milly-complete-case/reference-vs-svg.png)](./demos/milly-complete-case/readme.md)

[Milly 成稿 SVG](./demos/milly-complete-case/step05-base-character/05-2_局部色彩与材质.svg) · [阶段与审查记录](./demos/milly-complete-case/readme.md)

**Miku v3**：重点改进脸型、头型和发束包脸关系；局部线条与头发光泽仍有差异，终稿独立审查不可用。

[![Miku v3 基础角色彩图与分层 SVG 终稿](./analysis/miku-v3-review/01_整图对照.png)](./demos/miku-v3/readme.md)

[Miku 成稿 SVG](./demos/miku-v3/step05-base-character/05-2_局部色彩与材质.svg) · [案例说明](./demos/miku-v3/readme.md) · [同坐标复核](./analysis/miku-v3-review/readme.md)

**当前验证范围是静态素材与默认穿戴。** 隐藏区域由模型和绘制过程推断；局部笔触、结构和还原度仍有差异。完整运行包含人工检查与返修，衣服案例还用到外部恢复和结构修正。转向、关节变形、物理摆动及动态遮挡仍须绑定验证，实验见 [rigging](./rigging/readme.md)。

## 运行工作流

当前 TypeScript 工作流使用 Codex SDK / App Server 调度，按任务名保存输入与进度并支持续跑：

| 路线 | 分件与深度规划 | 绘制与交付 |
| --- | --- | --- |
| 人物 | [part-layering](./workflow-next/part-layering/README.md)：参考准备、分组、轮廓与遮挡补全 | [raster-layering](./workflow-next/raster-layering/README.md)：逐件生图 → Krita 拼装 → 边缘修画与 review → 换装素体 |
| 衣服 | [clothing-part-layering](./workflow-next/clothing-part-layering/README.md)：穿衣角色 → 纯衣服参考 → 分件 | [clothing-raster-layering](./workflow-next/clothing-raster-layering/README.md)：分层 KRA → 边缘修画与最多两轮 review／修复 |

分件步骤输出的 `preview.svg` 是**纯色轮廓控制图**；最终绘画由后续栅格步骤完成。部件数和深度由实际角色决定，90／69 层是上面案例的结果。

需要 **Node.js 24.12+、pnpm、可用的 Codex 环境及内置 `image_generation` 工具**；栅格步骤还需安装 Krita 并显式传入可执行文件。以人物路线为例，在仓库根目录执行：

```bash
pnpm --dir workflow-next/part-layering install --frozen-lockfile
pnpm --dir workflow-next/part-layering start --name my-character --image /绝对路径/角色.png

pnpm --dir workflow-next/raster-layering install --frozen-lockfile
pnpm --dir workflow-next/raster-layering start --name my-character --input ../part-layering/.run/my-character --krita /绝对路径/krita
```

续跑使用相同模块的 `start --name my-character`，输入与工程保存在各模块 `.run/<任务名>/`。分件及深度规划全部完成后再启动栅格步骤；衣服路线的命令和要求见上表。

## 使用 SVG 技能

在 Codex 中打开仓库，按需调用 `.agents/skills/` 中的技能；具体节点、依赖及限制见各自说明。

| 技能 | 提供的输入 | 产物 |
| --- | --- | --- |
| [live2d-layering](./.agents/skills/live2d-layering/SKILL.md) | 角色参考图、输出目录 | 人物分层 SVG 素体 |
| [live2d-clothing](./.agents/skills/live2d-clothing/SKILL.md) | 素体 SVG、穿衣参考图、输出目录 | 默认穿戴 SVG、独立衣装与穿插索引 |
| [live2d-expressions](./.agents/skills/live2d-expressions/SKILL.md) | 原 SVG、输出目录 | 12 轴基础面部参数、边界关键形与连续调节预览 |

```text
使用 $live2d-layering，完成角色分层与素体制作。
角色参考图：/绝对路径/角色.png
输出目录：/绝对路径/人物输出
```

## 查看与仓库导航

KRA 可直接在 Krita 中编辑；案例的 HTML 图层页需在本地打开，部分页面需要静态服务。可在仓库根目录运行 `python3 -m http.server 8000`，访问 [穿戴合成交互页](http://localhost:8000/demos/jianma-assembled/index.html)。GitHub 文件页只显示 HTML 源码。

[part-preview](./loading/part-preview.html) 可离线拖入 SVG／位图，进行并排、叠加及滑动对比；同时载入匹配的 `groups.json` 才显示分组控制。

| 目录 | 内容 |
| --- | --- |
| [demos](./demos/readme.md) | 统一成果入口：KRA、SVG、必要参考、过程记录与方法对比；原 `outputs/` 的 7 个有效案例已迁入 |
| [workflow-next](./workflow-next/) | 人物／衣服的分件与栅格工作流及维护工具 |
| [.agents/skills](./.agents/skills/) | SVG 人物分层、衣装与基础面部参数技能 |
| [analysis](./analysis/readme.md) / [rigging](./rigging/readme.md) | 差异复核、画法研究与绑定实验 |
| [tutorial](./tutorial/readme.md) / [archive](./archive/svg-layering/workflows/readme.md) | 学习资料与历史流程 |

欢迎通过 [Issues](https://github.com/wu-tian807/AstraLayering/issues) 或 [Pull Requests](https://github.com/wu-tian807/AstraLayering/pulls) 提交改进与案例。成果统一放入 `demos/`，附参考、工程入口和实际限制；未完成运行留在相应工作流的任务目录。
