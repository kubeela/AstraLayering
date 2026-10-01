# 人物分层工具

`流程.yaml` 中的 `asset` 从本技能根目录索引。总控解析为绝对路径后交给执行者；输入素材与技能资料只读，工具输出写入本轮工作根目录。步骤专用工具位于对应编号步骤的 `tools/`。

| 工具 | 用途 |
| --- | --- |
| `options.py` | 维护本轮 `options.json` |
| `groups.py` | 校验并发布初始 group 树，校验当前 group 的一层新增 group/part 清单 |
| `svg_preview.py` | 渲染 SVG、独显元素，生成局部、混合及可见形状描边叠加图；依赖 Python、Pillow 和 pyvips[binary] |
| `rendering.py` | 登记独立渲染层，校验树路径与 SVG 名称，绘制完成后绑定受影蒙版，提取完整源图形；沿用预览工具依赖 |
| `svg_containment.py` | 逐个检查直属 group/part 色块是否越出输入父 group，失败时输出越界坐标和红色诊断图；沿用预览工具依赖 |

选项示例：`python3 tools/options.py set --work-root /绝对路径/输出 simplify true`。已有字段会保留。

预览示例：`python3 tools/svg_preview.py drawing.svg preview.png`。查看某个元素的边缘，可加 `--reference reference.png --crop X Y W H --scale 2 --only 元素id --edge-overlay`；多个元素可重复 `--only`。描边从透明底渲染结果提取，因此包括裁剪、遮罩和孔洞的可见边界，不追踪内部色彩变化。

轮廓色块的当前稿统一保存在 `block-layers/groups.svg`，白底预览为 `block-layers/preview.png`。group 的绘制 `<g>` 使用完整 `data-group-path`，part 的轮廓 `<g>` 使用完整 `data-part-path`。同画布的 `character.svg` 保存 part 的真实形状（完整 `data-part-path`）和独立渲染层（同名 `<g id>`）。独立渲染层的归属与依赖另存于 `structure/rendering.json`。色块边缘叠图是预览诊断，不写入正式 SVG 描线。`loading/svg-preview.html` 按文件区分“组轮廓／部件轮廓”和“部件绘制”。

范围检查：`python3 tools/svg_containment.py --parent-svg block-layers/groups.svg --candidate 临时稿.svg --groups groups.json --group-path body --out 轮廓检查.json`。通过后再将临时稿写回当前稿。按树自动检查全部直属孩子，用输入父色块的实际填色范围作边界，保留孔洞、分离区域、变换和裁剪效果。逐个独显孩子，其他色块不会遮住越界。默认每像素边长采样 4 次、透明度阈值 128，采样网格中任一越界即失败；这是渲染形状的包含检查。缺少绑定或空色块也失败。通过返回 0，检查失败返回 1，输入或环境错误返回 2。蓝色为父边缘，绿色为孩子，红色为越界；坐标使用原画布像素。

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

## 独立渲染层

`structure/rendering.json` 的顶层是 `layers` 数组。每项的 `id` 与 `character.svg` 中独立 `<g id>` 同名，`type` 是效果类型（如 shadow、highlight、reflection、glow）。`owner` 指逻辑归属，`follow` 指跟随节点，固定效果可为 null；`clip_to` 是裁切节点路径数组，无裁切时为 `[]`。关系使用 `groups.json` 的完整 group/part 路径，`note` 可补充依据；登记层不改变物理树。

```json
{"layers": [{"id": "skirt_shadow", "type": "shadow", "owner": "pelvis/skirt/skirt_front", "follow": "pelvis/skirt/skirt_front", "clip_to": ["legs/left_thigh", "legs/right_thigh"]}]}
```

- `init --out structure/rendering.json`：首次创建空表，已存在时拒绝覆盖。
- `merge --groups structure/groups.json --rendering structure/rendering.json --patch 新增层.json --out structure/rendering.json`：按 id 新增或更新，保留其他登记；可加 `--scope 完整group路径` 限制修改的归属范围。
- `check --groups structure/groups.json --rendering structure/rendering.json --svg refinement/character.svg`：检查名称、节点路径、独立 `<g>` 和资源引用；`--complete` 进一步检查 receiver 蒙版及登记的一致性。
- `apply --groups structure/groups.json --rendering structure/rendering.json --svg refinement/character.svg --out 组合稿.svg`：在全部受影 part 绘制后绑定 alpha 蒙版。group 裁切使用其后代 part 的透明形状合集。蒙版引用绘制完成的 part，保留孔洞、变换与原有透明度；独立层原始几何、自身软边和自身蒙版不变。重复执行替换工具生成的绑定。
- `extract --svg 组合稿.svg --layer skirt_shadow --raw --out 完整投影.svg`：提取未受 receiver 裁切的源图形；省略 `--raw` 则保留裁切。再用 `svg_preview.py` 查看。

独立层可按实际绘制顺序放置，逻辑 owner 不要求 SVG 嵌套。工具支持常规 SVG 变换；位于嵌套 SVG viewport 中或祖先使用 CSS transform 的独立层，需先移入普通 SVG 分组。检查验证结构，投影是否符合原图、叠放和色彩是否合理由制作 worker 查看实际组合图。`follow` 为动画关系记录，本工具不生成动画变形器。

载入 `loading/svg-preview.html` 时，可同时提供 `groups.json` 与 `rendering.json`，独立渲染层按同名 id 显示在 owner 节点下，鼠标悬停可看跟随和裁切关系；无关联时仍按 SVG 原生图层查看。
