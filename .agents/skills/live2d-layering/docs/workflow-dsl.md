# Workflow 文档 DSL

本规范供读取 Skill 的 orchestrator 使用：目录表达执行顺序与并行批次，节点内的 `流程.yaml` 表达输入来源、条件选择和输出，提示词描述具体任务。它是本项目的文档约定，由 agent 阅读执行。

新流程统一从 **1** 开始，角色参考准备也是普通步骤，使用同一套编号与交接规则。现行 skill 保持原有实现；本规范用于外层 `workflows` 的重构。

## 1. 目录编号：顺序、展开与并行

目录名使用 `<编号>.<名称>`，并行节点使用 `<编号>.parallel.<名称>`。编号由正整数组成，按数字逐段比较：`1.2` 在 `1.10` 之前。

`1.1`、`1.2`、`1.3.1`、`1.3.2` 表达逐层展开的步骤。一个步骤需要独立输入、提示词或执行会话时，就可以展开成子节点；任务内部的普通操作继续写在提示词中。

推荐按层级嵌套保存，以下名称仅用于演示结构：

```text
workflows/
├── 流程.yaml                         # 全流程外部输入与选项字段定义
├── tools/                            # 节点可直接使用的配置工具
├── docs/
├── 1.角色参考准备/
│   ├── 1.1.参考图判断/
│   ├── 1.2.角色参考选择/
│   ├── 1.3.连体服替换/
│   └── 1.4.辅助参考/
│       ├── 1.4.1.任务A/
│       ├── 1.4.2.parallel.线稿参考/
│       ├── 1.4.2.parallel.部件色块/
│       ├── 1.4.2.parallel.配色色盘/
│       └── 1.4.3.任务B/
└── 2.皮套结构识别/
```

其中 `1.4.1` 完成后，三个 `1.4.2.parallel.*` 可以并行；三个节点都完成后进入 `1.4.3`，整个 `1` 完成后进入 `2`。`1.4` 仅演示编号方式，当前尚未建立。节点配置了 review 时，完成包含当前候选通过该 review。

同一逻辑父级也可以平铺展示子步骤，例如把 `1.1.*`、`1.2.*`、`1.4.1.*`、`1.4.2.parallel.*` 直接放在 `workflows/` 下；编号前缀仍决定层级与执行顺序。嵌套与平铺是同一组逻辑节点的两种存放方式，一组节点只保存一份。平铺时未建立实体目录的父级作为分组理解。

约定如下：

- **不同编号顺序执行。** 同编号的兄弟节点全部标记 `parallel` 时，构成一个并行批次；同编号混用普通节点和并行节点，或重复普通编号，属于定义冲突。
- **编号表示位置，`id` 表示节点身份。** 并行节点分别具有全流程唯一的 `id`，后续按 `id` 引用结果。
- **`parallel` 作用于同编号的兄弟节点。** 每个并行分支内部仍按自己的子编号执行；分支可以继续展开。
- **容器组织子节点，叶节点执行任务。** 已展开的容器目录不再额外启动一次父任务。父任务需要保留的工作，应作为其中一个子节点。
- **并行成员使用已就绪的输入和各自输出。** 相互依赖的任务安排为先后编号；共同修改同一份 SVG 的工作安排为串行，或分别产出后增加明确的合并节点。
- **并行表示允许同时执行。** 总控按可用并发槽位分批启动；整个批次完成后才推进。某个成员失败时，其余已启动成员可以保留完成结果，该批次等待问题解决。

`docs`、`review`、工具和素材目录按用途读取；`templates` 仅在 run 引用时展开，均不作为主流程的编号节点。输入引用表达数据来源，目录编号表达执行顺序；两者矛盾时先解决定义冲突。

## 2. 文件各自负责什么

| 文件 | 内容与读取者 |
| --- | --- |
| `SKILL.md` | 总控的通用执行规则及本规范入口 |
| 根目录 `流程.yaml` | 外部输入与运行选项的字段定义；总控和负责判断的 agent 读取 |
| 本轮工作根目录 `options.json` | 本轮已确定的选项值，保存为平级 JSON 对象；负责判断的 agent 写入，总控核对声明类型并以 `options.<名称>` 读取 |
| `tools/options.py` | 创建及修改本轮选项文件；负责判断的 agent 使用已确认的 Python 3 解释器调用，仅依赖标准库 |
| 节点 `流程.yaml` | 节点 `id`、输入输出、条件、循环、模板路径和 review 入口；总控读取 |
| 节点提示词 | worker 的具体任务、操作与交付要求 |
| 节点 `*.model` | 语言 worker 的模型与推理强度；`imagegen.model` 标记总控使用 imagegen 工具 |
| 节点 `review/` | reviewer 的提示词、模型、输入输出说明和就近使用的工具 |

执行节点声明 `id`、`inputs`，用 `outputs` 声明后续可引用的结果，或用 `writes_options` 声明它要写入的配置字段。配置是本轮运行状态，不算节点产物。普通任务默认执行当前节点目录的提示词；`run` 可以指定另一资料目录，有编号子步骤时由总控继续展开。纯分组/循环容器不配置 worker 提示词；单任务也可以直接声明 foreach，逐项执行本目录任务，无需外包一层子目录。条件分支采用 `if / then / else`；仅将 `outputs.image` 绑定到 `inputs.original` 等已有文件的分支直接发布路径，声明 `imagegen` 的分支按其生图规则执行。

