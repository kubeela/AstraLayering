# part-layering

包含参考准备、持久化分组调度结构，以及 Codex agent 调度。需要 Node 24.12+，先运行 `pnpm install`，并完成 Codex 登录。参考准备使用官方 `@openai/codex-sdk`；需要自定义函数的 agent 使用同版本 Codex App Server。参考准备、首次分组、组轮廓绘制和独立 review 已接入真实 agent；补形、子组分析与程序 SVG 合并目前使用占位接口。

统一入口是 `pnpm start --name <运行名> [--image <角色图片路径>] [--groups <分组JSON路径>] [--jobs <并发组数>] [--agents <agent并发数>]`，程序使用当前 Codex 登录配置。组调度默认并发 5，可用 `--jobs 2` 或 `-j 2` 调整；所有步骤共享的 agent 调用默认最多 3 个，可用 `--agents 2` 或 `-a 2` 调整。两个参数均为正整数，分别控制组派发与实际 agent 调用。

使用 SDK 自带的 Codex 运行程序，不需要自行定位 `codex.exe`。创建与运行会话采用官方接口：

```ts
const codex = new Codex();
const thread = codex.startThread({
  model: 'gpt-6.1-sol', modelReasoningEffort: 'xhigh',
});
const { events } = await thread.runStreamed(prompt);
for await (const event of events) {
  console.log(event);
}
```

默认流程首次启动传入 `--image`，原图会复制到 `.run/<运行名>/references/original.<原扩展名>`。续跑只需 `--name`，不依赖原图之前的外部路径。省略 `--groups` 时检查参考输出，缺少哪一步就执行哪一步；全部存在时不调用 preparation agent。显式 `--groups` 只读取已有参考，缺失直接报错。

参考准备完成后，同一入口进入 layering。省略 `--groups` 对应 `null` 输入，先读取 `.run/<运行名>/groups.json`：实际已有组时直接复用并继续进度；实际组为空时才调用首次分组接口，不另存首次完成标记。

显式 `--groups` 只选择本次运行已有树中的组及其子组，不创建新组。输入可为单组、组数组或包含 `groups` 的文档，用已有 `id` 指定，如 `[{"id":"face/eye"}]`；说明、父子关系和进度均以本次运行保存的内容为准，输入中的说明或完成标记不能覆盖它们。空选择、未知组、错误父子关系、缺少前置参考均报错；所选组的全部祖先必须完成五个步骤，所选分支及祖先已登记的 SVG 必须实际存在，否则在 agent 启动前拒绝执行。其他分支的进度不阻塞它，也不会自动启动未选择的分支。例如 `face` 完成后即可选择 `face/eye`，与 `hair` 是否完成无关。

正式 layering 的流程约定记录在 [layering-workflow.md](docs/layering-workflow.md)：先恢复当前运行已保存的分组和进度；`null` 输入且实际没有组时识别第一批组，已有组则沿用统一的跳过／续跑逻辑。每组依次进行轮廓绘制与分块自检、严格 review、直接遮挡补形与自检、内部子组分析；子组加入待办队列继续循环。后续按该文档逐步实现。

`agents.ts` 统一使用 `gpt-6.1-sol / xhigh`。`CodexAgents.run()` 每次创建新会话；`createSession()` 保留原生 App Server 进程和 thread，后续 `session.run()` 在同一 thread 内开启新 turn。未配置 `tools` 的一次性调用通过 SDK 执行，函数工具调用使用 App Server 原生 `dynamicTools`，程序直接执行回调并返回文字或图片。`run.ts` 的 `runPartLayering(input, { steps, mergeSvg }, agentOptions)` 串联参考准备与组循环，返回 `{ references, layering }`。默认适配器位于 `layering-steps.ts`，首次分组位于 `initial-groups.ts`，绘制和 review 位于 `outline-agent.ts`。

`agent-runtime.ts` 独立管理 agent 并发、临时错误分类和退避恢复，不依赖分组树或步骤。SDK、一次性原生任务和保留绘制会话均通过 `agents.ts` 接入同一运行实例的限制；空闲会话和退避等待不占执行位置。CLI 的内置重试先照常运行，SDK 的重连 `error` 与 App Server 的 `willRetry` 通知不会提前截断它；仅回合最终因容量、断流或临时服务错误失败时，在 5、10、20、40、60 秒后恢复，之后保持 60 秒，不设次数上限。恢复沿用 thread 与已成功的产物，不重新派发组或清空草稿；认证、额度、上下文、参数、文件校验和主动取消不自动重试。内置重试的源码核对、模拟服务验证及恢复边界见 [agent-runtime.md](docs/agent-runtime.md)。

