# 本轮选项工具

负责判断的 agent 使用统一入口 `options.py`，更新工作根目录的 `options.json`；总控读取选项并调度。工具只用 Python 3.8+ 标准库，无需 Ruby、PyYAML 或其他第三方依赖。

agent 先确认实际可用的 Python 3 解释器，例如运行 `python3 --version`、`python --version` 或 Windows 的 `py -3 --version`。在提供工作区依赖的 Codex 桌面环境中，也可调用 `load_workspace_dependencies` 获取随应用提供的 Python 绝对路径，再执行它。不能仅凭命令存在就认定可用；Windows 商店占位命令可能无法运行。使用已确认解释器，勿把某台机器的运行时路径写死到流程中。

```sh
python3 /absolute/path/to/live2d-layering/tools/options.py set --work-root /absolute/work/root simplify true
python3 /absolute/path/to/live2d-layering/tools/options.py get --work-root /absolute/work/root simplify
```

```powershell
& 'C:\path\to\python.exe' 'D:\project\.agents\skills\live2d-layering\tools\options.py' set --work-root 'D:\work\case' simplify true
& 'C:\path\to\python.exe' 'D:\project\.agents\skills\live2d-layering\tools\options.py' get --work-root 'D:\work\case' simplify
```

`set` 在工作目录或选项文件不存在时创建它们，更新单个选项时保留其他值。`set` 和 `get` 均输出仅含所选字段的 JSON 对象，例如 `{"simplify": true}`；缺失选项或参数错误时返回非零退出码。写入使用锁与临时文件替换，避免并发更新丢失其他选项；无效文件或写入失败不覆盖原文件。

## 文件格式与职责

`options.json` 为 UTF-8 平级 JSON 对象：

```json
{
  "simplify": true,
  "eyes_symmetric": false
}
```

- 名称区分大小写，使用英文字母、数字及下划线，不能以数字开头；同名选项不得重复。
- 当前选项为布尔值，`set` 默认按布尔类型处理，只接受 `true`/`false`。扩展时可传 `--type integer` 或 `--type string`；枚举按字符串保存，允许值由 agent 按流程声明核对。字符串不需要手工编码为 JSON，工具会处理引号、中文等内容。
- 文件只允许布尔值、整数和字符串，不支持嵌套对象、列表、浮点数或空值。`false` 保存为真正的布尔值，不是字符串。
- **负责判断的 agent** 读取根目录 `流程.yaml`，核对选项名、声明类型及枚举范围，再按对应类型调用工具。脚本校验名称格式、值类型和配置结构，不解析流程 YAML。**总控** 读取 JSON 值，并按根流程声明核对后用于条件判断。

眼部计划节点用同一工具设置 `eyes_symmetric true` 或 `eyes_symmetric false`，只更新本字段。它表示是否制作主眼后镜像；详细逐眼队列与坐标保存在节点的 `plan.json`，无需给平级选项工具增加嵌套结构。计划目录的 `validate_plan.py` 只依赖 Python 标准库，校验队列、选项、部件及参考文件哈希是否一致。

旧运行仅有 `options.yaml` 时，agent 先按根流程声明核对已有值，再逐项用 `set` 写入 `options.json`；已有 `options.json` 时以它为准。旧文件保留作历史记录。

写入锁为工作根目录的 `.options.json.lock`。正常结束或失败会释放锁；若进程被强制终止而留下锁，确认没有写入任务后再删除该锁文件。


## 共用取色工具

`extract_palette.py` 只提供通用采样与色盘排版，依赖 Pillow，不认识具体部位，也不规定颜色数量或角色分类。嘴部、头发、身体、下半身、手臂与手部，以及physics_details、special_parts、generic各自的 `提取色盘.py` 保存本部位的默认标题、分类显示名称和说明，再调用公共方法；这些只是可覆盖的展示建议，不是 role 白名单。

```sh
python3 extract_palette.py reference.png samples.json palette.png
python3 /path/to/hair/3.头发色盘/提取色盘.py reference.png samples.json palette.png
python3 /path/to/body/2.身体色盘/提取色盘.py reference.png samples.json palette.png
python3 /path/to/lower_body/1.下半身色盘/提取色盘.py reference.png samples.json palette.png
python3 /path/to/arms/1.手臂与手部色盘/提取色盘.py reference.png samples.json palette.png
```

