# Agent 并发与服务错误恢复

2026-10-12：用户要求默认 agent 总并发降为 3，并将并发限制、重试剥离分组调度。项目安装的 SDK 和 CLI 均为 0.161.0。本次没有启动真实模型或修改 `.run/test`；下述原生行为使用安装的 CLI 对本机模拟 HTTP/SSE 服务验证。

## 独立调用层

`agent-runtime.ts` 管理执行队列、临时错误分类和退避，不导入 group、流程步骤或进度存储。`agents.ts` 将 SDK、一次性原生工具任务、保留绘制会话接入同一个 `AgentRuntime`。`workflow.ts`、`layering.ts` 与组内步骤不处理服务重试。

默认同时执行 3 个 agent 调用，使用 `--jobs` / `-j` 调整；`--agents` / `-a` 是同一上限的兼容别名。组任务不另设数量限制，只由树的层级依赖决定是否就绪。排队先到先执行，结束、异常、退避等待均释放执行位置。保留但空闲的绘制会话不占位置，因此不会因保留绘制窗口而阻塞 review。此限制共享于一次程序运行内，不协调多个独立启动的 CLI。

```sh
pnpm start --name test --agents 3
```

内部调用也可以通过 `AgentOptions.agentConcurrency` 指定；`runtime` 注入用于共享运行层或本地模拟验证。

## Codex 0.161.0 内置行为

SDK 的 `Thread.runStreamedInternal` 启动 `codex exec` 并转发事件，自己不实现服务重试。SDK 同一个 Thread 的下一次调用会执行 `exec resume <threadId>`。

CLI 有 HTTP 请求重试与流重连两层：[官方配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)给出默认 `request_max_retries = 4`、`stream_max_retries = 5`。HTTP 层重试 5xx 与传输错误，默认不在这一层重试 429；流层根据错误语义及服务端等待建议重连，使用指数退避与随机抖动。WebSocket 重连用完时还可能切换 HTTPS，并重新计算流重连次数，因此界面的 `…/5` 不是整个任务总请求数。发布版可能不展示第一次 WebSocket 重连通知，所以日志可能从 `2/5` 开始。

关键分支在固定版本的 [protocol/src/error.rs](https://github.com/openai/codex/blob/rust-v0.161.0/codex-rs/protocol/src/error.rs#L389)：`ServerOverloaded` 的 `retry_delay()` 只返回 `server_retry_delay()`，没有服务端等待建议就返回 `None`。[core/src/responses_retry.rs](https://github.com/openai/codex/blob/rust-v0.161.0/codex-rs/core/src/responses_retry.rs#L95) 会将这种错误直接交回，增加 `stream_max_retries` 不能改变错误本身是否允许重试。

本机原生模拟验证：

| 返回情况 | 测试配置 | 实际请求与终态 |
| --- | --- | --- |
| HTTP 503 | HTTP 重试 1、流重连 2 | 6 次 HTTP 请求，两个 `willRetry: true` 重连通知，最后 `willRetry: false`、turn failed。 |
| SSE `response.failed`，code 为 `server_is_overloaded`，无重试建议 | 同上 | 1 次请求，直接 `serverOverloaded`、`willRetry: false`、turn failed；与真实容量失败日志一致。 |

SSE 解析依据为 [responses_error.rs](https://github.com/openai/codex/blob/rust-v0.161.0/codex-rs/codex-api/src/sse/responses_error.rs#L81)。这是固定版本源码及实测结论，没有将所有 `willRetry: false` 解释为次数耗尽。

`error` 是通知，`willRetry: true` 表示 CLI 正在恢复；`willRetry: false` 也不应触发另一个 turn，须等待 `turn/completed` 的失败终态。SDK 的 `error` 事件同样可能是内置重连通知，不能一看到它就抛错并切断事件流。两条入口现在都等待终态后才处理外层恢复。

## 最终失败后的恢复

先让内置重试完整执行。最终失败仅限于可恢复的容量、临时服务、断流、连接或限流错误时，调用层再等待 5、10、20、40、60 秒，之后保持 60 秒；不设次数上限。认证、额度、上下文、输入、文件校验与主动取消不自动重试；HTTP 400、401、403 等也不按连接错误重试。退避不会占住并发位置，关闭会话可取消排队或等待。默认不设任务超时；调用者显式给出的 `timeoutMs` 覆盖本次调用及其排队和恢复。

原生任务在同一 thread 中开启继续任务的 turn；通道确实损坏且错误仍可恢复时，重新连接并 `thread/resume`。SDK 使用原 Thread 的 `exec resume`。程序不重新派发组，不清空产物，不重新初始化工具回调；每次逻辑 review 仍是独立新会话，其服务恢复属于该次 review。

恢复请求使用以下原文，并在已收到生图路径时附加已有路径：

> 继续刚才因临时服务错误中断的任务，沿用本会话中的原要求、输入和当前产物，从未完成处继续。已成功的操作和生图不重复执行；若已通过工具提交结果，不重复提交，只完成收尾回复。

这是续跑提示词，不能声称程序保证模型绝不重复任何工具。已有 `write_groups` 与 `submit_review` 防重复校验继续有效；生图次数仍靠原有提示词约束。模型已完成回合并通过最终 JSON 返回生图工具失败时，不由此机制重新生成。

每次尝试保留自己的请求、原始事件、可读过程与结果。前一次日志追加 `retry.scheduled`，记录序号、等待时长与原因；恢复请求记录原 thread ID。失败的单次尝试记录仍为 failed，组步骤在整个调用成功后才完成；重试不会增加视觉 review 或返修反馈轮号。不能恢复的错误继续交给原分组失败处理，结果列出具体组和步骤。

验证覆盖：三种调用入口共享限制、默认最多 3 个执行、异常释放位置、退避释放位置、超过 7 次失败后仍恢复、关闭取消、内置重连不中断、同 thread 继续、已提交工具不重放、已有生图路径复用、每次尝试落盘、CLI 参数相互独立。自动化测试只使用本地模拟进程。