`layering.ts` 实现具体调度，`groups.ts` 负责原子保存和并发写入队列，`layering-types.ts` 定义分组、步骤及适配器接口。组内严格按以下顺序执行：

- `initialGroups`：首次识别直属组，仅在 `null` 输入且实际没有已有组时执行。
- `drawOutline`：组轮廓绘制与分块自检。
- `reviewOutline`：外轮廓、主要结构与去噪的严格 review。
- `completeOcclusion`：按部位提示词与参考图补直接遮挡。
- `checkCompletion`：检查原形未变、补形结构合理。
- `splitChildren`：基于完成轮廓识别直属子组；程序将子组登记到树并加入后续调度。

首次分组与子组分析只返回直属组的描述，不返回子树或替程序标记制作进度。所有接口返回 `{ status: "completed", output: ... }` 或 `{ status: "pending", message: ... }`。当前占位符返回 `pending`，每次启动走到首个待接入步骤就停下该组并保存进度，不调用模型、不生成假 SVG、不误标完成。

首次分组读取本模块 `prompts/4-初始分组.md`，agent 的工作目录设为 `.run/<运行名>`，程序明确传入参考准备完成的素体图绝对路径，不预先附图，也不让 agent 自行寻找目标图。它用内置 `view_image` 观察整体，按需裁剪放大细节。人体头部在第一层拆为 `face`（脸部、五官、耳朵）、`hair`（全部头发、发髻）、`head_accessories`（头部装饰物，含其长飘带）；脸部说明明确只补脸型与耳朵，不补头顶与后脑。`neck`、`body`、`arms`、`pelvis`、`legs` 的范围及临时连体服不分组要求沿用原版，无跨目录运行依赖。

首次分组注册 `view_bitmap({ path, crop?, scale? })` 和 `write_groups({ subject, groups })`。整体可用内置 `view_image` 查看，细节按需用 `view_bitmap` 裁剪放大，观察图保存在 `observations/initial-groups/`。分组工具绑定本次运行的正式 `groups.json`，校验组名、重复名称和一层 group 结构，再以 `name` 生成稳定 `id`，保留 `note`。无效输入不写入；已有组时拒绝覆盖。工具与调度器共用 `GroupStore` 写入队列，agent 不能通过工具修改制作进度。分组保存必须调用 `write_groups`，不再通过 terminal 写临时 JSON。最终回复不参与解析；没有成功调用写入工具时失败。调度器只发起一次识别任务，临时服务中断由 agent 调用层沿用会话恢复；实际已有组时继续现有进度。

组轮廓绘制和 review 的通用提示词为 `prompts/5-组轮廓.md`、`prompts/6-轮廓review.md`，复用迁移流程的轮廓色块及独立审查要求，适配为每次只产出当前组的独立 SVG。agent 收到素体参考、组说明、完整画布尺寸，以及父组完成 SVG（如有）。绘制 agent 用自带 terminal 写草稿，以 `preview_svg` 先看整图，再裁剪放大，用 blend 和 edge 逐块自检全部可见区域；程序读取实际文件，校验 SVG、当前组绑定、画布及父范围后保存正式轮廓。草稿和失败返修不会覆盖此前已登记的有效 SVG。

绘制自检核对位置、比例、主要形状和形体归属，并分块放大检查可见边缘、接缝、孔洞、开口和尖端；发现问题先修正，再复查改动处及相邻区域，确认未破坏已有正确形状。绘制须完整覆盖本组可见区域，包括与其他部件的接缝，边缘精确对齐原图，内部明暗分界不作为轮廓。严格 review 重点核对边缘走向、折线、折角、弧度以及轮廓是否超出或缩入参考，并清理来源不明的碎发丝、孤立点和形体混乱；接缝漏画和无依据留空须返修，不能因缺漏较小而放行。微小缺口在本轮依据参考和结构关系补成连续局部形体，不用碎点表示部位存在；可靠的可见边缘和有明确结构依据的分离区域须保留。大片直接遮挡仍由后续补形步骤处理。

绘制及返修通过 App Server 配置开启内置 `image_generation`，review 和首次分组关闭。噪音或结构难辨时可基于原参考局部生成放大辅助图，要求结构清晰优先、不添加原图不存在的细节、不改变已有形状及可靠边缘；生成图仅辅助辨认，继续对照原参考绘制 SVG。同一处问题只生成一次是提示词约束，不是程序调用上限。返修附加要求单独放在 `prompts/7-轮廓返修.md`。本轮仍按实际 SVG 文件交付，不要求生图任务的最终 JSON。

