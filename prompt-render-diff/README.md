# 提示词渲染对比（PR：knowledge 目录与提示词流程整理）

目标：改动前后发给 agent 的提示词尽量逐字节一致；不可避免的变化须保证 agent 读完后对操作的理解几乎不变，且不丢信息。
本目录是审查证据，合入前可删除。

## 方法

- 基线：#196（`33337738`）；新版：本 PR 最终提交。
- 两版各跑一遍全部测试（`harness/capture.sh`），preload 截获每次 `agents.run` / `session.run` 收到的提示词、工具说明和 transport 原文。
- `harness/norm.py` 只统一 `提示词来源：` 和 `"path"` 的取值；`harness/cluster.py` 再把临时目录、任务目录和 skill 目录替换为 `<TMP>`、`<TASK>`、`<SKILL>`，按变化行归类。
- 结果：基线 701 条记录中 26 条在统一来源行后一致，665 条有变化（多数只因删除 `提示词来源：` 行和 runtime_context），10 条只在基线存在（对应改名或删除的测试，见下文）。全部 122 类变化见 `clusters.txt`，每类附一个示例记录名；下面是逐类审查的结论。

## 步骤提示词中的变量

步骤提示词只使用 `{group_id}`、`{group_dir}`、`{layer_depth}`、`{review_round}`、`{width}`、`{height}` 和 `{input}`：

- `{input}` 只指用户上传的原图；
- 其余图片都是框架写出的 `.png`，用固定的 `{uri:…png}`；其他路径也用相对任务根目录 `<name>` 的固定 `{uri:}`；
- `{reference:…}`（本 section 的 knowledge references）与 `{shared_reference:…}`（`knowledge/shared/references`）按约定替换为 knowledge 内文件的绝对路径，只给链接、不附图片。

不计入上述变量：图片被拦截时的 `image-blocked-*.md` 不属于流程，由程序直接引用。

恢复只有三种：`--continue` 接上原会话并发固定的继续提示；`--resume` 清除会话、保留产物，新会话用通用提示词自行读取已有产物；`--retry` 删除产物重跑。交接笔记机制（`--replace-thread`、`--handoff`、`raster-handoff.md`）已整体删除；`clusters.txt` 是删除前采集的，其中 recovery 测试的「换 thread」记录现改为 `--resume` 后的新 thread 返修（绘制提示词 + 固定恢复句 + 返修提示词），不再含交接段落。

框架复制的图片一律转为 PNG 并以 `.png` 命名（原图 `input/original.png`、复用参考、直接沿用的交付等），查找简化参考也只认 `simplified-subject.png`，保证 `{uri:…png}` 与实际文件一致。

## 变化清单

1. **图片不再作为附件发送，改为说明 + 路径。**
   - 每个 `======== image ========` 附件块改为原说明一行，加上 `参考图绝对路径：<路径>`，由 agent 自己查看。路径与基线附件的实际文件一致。
   - 准备步骤的工具范围由「本次复制或已配置生图」改为「查看本次参考图、本次复制或已配置生图」，因为 agent 现在须自己打开参考图。
   - 删除 references.json；手指补全与拆分的 additionalReferences 改为文字列表。
   - transport 测试不再传入图片，原「图 1：测试图片」等块随之消失；图片拦截测试改由工具返回触发。
2. **【本次输入】改为带标签的文字行**，JSON 不再内嵌。
   - 路径行如 `reference：…`、`groups：…`、`canvas：100×100`、`outputSvg：…`、`candidate：…`。
   - `group：groups 中 id 为 X 的节点；kind 省略时为 group`。group 的 note、kind 等由 agent 从 groups.json 读取；调度器在各组 agent 开始前已发布 groups.json。
   - `parentGroup：X 去掉最后一段 /<名称> 后的 ID；不含 / 时为 null`，代替原 JSON 中的 parentGroup 值。
   - `parentSvg：…/parts/<parentGroup>.svg；parentGroup 为 null 时没有父组 SVG`。
   - review 与返修用 `round：第 N 轮 review` 代替 `candidateHash`；候选由 `candidate：` 行指出。
   - `submit_review` 工具说明同步改为「本次输入的 round 行标识本轮，candidate 行指出当前候选。」（原为「运行输入中的 review.round 和 review.candidateHash 标识本轮与当前候选。」）；`clusters.txt` 采集于这次修改之前。
   - 测试 fixture 改用真实任务布局（如 `part-layering/references/base-subject.png`、`clothing-part-layering/references/clothing.png`），所以示例路径不同。
