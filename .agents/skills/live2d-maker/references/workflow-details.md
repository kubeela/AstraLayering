# 配置与工作流细节

以下命令均从安装后的 `live2d-maker` 根目录执行。

## Codex 环境配置

复制 `example.env` 为 `.env`，按需填写；不填写时无需创建此文件。shell 的同名环境变量优先，文件不执行 shell 或展开变量。`.env` 不写入 Git。

| 配置 | 默认与用途 |
| --- | --- |
| `layering_custom_provider` | `false`；沿用当前 `CODEX_HOME` 或 `~/.codex` 的订阅／自定义 provider |
| `layering_provider_base_url` / `layering_provider_api_key` | 自定义主 provider 为 `true` 时填写，使用 Responses API |
| `layering_medium_model` | `gpt-6.1-sol-xhigh`；两套 part 的 agent、人物 raster step03、穿戴组装 agent |
| `layering_high_model` | `gpt-6-astra-xhigh`；两套 raster step01、step02 及 reviewer |
| `layering_image_base_url` / `layering_image_api_key` | 可选独立 Images API；两项一起填写才启用 |
| `layering_image_model` | `gpt-image-2.5-sunburst`；单独填写不会启用自定义生图 |
| `layering_image_compact_threshold` | 留空关闭；如网关上限为 50 张，可设 `49` |
| `layering_codex_path` | 可选 Codex 可执行文件；上述生图／图片压缩功能需要补丁版 |
| `layering_codex_home` | 通常不填；仅在明确需要独立 Codex 环境时设置 |

模型最后一个后缀表示思考力度，发送的模型 ID 不含此后缀。支持 `none/minimal/low/medium/high/xhigh`，具体须符合所选模型能力。配置路径相对于 skill 根目录（`SKILL.md` 所在目录），与任务输入路径规则不同。

自定义生图仍使用 Codex 原生 `image_gen.imagegen`，提供商可为兼容的 LiteLLM 网关，不注册替代生图工具。此功能及图片数量压缩需要仓库提供的 Codex 源码补丁：

```bash
cd /安装位置/live2d-maker
pnpm build:codex
# .env: layering_codex_path=.codex-build/bin/codex
```

构建是显式操作，需要 Git、Rust 1.95.0 与平台编译依赖；正常运行不会下载或构建 Codex。补丁固定在官方 0.161.0 源码，独立生成文件，不修改用户的系统 Codex 或全局配置。[构建与本地验证说明](../tools/codex/README.md)。

图片保护在下一次模型请求前计算当前上下文中图片的出现次数，包括同批工具返回的图片。达到阈值时在同一 thread 内 compact；该次压缩请求只发送文字，以免压缩请求本身再次触发图片上限。压缩完成后恢复正常看图，文件与任务标记不受影响。它不是永久图片记忆：需要重看细节时 agent 仍会读取原图。

## 输入、产物与续跑

```text
<运行根目录>/<name>/
├── input/                  # 用户首次提供的原图，后续管线不复制上游
├── part-layering/           # references、groups、parts、stages、occlusion
├── raster-layering/         # run.json、step01～step03
├── clothing-part-layering/  # 纯衣服 preparation 及衣片分组产物
├── clothing-raster-layering/# run.json、step01～step02
└── character-assembly/      # run.json、step01 穿戴组装
```

默认运行根目录是 skill 上一级；四个入口均可用 `--dir <绝对路径>` 指定其他运行根目录，启动后续管线和续跑时使用同一目录。目录结构不额外插入 `.run`。用户输入的绝对路径直接使用；相对路径统一相对于 `<运行根目录>/<name>/`，与 shell 当前目录无关。规则也适用于 `--groups` 和正常运行时的 `--krita`。单独 `--check-krita` 无任务名，请提供绝对路径。只有人物 part 接收 `--image`；衣服 part 读取同名人物 part 的 `references/simplified-subject.*`，两套 raster 分别读取同名对应 part 的产物；组装入口读取人物 step03 KRA、衣服 step02 KRA 和人物 part 的简化穿衣参考。后续入口不再接受 `--input` 或另行提供图片。

