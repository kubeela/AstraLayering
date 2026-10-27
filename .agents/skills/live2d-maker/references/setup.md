# 安装与前置

首次安装、换机器、切换 CLI／provider 或遇到依赖问题时读取本页。模型选择见 [model-presets](model-presets.md)，启动、web 连接与巡检见 [workflow](../workflow/README.md)。

## 完整仓库与独立 skill

**完整仓库用户**优先按[项目首页](../../../../readme.md)准备 Node.js 24.12+、Git、Krita 和已登录的 Codex CLI；首次从源码构建 Codex 补丁还需要本机 C/C++ 工具链，首页提供各系统的图形安装入口。双击对应系统的 start-workbench 启动文件，脚本通过 npm 自动准备 pnpm 10.33.0、安装依赖、创建缺少的默认 `.env` 并打开前端，任务在网页新建与运行。已有配置原样复用。

**独立安装**需要 `wu-tian807/AstraLayering` 中 `.agents/skills/live2d-maker` 整个目录，包含运行代码、提示词、参考图和锁文件。使用 skill 安装器时选择 `--method git` 稀疏检出，控制大仓库下载量。agent 从 SKILL.md 所在目录执行：

```sh
node --version
pnpm --version
pnpm install --frozen-lockfile
```

六条管线共用一次安装。完整仓库的维护者也可在仓库根目录执行 `pnpm install --frozen-lockfile` 同时安装工作台与 skill 依赖。任务存放在 skill 外的运行根目录。

