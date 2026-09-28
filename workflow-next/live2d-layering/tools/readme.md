# 人物分层工具

`流程.yaml` 中的 `asset` 从本技能根目录索引。总控解析为绝对路径后交给执行者；输入素材与技能资料只读，工具输出写入本轮工作根目录。步骤专用工具位于对应编号步骤的 `tools/`。

| 工具 | 用途 |
| --- | --- |
| `options.py` | 维护本轮 `options.json` |
| `svg_preview.py`、`render_svg.cjs` | 渲染 SVG、独显绘制段和生成局部预览 |
| `check_workflow_dsl.py` | 检查节点配置、资源根相对路径和执行入口 |

选项示例：`python3 tools/options.py set --work-root /绝对路径/输出 simplify true`。已有字段会保留。

预览示例：`python3 tools/svg_preview.py character.svg preview.png`。可按实际审查需要指定 `--only`、`--hide`、`--crop` 等参数。

维护时运行 `python3 tools/check_workflow_dsl.py`；阶段内工具的测试在对应步骤的 `tests/`。
