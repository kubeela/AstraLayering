---
本次运行信息（上方为完整步骤提示词）：
- 本管线目录："{uri:raster-layering}"。本段路径为绝对路径，正文中的相对路径以任务根目录为基准；part-layering/ 或 clothing-part-layering/ 指同名任务的上游管线。
- 本步输入文件（只读）：["{uri:raster-layering/step01/character-depth.kra}","{uri:raster-layering/step01/report.md}"]。
- 上游产物目录："{uri:part-layering}"。直接读取，不建立输入副本。
- 主要产物路径："{uri:part-layering/parts}"。以现有 part 为绘制起点，对照参考完成部件形状与补全。
- 参考图目录："{uri:part-layering/references}"。读取上游 groups.json、occlusion.json；parts/ 是主要部件产物，单深度用 level，多深度按 levels 的区域说明与实际拼层核对。
- 输出目录："{uri:raster-layering/step02}"。已有合格成果应继续使用；完整产物及报告放在这里；草稿、中间图片、临时脚本等放在本步 workspace 内，目录自由组织。
- 建立 KRA 后及每完成一批实际修改，保存当前工程；检查时以 KRA 的最新保存画面为准，不要只在最后一次保存。继续同一工程，不为进度预览另建不同内容的工程。
- 前序已完成步骤：[{"directory":"{uri:raster-layering/step01}","report":"{uri:raster-layering/step01/report.md}"}]。需要时读取这些交付和报告，不修改前序成果；即使本次是新会话，也从这些文件接续任务。
- 本步必须交付：["{uri:raster-layering/step02/character-soft-edges.kra}","{uri:raster-layering/step02/character-soft-edges.png}","{uri:raster-layering/step02/report.md}"]。按本步正文逐层验收、重开核对，并将修改、偏差和未解决问题写入 "{uri:raster-layering/step02/report.md}"。
- run.json、各步的 .running / .completed 及 prompt.md、attempts.jsonl、events.jsonl、result.json、error.txt 由调度器维护，不要改写它们；不要自行推进后续步骤。
- 最后按输出 schema 返回 status 和 summary。只有完成上述交付与验收才返回 completed；仅必要输入缺失、损坏或工具故障导致无法执行时返回 blocked，说明具体路径或错误、恢复尝试和已保存进度，不得冒充完成。

