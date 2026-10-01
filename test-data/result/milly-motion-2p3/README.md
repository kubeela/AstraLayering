# Milly：2.3 运动露出补齐首轮测试

本目录归档自 `outputs/milly-motion-2p3`，包含五例首轮产物、对照图、报告和原始记录。本次整理没有重跑或修改 worker 产物；Python 执行环境与缓存未复制。

这轮显示，当前 worker 能识别独立后片，并能区分「新增 part」与「延伸原 part」。衣领、鞋口和完整小臂的结果较好；裙摆仍暴露出运动覆盖不稳定的问题。已有后片时，worker 没有重复新增，但仍扩展了隐藏范围，必要性尚未充分证实。这些结果不足以支持本节点自动验收。

基线为拉取后的 `300d162773b37fc7e74cd6163a26d0afa040574d`。只执行 `generic/2.3.运动露出补齐`，原 `流程.yaml`、`提示词.txt` 和模型标记均未修改。五例各有独立 working_dir 和新会话，实际模型全部为 **gpt-6-astra，xhigh**，worker 身份均为 `group_motion_completion`。总控只准备、调度、冻结交付和事后评估，没有在首轮中指出问题或要求返修。

| 案例 | 是否需要补齐的判断 | 延伸或新增 | 可见轮廓、连接与余量 | worker 耗时 |
| --- | --- | --- | --- | --- |
| case-01 完整小臂 | 正确：沿用 | 空清单，原 part 未改 | 与输入和 PSD 对照色块一致；是保持已有范围的有效对照 | 3 分 57 秒 |
| case-02 缺少裙后片 | 正确：需要独立后片 | 新增 `skirt_back`，顺序正确 | 前片和腿未改；仓库预设左右位移下，后片侧向覆盖明显小于 PSD，余量不能判定合格 | 5 分 40 秒 |
| case-03 已有裙后片 | 不重复新增正确；继续延伸的必要性未证实 | 延伸原 `skirt_back`，未新增 | 静态可见轮廓未改；原 PSD 露出均有覆盖，上抬时后摆显得更厚 | 7 分 18 秒 |
| case-04 仅有前领 | 正确：需要独立后领 | 新增 `collar_back` | 前领和身体未改；测试位移下连接、覆盖合理，后领有少量沿边外露差异 | 12 分 15 秒 |
| case-05 鞋前片与侧片 | 正确：需要鞋口后壁，并补同一表面的接缝余量 | 新增 `shoe_back`；同时延伸原 `shoe_side` | 原有静态可见轮廓未改；测试位移下覆盖合理，前侧接缝得到连续承接 | 6 分 44 秒 |
| face 完整脸部基体 | **未测：素材缺项** | — | 仓库未提供完整脸基体导出层，也没有 PSD/PSB 本体可重新导出 | — |

这不是五例的通用通过率：小臂输入自带「完整表面、保持当前可见面的小幅运动」说明；衣领与鞋口还看到了流程原本要求打开的同源 Milly 示例。缺项的脸部不能用小臂成绩代替。

**素材与测试条件**

权威依据是仓库 `test-data/milly-motion-completion/source/layers.json` 及对应的 20 个原 PSD 图层 PNG。20 个文件的哈希全部核验通过。清单记录的原 PSD SHA-256 为 `bb52e84765b55e9f3d992ccdcafca65e06755083cafefd3c313dc4f381698bd0`；本轮使用其导出资料，没有假称打开仓库中不存在的 PSD 本体。

case-01 至 case-03 直接复制仓库现成案例的 `input/`。case-04、case-05 按图层原始边界和从后到前顺序准备局部同坐标参考、树与 SVG；原后领、鞋后壁和完整对照留在 `evaluation-reserved/`，未绑定给制作 worker。已有 part 从原 Alpha 提取路径，以 Alpha ≥ 128 检查时，与原图层掩码的差异为 0。

| 案例 | PSD 中的局部原点 | 画布 | 输入目标 part |
| --- | --- | --- | --- |
| case-01 | (1060, 1810) | 300 × 500 | `forearm/forearm_surface` |
| case-02 | (1000, 1880) | 1200 × 1130 | `skirt/skirt_front` |
| case-03 | (1000, 1880) | 1200 × 1130 | `skirt/skirt_front`、`skirt/skirt_back` |
| case-04 | (1220, 900) | 760 × 650 | `collar/collar_front`，另含身体遮挡上下文 |
| case-05 | (1000, 3920) | 520 × 690 | `shoe/shoe_side`、`shoe/shoe_front`，另含小腿上下文 |

