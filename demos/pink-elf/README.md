# Pink Elf：标准模式的阶段性归档

本例来自本地任务 pink-elf-20261020，2026-10-21 在第二步返修期间按用户要求停止。它用于审核分层成果及工作流问题，**尚未完成标准模式全部五阶段，也未通过最终美术验收**。本次仅归档已有产物，没有重新绘制或继续任务。

| 阶段 | 当前状态与入口 |
| --- | --- |
| 原图与标准化参考 | [原图](input/original.png) · [标准化图](part-layering/references/standard.png) · [人物参考](part-layering/references/base-subject.png) |
| 人物分件 | 已完成；82 个节点、65 个终止 part。[预览 SVG](part-layering/preview.svg) · [分组树](part-layering/groups.json) · [深度表](part-layering/occlusion.json) |
| 人物分层与补全 | step01 已完成。[KRA](raster-layering/step01/character-depth.kra) · [工程内预览](raster-layering/step01/character-depth-snapshot.png) · [报告](raster-layering/step01/report.md) |
| 边缘修画 | step02 返修未完成。[当前 KRA](raster-layering/step02/character-soft-edges.kra) · [工程内预览](raster-layering/step02/character-soft-edges-snapshot.png) · [首次审核](raster-layering/step02/review-01.md) · [未完成的修复记录](raster-layering/step02/repair-01-attempt-20261021-1002.md) |
| 换装素体、衣服分件、衣服栅格及最终组装 | 尚未执行，不提供完成结论。 |

![停止时已保存工程的合成预览](raster-layering/step02/character-soft-edges-snapshot.png)

## 审核上下文

首次 reviewer 报告列出 10 项修复问题和 3 项“待确认”事项。原绘制会话将标准冲突当作等待外部确认的阻碍，因此没有完成返修。报告保留原文，用于解释本次工作流改动，不代表新规范仍允许这种中间态。step02/report.md 是初次绘制的历史自检记录，其通过说法被后续独立审核否定。

修复记录来自较早的一次未完成尝试；此后继续修画又被用户停止。当前 KRA 可能包含记录之后保存的改动，不能用旧报告证明当前工程已经通过。原有 PNG 按原样保留；文件名带 -snapshot 的 PNG 直接提取自对应 KRA 的 mergedimage.png，用于展示这份已保存工程，未另行渲染或改画。

## 归档范围

保留原图、参考、完整 SVG 分件、轮廓／去重／补全检查记录、深度表、两步 KRA、导出图和首次 reviewer 的图像证据。[清单](manifest.json)记录来源、大小与 SHA-256，复制的文件与本地来源逐字节一致。

逐次观察图、agent 日志、会话、工具脚本、缓存、锁、运行状态及备份不收录。历史 JSON 和报告中的本机路径、未收录观察图引用按原文保留，只用于追溯；本目录是供查看的快照，不是可直接续跑的任务目录。运行数据继续保存在被 Git 忽略的 .run/，没有移动或修改该目录。
