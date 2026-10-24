# 可选兼容补丁

补丁源码、结构检查、构建与模拟验证统一存放在这里；容量控制和视觉压缩共用实现位于 `shared/visual-context.ts`，Claude Messages 接入位于 `claude/gateway.ts`；工作流桥接只调用补丁模块。Krita 进程环境在 `../shared/krita/`。这些不是给制作 agent 新注册的执行工具。

| 功能 | .env 开关／选择 | 启动行为 |
| --- | --- | --- |
| Codex 图片数 compact | `layering_image_compact_threshold=<正整数>` | 未指定 `layering_codex_path` 时自动构建并复用缓存 |
| 三种 CLI 图片／请求体预算 | `layering_<codex/claude/agv>_image_compact_threshold` / `layering_<codex/claude/agv>_request_compact_mib` | 留空关闭；按实际发送内容检查，带图分批压缩，保留最新图与恢复记录 |
| Codex 自定义生图 | 对应步骤选择 GPT／Nano，并填写对应 API | 与 compact 共用同一补丁，按所选路线实际需要准备 |
| AGV 响应头期限兼容 | `layering_agv_unlimited_response_header_timeout=true` | 自动检查已安装 CLI，准备独立受控副本，不需要 Rust |

Codex 的 Git、C/C++ 及平台编译依赖仍须可用。Rust 1.95.0 缺失时，启动器明确提示并在临时目录安装，构建后清理，不改用户环境。默认 Codex 内置生图且未开启 compact、未开启 AGV 补丁时不构建。

详细行为与验证见 [Codex](codex/README.md)、[AGV](agv/README.md)；外部 LiteLLM 的错误透传回调见 [LiteLLM](litellm/README.md)。显式指定已有补丁路径仍兼容，但必须通过能力／完整性检查。所有失败保留制作产物和会话，可修复依赖后用原总入口续跑。

## 图片容量保护

上限属于实际模型／网关路由，不属于 CLI 名字。旧 `layering_image_compact_threshold` 仍只用于 Codex；专用 Codex 键优先。每个接口独立配置图片数和 MiB 预算，不预设所有接口都有 50 张或 100 MiB 限制。预算是提前压缩的触发值，不能改变服务端硬上限。Codex 字节预算要求补丁能力 `request_compaction_version: 1`；旧图片数能力仍为 v2。

AGV 的保护需要已配置的 GenAI 网关，Claude 支持 Messages 路由（包括已有自定义 base URL），保留原鉴权及原生自动压缩。未支持的 AGV 协议或 Claude Bedrock／Vertex／Foundry 路由启用保护时明确报错，不静默忽略 `.env`。

- 共用模块先检查最终 JSON 字节数及内联图片数，包含 Base64、全部文字和工具定义。摘要请求本身也遵守预算，超出时分批；单个多图工具结果无需重跑。
- AGV／Claude 保留原有文字、调用／结果配对与签名，只把实际完成视觉总结的旧图片替换为有出处的视觉记忆。尽量保留最近四张；预算不足时至少保留最新一张。任务指定的必要参考图保留原图。无法容纳必要输入时明确失败并保留历史。
- 每批成功且有完整终态、非空摘要后，原图、摘要及状态原子写入 CLI 会话的 `cli-data/visual-context/`；续跑复用成功批次。失败、空摘要、截断和不完整 SSE 不替换图片。该目录始终在任务请求记录内，不写用户全局 CLI 配置。
- 默认不做无损去重。`layering_agv_image_deduplicate=true` 或 `layering_claude_image_deduplicate=true` 只去掉更老的重复图片数据：字节和已知来源／裁剪／倍率／模式都一致才合并，最新图片保留完整原图并标注唯一 ID，旧位置保留文字、坐标和调用记录并引用该 ID。不同位置的相同空白截图不合并，未识别上下文时保守匹配。Codex 继续原生带图 compact，没有独立去重开关。

CLI 退出／压缩失败不会标记制作完成，也不删除草稿、反馈或旧会话。修改 `.env` 后按原入口恢复；无需更改绘图要求、模型或 review 轮次。

本地真实 CLI 验证入口（使用模拟上游，不消耗模型额度）：

```sh
node patches/shared/cli-visual-smoke.ts --harness agv
node patches/shared/cli-visual-smoke.ts --harness claude
```
