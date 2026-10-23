## 共用 Krita 环境与故障恢复

继续使用现有 shell、computer use 或已验证的 Krita Python bridge，按实际任务选择操作方式；不要求新增工具、统一 Python 执行接口或强制启动私有插件。`--version` 成功只证明可执行文件可启动，不能证明文档操作和插件已经可用。

若自行通过 shell 启动独立 Krita，先验证最小插件/操作确实执行，再打开正式工程。macOS 私有 Python 插件进程必须同时把该子进程的 HOME 与 CFFIXED_USER_HOME 指向同一个私有目录，配置写入 `<私有目录>/Library/Preferences/kritarc`，插件放在 `<私有目录>/Library/Application Support/krita/pykrita/` 并启用。只设置 XDG_CONFIG_HOME、XDG_DATA_HOME、--resource-location 或 PYTHONPATH 不足以保证导入；bundled Krita 会重建 Python 搜索路径。Linux 使用其 XDG 配置与数据目录。仅对该 Krita 子进程设置隔离环境，不改当前 agent 的 HOME、登录环境、用户插件或全局 Krita 设置。

插件被发现、被启用、成功导入、实际执行、产物保存重开是不同检查项。出现 ModuleNotFoundError 时查看完整日志、实际 Python 搜索路径和原生配置位置，修复环境后先用只写执行标记的最小插件验证。优先复用已成功的操作通道；不能因为一次自建启动器失败，就断言 Krita 不可用或直接提交 blocked。

保持已有工程与会话。可恢复的路径、启动、bridge 错误先诊断修复再接续，禁止伪造交付、跳过验收或反复执行同一失败命令。只在必要输入、权限或工具仍真实不可用且已记录具体恢复尝试时报告执行障碍，由宿主 agent 继续处理环境并恢复原任务。绘画与质量判断仍按各阶段自己的提示词进行。
