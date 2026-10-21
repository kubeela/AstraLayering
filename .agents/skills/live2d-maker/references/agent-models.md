# 模型与 harness

编辑 skill 根目录 `.env`，完整键和默认值见 [example.env](../example.env)。每个小步骤使用 `layering_<步骤名>_model=<模型>-<力度>`；同一步骤的所有 group／part 共用，绘制、独立 review 和返修分别配置。最后的后缀是思考力度，不是模型 ID。

| CLI | 模型枚举 | 入口 |
| --- | --- | --- |
| Codex | `gpt-6.1-sol`、`gpt-6-astra` | SDK 默认入口，或 `layering_codex_path` |
| Claude Code | `claude-sonnet-5.5`、`claude-opus-5.5`、`claude-haiku-5.5` | `layering_claude_path`，未填则找全局 `claude` |
| Antigravity（agv） | `gemini-4-argon` | `layering_agv_path`，未填则找全局 `agy`／`agv`／`antigravity` |

支持力度 `low`、`medium`、`high`、`xhigh`。配置路径相对于 skill 根目录；模型是否获授权仍由用户的 CLI 登录或 provider 决定。pnpm 不安装 Claude Code 或 Antigravity。启动会明确报告缺失入口；缺少 CLI 或登录凭据时，调用 skill 的 agent 询问用户下一步，不自动安装或代替登录。

例如，仅把人物轮廓 review 改为 Argon，把衣服轮廓绘制改为 Sonnet：

```dotenv
layering_part_outline_review_model=gemini-4-argon-high
layering_clothing_outline_model=claude-sonnet-5.5-xhigh
layering_clothing_outline_repair_model=claude-sonnet-5.5-xhigh
```

没有覆盖时，各步骤沿用原来的模型与力度。旧 `layering_medium_model`／`layering_high_model` 仍可作为兼容默认值，具体小步骤配置优先。

## 生图选择

每个实际生图步骤配置 `layering_<步骤名>_image_model`，未填继承 `layering_default_image_model`，默认 `codex-native`。步骤包括人物姿态标准化、简化、素体、纯衣服 preparation，以及两套 raster step01。轮廓绘制和 review 的主要产物是 SVG，不属于实际生图步骤。

| 选择 | 配置 |
| --- | --- |
| `codex-native` | 外部 Codex 提供原生 imagegen，生图步骤的模型必须属于 Codex |
| `gpt-image-2.5-sunburst`／`gpt-image-2.5-flare` | `layering_openai_image_base_url`、`layering_openai_image_api_key`；协议为 `openai` |
| `gemini-nano-banana-2.1` | `layering_google_image_base_url`、`layering_google_image_api_key`；`layering_google_image_protocol` 明确选择 `gemini` 或 `openai` |

原生生图与非 Codex harness 的组合会在启动前报错。自定义生图注册 `image_generation` 函数工具，三个 CLI 均可使用；不需要 Codex 源码补丁。说明和 schema 在 [description.md](../shared/tools/image_generation/description.md) 和 [schema.json](../shared/tools/image_generation/schema.json)，绘图任务与验收要求保持各管线自己的版本。

OpenAI 兼容协议在 base URL 后追加 `/images/generations` 或 `/images/edits`；Gemini 原生协议追加 `/models/<模型>:generateContent`。参考图按顺序传入，输入文件不修改，生成结果保存在任务请求目录。接口是否能输出透明通道由模型能力决定；工具返回 `hasAlpha`，仍须按原要求看图和验收。

主模型网关与生图接口各自鉴权。Codex 默认继承当前用户配置；自定义 Codex provider 沿用 `layering_custom_provider` 和 provider URL／key。Claude／agv 可复用其已有登录，也可在 `.env` 填写 CLI 原生环境变量，例如 `ANTHROPIC_API_KEY`／`ANTHROPIC_BASE_URL`，或 `AGY_LLM_GATEWAY_API_KEY`／`AGY_LLM_GATEWAY_URL`／`AGY_LLM_GATEWAY_MODELS`／`AGY_LLM_GATEWAY_WIRE_PROTOCOL`。密钥不写入提示词、报告或 Git。

## 会话与记录

Claude／agv 的每次请求有独立工作区、私有配置和临时文件，均在 `<dir>/<name>/` 的 `agents/<请求>/` 下。仅从用户环境复用鉴权信息，隔离 CLI 的会话、项目设置及工具配置，不修改用户的全局配置。恢复同一 session 时复用原请求的私有会话数据；后续请求仍各有独立工作区。Antigravity 的 GenAI 自定义网关会转发原始工具定义，并保留工具返回的图片。

part 绘制 ID 和 harness 记录在各管线 `stages/sessions/<完整groupID>.json`，绘制与返修共用；独立 reviewer 每次新建。raster 的绘制 ID 仍记录在本管线 `run.json`，`.running`／`.completed`、两轮 review 和产物检查规则不变。

同一 CLI 内改变模型或力度继续恢复原会话。切换 CLI、删除 ID 或会话不可用时新建会话，旧请求记录与产物保留，ID 替换写入历史；新会话读取已有输入、产物及反馈继续。缺产物的正常退出仍报错并展示最后消息，不增加自动空产物重试。

`layering_image_compact_threshold` 仅作用于 Codex，并沿用现有带图压缩补丁；不自动改写其他 CLI 的压缩策略。
