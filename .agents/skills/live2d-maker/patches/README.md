# 可选兼容补丁

补丁源码、结构检查、构建与模拟验证统一存放在这里；运行时的 CLI 保护在 `shared/agents/`，Krita 进程环境在 `shared/krita/`。这些不是给制作 agent 新注册的执行工具。

| 功能 | .env 开关／选择 | 启动行为 |
| --- | --- | --- |
| Codex 图片数 compact | `layering_image_compact_threshold=<正整数>` | 未指定 `layering_codex_path` 时自动构建并复用缓存 |
| Codex 自定义生图 | 对应步骤选择 GPT／Nano，并填写对应 API | 与 compact 共用同一补丁，按所选路线实际需要准备 |
| AGV 响应头期限兼容 | `layering_agv_patch=true` | 自动检查已安装 CLI，准备独立受控副本，不需要 Rust |

Codex 的 Git、C/C++ 及平台编译依赖仍须可用。Rust 1.95.0 缺失时，启动器明确提示并在临时目录安装，构建后清理，不改用户环境。默认 Codex 内置生图且未开启 compact、未开启 AGV 补丁时不构建。

详细行为与验证见 [Codex](codex/README.md)、[AGV](agv/README.md)。显式指定已有补丁路径仍兼容，但必须通过能力／完整性检查。所有失败保留制作产物和会话，可修复依赖后用原总入口续跑。
