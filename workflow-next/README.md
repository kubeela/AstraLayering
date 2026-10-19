# Layering workflows

四个独立入口共用安装、运行根目录和调度模块。需要 Node 24.12+；Codex 的模型服务、登录及原生 `image_generation` 由外部环境配置。Krita 由调用方显式提供路径，工作流只检查，不下载安装或搜索。

在仓库根目录安装一次：

```bash
pnpm --dir workflow-next install --frozen-lockfile

# 人物：首次输入原图；续跑只传 --name
pnpm --dir workflow-next part-layering --name sample --image /absolute/character.png
pnpm --dir workflow-next raster-layering --name sample --krita /absolute/krita

# 衣服：按同一个 name 读取人物 part 生成的简化穿衣角色图
pnpm --dir workflow-next clothing-part-layering --name sample
pnpm --dir workflow-next clothing-raster-layering --name sample --krita /absolute/krita

pnpm --dir workflow-next raster-layering --name sample
```

四个目录内的 `pnpm start` 仍是对应入口。人物简化参考如果沿用原图，会保留原扩展名，衣服入口会自动定位实际文件。

## 输入、产物与续跑

```text
workflow-next/.run/<name>/
├── input/                  # 用户首次提供的原图，后续管线不复制上游
├── part-layering/           # references、groups、parts、stages、occlusion
├── raster-layering/         # run.json、step01～step03
├── clothing-part-layering/  # 纯衣服 preparation 及衣片分组产物
└── clothing-raster-layering/# run.json、step01～step02
```

用户输入的绝对路径直接使用；相对路径统一相对于 `workflow-next/.run/<name>/`，与 shell 当前目录无关。规则也适用于 `--groups` 和正常运行时的 `--krita`。单独 `--check-krita` 无任务名，请提供绝对路径。只有人物 part 接收 `--image`；衣服 part 读取同名人物 part 的 `references/simplified-subject.*`，两套 raster 分别读取同名对应 part 的产物。后续入口不再接受 `--input` 或另行提供图片。

任务名保留各自原有启动规则：part 接受单个目录名，raster 要求以字母或数字开头、只含字母、数字、点、下划线和短横线且不超过 128 字符。共享目录不额外收紧 part 的名称范围。

首次原图保存为 `.run/<name>/input/original.<扩展名>`。后续直接读取上游文件，不建立输入副本。入口各自独立，不自动启动上游；缺少产物时列出具体缺失路径，并提示先运行对应上游管线，或手动将产物放到这些位置。各管线的步骤路径以自身目录为基准。

旧任务先运行 `pnpm --dir workflow-next migrate-inputs --name <name> --dry-run` 查看迁移，再去掉 `--dry-run` 执行。脚本将初始图片和旧输入副本移回统一位置，保留 KRA、标记与 threadId；遇到内容不同的目标先报错，整次迁移不覆盖文件。

part 按 SVG、检查报告、输入指纹及分组树恢复，整层绘制与 review 完成后先同层去重，再补全和分析子组。raster 以 `.running`、`.completed` 以及 review/repair Markdown 决定进度，`run.json` 保存配置和绘制 threadId。删除完成标记会重置该步及其后续步骤、重新建立绘制 thread；重跑清理仅发生在本管线步骤目录内；step01 写回上游 occlusion.json 的深度修正保留。`.running` 表示尚未完成，不代表进程仍在运行。

人物 raster 保留三步，衣服 raster 保留两步，各自交付文件要求不变。第二步完成全部 review/修复后才写 `.completed`。每次 reviewer 使用新上下文，反馈交回原绘制 thread；最多两次 review，第二次反馈修完后结束，不增加第三次 review。续跑仍需要原 Codex 环境保留对应的会话历史。

## 共享实现与独立配置

| 位置 | 职责 |
| --- | --- |
| `shared/part/` | 分组树、SVG、整层调度、去重、依赖恢复及 part agent |
| `shared/raster/` | 上游定位、Krita 检查、顺序步骤、review 和标记恢复 |
| `shared/codex/` | SDK / App Server 适配、日志、工具配置、并发和临时重试 |
| `shared/paths.ts` | 统一任务目录和外部输入路径解析 |
| 各管线目录 | 启动入口、preparation 或步骤定义、提示词和专项配置 |

人物与衣服分别加载自己的提示词。人物原有 `prompts/groups/<完整ID>/` 特化、参考清单、无祖先继承、默认回退及固定操作约定追加规则保留；共享恢复器也使用对应的参考清单。人物额外参考按需读取，衣服继续提供原穿衣角色用于判断穿插和随动。

