
- 输出目录：{output_directory}。必须交付 {required_files}。
- 已有进度继续使用；草稿和临时文件放在本步 workspace，完整产物、报告及报告图片放在本分支输出目录，不修改上游，也不操作另一阴影分支。
- run.json、.running、.completed、prompt.md、events.jsonl、result.json 由程序维护，不要修改。
- 最后返回 schema 中的 status 和 summary；只有完成交付并逐图检查才能返回 completed；遇到无法恢复的输入或工具故障返回 blocked 并写明路径、错误及已保存进度。

