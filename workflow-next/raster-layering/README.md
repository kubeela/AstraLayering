# raster-layering

用 TypeScript 和 `@openai/codex-sdk` 顺序执行栅格分层流程。当前只执行第一步：读取已完成的 `part-layering` 产物，使用原生 `image_generation` 工具生图，在 Krita 中配准、修画和交付。

| 顺序 | 内容 | 模型 | 推理强度 | 状态 |
| --- | --- | --- | --- | --- |
| 前置 | 检查参数指定的 Krita 可执行文件及版本 | 无模型调用 | — | 已接入 |
| 第一步 | [完整提示词：分层与补全](prompts/01-分层与补全.md) | `gpt-6-astra` | `xhigh` | 已接入 |
| 第二步 | 待提供提示词 | `gpt-6-astra` | `xhigh` | 仅保存模型配置 |
| 第三步 | 待提供提示词 | `gpt-6.1-sol` | `xhigh` | 仅保存模型配置 |

第一步正文保留用户提供的完整要求，只整理 Markdown 排版和断行。运行时在正文后附加输入、输出、Krita 路径、前序交付与本步文件名。部件数、形状、画风和深度都从输入读取。

## 启动与输入

需要 Node 24.12+、pnpm、已安装的 Krita，以及可用的 Codex 登录配置和 `image_generation` 工具。

```bash
cd workflow-next/raster-layering
pnpm install

# 首次启动
pnpm start --name test --input ../part-layering/.run/test --krita /path/to/krita

# 以后启动同一任务，只需要名字
pnpm start --name test
```

任务固定保存到 **本模块的 `.run/<name>/`**，不随 shell 的工作目录改变。`--name` 为单个目录名，支持中文、字母、数字、点、下划线和短横线，以字母或数字开头。输入和 Krita 的相对路径仍相对调用方工作目录解析。

`--input` 通常传入 `part-layering/.run/test`，程序自动使用 `test/parts/`；直接传入 `test/parts` 也可以，不会重复追加 `parts`。首次启动将 `parts/`、已有的 `references/`、`groups.json`、`occlusion.json` 和 `preview.svg` 复制到任务内的 `input/`，同时记录原输入位置。符号链接会复制实际内容。输入副本和配置全部就绪后才发布任务目录，复制中断不会留下可被误用的半份输入。

续跑使用已保存的输入，不依赖原目录继续存在，也不覆盖副本。再次显式传入 `--input` 时，只校验是否为原先绑定的位置；要改用另一份输入或重新导入源文件，请使用新的 `--name`。

`--krita` 首次必须显式指定可执行文件，可以是完整路径、AppImage 的 `AppRun`、macOS 应用内可执行文件或 Windows 可执行文件。后续从 `run.json` 读取，也可显式传入新路径并保存。脚本不从 PATH、环境变量或默认安装目录寻找 Krita，不自动下载、安装或启动显示服务器。

前置检查调用该文件的 `--version`。Linux 无桌面环境时，由调用方准备显示环境；若已安装 Xvfb，可显式使用 `xvfb-run -a pnpm start ...`。

```bash
# 仅检查指定 Krita
pnpm start --krita /path/to/krita --check-krita

# 查看首次执行的完整提示词和计划
pnpm start --name test --input ../part-layering/.run/test --krita /path/to/krita --dry-run

# 查看已有任务下一次启动的计划
pnpm start --name test --dry-run
```

`--dry-run` 校验输入和 Krita，显示待执行步骤的提示词与重置计划，不复制输入、不改配置、不清理目录、不改标记，也不调用模型。首次预览中的输入副本路径是正式启动时将创建的位置。已完成步骤直接显示跳过。

默认 `pnpm start` 会实际调用模型及生图工具，使用当前账号配置。SDK 通过本地 CLI 执行，保留 shell 工具并启用 `image_generation`，使用 `danger-full-access` / `never` 执行配置。

## 文件与交付

```text
workflow-next/raster-layering/.run/test/
  run.json
  input/
    parts/
    references/
    groups.json
    occlusion.json
    preview.svg
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
  step02/                     # 接入提示词并开始执行时才创建
  step03/
```

第一步最终产物为 `step01/character-depth.kra` 和 `step01/report.md`。中间生图、控制图、部件、修画和复查证据也放在本步目录。后续每步使用自己的目录，读取前序交付，不覆盖前序成果。

`run.json` 保存配置与会话记录：任务名、原输入位置、显式 Krita 路径及版本、各步模型配置、当前共用的 `threadId`。**它不记录步骤完成状态**，不保存另一套 `steps[].status`。步骤进度只由标记文件决定；`result.json` 和日志也不是状态依据。

