# raster-layering

用 TypeScript 和 `@openai/codex-sdk` 顺序执行栅格分层流程。第一步读取已完成的 `part-layering` 产物，使用原生 `image_generation` 工具生图，在 Krita 中配准、修画和交付；第二步继续处理第一步 KRA，逐处柔化边缘与接缝并去锯齿；第三步在第二步完成 review 与修复后去除连体服，补出用于后续叠加衣服的身体底层。

| 顺序 | 内容 | 模型 | 推理强度 | 状态 |
| --- | --- | --- | --- | --- |
| 前置 | 检查参数指定的 Krita 可执行文件及版本 | 无模型调用 | — | 已接入 |
| 第一步 | [完整提示词：分层与补全](prompts/01-分层与补全.md) | `gpt-6-astra` | `xhigh` | 已接入 |
| 第二步 | [完整提示词：边缘柔化与去锯齿](prompts/02-边缘柔化与去锯齿.md) | `gpt-6-astra` | `xhigh` | 已接入 |
| 第二步 review | [独立视觉检查](prompts/02-review.md)，反馈交给[原 agent 修复](prompts/02-repair.md) | `gpt-6-astra` | `xhigh` | 已接入 |
| 第三步 | [完整提示词：去除连体服](prompts/03-去除连体服.md) | `gpt-6.1-sol` | `xhigh` | 已接入，无 reviewer |

第一步保留原生图、补全、修画和验收要求，补充多深度拆绘画层及写回上游协议。运行时在正文后附加输入、输出、Krita 路径、前序交付与本步文件名。部件数、形状、画风和深度都从输入读取。

第二步保留逐层修画范围、禁止事项和验收要求，主要明确输入、输出和中断接续方式。输入固定为本任务 `step01/character-depth.kra`、`step01/report.md`，参考图沿用 `../part-layering/references/` 中第一步实际使用的对应图；不再依赖示例的 `demos/soft-edge-krita` 路径。运行时将这些输入与三份输出展开为绝对路径交给 agent。

第三步保留用户的绘制要求，只整理正文并明确输入、输出和续跑方式。输入固定为本任务 `step02/character-soft-edges.kra`，由同一个绘制 thread 切换到 `gpt-6.1-sol / xhigh`：先检查并标记所有涉及连体服的 part，再参考已有皮肤补出构型与肤色，不补人体细节；body/torso 可以简化胸部特征，只补身体轮廓。

## 启动与输入

需要 Node 24.12+、pnpm、已安装的 Krita，以及可用的 Codex 登录配置和 `image_generation` 工具。

```bash
cd workflow-next/raster-layering
pnpm --dir .. install --frozen-lockfile

# 首次启动
pnpm start --name test --krita /path/to/krita

# 以后启动同一任务，只需要名字
pnpm start --name test
```

任务固定保存到 **`workflow-next/.run/<name>/raster-layering/`**，不随 shell 的工作目录改变。`--name` 为单个目录名，支持中文、字母、数字、点、下划线和短横线，以字母或数字开头。输入和 Krita 的相对路径统一从 `workflow-next/.run/<name>/` 解析。

按 `--name` 直接读取 `.run/<name>/part-layering/` 的 parts、参考、groups.json 与 occlusion.json，不接受额外输入路径、不复制上游产物。缺失时列出具体路径，提示先执行对应上游管线或手动放置产物。

续跑继续读取同名上游，step01 的深度修正写回上游并持久保留。首次图像只存于任务根 input，后续管线直接使用前序产物。

`--krita` 首次必须显式指定可执行文件，可以是完整路径、AppImage 的 `AppRun`、macOS 应用内可执行文件或 Windows 可执行文件。后续从 `run.json` 读取，也可显式传入新路径并保存。脚本不从 PATH、环境变量或默认安装目录寻找 Krita，不自动下载、安装或启动显示服务器。

前置检查调用该文件的 `--version`。Linux 无桌面环境时，由调用方准备显示环境；若已安装 Xvfb，可显式使用 `xvfb-run -a pnpm start ...`。

```bash
# 仅检查指定 Krita
pnpm start --krita /path/to/krita --check-krita

# 查看首次执行的完整提示词和计划
pnpm start --name test --krita /path/to/krita --dry-run

# 查看已有任务下一次启动的计划
pnpm start --name test --dry-run
```

`--dry-run` 校验上游产物和 Krita，显示待执行提示词与重置计划，不写文件、不改标记、不调用模型。已完成步骤跳过。

默认 `pnpm start` 会实际调用模型及生图工具，使用当前账号配置。SDK 通过本地 CLI 执行，保留 shell 工具并启用 `image_generation`，使用 `danger-full-access` / `never` 执行配置。

## 文件与交付

```text
workflow-next/.run/test/raster-layering/
  run.json
  step01/
    .running 或 .completed
    prompt.md
    attempts.jsonl
    events.jsonl
    result.json
    error.txt                 # 最近一次失败时存在
    character-depth.kra
    report.md
    ...控制图、部件和修画文件
  step02/
    .running 或 .completed
    character-soft-edges.kra
    character-soft-edges.png
    report.md
    review-01.md
    repair-01.md              # 有反馈时才修复
    review-02.md              # 第一份 review 有问题且已全部修完后才检查
    repair-02.md              # 第二份 review 有问题时才修复
    ...日志、局部检查图和修画记录
  step03/
    .running 或 .completed
    character-dressup-base.kra
    character-dressup-base.png
    report.md
    ...日志和修画记录
```