`id` 标识工作成果，`worker` 标识可延续的语言 worker 上下文。串行节点使用相同 `worker` 值时，继续原会话；并行分支共用已有 `worker` 时，从分支前的共同上下文分别 fork。不同值启动新的 worker；省略 `worker` 的普通任务以节点 `id` 区分。复用与 fork 要求语言模型与推理强度一致。只引用已有文件的分支不派发 worker；`imagegen` 由总控直接调用，也不派发语言 worker。

### 会话与 fork

| 情况 | 执行会话 |
| --- | --- |
| 串行节点沿用同一 `worker` | 继续原会话 |
| 并行分支沿用同一已有 `worker` | 从共同的分支前上下文分别 fork，各分支独立执行 |
| 并行分支使用不同 `worker`，或该名称尚无历史会话 | 各自新建会话 |
| 分支内续做或返修 | 继续该分支的实际 worker 会话 |
| 并行结束后沿用原 `worker` | 回到原会话，交接各分支产物 |

fork 在共同前序任务完成后发起，所有分支继承该完成点的上下文。总控在记录中区分 `worker + 分支 id`，保存各自的实际 agent ID；分支之间的消息历史彼此独立。fork 共享工作根目录，各分支使用自己的输出路径。

当前 `spawn_agent` 的 `fork_turns: "all"` 复制**调用者**上下文。因此由总控准备各分支的提示词路径、输入输出及任务要求，交原 worker 发起 fork 并返回子 agent ID；总控负责后续跟进与汇合。fork 沿用原 worker 的模型与推理强度，调用时省略模型覆盖。独立新会话才使用 `fork_turns: "none"` 并显式指定模型。

例如 A 完成后，B、C 两个 `parallel` 分支均声明 `worker: drawing`，则从 A 所在的 `drawing` 会话分别 fork 出 B、C。两者完成后，下一串行节点仍用 `worker: drawing` 时回到 A 的会话，并收到 B、C 的产物路径；分支历史通过产物交接，不自动合并进原上下文。

## 3. 外部输入与节点输入

根目录 `流程.yaml` 声明用户可以提供什么。下面是语法示例，选项默认值由具体流程决定：

```yaml
inputs:
  original:
    type: image
    required: true
  simplified:
    type: image
    required: false
options:
  simplify:
    type: boolean
    description: 是否需要画法适配或消除结构辨认障碍；结构清楚的插画优先直接使用
```

`type` 说明输入用途与形态；`required` 省略时为 `true`。根目录的 `options` 只声明选项，不保存本轮实际选择。可以按需要声明 `default`；需要结合输入图判断的选项可以不设默认值。

本轮实际值放在**工作根目录**的 `options.json`。负责判断的节点读取用户本轮要求及图片，核对根流程声明的选项名与类型，使用已确认的 Python 3 解释器调用 `tools/options.py` 写入选项；文件不存在时工具会创建。总控调度该节点，再读取 JSON 值并核对声明类型，用来选择下游分支。文件使用平级对象，例如：

```json
{
  "simplify": true
}
```

确定值时，用户本轮明确要求优先，其次是本轮已有的 `options.json` 值，再次是声明的默认值。需要结合图片判断的选项由相应判断节点处理；用户明确改变选择时，也交该节点写入新值。旧运行仅有 `options.yaml` 时，由该 agent 核对后逐项调用工具迁移，保留旧文件；已有 `options.json` 时以它为准。无可用判断依据时，该节点报告缺项，由总控询问用户。未用到的选项可以暂时不写入。

若节点声明 `writes_options: [simplify]`，表示该节点负责修改本轮 `options.json` 中的 `simplify` 字段。判断 agent 使用外层 [选项工具](../tools/readme.md) 写入，后续节点读取 `options.simplify`。工具默认接收布尔值 `true`/`false`，整数和字符串分别通过 `--type integer`、`--type string` 指定；枚举按字符串保存。agent 按根流程核对名称、声明类型和枚举范围，工具校验存储格式与值类型、保留其他值并保护并发写入。`writes_options` 不发布 `nodes.<id>` 产物，也不等同于 `outputs`。

节点输入的来源统一写法如下：

| 写法 | 含义 |
| --- | --- |
| `inputs.original` | 本轮外部输入 |
| `nodes.character_reference.image` | 本轮 `character_reference` 节点名为 `image` 的输出 |
| `options.simplify` | 本轮已确定的运行选项 |
| `refinement/groups/{group.id}/1.脸部色盘/palette.json` | 相对本轮工作根目录的文件路径；循环中替换当前分组值 |
| `{ asset: 参考图.jpg }` | 相对当前 `流程.yaml` 的包内素材，本节点明确选用它 |
| `{ from: inputs.simplified, required: false }` | 本节点接受该输入缺省 |

短写 `reference: nodes.character_reference.image` 等价于声明一个必需输入。可选输入为空时，总控明确记录“未提供”；按节点定义选择分支，或把这一事实交给允许缺省的 worker。文件不可读、上游失败和版本不匹配属于执行问题，与可选输入未提供分别处理。

逻辑引用解析为本轮记录中的实际路径。复用旧案例时，由用户指定或明确确认后绑定为本轮输入；包内示例素材也通过输入声明选用。

## 4. 条件分支与按需生成

先由 `1.1.参考图判断` 根据用户要求及图片写入 `options.simplify`；`1.2.角色参考选择` 再读取它。后者的配置是：

