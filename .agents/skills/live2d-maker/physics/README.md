# 组件摆动物理

本流程需要同版本的完整 AstraLayering 仓库（含 `web/`）及根工作台依赖，从该 checkout 执行并沿用原 `--dir`；独立安装 skill 的其他制作管线仍可运行。

独立读取同名 `character-assembly/step01/character-assembled.kra`、PNG 和两套 groups，不依赖阴影制作是否完成，不重画皮套。设计与审核方法见 [formal 11](../../../../tutorial/live2d-guidance/formal/11-secondary-physics-workflow.md) 和 [formal 12](../../../../tutorial/live2d-guidance/formal/12-physics-animation-review.md)。

```bash
pnpm physics --name <任务名> --krita <可执行文件> --profile primary
pnpm start --name <任务名> --from physics --to physics --physics-profile primary --background
pnpm start --name <任务名> --physics --physics-profile all --background
```

`--dir` 指定绝对运行根目录。独立入口默认 primary；全局入口默认仍到 shadow，`--physics` 才追加本阶段。all 加入连接有依据的次要自由边和挂件。果冻、身体、眼口及刚性服装不自动绑定；缺乏连接依据的部件明确暂缓。

范围按实际自由段判断。前发、刘海、侧发、后发都要分析，但发盖、发髻、贴头区没有自由连接时保持固定；尾端有依据才开放小幅残差。all 不是“全部头发变软”，也不能因为挂件小就只做布料。短链配硬坠、同一硬环的前后片可共享保形悬摆；只有当前无法表达的真实双端耦合等拓扑才暂缓。

| 步骤 | 产物 | 验证 |
| --- | --- | --- |
| step01 | analysis.json、coverage.json、report.md | 全部源 part 的判断、实际连接、UUID 与组件归属 |
| step02 | physics.draft.json、coverage.json、report.md | 固定多边形、过渡、中心线或布片网格、源像素覆盖、参数与最大约束 |
| step03 | physics.json、findings.json、evidence/manifest.json、report.md | 规范输入、完整轨迹、均匀帧、事件窗、原尺寸局部与实际图像查看 |

通过 step03 才发布 `physics/physics.json`。工作台从项目固定位置自动读取，和颜色、法线、深度、投影共用画布。工作台编辑保存为 `physics/physics.draft.json`，不冒充已完成的视觉复核；导出和项目保存均保留完整作者绑定。默认鼠标仍为移动，只有物理页签选择扰动才施力。复核动画从同一面板选择，支持暂停、单帧和复位。

绑定阶段允许提前模拟，诊断仍保存到 step03/evidence；恢复时保留这些无步骤标记的工具产物和绑定会话，不把它们当作已开始或已完成的视觉复核。证据是否可复用由配置、模拟实现和渲染指纹检查；上游或制作规则变化仍归档旧分支。完整审核坐标与测量版本见 formal 12。

长束使用 psd2live/Cubism 短摆链的角度驱动原画曲线，原画控制点不增加物理节数；布片优先用 `authoring.controlGrid:[4,8]` 规则控制格与 psd2live 移植的非对称拉伸/压缩、面积、旋转弯曲约束，完整轮廓独立作为显示网格，固定边界切入显示网格；硬挂件使用 Inochi2D 非线性摆与 RK4 保持刚性。频率和阻尼控制回落，最大位移按实际自由长度计算；角度、拉伸、压缩、剪切及有向面积限制形变。最终安全回退会记录为 fallback，不能把回退后的合法数值当作自然动画。

多源层可共用一个场，保留层序和原 UV。Krita 隔离组附带成员 UUID 和原像素指纹，含投影的组可对应回原组件；若组中有多个不同运动场，明确报告待整理。当前不支持闭环装配和同一源层的多个独立运动区域，这些部件必须在分析中暂缓。后续支持不能通过伪装成单根绳实现。

恢复复用已有线程、标记和合格产物。来源变化或 profile 扩展保留旧管线，`physics.components-cache.json` 保留已有作者配置；agent 只复用 UUID、像素指纹和支撑均相符的组件，再验证当前装配；当前程序不做逐组件增量执行，参数变化仍重跑九组组合。求解器、输入或配置变化会使旧证据失效，旧证据保存在 step03/backups；仅光照变化可复用数值轨迹，渲染与视觉依据需重新确认。独立物理复核在 source/surface-inputs.json 记录所用法线／深度的来源、文档与像素哈希；上游审核规则变化时保留同文档的冻结预览输入，来源变化明确报错。它不授予阴影流程审核通过；源文档变化时旧快照失效。

中断后若旧会话上下文无法正确接续，先停止当前任务，再从 skill 目录执行 `pnpm start --name <任务名> --dir <运行根目录> --replace-thread physics --handoff <交接.md> --reason <原因>`，随后正常续跑。恢复工具归档旧会话及交接，保留绑定、数值轨迹、贴图和步骤标记；不会批准视觉复核。仅渲染未完成或贴图变化，不应删除同指纹的完整数值轨迹。

