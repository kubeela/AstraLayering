# 提示词渲染对比（PR：knowledge 目录与提示词流程整理）

目标：改动前后发给 agent 的提示词尽量逐字节一致；不可避免的变化须保证 agent 读完后对操作的理解几乎不变。
本目录是审查证据，合入前可删除。

## 方法

- 基线：#196（`33337738`）；新版：本 PR 最终提交。
- 两版各跑一遍全部测试（`harness/capture.sh`），preload 截获每次 `agents.run` / `session.run` 收到的提示词、工具说明和 transport 原文，共 701 条记录。
- `harness/norm.py` 只统一 `提示词来源：` 和 `"path"` 的取值；`harness/cluster.py` 再把临时目录、任务目录和 skill 目录替换为 `<TMP>`、`<TASK>`、`<SKILL>`，按变化行归类。
- 结果：基线 701 条中 293 条逐字节一致，398 条有变化，10 条只在基线存在（对应已改名或删除的测试，见下文）；下表的变化数含这 10 条。全部 83 类变化见 `clusters.txt`，每类附一个示例记录名；下表是逐类审查的结论。

## 各步骤变化条数

| 步骤 | 记录 | 变化 | 原因（见下节编号） |
| --- | ---: | ---: | --- |
| part_simplify / pose_judgment / standardize / base_subject，clothing_preparation | 79 | 79 | 1 |
| part_initial_groups / clothing_initial_groups | 21 | 21 | 1、2 |
| part_outline / clothing_outline | 44 | 44 | 2、5 |
| part_outline_review / clothing_outline_review | 29 | 29 | 2 |
| part_outline_repair / clothing_outline_repair | 29 | 29 | 4 |
| part_reduce | 7 | 7 | 2、7 |
| part_completion / clothing_completion | 44 | 44 | 1、2、5、9 |
| part_children / clothing_children | 5 | 5 | 1、2、10 |
| part_occlusion | 3 | 3 | 8 |
| raster step01（含 repair）与 clothing step02 | 122 | 122 | 6 |
| 其余：raster review、step02/03、assembly、shadow 及独立 raster 入口 | 130 | 1 | 6 |
| transport / transport-cli | 188 | 24 | 1、3 |

## 变化清单

1. **图片不再作为附件发送，改为说明 + 路径。** 每个 `======== image ========` 附件块改为原说明一行，加上 `参考图绝对路径：<路径>`，由 agent 自己查看。
   - 原因：claude 与 imagegen 的准备步骤原先看不到输入路径。现在统一由 agent 按路径查看图片，`task.images`、image-description / image-reference 包装和 `{image:}` 占位符都已删除。
   - 准备步骤的工具范围由「本次复制或已配置生图」改为「查看本次参考图、本次复制或已配置生图」，因为 agent 现在须自己打开参考图。
   - 准备提示词改用 `{input}`、`{simplified_subject}`、`{original_image}` 等变量渲染路径，因为 simplified-subject 的扩展名不固定。
2. **【本次输入】中的路径字段改为带标签的文字行。** 例如 `reference：…`、`groups：…`、`canvas：100×100`、`outputSvg：…`、`candidate：…`，JSON 只保留 group、parentGroup、review 等数据。
   - `parentSvg` 改为模式行：`parentSvg：<TASK>/…/parts/<parentGroup>.svg；parentGroup 为 null 时没有父组 SVG`。
   - 原因：路径由 knowledge 中的 `{uri:}` 写出，代码不再拼路径。字段名与取值不变，含义不变。
   - 测试 fixture 随之改用真实任务布局（`part-layering/references/base-subject.png`、`clothing-part-layering/references/clothing.png` 等），所以示例路径不同。
3. **中断续跑只发固定的继续提示。** transport 中原先的「【本次中断调用的原始任务】」段落已删除：thread 仍在时只发 interrupted-task 提示，thread 丢失时重发完整初始提示加静态的「先读已有输出」。
4. **轮廓返修改为绘制 thread 的下一轮。** 返修只发送「【独立 review 的返修意见】」和「【返修要求】」，不再重复绘制正文和【本次输入】。recoveryPrompt 在原 thread 不可用时于新会话中补上原绘制任务，并说明「本次只继续下方返修任务，不从头重画」。
5. **续跑草稿说明由运行时字段改为静态条件句。** 原 `resumedDraft` 字段改为提示词中固定的一句，例如「outputSvg 已有上次中断前画到的草稿时，先用 read_svg 读取…」；补全步骤同理。意思与原字段相同，只是写成条件句、每次都出现。`update_group_note` 的说明句和工具说明位置随 agent.json 的拼接顺序调整。
6. **raster 固定规则单独成段。** 「报告先写暂存文件…」和「原穿衣角色辅助参考…」两句从交付清单句尾移成独立段落（硬编码固定规则），文字不变。
7. **去重：每层一个 agent，只在同一父组的直属子组之间去重，每次重新判断。**
   - 组列表由 `list_reduction_groups`（无参数，按父组归类返回）获取，不再内嵌 groups JSON。
   - 删除 `reusedReduction` 和 `originalOutline`，相关增量续跑句简化为「不需要实际修改的部件保持 sourceSvg 原样」。
   - 原因：用户确认先不做复用，每次从轮廓重新判断；未提交的组复制其轮廓。
8. **遮挡规划直接读 groups.json。** parts/groups JSON 改为 `groups：…/groups.json；完整部件树与节点说明…`；完整 SVG 和 outline-reduce 轮廓改为按完整 ID 和层号补两位的路径模式，并增加 `candidate：` 行。不新增工具。
9. **手指补全先验（10 个）。**
   - 「图片与 sourceSvg 均在…声明」改为「其 SVG 路径在…声明」，「直接附有…图例」改为「提供…图例，路径见 additionalReferences」，「实际掌片图片」改为「实际掌片 SVG」。
   - additionalReferences 改为文字列表：palm.svg 用 `{uri:}`，complete-fingers.png 用 `{reference:}`。
   - 删除 references.json，也去掉对同侧掌片重跑的依赖。
   - 加入用户确认的连接规则：「与 palm 相接处，按两边合起来组成一个圆来想…」。
10. **拆分步骤的 additionalReferences 句改为条件句**：「本次输入列出 additionalReferences 时，它们是…」，因为没有额外参考时该字段不再出现。头发分组先验的 references.json 改为文字路径。

## 只在基线存在的记录

以下测试在本 PR 中改名或删除，其新版提示词已计入上面的变化：

- resumedDraft 续跑：outline 与 completion 各一个测试，见第 5 项；
- 「原生容量失败恢复…」见第 3 项；
- tool-config 的 transport 测试；
- 头发拆分测试改名，见第 10 项。

## 测试改动

part-image-roles 与 prompt-templates 两个测试改用真实任务路径并传入 taskRoot。这两个测试的 fake CLI 预览的是提示词里的固定路径，若测试仍把草稿放在旧位置，会一直卡到超时。
