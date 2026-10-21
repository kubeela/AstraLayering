# clothing-part-layering

启动条件见 [安装与前置](../references/setup.md)。新纯衣服参考生成前检查已有 FFmpeg；命令不可用时可追加 `--krita <可执行文件>` 复用该安装中的版本。总入口自动传入已记录的 Krita 路径，已有参考续跑不重新处理。

运行根目录默认是 `<仓库>/.run`，独立安装时为 `<skill上一级>/.run`；`--dir <绝对路径>` 可更换根目录，显式路径不再额外套 `.run`。下文 `<运行根目录>/<name>/` 为任务目录。后续管线和续跑使用同一 `--name` 与运行根目录；相对输入从该任务目录解析。模型表列出默认值，可在 skill 根目录的 `.env` 配置。

从**简化后的穿衣角色图**提取纯衣服，再生成可独立控制的衣服 part 色块及深度表，交给 [clothing-raster-layering](../clothing-raster-layering/README.md) 绘制分层 KRA。输入暂时固定为穿衣角色图，以保留衣服与角色身形、姿态和坐标的对应关系。

调度、Codex SDK / App Server 适配及文件恢复使用 `../shared/` 的公共实现。本目录保留衣服 preparation、提示词和专项配置，不加载人物先验。所有文字 agent 使用 `gpt-6.1-sol / xhigh`。

## 启动

需要 Node 24.12+、pnpm，以及外部已配置好的 Codex。以下命令从安装后的 skill 根目录执行：

```bash
cd /安装位置/live2d-maker
pnpm install --frozen-lockfile
pnpm clothing-part-layering --name jianma

# 首次及续跑都通过任务名定位上游
pnpm clothing-part-layering --name jianma
```

preparation 只使用 Codex 内置 `image_generation`。订阅、API、模型服务、鉴权以及该工具的实际可用性统一由外部 Codex 环境提供；工作流只启用和调用工具，不管理 provider、不直连生图 API、不注册替代生图工具。内置工具不可用或生成结果无效时明确失败，保留输入供重试，不以原图或脚本结果冒充生图。

`--jobs` / `-j` 设置所有步骤共用的 agent 并发上限，默认 3；`--agents` / `-a` 是同义参数。`--max-depth 1` 只完成第一层并登记下一层，省略时一直拆到终止 part。`--groups <JSON路径>` 选择本任务已有的组及其子组；不导入新树、不重新 preparation，须有已完成的参考图和相应前置产物。

## 参考与拆分

1. 按 `--name` 直接读取同名人物 part 的 `references/simplified-subject.*`，支持 PNG、JPEG、WebP，不再保存输入副本。缺少时明确提示上游命令与手动放置的路径。使用 [preparation 提示词](prompts/preparation.md) 去除人物和衣服之外的饰品，生成同画布的透明 `references/clothing.png`。保留衣料、衣服自带附件、薄纱及正常开口，补全被移除对象遮住的衣料；不移动、居中或重新设计衣服。
2. 查看纯衣服图与原穿衣角色，按外到内检查结构、建立初始 group。纯衣服图是衣片轮廓与绘画标准，原角色用于判断穿插与随动关系。group 表示结构归属，包含关系和数组顺序不代表绘制深度。
3. 逐层执行轮廓绘制、review / 返修、同层去重、遮挡补全、自检及直属 group / part 分析。完成当前层后继续下一层，实际结构决定拆分深度。
4. 合成 `preview.svg`，为所有终止 part 规划并逐件、逐区域检查深度，保存 `occlusion.json`。

绘制者在首次绘制或返修中发现当前组 `note` 的职责或层序说明有误时，可用 `update_group_note` 精确替换唯一匹配的原句。工具只修改本组说明，通过调度器共用的写入队列保存；下一次 review 和后续拆分读取更新后的说明。仅有说明问题时保持正确 SVG，不修改父组或分组树。

此流程的 SVG 是纯色轮廓控制图，review 检查形状、开口、覆盖和归属；配色、纹样、明暗、笔触和透明度表现由后续栅格流程绘制。若反馈混入成品绘画要求，返修者须逐项解释其不适用原因并保留正确色块，不把控制图改成绘画成品。