`prompt.md` 保存本步最近使用的完整提示词，`attempts.jsonl` 追加每次调用的时间、模型和起始 thread ID，`events.jsonl` 追加带调用标识的 SDK 事件。中断续跑保留已有产物和历史日志；`result.json`、`error.txt` 表示最近一次尝试的结果。

每步必须明确返回 `completed` 或 `blocked`。只有模型返回 `completed`、已保存 thread ID，并且必要交付文件非空且位于本步目录内时，程序才将 `.running` **原子重命名**为 `.completed`。回合正常结束或仅生成部分文件都不等于完成；视觉质量、逐层显隐和重开核对仍须 agent 按正文执行并写入报告，文件检查不替代美术验收。

## 续跑与重跑

| 磁盘情况 | 下次启动行为 |
| --- | --- |
| 存在 `.completed` | 跳过该步，保留交付 |
| 存在 `.running`，没有 `.completed` | 保留目录与产物，从当前 thread 继续 |
| 步骤目录存在，两个标记都没有 | 清空该步及所有后续步骤目录，清除旧 thread ID，重新开始 |
| 步骤目录不存在 | 正常开始新步骤；如果后续目录仍在，则先使后续目录失效并重置 thread |

`.running` 在调用 agent 前创建，表示“已开始、尚未完成”，不代表系统进程仍在运行。退出、断网、受阻、交付缺失或其他错误都保留它。若首次调用尚未取得 thread ID 就中断，下次会创建会话；已有 ID 时必须恢复原会话，恢复失败直接报错，绝不悄悄换新 thread。

正常从第一步进入第二、三步也使用同一个 thread，仅切换该步的模型。SDK 发出 `thread.started` 时立即保存 ID。续跑需要同一 Codex 用户配置下保留的本地会话历史；复制 `.run/` 不会同时复制 SDK 会话。

**重跑只需删除完成标记，然后照常用名字启动：**

```bash
# 从第一步重跑：清空 step01 及所有后续步骤目录
rm .run/test/step01/.completed
pnpm start --name test

# 后续接入第二步后，从第二步重跑：保留 step01 与 input
rm .run/test/step02/.completed
pnpm start --name test
```

重置会删除被重跑步骤及后续步骤的全部产物和日志，包括磁盘上已有但当前尚未接入提示词的后续步骤。`input/` 和任务配置保留，`threadId` 清空；开始执行时创建新 thread，后续步骤继续使用它。新会话会收到输入副本和前序已完成步骤的产物、报告路径。

清理先持久化清空的 thread ID，再从后往前删目录，触发重跑的目录最后删除，因此清理中断后仍能继续重置。要让一个未完成的步骤也从头重跑，先停止进程，再删除该步的 `.running`，同样按“目录存在但无标记”处理。

同一名字一次只启动一个进程，手工改标记前先停止当前运行。若 `.completed` 仍在但必要交付已丢失，程序会明确报错：恢复交付，或删除标记重跑，不会自行改变完成状态。

旧版 `--output` / `--resume` 和 `.workflow/run.json` 布局不再使用。旧输出不会自动迁移或清理；需要保留时继续保留原目录，并为新流程选择新名字。

## 代码入口与验证

- [run.ts](run.ts)：参数解析、安装检查入口和中断信号。
- [krita.ts](krita.ts)：只检查明确提供的 Krita。
- [input.ts](input.ts)：解析 `parts/`，保存输入副本。
- [steps.ts](steps.ts)：顺序步骤、三步模型配置，以及正文后的运行信息。
- [agent.ts](agent.ts)：官方 SDK 的 `startThread`、`resumeThread`、`runStreamed` 和回合结果处理。
- [run-store.ts](run-store.ts)：任务配置、标记读取、输入初始化和级联重置。
- [workflow.ts](workflow.ts)：前置检查、顺序执行、共享会话与交付检查。

收到第二、三步提示词后，将正文放入 `prompts/`，再按 `step02`、`step03` 顺序加入 `steps`。当前不编写或执行后续占位提示词。

验证命令为 `pnpm check` 和 `pnpm test`。定向测试模拟 SDK 事件并注入后续步骤，覆盖输入副本、名字与路径、中断续跑、标记重跑、跨步骤会话与模型，以及清理中断恢复，不调用付费模型。使用 SDK 0.161.0；参考 [Codex SDK 文档](https://developers.openai.com/codex/sdk/)及依赖随包提供的 README 和类型声明。
