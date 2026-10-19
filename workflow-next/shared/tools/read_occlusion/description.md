读取本任务对应上游 part 管线的 occlusion.json，返回实际路径、当前 revision 和完整深度表。修改前先读取；revision 用于防止旧读数覆盖新的修改。工具不读取其他任务或输入副本。
