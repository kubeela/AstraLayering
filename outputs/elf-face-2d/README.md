本轮使用仓库基线 `238c85a` 和用户提供的特殊面部结构图，按 `workflow-next/live2d-layering/SKILL.md` 及节点 YAML 执行。产物均保存在 `outputs/elf-face-2d`。

已完成主流程 1–3；随后对 9 个 group 执行 generic 父级轮廓补全、直属结构拆分和直属轮廓色块，得到 31 个 part，全部叶子为 part。结构测试的独立调度状态只表示 generic 1、2.1、2.2 完成，不表示完整 generic 路由完成。

按直属 part 数量选择最多的 `head`，对其 7 个直属 part（面底、双眉、鼻、口、双颊红晕）执行 geometry 3.1–3.5。最终含 34 条可见压力笔触，保留 49 条隐藏源曲线及说明。眼、耳等嵌套子组没有进入这次 geometry；最终 geometry 预览因此只显示选定范围的笔触。全部 rendering stack 未执行。

- [完整递归结构 SVG](block-layers/groups.svg) · [结构白底预览](block-layers/preview.png)
- [所选 7 个 part 的 geometry SVG](refinement/character.svg) · [geometry 白底预览](refinement/preview.png)
- [结构树](structure/groups.json) · [选择依据](structure/geometry-selection.json) · [文件与绑定检查](structure/final-check.json)
- [主步骤 3 审查报告](reviews/group_layers/审查.md) · [逐节点运行记录](运行记录.md)
- `history/after-step3/` 保存主步骤 3 的验收稿，`history/after-recursive-structure/` 保存递归拆分完成稿，`history/after-head-geometry/` 保存本次 geometry 成稿。
- `refinement/groups/` 保留各组的补全说明、直属拆分清单、轮廓检查及 geometry 自检报告。实际模型、worker ID 与步骤耗时见运行记录。完整任务消息和事件保留在本地 `.runtime/orchestrator/`，临时自检材料保留在本地 `tmp/`；这两个目录不纳入提交，报告中指向它们的路径仅供本地追溯。
- 提交整理只将报告及元数据中的本机绝对路径转换为工作根目录相对路径；技能资源以 `../../workflow-next/` 引用。原始报告留存于本地 `.runtime/publish/original-reports/`，报告结论、SVG 与图片内容保持不变。

参考判断及结构拆分按模型标记使用 Sol xhigh，绘制、主步骤 3 独立审查及 geometry 使用 Astra xhigh；全图线稿参考通过 imagegen 的 `gpt-image-2.5-sunburst` 生成。原图作为主轮廓依据保留。generic 节点执行其原有制作自检，未额外增加独立 reviewer。

本轮原图 `simplify=false`、`wear_cloth=false`，未进行风格转换或连体服替换。主步骤 3 首轮审查指出右眼外侧短睫毛漏描及相邻外扩，原制作 worker 返修后原 reviewer 对可见轮廓复验通过。原图没有完整头顶、侧额和下颌外轮廓，缺失外缘仍不可核验，不能据此声称完整头形通过。

文件检查确认：原始输入和 66 个技能文件哈希未变；9 个结构子路由完成；树中 31 个 part 与结构 SVG 绑定一致；geometry SVG 只绑定所选 7 个 part；SVG ID 唯一，画布一致；全部最终预览可读。视觉结论来自对应 worker/reviewer 报告，总控只做调度与文件、绑定检查。

Geometry 节点实际调用耗时（包含该调用中的自动重连）：

| 节点 | 耗时 | 状态 |
| --- | --- | --- |
| 3.1 外轮廓与接界 | 11 分 13.0 秒 | 完成，制作自检通过 |
| 3.2 内部结构线 | 5 分 11.2 秒 | 完成，制作自检通过 |
| 3.3 明暗范围线 | 7 分 35.4 秒 | 完成，制作自检通过 |
| 3.4 细节与纹理线 | 10 分 3.6 秒 | 完成，制作自检通过 |
| 3.5 画笔重绘 | 8 分 7.3 秒 | 完成，制作自检通过 |
