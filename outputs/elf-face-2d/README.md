# Elf Face：完整 Geometry 测试样例

现有 9 个 group、31 个 part 已按广度优先完成 Geometry，可作为后续 Rendering Stack 的输入。分组、色块和原始参考保持不变；本轮没有执行 Rendering Stack，也没有重跑拆分或运动露出补齐。

- [最终 Geometry SVG](refinement/character.svg) · [白底预览](refinement/preview.png)
- [分组树](structure/groups.json) · [结构色块](block-layers/groups.svg)
- [原图](references/original.jpg) · [已有线稿参考](references/line-reference.png)
- [Geometry 范围与状态](structure/geometry-scope.json) · [BFS 指针](structure/groups.geometry.dispatch.json)
- [最终文件与绑定检查](structure/geometry-bfs-check.json) · [逐节点运行记录](运行记录.md)

最终续跑基线为 `382e956cc054d9cf37d90d32cc870fd0b4618db1`。head 与双耳保留上一阶段的成功交付；随后按用户要求及新版 YAML，剩余六个 group 分别新建 `group:{group_path}` 会话，组内五个 Geometry 节点续用同一 worker，全部使用 `gpt-6-astra xhigh`。Geometry 绘制提示词未变。总控负责派发、保留每步交付和机械检查；视觉自检由制作 worker 按原提示词完成，没有增加独立 reviewer 或由总控指导绘制。

`head` 的 3.1、3.2 已核对提示词、输入与原成功交付哈希，因此复用历史 3.2 成稿。新版 3.3 增加了明暗来源、投影物与受影 part 的说明要求，head 从 3.3 续做；其余八个 group 各执行 3.1–3.5。合计复用 2 个节点、新执行 43 个节点。

左耳 3.4 的第一次调用曾因历史输入图像超过接口 50 张上限失败，正式 SVG 未改动。原始记录已备份；通过原生会话历史回退和压缩恢复同一 worker，随后在节点之间定期原生压缩。已交付节点未因这次恢复而重跑，流程提示词与模型没有改变。相关记录保存在本地 `.runtime/geometry-bfs/recovery/`。

旧共享会话在左眼 3.1 曾两次调用失败，期间出现图片处理拦截与网络断流，正式 SVG 和预览未改动。用户随后更新流程，指定每个 group 使用新 worker；此次从最后成功交付开始执行新版绑定。旧临时稿、状态和脚本保存在 `.runtime/geometry-bfs/recovery/per-group-20261002/`，原始错误保留在逐次调用记录中。按组独立的 worker ID 以及此次接口错误记录见 `structure/geometry-bfs-check.json`；完成这次样例不代表接口永不再发生拦截或网络问题。

收尾的工具兼容检查发现左眼白四条辅助 path 使用了保留给 g 容器的 part 绑定属性；已交回原左眼球 worker，只修正曲线归属元数据，保留所有路径几何、显示、说明和原有预览。修复前后 SVG 渲染一致，记录见最终检查报告。同一 part 内嵌套 g 的重复归属标记按仓库工具契约允许；最终检查按最外层部件容器计数，并校验全部绑定节点类型。

交付整理清理了 SVG 空白行的行尾空格，并将报告中剩余的本机绝对路径转换为相对路径；XML 内容、预览与报告结论保持不变。新增的 `预览命令.json` 路径以仓库根目录为基准，自检 JSON 中转换的成稿路径以本样例目录为基准。报告里的 `tmp/` 与 `.runtime/` 证据仅保留在本地，不随 PR 提交。

| 广度优先顺序 | 直属 part 数 | 本轮步骤 | 新调用耗时 |
| --- | --- | --- | --- |
| `head` | 7 | 复用 3.1、3.2；续做 3.3–3.5 | 25.2 分钟 |
| `head/left_ear` | 3 | 3.1–3.5 | 44.7 分钟 |
| `head/right_ear` | 3 | 3.1–3.5 | 33.6 分钟 |
| `head/left_eye` | 5 | 3.1–3.5 | 45.8 分钟 |
| `head/right_eye` | 5 | 3.1–3.5 | 39.8 分钟 |
| `head/left_eye/eyeball` | 1 | 3.1–3.5 | 24.9 分钟 |
| `head/right_eye/eyeball` | 1 | 3.1–3.5 | 22.8 分钟 |
| `head/left_eye/eyeball/iris` | 3 | 3.1–3.5 | 39.3 分钟 |
| `head/right_eye/eyeball/iris` | 3 | 3.1–3.5 | 34.5 分钟 |

每组完成后的累计 SVG 与预览保存在 `history/geometry-bfs/<group_path>/`。此前只有 head 直属 part 的 Geometry 成稿及报告保存在 `history/before-geometry-bfs/`；用于续跑的原 3.2 成稿保存在 `history/reused-head-geometry-3.2/`。旧的结构拆分指针与本次 Geometry 指针分开保存；两者均不表示完整 generic 路由或 Rendering Stack 已完成。

最终机械检查确认 31 个 part 与树逐一绑定、SVG ID 唯一、画布保持 1918 × 886、预览与最后一次交付哈希一致，全部参考、分组树和色块哈希未变，最新基线的技能资源未经本地修改。完整任务、事件、输入快照与逐步冻结交付保留在本地 `.runtime/geometry-bfs/`；临时制作证据留在本地 `tmp/`，执行环境和缓存不作为交付样例。

该样例仍使用用户提供的特殊面部结构图。原图未包含完整头顶、侧额及下颌外缘；这些隐藏/缺失范围沿用已有补全，没有把它们标记为已由原图核验。早期主步骤 1–3 与递归拆分记录仍保留在 `运行记录.md` 和对应历史目录。
