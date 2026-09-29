# Workflow 文档 DSL

本规范由总控读取执行。编号目录决定步骤顺序，节点 `流程.yaml` 决定数据与调度，提示词决定制作内容，`.model` 决定语言任务的模型和推理强度。每次调度前读取当前节点 YAML；实际路径与输入绑定以该文件为准。

## 资源与状态

每个 `SKILL.md` 所在目录是技能根。`run`、`asset`、`prompt` 为技能根相对路径，只能指向本技能内部。普通输出路径相对本轮绝对工作根目录；输入素材和技能资源只读，产物与临时文件写入工作根目录。全局工具位于技能根 `tools/`，步骤工具位于对应步骤 `tools/`。

根 `流程.yaml` 的 `inputs` 声明外部必要素材，绝对工作根目录单独绑定。`options` 只声明字段和类型；本轮选项值放在工作根的 `options.json`，由声明了 `writes_options` 的任务更新。用户本轮明确选择优先。

`inputs.<名称>` 引用已绑定的输入，`nodes.<id>.<名称>` 引用已成功交付的节点输出，`options.<名称>` 引用本轮选项，`self.<名称>` 引用当前任务输出。`asset` 从技能根解析。`required: false` 的缺项记为未提供；损坏文件和失败产物仍需处理。

## 编号与任务入口

编号目录使用 `<编号>.<名称>`，按数字逐段排序。相同编号的兄弟目录全部带 `.parallel.` 时是并行批次，完成并汇合后进入下一编号。容器展开子节点；每个有制作任务的叶节点显式声明 `run`。

`run` 指向任务资料目录。语言任务从目录读取提示词与 `.model`；生图任务读取 `imagegen.prompt` 与 `imagegen.inputs`，由总控直接调用。条件节点使用 `if / then / else`，只进入选中的分支；该分支可以声明 `run`，也可以通过 `outputs` 直接发布已有输入。`review.run` 指向独立审查目录，审查通过后才发布任务输出。

节点的 `id` 标识产物；`worker` 标识可续做的会话。派发语言任务前，按选中分支 `worker` → 节点 `worker` → 节点 `id` 取得身份，查本轮记录的 worker_id：可续做则继续，新身份则创建并记录。独立 review 使用 `review.worker`，否则使用 `<节点 id>:review`。并行分支共用已有 worker 时，从共同前序完成点各自 fork；汇合后把分支产物交回原会话。返修回到原制作会话，再由原 reviewer 复验。

## `dispatch`：动态树调度

`dispatch` 是纯调度节点。它声明 `document`、`state`、`tool`、`tree`、`routes`、`fallback`、`lifecycle` 和 `carry`；自身不执行制作任务。状态文件与树文件同目录，结构数据与完成标记分别保存。

`tree.root_key` 指向 JSON 顶层节点数组。`tree.child_edges` 是子数组字段到节点类型的有序映射；一个节点可在多个字段下生长任意数量的子节点。`tree.terminal_types` 指定不可继续生长的类型，`tree.dispatch_types` 指定需要派发和标记完成的类型。其他类型仍参与结构读取，但没有独立的调度状态。相同父节点下各子数组的名称共同保持唯一。调度器依照配置读取树，不预设业务字段名。

`routes` 以待派发节点的类型和名称匹配专用模板；其余待派发节点进入 `fallback`，无论是否已有子节点。外层按树深度广度遍历：所有较外层的待办 group 先于内层 group。`priority_keywords` 只在同一深度内对节点名称作软排序：完全同名优先，其次按列表顺序匹配名称中包含的关键词，未命中者按文档顺序；它不改变待办集合。每次只执行一个 group，完成后再选择下一项。模板可以用 `expand` 增长当前 group 的直属子节点；新增的待派发节点进入后续层级，终止类型节点由所在模板处理。

游标状态只为 `dispatch_types` 保存稳定 ID、完成状态、当前目标与步骤指针。当前目标的产物及声明的 review 通过后，`complete` 只完成该目标；子节点仍按自身状态派发。已完成 ID 不重复派发，已完成目标的直属结构不可再改；如需返修，先按运行记录显式重开受影响目标。`carry` 从上一个成功任务传递最新产物。结构路径消失、类型变化或状态不一致时停止核对。

路由目录的 `流程.yaml` 与普通容器节点一样按编号执行子步骤；其 `inputs` 可引用 `dispatch.target`、`dispatch.document`、`dispatch.tool`、`dispatch.inputs.*`、`dispatch.carry.*`。路由内的 `nodes.*` 限于当前目标，`{target.id}` 在资源路径和 worker 身份中替换为稳定目标 ID。路由声明的 review 通过后，总控才调用 `complete`。`if.direct_parts_of` 与 `in` 表示在指定树中检查目标的直属终止节点是否存在，以选择制作任务或透传分支。

`lifecycle` 声明各操作的推进顺序。总控调用 YAML 绑定的工具执行 `init`、`next`、`expand`、`checkpoint` 和 `complete`，并依据返回结果进入路由。已完成目标需要返修时，总控先用 `reopen` 显式撤销该目标的完成标记，再重新派发；子目标的标记独立保留。worker 只做当前制作任务；选下一个目标、完成标记均由总控管理。初始化工具时把 `tree.root_key`、每项 `tree.child_edges`、`tree.terminal_types`、`tree.dispatch_types`、`routes` 中的名称及 `priority_keywords` 按对应命令参数绑定；后续命令使用同一树和状态文件。

`final_review` 在调度器返回 `done` 后执行，通过后才发布 `dispatch` 的输出。返修时按审查指出的目标重开，重新派发并复验，直到最终审查通过。

## 完成与续跑

工作根目录的 `运行记录.md` 保存输入绑定、选项、分支、worker_id、当前步骤指针、产物、审查和调度状态。续跑核对实际文件与当前配置，使用最新成功产物继续。改变输入或选项后，重新确认受影响的下游结果。