模型根据图片选择位置、范围、数量、分组和方法，工具负责计算已指定的采样并快速生成 PNG/JSON；自定义 role 会自动显示，part_id、region、usage、basis 等附加字段保留。公共层不要求具体部件归属，实际节点按自己的制作要求填写 part_id。

兼容原来的色样数组，也可用对象覆盖本次展示与默认方法，例如：

```json
{
  "title": "本轮局部色盘",
  "groups": {"edge": "细线", "soft": "柔和色区", "selected": "自行选定的色彩"},
  "samples": [
    {"name": "边缘落点", "role": "edge", "method": "point", "x": 10, "y": 20},
    {"name": "局部平均色", "role": "soft", "method": "mean", "box": [30, 40, 5, 3]},
    {"name": "外部计算结果", "role": "selected", "method": "provided", "hex": "#B8C9DD", "basis": "由调用者选定或用其它方法计算"}
  ]
}
```

| 便捷方法 | 行为 |
| --- | --- |
| `point` | 精确读取 x/y 指定的原图像素 |
| `nearest` | 在指定区域中找 RGB 最接近逐通道中位数的真实像素；并列时优先区域中心附近 |
| `mean` / `median` | 指定区域的逐通道算术平均/中位数；结果是统计色，可能并非某个真实像素 |
| `provided` | 接受 rgb=[R,G,B] 或 hex="#RRGGBB"，直接排版；来源、选择或自定义算法由 basis 说明 |

区域可以用 x/y/radius 或 box=[X,Y,W,H] 指定；min_alpha 由调用者决定包含哪些透明度的像素，默认1，设255只取不透明像素。坐标按EXIF校正后的原图；point忽略radius并读取单点。可用命令的 `--method` 或对象的 method 指定默认，各色样仍可覆盖；省略方法时，提供了rgb/hex便直接排版，旧坐标输入沿用nearest以兼容既有命令。

这些方法不是对模型方法的限制：需要沿曲线多点取色、聚类、外部取色或其它计算时，可提交任意数量的provided色样，或直接在Python中调用 `extract_samples` 与 `render_palette`；不需要把专属策略加到公共工具里。title、region、footer、groups也可在输入对象中覆盖，未列入groups的实际role仍然显示。

输出 palette.png 和 palette.json，后者逐项保存 method、color_origin、rgb/hex 与来源信息；只有point/nearest记录actual_pixel，统计色和提供色的actual_pixel为null，不伪称直接测得某个像素。字体自动尝试系统中文字体，必要时用 `--font` 指定；不生成额外报告。

## SVG预览与对照

统一入口为 `svg_preview.py`（文件名使用下划线），复用同目录 `render_svg.cjs`，依赖 Python 3.8+、Pillow 9.1+、Node.js 和 sharp；优先使用已有环境，Node 不在 PATH 时设置 `REVIEW_NODE`，sharp 不在默认位置时设置 `REVIEW_SHARP`。
一次调用只生成一张 PNG，多格对照共用一个 Node 进程，重复渲染内容复用；临时 SVG 自动清理，输入文件不变，原有命令继续可用。

### 按当前需要选一种调用

以下命令在工具目录执行；其他工作目录使用 `svg_preview.py` 的绝对路径，部件名替换成源 SVG 中的真实 id，X/Y/W/H 替换成整数。

