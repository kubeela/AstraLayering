# 四管线共享重构差异审计

基线：重构前 `76330f54`。范围：四条管线的全部 70 个实现 TS 文件、提示词及参考目录、工具定义、测试改动、安装配置，以及已迁移的运行数据。此前的重构提交为 `fe3043ff`，第一轮提示词修正为 `fe2279fe`；本记录包含随后扩大到调度流程的复核。

本次核对同时比较旧人物、旧衣服两份实现与共享实现，不将任意一边直接视为另一边的标准。原先两个 part 实现有 7 个文件存在差异，两个 raster 实现有 4 个文件存在差异，这些差异分别追踪到各自配置或保留的本地代码。

## 之前为什么漏掉

首次抽取同时做了目录迁移、工具定义搬出、差异配置化和措辞调整，审查没有建立逐项差异清单。检查重点落在 Markdown 正文、正常路径与现有测试，漏看了图片说明、运行时追加文字及部分输入边界。新旧测试都能通过的正常场景，不能证明未覆盖的边界仍然一致。

这使“共享实现”被错误扩大成了“统一某些原本不同的规则”，也让少量手工转写发生了删减。以下偏差均不属于用户授权的重构目标，已恢复原约束或修正。

## 找到并修正的偏差

| 范围 | 发生的变化 | 修正 |
| --- | --- | --- |
| 衣服补全参考说明（上一轮） | 抽取时遗漏“不填入人体或相邻衣片” | 恢复完整原句 |
| 人物分组示例（上一轮） | 从正文删除 JSON 示例，没有完整搬入工具说明 | 原示例逐字放入人物专属 `write_groups/description.md`；衣服不加载它 |
| 衣服运行说明（上一轮） | 公共 raster 运行说明多带了人物的 `step03/` 字样 | 运行说明引用本管线步骤目录，不注入其他管线阶段 |
| part 任务名 | 共享路径函数套用了 raster 的严格名称规则，原本合法的 `demo 2`、`_demo` 等被拒绝 | part 恢复原有单目录名规则；raster 保留原有严格规则 |
| 生图服务临时限流 | 新增图片上限正则过宽，将 `image_generation rate limit exceeded`、每分钟图片速率限制判成不可重试 | 区分服务速率限制与单次输入图片数量上限；前者重试，后者报错 |
| 首次分组参数 | `String(subject)` 让 `['other']` 通过检查，可能将数组写入 `groups.json` | 恢复字符串类型检查，在写文件前拒绝非法值 |
| 空 Krita 参数 | 续跑显式传入 `--krita ''` 时，真值判断使它被忽略并沿用旧值 | 先校验显式值；只有未提供参数才读旧配置 |
| 衣服缺失输入提示 | 公共错误文字要求用户提供人物 `part-layering` | 两个 raster 入口分别声明自己的输入管线，缺参及缺 `parts/` 的提示保持对应 |

后五项各有回归用例，在修正前分别复现失败，修正后通过。用例位于 [refactor-regressions.test.ts](../shared/tests/refactor-regressions.test.ts)。

## 保留的已确认改动

- 安装与共享实现集中在 `workflow-next`；四个入口保留。输出为 `.run/<name>/<pipeline>/`，用户相对输入从 `.run/<name>/` 解析，管线内部工件路径仍相对于本管线目录。
- 工具说明与 schema 从固定仓库文件加载；特殊工具可在任务正文点名，参数和调用教程移入工具定义。人物专属示例与衣服的 subject 限制分别保留。
- 首次绘制及返修均可精确修正当前组 note；reviewer 只反馈，不拥有该工具。不得修改其他组、名称、种类或树。
- 人物 part review / 返修同步已确认的纯色色块审查边界，不把纹样、材质和着色缺失作为色块阶段的修复要求。
- raster 接入已有临时服务错误退避，等待 CLI 最终失败再在原 thread 继续。服务重试与视觉 review 轮数分开；不处理额度、认证、上下文或单次输入图片上限，不自动压缩上下文。

## 逐模块检查结果

表中共享路径均相对于 `workflow-next/shared/`；人物和衣服原目录里的同名文件分别对照。