```yaml
id: character_reference
inputs:
  original: inputs.original
  simplified:
    from: inputs.simplified
    required: false
if: options.simplify == false
then:
  outputs:
    image: inputs.original
else:
  outputs:
    image: references/simplified-character.png
  imagegen:
    when: simplified 未提供
    prompt: 生成提示词.txt
```

执行规则：

1. `if` 判断条件，成立走 `then`，否则走 `else`。缺少 `else` 时，该节点在条件不成立的情况下跳过。选项尚未确定时，先执行负责写入该选项的节点。
2. `outputs.image: inputs.original` 表示本节点的 `image` 结果就是已有原图。它保留原文件路径与格式，不复制文件、不派发绘图任务。
3. `outputs.image: references/…` 表示本轮要保存的文件路径。分支继承节点输入，可按需添加自己的 `inputs`。
4. 上例始终发布 `nodes.character_reference.image`。简化分支若收到用户提供的简化图，总控将其按指定格式保存为结果；否则总控读取 `生成提示词.txt`，以原图调用 `imagegen` 一次并保存返回图。用户明确选原图时，即使提供了简化图，也使用原图。
5. `imagegen.when` 仅决定是否调用生图工具；其余分支仍使用同一个 `outputs.image` 路径。工具调用失败时记录节点失败并处理卡点，不自动切到其他分支。

条件也可明确要求总控读取绑定文本中的决定，例如`if: structure 中的 reference_needed 为 true`：读取本组structure文件开头的唯一`reference_needed: true/false`，true走then，false走else；缺失、重复或非布尔值属于上游交付错误，交原分析worker修正，不能按false跳过。该决定作用于当前group，不自动写入全局options。

下游只引用 `nodes.character_reference.image`，无需重复判断它来自哪条分支。其他需要原图保真依据的节点，可同时显式引用 `inputs.original`。

## 5. 普通节点、输出与路径

下面是普通绘制节点的示例：

```yaml
id: parts
inputs:
  reference: nodes.character_reference.image
outputs:
  svg: parts/角色.svg
  check: parts/结构检查.png
review:
  run: review/
  inputs:
    reference: nodes.character_reference.image
    candidate: self.svg
  outputs:
    report: reviews/parts/审查.md
```

`outputs` 的键是下游引用名。值为 `inputs.<名称>` 或 `nodes.<id>.<名称>` 时，直接引用已有文件；其他字符串是相对工作根目录的待写文件路径。例如 `nodes.parts.svg` 绑定到保存完成的 SVG。`self.svg` 仅在该节点的 review 中指向当前待审输出。

路径分成两个基准：

- **任务资料**：`run`、`asset` 相对声明它们的 `流程.yaml`；`prompt` 相对 `run` 指向的执行目录，省略 `run` 时即当前节点目录。提示词引用的脚本和说明相对提示词目录。
- **运行产物**：`outputs` 相对本轮工作根目录。用户提供的相对输入路径也由总控按已确认的工作根目录解析。

总控在开始前确认可访问的参考图与绝对工作根目录；缺项集中询问。编号节点和循环各项共用本轮工作根目录，分别写入配置指定的相对输出路径。资料包中的模板作为提示词资料读取，运行产物写入工作根目录。

分组目录只组织子步骤。下游直接引用实际任务的产物或工作根目录下的文件路径，省去阶段级导出别名。

## 6. 提示词、模型与最小交接

教程原文供流程编写者提炼方法，不作为节点或 review 的运行输入；拆分、衔接、材质和投影要求直接写入各自提示词。节点 asset 只绑定实际需要的工具或视觉素材，不能把理解整份教材的工作交给执行者。

每个实际任务目录提供一份提示词，直接声明 foreach 的单任务同样如此；纯分组和纯循环容器只提供调度配置。提示词兼容现有 `提示词.txt`、`生成提示词.txt`、`*prompt.txt`。需要显式选择时，在对应配置中使用 `prompt: 文件名`，路径相对执行资料目录。worker 提示词专注任务本身；节点编号、分支选择和上下游调度保存在流程文档中。

输入输出的绑定与路径统一由 `流程.yaml` 声明，提示词通过用途或图号指代输入，并说明交付内容。总控解析实际路径后交接，避免两处各自维护一套路径。

执行目录用空的 `.model` 文件名标记所需能力：

- `<模型ID>-<推理强度>.model` 指定语言模型与强度，从最右侧拆分。
- `imagegen.model` 表示由总控直接调用 imagegen 工具，不指定工具内部的生图模型。
- 派发语言 worker 时，其执行目录提供一份明确的语言模型配置；总控根目录的模型标记只建议总控所用模型。

图像参考节点同时声明 `imagegen` 并放置 `imagegen.model`。总控直接读取 `prompt` 指向的文件、传入节点所需的参考图并调用可用的 imagegen 工具，将返回图保存到 `outputs`。该标记不派发语言 worker，也不假定工具内部的具体生图模型；当前可用入口没有模型选择参数。

生图节点也可声明 YAML 或文本参考输入，例如部件清单。总控将其原文作为带名称的输入资料附在生成提示词后，图片通过参考图参数传入；节点提示词本身保持原文。可用`imagegen.inputs: [reference, reference_brief]`显式列出传给工具的已绑定输入，依列表顺序附图和文本；未列出的structure、line_art等输入只参与分支/输出绑定，不传给生图模型，列表中的缺项按必需输入缺失处理。省略列表保持已有行为，不改变其它节点的图号约定。

