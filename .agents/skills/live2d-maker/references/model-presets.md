# 推荐模型方案

配置保存在 skill 根目录 `.env`，对使用该安装的任务生效。第一次使用且 `.env` 不存在时，向用户展示以下选择，确认后再创建、填写；用户本次已经明确选择时沿用，不重复询问。已有 `.env` 直接复用，用户要求切换或调整时才修改。

| 选择 | LLM | 生图 |
| --- | --- | --- |
| 默认方案 | 全量 Codex；preparation 全部 low，其余保持原默认 | Codex 内置生图 |
| 优化方案 | preparation 仍为 Codex low；两套 part 的拆分阶段为 Argon high；raster 与组装保持原默认 | 简化图、素体图和两套 part 绘制／返修使用 Nano Banana 2.1，其余内置生图 |
| 自定义 | 先选择上述一套，再覆盖所需职责 | 按实际生图 agent 覆盖 |

## 默认方案

以 [example.env](../example.env) 创建 `.env`。所有 agent 使用 Codex：preparation 的全部 agent 为 `gpt-6.1-sol-low`，人物／衣服 part 的拆分阶段、人物 raster step03、组装和阴影制作为 `gpt-6.1-sol-xhigh`，两套 raster 的前两步及其 review／返修为 `gpt-6-astra-xhigh`。所有生图步骤使用 `codex-native`。

复用当前 Codex 登录和 provider 配置，确认实际执行环境具有内置 `image_generation`；不要求填写自定义生图 API，也不自动启用图片数 compact。

## 优化方案

以 [example.env](../example.env) 为基础，按 [presets/optimized.env](../presets/optimized.env) 替换差异项；差异模板不能单独当作完整 `.env`，运行时只读取 skill 根目录 `.env`。

人物和衣服的 part 绘制、review、去重、SVG 补全、首次／细分组和深度分析统一使用 `gemini-4-argon-high`，它们的配置仍可分别调整。preparation 的全部 agent 保留 `gpt-6.1-sol-low`；raster 与组装保留默认模型。

简化图、素体图和两套 part 的轮廓绘制／返修使用 `gemini-nano-banana-2.1`。后四项原有生图工具也需要自定义服务，才能与 Argon 配对；不修改这些步骤的 SVG 交付要求。标准化、纯衣服 preparation、raster 与组装的生图继续使用 Codex 内置服务。

启动前检查已有 Antigravity CLI 及 Argon 登录／授权，Codex 的登录与内置生图，以及 Google 生图服务。确认实际服务的 API URL、key 和协议后填写 `layering_google_image_base_url`、`layering_google_image_api_key`、`layering_google_image_protocol`；协议支持原生 `gemini` 或网关的 `openai`。Codex low 的简化／素体生图使用补丁版原生 imagegen，需要构建补丁并配置 `layering_codex_path`；Argon 的生图仍使用共享函数工具。复用已有凭据；缺失时请用户本地补充，或询问是否改用默认方案，不自行安装 CLI。两套方案都不自动启用图片数 compact。

阴影两分支共用 `layering_agent_shadow_model` 的 LLM 职责，蒙版直接在 Krita 绘制，不启用生图工具；法线／深度生图由 `layering_shadow_maps_image_model` 配置，省略时沿用既有默认生图模型、provider 与协议。法线／深度按数据纹理原样返回 RGB，不经过 Nano 颜色素材的背景抠图；完成时按原画恢复 alpha。

## 自定义

先让用户选择默认或优化方案作为基础，再确认要覆盖的 LLM 职责、模型与力度，或具体 agent 的生图模型等选项。仅修改选定的键；完整键与默认值见 [example.env](../example.env)，模型、harness 与生图协议见[模型与 harness](agent-models.md)。不要替用户调整未指定的步骤。

生图选 `codex-native` 的步骤必须使用 Codex 模型；换成 Claude Code 或 Antigravity 时，该生图步骤也需要选择自定义生图服务。按最终配置检查实际所需的 CLI、登录和 API；入口或凭据缺失时展示问题并询问下一步，不自行安装 CLI 或替用户登录。

确认后复制基础模板，按方案替换已有键，不追加同名配置。API URL、协议与密钥使用用户确认的服务，密钥在本地填写，不写进提示词、报告或 Git。shell 同名变量优先于 `.env`，检查生效配置时说明实际覆盖；不修改用户全局 CLI 配置。
