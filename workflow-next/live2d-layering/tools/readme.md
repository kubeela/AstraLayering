# 人物分层工具

`流程.yaml` 中的 `asset` 从本技能根目录索引。总控解析为绝对路径后交给执行者；输入素材与技能资料只读，工具输出写入本轮工作根目录。步骤专用工具位于对应编号步骤的 `tools/`。

| 工具 | 用途 |
| --- | --- |
| `options.py` | 维护本轮 `options.json` |
| `svg_preview.py`、`render_svg.cjs` | 渲染 SVG、独显元素，生成局部、混合及可见形状描边叠加图 |

选项示例：`python3 tools/options.py set --work-root /绝对路径/输出 simplify true`。已有字段会保留。

预览示例：`python3 tools/svg_preview.py drawing.svg preview.png`。查看某个元素的边缘，可加 `--reference reference.png --crop X Y W H --scale 2 --only 元素id --edge-overlay`；多个元素可重复 `--only`。描边从透明底渲染结果提取，因此包括裁剪、遮罩和孔洞的可见边界，不追踪内部色彩变化。

轮廓色块保存在 `groups.svg`：group 的绘制 `<g>` 使用完整 `data-group-path`，part 的轮廓 `<g>` 使用完整 `data-part-path`。同画布的 `character.svg` 只绘制 part 的真实形状，也使用完整 `data-part-path`。色块边缘叠图是预览诊断，不写入正式 SVG 描线。`loading/svg-preview.html` 按文件区分“组轮廓／部件轮廓”和“部件绘制”。

阶段内工具的测试在对应步骤的 `tests/`。