总控交给 worker 的内容如下，提示词通过路径读取：

```text
工作根目录：<绝对路径>
提示词：<绝对路径>
输入：<用途或图号＝实际路径>
输出：<用途＝相对工作根目录的路径>
读取指定提示词并执行，命令的工作目录设为上述工作根目录。
```

多图任务在输入中明确图号与用途。用户补充的本节点要求一并交接。工作目录是执行约定，实际文件访问边界由宿主权限决定。

例如 `1.1` 声明 `worker: reference_prep`，由它判断是否简化并写入选项；`1.2` 和 `1.3` 需要生成参考图时由总控直接调用 imagegen。各节点仍分别记录状态。

新语言 worker 按 `.model` 显式设置模型、推理强度，使用独立初始上下文；续做与并行 fork 按[会话规则](#会话与-fork)处理。生图节点读取提示词生成一次，保存返回图。参考图只检查是否成功保存、可正常读取；不因轻微画质或细节差异自行重生。确有工具失败或用户要求修正时再处理。

节点提示词中已有的自查由 worker 在任务内完成。文档 DSL 只表达明确声明的节点与 review，不自行增加检查、重绘或额外生成轮次。

## 7. 独立 review 与返修

通过节点的 `review` 字段明确安排审查。reviewer 使用独立上下文，读取自己的提示词与就近工具；总控交接实际输入、候选快照、版本、SHA-256 和证据目录。worker 接收绘制任务及后续反馈。

reviewer 报告问题后，总控将问题及证据交回**同一个 worker 会话**。worker 返修，保存新候选；reviewer 复验当前版本，通过后节点才向下游发布结果。reviewer 可以复用；需要替换时交接前轮报告、候选版本和未解决问题。

单个节点的 review 属于该节点的完成条件，天然跟随该节点的顺序或并行关系。跨多个节点的联合审查可以建成明确的编号节点，其输入列出所有候选，返修报告标明对应 worker 的节点 `id`。

原 worker 无法恢复、必要输入或检查条件缺失、连续返修无进展时，由总控报告卡点。worker 自身能够完成的修正继续在原任务内处理。

## 8. 按产物动态派发

`foreach` 是总控读取的调度配置。它可以从清单形成分组并执行相应模板，也可以逐项执行当前目录的单任务或编号子步骤。单任务的提示词、模型、worker、输入输出及 review 放在本目录；只有纯循环容器不放 worker 提示词和模型。

```yaml
id: refine_groups
inputs:
  reference: nodes.base_subject.image
  original_reference: inputs.original
  prepared_reference: nodes.character_reference.image
  line_art: nodes.line_art_reference.image
  parts: nodes.part_inventory.parts
  svg: nodes.kind_layers.svg
foreach:
  from: inputs.parts
  items: parts
  group_by: kind
  as: group
  per_part: [generic]
  priority: [face, eyes, mouth, hair, body, lower_body, arms, physics_details, special_parts, clothing, generic]
  mode: serial
  run: ../../templates/部件专项/{group.kind}/
  carry: [svg]
```

### 分组与模板定位

| 字段 | 含义 |
| --- | --- |
| `from`、`items` | 本节点已绑定的清单文件及其中要遍历的列表 |
| `group_by` | 按条目的字段汇集成组，例如 kind；省略时按原列表逐项执行 |
| `as` | 交给 worker 的本轮对象名，例如 group |
| `per_part` | 这些类别逐条形成独立任务，其余类别各形成一个组 |
| `priority` | 优先处理的类别，按列表顺序；其余按清单中首次出现的顺序 |
| `mode` | serial 表示当前组全部步骤完成后再进入下一组 |
| `run` | 执行目录，相对声明它的 YAML；替换占位符后定位；省略时逐项执行当前任务，有编号子步骤的纯容器则展开子步骤 |
| `carry` | 向后传递的同名输入输出，例如上一轮绘制的 svg |

普通组的 `group.id` 为 kind；`per_part` 类别的 id 为 `<kind>_<part.id>`，同类对象按清单顺序执行。每次交接 `group.id`、`group.kind`、`group.part_ids` 和实际输入输出。分组决定本轮制作范围，实际图层仍按独立部件保存。

总控按 run 指向的目录是否已有任务筛选当前可执行组，未建立的类别记入运行记录。用户明确指定尚未建立的类别时报告缺项。没有可执行组时记录原稿位置和未接入情况，不能标为已完成细化。

### 单任务循环与编号子步骤

没有 `group_by` 时，`items` 指向的 JSON/YAML 列表每个对象原样绑定给 `as`，按原顺序执行；不生成 kind 或 part_ids。此模式不使用 `per_part`、`priority`。当前 eyes 第2、5步是直接执行的逐眼任务；第4步是有四个子任务的循环容器，三处均读取计划中的 `eyes`：

```yaml
# 位于 eyes/2.逐眼线稿/流程.yaml；提示词、模型、review 同在此目录。
id: eye_line_art
worker: refinement_drawing
inputs:
  reference: inputs.reference
  svg: inputs.svg
  plan: refinement/groups/{group.id}/1.制作计划/plan.json
foreach:
  from: inputs.plan
  items: eyes
  as: eye
  mode: serial
  carry: [svg]
outputs:
  svg: refinement/groups/{group.id}/2.逐眼线稿/{eye.id}/character.svg
# 其余输入、对照图输出及 review 见实际节点 YAML。
```

省略 `run` 时：本目录声明 worker 且有提示词与模型，则每个 eye 直接执行本任务及其 review，不再解析一遍自身 foreach；本目录只有编号子步骤，则作为纯容器逐项展开。两种形式不能混用，没有任务也没有子步骤是配置错误。只有一个任务无需增加单项子目录或嵌套 templates；第4步有四个职责不同的实际着色任务，因此直接放4.1–4.4子目录，容器只调度。指定 `run` 时仍定位到被引用目录，既有按 kind 分组的行为不变。

进入循环前，从父作用域绑定 foreach.from 所需的来源输入（如 plan）和初始 carry；带 {eye.id} 的其他输入在当前 eye 绑定后再解析，不能提前当作缺失文件。内层别名 eye 保留父级 group，输出可以同时引用两者；退出时移除 eye。每项的 inputs.svg 取当时最新 carry，approved_line_art/clean_coloring 等历史基准仅用于核对当前眼，不能覆盖最新整图。

当前任务及其 review 通过后，才把 outputs.svg 发布为下一项的 carry；review 的 inputs.svg 等输入继续指本项绘制前的基线，self.svg 指本项候选，不能在 review 前覆盖输入绑定。整个循环结束后，把最后已通过产物写回父循环同名 carry，再执行父级下一节点。没有同名输出的任务不清空 carry；纯容器不另造导出路径。节点 id 可以重复执行，记录键必须包含 group.id、eye.id 和节点 id，不能因第一眼已完成而跳过第二眼。部分失败时不把候选作为已通过产物推进。

eyes 的 `1.1` 使用 Sol-medium，一次确定 `eyes_symmetric`、制作队列、镜像轴与整眼相对头发的 `eye_hair_order`，写入 `locked=true`。计划包含参考 SHA-256，保存为 `plan.json`。首次调用计划节点的 `validate_plan.py` 得到 `plan_sha256`，总控记入本轮运行记录。后续绘制阶段前传相同 `--expected-sha256` 核验计划未变，同时核对 options 与参考。计划漂移时恢复已确认版本或报告，不自动接受新哈希、扩大队列或重画第二眼。用户新的明确指示可以启动新计划；小像素差、不同发丝遮挡与未完成的材质不构成自动改策略的授权。

执行次序：
- 1.2 以原彩图只生成一次双眼放大线稿参考。
- 2.逐眼线稿：先用原图并排/混合对照修正输入色块，再按轮廓、眼内、装饰制作完整线稿。独立 review 同时接收输入底稿与校准对照，确认必要偏差已纠正，通过后冻结该眼几何。
- 所有线稿通过后，3.眼部色盘由独立 Sol-medium worker 提取原图色盘 PNG/JSON 和颜色空间分布说明，覆盖计划中的眼。此步无 SVG 输出，不清空或回退 carry。
- 4.逐眼着色按计划逐眼执行4.1轮廓部件、4.2眼黑颜色与层次、4.3睫毛与眼皮、4.4眼周皮肤明暗。容器先绑定色盘与最新 SVG，再为当前 eye 顺序执行四项，carry 在子项间及下一眼连续传递。每项的已审线稿仅作当前眼基准，不能替换整图。
- 5.逐眼投影与高光使用每眼4.4的干净着色稿作比较基准，独立处理来源/目标、完整路径、表面与眼裂裁切，以及开关/独显检查。
- 6.镜像组装与成稿审查：true在主眼本体效果完成后镜像本体一次，保留原图两侧已完成泪液及其效果；false保留各眼。最终review专项检查眼黑颜色层次、眼周皮肤明暗、实际泪液、独立效果与分层。

true队列只含主眼，线稿/着色/效果循环不制作目标眼本体；原图泪液例外：在现有第2/4.3/5步内一次处理两侧实际泪液及其效果，第3步按各侧取色，使用所属眼part及data-mirror="exclude"标记，第6步保留这些独立组/资源，仅镜像眼本体。泪液所在侧无需加入eyes队列，计划schema和节点数量不变，单侧泪不触发双眼本体重画；false队列包含实际各眼，随当前眼处理其泪液。

产物位于refinement/groups/{group.id}/：3.眼部色盘/palette.png、palette.json、说明.md；4.逐眼着色/{eye.id}/4.1–4.4各自目录/character.svg；5.逐眼投影与高光/{eye.id}/character.svg；6.镜像组装与成稿审查/character.svg。第2步线稿路径不变。4.4的SVG包含当前眼全部着色、泪液本体及自身明暗，作为第5步关闭外来效果后的比较基准；比较当前眼时保留最新整图中其他眼的进度。汗珠等脸部附着素材由face第5步完成本体、第6步整理实际效果，两组均无新增表情节点。

### mouth 的串行模板

mouth承接eyes的最新完整SVG，只按编号执行三个直接任务：1.嘴型校准与完整线稿、2.嘴部色盘、3.嘴部着色成稿；不存在只包一个任务的外层目录或额外组装。线稿与着色使用refinement_drawing（Astra-xhigh），色盘使用mouth_palette（Sol-medium）。线稿内判断实际素材范围，使用原图与已有线稿参考，无独立plan或生图分支。

mouth_line_art输出SVG与一张包含原图/候选/混合及六项独显的结构对照，review挂在该节点，独立Astra-xhigh优先核对嘴上、嘴下、嘴内、上牙、下牙、舌头的完整实体、控制及遮盖，再核对形状线质。闭嘴不是省略牙舌的依据，按原图补充实际唇色/装饰；真实结构例外需依据。报告路径为reviews/refinement/{group.id}/line-art/审查.md，通过后更新carry。

mouth_palette读取已审SVG，输出palette_image、palette_json和inferred_palette，保持carry；mouth_coloring用nodes.mouth_palette.<输出名>绑定色盘，按提示词中的轮廓、内部件、唇色/皮肤与效果顺序在一个任务内完成全部着色及必要独立效果，输出最终svg和preview，直接更新carry。输出阶段目录依次为1.嘴型校准与完整线稿、2.嘴部色盘、3.嘴部着色成稿，均位于refinement/groups/{group.id}/。

mouth的轻量review直接读取已保存线稿与一张结构对照，不另建候选副本、证据链或历史哈希审计；通过条件仍是实际部件完整。统一着色保留已审底形及隐藏内部，渲染工具按asset绑定tools/svg_preview.py，按提示词调用，不由worker重新实现。最后绘制者一次自查，直接交SVG和预览，没有最终独立review或表达验收。返修只更新具体问题及相关交付，不要求未变化阶段重出文件；旧编号产物作为历史，续跑重新绑定实际输入与新版节点，不沿旧计划自动恢复已删阶段。

### hair 的生成参考与串行制作

hair 为五阶段、9个实际任务：hair_reference直接以原彩图生图一次，没有独立识别节点或structure输入，发布完整线稿与拆解补全两区的image；历史hair_reference_needed不再控制分支。第2阶段是hair_crown_line_art（2.1）→hair_front_side_line_art（2.2）→hair_line_art（2.3），各worker从原图识别自己的实际结构后绘制，后者唯一review绑定最终SVG、生成参考、head_comparison与back_comparison。

第3步hair_palette（Sol-medium）读取nodes.hair_line_art.svg及原图提取色盘；第4阶段是hair_crown_coloring（4.1）从已审线稿开始，hair_front_side_coloring（4.2）读取4.1输出，hair_coloring（4.3）读取4.2输出。第5步hair_effects读取nodes.hair_coloring.svg并直接交成稿，七个绘制任务继续同一refinement_drawing（Astra-xhigh）会话。

2/4分组目录没有父任务、模型或导出别名；hair_line_art和hair_coloring分别属于最后一个实际子节点，产物引用在YAML中明确。2.1/2.2/4.1/4.2/4.3只交完整SVG，2.3另交两张分区对照，5交SVG/预览，整组仅2.3之后的一次独立review。返修修改最新整图对应区，不增加规划文件、冻结哈希、候选快照或长报告；历史编号与结构安排不作为本版输入，续跑按实际内容重新绑定产物。

### body 的串行模板

body承接hair的最新完整SVG，五个直接节点依次为body_line_art、body_palette、body_neck_shoulder_coloring、body_torso_coloring、body_effects。body_line_art绑定父输入的reference、parts、svg和line_art，并在节点内配置唯一review；通过后body_palette读取其svg，独立输出palette_image/palette_json而不清空carry。第3步绑定nodes.body_line_art.svg及nodes.body_palette的色盘，第4步绑定nodes.body_neck_shoulder_coloring.svg，第5步绑定nodes.body_torso_coloring.svg并直接交最终svg/preview。

输出阶段目录依次为1.身体构型与衔接线稿、2.身体色盘、3.颈肩着色与明暗、4.胸腹腰着色与明暗、5.身体承影与成稿，均在refinement/groups/{group.id}/下。各目录直接包含流程、提示词与模型，无父任务；绘制共用refinement_drawing（Astra-xhigh），色盘为body_palette（Sol-medium），独立线稿review为Astra-xhigh。

group.part_ids限定body实体范围，新增内部子组保留父part身份；其它组不因连接而转入本轮制作。body侧接口位置、邻件id、搭接及颜色用途随SVG中的desc传递，后续组读取最新SVG接续，不增加规划JSON或检查节点。body_effects按body承影目标确定范围，复用跨kind来源的已有效果，只更新本轮目标所需的影形/裁切；最终绘制者一次自查后发布carry，总控不重复看图或核验哈希。

### lower_body 的三次派发

lower_body_palette读取本组inputs.reference/parts/svg，由Sol-medium输出palette_image与palette_json，不改变carry；lower_body_pelvis读取原inputs.svg、line_art及该色盘，由refinement_drawing（Astra-xhigh）一次完成骨盆形体、肤色与承影；lower_body_legs继续同一会话，显式绑定nodes.lower_body_pelvis.svg及色盘，一次完成双腿和足部，发布最终svg/preview/comparison。

输出分别在refinement/groups/{group.id}/的1.下半身色盘、2.骨盆构型与着色、3.双腿与足部成稿；三个目录直接放流程、提示词和模型，不设父任务、逐腿foreach或review。现有parts分层可保留，整腿也可沿用；每个绘制任务内按校形→线条→自身着色→独立效果顺序操作，不把每个part变成一次派发。

骨盆从输入SVG读取torso腰口desc并在自身desc交接腿根，双腿任务集中处理根部、膝踝的形状和颜色连续性；效果只针对本组承影面，来源/目标元数据供后续关联。最后绘制者用preview_tool一次完成同坐标对照与代表性实际投影开关测试，交一张对照板和简短结论，未覆盖项明确说明；总控仅接收交付，不另做视觉复核、哈希审计、组装或动态测试。

### arms 的五次派发与专门手部会话

arms_palette以独立Sol-medium读取reference/parts/svg，只交palette_image/palette_json；arms_limb_coloring复用refinement_drawing（Astra-xhigh），读取当前inputs.svg及色盘，一次完成两侧大小臂与本区承影。随后arms_hand_reference由总控调用一次imagegen，绑定角色原图为图1、模板references中的Milly拆分板为图2；它只输出image，不覆盖第2步的SVG carry。

arms_hand_line_art使用新的hands_drawing（Astra-xhigh），显式读取nodes.arms_limb_coloring.svg及nodes.arms_hand_reference.image，一次完成双手各掌与五指的线稿/隐藏补全；唯一review就在该节点内。通过后arms_hand_coloring继续同一hands_drawing，读取nodes.arms_hand_line_art.svg与arms_palette的色盘，直接交最终svg/preview/comparison并更新carry。后续其它组即使恢复refinement_drawing，也须绑定此最新carry，不得拿其会话中旧的大小臂稿覆盖双手。

五个编号目录均直接放配置、提示词和模型，references不参与排序；不加逐手/逐指foreach、计划或全局光影判断节点。已有part身份保留，手内六件和关节接口写入实际SVG；承影按实际目标归属，body/hair既有关系仅在源形受影响时维护。线稿交一张结构对照，成稿一次自查，不增最终review、组装、总控截图或哈希审计。

### physics_details、special_parts、generic的五段模板

每组直接放1.结构分析、2.按需补全参考、3.完整线稿与关联投影、4.部件色盘、5.着色与效果成稿；没有父任务或嵌套templates。节点id依次为`<kind>_structure`、`<kind>_reference`、`<kind>_line_art`、`<kind>_palette`、`<kind>_coloring`；结构与色盘分别用各组Sol-medium会话，线稿/着色复用refinement_drawing（Astra-xhigh）。

structure节点从父输入读取原图、parts及最新svg，交structure（结构安排.md）和reference_brief（补全要求.txt），不输出svg。reference节点按structure中的reference_needed决定：true时使用固定生成提示词，只将reference和reference_brief交imagegen生成一次；false时将inputs.line_art直接发布为image，两个分支都提供下游guide，均不改变carry。

line_art节点从inputs.svg接续最新完整稿，绑定本组结构安排和reference.image，输出svg/comparison/handoff；唯一review就在此节点，baseline固定为绘制前inputs.svg，candidate为self.svg，通过才更新carry。handoff是短的实际内部id、改形id与投影修正记录，不要求另造候选快照或哈希链。palette只输出PNG/JSON，不清空carry；coloring读取当前inputs.svg、已审线稿基准、handoff和palette，完成材质及效果后直接发布svg/preview/comparison。

绘制批次由结构表说明，在线稿和着色任务内依次实施，不逐小件建立foreach或review；真实图层仍按独立实体分开。几何定稿引发的投影修正包含跨kind的既有关系：source缓存/影形、target裁切和层序在线稿交接前更新，颜色/柔度在着色收尾完成，effect身份与承影归属延续。

产物根为refinement/groups/{group.id}/，其下使用与模板相同的五个步骤目录；review在reviews/refinement/{group.id}/line-art/审查.md。generic按独立对象执行完整五段，所有nodes引用与记录以当前group.id为作用域，不能用上一generic对象同名节点的产物，最终carry才跨对象传递。最后绘制者一次自查，总控只接收交付与线稿review结论，不追加组装、视觉复核或动作测试；clothing使用下面的单任务模板。

### clothing的单任务模板

4.2的run定位到clothing/后，直接执行该目录的流程、提示词和Sol-xhigh模型标记，无编号子目录；clothing_base_cleanup使用独立clothing_cleanup会话，不能复用Astra的refinement_drawing。svg绑定最新carry，original_reference与prepared_reference由4.2从根original和nodes.character_reference.image引入，reference仍为临时连体服参考。

本任务输出svg/preview/handoff/outfit_source/outfit_references，分别为refinement/groups/{group.id}/下的character.svg、preview.png、交接.md、衣装来源.svg及衣装参考/目录；outfit_source是完整输入SVG的原样副本，参考目录保存原图/适配参考并保持原格式，交接注明实际文件及附件id。目录输出按实际目录及提示词要求的内容确认，不将目录当作图片。

同一次worker内定位衣物依赖、移出临时衣装、清理失效效果、局部补形/补色并一次自查，无review/imagegen或子节点，只有svg更新carry；无清理项时也原样保存输入到声明输出并记录无项。后续generic恢复Astra会话时接最新carry，历史parts中的衣物不再当作缺件补回；独立衣装工作流尚待实现。

### 谁读取哪些文件

以 face 为例：

```text
4.2.按组细化/
└── 流程.yaml                         # 总控：foreach 与模板路径

templates/部件专项/face/
├── 1.脸部色盘/
│   ├── 流程.yaml                     # 总控：输入输出、worker
│   ├── gpt-6-sol-medium.model        # 总控：模型
│   ├── 提示词.txt                    # Sol：提取色盘
│   └── 提取色盘.py                   # Sol：取色工具
├── 2.脸型校准与绘制/
│   ├── 流程.yaml                     # 总控：输入输出、worker
│   ├── gpt-6-astra-xhigh.model        # 总控：模型
│   └── 提示词.txt                    # Astra：校形、线条与底色
├── 3.关联部件校准/
│   ├── 流程.yaml                     # 总控：输入为上一项 SVG
│   ├── gpt-6-astra-xhigh.model        # 总控：继续同一绘制会话
│   └── 提示词.txt                    # Astra：邻接部件的几何与遮挡
├── 4.肤色与局部层次/
│   ├── 流程.yaml                     # 总控：校准稿、彩图与色盘
│   ├── gpt-6-astra-xhigh.model
│   └── 提示词.txt                    # Astra：脸底填色
├── 5.脸部部件绘制/
│   ├── 流程.yaml
│   ├── gpt-6-astra-xhigh.model
│   └── 提示词.txt                    # Astra：眉鼻耳与红晕
└── 6.投影与高光效果/
    ├── 流程.yaml
    ├── gpt-6-astra-xhigh.model
    └── 提示词.txt                    # Astra：独立效果与裁切关系
```

模板复用普通任务规则：总控读取每个编号任务的 YAML 和模型标记，给相应 worker 交接该任务的提示词路径。模板中不再嵌套调度 agent，也不需要额外模板索引文件。

### 输入输出与会话

模板任务中的 `inputs.<名称>` 取当前循环绑定的输入；`group` 随每次交接提供。同组步骤之间也可以直接用相对工作根目录的产物路径，例如色盘任务输出 `refinement/groups/{group.id}/1.脸部色盘/palette.json`，绘制任务的输入直接写这个路径。路径占位符由总控替换后交接，实际文件必须由前一步成功交付。

各任务在自己的 YAML 中声明 `worker`，在同目录放置模型标记。不同 worker 分别建会话；同名 worker 在后续步骤和分组中继续原会话。各组色盘使用各自的palette worker（Sol-medium）；绘制通常使用refinement_drawing（Astra-xhigh），arms的双手线稿与着色单独共用hands_drawing（Astra-xhigh）。优先顺序为face → eyes → mouth → hair → body → lower_body → arms → physics_details → special_parts → clothing → generic，沿用前组最新完整SVG；优先级中的未建模板仍登记为未接入，不能将顺序声明视为已经实现。eyes_planning使用Sol-medium，眼部放大线稿生成一次；嘴部范围判断并入完整线稿任务，直接参考原图和已有线稿。

`carry` 中的输入首轮取循环节点的输入。模板内某任务成功交付同名输出时更新本组的当前值，供后续步骤读取；未输出该键的任务保持原值。当前组全部完成后，将这些值交给下一组。每次绘制保存包含此前修改的完整 SVG，后续任务显式接收最新路径；失败或返修中的候选不继续传递。

每项的输出保存在模板声明的实际位置，如 `refinement/groups/{group.id}/2.脸型校准与绘制/character.svg`。后续直接使用这些路径，最终 SVG 就是最后完成的绘制任务产物。总控在既有 `运行记录.md` 记录各组步骤、模型与会话 ID、实际产物、最新 SVG 和未接入类别，省去阶段导出与重复汇总报告。没有执行绘制时，记录原 SVG，不能称为完成细化。

worker 自查和修正仍在该任务内完成，显式 review 由总控派发。eyes 单眼线稿任务自带 review，报告写入 `reviews/refinement/{group.id}/line-art/{eye.id}/审查.md`；最后组装的 review 写入 `reviews/refinement/{group.id}/审查.md`。两类审查分别使用独立 Astra-xhigh 上下文，交接当前版本、SHA-256 和证据路径。当前项通过后才发布该节点 SVG、更新 carry；最后的整组审查不要求重做已验证且未变化的项目。

输入色块不属于已审眼部几何，第2步必须先校准。通过 review 后固定眼角、眼裂、虹膜尺寸/位置及关键可见比例；第4步仍可新增必要颜色层、渐变及眼周肤色色形。复杂虹膜不能简化为一个基色或单条渐变，眼周明暗不能只用褶线代替。第3步取色不承担绘制，第4步分项着色，第5步独立效果，第6步组装。返修按眼型→第2步、取色→第3步、轮廓/眼黑/装饰/皮肤→4.1/4.2/4.3/4.4、效果→第5步、复制→第6步定位，不重新评估镜像策略。

每阶段的必要检查按 worker 提示词执行：校准阶段有输入/候选对照，效果阶段有开关/独显/裁切证据；可以合并成图，不能省掉验收内容。review 复用版本匹配的证据，另直接渲染局部确认；针对疑点补证据。总控核对交付、版本和 review，不重复整套量测。没有明确问题就推进，不以“再优化一下”触发无限循环。中途停下时记录当前循环项、阶段和候选版本；未完成阶段不能记成通过。

## 9. 本轮记录与续跑

总控保留工作根目录、外部输入、本轮 `options.json` 的值及来源、分支选择、节点状态、实际产物及版本、worker 会话 ID、fork 来源与分支子会话 ID 和 review 结论。运行经过可存为工作根目录的 `运行记录.md`，由总控维护。

用户可以指定从某个节点继续、在某个节点结束。续跑采用本轮已确认的同版输入与产物；并行批次中已完成成员可以复用，失败成员解决后再汇合。输入或选项改变后，受影响的下游结果需要重新确认，不能仅凭文件仍存在视为完成。

这些规则沿用现有流程的模型选择、实际输入绑定、独立审查和原 worker 返修能力；新增的是层级编号、同编号并行批次，以及有明确输出的条件分支。
