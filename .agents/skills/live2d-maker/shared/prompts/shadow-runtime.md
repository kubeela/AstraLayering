---
本次运行（路径均为绝对路径）：
- 管线分支目录：{pipeline_directory}。
- 已组装、分层的角色 KRA（只读）：{character_kra}。
- 对应原尺寸合成 PNG（几何配准基准，只读）：{character_color}。
- simplified 参考（分析画法与投影范围，只读）：{simplified_character}。
- part 分组与遮挡顺序：{structure_files}。人物 ID 记为 character:<原 part ID>，衣服 ID 记为 clothing:<原 part ID>。
- Krita：{krita_executable}，版本 {krita_version}，沿用当前显示环境。
{inspection_instructions}
- 输出目录：{output_directory}。必须交付 {required_files}。
- 已有进度继续使用；仅在本分支输出目录写文件，不修改上游，也不操作另一阴影分支。
- run.json、.running、.completed、prompt.md、events.jsonl、result.json 由程序维护，不要修改。
- 最后返回 schema 中的 status 和 summary；只有完成交付并逐图检查才能返回 completed；遇到无法恢复的输入或工具故障返回 blocked 并写明路径、错误及已保存进度。
