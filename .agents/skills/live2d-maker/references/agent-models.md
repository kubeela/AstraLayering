# 模型与 harness

首次配置时，先按[推荐模型方案](model-presets.md)确认用户选择；已有 `.env` 继续使用，只有用户要求时才调整。

编辑 skill 根目录 `.env`，完整键和默认值见 [example.env](../example.env)。LLM 使用 `layering_agent_<职责>_model=<模型>-<力度>`，人物与衣服共用，同一职责的所有 group／part 共用。最后的后缀是思考力度，不是模型 ID。

| 职责 | 配置名中间部分 | 覆盖步骤 |
| --- | --- | --- |
| preparation | `preparation` | 全部准备 agent，包括姿态／画风判断和生图执行；默认 Codex low |
| part 绘制 | `part_draw` | 人物与衣服轮廓绘制、返修 |
| part review | `part_review` | 人物与衣服独立轮廓 review |
| 去重 | `part_reduce` | 两套 part 的同层去重 |
| 补全 | `part_completion` | 两套 part 的 SVG 遮挡补全 |
| 分组 | `part_groups` | 两套 part 的首次分组及后续细分组 |
| 深度分析 | `part_depth` | 两套 part 最后的遮挡层级规划，写入 occlusion.json |
| raster step01 | `raster_step01` | 人物与衣服的分层、补全和 KRA 交付 |
| raster step02 | `raster_step02` | 人物与衣服的边缘修画及 review 后返修 |
| raster step02 review | `raster_step02_review` | 两套 raster 的独立 reviewer |
| raster step03 | `raster_step03` | 仅人物的去除连体服 |
| 穿戴组装 | `assembly` | 人物与衣服 KRA 组装 |

SVG 合并由程序执行，不配置 LLM。内部步骤名和人物／衣服的提示词、日志、产物、review 轮次及续跑规则仍各自保留。

| CLI | 模型枚举 | 入口 |
| --- | --- | --- |
| Codex | `gpt-6.1-sol`、`gpt-6-astra` | SDK 默认入口，或 `layering_codex_path` |
| Claude Code | `claude-sonnet-5.5`、`claude-opus-5.5`、`claude-haiku-5.5` | `layering_claude_path`，未填则找全局 `claude` |
| Antigravity（agv） | `gemini-4-argon` | `layering_agv_path`，未填则找全局 `agy`／`agv`／`antigravity` |

支持力度 `low`、`medium`、`high`、`xhigh`。配置路径相对于 skill 根目录；模型是否获授权仍由用户的 CLI 登录或 provider 决定。pnpm 不安装 Claude Code 或 Antigravity。启动会明确报告缺失入口；缺少 CLI 或登录凭据时，调用 skill 的 agent 询问用户下一步，不自动安装或代替登录。

例如，将两套 part 的 review 改为 Argon：

```dotenv
layering_agent_part_review_model=gemini-4-argon-high
```

没有覆盖时，preparation 全部为 `gpt-6.1-sol-low`，其余职责保持原来的默认模型与力度。统一职责配置优先；旧 `layering_<小步骤>_model` 在同一职责的已填写值一致时可以继续读取，冲突时明确指出旧键并要求填写对应统一键，不自动改写 `.env`。旧 `layering_medium_model`／`layering_high_model` 仍作为最后的兼容默认值。

## 生图选择

每个拥有生图工具的 agent 使用 `layering_<步骤名>_image_model`，未填继承 `layering_default_image_model`，默认 `codex-native`。生图配置保留实际步骤粒度，人物和衣服分别选择：

- preparation：人物标准化、简化、素体，衣服的纯衣服参考准备。
- part：人物／衣服轮廓绘制及返修。它们主要交付 SVG，但原有生图能力仍可配置。
- raster：人物 step01、step02、step02 review／返修、step03；衣服 step01、step02、step02 review／返修。
- 穿戴组装 agent。

这张配置表描述工具能力；原任务要求继续约束使用范围，reviewer 仍只提交反馈。姿态／画风判断、首次分组、part review、去重、SVG 补全、细分组和深度分析没有开启生图，不增加生图配置。

| 选择 | 配置 |
| --- | --- |
| `codex-native` | 直接继承外部 Codex 原生 imagegen，不启用生图补丁；模型必须属于 Codex |
| `gpt-image-2.5-sunburst`／`gpt-image-2.5-flare` | `layering_openai_image_base_url`、`layering_openai_image_api_key`；协议为 `openai` |
| `gemini-nano-banana-2.1` | `layering_google_image_base_url`、`layering_google_image_api_key`；`layering_google_image_protocol` 明确选择 `gemini` 或 `openai` |

所有拥有生图工具的步骤，`codex-native` 与非 Codex harness 的组合都会在启动前报错。Codex 选择具体 GPT 或 Nano Banana 模型时，使用同一份[原生补丁](../tools/codex/README.md)：先配置对应 API 和 `layering_codex_path`，启动前检查 `image_provider_version: 2`。工作流为本请求启动本地生图路由，原生 imagegen 负责工具调用、保存图片和事件；路由复用共享 OpenAI／Google 协议适配，模型与凭据不进入提示词。`codex-native` 不启动此路由，也不注入自定义生图配置。

