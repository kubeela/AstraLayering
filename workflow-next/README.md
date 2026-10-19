# Layering workflows

四个独立入口共用安装、运行根目录和调度模块。需要 Node 24.12+；Codex 的模型服务、登录及原生 `image_generation` 由外部环境配置。Krita 由调用方显式提供路径，工作流只检查，不下载安装或搜索。

在仓库根目录安装一次：

```bash
pnpm --dir workflow-next install --frozen-lockfile

# 人物：首次输入原图；续跑只传 --name
pnpm --dir workflow-next part-layering --name sample --image /absolute/character.png
pnpm --dir workflow-next raster-layering --name sample --input part-layering --krita /absolute/krita

# 衣服：首次输入简化后的穿衣角色图
pnpm --dir workflow-next clothing-part-layering --name sample --image part-layering/references/simplified-subject.png
pnpm --dir workflow-next clothing-raster-layering --name sample --input clothing-part-layering --krita /absolute/krita

pnpm --dir workflow-next raster-layering --name sample
```

四个目录内的 `pnpm start` 仍是对应入口。人物简化参考如果沿用原图，会保留原扩展名，衣服输入应指向实际文件。

## 输入、产物与续跑

```text
workflow-next/.run/<name>/
├── part-layering/           # references、groups、parts、stages、occlusion
├── raster-layering/         # input、run.json、step01～step03
├── clothing-part-layering/  # 纯衣服 preparation 及衣片分组产物
└── clothing-raster-layering/# input、run.json、step01～step02
```

用户输入的绝对路径直接使用；相对路径统一相对于 `workflow-next/.run/<name>/`，与 shell 当前目录无关。规则也适用于 `--groups` 和正常运行时的 `--krita`。单独 `--check-krita` 无任务名，请提供绝对路径。raster 的 `--input` 可以给 part 管线目录或其 `parts/`；前者自动补上 `parts`。

首次输入保存在各管线内部。raster 仍复制 part 的交接文件到自己的 `input/`，续跑使用保存的输入，保留来源记录。共享目录不自动串联执行其他管线，也不自动更新已经保存的输入副本。各管线自己的工件记录和步骤提示词中的相对路径，以该管线目录为基准。

part 按 SVG、检查报告、输入指纹及分组树恢复，整层绘制与 review 完成后先同层去重，再补全和分析子组。raster 以 `.running`、`.completed` 以及 review/repair Markdown 决定进度，`run.json` 保存配置和绘制 threadId。删除完成标记会重置该步及其后续步骤、重新建立绘制 thread；清理仅发生在本管线目录内。`.running` 表示尚未完成，不代表进程仍在运行。

人物 raster 保留三步，衣服 raster 保留两步，各自交付文件要求不变。第二步完成全部 review/修复后才写 `.completed`。每次 reviewer 使用新上下文，反馈交回原绘制 thread；最多两次 review，第二次反馈修完后结束，不增加第三次 review。续跑仍需要原 Codex 环境保留对应的会话历史。

## 共享实现与独立配置

| 位置 | 职责 |
| --- | --- |
| `shared/part/` | 分组树、SVG、整层调度、去重、依赖恢复及 part agent |
| `shared/raster/` | 输入快照、Krita 检查、顺序步骤、review 和标记恢复 |
| `shared/codex/` | SDK / App Server 适配、日志、工具配置、并发和临时重试 |
| `shared/paths.ts` | 统一任务目录和外部输入路径解析 |
| 各管线目录 | 启动入口、preparation 或步骤定义、提示词和专项配置 |

人物与衣服分别加载自己的提示词。人物原有 `prompts/groups/<完整ID>/` 特化、参考清单、无祖先继承、默认回退及固定操作约定追加规则保留；共享恢复器也使用对应的参考清单。人物额外参考按需读取，衣服继续提供原穿衣角色用于判断穿插和随动。

## 编辑工具说明与 schema

```text
shared/tools/<工具名>/description.md
shared/tools/<工具名>/schema.json
clothing-part-layering/tools/write_groups/schema.json
```

直接修改仓库固定目录中的文件。description 为工具说明，schema 为发送给 Codex 的 JSON Schema。各管线配置的工具目录可按完整文件覆盖公共版本；未提供的文件沿用公共版本。例如衣服首次分组只允许 `subject="other"`，不会更改人物的允许值。没有外部工具目录启动参数。

工具配置在启动时加载并固定，修改文件在下一次启动生效；运行中同一绘制 thread 的工具定义保持一致。实际执行与文件写入校验仍在 TS 中，新增参数或修改执行行为需要同步实现。配置无效会报错。

步骤提示词保留任务目标、方法和验收要求，可以在特殊场景点明工具；参数与调用教程放在工具定义中。此配置只管理工作流注册的函数工具，原生 `image_generation` 仍由外部 Codex 提供。

`update_group_note` 在首次绘制和返修时都可使用：只允许精确修改当前组 note，不改父组、其他组、名称、种类或分组树。reviewer 只提交反馈；修改后的说明交给后续检查和子组分析。

## 临时错误恢复

四套流程使用同一临时错误分类和退避策略。先等待 Codex 自身重连的最终结果，再对服务过载、断流和临时限流按 5、10、20、40、60 秒等待重试，之后每次 60 秒，直到成功或取消。保持原 thread、已有图片和文件，提示 agent 从未完成处继续；不增加视觉 review 轮次。

认证、额度、上下文超限、图片数量上限、输入或工件校验错误不会进入此重试。50 图上限的可选压缩保护，以及多深度 part 配合 raster step01 自行拆层，是后续改进，不包含在本次共享重构中。

## 检查

```bash
pnpm --dir workflow-next check
pnpm --dir workflow-next test
```

测试使用模拟 agent、SDK / App Server 和临时文件，并只读检查仓库已有示例的恢复，覆盖各自 preparation、提示词与参考选择、同层去重、恢复、两轮 review、工具配置及重试。不会运行付费生图或重画已有 KRA。新产生的 `.run/` 请求、会话及中间处理记录保留本地，不提交推送；仓库原已收录的人物示例随目录迁移，保留原有文件。
