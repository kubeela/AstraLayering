# Pink Elf：完整制作路线归档

本例来自本地任务 `pink-elf`，本轮于 2026-10-24 04:51（北京时间）由总调度完成。此目录替换原先停在 step02 的阶段性快照，供查看与下载，不作为可直接续跑的运行目录。

[![输入原图、完整穿戴合成与原生图层立体拆解](../../showcase/pink-elf-reference-composite-exploded.png)](../../showcase/pink-elf-reference-composite-exploded.png)

左半展示原图与完整合成，右半将 70 层人物、32 层衣装组合为后拖裙、后发、完整人物、裙装袖片与蝴蝶结挂饰五组，沿纵深展示结构。

| 阶段 | 产物入口 |
| --- | --- |
| 原图与人物分件 | [原图](input/original.png) · [参考](part-layering/references/base-subject.png) · [分组](part-layering/groups.json) · [深度](part-layering/occlusion.json) |
| 人物 step01 | [KRA](raster-layering/step01/character-depth.kra) · [报告](raster-layering/step01/report.md) |
| 人物 step02 | [KRA](raster-layering/step02/character-soft-edges.kra) · [PNG](raster-layering/step02/character-soft-edges.png) · [报告](raster-layering/step02/report.md) |
| 人物 step03 | [KRA](raster-layering/step03/character-dressup-base.kra) · [PNG](raster-layering/step03/character-dressup-base.png) · [报告](raster-layering/step03/report.md) |
| 衣服分件 | [分组](clothing-part-layering/groups.json) · [深度](clothing-part-layering/occlusion.json) · [分件预览](clothing-part-layering/preview.svg) |
| 衣服 step01 | [KRA](clothing-raster-layering/step01/clothing-depth.kra) · [报告](clothing-raster-layering/step01/report.md) |
| 衣服 step02 | [KRA](clothing-raster-layering/step02/clothing-soft-edges.kra) · [PNG](clothing-raster-layering/step02/clothing-soft-edges.png) · [报告](clothing-raster-layering/step02/report.md) |
| 穿戴组装 | [KRA](character-assembly/step01/character-assembled.kra) · [PNG](character-assembly/step01/character-assembled.png) · [报告](character-assembly/step01/report.md) |
| 投影阴影蒙版 | [最终 KRA](shadow/step01_mask/character-shadowed.kra) · [最终 PNG](shadow/step01_mask/character-shadowed.png) · [关系表](shadow/step01_mask/shadows.json) · [报告](shadow/step01_mask/report.md) |

![本轮最终合成](shadow/step01_mask/character-shadowed.png)

## 验证与保留问题

本轮人物 step01/02 和衣服已有成果保留，从人物 step03 重做后接续组装、阴影。归档时检查各阶段 KRA 完整性及现有导出 PNG 与工程内合成一致；阴影原生检查通过。这些检查不等于没有美术差异：肘部仍有原分片接色差异，袖下、裙下影带较明显，其他参考还原差异见各阶段报告。尚未制作 Cubism 绑定或动画。

## 归档范围

保留正式工程、导出图、参考、分件结构、review/repair 报告和报告引用的图像证据；不复制会话日志、运行脚本、私有 Krita 环境、缓存、锁和历史备份。历史报告及 JSON 按原文保留，部分本机路径、未收录脚本或观察图引用仅供追溯。完整工作记录仍在本机 `.run/pink-elf`；中间文件已整理到对应步骤的 `workspace/`。

[校验清单](manifest.json)记录每个复制文件的来源、大小和 SHA-256；复制文件与本轮运行产物逐字节一致。本目录不保留旧版 demos 或修复前工程备份。

## 2026-10-26 目录整理

未被报告引用的过程文件移入对应步骤的 `workspace/`，可解析的图像引用与清单位置同步更新。正式 KRA、PNG 和 SVG 的路径与内容保持不变；清单的 `source` 仍记录归档当时的历史出处。

part 的步骤记录由既有产物与报告机械重建，未重新调用模型；旧版 `stages/` 已删除，步骤目录是唯一记录，运行时不再自动转换旧目录。

目录校验发现原层级表中 `hair/back_hair/cap` 缺少完整的多深度检查记录；本次保留原深度与原文，不补造检查结论。
