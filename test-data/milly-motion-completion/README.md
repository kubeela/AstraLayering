# Milly：运动露出补齐测试资料

用于单独试跑新流程的 `generic/2.3.运动露出补齐`。输入已整理为 `groups.json`、纯路径的 `groups.svg` 和同坐标 PNG 参考，线上读取本仓库即可使用。

## 现成案例

| 目录 | `group_path` | 用途 |
| --- | --- | --- |
| `cases/skirt-missing-back` | `skirt` | 主测试：已有裙前片和腿，裙后片缺失，观察是否新增适量的独立后片。裙摆未出现在 2.3 的 Milly 示例图中。 |
| `cases/skirt-existing-back` | `skirt` | 对照：原裙后片已存在，观察是否沿用、避免重复新增。 |
| `cases/forearm-complete` | `forearm` | 对照：小臂完整，动作限定为保持当前可见面的整体小幅转动、弯曲，观察是否保持已有结构与范围。 |

每个案例包含：

- `bindings.json`：目标 group、输入路径、局部画布大小和原 PSD 坐标偏移。
- `input/structure/groups.json`：测试起始树。
- `input/block-layers/groups.svg`：测试起始色块。
- `input/references/reference.png`：按原 PSD 图层组合的局部参考。
- `comparison/`：原画师的拆层对照和预期判断，测试结束后查看。

## 在线试跑

1. 选一个案例，将它的 `input/` 内容复制到本轮新的绝对 `working_dir`，保留内部路径。
2. 按 `bindings.json` 绑定 `group_path`、`reference`、`groups`、`guide_svg`。工具、Milly 示例图、模型及输出路径沿用 `workflow-next/live2d-layering/templates/部件专项/generic/2.直属拆分与色块/2.3.运动露出补齐/流程.yaml`。
3. 使用 2.3 的原提示词，只执行这个节点。制作 worker 接收 `input/` 中的素材；`source/`、`comparison/` 留作事后对照。
4. 有新增 `children` 时，总控按现有 `expand` 写入树；空清单沿用原树。此测试在 2.3 交付后结束。

树写入沿用现有 dispatch 状态：先初始化并选中目标，再应用非空清单。现成案例的目标都是顶层第一个 group。单步测试尚未完成整个 generic 路由，完成标记留到完整路由结束。

当前稿位于工作目录的 `block-layers/groups.svg`、`block-layers/preview.png`；清单和范围检查位于 `refinement/groups/{group_path}/2.直属拆分与色块/2.3.运动露出补齐/`。

## 怎样对照

先检查原有可见外缘与连接是否保持准确，再检查新增 part 的归属、覆盖及余量。原画师的隐藏形状是一种合理解法，像素一致性不作为补齐要求。

裙摆案例另提供：

- `comparison/artist-back.png`：原裙后层，已放回测试画布坐标。
- `comparison/artist-guides.svg`、`artist-structure.json`：原画师各层轮廓的对照树和色块。
- `comparison/artist-local-order.svg`：仅后片、腿、前片的局部组合，采用后片 → 腿 → 前片的顺序。
- `comparison/reveal-board.png`：有后片与缺后片，在原姿态、前片左移、右移、上移时的区别。
- `comparison/reveal-poses.json`、`exposed-*.png`：相同预演的位移和原后片露出区域，可用于覆盖对照。

局部预演时，隐藏父 group 底稿，只组合对应的 part。用本轮补片替换原后片，按相同位移看连接处是否漏空、边缘是否突兀、补片是否过大。这些位移是覆盖预检，真实变形在后续动作中验证。

## 原始拆层资料

`source/layers/` 保存 20 个原 PSD 图层的 RGBA PNG，覆盖衣领、裙摆、腕带、袖口、鞋口及对应身体层。`source/layers.json` 记录原始图层路径、边界、顺序、画布大小和文件哈希，并列出各局部从后到前的组合顺序。`source/boards/` 是独显与组合图，`source/Milly原画.png` 保留整体参考。

这些 PNG 按原图层边界裁切。放回原 PSD 时，左上角使用 `bbox_xyxy` 的前两项；`assemblies_back_to_front` 给出局部叠放顺序。案例使用局部坐标，原 PSD 偏移见各自的 `bindings.json`，同一案例内 PNG、SVG 完全对齐。

SVG 是从原图层 Alpha 提取的固定测试色块，包含可编辑路径和 group/part 绑定。父级范围合并对应原图层轮廓，并增加 2 像素的转换余量，避免轮廓转换误差触发范围检查。它们作为测试输入，绘画质量由实际工作流试跑评估。

原素材来源是 Milly 配布中的 `Milly原画.psd`；源文件哈希见 `source/layers.json`。线上使用已导出的资料即可，运行依赖沿用技能的 `tools/requirements.txt`。
