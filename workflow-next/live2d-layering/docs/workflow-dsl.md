# Workflow 文档 DSL

本规范由总控读取执行。编号目录决定步骤顺序，节点 `流程.yaml` 决定数据与调度，提示词决定制作内容，`.model` 决定语言任务的模型和推理强度。每次调度前读取当前节点 YAML；实际路径与输入绑定以该文件为准。

## 资源与状态

每个 `SKILL.md` 所在目录是技能根。`run`、`asset`、`prompt` 为技能根相对路径，只能指向本技能内部。全局工具位于技能根 `tools/`，步骤工具位于对应步骤 `tools/`。

需要执行和写入的节点用一行 `working_dir: "{working_dir}"` 声明工作目录。总控将本轮已确认的绝对工作目录代入，交接给 worker 的是实际 `working_dir` 和 `run` 对应的静态任务目录；命令在 `working_dir` 中执行。相对输入文件路径、输出及临时文件都按该目录解析，技能资源仍按技能根解析。输入素材和技能资源只读。

根 `流程.yaml` 的 `inputs` 声明外部必要素材，绝对工作目录单独绑定为 `working_dir`。`options` 只声明字段和类型；本轮选项值放在工作目录的 `options.json`，由声明了 `writes_options` 的任务更新。用户本轮明确选择优先。

节点的 `inputs` 块声明交给本任务的参数；引用表达式中的 `inputs.<名称>` 始终指根配置中用户提供的输入，在普通任务、分支、循环和 review 中含义相同。上游产物用 `nodes.*` 绑定，调度节点绑定的参数用 `dispatch.inputs.*` 绑定，最新成功产物用 `carry.*` 绑定。

`inputs.<名称>` 引用用户的根输入，`nodes.<id>.<名称>` 引用已成功交付的节点输出，`options.<名称>` 引用本轮选项，`self.<名称>` 仅在 review 中引用被审任务的输出。`asset` 从技能根解析。`required: false` 的缺项记为未提供；损坏文件和失败产物仍需处理。

`inputs` 也可传递标量，例如 `group_path` 是树中的节点路径字符串，按值传递。worker 身份和产物路径中的 `{输入名}` 用本任务已绑定的输入值替换；提示词中的 `<输入名>`、`<输出名>` 引用交接的值或文件路径。总控提供绑定后的实际值，静态提示词文件保持原样。

## 编号与任务入口

编号目录使用 `<编号>.<名称>`，按数字逐段排序。相同编号的兄弟目录全部带 `.parallel.` 时是并行批次，完成并汇合后进入下一编号。容器展开子节点；每个有制作任务的叶节点显式声明 `run`。

`run` 指向任务资料目录。语言任务从目录读取提示词与 `.model`；生图任务读取 `imagegen.prompt` 与 `imagegen.inputs`，由总控直接调用。条件节点使用 `if / then / else`，只进入选中的分支；该分支可以声明 `run`，也可以通过 `outputs` 直接发布已有输入。`review.run` 指向独立审查目录，审查通过后才发布任务输出。`status: draft` 表示建设中的声明，等待实现后执行；省略或设为 `ready` 时可执行。

节点的 `id` 标识产物；`worker` 标识可续做的会话。派发语言任务前，按选中分支 `worker` → 节点 `worker` → 节点 `id` 取得身份，查本轮记录的 worker_id：可续做则继续，新身份则创建并记录。独立 review 使用 `review.worker`，否则使用 `<节点 id>:review`。并行分支共用已有 worker 时，从共同前序完成点各自 fork；汇合后把分支产物交回原会话。返修回到原制作会话，再由原 reviewer 复验。

## `parallel`、`serial` 与 `aggregate`

两种循环都用 `for` 引用数组，用 `as` 绑定当前项，再声明 `run` 或嵌套循环。数组在循环开始时固定；`as` 只在本循环体内有效，嵌套循环可以读取外层变量，变量名在有效范围内唯一。

`parallel` 的各项可以同时执行，`serial` 按数组顺序逐项完成。它们是通用控制语法，可包住普通任务或动态路由。循环体继承外层的输入绑定和工作目录，任务仍按自己的 `inputs`、`outputs`、`worker` 交接。

并行项从同一个成功基稿开始，各自绑定独立的 `working_dir`；文件参数映射到该项的副本，资源与原始素材保持只读。相同的相对输出路径在各自目录内解析。并行项的 `nodes.*`、指针和产物隔离；同一项内部的串行步骤继续使用自己的最新产物。

