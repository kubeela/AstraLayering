# 新流程维护工具

`check_workflow_dsl.py` 静态检查各技能的 `流程.yaml`、资源路径和执行入口，不参与制作任务或 worker 调度。默认检查 `workflow-next/` 下的技能，也可传入要检查的目录。

引用含义固定：`inputs.*` 只指用户根输入，`nodes.*` 只指上游产物，`dispatch.inputs.*` 指调度节点绑定的参数，`dispatch.item.*` 指当前节点，`carry.*` 指最新成功产物。检查器核对引用来源、输出占位符和阶段顺序，拒绝未声明的来源、冗余容器 YAML、覆盖输入稿、交付产物存入临时目录，以及循环输出未按当前项隔离的写法。

安装 `PyYAML>=6,<7` 后，从仓库根目录运行 `python3 workflow-next/tools/check_workflow_dsl.py`。
