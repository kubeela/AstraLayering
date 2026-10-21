# Live2D Maker

从角色参考图制作人物与衣服的分层素材，输出可编辑的 Krita KRA 与透明 PNG。人物、衣服分层与后续穿戴组装共五条 TypeScript 管线使用 Codex SDK / App Server，共享安装与调度，支持记录进度和续跑。

将本目录完整安装为 Codex skill，使用 `$live2d-maker` 并提供参考图与任务名；agent 会启动总调度、连接工作台展示当前任务，并在宿主具备定时能力时每 2 小时检查与恢复任务。Agent 的安装、配置及操作说明见 [SKILL.md](SKILL.md)。需要 Node.js 24.12+、pnpm、可用的 Codex 原生生图环境；栅格绘制和组装需要 Krita，Python 默认复用 Codex 已有环境。

Agent 会在启动前检查所选路线的依赖。缺少 Krita 时先与你确认安装方案，再帮助安装：有桌面优先推荐官方原生安装包配合 computer use，也可选择 Krita 配合无桌面显示环境的 headless 方案。

首次没有 `.env` 时，agent 会先让你确认[默认、优化或自定义模型方案](references/model-presets.md)，再填写配置。人物与衣服按职责共用 LLM 模型；每个拥有生图工具的 agent 可独立选择生图模型。已有 `.env` 继续复用。

数据默认保存在 `<仓库>/.run/<name>/`，独立安装时为 `<skill上一级>/.run/<name>/`；可用管线参数 `--dir <运行根目录绝对路径>` 指定。仓库根目录执行 `pnpm web` 启动可视化工作台；独立 skill 不包含网页代码，安装与连接见[工作台说明](references/workbench.md)。交付为静态分层素材，尚不包含 Cubism 绑定与动画。

从 skill 根目录执行总入口：`pnpm start --name <任务名> --image <参考图> --krita <可执行文件> --background`。续跑用 `pnpm start --name <任务名> --background`，查询加 `--status`；自定义运行根目录时始终附带相同 `--dir <绝对路径>`。总控进度保存在 `<运行根目录>/<任务名>/run.json`。
