# 提示词模板与动态位置

工作流自己提供的任务文字以 Markdown 为来源。动态内容只能填入模板声明的 `{变量名}`；代码不能在阶段正文后临时拼接制作要求。实际顺序由 Markdown 中的位置决定。占位符采用单次替换：输入正文或 JSON 数据里的花括号不会再次求值；缺少变量时明确报错。分组自定义模板还必须保留对应通用模板的必要占位符，不会静默追加缺失的运行信息。

## 各阶段源文件

| 阶段 Markdown | 显式位置 | 内容来源 |
| --- | --- | --- |
| 人物 `0-标准姿态.md`、`2-简化图片.md`、`3-素体参考.md`，衣服 `preparation.md` | `{image_execution_rules}`；衣服另有 `{width}`、`{height}` | [人物生图规则](../shared/prompts/preparation-image-rules.md)、[标准化规则](../shared/prompts/preparation-standardize-rules.md)、[衣服生图规则](../shared/prompts/preparation-clothing-rules.md)；尺寸来自原图。只给绘制正文的 API 调用者使用[同样可见的外层模板](../shared/prompts/preparation-image-task.md)中的 `{drawing_prompt}`。 |
| 两套 part 的 `4-初始分组.md` | `{run_directory}`、`{reference_label}`、`{reference_path}`、`{groups_path}` | 本次目录、人物／衣服参考类型及输入路径。 |
| 两套 part 的 `5-组轮廓.md`、`6-轮廓review.md`、`8-同层轮廓去重.md`、`9-正面遮挡补全.md`、`10-直属结构拆分.md`、`11-遮挡层级规划.md`，及 `prompts/groups/**` 覆盖文件 | `{prompt_source}`、`{runtime_context}`；按职责声明 `{repair_context}`、`{note_repair_rule}`、`{report_path}`、`{fixed_rules}`、`{fixed_rules_source}` | `runtime_context` 是当前组、画布、绑定草稿／候选、父组、同级件和参考图等 JSON 数据；补全、拆分的固定规则来自各自 `9-补全操作约定.md`／`10-拆分操作约定.md`；返修见[返修上下文](../shared/prompts/outline-repair-context.md)与[说明修正](../shared/prompts/outline-note-repair.md)。 |
| 两套 raster 的所有绘制、review、repair Markdown | `{drawing_responsibilities}`、`{krita_environment}`、`{runtime_context}`；首步另有 `{drawing_report_filename}`，检查／返修有 `{review_report_filename}`、`{repair_report_filename}` | [绘制职责](../shared/raster/drawing-responsibilities.md)按职责填入或留空；运行信息来自[绘制模板](../shared/prompts/raster-runtime.md)或[检查模板](../shared/prompts/raster-review-runtime.md)，内部路径、版本、交付文件等也逐项声明占位符。 |
| [组装](../character-assembly/prompts/01-人物与衣服组装.md)、[阴影蒙版](../shadow/prompts/mask.md)、[法线／深度](../shadow/prompts/normal-depth.md) | `{krita_environment}`、`{runtime_context}` | [组装运行信息](../shared/prompts/assembly-runtime.md)、[阴影运行信息](../shared/prompts/shadow-runtime.md)，蒙版检查命令由[检查说明模板](../shared/prompts/shadow-inspection.md)中的 `{inspection_command}` 声明。 |

`{krita_environment}` 展开为[共用段落模板](../shared/krita/environment-section.md)，其中 `{source_path}` 指向[共用环境说明](../shared/krita/environment.md)，`{environment_rules}` 是该文件全文，Krita 绝对路径和版本分别填入 `{krita_executable}`、`{krita_version}`。段落保留明确的开始／结束标记和绝对来源路径。

## 请求、恢复与生图适配

这些是独立的外层模板，不改变阶段自己的绘制要求，也必须在 Markdown 中声明插入位置。

| 模板 | 动态位置与用途 |
| --- | --- |
| [CLI 请求](../shared/prompts/cli-turn.md) | `{task_prompt}`、`{workspace}`、`{working_directory}`。Claude／AGV 的请求临时目录说明。 |
| [图片说明](../shared/prompts/image-description.md)、[图片路径](../shared/prompts/image-reference.md) | `{image_description}` 来自本次附图用途，`{image_path}` 是本次图片路径；AGV 通过路径读取。图片说明作为独立消息发送，与任务正文一起保存在请求记录。 |
| [中断继续](../shared/prompts/interrupted-task.md)、[续跑](../shared/prompts/continuation.md)、[已有图片](../shared/prompts/continuation-images.md) | `{interrupted_task}`、`{saved_images_context}`、`{saved_image_paths}`。没有已生成图片时对应位置为空。 |
| [恢复返修](../shared/prompts/raster-repair-resume.md)、[交接返修](../shared/prompts/raster-handoff-repair.md)、[会话交接](../shared/prompts/raster-handoff.md) | `{drawing_prompt}`、`{repair_prompt}` 或 `{task_prompt}`，以及旧会话、原因、当前阶段和交接记录。 |
| [生图请求](../shared/prompts/image-request.md)、[Nano 纯色背景](../shared/prompts/nano-solid-background.md) | `{drawing_prompt}`、`{background_instructions}`、`{background_hex}`。原始绘制要求保留，Nano 透明后处理补充独立的背景要求。 |
| [Nano 仅换背景](../shared/prompts/nano-background-replacement.md) | `{background_hex}`、`{width}`、`{height}`。第二次请求仅附第一张原始 RGB 图，保持前景与画布，用双背景差分恢复透明 PNG。 |

工具说明和参数仍来自 `shared/tools/<工具名>/description.md`／`schema.json` 或各管线自己的工具定义；宿主原生工具的定义由宿主提供。模型、API 凭据和构建环境不写进这些制作提示词。

## 查阅实际请求

各请求目录的 `prompt.md` 保存展开后的正文，`request.json` 保存任务、附图说明和输入消息。CLI 的 `prompt.md` 保存经过 CLI 外层模板展开后的实际正文。raster 阶段既有 `prompt.md`、review／repair 提示词记录也继续保留。Nano 的 `image-processing/normalization.json` 同时保存原始提示词和 provider 实际提示词。模板和实际请求可以逐项对照；不改全局或隐藏的系统提示词。