```sh
# 默认完整预览，保留透明背景
python3 svg_preview.py character.svg preview.png

# 原图、当前稿、混合：共同裁切与放大
python3 svg_preview.py character.svg comparison.png --reference reference.png --crop X Y W H --scale 4

# 旧稿、当前稿、混合；可与 --reference 同时用在一张板内
python3 svg_preview.py character.svg revision.png --compare previous.svg --crop X Y W H --scale 4

# 当前稿与分别关闭一个效果/配饰的视图，用于观察遮挡或投影归属
python3 svg_preview.py character.svg toggles.png --toggle hair_shadow --toggle headdress_center --crop X Y W H --scale 2

# 一张组合独显：前后发同时可见，网格帮助看清浅色边缘
python3 svg_preview.py character.svg hair.png --only hair_front_left --only hair_back_left --background checker

# 临时隐藏指定部件，直接输出一张预览
python3 svg_preview.py character.svg uncovered.png --hide hair_front_left --hide hair_front_right

# 结构对照：各部件单独占一格，沿用 mouth 现有调用方式
python3 svg_preview.py character.svg structure.png --reference reference.png --crop X Y W H --scale 4 --part mouth_upper --part mouth_lower --part mouth_inside --part mouth_teeth_upper --part mouth_teeth_lower --part mouth_tongue
```

### 参数与对齐规则

| 参数 | 用途 |
| --- | --- |
| `--reference PATH` / `--compare PATH` | 原图 / 修改前版本，支持 SVG 或 Pillow 可读的图片；同用时共享当前稿格子 |
| `--crop X Y W H` / `--scale 1..8` | 所有格子共用原 SVG 像素画布的裁切与放大，保留原 viewBox、留白及比例关系 |
| `--reference-crop X Y W H` | 参考图是另一尺寸或已有特写时，显式指定其对应区域，缩放到当前裁切范围；不得靠猜测或自动平移制造对齐 |
| `--blend 0..1` | 混合图中当前稿的权重，默认 0.5 |
| `--diff` | 按需追加与原图/旧稿的绝对 RGB 差分格；先铺相同背景，黑色表示显示颜色相同，不生成分数或审计报告 |
| `--only ID` | 可重复，这些部件一起组成当前候选视图 |
| `--hide ID` | 可重复，在当前候选及诊断格中临时隐藏这些部件，隐藏优先于独显 |
| `--part ID` | 可重复，每项从源 SVG 单独提取一格；保留祖先变换、裁切、遮罩和渐变，不受 `--only` 限制 |
| `--toggle ID` | 可重复，每项在当前候选基础上单独关掉该部件，生成一个对照格；多项不是累计关闭 |
| `--background checker` / `white` / `"#RRGGBB"` | 透明网格或指定不透明背景，默认单图保留透明、对照板铺白 |
| `--columns 1..8` / `--font PATH` | 调整板列数或指定标签字体；自动尝试系统中文字体 |

原图与旧稿默认必须与 SVG 的像素画布同尺寸，并已处于同一坐标系；工具不自动识别或校正位置，旧稿须使用完整画布的 SVG/图片，不能传入带标题的对照板。
只有参考图允许通过 `--reference-crop` 显式提供另一坐标系中的对应区域；没有此参数时，尺寸不一致直接报错，避免静默拉伸。
显隐与独显只作用于当前 SVG 的临时渲染副本，原图/旧稿照原样显示；隐藏控制组可通过独显显出，原有 opacity、遮罩和裁切仍保留。
每份输入SVG在渲染前自动检查重复id、失效的本地引用和非法clipPath几何，报错列出文件、资源id与原因，不自动改图或把空白结果当成功；clipPath内的use只能直接引用path/text/基本形状，不能引用g、symbol或另一use，普通绘制与mask中的合法分组不受此限制。多片承影面逐片保留形状、变换与clip-rule，交集用效果外层嵌套裁切；修复旧稿后应保存正式SVG，旧的无效SVG如需对照可使用其已保存PNG。
`--toggle`复用本次已有渲染检查开关是否改变当前画面，无差异时输出提醒而不增加渲染；全遮挡、取景外或原本关闭的效果可能合法地无差异，不能自动判为绘制错误，也不能凭资源检查通过就认定投影还原正确。
差分受颜色、透明度和渲染边缘影响，不能把每处差异都判成绘制错误，也不用于证明 X/Y 形变的立体感。

各节点只生成本阶段需要的一张图，以上选项不是必须逐项执行的检查清单；mouth 仍是线稿阶段一张结构对照、成稿一张默认预览，有具体问题时才追加对应局部。

维护工具时的验证命令（依赖与运行工具相同）：

```sh
python3 -B -m unittest discover -s .agents/skills/live2d-layering/tools/tests -p test_svg_preview.py -v
```