任务名保留各自原有启动规则：part 接受单个目录名，raster 要求以字母或数字开头、只含字母、数字、点、下划线和短横线且不超过 128 字符。共享目录不额外收紧 part 的名称范围。

首次原图保存为 `<运行根目录>/<name>/input/original.<扩展名>`。后续直接读取上游文件，不建立输入副本。入口各自独立，不自动启动上游；缺少产物时列出具体缺失路径，并提示先运行对应上游管线，或手动将产物放到这些位置。各管线的步骤路径以自身目录为基准。


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

五条管线使用同一临时错误分类和退避策略。先等待 Codex 自身重连的最终结果，再对服务过载、断流和临时限流按 5、10、20、40、60 秒等待重试，之后每次 60 秒，直到成功或取消。保持原 thread、已有图片和文件，提示 agent 从未完成处继续；不增加视觉 review 轮次。

认证、额度、上下文超限、图片数量上限、输入或工件校验错误不会进入此重试。可选图片保护在请求发出前处理阈值；未启用时保持原行为。

模型正常结束但没有交付文件、没有保存分组、缺少有效结构化结果，也会明确报错并展示模型最后消息及 threadId；raster 同时写入该步骤的 `error.txt`，保留 `.running`，不误标 `.completed`。例如模型告知没有可用的生图工具，终端会保留这段说明，方便修正环境后沿用原 thread 续跑。

## 多深度与上游修正

本节仅适用于人物／衣服 part 和 raster；后续 `character-assembly` 使用已完成的两份 KRA，不注册深度修改工具，也不继承 raster step01 的拆层提示词。

`occlusion.json` v3 中每个逻辑 part 仍只有一条记录：单深度使用 `level`，多深度使用 `levels: [{ level, region }]`，二者互斥。深度在整份表中按数值从后到前排序，不再等于数组位置；数值唯一，可用小数插入现有层之间。每个多深度区域都必须有文本说明和检查依据。v2 单深度表仍可读取。

一个共同运动部件需要多个绘画深度时，不再阻断或要求上游重拆。深度规划保持 part 树和 SVG；整件候选预览仅供参考，不能精确展示文本区域的切分。step01 依据标注或组装中新发现的问题，自行拆实际 KRA 绘画层，保持连续性，必要时局部补画。拆层脚本由绘制 agent 编写，调度器不自动切像素。

agent 直接使用内置读文件工具查看上游 `occlusion.json`；`update_occlusion` 按 ID 精准修改，自动替换互斥字段，校验完整结构和逐区域检查后原子写回。它不改逻辑 ID、groups.json、SVG 或未指定的部件。工具说明和 schema 仍在固定的 `shared/tools/` 中。step01 报告记录 part、实际图层名、区域和最终深度的对应；后续步骤与 reviewer 保留这些合法分片。中断和主动重跑均保留上游修正，不恢复旧副本。

raster 保持原有 SDK 的 startThread/resumeThread 与 threadId 记录，通过每次启动的 MCP 配置提供深度工具，不修改全局 Codex 配置。当前 Codex 的 thread/resume 不支持追加 dynamicTools；使用本次调用的 MCP 配置让已有 SDK thread 也能获得工具，无需重建上下文。只有 step01 提供修改工具，其他阶段通过内置工具读文件，reviewer 仍只反馈。原生 image_generation 和外部 provider、鉴权保持原样。

## 检查

```bash
pnpm check
pnpm test
```

测试使用模拟 agent、SDK / App Server 和临时文件，并只读检查仓库已有示例的恢复，覆盖各自 preparation、提示词与参考选择、同层去重、恢复、两轮 review、工具配置及重试。不会运行付费生图或重画已有 KRA。运行数据位于 skill 外，不随 skill 发布；仓库内默认的同级任务目录被 Git 忽略。原 `test` 已改名为 `jianma`，正式成果见仓库的 `demos/jianma/`，逐次 agent 操作保留本地。独立安装不包含 demos，只有对应的归档验收用例会明确跳过。

共享重构的逐模块差异、发现的偏差及新旧调度对照结果见 [差异审计](../docs/shared-refactor-audit.md)。