## 编辑工具说明与 schema

```text
shared/tools/<工具名>/description.md
shared/tools/<工具名>/schema.json
part-layering/tools/write_groups/description.md
clothing-part-layering/tools/write_groups/schema.json
```

直接修改仓库固定目录中的文件。description 为工具说明，schema 为发送给 Codex 的 JSON Schema。各管线配置的工具目录可按完整文件覆盖公共版本；未提供的文件沿用公共版本。人物原有分组 JSON 示例放在人物专属工具说明中；衣服首次分组只允许 `subject="other"`，不会读取人物示例或更改人物的允许值。没有外部工具目录启动参数。

工具配置在启动时加载并固定，修改文件在下一次启动生效；同一次 agent 调用期间定义保持一致。raster 各阶段按下文约定提供深度工具，切换阶段仍沿用绘制 thread。实际执行与文件写入校验仍在 TS 中，新增参数或修改执行行为需要同步实现。配置无效会报错。

步骤提示词保留任务目标、方法和验收要求，可以在特殊场景点明工具；参数与调用教程放在工具定义中。此配置只管理工作流注册的函数工具，原生 `image_generation` 仍由外部 Codex 提供。

`update_group_note` 在首次绘制和返修时都可使用：只允许精确修改当前组 note，不改父组、其他组、名称、种类或分组树。reviewer 只提交反馈；修改后的说明交给后续检查和子组分析。

## 临时错误恢复

四套流程使用同一临时错误分类和退避策略。先等待 Codex 自身重连的最终结果，再对服务过载、断流和临时限流按 5、10、20、40、60 秒等待重试，之后每次 60 秒，直到成功或取消。保持原 thread、已有图片和文件，提示 agent 从未完成处继续；不增加视觉 review 轮次。

认证、额度、上下文超限、图片数量上限、输入或工件校验错误不会进入此重试。50 图上限的可选压缩保护仍是后续功能，本次没有接入。

## 多深度与上游修正

`occlusion.json` v3 中每个逻辑 part 仍只有一条记录：单深度使用 `level`，多深度使用 `levels: [{ level, region }]`，二者互斥。深度在整份表中按数值从后到前排序，不再等于数组位置；数值唯一，可用小数插入现有层之间。每个多深度区域都必须有文本说明和检查依据。v2 单深度表仍可读取。

一个共同运动部件需要多个绘画深度时，不再阻断或要求上游重拆。深度规划保持 part 树和 SVG；整件候选预览仅供参考，不能精确展示文本区域的切分。step01 依据标注或组装中新发现的问题，自行拆实际 KRA 绘画层，保持连续性，必要时局部补画。拆层脚本由绘制 agent 编写，调度器不自动切像素。

`read_occlusion` 返回对应上游深度表及 revision；`update_occlusion` 按 ID 精准修改，校验 revision、完整结构和逐区域检查后原子写回。它不改逻辑 ID、groups.json、SVG 或未指定的部件。工具说明和 schema 仍在固定的 `shared/tools/` 中。step01 报告记录 part、实际图层名、区域和最终深度的对应；后续步骤与 reviewer 保留这些合法分片。中断和主动重跑均保留上游修正，不恢复旧副本。

raster 保持原有 SDK 的 startThread/resumeThread 与 threadId 记录，通过每次启动的 MCP 配置提供深度工具，不修改全局 Codex 配置。当前 Codex 的 thread/resume 不支持追加 dynamicTools；使用本次调用的 MCP 配置让已有 SDK thread 也能获得工具，无需重建上下文。step01 提供读取和修改工具，后续绘制阶段只提供读取，reviewer 仍只反馈。原生 image_generation 和外部 provider、鉴权保持原样。

## 检查

```bash
pnpm --dir workflow-next check
pnpm --dir workflow-next test
```

测试使用模拟 agent、SDK / App Server 和临时文件，并只读检查仓库已有示例的恢复，覆盖各自 preparation、提示词与参考选择、同层去重、恢复、两轮 review、工具配置及重试。不会运行付费生图或重画已有 KRA。新产生的 `.run/` 请求、会话及中间处理记录保留本地，不提交推送；仓库原已收录的人物示例随目录迁移，保留原有文件。

共享重构的逐模块差异、发现的偏差及新旧调度对照结果见 [差异审计](docs/shared-refactor-audit.md)。