同一个组的一次绘制任务保留一个绘制会话，首次绘制与返修沿用其 thread；每次严格 review 均创建新的只读会话，审查后关闭。review 通过 `submit_review` 保存 `pass`、`revise` 或 `blocked` 及具体意见，最终回复不参与解析。每组最多提交两次正式 review：绘制并自检 → review 1 → 按意见返修并自检 → review 2 → 再返修并自检，然后直接进入下一步，不启动第三次 review。任何一轮 pass 则提前进入下一步。轮数按本组审查报告累计，重启不清零，临时服务重试不另计一轮。blocked（无法核对）与执行异常仍保留原有处理，不视为返修成功。续跑先落实尚未完成的返修意见；报告以 repairedCandidateHash 记录已完成返修的 SVG，避免中断恢复后重复返修。审查原结论保持不变；两轮意见修正完成后，review 步骤登记 completed，output.reviewOutcome 为 repaired，表示流程完成而非 reviewer 给过 pass。终端显示已按第 2 轮意见返修并自检、不再复审。会话复用和审查循环由程序控制，工作提示词不解释会话管理规则。任务结束、暂停或异常时关闭绘制会话；跨启动不保留活动会话。

每次返修分别保存到 `stages/outline/<组ID>.repairs/<序号>/`，其中 `feedback.txt` 是返修意见，`prompt.txt` 是实际发给绘制 agent 的完整提示词。序号从 1 递增，续跑接着已有序号，失败回合也保留记录，不覆盖前几轮。每轮完整输入仍分别保留在 `agents/<时间-步骤名-唯一后缀>/request.json`。独立审查报告保留各轮反馈、候选和观察记录。原生生图事件及修订提示词记录到 `events.jsonl`；工具返回的已保存图片路径登记到 `result.json`，可读日志省略图片二进制数据。

特化提示词按完整组 ID 查找：`prompts/groups/face/outline.md` 替换 face 的绘制正文，`prompts/groups/face/review.md` 替换其审查正文，`prompts/groups/face/eye/outline.md` 只作用于 face/eye。两个步骤独立选择；对应文件不存在时用通用正文，空文件报错，不继承父组特化。程序继续附加组、参考、父 SVG 和画布等运行输入；绘制收到草稿输出路径，review 收到候选 SVG 和审查报告路径。实际来源和全文保留在 request.json 中。详见 `prompts/groups/README.md`。改提示词不自动重做已完成步骤。

`preview_svg` 支持 `svg` 白底独显、`blend` 半透明混合和 `edge` 红色边缘叠加，支持原图坐标裁剪 `crop` 和矢量放大 `scale`，直接返回图片并保存到 `observations/<步骤>/<组ID>/`。子组同时返回父范围检查；父子 SVG 在同一画布上宽、高各四倍渲染，先计算 `max(子 alpha - 父 alpha, 0)`，再用阈值 128 判断未覆盖采样，避免独立二值化把共用曲线的抗锯齿差异误判为越界。允许正常贴边和共边，不扩张父轮廓，不按越界数量放行；任一未覆盖采样达到阈值即失败。孔洞、分离区域、变换与裁剪沿用实际 SVG 渲染。报告的 `scale` 固定为 4，不受预览选框或倍率影响；`outsideSamples` 为越界采样数，`outsidePixels` 为除以 16 后的原图像素面积估算，`outsideBox` 为原图坐标，可有四分之一像素的小数。范围渲染沿用 1 亿像素的资源上限，有限采样不是数学上绝对包含的证明。输入 SVG 不修改。独立审查记录及每轮实际观察图路径保存在 `stages/review/<组ID>.review.json`。通过后进度直接引用已绘制的轮廓 SVG，review 不生成或复制 SVG；后续补形沿用该路径。

`groups.json` 只保存 `subject` 和分组树 `groups`，节点保存 ID、名称、说明与子组，不混入调度状态。`progress.json` 保存按组 ID 索引的步骤进度 `groups` 和程序合并进度 `merge`。首次分组是否完成直接由实际组是否非空判断，不记录 `initial`；运行过程和错误保留在 agent 日志中。组步骤为 `outline`、`review`、`completion`、`completionCheck`、`children`，状态为 `pending`、`running`、`completed`、`failed`。每个成功步骤立即保存；失败保留此前结果，续跑跳过成功步骤；中断留下的 `running` 恢复为待执行。两个文件分别原子保存，并发共用一个写入队列。兼容旧的混合 `groups.json`，自动分离并保留组进度，忽略并移除旧 `initial` 字段。显式选择文件只提供组 ID；续跑进度始终读取本次 `.run/<运行名>/progress.json`。

