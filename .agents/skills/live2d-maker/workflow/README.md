# 总流程、工作台与恢复

常规参数和 section 导航见 [SKILL.md](../SKILL.md)。从实际安装的 skill 根目录执行；新用户在完整仓库中可双击启动文件，再通过前端制作，见[项目首页](../../../../readme.md)。

## 总入口

```sh
pnpm start --name jianma --image /绝对路径/角色.png --krita /绝对路径/krita --background
pnpm start --name jianma --status --json
pnpm start --name jianma --background
```

自定义运行根目录时，每次追加 `--dir /绝对路径/运行根目录`。完整仓库默认 `<仓库>/.run`，独立安装默认 `<skill上一级>/.run`。任务是根目录下一层的 `<name>/`；所有相对输入（包括 image、groups、krita 和 handoff）从任务目录解析。数据不得放在 skill 内。

总控按人物 part、人物 raster、衣服 part、衣服 raster、组装、阴影顺序执行；`--from`／`--to` 选择连续范围并保存，后续阶段自动推进。`--jobs` 仅控制 part 实际 agent 并发，默认 3。已有两份 KRA 与简化参考时可从组装开始，不伪造上游完成记录。

后台返回启动确认后仍需查询状态与日志，Codex 补丁可能仍在准备。新任务或只有成果的旧任务没有总控 `run.json` 时，`--status` 报缺记录；按实际输入和范围首次启动即可。先核实活跃进程与锁，不能同时从 CLI、网页或独立 section 启动同一任务。

### 姿态与参考

新任务确认 `--standard`，默认关闭：直接复制原图；开启后先判断再按需生图，均输出 `part-layering/references/standard.png`。首次原图另存 `input/original.*`。选项保存在总控与 `part-layering/preparation/step02/options.json`，续跑省略则沿用；`--no-standard` 显式关闭。已完成的参考改变选项前，需要对 preparation 的 options 步骤重试，后续依赖参考随之重做。

默认换装范围是主体衣装；手套、袜类、鞋靴和其自身装饰随人物保留。人物素体使用临时连体服，raster step03 去除；衣服 preparation 同时读取简化穿衣图和素体图，提取互补衣装。整套衣装的大小与位置由组装适配。

