# 共享运行时与维护

默认配置统一维护在 skill 根目录的 [example.env](../example.env)，由 `shared/default-configuration.ts` 读取。模型职责与生图默认值由共享模型模块校验、解析；运行时回退、首次生成 `.env` 与 WebUI 使用同一模板。WebUI 依赖 skill，独立 skill 包含完整配置与解析能力。

只有修改提示词／工具、接入 CLI 或诊断共享行为时读取本页；日常执行见 [SKILL.md](../SKILL.md)。

## 工具与模型

工具定义唯一来源是 `shared/tools/<name>/description.md` 与 `schema.json`，各 section 的 `tools/<name>/` 可覆盖。启动时加载并固定本次调用定义；schema 无效直接报错，真正的路径与写入校验在实现中。动态注册只管理工作流函数工具，宿主原生工具仍由宿主提供。模型、provider 与生图协议见[模型方案与配置](../references/model-presets.md)。

所有操作 Krita 的提示词通过 `{krita_environment}` 注入共用 [environment.md](krita/environment.md)；它和 prompts、工具说明是运行输入，不是额外使用手册。

## 多深度与上游修正

`occlusion.json` v3 每个逻辑 part 只有一条：单深度使用 `level`，多深度使用 `levels: [{ level, region }]`，二者互斥。深度数值唯一，从后往前排序，可用小数插入；v2 单深度仍兼容。多深度表示同动整体跨层，不强制回 part 拆树，实际绘画分片由 raster step01 在 Krita 中实现，保持连接和归属。

step01 对轮廓、隐藏补全、画风和结构负责，可修 KRA、groups、occlusion 与 SVG 并同步来源指纹；reviewer 只读反馈，不能让子组越父范围返工。step02 只精修边缘和细节，不拆层、不改归属。组装不注册上游深度修改工具。raster 开始后的总控恢复保留这些上游修正。

reviewer 只提交已经观察确认的问题；blocked 仅用于必要输入／工具等执行障碍，不消耗正式质量审核轮数。文件、像素统计与测试不能代替逐层视觉验收。

## 参考图后处理