绘制和补形步骤收到独立的 `outputPath`，返回真实 SVG 路径。review 只收到已有轮廓和 `reportPath`，通过后引用原轮廓路径。完成产物保存为 `parts/<组ID>.svg`，如 `parts/face.svg`；轮廓保存到 `stages/outline/<组ID>.svg`，`stages/review` 只保存审查 JSON。层级 ID 沿用可读路径，例如 `parts/face/eye.svg`，不使用哈希目录。新绘制轮廓采用与参考相同的画布和 `viewBox`，以带 id 和当前 `data-group-path` 的容器保存纯矢量色块；子组须在父组完成轮廓内。续跑只检查已登记文件，不额外触发视觉审查；已完成的轮廓与 review 继续跳过，旧进度引用的审查副本仍可读取，不自动删除或迁移。当前运行完成两步后停在补形占位，不生成假的完成 part。

全部组及子组完成后进入程序合并接口 `mergeSvg`，收到完整树、各组完成 SVG 和目标 `character.svg` 路径；实际组合规则目前占位，待 part 产物约定确定后接入。深度限制留下未完成子组时不会合并。已有完整合并结果时直接复用。

参考准备先判断角色是否需要转换为目标参考图的现代日式二次元 Live2D 立绘画风：清晰动漫线稿、干净平涂、硬边二分光影。判断时同时传入原图和目标画风图，输出 `needsSimplification` 及一句依据 `reason`。姿态、构图、表情和背景不作为简化条件。需要简化时转换画风，否则复制原图；简化保留角色设计、衣装、配色与姿态，允许五官画法和头身比动漫化，不锁定原图的半写实脸型与渲染。随后统一进入素体换装，将角色图与连体服款式图一起传入，沿用上游画风、姿态、表情和比例。暂不做标准姿态调整。

简化和素体 agent 通过 SDK 配置显式启用 Codex 内置 `image_generation`。两个生图提示词文件只保留简短的绘制要求；`run.ts` 统一附加执行规则，要求 agent 将绘制提示词原样传给生图工具，不自行扩写，只调用一次、生成一张图，生成后直接交付，不检查、返修或重试。这是提示词约束，当前 SDK 没有直接的工具调用次数上限。成功返回 `{ "savedPath": "实际图片路径", "error": null }`，失败返回 `{ "savedPath": null, "error": "失败原因" }`。程序读取真实文件，验证 PNG 签名，再保存到本次运行的 references 目录；这是文件有效性检查，不涉及视觉评价或模型返修。