Claude／AGV 继续注册共享 `image_generation` 函数工具，不使用 Codex 补丁。其 [description.md](../shared/tools/image_generation/description.md) 与 [schema.json](../shared/tools/image_generation/schema.json) 保持统一；Codex 使用原生工具定义。两条路径共用同一底层接口实现，调用者都只关心绘图要求和参考图。绘图任务与验收要求保持各管线自己的版本。

OpenAI 兼容协议在 base URL 后追加 `/images/generations` 或 `/images/edits`；Gemini 原生协议追加 `/models/<模型>:generateContent`。参考图按顺序传入，输入文件不修改，生成结果保存在任务请求目录。接口是否能输出透明通道由模型能力决定；共享函数工具返回 `hasAlpha`，原生工具路径也应检查实际 PNG。棋盘格图不等于透明通道，仍须按原要求看图和验收。

调用者统一提出透明 PNG 要求。GPT 图像模型保留返回的原生 alpha，不走纯色抠图。Nano 请求透明背景时，共享适配器在生图前分析第一张目标参考的主体颜色，从纯绿、纯蓝、纯红中推荐一个背景色，并通过[纯色背景要求](../shared/prompts/nano-solid-background.md)明确传给生图模型。原绘制任务完整保留，实际生图请求使用不透明背景。返回后仍采样四周的实际背景颜色，在 Krita 内嵌 Python 中用 ViTMatte 估计透明度、恢复前景颜色，最终交回透明 PNG。明确选择 `auto`／`opaque` 的请求不追加要求、不抠图。返回真实 alpha 时直接保留。

选色忽略透明像素的 RGB 和可识别的原背景，不让后续控制图／画风参考的颜色参与主体色盘。优先避开即使面积很小的同色细节，再比较与主体色相的分离程度；有彩色原背景时使用近不透明颜色锚点降低透色干扰。候选评分、原背景、选色理由写入 `background-selection.json`。没有图像参考时使用纯绿并记录原因；三色都有近色冲突时选综合风险最低者并记录冲突，不声称能无误判。选色是推荐，无法凭单张 RGB 图唯一恢复材料透明度。

Nano 后处理不改变生成图尺寸和比例；工作流仍负责后续等比缩放与配准。原始 RGB 生图和后处理记录保存在本次请求的 `generated/` 下的 `image-processing/<id>/`，没有可靠纯色背景时明确报错并指出原图路径。半透明材料仍须逐图检查，不能仅凭存在 alpha 声称恢复准确；ViTMatte 和前景颜色恢复已用于 Nano 透明后处理；包在首次实际使用时自动装到运行根目录 `.runtime/`，后续复用。

主模型网关与生图接口各自鉴权。Codex 默认继承当前用户配置；自定义 Codex provider 沿用 `layering_custom_provider` 和 provider URL／key。Claude／agv 可复用其已有登录，也可在 `.env` 填写 CLI 原生环境变量，例如 `ANTHROPIC_API_KEY`／`ANTHROPIC_BASE_URL`，或 `AGY_LLM_GATEWAY_API_KEY`／`AGY_LLM_GATEWAY_URL`／`AGY_LLM_GATEWAY_MODELS`／`AGY_LLM_GATEWAY_WIRE_PROTOCOL`。密钥不写入提示词、报告或 Git。

AGV 的 GenAI 网关 base URL 可以包含 `/v1beta`，转发会保留供应商前缀并避免重复追加 API 路径。请求日志记录实际图片数、请求字节数、上游响应头与首条内容时间，不记录正文或鉴权。

部分供应商不接受 CLI 内部请求使用的 `MINIMAL`。`layering_agv_minimal_thinking_level` 默认留空，完整保留原生协议；只有实际接口确认不支持时才显式填写 `LOW`、`MEDIUM` 或 `HIGH`，仅替换 MINIMAL。支持 MINIMAL 的上游无需设置，不统一降低或改写 agent 的力度。若遇到 CLI 自身 60 秒响应头期限，按[可选 AGV 兼容补丁](../tools/agv/README.md)核对构建并验证；不自动安装、修改全局 CLI 或重建会话。

## 会话与记录

Claude／agv 的每次请求有独立工作区、私有配置和临时文件，均在 `<dir>/<name>/` 的 `agents/<请求>/` 下。仅从用户环境复用鉴权信息，隔离 CLI 的会话、项目设置及工具配置，不修改用户的全局配置。恢复同一 session 时复用原请求的私有会话数据；后续请求仍各有独立工作区。Antigravity 的 GenAI 自定义网关会转发原始工具定义，并保留工具返回的图片。

part 绘制 ID 和 harness 记录在各管线 `stages/sessions/<完整groupID>.json`，绘制与返修共用；独立 reviewer 每次新建。raster 的绘制 ID 仍记录在本管线 `run.json`，`.running`／`.completed`、两轮 review 和产物检查规则不变。

同一 CLI 内改变模型或力度继续恢复原会话。Codex 的生图模型改变时，重启本请求的原生通道并恢复原 thread，已有产物保留。切换 CLI、删除 ID 或会话不可用时新建会话，旧请求记录与产物保留，ID 替换写入历史；新会话读取已有输入、产物及反馈继续。缺产物的正常退出仍报错并展示最后消息，不增加自动空产物重试。

`layering_image_compact_threshold` 仅作用于 Codex，并沿用现有带图压缩补丁；不自动改写其他 CLI 的压缩策略。
