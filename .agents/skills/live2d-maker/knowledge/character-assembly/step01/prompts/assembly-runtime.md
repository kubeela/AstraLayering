---
本次运行信息（以下均为绝对路径）：
- 管线目录："{uri:character-assembly}"。
- 人物素体 KRA："{uri:raster-layering/step03/character-dressup-base.kra}"。
- 衣服 KRA："{uri:clothing-raster-layering/step02/clothing-soft-edges.kra}"。
- 简化穿衣角色参考图："{uri:part-layering/references/simplified-subject.png}"。
- 本次输出目录："{uri:character-assembly/step01}"；完整产物和报告放在这里；中间文件放在本步 workspace 内，目录自由组织。必须交付：["{uri:character-assembly/step01/character-assembled.kra}","{uri:character-assembly/step01/character-assembled.png}","{uri:character-assembly/step01/report.md}"]。
- 若已有进度，继续已有工程和本 thread 的工作。输入工程保持只读；run.json、.running、.completed 与调度日志由程序维护，不要改写。
- 本流程由你独立完成，无后续 reviewer。完成交付后按输出 schema 返回 status=completed 和 summary；普通组装与局部修正继续处理；仅必要输入缺失、损坏或工具故障导致无法执行时返回 blocked，说明具体路径或错误、恢复尝试和已保存进度。

