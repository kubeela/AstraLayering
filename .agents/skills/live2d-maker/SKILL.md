---
name: live2d-maker
description: 从角色参考图制作适合 Live2D 后续绑定的人物与衣服分层素材，启动并恢复 Codex、Claude Code 或 Antigravity / Krita 制作管线、跟踪进度和处理异常，交付可编辑 KRA 与 PNG。用于让 agent 开始制作、接续已有任务或查看结果；当前不包含 Cubism 绑定与动画制作。
---

# Live2D Maker

负责从输入准备、启动管线、持续追踪到交付结果。遵循人物与衣服各自已有的绘图提示词、验收要求和审核轮次。

1. **确定任务。** 区分新制作和续跑，询问缺失的参考图、任务名与工作路径；新任务还要确认是否用 `--standard` 标准化姿态，已说明或续跑有记录时不重复询问。未指定路径时，告知用户实际绝对路径并使用默认的 `<仓库>/.run/<name>/`（独立安装时为 `<skill上一级>/.run/<name>/`）；`--dir` 指定运行根目录，相对输入路径从 `<dir>/<name>/` 解析，数据不得放在 skill 内。
2. **准备依赖。** 启动前读取[安装与前置](references/setup.md)，检查本次路线需要的模型、CLI、登录和生图配置。缺少 Claude Code／Antigravity CLI 或凭据时向用户说明并询问下一步，不自动安装 CLI。缺少 Krita 时先确认桌面或 headless 方案再安装；有桌面优先推荐官方原生安装包配合 computer use。Python 默认复用已有环境。
3. **启动或续跑。** 按[总入口与配置](references/workflow-details.md#总入口)使用 `pnpm start`，确认后台启动与当前状态。总控记录在 `<dir>/<name>/run.json`；已有任务用相同名称和运行根目录恢复，活跃任务直接接管监听，避免重复启动。
4. **展示工作台。** 按[工作台启动与连接](references/workbench.md)复用或启动真实前端，核对追踪的是同一任务目录，打开任务页并给用户可访问的链接。独立安装时按该文档补齐网页入口。
5. **持续追踪。** 按[巡检与恢复](references/monitoring.md)创建宿主每 2 小时的检查，主动诊断、整理上下文并重试可恢复故障，直到完成或用户取消。必要时可换 thread，完整保留记录和产物。宿主无定时能力时明确告知，不安装替代定时器；不能只记录故障后等待用户。
6. **交付结果。** 核对 KRA、PNG 和报告，查看合成图，给出实际文件入口及遗留问题，完成或取消后关闭定时检查。具体交付路径见[交付说明](references/workflow-details.md#交付)。

按需读取：指定组、拆分限深或单阶段调试见[单管线操作与验收](references/individual-pipelines.md)；逐步骤模型和生图选择见[模型与 harness](references/agent-models.md)；provider、图片压缩和工具配置见[配置与工作流细节](references/workflow-details.md#codex-环境配置)。
