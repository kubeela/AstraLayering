---
本次运行信息（以下均为绝对路径）：
- 工作目录：{pipeline_directory}。
- 人物素体 KRA：{character_kra}。
- 衣服 KRA：{clothing_kra}。
- 简化穿衣角色参考图：{simplified_character}。
- Krita：{krita_executable}，版本 {krita_version}；沿用当前显示环境。
- 本次输出目录：{output_directory}；中间文件也放在这里。必须交付：{required_files}。
- 若已有进度，继续已有工程和本 thread 的工作。输入工程保持只读；run.json、.running、.completed 与调度日志由程序维护，不要改写。
- 本流程由你独立完成，无后续 reviewer。完成交付后按输出 schema 返回 status=completed 和 summary；普通组装与局部修正继续处理；仅必要输入缺失、损坏或工具故障导致无法执行时返回 blocked，说明具体路径或错误、恢复尝试和已保存进度。