第一步最终产物为 `step01/character-depth.kra` 和 `step01/report.md`。中间生图、控制图、部件、修画和复查证据也放在本步目录。后续每步使用自己的目录，读取前序交付，不覆盖前序成果。

第二步首次将第一步 KRA 另存为 `step02/character-soft-edges.kra`，保持画布尺寸、部件位置、图层结构、顺序、名称和归属，只做外缘、残色、接缝及线条的局部修画，不新增阴影、AO 或投影。重新打开并核对后导出 `step02/character-soft-edges.png`，逐层检查和修改说明写入 `step02/report.md`。这三份文件都是完成标记的必要交付；中断后继续第二步已有工程。

第三步首次将第二步最终 KRA 另存为 `step03/character-dressup-base.kra`，去除连体服并补全身体底层，保持原尺寸与分层组织。重开核对后导出同名合成 PNG；标记过的 part、补全方式和检查结果写入 `step03/report.md`。三份文件交付并完成自检后写入 `.completed`，不再调用 reviewer；中断时保留工程，使用原 thread 续跑。

`run.json` 保存配置与会话记录：任务名、原输入位置、显式 Krita 路径及版本、各步模型配置、当前共用的 `threadId`。**它不记录步骤完成状态**，不保存另一套 `steps[].status`。步骤进度只由标记文件决定；`result.json` 和日志也不是状态依据。

`prompt.md` 保存本步初次绘制最近使用的完整提示词，`attempts.jsonl` 追加每次调用的阶段、时间、模型及绘制会话 ID，`events.jsonl` 追加带调用标识的 SDK 事件。中断续跑保留已有产物和历史日志；`result.json` 保存初次绘制的最近结果，`error.txt` 保存最近一次失败说明。review / 修复调用使用各自的提示词和结果日志。

每步必须明确返回 `completed` 或 `blocked`。只有模型返回 `completed`、已保存 thread ID，并且必要交付文件非空且位于本步目录内时，才能完成步骤。第二步还须完成下面的 review / 修复流程，之后才将 `.running` **原子重命名**为 `.completed`。回合正常结束或仅生成部分文件都不等于完成；视觉质量、逐层显隐和重开核对仍须 agent 实际执行并写入报告，文件检查不替代美术验收。

## 第二步 review 与修复

reviewer 使用 `gpt-6-astra / xhigh`，每次调用都新建会话，不保存或恢复 reviewer 的 thread ID；修复继续使用 `run.json.threadId` 中的原绘制会话。reviewer 依据当前 KRA、原图和已有 Markdown 记录独立检查。它的提示词使用固定目录，只将 `{review_report_filename}` 替换成本次报告文件名，不包含轮次或次数上限说明。

调度顺序固定为：

1. 生成 `review-01.md`。没有问题就直接结束；有问题则交给原 agent，把全部反馈修复并自检完成，才生成 `repair-01.md`。
2. 第一份反馈全部解决后生成 `review-02.md`。没有问题就结束；有问题则继续原 agent，把全部反馈修复并自检完成，生成 `repair-02.md` 后直接结束，不再调用第三次 reviewer。

**两次限制针对 review，不限制解决同一份反馈所需的修复调用。** 修复报告仍写“结论：仍有问题”时继续原 thread 修复，不发布正式 `repair-XX.md`，不进入下一次 review，也不将第二步标为完成。工具受阻、断流或人为中断时保留 `.running`；下次使用同一 `--name`，仍继续当前未完成的环节。

进度只看正式 Markdown 文件，不在 `run.json` 中增加 review 状态或计数。review 报告第一行为 `结论：通过` 或 `结论：需要修复`；正式 repair 报告第一行为 `结论：已修复`。报告内容决定是结束还是修复，文件是否存在决定对应环节是否执行完成。

报告先写同名 `.tmp` 暂存文件，模型回合成功、结论与正文有效、必要交付文件检查通过后，由程序原子发布为正式 Markdown。第二步首次绘制的 `report.md` 也按此方式发布，用来区分“继续初次绘制”和“开始 review / 修复”。暂停在 review 阶段时不会重新执行初次绘制；暂停在修复阶段时不会重跑已经完成的 review。reviewer 的临时服务错误在本次检查的同一会话内自动重试；进程退出后重新开始尚未完成的检查，使用新会话。

在停止当前进程后，删除某份正式 review / repair Markdown，下次启动就从该环节继续，清理后续 review / repair 报告，保留第二步工程与原绘制 thread；已有后续步骤目录同时失效。删除整个 `step02/.completed` 仍沿用原有规则：重置第二步及后续步骤，并开启新绘制 thread。

旧版本已完成第二步但还没有 review 报告的任务，会保留已有 KRA 和原 thread，自动补做 review。每次调用的提示词与结果保存为 `review-01.prompt.txt`、`review-01.result.json` 等日志；这些日志和 `.tmp` 文件都不作为进度依据。

