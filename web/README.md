# Web 交互原型

从仓库根目录运行：

```bash
pnpm web
# 可选：pnpm web --port 4388
```

默认打开 <http://127.0.0.1:4387>。Web 入口位于 skill 外，没有新增前端依赖。

这轮用于确认交互与视觉设计：任务进度是明确标注的示例，新建／运行按钮不会启动 agent，目录选择仅在浏览器中保存。正式的任务启动、服务器持久追踪、状态读取以及默认运行路径调整尚未接入；没有移动或修改现有运行数据。

已连接真实内容：

- `demos/jianma` 的人物和衣服 `groups.json`，按实际 group / part 层级展开。选择节点可查看对应 SVG，阶段卡提供归档图片与 KRA 文件。
- 所选 Git 版本的提示词 Markdown、工具 description 与 schema；支持本地工作区、已有分支／远端引用和提交历史，并可比较版本差异。读取历史版本时兼容 skill 目录与旧 `workflow-next` 目录。只读，不执行 checkout、fetch 或修改配置。

确认过的正式版范围：五条管线分别运行；新任务只需一张输入图；一个持久保存的运行根目录，自动追踪其中各任务；仓库默认 `<仓库>/.run`，独立安装的 skill 默认 `<skill 上一级>/.run`；运行数据受 Git 忽略。

截图：

- [A：流程进度、部件树与产物工作台](demo-screenshots/01-workbench.png)
- [B：管线与产物依赖画布](demo-screenshots/02-flow.png)
- [独立配置浏览页](demo-screenshots/03-config.png)
- [新建任务](demo-screenshots/04-new-task.png)

验证了实际页面截图、图片加载、SVG 选择、目录选择持久化、Git 分支／提交切换、真实文件差异与只读边界；没有调用模型。
