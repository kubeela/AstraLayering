# 组件摆动物理

本流程需要同版本的完整 AstraLayering 仓库（含 `web/`）及根工作台依赖，从该 checkout 执行并沿用原 `--dir`；独立安装 skill 的其他制作管线仍可运行。

独立读取同名 `character-assembly/step01/character-assembled.kra`、PNG 和两套 groups，不依赖阴影制作是否完成，不重画皮套。设计与审核方法见 [formal 11](../../../../tutorial/live2d-guidance/formal/11-secondary-physics-workflow.md) 和 [formal 12](../../../../tutorial/live2d-guidance/formal/12-physics-animation-review.md)。

```bash
pnpm physics --name <任务名> --krita <可执行文件> --profile primary
pnpm start --name <任务名> --from physics --to physics --physics-profile primary --background
pnpm start --name <任务名> --physics --physics-profile all --background
```

`--dir` 指定绝对运行根目录。独立入口默认 primary；全局入口默认仍到 shadow，`--physics` 才追加本阶段。all 加入连接有依据的次要自由边和挂件。果冻、身体、眼口及刚性服装不自动绑定；缺乏连接依据的部件明确暂缓。

| 步骤 | 产物 | 验证 |
| --- | --- | --- |
| step01 | analysis.json、report.md | 全部源 part 的判断、实际连接、UUID 与组件归属 |
| step02 | physics.draft.json、report.md | 固定多边形、过渡、中心线或布片网格、源像素覆盖、参数与最大约束 |
| step03 | physics.json、findings.json、evidence/manifest.json、report.md | 规范输入、完整轨迹、均匀帧、事件窗、原尺寸局部与实际图像查看 |

通过 step03 才发布 `physics/physics.json`。工作台从项目固定位置自动读取，和颜色、法线、深度、投影共用画布。工作台编辑保存为 `physics/physics.draft.json`，不冒充已完成的视觉复核；导出和项目保存均保留完整作者绑定。默认鼠标仍为移动，只有物理页签选择扰动才施力。复核动画从同一面板选择，支持暂停、单帧和复位。

长束使用 psd2live/Cubism 短摆链的角度驱动原画曲线，原画控制点不增加物理节数；布片优先用 `authoring.controlGrid:[4,8]` 规则控制格与 psd2live 移植的非对称拉伸/压缩、面积、旋转弯曲约束，完整轮廓独立作为显示网格，固定边界切入显示网格；硬挂件使用 Inochi2D 非线性摆与 RK4 保持刚性。频率和阻尼控制回落，最大位移按实际自由长度计算；角度、拉伸、压缩、剪切及有向面积限制形变。最终安全回退会记录为 fallback，不能把回退后的合法数值当作自然动画。

多源层可共用一个场，保留层序和原 UV。Krita 隔离组附带成员 UUID 和原像素指纹，含投影的组可对应回原组件；若组中有多个不同运动场，明确报告待整理。当前不支持闭环装配和同一源层的多个独立运动区域，这些部件必须在分析中暂缓。后续支持不能通过伪装成单根绳实现。

恢复复用已有线程、标记和合格产物。来源变化或 profile 扩展保留旧管线，`physics.components-cache.json` 保留已有作者配置；agent 只复用 UUID、像素指纹和支撑均相符的组件，再验证当前装配；当前程序不做逐组件增量执行，参数变化仍重跑九组组合。求解器、输入或配置变化会使旧证据失效，旧证据保存在 step03/backups；仅光照变化可复用数值轨迹，渲染与视觉依据需重新确认。

证据由整数 120 Hz 步推进，不由截图耗时推进。9 组输入覆盖静止、末端脉冲、支撑移动与释放、往返、持续输入、极端、组合、轻扫和微风。完整轨迹使用 gzip 无损保存；查询默认返回指标摘要，指定单组件可读取精确完整网格；均匀帧每 100 ms，局部按必看时刻截取；事件窗由模型请求，以 60 Hz 或 120 Hz 加密。颜色与光照用同一工作台渲染器，局部裁切保留源像素尺寸。`physics_view` 和 `physics_strip` 实际返回图片并记录版本，结论引用未经查看或旧版图片时不能发布。AI 只声明所查看帧的覆盖范围，人工复核保持 unreviewed。

```bash
pnpm physics:evidence --name <任务名> --simulate
pnpm physics:evidence --name <任务名> --test tip-impulse --steps 0,60,96,180,360,960
```

以上是证据生成命令。用户预览统一使用 `/studio?project=<任务名>&workspace=physics`，不创建单独试验编辑器。离线采集耗时包含轨迹、图片回读和 PNG 保存，不等于实时帧率。

源 UV 由像素位置减去插值位移重建，避免细三角形丢失采样精度；共享边的切分点传播到邻面，避免透明缝隙；每层用 stencil 保证半透明像素只合成一次，避免细边重复叠加 alpha。动态投影按登记 caster 外推位移，并用 receiver 当前 alpha 裁切；这是二维素材跟随，不重算投影几何。

规范输入 v2 以整角色刚性父姿态牵动支撑，静态父层、物理固定区和投影使用同一 sourcePose；不假装已经制作头／身体九轴。输出帧在原像素比例之外增加固定运动余量，framePadding 记录原图起点，避免衣片出界裁掉；法线／深度同样保留原纹理精度。

真实源码、许可证及适配范围见 [vendor/README](../../../../web/studio/vendor/README.md)。数值复核除越界外还拒收弱响应、长期回退/顶限、跳变和不衰减；通过这些门槛仍须检查连续画面，不自动标为视觉 accepted。
