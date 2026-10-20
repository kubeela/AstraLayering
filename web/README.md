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
- 流程画布可展开每条管线的内部步骤。人物和衣服 part 展示参考准备、首次分组、逐层拆分、合成预览和深度规划；逐层拆分继续展示轮廓、复核、同层去重、补全、检查和直属结构拆分。下方可按真实树深度查看每个 group / part 并打开其 SVG。
- raster 展示 step01、step02，以及 step02 内的绘制、两轮 review / 修复；人物另有 step03，组装只有一个 step01。review 通过可以提前结束；第二轮修复后不再 review。这里只增加进度预览，启动／恢复仍以整条管线为单位。
- 所选 Git 版本的提示词 Markdown、工具 description 与 schema；支持本地工作区、已有分支／远端引用和提交历史，并可比较版本差异。读取历史版本时兼容 skill 目录与旧 `workflow-next` 目录。只读，不执行 checkout、fetch 或修改配置。

`web/progress.js` 的步骤定义对照现有调度器组织，不参与调度。jianma 归档没有保留逐步执行记录，所以这些子步骤的状态也明确标为示例，不从产物数量推断进度。后续接入真实任务时，按现有 part 的阶段记录、raster 的 `.running` / `.completed` 及 review / repair 报告读取状态；不另造恢复机制。

确认过的正式版范围：五条管线分别运行；新任务只需一张输入图；一个持久保存的运行根目录，自动追踪其中各任务；仓库默认 `<仓库>/.run`，独立安装的 skill 默认 `<skill 上一级>/.run`；运行数据受 Git 忽略。

截图：

- [A：流程进度、部件树与产物工作台](demo-screenshots/01-workbench.png)
- [B：管线与产物依赖画布](demo-screenshots/02-flow.png)
- [独立配置浏览页](demo-screenshots/03-config.png)
- [新建任务](demo-screenshots/04-new-task.png)
- [展开五条管线的子步骤](demo-screenshots/05-expanded-flow.png)
- [part 的拆分层与 group 明细](demo-screenshots/06-part-progress.png)
- [raster 的 review / 修复进度](demo-screenshots/07-raster-progress.png)

验证了实际页面截图、图片加载、SVG 选择、目录选择持久化、Git 分支／提交切换、真实文件差异与只读边界；没有调用模型。