`aggregate.tool.asset` 声明收集并行结果的工具。工具接收共同基稿、按原数组顺序排列的成功结果及外层交付路径；按基稿与各项结果的差异合并，保留未变内容与原有叠放次序。对同一内容的冲突修改报错，汇合结果与完成状态在聚合成功后发布。交付时记录实际制作节点与 worker；聚合拒绝返回具体修复对象，返修恢复该项输入并重跑依赖它的串行后项，其余并行结果保留。工具故障单独返回，由调度者停止并交回工具问题。

## `dispatch`：动态树调度

`dispatch` 选择本轮目标，再通过循环执行各自路由。`document` 绑定树文件，`state` 声明独立状态文件，`tool.asset` 声明选择与进度工具；这些工具由总控调用。

`tree.root_key` 指向顶层节点数组，`tree.child_edges` 是子数组字段到节点类型的有序映射。`terminal_types` 指定终止类型，`dispatch_types` 指定需要执行路由的类型。相同父节点下各子数组的名称共同唯一，树文件只维护结构。

`order: breadth_first` 选择最浅的未完成层。同层按文档中的父节点顺序、`child_edges` 字段顺序及子数组顺序排列。工具将本层目标组织成执行序列；具有关联的目标按关联记录的成员顺序放入同一序列，其他目标各为一个单项序列。一个目标本轮只出现一次。

`sequences: tool.next.sequences` 显式绑定 `next` 的结果。每个序列包含稳定 `id` 和有序 `items`；每个 item 包含稳定 `id`、类型 `kind`、`name`、完整 `path` 和 `parent_path`。返回 `action: run` 开始本轮，`active` 续跑当前计划，`done` 结束调度。续跑保留已选序列、成员顺序与成功项。

```yaml
dispatch:
  sequences: tool.next.sequences
  parallel:
    for: dispatch.sequences
    as: dispatch.sequence
    serial:
      for: dispatch.sequence.items
      as: dispatch.item
      run: dispatch.route
  aggregate:
    tool:
      asset: <聚合工具的技能内路径>
```

这段声明表示：序列之间并行，序列内的目标串行，所有序列交付后聚合。进入下一层之前先完成本层聚合；本轮长出的目标由下一轮重新选择。

`dispatch.sequences` 是本轮计划，`dispatch.sequence` 是当前并行序列，`dispatch.item` 是当前串行树节点。`dispatch.route` 按当前 item 的类型和名称，通过 `routes` 与 `fallback` 解析实际任务目录。`routes` 是类型 → 名称 → 模板目录的映射；空表表示全部进入 `fallback`，非空表按名称精确匹配，其余进入 `fallback`。

`dispatch.inputs` 始终是该调度节点在 YAML 中绑定的参数。模板按需要显式绑定，例如 `group_path: dispatch.item.path`；`inputs.*` 始终引用根输入。worker 身份和分项输出路径中的占位符来自当前任务的 `inputs`。

`carry` 声明产物名与初值，初值是 `dispatch.inputs.<名称>` 或 `null`。每个并行序列从同一基稿复制自己的 carry；路由任务及声明的 review 成功后，同名输出更新本序列 carry，其余值保留。当前 item 结束后，下一 item 接收本序列最新产物。所有序列聚合后，外层 carry 更新为汇合结果，供下一轮使用。`null` 表示尚未产生文件，聚合时使用实际产物；引用必需产物时它仍为空则停止核对。

固定 `outputs` 路径按当前任务的 `working_dir` 解析。绘制在临时稿中修改和自检后更新当前稿；`carry` 传递成功产物路径。辅助文件由 worker 在当前工作目录内组织。

路由目录按编号展开，由实际任务自己的 `流程.yaml` 声明输入输出；只有编号子步骤的容器省略根 `流程.yaml`。路由内的 `nodes.*` 限于当前 item。`if.direct_parts_of` 绑定节点路径，`in` 绑定树文件，用于选择有直属终止节点时的制作任务或透传分支。

总控依次初始化、选择、执行本轮循环、聚合，再重新选择。任务交付 `children` 时，由总控向本序列的树副本写入当前节点；空清单保留原结构。阶段完成保存当前 item 的指针；路由完成其直属终止节点、全部步骤及声明的 review 通过后，登记该 item 已交付。序列内下一项可继续使用该结果，主状态在聚合成功后才标记完成；完成单位始终是单个目标。

已完成目标的直属结构保持固定。返修先重开对应目标，再派发原 worker；子目标状态独立保留。worker 完成当前任务，选择与进度由总控负责。出现结构或产物冲突时停止核对。工具返回 `done` 后发布 `dispatch.outputs`；声明了 `final_review` 时，审查通过后发布。

## 完成与续跑

工作根目录的 `运行记录.md` 保存输入绑定、选项、分支、worker_id、当前步骤指针、产物、审查和调度状态。续跑核对实际文件与当前配置，使用最新成功产物继续。改变输入或选项后，重新确认受影响的下游结果。