父 group 范围沿用仓库约定：对应原图层 Alpha 的并集，加 2 像素转换余量。因此 worker 已获得完成的父级形状范围；不能把结果解释成毫无轮廓信息时的自主推断。流程自带的两张 Milly 示例按 YAML 原样供给，衣领与鞋口属于同源示例辅助条件，裙摆没有出现在示例中。

**事后对照与结论依据**

所有对照均在该例首轮交付冻结后制作。评估隐藏父 group 底稿，按真实 part 顺序组合；PSD 对照与候选使用相同位移和坐标。橙色表示前层，青色表示后片，浅灰表示身体上下文。差异列的红色是原后片露出而候选未覆盖的采样点，绿色是候选额外露出的采样点；**颜色本身不等于错误判定**。

裙摆动作取自仓库已有 `comparison/reveal-poses.json`：前片左右各移 60 px、上移 60 px。衣领检查前领左右各移 20 px、脖子右移 12 px；鞋口检查小腿左右各移 12 px、前/侧片下移 16 px，以及前片左移 8 px。它们用于覆盖预检，不代替后续真实变形和动作验收。隐藏区域允许不同的合理画法，覆盖数字也不是画质百分比。

**case-01：完整小臂。** worker 保持已有 part，不新增也不扩大。原 part 的完整 Alpha、静态可见 Alpha，以及 PSD 对照色块与候选之间的差异均为 0。这证明在该受限动作条件下，它能够选择不补齐。[三方对照](evaluation/case-01/comparison.png) · [指标](evaluation/case-01/metrics.json)

**case-02：缺少裙后片。** worker 正确新增独立 `skirt_back`，并按「后片 → 双腿 → 前片」叠放。原前片和腿的几何、静态可见掩码均未变。但新增后片偏低、偏窄，形状接近扁圆带：左右移 60 px 时，原 PSD 后片应露出的 7,107 / 7,194 个采样点，仅分别覆盖 1,526 / 1,542 个（21.47% / 21.43%）。图上表现为侧边仅露出小圆舌，PSD 对照则保留更宽的侧向后摆。上移时覆盖为 70.13%，同时在其他位置增加了露出。静止姿态的 12 个差异点太小，不作为失败理由。

这里的主要问题是相对预设摆动的侧向承接不足，不能因为「新增了后片、范围检查通过」便判合格；也不能要求其所有隐藏像素复制 PSD。worker 自检选择的是前片纵向压缩约 40–46 px、双腿向外各移 12 px，未覆盖仓库的左右横移条件。这解释了为什么它能通过自己的动作预览，却未解决事后对照中的侧向覆盖。[运动对照](evaluation/case-02/motion-comparison.png) · [后片轮廓叠加](evaluation/case-02/rear-shapes.png) · [指标](evaluation/case-02/metrics.json)

**case-03：已有裙后片。** `children.json` 为空，没有重复创建后片；但原 `skirt_back` 向下增加 39,787 个 Alpha 采样点，约为原面积的 19.4%，没有删除原范围。它根据自行选择的前片上抬、双腿分开等动作，补了裙口中央及两侧的隐藏余量。

原有静态可见轮廓保持不变，四个仓库姿态中的原后片露出均被覆盖。上抬 60 px 时，额外露出 9,854 个采样点，后摆中央及两侧变厚。因此「沿用同一 part、避免重复」这项通过；「已有范围足够时保持」尚不能判定通过。额外余量可能是一种合理画法，本轮没有足够动作依据把它定性为错误，也没有依据认定它是必需的补齐。[运动对照](evaluation/case-03/motion-comparison.png) · [后片轮廓叠加](evaluation/case-03/rear-shapes.png) · [指标](evaluation/case-03/metrics.json)

**case-04：前领。** worker 正确新增独立 `collar_back`，置于肩膀、脖子、躯干和前领之后。原前领与身体均未改。四个测试姿态下，原 PSD 后领的露出区域均被覆盖，连接未见明显断开；差异集中为少量沿边外露，不能把「覆盖 100%」解释成轮廓完全一致。整体判断和叠放方式合理。这是有同源示例、完成父级范围条件下的正向结果。[运动对照](evaluation/case-04/motion-comparison.png) · [后片轮廓叠加](evaluation/case-04/rear-shapes.png) · [指标](evaluation/case-04/metrics.json)