**独立运动、变形、显隐与控制是拆分的核心标准。** 还要判断一个实体是否需要分处其他部件的前后：若仍是同一运动整体，可保留一个逻辑 part，用多深度区域表达，由 raster step01 拆实际绘画层。开放袖口与衣领只是例子；依据当前衣服的真实结构判断，不机械地给每个开口分两半，不套固定衣服分类。相应职责从 group 的 `note` 传递到具体 part，不能只写在父组里而遗漏具体 part 的区域说明。

单深度 part 使用 level；同动整体跨深度时使用 levels 与文本区域说明，不退回上游拆组，不要求像素分界线。实际绘画分片由 raster step01 实现，不用蒙版伪装。这里输出衣服，不制作身体装配或单独的身体插层文档。

## 输出与恢复

运行目录固定为共享任务下的本管线目录，与启动时的工作目录无关：

```text
<运行根目录>/jianma/clothing-part-layering/
  references/
    clothing.png
    preparation-prompt.md
    preparation.json           # 来源、生成图和提示词指纹；不保存鉴权
  groups.json                  # 归属树、part 职责及分析依据
  parts/                       # 完整的分件 SVG，主要交接产物
  stages/                      # 轮廓、检查及中间成果
  observations/
  agents/                      # 请求、结果和恢复日志
  preview.svg
  occlusion.json               # 全部终止衣片从后到前的深度表
```

同名续跑复用输入与正式文件，不依赖最初的外部图片路径。preparation 校验上游简化角色与衣服图指纹，检测到被改写时拒绝静默沿用；生成图也须为原画布尺寸且含实际透明区域的 PNG。尺寸与文件检查不代替模型的视觉判断。

在停止当前进程后，删除 `references/clothing.png` 可重新生成衣服参考；下次启动会先清除依赖旧参考的分组、parts、阶段记录、观察图、预览和深度表。重新制作全部衣服时也可使用新的 `--name`。不要用同一个名字并发启动。

分件恢复使用共享的文件事实机制：有效正式 SVG、报告及输入指纹决定哪些工作可复用；删除或修改上游轮廓会使其下游失效，只删除某件补全则只重新制作该件及实际引用它的依赖。深度表失效只重做最终深度规划。这里不使用栅格流程的 `step01/.completed` 标记。

## 验证与代码入口

```bash
pnpm check
node --test clothing-part-layering/tests/*.test.ts
```

[run.ts](../shared/part/run.ts) 串联 [preparation.ts](preparation.ts) 与共享 [layering.ts](../shared/part/layering.ts)；[agents.ts](../shared/codex/agents.ts) 和 [tool-agent.ts](../shared/codex/tool-agent.ts) 使用同版本 Codex SDK / App Server。首次分组和递归拆分分别在 [initial-groups.ts](../shared/part/initial-groups.ts)、[children-agent.ts](../shared/part/children-agent.ts)。所有衣服提示词都在本目录 [prompts](prompts/)。

自动测试覆盖 preparation 的内置工具请求、缓存及失败恢复、穿插衣片的独立产物、分组调度与依赖失效。模型响应使用测试替身，不构成实际生图或视觉质量验收。

现已完成 [2026-10-18—19 真实实跑](https://github.com/wu-tian807/AstraLayering/blob/main/demos/jianma/clothing-raster-layering/README.md)：原生 ImageGen 提取衣服，5 层、93 节点、68 个终止 part，最终交给栅格流程生成 KRA。最终深度检查曾两次由外部局部重开跨深度悬绳，再通过原流程制作；这不代表当前代码已具备自动回拆。案例仅保留关键 KRA、过程图片与简要说明，LLM 中间记录保留本地；该历史案例推动的多深度与 step01 拆层协议现已接入，说明见 [共享流程](../references/workflow-details.md#多深度与上游修正)。

共享安装、路径规则、工具配置和临时错误恢复见 [live2d-maker 使用说明](../SKILL.md)。所有相对输入路径从 `<运行根目录>/<name>/` 解析；本管线只管理自身目录。
