# 新流程维护工具

`check_workflow_dsl.py` 静态检查各技能的 `流程.yaml`、资源路径和执行入口，不参与制作任务或 worker 调度。默认检查 `workflow-next/` 下的技能，也可传入要检查的目录。

安装 `PyYAML>=6,<7` 后，从仓库根目录运行 `python3 workflow-next/tools/check_workflow_dsl.py`。
