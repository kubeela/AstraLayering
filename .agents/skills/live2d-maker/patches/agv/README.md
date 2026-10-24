# AGV 自定义网关的响应头期限

已验证的 Linux x64 AGV 1.4.4、1.4.5 默认等待响应头 60 秒。供应商尚未返回响应头时，CLI 会取消请求并重试；它与整个 print 回合的 `--print-timeout` 无关。工作流不提前返回虚假的 HTTP 200，也不忽略上游错误。

这是针对结构可确认构建的可选兼容补丁，不自动安装 CLI。先检查现有 CLI 和登录，在 `.env` 设置 `layering_agv_unlimited_response_header_timeout=true`；工作流首次使用 AGV 时自动准备独立副本，并校验复用。默认关闭，不需要 Rust。也可手动提前准备：

```bash
pnpm patch:agv --source /absolute/path/to/agy --dir /absolute/path/to/.run
```

脚本从 ELF/Go 函数表精确定位网关 Transport，验证目标指令，并检查 updater 对 `AGY_CLI_DISABLE_AUTO_UPDATE=true` 的实际识别方式。结构一致的新构建自动兼容，不依赖固定版本号或固定文件偏移；无法确认指令或开关时明确报错，未修改、未启动。仅将默认 `ResponseHeaderTimeout` 从 60 秒改成 0（无期限），独立副本放在 `<dir>/.runtime/agv/<source-sha256>/v2/`；原 CLI、连接/TLS 期限、权限检查和 HTTP 错误处理不变。macOS 等其他格式暂未验证，不适用。运行根目录必须已经存在且位于 skill 外。

返回的 `antigravity` 是受控启动入口：每次启动前验证 `antigravity.bin` 的完整 SHA-256，强制传入字符串 `true`（CLI 不接受 `1`），运行中和结束时再次检查文件是否被替换。CLI 如果仍启动自动更新，工作流明确报错并停止本次调用，保留会话与产物。旧补丁目录或已更新的副本在下次调用前重新做结构检查，兼容时创建新的受控副本，绝不按旧 `patch.json` 的声明直接运行。

自动模式的 `layering_agv_path` 可留空以查找原始 CLI，或指向已安装 CLI，无需记录生成路径。手动模式仍可把打印的路径写入 `.env`。关闭 `layering_agv_unlimited_response_header_timeout` 并清除已有补丁路径后恢复全局原 CLI。会话和产物不变，不要删除 threadId。不要提交生成的 CLI 或任务过程记录。

已验证构建的 `sir_flash_lite` 是 CLI 内置的安全预检查：在工具执行前查看近期推理和待执行操作，判断是否需要进一步安全审查。它不承担分层绘制或图像 review；嵌入配置为 `LOG` 模式、8 秒期限。实测中其 MINIMAL 请求报错后，主回合仍可完成，但检查本身失败，并产生额外请求和等待。这与主请求 60 秒响应头期限分别诊断，不关闭监视、不延长其专用期限，也不因这类内部日志重开已经成功交付的会话。

部分网关还把 CLI 的内部 MINIMAL 调用路由到只接受 LOW 的模型。已通过真实接口确认后，可设置 `layering_agv_minimal_thinking_level=LOW`。这只替换 MINIMAL，不修改绘制/review 的 LOW、MEDIUM、HIGH 请求；留空保留原协议。它不关闭内部监视，也不会修改其原生期限。

验证应包含：真实 CLI 等待超过 60 秒的响应头仍成功；HTTP 400/503 不误报成功；取消能及时结束；以及真实多图/工具调用的耗时和产物。不能以短请求跑通或进程仍存活代替这些检查。
