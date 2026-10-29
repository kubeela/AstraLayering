# 闭眼闭嘴角色：完整分层与阴影回归

任务 `closed-face-full-20261026` 于 2026-10-28 01:19（北京时间）完成六段管线。保留原半身构图，`standard=false`、`jobs=3`、`shadow-mode=mask`；默认表情为闭眼闭嘴。

![最终阴影合成](shadow/step01_mask/character-shadowed.png)

| 阶段 | 成果入口 |
| --- | --- |
| 输入与参考 | [原图](input/original.png) · [姿态参考](part-layering/references/standard.png) · [简化参考](part-layering/references/simplified-subject.png) · [素体参考](part-layering/references/base-subject.png) |
| 人物分件 | [分组](part-layering/groups.json) · [部件预览](part-layering/preview.svg) · [深度](part-layering/occlusion.json) |
| 人物分层绘制 | [KRA](raster-layering/step01/character-depth.kra) · [预览](raster-layering/step01/composite.png) · [报告](raster-layering/step01/report.md) |
| 人物边缘精修 | [KRA](raster-layering/step02/character-soft-edges.kra) · [PNG](raster-layering/step02/character-soft-edges.png) · [报告](raster-layering/step02/report.md) |
| 换装素体 | [KRA](raster-layering/step03/character-dressup-base.kra) · [PNG](raster-layering/step03/character-dressup-base.png) · [报告](raster-layering/step03/report.md) |
| 衣服分件 | [参考](clothing-part-layering/references/clothing.png) · [分组](clothing-part-layering/groups.json) · [部件预览](clothing-part-layering/preview.svg) |
| 衣服分层绘制 | [KRA](clothing-raster-layering/step01/clothing-depth.kra) · [预览](clothing-raster-layering/step01/composite.png) · [报告](clothing-raster-layering/step01/report.md) |
| 衣服边缘精修 | [KRA](clothing-raster-layering/step02/clothing-soft-edges.kra) · [PNG](clothing-raster-layering/step02/clothing-soft-edges.png) · [报告](clothing-raster-layering/step02/report.md) |
| 穿戴组装 | [KRA](character-assembly/step01/character-assembled.kra) · [PNG](character-assembly/step01/character-assembled.png) · [报告](character-assembly/step01/report.md) |
| 投影阴影 | [最终 KRA](shadow/step01_mask/character-shadowed.kra) · [最终 PNG](shadow/step01_mask/character-shadowed.png) · [关系表](shadow/step01_mask/shadows.json) · [原生检查](shadow/step01_mask/inspection.json) · [报告](shadow/step01_mask/report.md) |

## 验证与观察

画布为 1145×1374。人物工程含 41 个绘画层与 22 个透明度蒙版，组装后为 49 个绘画层与 32 个蒙版，最终阴影工程为 55 个绘画层、32 个蒙版与 9 个组。12 个隐藏眼口部件及其显隐关系保留。

最终衣服、组装、阴影 PNG 均与对应 KRA 保存的合成逐像素一致。6 处阴影关系、24 个声明偏移帧通过原生检查；75 份检查证据按记录哈希核对。完整验收摘要见 [validation.json](validation.json)。本轮也实际验证了人物 step01 → step02 独立会话切换及像素差异工具调用，图层与蒙版关系保持。

继续改进的观察点：

- 独立自然睁眼试验仍有眼白偏扁、睫毛／眼睑／虹膜细节不足及全局协调问题；当前成果保留默认闭眼闭嘴设计。
- 组装衣领中心比穿衣参考约深 27px，其他美术差异见各阶段报告。
- 两条侧发阴影以父组 `casterPartId` 兼容现有检查器，准确来源保存在 `sourcePartId` 与图层 UUID；动态跟随、Cubism 绑定和物理动画留待后续验证。

## 归档与查看

使用 skill 的成果导出入口收录正式 KRA、PNG、SVG、参考、完成记录、报告及其引用图片。阴影检查记录引用的原生证据发布到 `shadow/mask/step01/inspection/`，归档副本同步调整路径。KRA 和美术图片保持源文件字节；缺少固定预览的两个 step01 从 KRA 内的 `mergedimage.png` 提取合成。

[manifest.json](manifest.json)记录归档文件大小与 SHA-256，并保留 136 条历史图片引用解析提示，涉及自然语言、简写及组合路径。原任务中的 CLI 会话、环境配置、临时脚本和恢复备份保存在本机运行目录。本次执行包含 computer use 处理导出弹窗与重开异常。

在工作台将“工作目录”选为仓库 `demos/`，选择 `closed-face-full-20261026` 查看流程和角色素材。归档用于查看与继续编辑 KRA；制作续跑使用原任务目录。