## 续跑与重跑

| 磁盘情况 | 下次启动行为 |
| --- | --- |
| 存在 `.completed` | 跳过该步，保留交付；第二步还会确认 review / 修复记录已完成 |
| 存在 `.running`，没有 `.completed` | 保留目录与产物，从当前 thread 继续 |
| 步骤目录存在，两个标记都没有 | 清空该步及所有后续步骤目录，清除旧 thread ID，重新开始 |
| 步骤目录不存在 | 正常开始新步骤；如果后续目录仍在，则先使后续目录失效并重置 thread |

`.running` 在调用 agent 前创建，表示“已开始、尚未完成”，不代表系统进程仍在运行。退出、断网、受阻、交付缺失或其他错误都保留它。若首次调用尚未取得 thread ID 就中断，下次会创建会话；已有 ID 时必须恢复原会话，恢复失败直接报错，绝不悄悄换新 thread。

正常从第一步进入第二、三步也使用同一个 thread，仅切换该步的模型。SDK 发出 `thread.started` 时立即保存 ID。续跑需要同一 Codex 用户配置下保留的本地会话历史；复制 `.run/` 不会同时复制 SDK 会话。

已完成第一步的任务直接执行 `pnpm start --name test`，会跳过第一步，在原 thread 中开始第二步，完成 review / 修复后进入第三步；已完成第二步及 review 的任务直接接续第三步。新任务顺序执行全部三步。

**重跑只需删除完成标记，然后照常用名字启动：**

```bash
# 从第一步重跑：清空 step01 及所有后续步骤目录
rm ../.run/test/raster-layering/step01/.completed
pnpm start --name test

# 从第二步重跑：保留 step01 与上游产物
rm ../.run/test/raster-layering/step02/.completed
pnpm start --name test
```

重置会删除被重跑步骤及后续步骤的全部产物和日志，包括磁盘上已有但当前尚未接入提示词的后续步骤。上游产物及深度修正和任务配置保留，`threadId` 清空；开始执行时创建新 thread，后续步骤继续使用它。新会话会收到上游产物和前序已完成步骤的产物、报告路径。

清理先持久化清空的 thread ID，再从后往前删目录，触发重跑的目录最后删除，因此清理中断后仍能继续重置。要让一个未完成的步骤也从头重跑，先停止进程，再删除该步的 `.running`，同样按“目录存在但无标记”处理。

同一名字一次只启动一个进程，手工改标记前先停止当前运行。若 `.completed` 仍在但必要交付已丢失，程序会明确报错：恢复交付，或删除标记重跑，不会自行改变完成状态。

旧的 raster/input 副本用共享迁移命令处理：`pnpm --dir workflow-next migrate-inputs --name <name>`。先加 `--dry-run` 查看计划；迁移保留绘制 thread、完成标记及工程，冲突时不覆盖。

## 代码入口与验证

- [run.ts](run.ts)：本管线入口；参数解析、安装检查入口和中断信号由 [共享 CLI](../shared/raster/cli.ts) 处理。
- [krita.ts](../shared/raster/krita.ts)：只检查明确提供的 Krita。
- [input.ts](../shared/raster/input.ts)：按 name 定位并检查上游 parts 与必要文件。
- [steps.ts](steps.ts)：三步模型配置与交付要求；[共享步骤模块](../shared/raster/steps.ts) 附加正文后的运行信息。
- [agent.ts](../shared/raster/agent.ts)：官方 SDK 的 `startThread`、`resumeThread`、`runStreamed` 和回合结果处理。
- [run-store.ts](../shared/raster/run-store.ts)：任务配置、标记读取、输入初始化和级联重置。
- [workflow.ts](../shared/raster/workflow.ts)：前置检查、顺序执行、共享会话与交付检查。
- [review.ts](../shared/raster/review.ts)：读取 Markdown 进度，调度独立 reviewer 与原会话修复，原子发布报告。

验证命令为 `pnpm check` 和 `pnpm test`。定向测试模拟 SDK 事件，使用实际步骤提示词，覆盖上游产物、名字与路径、中断续跑、标记重跑、跨步骤会话与模型、第二步实际输入输出和合成 PNG 必需交付、review / 修复完成后进入第三步，以及清理中断恢复，不调用付费模型。使用 SDK 0.161.0；参考 [Codex SDK 文档](https://developers.openai.com/codex/sdk/)及依赖随包提供的 README 和类型声明。

共享安装、路径规则、工具配置和临时错误恢复见 [workflow-next 使用说明](../README.md)。所有相对输入路径从 `.run/<name>/` 解析；本管线管理自身步骤目录，step01 额外通过工具精准修正对应上游的 occlusion.json。

多深度与工具协议见 [共享说明](../README.md#多深度与上游修正)。step01 既处理已标注区域，也处理组装中新发现的跨深度；自行拆 KRA 层并记录映射，必要时局部补画，通常只需切分现有像素。后续步骤与 reviewer 保留这些分片，不将同一 part 的多层当作重复。
