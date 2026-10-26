# Black White Doll：标准化、分层、换装与阴影结果

任务 `black-white-doll` 已完成到投影阴影，启用 standard，物理未运行。人物有 101 个节点、79 个叶子，衣服有 13 个节点、10 个叶子。

| 阶段 | 正式结果 |
| --- | --- |
| 输入与参考 | [原图](input/original.png) · [Standard](part-layering/references/standard.png) · [简化图](part-layering/references/simplified-subject.png) · [Base subject](part-layering/references/base-subject.png) · [衣服](clothing-part-layering/references/clothing.png) |
| 人物部件 | [SVG 总图](part-layering/preview.svg) · [分组](part-layering/groups.json) · [深度](part-layering/occlusion.json) |
| 人物 step01 | [KRA](raster-layering/step01/character-depth.kra) · [工程预览](raster-layering/step01/character-depth-snapshot.png) · [报告](raster-layering/step01/report.md) |
| 人物 step02 | [KRA](raster-layering/step02/character-soft-edges.kra) · [PNG](raster-layering/step02/character-soft-edges.png) · [报告](raster-layering/step02/report.md) |
| 人物 step03 | [KRA](raster-layering/step03/character-dressup-base.kra) · [PNG](raster-layering/step03/character-dressup-base.png) · [报告](raster-layering/step03/report.md) |
| 衣服部件 | [SVG 总图](clothing-part-layering/preview.svg) · [分组](clothing-part-layering/groups.json) · [深度](clothing-part-layering/occlusion.json) |
| 衣服 step01 | [KRA](clothing-raster-layering/step01/clothing-depth.kra) · [工程预览](clothing-raster-layering/step01/clothing-depth-snapshot.png) · [报告](clothing-raster-layering/step01/report.md) |
| 衣服 step02 | [KRA](clothing-raster-layering/step02/clothing-soft-edges.kra) · [PNG](clothing-raster-layering/step02/clothing-soft-edges.png) · [报告](clothing-raster-layering/step02/report.md) |
| 穿戴组装 | [KRA](character-assembly/step01/character-assembled.kra) · [PNG](character-assembly/step01/character-assembled.png) · [报告](character-assembly/step01/report.md) |
| 投影阴影 | [最终 KRA](shadow/mask/step01/character-shadowed.kra) · [最终 PNG](shadow/mask/step01/character-shadowed.png) · [面部检查](shadow/mask/step01/face-review.png) · [投影定义](shadow/mask/step01/shadows.json) · [验收](shadow/mask/step01/inspection.json) · [报告](shadow/mask/step01/report.md) |

![最终结果](shadow/mask/step01/character-shadowed.png)

保留登记产物、完整 SVG 部件、分组与深度、各阶段报告及明确引用的代表性图片。图像和 KRA 逐字节保留；两张 `-snapshot.png` 直接提取对应 KRA 的 `mergedimage.png`。报告和 JSON 只在归档副本中调整路径／格式，清单同时记录改写前后的哈希。

[manifest.json](manifest.json)记录来源、大小和 SHA-256。本目录是正式结果快照，未收录 agent 会话、凭据、临时脚本、全部查看截图和原生检查缓存。历史报告中的简写、通配符或只在源任务中存在的查看图引用按原记录保留，可在清单中追溯；归档不会伪造缺失证据或重画结果。
