# 人物分层工具

`流程.yaml` 中的 `asset` 从本技能根目录索引。总控解析为绝对路径后交给执行者；输入素材与技能资料只读，工具输出写入本轮工作根目录。步骤专用工具位于对应编号步骤的 `tools/`。

| 工具 | 用途 |
| --- | --- |
| `options.py` | 维护本轮 `options.json` |
| `svg_preview.py` | 渲染 SVG、独显元素，生成局部、混合及可见形状描边叠加图；依赖 Python、Pillow 和 pyvips[binary] |

选项示例：`python3 tools/options.py set --work-root /绝对路径/输出 simplify true`。已有字段会保留。

预览示例：`python3 tools/svg_preview.py drawing.svg preview.png`。查看某个元素的边缘，可加 `--reference reference.png --crop X Y W H --scale 2 --only 元素id --edge-overlay`；多个元素可重复 `--only`。描边从透明底渲染结果提取，因此包括裁剪、遮罩和孔洞的可见边界，不追踪内部色彩变化。

轮廓色块保存在 `groups.svg`：group 的绘制 `<g>` 使用完整 `data-group-path`，part 的轮廓 `<g>` 使用完整 `data-part-path`。同画布的 `character.svg` 只绘制 part 的真实形状，也使用完整 `data-part-path`。色块边缘叠图是预览诊断，不写入正式 SVG 描线。`loading/svg-preview.html` 按文件区分“组轮廓／部件轮廓”和“部件绘制”。

阶段内工具的测试在对应步骤的 `tests/`。

## 预览工具依赖

Python 需 3.9 或更高版本，依赖统一由本目录 `requirements.txt` 声明。`pyvips[binary]` 的预编译包包含底层 SVG 渲染库，直接通过 Python 调用；固定 pyvips 3.2.0 与 libvips 8.18.6，保持已验证的渲染结果。Pillow 负责混合、描边及对照图拼接。

运行 `python3 /技能根/tools/svg_preview.py --check-deps` 可检查 Python 包，并实际渲染一张内存中的微型 SVG。成功时返回各版本；失败时报告缺项和依赖清单位置，此命令不写入文件。

需要安装时，将依赖放在本轮工作根目录内，保持技能资料只读。例如：

```sh
preview_runtime="/本轮绝对工作根/.runtime/svg-preview"
python3 -m venv "$preview_runtime/python"
"$preview_runtime/python/bin/python" -m pip install -r /技能根/tools/requirements.txt
"$preview_runtime/python/bin/python" /技能根/tools/svg_preview.py --check-deps
```

后续预览使用同一 Python。预编译包支持常见 macOS、Linux、Windows 环境；安装所需的 pip 和网络由执行环境提供。