3. **删除运行时附加的 `runtime_context` 与 `prompt_source`。**
   - `提示词来源：…` 和 `固定约定提示词来源：…9-补全操作约定.md` 两行不再出现。
   - agent-turn 运行说明中任务根目录仍为绝对路径（`任务根目录：<TASK>`，第二条路径规则也保留「一律相对任务根目录 <TASK>」）。
   - 【运行目录】的工作区与正式输出目录由绝对路径改为相对描述：「当前工作区：当前目录（shell 的初始工作目录）」「本管线目录：任务根目录下本次 section 的一级目录。正式输出目录：当前工作区的上一级目录。」所指目录与原绝对路径相同。
4. **中断续跑只发固定提示。** thread 仍在时只发 interrupted-task；transport 中原「【本次中断调用的原始任务】」段落删除。
5. **轮廓返修把 review 作为文件给出。**
   - 返修是绘制 thread 的下一轮，只发「【独立 review 的返修意见】见 …/review.json 中 reviews 最后一条（第 N 轮 review）的 feedback。」和「【返修要求】」；feedback 原文不再内嵌，也不重复绘制正文和【本次输入】。
   - 原 thread 不可用时，代码拼接「绘制提示词 + `---` + 原绘制会话不可用…本次只继续下方返修任务，不从头重画。+ 返修提示词」。
   - raster 返修仍指向 review-NN.md；原 thread 不可用时的恢复句与基线逐字相同（「上方原绘制任务用于恢复背景；本次只接续下方修复任务，不重新提交首次绘制报告。」）。
6. **续跑草稿说明由运行时字段改为静态条件句。** 原 `resumedDraft` 字段改为固定的一句，例如「outputDraft 已含 sourceSvg 之外、上次中断前补上的形状时，先用 read_svg 读取…」；outline 与 completion 每次都出现这句。`update_group_note` 的说明句和工具说明位置随 agent.json 的拼接顺序调整。
7. **raster step01 交付改写暂存报告。** 测试用的 step01 定义原先没有 review，所以基线写 `report.md`；现在与真实 step01 一致，写 `report.md.tmp`，并附「报告先写暂存文件…」规则。真实运行中基线本来就是这样。衣服 raster 的「原穿衣角色辅助参考…」从参考图目录句尾移成独立一行，文字不变。
8. **去重：每层一个 agent。**
   - 层号行由 `0` 改为 `depth：01`，与目录 `depth01` 一致。
   - 组列表由 `list_reduction_groups`（无参数，按父组归类）获取，不再内嵌 groups JSON；只在同一父组的直属子组之间去重。
   - 删除 `reusedReduction`、`originalOutline`，增量续跑句简化为「不需要实际修改的部件保持 sourceSvg 原样」（用户确认先不做复用，每次重新判断）。
9. **遮挡规划直接读 groups.json。** parts/groups JSON 改为 groups.json 行；完整 SVG 和去重轮廓改为按完整 ID 和层号的路径模式，并增加 `candidate：` 行。
10. **阴影与组装参考图。** 简化参考由 `simplified-subject.webp`（测试 fixture）改为 `.png`。阴影的分组文件列表增加「未穿衣、没有衣服 part 时只有前两项」。
11. **手指补全先验（10 个）。** 「图片与 sourceSvg 均在…声明」改为「其 SVG 路径在…声明」，「直接附有…图例」改为「提供…图例，路径见 additionalReferences」，「实际掌片图片」改为「实际掌片 SVG」，并加入用户确认的「与 palm 相接处，按两边合起来组成一个圆来想…」。
12. **拆分步骤的 additionalReferences 句改为条件句**：「本次输入列出 additionalReferences 时，它们是…」，因为没有额外参考时不再出现该字段。

## 只在基线存在的记录

以下测试在本 PR 中改名或删除，其新版提示词已计入上面的变化：resumedDraft 续跑（outline、completion 各一）、「原生容量失败恢复…」、tool-config 的 transport 测试、头发拆分测试改名等。

## 测试改动

- fixture 先发布 groups.json，再运行各组 agent，与调度器顺序一致。
- part-image-roles、prompt-templates 等测试改用真实任务路径并传入 taskRoot；fake CLI 预览提示词里的固定路径，草稿若仍在旧位置会卡到超时。
