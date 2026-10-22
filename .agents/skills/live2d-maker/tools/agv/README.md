# AGV 自定义网关的响应头期限

已验证的 Linux x64 AGV 1.4.4 默认等待响应头 60 秒。供应商尚未返回响应头时，CLI 会取消请求并重试；它与整个 print 回合的 `--print-timeout` 无关。工作流不提前返回虚假的 HTTP 200，也不忽略上游错误。

本脚本是针对这一已确认构建的可选兼容补丁，不自动安装 CLI，不改默认入口。先检查现有 CLI 和登录，再执行：

```bash
pnpm patch:agv --source /absolute/path/to/agy --dir /absolute/path/to/.run
```

脚本校验完整 SHA-256 和目标指令，仅将默认 `ResponseHeaderTimeout` 从 60 秒改成 0（无期限），把独立副本放到 `<dir>/.runtime/agv/<source-sha256>/antigravity`。原 CLI、连接/TLS 期限、权限检查和 HTTP 错误处理不变。未知构建直接报错，不猜测补丁位置；macOS 等其他构建暂未验证，不适用。运行根目录必须已经存在且位于 skill 外。

将打印的 `layering_agv_path=...` 写入本地 `.env` 即可使用；清除此项恢复全局原 CLI。会话和产物不变，不要删除 threadId。不要提交生成的 CLI 或任务过程记录。

已验证构建的 `sir_flash_lite` 是 CLI 内置的安全预检查：在工具执行前查看近期推理和待执行操作，判断是否需要进一步安全审查。它不承担分层绘制或图像 review；嵌入配置为 `LOG` 模式、8 秒期限。实测中其 MINIMAL 请求报错后，主回合仍可完成，但检查本身失败，并产生额外请求和等待。这与主请求 60 秒响应头期限分别诊断，不关闭监视、不延长其专用期限，也不因这类内部日志重开已经成功交付的会话。

部分网关还把 CLI 的内部 MINIMAL 调用路由到只接受 LOW 的模型。已通过真实接口确认后，可设置 `layering_agv_minimal_thinking_level=LOW`。这只替换 MINIMAL，不修改绘制/review 的 LOW、MEDIUM、HIGH 请求；留空保留原协议。它不关闭内部监视，也不会修改其原生期限。

验证应包含：真实 CLI 等待超过 60 秒的响应头仍成功；HTTP 400/503 不误报成功；取消能及时结束；以及真实多图/工具调用的耗时和产物。不能以短请求跑通或进程仍存活代替这些检查。
