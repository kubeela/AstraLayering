# 表情制作工具

本目录是 `agent-tools/expressions/`，保存表情专项工具与协议；节点通过 `asset` 引用公共工具，总控解析为绝对路径后交给 worker，工具不依赖运行时当前目录。

| 工具 | 用途 |
| --- | --- |
| `expression_assets.py` | 累计关键形数据检查与临时姿态 |
| `validate_contract.py` | 最终控制 JSON、SVG 引用及指令校验 |
| `svg_preview.py`、`render_svg.cjs` | PNG 渲染、局部、独显与对比 |
| `build_preview_assets.py` | 从包内 schema/样例重建离线资源；仅维护时使用 |

`expression_assets.py` 处理制作阶段的 `materials.json`：检查关键形、实际 SVG 引用与责任归属，或生成临时关键形姿态 SVG；所有路径参数为实际文件路径，源 SVG 不会被改写。

```text
python expression_assets.py check --svg character.svg --materials materials.json
python expression_assets.py pose --svg character.svg --materials materials.json --values pose-values.json --output preview/pose.svg
```

`pose-values.json` 是数值参数对象，例如 `{"eye.left.open":0.5,"mouth.open":0.5,"mouth.form":-1}`，参数名必须在当前材料中真实存在；未指定参数使用默认值，枚举/动画/包装层变换由最终 rig 运行时处理。

可加 `--show <实际id>` / `--hide <实际id>`，用于查看默认隐藏的完整素材；这是预览显隐覆盖，不应保存回交付 SVG。静态姿态交给上一级的 `svg_preview.py` 渲染和对照，实际循环、出生锚点、淡入淡出与组合在公共 [expression-preview](../preview/expression-preview.html) 联调。

材料 JSON 顶层固定为 `schema_version`、`character_id`、`parameters`、`bindings`、`anchors`、`components`；parameter、path_morph binding、anchor 直接复用现有 expression schema 定义，不新增另一种路径格式。components 的 id、owner_node、svg_ids、parameter_ids、role、motion、style_notes 只用于内部制作交接，不能复制成 rig 的额外顶层字段。

component 的 svg_ids/parameter_ids 为字符串数组，role/motion/style_notes 为非空字符串；每个实际 SVG 节点只登记一个主责组件，每个已声明参数须有组件负责。制作初始材料可为空，不能因此当成满足最终 rig 的完整要求。

`bindings` 在此阶段只保存实际已画的 path_morph；其他包装层、跟随与动态要求记录在组件 motion，绑定阶段转换成完整 rig。工具复用现有几何校验器，没有为未制作的动画伪造时钟，也不把材料通过当作最终控制定义通过。

渲染需要 Python 3、Pillow、Node.js 与 sharp，可用 `REVIEW_NODE` 和 `REVIEW_SHARP` 指向已安装运行时；所需辅助脚本已随包携带。

```text
python ../svg_preview.py character.svg preview.png
python ../svg_preview.py candidate.svg comparison.png --compare baseline.svg --part eye_left --part mouth
python validate_contract.py controls.json --command command.json
```

离线预览器源文件在 `agent-tools/preview/`；从仓库根运行 `python agent-tools/expressions/build_preview_assets.py` 更新 schema 与样例资源。维护者只有明确需要导出网页副本时才添加 `--publish <目标目录>`；仓库的 `loading/` 只保留网页跳转入口。