| 旧模块 | 共享位置或保留位置 | 核对结果 |
| --- | --- | --- |
| part `workflow.ts` | `part/workflow.ts` | 队列算法原样；停止派发、等待已开始任务收尾的行为未改 |
| part `layering.ts` | `part/layering.ts` | 仅接入明确的管线配置和参考目录；逐层阶段与依赖条件未改 |
| part `layering-steps.ts` | `part/layering-steps.ts` | 绘制会话按组创建、返修复用、review 后关闭，未改 |
| `groups.ts`、`artifact-facts.ts`、`completion-inputs.ts` | `part/` | 保留树、哈希及实际依赖的恢复规则，传入所属管线参考目录 |
| `artifact-invalidation.ts`、`completion-svg.ts`、`merge-svg.ts` | `part/` | 原样搬迁，未改失效传播、补全合成和最终合并算法 |
| `group-prompts.ts` | `part/group-prompts.ts` | 完整 group ID 特化、缺失时本管线默认回退、不继承祖先参考，未改 |
| 初始分组、绘制、review、补全、子组、去重、深度 agent | `part/` | 使用各自 profile 的正文与图片说明；工具提交、父范围、只读输入、自检及正式发布规则保留；note 权限按约定扩展 |
| `bitmap-tool.ts`、`svg-tools.ts` | `part/` | schema / description 移出；读取范围、裁剪、缩放、SVG 校验与父范围算法未改 |
| `agent-log.ts`、`function-tools.ts` | `codex/` | 原样搬迁 |
| `agents.ts`、`tool-agent.ts` | `codex/` | 接入工具目录、共享默认目录；实际管线调用绑定自己的工作目录，原工具会话恢复机制保留 |
| `agent-runtime.ts` | `codex/agent-runtime.ts` | 并发队列与 5/10/20/40/60 秒退避未改；增加输入图片上限排除，并修正上述服务限流误判 |
| raster `agent.ts` | `raster/agent.ts` | 增加共同临时重试，保留模型、effort、绘制 thread、已生成文件；本地事件保存错误和交付校验错误不作为网络重试 |
| raster `input.ts` | `raster/input.ts` | 自动补 `parts/`、快照清单及解引用复制未改；输入错误提示按管线区分 |
| raster `krita.ts` | `raster/krita.ts` | 原样搬迁；只检查显式路径，不下载安装或搜索 |
| raster `run-store.ts` | `raster/run-store.ts` | 目录入口移出，模型默认值由本管线步骤传入；标记判断、原子发布、重置顺序及 thread 清除规则未改 |
| raster `workflow.ts` | `raster/workflow.ts` | 接入各自步骤、路径和重试日志；顺序执行、前序交付校验、review 接续、完成标记条件保留 |
| raster `review.ts` | `raster/review.ts` | 两个旧实现相同，共享文件原样搬迁 |
| 四个 `run.ts` | 各自入口 + 共享 CLI | 参数、独立 preparation / 步骤选择保留；修正任务名、输入提示与空 Krita 边界 |
| 两个 `steps.ts` | 各自 raster 目录 | 模型、输入文件、交付文件与 reviewer 配置分别保留，无跨管线新增步骤 |
| 两个 `preparation.ts` | 各自 part 目录 | 人物判断/简化/素体与衣服提取保持独立；人物生图适配原样搬到同目录 `preparation-agents.ts` |
| 新 `profiles`、工具配置加载器、共享路径 | 对应本地目录及 `shared/` | 路径显式绑定，工具快照固定于进程；执行校验仍由原 TS 代码负责 |

### 调度与恢复的不变量

- part 每层所有轮廓绘制和 review 完成后，先整层去重，再补全、自检、分析子组；整层结束才开始下一层。
- 默认 agent 并发仍为每次 part 运行 3 个；组任务不另设数量上限，组内步骤按原顺序执行。退避等待不占用执行位置。
- **没有默认强制限深。** 仅显式 `--max-depth N` 暂停本次制作；不传时继续至终止 part。没有新增 4 层、6 层等硬上限。
- 指定分支重做仍遵守前层与祖先完成条件；仅实际变化工件及真实引用者失效。
- raster 人物三步、衣服两步；绘制和返修复用原 thread，每次新的 review 使用新上下文。
- 最多两次 review，第二次反馈修复完成后不再进行第三次 review。原有“同一份反馈仍未修完则继续原 thread”的行为未被重构新增或删除。
- step02 的绘制、review 和修复全部完成后才写 `.completed`。`.running` 中断恢复，删除完成标记才重置该步及其后续目录并清除绘制 thread。
- 删除 review/repair 报告仍从缺失环节接续，保留该步绘画及原 thread；后续步骤失效。重置操作只作用于本管线。

## 核验依据

1. 全部 70 个原实现文件建立对应表，比较各自旧实现和共享实现；测试改动另行检查，未删除或弱化调度、依赖、完成标记等断言。
2. 提示词目录内共 84 个已跟踪文件：70 个原样保留，14 个通用 part Markdown 按上述范围调整。9 份 raster 正文、人物 group 特化与参考清单保持原样；13 条原有参考图说明逐字一致。
3. 16 个工具在两份旧 part 实现中共 31 份 schema，逐项对象比较一致。除已确认变更权限的 `update_group_note`，工具说明保留旧说明并追加迁入的使用说明。
4. 在临时目录分别加载基线与当前代码，以相同模拟 agent 对照运行。两套 part 分别核验限深暂停、续跑、完成后再启动、指定叶分支重建，事件集合、层间顺序约束、节点状态及 SVG 字节哈希一致。
5. 两套 raster 分别核验正常开始和 step02 中断后恢复；继续检查完成后再启动、删除第二份 review、删除 step02 完成标记。新旧调用轨迹、模型、thread、标记状态、前序产物保留与输入快照一致。实际步骤配置的模型及交付清单也分别比较一致。
6. 原锁文件合并后的 63 项包标识及完整性元数据不变，未升级 SDK 或依赖。
7. 原已跟踪示例的 3,545 个文件保留为移动；只有 10 份补全依赖 JSON 的参考路径改为可移植相对路径，其他字段及引用文件哈希保持一致。
8. 修正后全部 **247 项测试通过**，类型检查通过。未启动付费模型、重新生图或修改已有 KRA。

以上证据针对本次重构差异及调度行为；没有用模拟测试宣称真实模型的视觉产出完全等效。已检查的差异中，除明确确认的变更和本记录修正项，未发现额外的调度顺序、并发限制、review 轮数或重置范围变化。

复查入口：

```bash
pnpm --dir workflow-next check
pnpm --dir workflow-next test
git diff 76330f54 -- workflow-next/part-layering/prompts workflow-next/clothing-part-layering/prompts
git diff 76330f54 -- workflow-next/raster-layering/prompts workflow-next/clothing-raster-layering/prompts
```
