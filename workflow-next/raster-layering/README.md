# raster-layering

用 TypeScript 和 `@openai/codex-sdk` 顺序执行栅格分层流程。当前只定义第一步；前置检查通过后，将输入目录和完整提示词交给 Codex，使用原生 `image_generation` 工具生图，在 Krita 中配准、修画和交付。

| 顺序 | 内容 | 模型 | 推理强度 | 状态 |
| --- | --- | --- | --- | --- |
| 前置 | 检查参数指定的 Krita 可执行文件及版本 | 无模型调用 | — | 已接入 |
| 第一步 | [完整提示词：分层与补全](prompts/01-分层与补全.md) | `gpt-6-astra` | `xhigh` | 已接入 |
| 第二步 | 待提供提示词 | `gpt-6-astra` | `xhigh` | 仅保存模型配置 |
| 第三步 | 待提供提示词 | `gpt-6.1-sol` | `xhigh` | 仅保存模型配置 |

第一步正文保留用户提供的完整要求，只整理 Markdown 排版和断行。运行时在正文后附加输入、输出、Krita 路径和交付文件名，不将脸部示例固定成所有部件的配方。部件数、形状、画风和深度都从输入读取。

## 运行

需要 Node 24.12+、pnpm、已安装的 Krita，以及可用的 Codex 登录配置和 `image_generation` 工具。

```bash
cd workflow-next/raster-layering
pnpm install

pnpm start \
  --input ../part-layering/.run/test \
  --output .run/test \
  --krita /path/to/krita
```

`--input` 指向已经跑完的 `part-layering` 运行目录，例如 `../part-layering/.run/test`。程序自动拼接并检查 `test/parts/`，把它作为主要部件产物路径；同时把运行根目录交给 agent，以便读取 `references/`、`groups.json` 和 `occlusion.json`。也支持直接传入 `test/parts`，不会重复追加 `parts`；两种写法在续跑时视为同一份输入。

`--krita` 必须显式指定可执行文件路径，可以是 `krita` 的完整路径、AppImage 的 `AppRun`、macOS 应用内可执行文件或 Windows 可执行文件。脚本不从 PATH、环境变量或默认安装目录猜测 Krita，不自动下载、安装或启动显示服务器。

前置检查会调用该文件的 `--version`。Linux 无桌面环境需要调用方先准备显示环境；若已安装 Xvfb，也可以显式执行：

```bash
xvfb-run -a pnpm start \
  --input ../part-layering/.run/test \
  --output .run/test \
  --krita /path/to/krita
```

只检查 Krita，或在模型调用前查看完整提示词：

```bash
pnpm start --krita /path/to/krita --check-krita
pnpm start --input ../part-layering/.run/test --output .run/test --krita /path/to/krita --dry-run
```

`--dry-run` 只检查输入和 Krita，然后输出完整提示词，不创建运行文件或调用模型。输入与输出目录需要分开。默认 `pnpm start` 会实际调用模型和生图工具，使用当前账号配置；模型按上表指定。SDK 通过本地 CLI 执行，保留 shell 工具并启用 `image_generation`，使用当前项目已授权的 `danger-full-access` / `never` 执行配置。

## 输出与续跑

第一步的最终文件是输出目录中的 `character-depth.kra` 和 `report.md`。生成图、控制图、部件、修画和复查证据由执行该步的 agent 在同一目录保存。

每步必须明确报告 `completed` 或 `blocked`。模型回合正常结束不等于交付完成：只有报告完成且必要文件存在时，程序才记录步骤完成；视觉质量、逐层显隐和重开核对仍须由 agent 按正文执行并写入报告，文件存在检查不能替代美术验收。

中断后沿用输出目录：

```bash
pnpm start --output .run/test --krita /path/to/krita --resume
```

输入目录从记录恢复；已有会话通过 SDK `resumeThread()` 继续，保留已生成文件。已完成步骤且交付仍在时直接复用；交付缺失时回到原会话补齐。同一输出目录供一个运行进程使用。

`.workflow/run.json` 只记录调度状态、尝试次数和会话 ID；每次尝试在 `.workflow/<步骤>/attempt-<次数>/` 保存实际提示词、模型配置、SDK 事件与最终说明。运行目录默认位于忽略的 `.run/` 下，代码不清空它。续跑还需要同一 Codex 用户配置下保留的本地会话；仅复制输出文件不会复制 SDK 会话历史。

## 代码入口

- [run.ts](run.ts)：参数解析、安装检查入口和中断信号。
- [krita.ts](krita.ts)：只校验用户明确传入的 Krita。
- [input.ts](input.ts)：将运行根目录或直接传入的 `parts/` 统一成参考根目录与部件产物路径。
- [steps.ts](steps.ts)：顺序步骤、三步模型配置，以及正文后的运行信息。
- [agent.ts](agent.ts)：官方 SDK 的 `startThread`、`resumeThread`、`runStreamed`，以及回合结果处理。
- [workflow.ts](workflow.ts)：逐步执行、记录和续跑。

后续收到第二、三步提示词后，将其正文放入 `prompts/`，再按顺序加入 `steps`。当前没有替后续步骤编写或执行占位提示词。

验证命令为 `pnpm check` 和 `pnpm test`；定向测试模拟 SDK 事件，不调用付费模型。接口采用与 `part-layering` 一致的 SDK 0.161.0；参考 [Codex SDK 文档](https://developers.openai.com/codex/sdk/)及该依赖随包提供的 README 和类型声明。