**case-05：鞋口。** worker 正确新增独立 `shoe_back`，放在小腿和鞋前/侧片之后；同时把同一表面的隐藏延伸留在原 `shoe_side` 内，没有为接缝再造一个 part。侧片新增 2,259 个采样点，静止时均隐藏，原有可见轮廓无差异。

五个测试姿态下，原后壁的露出区域均被覆盖，额外露出仅沿边少量分布。前片左移 8 px 的局部对照中，原前侧连接有白缝，扩展侧片后连续承接；这为「延伸原 part」提供了具体依据。原前片和小腿未改。该例同时验证了新增独立后壁和延伸同一表面两种选择。[运动对照](evaluation/case-05/motion-comparison.png) · [前侧接缝放大](cases/case-05/refinement/groups/shoe/2.直属拆分与色块/2.3.运动露出补齐/.work/motion-front-seam.png) · [指标](evaluation/case-05/metrics.json)

**产物与原始记录**

| 案例 | 当前树与 SVG | 首轮冻结结果 | 完整任务与调用记录 |
| --- | --- | --- | --- |
| case-01 | [树](cases/case-01/structure/groups.json) · [SVG](cases/case-01/block-layers/groups.svg) | [归档](first-run/case-01/production.tar.gz) | [任务](first-run/case-01/case-01.prompt.txt) · [调用](audit/case-01-tool-audit.json) |
| case-02 | [树](cases/case-02/structure/groups.json) · [SVG](cases/case-02/block-layers/groups.svg) | [归档](first-run/case-02/production.tar.gz) | [任务](first-run/case-02/case-02.prompt.txt) · [调用](audit/case-02-tool-audit.json) |
| case-03 | [树](cases/case-03/structure/groups.json) · [SVG](cases/case-03/block-layers/groups.svg) | [归档](first-run/case-03/production.tar.gz) | [任务](first-run/case-03/case-03.prompt.txt) · [调用](audit/case-03-tool-audit.json) |
| case-04 | [树](cases/case-04/structure/groups.json) · [SVG](cases/case-04/block-layers/groups.svg) | [归档](first-run/case-04/production.tar.gz) | [任务](first-run/case-04/case-04.prompt.txt) · [调用](audit/case-04-tool-audit.json) |
| case-05 | [树](cases/case-05/structure/groups.json) · [SVG](cases/case-05/block-layers/groups.svg) | [归档](first-run/case-05/production.tar.gz) | [任务](first-run/case-05/case-05.prompt.txt) · [调用](audit/case-05-tool-audit.json) |

每例 `first-run/` 还保留原始 `worker-rollout.jsonl`、执行事件、绑定、退出状态和 `delivery-check.json`。归档包含 worker 首次交付时的输入、正式产物、自检和过程图，不包含 `.runtime` 执行环境缓存。SVG、预览、children 和范围检查均与冻结哈希一致。当前树仅在交付之后由总控用原 `group_cursor.py expand` 应用了非空新增清单；调度指针停在 `2.3_delivered_single_step_test_stop`，没有调用整个路由的 `complete`。

原始会话上下文确认五例均为 `gpt-6-astra xhigh`，各一轮任务。工具代码静态审计未发现读取被保留的 source/comparison 或其他案例的调用；这是日志审计，不是文件系统隔离或系统调用追踪。worker 的自检 `pass` 与总控的交付结构 `pass` 均不被当作视觉/动作正确性的证明。

[最终完整性记录](audit/final-integrity.json)核验了 71 个技能文件未变、20 个原 PSD 导出文件哈希、五例冻结产物、树与 SVG part 绑定、只执行 2.3 的指针，以及预览可读性。`workflow-next` 与 `test-data` 的 tracked diff 为空。辅助脚本保留在原 `outputs/milly-motion-2p3/.runtime/orchestrator/`，没有改通用工具或工作流。

本轮可确认的薄弱点是：自行挑选的动作预览容易遗漏另一个方向的露出；而「不重复新增」与「已有范围足够，不继续扩展」是两个不同判断。衣领和鞋口的成功不能消除裙摆覆盖与延伸必要性上的不确定性。