自定义 function 工具通过 `AgentTask.tools` 注册，类型位于 `function-tools.ts`，包含名称、说明、参数 JSON Schema 和 `execute(argumentsValue, signal)` 回调，无需 MCP 服务或修改全局配置。`tool-agent.ts` 启动 SDK 自带的同版本 Codex，使用 `initialize` → `thread/start(dynamicTools)` → `turn/start` → `item/tool/call` 链路。原生 dynamic tools 属于[官方实验性接口](https://developers.openai.com/codex/app-server#dynamic-tool-calls-experimental)，升级 Codex 版本时需要核对协议。首次分组和绘制开放自带 terminal，使用 `workspace-write`；独立 review 使用 `read-only`，报告和预览由程序工具保存。绘制会话延续时工具定义保持一致，回调绑定当前回合；各组会话独立。超时、失败或提前退出保留日志，调度器统一清理会话。

目标画风参考位于 `resources/简化参考图片.png`，供判断和简化两个步骤使用。连体服款式参考位于 `resources/连体服参考.jpg`，复制自迁移流程的 `可复用结果.jpg`，在素体换装时作为第二张图片输入；仅参考款式，按目标人物的姿势和体型贴合。所有固定提示词和参考资源都来自本模块。

每次 agent 调用都在 `.run/<运行名>/agents/<时间-步骤名-唯一后缀>/` 下实时保存：

- `request.json`：任务提示词、图片路径及说明、实际拼接的用户提示词、输出 schema 或函数定义、模型、推理强度、超时和工作目录。不保存认证密钥或环境变量。
- `events.jsonl`：带时间戳的 SDK 事件或 App Server 协议消息，逐条追加，包括中间更新、工具参数和图片结果；发送的用户运行配置省略以避免记录凭据。
- `transcript.log`：可读的过程消息、公开的思考摘要、工具调用信息与结果、错误和完成状态。图片的 base64 数据只在原始事件中保留，可读日志中使用简短标记；实际预览 PNG 也单独保存。
- `result.json`：完成／失败状态、会话 ID、用量、耗时、最终回复、图片路径或错误。解析失败、超时和中途退出也保留已写入的过程记录。

终端同步显示步骤进展和日志位置。这里只记录实际发出的事件与公开摘要，不代表完整内部推理。SDK 不提供实时 stderr 事件；它在进程异常退出时给出的错误会写入结果。App Server 失败时也保留进程错误输出。单独调用 `CodexAgents` 时默认保存到其工作目录下的 `.run/agents/`，也可通过 `AgentOptions.logDirectory` 指定位置。已有参考被跳过时终端会说明原因，不创建新的 agent 日志。

每次恢复另存完整请求与结果，前一次失败记录追加 `retry.scheduled`，包含尝试序号、等待时长与原因；终端同步显示等待。恢复不是新一轮视觉返修，不增加 review/feedback 序号。恢复请求明确要求继续未完成工作、复用已成功的工具提交和生图；生图不重复仍依赖提示词，程序没有另加工具次数限制。

底层 `runWorkflow(input, hooks, { concurrency, maxDepth })` 只负责派发，由 `layering.ts` 提供以下接口：

- `preparation()`：可选，在循环初始化前执行参考准备。
- `initialize(input)`：恢复已保存的分组与进度；显式输入验证前置并选择已有组，`null` 且实际无组时调用首次分组接口。
- `ready()`：只返回全部祖先已完成的未完成组，显式输入再筛选指定分支。底层优先派发浅层就绪组，深度从树根 0 开始。
- `runRound(group)`：按固定顺序执行本组尚未完成的步骤；占位符返回待接入时停止本组本轮处理。

默认同时执行最多 5 个组。某个父组完成五个步骤（含子组分析与登记）后，其子组即可使用空出的并发位置；其他分支仍在运行或待接入时，不阻塞该子组。未完成父组的所有后代继续等待，续跑同样按祖先依赖放行；就绪组中优先处理浅层，但不等待整层全部完成。层级直接从分组树计算，不另存层级状态。底层相同 `id` 在一次调用中只派发一次；跨运行跳过由上层保存的步骤进度保证。`maxDepth: 1` 只处理深度 0 的组，子组保留待办。任何回调失败时，停止继续调度，等待已启动的组结束并抛出错误。最终合并仍需整棵树完成。

默认入口内部调用 `prepareReferences({ image, runName }, steps)`；显式组入口调用只读的 `loadPreparedReferences(runName)`。`image` 为可选原图路径，输出位于本目录的 `.run/<runName>/references/`：

- `original.<原扩展名>`：首次传入的原图副本，用于续跑和补齐缺失参考。
- `judgment.json`：参考判断结果，包含 `needsSimplification` 与 `reason`；存在则读取，不再调用判断。兼容不含 `reason` 的旧记录。
- `simplified-subject.png`：需要简化时生成；不需要简化时直接复制原图，并保留原图扩展名。目标文件存在则跳过。
- `base-subject.png`：以角色参考和连体服款式图为输入生成素体换装参考；存在则跳过。

`steps` 提供 `judge(image, prompt)`、`simplify(inputImage, outputImage, prompt)` 和 `baseSubject(inputImage, outputImage, prompt)` 三个执行接口。每个需要执行的步骤会读取本目录内对应的提示词，并将完整内容作为 `prompt` 传入；跳过的步骤不读取提示词。

- `prompts/1-参考判断.md`
- `prompts/2-简化图片.md`
- `prompts/3-素体参考.md`

图片步骤结束后必须真的存在对应输出文件，否则抛出错误。没有额外完成标记，不生成线稿／素描。

提示词变更不会自动重做已有参考。验证新版画风判断和换装时使用新的运行名；原运行继续沿用原有输出。

agent 回合默认不设超时；正常入口不传时间上限。只有调用者显式传入 `AgentTask.timeoutMs` 时才按该值取消回合。终端的“agent 回合结束”只表示回合执行结束；最终按组展示 review 是否通过、返修、blocked 或失败，以及当前等待步骤。单组执行失败时停止新派发，等待已启动的组结束，错误结果包含组 ID、步骤、原因及进度路径；其余未启动待办保持未执行。

`pnpm check` 执行类型检查，`pnpm test` 验证参考准备、SDK 日志、原生工具、绘制会话复用与独立只读 review、SVG 预览和父范围、特化提示词、审查提交、两轮返修后继续及中断恢复、真实命令行入口和结果展示，以及组循环的 null 续跑、显式组范围与祖先前置拒绝、旧存储迁移、失败续跑、深度限制、分支并发补位、并发子组登记和合并接口。测试使用本地模拟执行程序和临时文件，不调用模型或生图工具。

后续按照上述流程约定逐项接入具体 agent 和程序合并规则。