独立 skill 的网页由完整仓库提供；已有服务直接复用，缺少时按 [workflow](../workflow/README.md#工作台启动与连接)在 skill 外准备工作台 checkout，保持版本、任务目录与原执行环境一致。

## 按执行范围检查

| 范围 | 前置条件 |
| --- | --- |
| 全部管线 | Node.js 24.12+、pnpm 10.33.0；所选 harness 的 CLI、登录／provider 与模型授权 |
| 人物／衣服 part | 所需参考／上游；新参考与补全辅助图需要相应生图能力 |
| 人物／衣服 raster | 完整 part 输入、Krita、可操作的显示环境与所选生图能力 |
| 穿戴组装 | 人物素体 KRA、衣服 KRA、简化穿衣参考、Krita 及操作能力 |
| 阴影 | 对应组装与参考；Krita 及操作能力，normal-depth 分支另需生图能力 |

总入口在启动前检查整条所选路线的软件条件，上游成果在各 section 开始时验证。已有软件和仍有效的验证记录直接复用。每次入口检查所选 CLI 本地版本；登录、工具和绘图能力按下节实际核对。

### 模型与生图环境

- `.env` 缺少时以 `example.env` 创建默认方案，已有选择沿用。职责、CLI 路径、provider 与各生图协议的自定义见[模型方案与配置](model-presets.md)。主模型使用[统一连接字段](model-presets.md#主模型连接与模型列表)，shell 统一键或旧别名优先于文件；API 密钥保存在本地配置。
- Codex 复用 `CODEX_HOME`／`~/.codex` 的登录与授权。`codex-native` 使用宿主内置 imagegen；拥有生图工具的步骤选择此项时，需要 Codex harness。自定义 GPT／Nano 需对应 API URL、key 与协议，Claude／AGV 使用同名共享生图工具 imagegen。
- CLI、凭据或模型授权缺失时，说明具体问题，并按用户已有授权处理安装、登录或改选模型。pnpm 负责项目依赖，Claude Code／Antigravity 使用已有 CLI 或用户确认的安装方案。
- 在实际后台启动环境执行 `pnpm env:check`，核对实际 skill、配置文件、模型、生图、CLI、图片预算与 shell 覆盖。此命令预览配置；真实工具调用与恢复验证见 [shared](../shared/README.md#启动验证)。首次正式准备产生合格图片后，可记录为该生图组合的实际证据。

### 启动时自动准备补丁

使用 Codex harness 时，按正常流程启动即可：程序自动构建并缓存本仓库的补丁版，Rust 1.95.0 自动复用或临时安装，构建后清理临时环境。`layering_codex_path` 留空即可启用；指定已有入口时，程序检查能力后复用。agent 在出现依赖缺失或构建失败时再查 [patches](../patches/README.md)；Git 和平台 C/C++ 编译工具需要本机提供。

需要 AGV 期限兼容时，设置 `layering_agv_unlimited_response_header_timeout=true`，适用构建与验证见 patches。图片数和请求体预算按服务限制配置，通过 `env:check` 核对，切换模型或升级时沿用已有预算。

## Krita

**Krita 是人物／衣服绘制、组装和阴影操作 KRA 的前置软件。** 先检查已有安装、用户路径和任务记录；`--krita` 传实际可执行文件（Linux 解包的 AppImage 可传 `AppRun` 或 `usr/bin/krita`），后台与恢复进程复用同一路径。

Krita 本身由外部提供，其余由工作流准备：每个 section 一个私有 Krita 进程，使用临时的独立配置和随附的桥接插件，不改用户的 Krita 目录。agent 通过 `krita` 工具按需启动、查看状态与 pid、执行 Python 脚本，崩溃或卡死时自行重启；section 结束（完成、失败或停止）时由工作流关闭并清理。网页在 section 的 Krita 运行时显示“Krita 运行中”。桥接插件会自动取消会卡住无人值守界面的对话框（例如导出参数框），并在工具结果中给出提示。

Linux 有 DISPLAY 或 WAYLAND_DISPLAY 时在该显示上运行；没有时工作流启动一个共享的 Xvfb（`apt install xvfb` 等，或用 `ASTRA_STUDIO_XVFB` 指定路径），多个 section 的 Krita 共用它。本机同时运行的 Krita 上限由 `.env` 的 `layering_krita_max_instances` 配置（默认 4，跨任务计算）：需要 Krita 的 section 在开始步骤前占一个名额、持有到 section 结束，名额用满时排队等待；声明 `krita: false` 的步骤不占名额，其 agent 也没有 krita 工具。解包的 AppImage 会自动使用其内置 Python 与 `libstdcpp-fallback`，必要时用 `ASTRA_STUDIO_KRITA_PYTHONHOME`／`ASTRA_STUDIO_KRITA_PYTHONPATH` 覆盖。

缺少 Krita 时，由 agent 准备本机安装方案。**安装前向用户说明实际需要安装、配置的软件，确认所选方案后执行。** 已有针对该机器和方案的授权直接沿用；方案或范围改变时再确认。

所有操作 Krita 的提示词自动附上同一份 [environment.md](../shared/krita/environment.md)，工具用法见 [krita 工具说明](../shared/tools/krita/description.md)。

## 按需功能

- **Nano 透明图**使用共享 Node／Sharp 双背景差分：第一张纯色背景 RGB 加第二张仅换背景的图恢复 alpha，原图、alpha 和处理报告保存在请求 generated/image-processing/。两次串行生图会增加一次调用；第一张已有真实 alpha 时直接保留。失败时保留原图供诊断，透明边缘与半透明材质仍按制作流程复核。完整协议见[生图执行与透明处理](model-presets.md#生图执行与透明处理)。
- **网页原生图层编辑与阴影检查**使用 Krita Python 插件；当前独立合成服务和原生检查涉及 Xvfb，平台配置见工作台 checkout 的 web/README.md 与 [shadow](../shadow/README.md)。普通流程浏览与独立布料示例可直接在现代浏览器查看。
- **浏览器自动验证**按需要安装 Playwright／Chromium。资料重建、历史案例与归档脚本的 Python 包按实际执行范围准备；日常读取现有参考和运行 Node 管线使用上述基础依赖。

操作记录区分本地版本、配置预览、真实工具调用、会话恢复和绘画验收，并保留各自适用范围。完成检查后按 [SKILL.md](../SKILL.md)启动、安排巡检并展示工作台。
