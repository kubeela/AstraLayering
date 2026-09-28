# 衣装技能工具

本目录与 `SKILL.md` 同级。`流程.yaml` 中的 `asset` 从技能根目录索引；总控将它解析为绝对路径，再交给执行者。共用工具在本技能内保存独立副本，不依赖人物分层技能或仓库级工具目录。

| 工具 | 用途 |
| --- | --- |
| `options.py` | 读取、写入本轮平级 `options.json`，只依赖 Python 标准库 |
| `extract_palette.py` | 通用取色和色盘排版；本技能的衣装展示入口位于 `4.衣装色盘/tools/palette.py` |
| `svg_preview.py`、`render_svg.cjs` | SVG 渲染、独显、局部对照；需要 Pillow、Node.js 和 sharp |
| `check_workflow_dsl.py` | 检查本技能的执行入口、根相对路径与资源归属；需要 PyYAML |

预览示例：`python3 /绝对路径/tools/svg_preview.py character.svg preview.png`。可按需要加 `--reference`、`--compare`、`--crop X Y W H`、`--only`、`--hide` 或 `--toggle`；Node/Sharp 不在默认路径时可设置 `REVIEW_NODE`、`REVIEW_SHARP`。

取色示例：`python3 /绝对路径/4.衣装色盘/tools/palette.py reference.png samples.json palette.png`。步骤入口调用同技能 `tools/extract_palette.py`，色样可自行选择 `point`、`nearest`、`mean`、`median` 或 `provided`。

维护时运行：`python3 tools/check_workflow_dsl.py`，再按需要运行 `python3 -m unittest discover -s tools/tests -p 'test_*.py'`。