新生成的 simplified、base-subject 和纯衣服参考以 `standard.png` 为统一画布。真实 alpha 直接保留，Nano 的透明请求由共享生图通道双背景差分恢复，不额外安装 Python 抠图环境；细节、失败留档与局限见 [生图配置](../references/model-presets.md#生图执行与透明处理)。

旧式不透明参考只做 Node 颜色键与去溢色，边缘无可靠背景时保留并记录；它不承担语义分割。不同尺寸用 Sharp 等比缩放并居中透明补边，不裁紧角色；已合格且无需缩放时保留原字节。处理前原图与报告追加保存到 `references/archive/`，归档不参与恢复或完成判断，旧任务已有参考仅校验复用，不重新处理。

## 提示词模板与动态位置

工作流自己提供的任务文字以 Markdown 为来源。动态内容只能填入模板声明的 `{变量名}`；代码不能在阶段正文后临时拼接制作要求。实际顺序由 Markdown 中的位置决定。占位符采用单次替换：输入正文或 JSON 数据里的花括号不会再次求值；缺少变量时明确报错。分组自定义模板还必须保留对应通用模板的必要占位符，不会静默追加缺失的运行信息。

### 各阶段源文件

| 阶段 Markdown | 显式位置 | 内容来源 |
| --- | --- | --- |
| 人物 `0-标准姿态.md`、`2-简化图片.md`、`3-素体参考.md`，衣服 `preparation.md` | `{image_execution_rules}`；衣服另有 `{width}`、`{height}` | [人物生图规则](prompts/preparation-image-rules.md)、[标准化规则](prompts/preparation-standardize-rules.md)、[衣服生图规则](prompts/preparation-clothing-rules.md)；尺寸来自原图。只给绘制正文的 API 调用者使用[同样可见的外层模板](prompts/preparation-image-task.md)中的 `{drawing_prompt}`。 |
| 两套 part 的 `4-初始分组.md` | `{run_directory}`、`{reference_label}`、`{reference_path}`、`{groups_path}` | 本次目录、人物／衣服参考类型及输入路径。 |
| 两套 part 的 `5-组轮廓.md`、`6-轮廓review.md`、`8-同层轮廓去重.md`、`9-正面遮挡补全.md`、`10-直属结构拆分.md`、`11-遮挡层级规划.md`，及 `prompts/groups/**` 覆盖文件 | `{prompt_source}`、`{runtime_context}`；按职责声明 `{repair_context}`、`{note_repair_rule}`、`{report_path}`、`{fixed_rules}`、`{fixed_rules_source}` | `runtime_context` 是当前组、画布、绑定草稿／候选、父组、同级件和参考图等 JSON 数据；补全、拆分的固定规则来自各自 `9-补全操作约定.md`／`10-拆分操作约定.md`；返修见[返修上下文](prompts/outline-repair-context.md)与[说明修正](prompts/outline-note-repair.md)。 |
| 两套 raster 的所有绘制、review、repair Markdown | `{drawing_responsibilities}`、`{krita_environment}`、`{runtime_context}`；首步另有 `{drawing_report_filename}`，检查／返修有 `{review_report_filename}`、`{repair_report_filename}` | [绘制职责](raster/drawing-responsibilities.md)按职责填入或留空；运行信息来自[绘制模板](prompts/raster-runtime.md)或[检查模板](prompts/raster-review-runtime.md)，内部路径、版本、交付文件等也逐项声明占位符。 |
| [组装](../character-assembly/prompts/01-人物与衣服组装.md)、[阴影蒙版](../shadow/prompts/mask.md)、[法线／深度](../shadow/prompts/normal-depth.md) | `{krita_environment}`、`{runtime_context}` | [组装运行信息](prompts/assembly-runtime.md)、[阴影运行信息](prompts/shadow-runtime.md)，蒙版检查命令由[检查说明模板](prompts/shadow-inspection.md)中的 `{inspection_command}` 声明。 |

`{krita_environment}` 展开为[共用段落模板](krita/environment-section.md)，其中 `{source_path}` 指向[共用环境说明](krita/environment.md)，`{environment_rules}` 是该文件全文，Krita 绝对路径和版本分别填入 `{krita_executable}`、`{krita_version}`。段落保留明确的开始／结束标记和绝对来源路径。

### 请求、恢复与生图适配

这些是独立的外层模板，不改变阶段自己的绘制要求，也必须在 Markdown 中声明插入位置。

| 模板 | 动态位置与用途 |
| --- | --- |
| [CLI 请求](prompts/cli-turn.md) | `{task_prompt}`、`{workspace}`、`{working_directory}`。Claude／AGV 的请求临时目录说明。 |
| [图片说明](prompts/image-description.md)、[图片路径](prompts/image-reference.md) | `{image_description}` 来自本次附图用途，`{image_path}` 是本次图片路径；AGV 通过路径读取。图片说明作为独立消息发送，与任务正文一起保存在请求记录。 |
| [中断继续](prompts/interrupted-task.md)、[续跑](prompts/continuation.md)、[已有图片](prompts/continuation-images.md) | `{interrupted_task}`、`{saved_images_context}`、`{saved_image_paths}`。没有已生成图片时对应位置为空。 |
| [恢复返修](prompts/raster-repair-resume.md)、[交接返修](prompts/raster-handoff-repair.md)、[会话交接](prompts/raster-handoff.md) | `{drawing_prompt}`、`{repair_prompt}` 或 `{task_prompt}`，以及旧会话、原因、当前阶段和交接记录。 |
| [生图请求](prompts/image-request.md)、[Nano 纯色背景](prompts/nano-solid-background.md) | `{drawing_prompt}`、`{background_instructions}`、`{background_hex}`。原始绘制要求保留，Nano 透明后处理补充独立的背景要求。 |
| [Nano 仅换背景](prompts/nano-background-replacement.md) | `{background_hex}`、`{width}`、`{height}`。第二次请求仅附第一张原始 RGB 图，保持前景与画布，用双背景差分恢复透明 PNG。 |

工具说明和参数仍来自 `shared/tools/<工具名>/description.md`／`schema.json` 或各管线自己的工具定义；宿主原生工具的定义由宿主提供。模型、API 凭据和构建环境不写进这些制作提示词。

### 查阅实际请求

各请求目录的 `prompt.md` 保存展开后的正文，`request.json` 保存任务、附图说明和输入消息。CLI 的 `prompt.md` 保存经过 CLI 外层模板展开后的实际正文。raster 阶段既有 `prompt.md`、review／repair 提示词记录也继续保留。Nano 的 `image-processing/normalization.json` 同时保存原始提示词和 provider 实际提示词。模板和实际请求可以逐项对照；不改全局或隐藏的系统提示词。


## 启动验证

首次使用新的模型方案、CLI 或 provider，以及修改协议适配／工具 schema 后，按本次路线验证。记录版本、实际配置来源、检查结果与日志位置；不能把命令存在、一次 `OK` 或模拟服务器通过写成完整实测。用户要求停管线时不执行真实模型或生图检查。

### 自动检查

从 skill 根目录执行：

```bash
pnpm test:agents
# 修改 TypeScript 后再检查类型；相同源码的通过记录可以复用。
pnpm check
```

`test:agents` 不调用真实模型或生图服务，覆盖以下条件：

| 条件 | 通过标准 |
| --- | --- |
| 方案 1 默认、方案 2 混合与自定义配置 | 全部 LLM 职责和独立生图选择完整；人物／衣服职责共享，但工具和提示词覆盖保留；shell 覆盖、默认回退与旧配置冲突有对应断言 |
| 模型与生图组合 | 所有生图步骤拒绝非 Codex harness 配原生 imagegen；缺少所选生图 URL／key、CLI 或 Codex 生图补丁能力时，启动前明确报错；CLI 本地版本探测能识别文件存在但解释器／动态库缺失的情况 |
| 真实工具目录 | 读取共享、人物、衣服的全部 description.md / schema.json，不以只含简单字符串的测试工具代替；可空类型、嵌套数组、枚举、数值约束、oneOf 和 additionalProperties 等逐字段保留 |
| Gemini 请求 | 实际 HTTP 适配路径用 parametersJsonSchema 传完整 JSON Schema，不能把 type 数组塞进受限的 parameters；保留 CLI 原生工具；重复准备不重复注册；camelCase／snake_case 原生声明均可处理 |
| 工具调用与返回 | 原参数、null 值、工具说明、文本、全部返回图片及 thought signature 不丢失；下一回合还能恢复上回合的工具结果 |
| Codex 原生生图 | `codex-native` 不注入补丁生图配置；GPT／Nano 使用原生工具；不同请求的路由／模型隔离，保存图片事件与原 thread 续跑保留 |
| 自定义生图协议 | Gemini 原生和 OpenAI 兼容的生图／编辑请求保留提示词与输入图片，输入文件不修改；输出落在请求目录，跨任务路径被拒绝 |
| 会话恢复 | 同 CLI 修改模型／力度恢复原会话；切换 CLI 或会话失效创建替代会话并记录历史，已有产物保留 |
| 故障与状态 | 临时通道错误沿用会话重试；正常退出却无产物展示最后消息；取消、失败及进程退出的总控状态明确，不把已退出进程展示为运行中 |

这些是配置、传输和恢复的自动回归；它们不能证明上游当前授权、API 完整兼容或绘图质量。

### 新环境的真实验证

在实际 `.env`、任务目录及隔离请求环境中执行最小验证，记录哪些是实测，哪些仍是模拟覆盖。测试文件和请求记录放在 `<dir>/<name>/runtime/`，不写入用户全局配置。已通过的同版本、同配置检查不反复执行。

1. **带真实工具测试所选 harness。** 用现有 `CodexAgents`／`runCliTask` 调用路径，载入 `ToolCatalog` 的实际共享及管线覆盖定义。请求必须携带真实 schema，尤其包含 write_groups 的可空 note 和 propose_occlusion 的单／多深度 oneOf；只询问模型是否能回复不算通过。工具回调使用测试数据，不能修改正式成果。
2. **验证调用和续会话。** 让模型实际调用一个无副作用测试工具，核对参数与返回值，再以该 session/threadId 发第二回合。测试工具也包含可空字段，并返回小型测试图片，确认下一回合能读取。纯连通、注册、执行、带图返回、恢复是不同验证项，不能相互替代。
3. **按所选生图方式验证。** 原生 Codex 要确认实际注册 imagegen；自定义服务要使用本次配置的协议、模型与输入图片。首次正式准备步骤产出合格图片后可作为该生图组合的实测证据，记录尺寸／透明通道与实际产物；不能据此宣称另外的模型或协议也通过。无必要不额外生图。
4. **验证所需软件。** 在后台实际环境中确认辅助绘图的可用 Python，以及显式 Krita 入口的保存 KRA、重新打开和查看／导出图像能力；Linux 无显示配置应在绘图前明确报错；使用 Xvfb 时验证它能从工作流环境启动。Nano 双背景处理用已有 Node／Sharp，无 Krita 内嵌 Python 安装或抠图模型推理步骤；版本命令不是全部验收。
5. **核对续跑和展示。** 检查总控进程、锁、真实阶段与工作台一致。恢复时核对准备图内容指纹，已完成的步骤不能重新生图。取消后检查任务所属的绘制子进程，不能只看总控 PID 消失。

发现确定的请求格式错误时先修适配并补回归，不用重复重试掩盖。修复不更换用户选定模型、不删产物、不修改绘图提示词与审核轮次。缺少 CLI／凭据的处理和安装确认沿用[安装与前置](../references/setup.md)。

### 验证记录

任务 monitor.md 至少记录：代码／CLI 版本与配置位置、实际覆盖的步骤或工具集、模拟／真实验证区别、结果和请求日志、未测项。重用证据时说明适用范围。不能使用“所有情况都通过”代替这些记录；新的问题补具体回归和检查条件。


## 单测

```sh
node --test shared/tests/*.test.ts
# 只验证一个共享模块
node --test shared/tests/step-models.test.ts
pnpm check
```

自动回归使用本地模拟，不证明上游授权、实际绘图质量或全部协议兼容。临时服务退避、会话交接与宿主巡检见 [workflow](../workflow/README.md)。