分析 version:2 逐 part 保存 `motion:{family,region,freedom}`；family 为 hair/fabric/accessory/other，freedom 为 free/fixed/follow/uncertain。coverage.json 由工具生成，按实际部位列出绑定、固定和暂缓，不由报告自称覆盖完成。all 拒绝 profile-secondary；unsupported-topology 必须说明具体无法表达的连接。制作阶段核对选定 part、UUID 和真实绑定完全相符，不能同名换层。提示词与制作工具的指纹变化会归档旧分析并重新执行；旧工作台草稿仍可预览。

`physics_catalog` 默认提供简明索引，`partIds` 按部位读取完整源 note。`physics_source_image` 的 `uuids` 一批 1–16 层，`physics_view` 一批最多 8 帧，返回带编号的原像素拼图，所有原文件和尺寸保持不变；拼图位置只用于观看，绑定使用原 bounds。分析、制作、复核采用独立上下文。存在每请求图片数量上限时，宿主可用 `ASTRA_PHYSICS_CODEX_PATH` 指定已有补丁 CLI，并用 `ASTRA_PHYSICS_IMAGE_COMPACT_THRESHOLD` 设置图片数整理阈值；沿用其他模型和配置，覆盖只限物理管线，CLI 须通过共享 v2 能力检查。整理历史上下文不缩小纹理，也不删除源图片或复核记录；明确的图片上限错误不能当服务过载无限重试。

复现验收使用只含 assembled、groups 和可选光照输入的独立目录，不复制 physics、组件缓存或完成标记。从 CLI 实际生成后检查同一工作台的前/侧/后发、衣料和挂件响应、固定区、保形及光照；重新运行只验证复用当前指纹的已审核产物。无缓存重做允许作者参数不同，比较的是范围、连接和同一组运动/视觉门槛，而非要求 LLM 输出逐字相同的 JSON。仅导入旧草稿、手调后截一帧或测试数值合法均不算工作流复现通过。

证据由整数 120 Hz 步推进，不由截图耗时推进。9 组输入覆盖静止、末端脉冲、支撑移动与释放、往返、持续输入、极端、组合、轻扫和微风。完整轨迹使用 gzip 无损保存；查询默认返回指标摘要，指定单组件可读取精确完整网格；均匀帧每 100 ms，局部按必看时刻截取；事件窗由模型请求，以 60 Hz 或 120 Hz 加密。颜色与光照用同一工作台渲染器，局部裁切保留源像素尺寸。`physics_view` 和 `physics_strip` 实际返回图片并记录版本，结论引用未经查看或旧版图片时不能发布。AI 只声明所查看帧的覆盖范围，人工复核保持 unreviewed。

```bash
pnpm physics:evidence --name <任务名> --simulate
pnpm physics:evidence --name <任务名> --test tip-impulse --steps 0,60,96,180,360,960
```

以上是证据生成命令。用户预览统一使用 `/studio?project=<任务名>&workspace=physics`，不创建单独试验编辑器。离线采集耗时包含轨迹、图片回读和 PNG 保存，不等于实时帧率。

离线采集默认使用本地软件渲染。已有 GPU 浏览器可通过 `ASTRA_PHYSICS_RENDER_CDP_URL` 连接，并用 `ASTRA_PHYSICS_RENDER_PORT` 指定经隧道转发到该浏览器的本地工具端口；服务器仍只监听 loopback。每次采集创建并关闭独立浏览器上下文，保留外部浏览器已有页面。manifest 记录实际渲染设备；仍使用工作台 shader、原尺寸贴图及完整规范输入；证据渲染直接读取完整记录网格，实时求解一致性独立验证，见 formal 12。

源 UV 由像素位置减去插值位移重建，避免细三角形丢失采样精度；共享边的切分点传播到邻面，避免透明缝隙；每层用 stencil 保证半透明像素只合成一次，避免细边重复叠加 alpha。动态投影按登记 caster 外推位移，并用 receiver 当前 alpha 裁切；这是二维素材跟随，不重算投影几何。

规范输入 v3 以整角色刚性父姿态牵动支撑，静态父层、物理固定区和投影使用同一 sourcePose；不假装已经制作头／身体九轴。输出帧在原像素比例之外增加固定运动余量，framePadding 记录原图起点，避免衣片出界裁掉；法线／深度同样保留原纹理精度。

真实源码、许可证及适配范围见 [vendor/README](../../../../web/studio/vendor/README.md)。数值复核除越界外还拒收弱响应、长期回退/顶限、跳变和不衰减；通过这些门槛仍须检查连续画面，不自动标为视觉 accepted。

刚性挂件可设置 `response.outputFrequencyHz`（0.15–6 Hz），在工作台显示为“角度过渡”：低值让显示角度更平缓，物理回弹仍由 `frequencyHz` 和阻尼控制。未设置时沿用原 `frequencyHz`，保留旧配置行为。它只调整现有有界输出的过渡，不覆盖 Inochi 物理状态、改变最大摆角或降低贴图精度；串联下游会读取这个真实显示挂点，必须重新验证整条链。配置和实现指纹变化后重跑九组及真实视觉，不能复用旧版通过结论。
