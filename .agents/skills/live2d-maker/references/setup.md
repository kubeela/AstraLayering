# 安装与前置

首次安装、换机器、切换 CLI／provider 或遇到依赖问题时读取本页。模型选择见 [model-presets](model-presets.md)，启动、web 连接与巡检见 [workflow](../workflow/README.md)。

## 依赖一览

完整启动依赖表（每项一行，注明必选／可选与何时需要）在[项目首页 · 准备软件与仓库](../../../../readme.md#1-准备软件与仓库)；独立安装 skill 时见 [GitHub 上的首页](https://github.com/wu-tian807/AstraLayering#1-准备软件与仓库)。概括如下：

- **必选：** Node.js 24.12+、Git、Krita（只跑分块时可不装）。
- **默认必选：** Codex CLI 与登录；使用 Codex 时还需要 C/C++ 工具链，Rust 自动准备。
- **可选：** Claude Code CLI（`claude-*` 模型）、Antigravity CLI（`gemini-4-argon`）、GPT Image 生图服务、Nano Banana 生图服务。
- **Linux 无桌面时必选：** Xvfb。

缺少依赖时，说明实际需要安装、配置的软件，**确认所选方案后再执行**。已有针对该机器和方案的授权直接沿用，方案或范围改变时再确认。

## 安装方式

**完整仓库：** 按首页准备依赖后，双击对应系统的 start-workbench 启动文件。脚本通过 npm 准备 pnpm 10.33.0、安装依赖、在缺少时创建默认 `.env` 并打开前端，任务在网页新建与运行。已有配置原样复用。维护者也可在仓库根目录执行 `pnpm install --frozen-lockfile`，同时安装工作台与 skill 依赖。

**独立 skill：** 需要 `wu-tian807/AstraLayering` 中 `.agents/skills/live2d-maker` 整个目录，包含运行代码、提示词、参考图和锁文件。使用 skill 安装器时选择 `--method git` 稀疏检出，控制大仓库下载量。agent 从 SKILL.md 所在目录执行：

```sh
node --version
pnpm --version
pnpm install --frozen-lockfile
```

六条管线共用一次安装，任务存放在 skill 外的运行根目录。独立 skill 的网页由完整仓库提供：已有服务直接复用，缺少时按 [workflow](../workflow/README.md#工作台启动与连接)在 skill 外准备工作台 checkout，保持版本、任务目录与原执行环境一致。

## 按执行范围检查

| 范围 | 前置条件 |
| --- | --- |
| 全部管线 | Node.js 24.12+、pnpm 10.33.0；所选 harness 的 CLI、登录／provider 与模型授权 |
| 人物／衣服 part | 所需参考／上游；新参考与补全辅助图需要相应生图能力 |
| 人物／衣服 raster | 完整 part 输入、Krita、可用的显示环境与所选生图能力 |
| 穿戴组装 | 人物素体 KRA、衣服 KRA、简化穿衣参考、Krita 与显示环境 |
| 阴影 | 对应组装与参考、Krita 与显示环境；normal-depth 分支另需生图能力 |

总入口在启动前检查整条所选路线的软件条件，上游成果在各 section 开始时验证。已有软件和仍有效的验证记录直接复用。每次启动检查所选 CLI 的本地版本；路线含 Krita 时还检查 Krita 路径与显示环境（不启动 Krita）；登录、工具和绘图能力在实际调用时核对。

## 模型 CLI 与生图

- **配置：** `.env` 缺少时以 `example.env` 创建默认方案，已有选择沿用。职责、CLI 路径、provider 与各生图协议的自定义见[模型方案与配置](model-presets.md)。主模型使用[统一连接字段](model-presets.md#主模型连接与模型列表)，shell 统一键或旧别名优先于文件；API 密钥只保存在本地配置。
- **Codex：** 复用 `CODEX_HOME`／`~/.codex` 的登录与授权；`.env` 的 `layering_codex_home` 可为工作流的 Codex 另设 `CODEX_HOME`（相对路径以 skill 根目录为基准）。`codex-native` 使用宿主内置 imagegen，只能用于 LLM 是 Codex 的步骤；其他 harness 的生图步骤需改选 GPT Image 或 Nano 服务，填写对应 API URL、key 与协议。
- **Claude Code／Antigravity：** 复用已有 CLI 入口与登录，同样通过共享生图工具 imagegen 调用所选生图服务。CLI 由用户已有安装提供，或按用户确认的方案安装；pnpm 只负责项目依赖。
- **核对：** 在实际后台启动环境执行 `pnpm env:check`，核对实际 skill、配置文件、模型、生图、CLI、图片预算与 shell 覆盖。此命令只预览配置，不验证登录；真实工具调用与恢复验证见 [shared](../shared/README.md#启动验证)。首次正式准备产生合格图片后，可记录为该生图组合的实际证据。

### 补丁

**Codex 补丁：** 所有 Codex 步骤都使用补丁版，程序自动构建并缓存；只用 Claude／AGV 时不构建。`layering_codex_path` 留空即可启用，指定已有入口时检查补丁能力后复用（生图能力要求见[模型方案](model-presets.md#可选模型与服务连接)）。Rust 1.95.0 自动复用或临时安装，构建后清理；Git 和平台 C/C++ 编译工具需要本机提供。依赖缺失或构建失败时查 [patches](../patches/README.md)。

首次需要构建时，程序先检查平台 C/C++ 编译工具链；缺少时会在网页与 `workflow.log` 中直接说明需要安装的软件和处理方法。安装完成后点网页「继续」（命令行 `--continue`），程序重新检查后接着构建，已有会话和制作产物保留。

源码下载、检出、Rust 准备和编译期间，有新输出时会按约 20～30 秒的间隔汇报最近进度，完整输出写入 `build.log`。连续 3 分钟没有新输出时会提示检查网络或继续等待，这个提示本身不会中止构建；可停止任务后配置代理再继续，或指定已构建且通过能力检查的 `layering_codex_path`。Windows 检出与缓存恢复规则见 [patches · 构建进度与恢复](../patches/README.md#构建进度与恢复)。

**Claude Code 兼容层：** 复用已安装的 Claude Code CLI，无需修改或重新编译 CLI，也不需要 Rust 或 C/C++ 工具链。配置 `layering_claude_image_compact_threshold`／`layering_claude_request_compact_mib` 可启用图片数／请求体大小保护，`layering_claude_image_deduplicate=true` 可启用图片去重；这些保护默认关闭。启用后自动准备本地 Messages 转发层，保留原鉴权和原生自动压缩。支持 Anthropic Messages 路由（含自定义 base URL）；Bedrock／Vertex／Foundry 路由启用保护时明确报错。行为与验证见 [patches · 图片容量保护](../patches/README.md#图片容量保护)。

**AGV 兼容补丁：** 需要绕过 CLI 的 60 秒响应头期限时，设置 `layering_agv_unlimited_response_header_timeout=true`；程序准备独立的受控副本，不需要 Rust。适用构建与验证见 patches。

图片数和请求体预算按服务限制配置，通过 `env:check` 核对；切换模型或升级时沿用已有预算。

## Krita 与显示环境

**Krita 本体需提前安装，可由 agent 按已确认的方案协助安装。** 工作流自动准备其私有配置和桥接插件；其他基础依赖仍须按上方[依赖一览](#依赖一览)准备。先检查已有安装、用户路径和任务记录；`--krita` 传实际可执行文件，后台与恢复进程复用同一路径。Linux 解包的 AppImage 可传 `AppRun` 或 `usr/bin/krita`，自动使用其内置 Python 与 `libstdcpp-fallback`，必要时用 `ASTRA_STUDIO_KRITA_PYTHONHOME`／`ASTRA_STUDIO_KRITA_PYTHONPATH` 覆盖。

- **私有进程：** 每个 section 一个私有 Krita，使用临时的独立配置和随附的桥接插件，不改用户的 Krita 目录。agent 通过 `krita` 工具按需启动、查看状态与 pid、执行 Python 脚本，崩溃或卡死时自行重启；section 结束（完成、失败或停止）时由工作流关闭并清理。框架不替 agent 启动 Krita。
- **对话框：** 桥接插件自动取消会卡住无人值守界面的对话框（例如导出参数框），并在工具结果中给出提示。
- **并发上限：** 本机同时运行的 Krita 数量由 `.env` 的 `layering_krita_max_instances` 限制（默认 4，跨任务计算；名额锁位于系统临时目录的 `astra-krita.slots`，可用 `ASTRA_STUDIO_KRITA_SLOTS` 改位置）。需要 Krita 的 section 在开始步骤前占一个名额，持有到 section 结束；名额用满时排队等待。声明 `krita: false` 的步骤不占名额，其 agent 也没有 krita 工具。网页在 section 占用或排队等待 Krita 时显示标识。
- **显示：** Linux 已设置 `DISPLAY`、`WAYLAND_DISPLAY` 或 `QT_QPA_PLATFORM` 时直接沿用，不启动 Xvfb；都没有时工作流启动一个共享的 Xvfb（以 `-noreset` 运行），多个 section 的 Krita 共用它。Xvfb 需要本机安装（`apt install xvfb` 等），不在 PATH 时用 `ASTRA_STUDIO_XVFB` 指定路径。macOS 与 Windows 使用当前桌面。

缺少 Xvfb 时，任务会记录为失败，并在网页与 `workflow.log` 中显示具体依赖、安装方法和显示环境配置提示。补齐后点「继续」（命令行 `--continue`），会重新检查并沿用已有会话和产物接着运行。

Krita 用法只写在 [krita 工具说明](../shared/tools/krita/description.md)，随需要 Krita 的步骤提供。

## 按需功能

- **Nano 透明图：** 使用共享 Node／Sharp 双背景差分，第一张纯色背景 RGB 加第二张仅换背景的图恢复 alpha；原图、alpha 和处理报告保存在请求的 generated/image-processing/。两次串行生图会增加一次调用；第一张已有真实 alpha 时直接保留。失败时保留原图供诊断，透明边缘与半透明材质仍按制作流程复核。完整协议见[生图执行与透明处理](model-presets.md#生图执行与透明处理)。
- **网页原生图层编辑：** 由工作台自己的 Krita 原生合成服务负责（独立 Krita 进程，Linux 需要 Xvfb），不使用制作任务的 Krita；配置见工作台 checkout 的 web/README.md。阴影蒙版检查是 agent 在本 section Krita 中调用的 `inspect_shadow_mask` 工具，无需另配 CLI 或回执，见 [shadow](../shadow/README.md)。普通流程浏览与独立布料示例可直接在现代浏览器查看。
- **浏览器自动验证：** 按需要安装 Playwright／Chromium。资料重建、历史案例与归档脚本的 Python 包按实际执行范围准备；日常运行 Node 管线只需上述基础依赖。

操作记录区分本地版本、配置预览、真实工具调用、会话恢复和绘画验收，并保留各自适用范围。完成检查后按 [SKILL.md](../SKILL.md) 启动、安排巡检并展示工作台。
