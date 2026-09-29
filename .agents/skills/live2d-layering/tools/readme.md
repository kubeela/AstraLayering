# 人物分层技能工具

本目录与 `SKILL.md` 同级。`流程.yaml` 中的 `asset` 从技能根目录索引；总控将它解析为绝对路径，再交给执行者。工具只写入本轮工作根目录，不修改输入素材。步骤专用工具放在该编号步骤的 `tools/`：部位色盘入口、眼部计划校验和大层审查对照。

| 工具 | 用途 |
| --- | --- |
| `options.py` | 读取、写入本轮平级 `options.json`，只依赖 Python 标准库 |
| `extract_palette.py` | 通用取色和色盘排版，步骤入口负责部位展示设置 |
| `svg_preview.py`、`render_svg.cjs` | SVG 渲染、独显、局部对照；需要 Pillow、Node.js 和 sharp |

选项示例：`python3 /绝对路径/tools/options.py set --work-root /绝对路径/输出 simplify true`。`set` 保留已有字段，接受 `true`/`false`；整数或字符串可用 `--type integer`、`--type string`。旧运行只有 `options.yaml` 时，由判断节点按根 `流程.yaml` 核对值后逐项迁移。

预览示例：`python3 /绝对路径/tools/svg_preview.py character.svg preview.png`。可加 `--reference reference.png`、`--compare previous.svg`、`--crop X Y W H`、`--scale 4`、`--only 部件id`、`--hide 部件id` 或 `--toggle 部件id`，按当前任务需要生成一张视图。Node/Sharp 不在默认路径时可设置 `REVIEW_NODE`、`REVIEW_SHARP`。

取色示例：`python3 /绝对路径/tools/extract_palette.py reference.png samples.json palette.png`。输入色样可指定 `point`、`nearest`、`mean`、`median`，或用 `provided` 和 RGB/HEX 排版自行选定的颜色。步骤色盘入口位于对应步骤的 `tools/palette.py`。

工具测试可运行 `python3 -m unittest discover -s tools/tests -p 'test_*.py'`。眼部计划校验另有步骤内测试。