参考和产物按内容指纹复用，提示词更新不会自动重绘。旧任务只有已合格参考时可沿用；若旧记录含尺寸／摘要则须匹配。已完成步骤的产物被替换时拒绝直接续跑并保留文件，不用归档副本猜补。生成参考的透明处理、等比缩放和留档规则见 [shared](../shared/README.md#参考图后处理)。

## 生效配置核对

```sh
pnpm env:check
```

从实际执行的 skill、原启动环境核对 `.env` 和 shell 覆盖。命令只读显示模型、力度、生图、CLI、配置路径、图片数／字节预算和是否填写 API；`providers` 展示连接来源、地址、协议和可用模型列表，不输出密钥，也不验证登录或工具可用性。首次环境与真实工具验证见 [setup](../references/setup.md) 和 [shared](../shared/README.md#启动验证)。

网页启动使用工作台 checkout 内的 skill 和服务环境；CLI 使用原入口环境。修改 `.env` 后，新进程会读取配置；已运行的总调度或请求不热更新，需先停止再继续。不要用另一份 checkout 的预览值证明当前任务已生效。

模型职责与覆盖顺序见 [模型配置](../references/model-presets.md)。保留用户已有 provider、CLI、CODEX_HOME、显示环境与图片预算。Codex 补丁自动准备与容量保护见 [patches](../patches/README.md)；不能仅凭二进制存在认定保护开启。把实际路径、非敏感启用值、必要 shell 覆盖记入 `monitor.md`。

## 输入、产物与续跑

```text
<dir>/<name>/
├── run.json                  # 总控配置、PID、进度、错误与最近消息
├── workflow.log              # 调度、agent 和网关的唯一主日志
├── monitor.md                # 宿主定时信息、操作环境与巡检记录
├── input/
├── part-layering/
├── raster-layering/           # step01～03
├── clothing-part-layering/
├── clothing-raster-layering/  # step01～02
├── character-assembly/        # step01
└── shadow/                   # mask/ 与 normal-depth/ 独立恢复
```

请求目录继续保留 `prompt.md`、`request.json`、`events.jsonl`、`result.json` 和会话记录。旧后台可能仍写 `service.log`，按状态返回的真实日志路径查看；新请求统一进 `workflow.log`，不新增永久 native/transcript 日志。

section 的事实文件决定恢复，总控只是摘要。`.running` 表示尚未交付，不证明进程存活；`.completed` 表示交付检查通过。普通中断用相同入口、name、dir 恢复原会话。**删除 `.completed` 是主动重做，会清空该步及依赖步骤并重建会话**，不要把它当成普通续跑。

part 逐层进行轮廓与复核、同层去重、补全和直属拆分；每层全部结束再进下一层。raster step01 的结构修正持久写回上游，已进入 raster 的总控续跑不会再用旧 part 事实覆盖它；明确只选 part 仍执行该 section。

两套 raster 与 part 的正式质量 review 最多两轮，每次 reviewer 使用新上下文；反馈回原绘制会话，第二次修完不做第三轮。临时服务重试不消耗 review 轮数。文件检查不能代替逐层看图；不伪造完成标记或改写报告为通过。

## 工作台启动与连接

CLI、HTTP 服务和宿主巡检独立运行。先读 `monitor.md` 复用服务，核对 `GET <根URL>/healthz` 返回 `status: ok`、`application: astra-layering`、`mode: workbench`，再核对 `api/settings` 的运行根目录。

完整仓库可双击根目录的 `start-workbench.command`／`.sh`／`.cmd`；agent 也可在仓库根目录以持续后台方式运行 `pnpm web`，默认 4387，`--port 4388` 可换端口。`pnpm web` 不接受任务的 `--name`／`--dir`。

独立 skill 不包含网页；没有已有服务时，在 skill 外准备匹配版本的工作台，避免下载 demos/archive：

```sh
git clone --filter=blob:none --sparse https://github.com/wu-tian807/AstraLayering.git /安装位置/AstraLayering-web
cd /安装位置/AstraLayering-web
git sparse-checkout set web .agents/skills/live2d-maker
pnpm install --frozen-lockfile
pnpm web
```

网页只浏览产物时不需要模型凭据；从网页启动则使用网页 checkout 内的 skill，需要其 `.env`、原 thread 历史和 Krita 显示环境。补齐网页不替换执行中的 skill，也不搬任务；原 CLI 续跑仍从原安装执行。

在页面“工作目录”选择与 CLI `--dir` 相同的根目录。程序连接先读 `GET api/settings`，再 `POST api/settings`，JSON 为 `{ "dir": "刚读取的旧目录", "directory": "目标运行根目录" }`；此设置为实例共享，不能擅自改掉无关服务。`?dir=` 不会改变设置。两个不同目录需要独立 checkout 和服务，只改端口仍共用设置。

打开 `<根URL>/?name=<编码后的name>` 并检查实际选中任务与目录；再打开一项真实产物，或展示真实等待状态。流程定位 `?name=<name>&page=preview&stage=0`，stage 为 0..5。角色预览是 `studio?project=<name>`，只消费该任务的组装、阴影与 lighting 输出，不从其他案例猜贴图。

服务只监听本机，远程需使用已有转发／部署入口，不能把远端 localhost 当作用户地址。浏览器能力可用时打开并核对页面；不可用时给链接并说明。页面故障不重置绘图。关闭网页不停止制作；网页“停止”只控制网页 worker 启动的任务，CLI 任务需停止原进程及子进程。完整 UI、原生合成器的 Krita／Xvfb 环境与部署见工作台 checkout 的 `web/README.md`。

## 定时巡检

使用宿主实际提供的定时工具，每 2 小时检查，持续到所选路线完成或用户取消；先核对已有定时记录，避免重复。创建成功后记录实际定时 ID、skill 版本／绝对路径、任务名／绝对路径、范围、启动方式、CLI 与 Krita 显示环境、工作台 URL／checkout／追踪目录和恢复命令到 `monitor.md`，不记录密钥。

宿主无定时能力时明确说明，不自行安装 cron 等替代方案。后台总调度仍可推进。

每次检查：

1. 运行 `--status --json`，结合 `run.json`、`workflow.log`、当前报告和错误判断阶段；独立 section 无总控时沿用独立进程和事实记录。
2. 核对实际进程身份、子进程和日志；固定沉默时长、`.running` 或仅 PID 存活均不足以认定卡死。正常或自动退避中的任务不重复启动。
3. 失败时检查最后消息、会话与已保存产物，修复可恢复的环境／输入问题后以原入口、范围、name、dir 续跑。不能只记录故障后等待。
4. 追加发现、动作与结果到 `monitor.md`；只在有实质变化、故障、完成或需用户操作时通知，正常无变化保持安静。另检查网页仍连接同一任务。
5. 完成时核对文件并交付，取消时核实身份后停止本任务及子进程；关闭本任务定时检查，保留产物和共享工作台。

活跃锁冲突先核实进程，不直接删锁；意外退出后锁约 30 秒过期。独立入口不受总控锁保护，不得并跑。

## 故障恢复

| 情况 | 操作 |
| --- | --- |
| 网络断流、服务过载、临时限流 | CLI 自身重试结束后，工作流按 5、10、20、40、60 秒退避，随后每 60 秒重试直到成功或取消；保留原会话与文件 |
| 鉴权、额度、上下文／图片／字节超限、输入校验 | 查看实际错误后修复；不重复发送原请求。容量保护与本地模拟见 [patches](../patches/README.md#图片容量保护) |
| Krita 或操作能力不可用 | 复用记录环境，按 [setup](../references/setup.md) 修复；已有安装确认沿用，缺少必要确认时不擅自改方案 |
| 模型正常退出却无交付 | 查看最后消息、threadId、步骤 `error.txt`；保留 `.running`，修正工具／输入后续跑 |
| 需要重做正式 review／repair | 先归档原报告和原因，再让原调度接续；不增加第三轮 review |
| 网页断开 | 单独恢复网页，保持绘图记录；不能因此重置工程 |

Codex 泛化断流先读日志“错误详情”与请求 `result.json`，区分 API、代理和 CLI，不能直接推断网络或容量；AGV 的响应头期限、MINIMAL 兼容与 LiteLLM 透传均见 [patches](../patches/README.md)。

### 保留产物地换绘制会话

仅限已停止且原会话确实无法继续的 raster、组装或阴影任务；普通中断优先原会话。先写交接说明：故障证据、旧 threadId、当前工程、未完成项／反馈、必要路径与下一步。

```sh
pnpm start --name jianma --dir /绝对路径/运行根目录 --replace-thread clothing-raster-layering --handoff recovery-notes.md --reason "会话历史无法恢复"
pnpm start --name jianma --dir /绝对路径/运行根目录 --background
```

替换命令只准备交接，在该 section 的 `recovery/<id>/` 归档旧配置、交接和将覆盖的提示词／报告，保留 KRA、日志、完成与未完成标记及审核进度；之后另行续跑，新会话同时接收原任务、交接及当前反馈。part 不使用此接口。阴影需总控明确保存的 shadowMode，只替换该分支。

网页“恢复”直接清除会话、保留产物，不写交接；“重试”会删除该步骤及依赖产物，需按 UI 确认。主动重做和保留产物换会话是不同操作。

## 交付与单测

最终文件位置由各 section README 约定，核对实际文件，特别是衣服 PNG 按实际导出位置提供。阴影默认交付 `shadow/mask/step01/character-shadowed.kra` 与 PNG；normal-depth 交付贴图并发布 `lighting/`。成果是静态素材，不能声称已完成绑定。

```sh
node --test workflow/tests/*.test.ts
```

使用本地模拟与临时文件，覆盖后台、锁、范围、状态、步骤操作及会话交接；不调用付费模型。
