# Live2D Maker

从角色参考图制作人物与衣服的分层素材，输出可编辑的 Krita KRA 与透明 PNG。人物、衣服分层与后续穿戴组装共五条 TypeScript 管线使用 Codex SDK / App Server，共享安装与调度，支持记录进度和续跑。

将本目录完整安装为 Codex skill，使用 `$live2d-maker` 并提供参考图与任务名。Agent 的安装、配置及操作说明见 [SKILL.md](SKILL.md)。需要 Node.js 24.12+、pnpm、可用的 Codex 原生生图环境；栅格绘制需要 Krita。

数据默认保存在 skill 同级的 `<name>/`，也可用管线参数 `--dir <运行根目录绝对路径>` 指定。当前通过命令行运行，后续计划提供可视化前端。交付为静态分层素材，尚不包含 Cubism 绑定与动画。
