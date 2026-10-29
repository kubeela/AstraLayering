# 短袖短裤男孩：完整分层与阴影

任务 `clothed-man-20261028` 于 2026-10-29 06:58（北京时间）完成六段管线：人物分件、人物分层、衣服分件、衣服分层、穿戴组装和阴影蒙版。运行参数为 `standard=false`、`jobs=3`、`shadow-mode=mask`，画布 1024×1536。

![最终阴影合成](shadow/mask/step01/character-shadowed.png)

| 阶段 | 成果入口 |
| --- | --- |
| 输入与参考 | [原图](input/original.png) · [姿态参考](part-layering/references/standard.png) · [简化参考](part-layering/references/simplified-subject.png) · [素体参考](part-layering/references/base-subject.png) |
| 人物分件 | [分组](part-layering/groups.json) · [部件预览](part-layering/preview.svg) · [深度](part-layering/occlusion.json) · [深度预览](part-layering/occlusion/preview.svg) |
| 人物分层绘制 | [KRA](raster-layering/step01/character-depth.kra) · [预览](raster-layering/step01/composite.png) · [报告](raster-layering/step01/report.md) |
| 人物边缘精修 | [KRA](raster-layering/step02/character-soft-edges.kra) · [PNG](raster-layering/step02/character-soft-edges.png) · [报告](raster-layering/step02/report.md) |
| 换装素体 | [KRA](raster-layering/step03/character-dressup-base.kra) · [PNG](raster-layering/step03/character-dressup-base.png) · [报告](raster-layering/step03/report.md) |
| 衣服分件 | [参考](clothing-part-layering/references/clothing.png) · [分组](clothing-part-layering/groups.json) · [部件预览](clothing-part-layering/preview.svg) · [深度预览](clothing-part-layering/occlusion/preview.svg) |
| 衣服分层绘制 | [KRA](clothing-raster-layering/step01/clothing-depth.kra) · [预览](clothing-raster-layering/step01/composite.png) · [报告](clothing-raster-layering/step01/report.md) |
| 衣服边缘精修 | [KRA](clothing-raster-layering/step02/clothing-soft-edges.kra) · [预览](clothing-raster-layering/step02/composite.png) · [报告](clothing-raster-layering/step02/report.md) |
| 穿戴组装 | [KRA](character-assembly/step01/character-assembled.kra) · [PNG](character-assembly/step01/character-assembled.png) · [报告](character-assembly/step01/report.md) |
| 投影阴影 | [最终 KRA](shadow/mask/step01/character-shadowed.kra) · [最终 PNG](shadow/mask/step01/character-shadowed.png) · [关系表](shadow/mask/step01/shadows.json) · [原生检查](shadow/mask/step01/inspection.json) · [报告](shadow/mask/step01/report.md) |

## 结构与验证

- 人物：7 个顶层分组，人物工程含 54 个绘画层、3 个透明度蒙版和 3 个组；换装素体保持同一层结构。
- 衣服：短袖 T 恤和短裤 2 个顶层分组，拆为 14 个绘画层。
- 组装：68 个绘画层、7 个蒙版；最终阴影工程为 72 个绘画层、7 个蒙版、8 个组。
- 阴影：4 条正片叠底投影，即下巴→颈部、左右上眼睑→眼睛、T 恤下摆→短裤。`inspect_shadow_mask` 原生检查通过（Krita 5.3.4.1）。

## 运行观察

- 人物换装素体（raster step03）用时约 1 小时 53 分钟，一次通过交付检查。625 次工具调用中，工具执行约 9 分钟，其余为模型逐像素比对和 22 轮小范围修画（髋部转角、颈部、肩带、裆部衣缘）。修画轮数尚无上限，后续可考虑在提示词中给出停止标准。
- 人物分层 step01 长时间运行后，上下文压缩摘要被 Claude 安全过滤拦截，CLI 只报出“未返回成功终态”而失败；这次失败促成了 PR #177 的拒绝恢复机制。之后手动续跑原 thread，经一轮审核通过。轮廓审核中共 19 次图片内容策略拦截，均自动重试通过。
- 部分报告保留了原运行目录的绝对路径；归档按源文件字节保存，未改写。

## 归档与查看

使用 skill 的成果导出入口（`pnpm export`）生成：收录正式 KRA、PNG、SVG、参考、完成记录、报告及其引用图片，共 1682 个文件。[manifest.json](manifest.json) 记录归档文件大小与 SHA-256，并保留 45 条未找到的历史图片引用提示。CLI 会话、环境配置和恢复备份保存在本机运行目录，不随归档发布。

在工作台将“工作目录”选为仓库 `demos/`，选择 `clothed-man-20261028` 查看流程和角色素材。归档用于查看与继续编辑 KRA；制作续跑使用原任务目录。
