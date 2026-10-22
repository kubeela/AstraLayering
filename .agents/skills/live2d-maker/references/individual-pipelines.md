# 单管线操作与验收

以下命令从 skill 根目录执行。通常使用总入口；只制作指定组、限深或单步调试时读取本页。

独立启动前也按 [安装与前置](setup.md) 检查当前管线依赖。两套 raster 和组装均需要 Krita 及可操作的显示环境；缺少时由 agent 先确认桌面或 headless 方案再安装，并把实际可执行路径传给 CLI。

两套 part 使用 Nano 生图时追加 `--krita /绝对路径/krita`；透明后处理的 Python 模块首次实际使用时自动安装并在运行根目录 `.runtime/` 复用。总入口传递已记录的 Krita 路径。已有参考或显式 `--groups` 续做不重新处理参考。

## 选择入口

按用户要求选择所需路线；每个入口自己完成内部调度，不自动启动其他入口。

| 入口 | 上游 | 交付与说明 |
| --- | --- | --- |
| [part-layering](../part-layering/README.md) | 首次原图 | 参考准备、按层分组、轮廓 review、同层去重、补全、子组分析；最后交付 parts、preview.svg、occlusion.json |
| [raster-layering](../raster-layering/README.md) | 同名人物 part | step01 分层补全、step02 边缘修画及 review、step03 去连体服；最终 `step03/character-dressup-base.kra`、同名 PNG、report.md |
| [clothing-part-layering](../clothing-part-layering/README.md) | 人物 part 的 `references/simplified-subject.*` | 生成匹配角色身形的纯衣服图，再拆分；独立运动是核心标准，考虑袖口、衣领等前后穿插 |
| [clothing-raster-layering](../clothing-raster-layering/README.md) | 同名衣服 part | step01 分层补全、step02 边缘修画及 review；最终 `step02/clothing-soft-edges.kra`、report.md；合成 PNG 按实际导出文件提供，不约定同名文件 |
| [shadow](../shadow/README.md) | 同名组装 KRA / PNG、simplified；蒙版另读取两套 part 结构 | 默认投影蒙版，或 `--shadow-mode normal-depth`；分支独立产物、会话和裁切关系 |
| [character-assembly](../character-assembly/README.md) | 同名人物 raster step03、衣服 raster step02 与简化穿衣参考 | 单个组装 agent 组合两份 KRA，无 reviewer；交付 `step01/character-assembled.kra`、同名 PNG、report.md |

人物路线：

```bash
pnpm part-layering --name jianma --image /绝对路径/角色.png
# 需要姿态标准化时追加 --standard；续跑省略则沿用保存值
# part 完成后
pnpm raster-layering --name jianma --krita /绝对路径/krita
```

新任务的人物 preparation 提供 `references/standard.png`，后续简化和素体从它继续；旧任务缺原图但参考齐全时可先沿用已有参考，兼容规则见[输入、产物与续跑](workflow-details.md#输入产物与续跑)。`--no-standard` 可显式关闭已保存的标准化选项，但已有参考的输入和选项须通过[指纹校验](workflow-details.md#输入产物与续跑)。独立衣服入口不接受标准化选项。

衣服路线使用同名人物 part 的简化穿衣角色图，不依赖人物 raster 完成：

```bash
pnpm clothing-part-layering --name jianma
# clothing part 完成后
pnpm clothing-raster-layering --name jianma --krita /绝对路径/krita
```

人物与衣服 raster 都完成后，可继续穿戴组装：

```bash
pnpm character-assembly --name jianma --krita /绝对路径/krita
```

组装只使用现有分层，允许局部画笔调整和可关闭的原生透明度遮罩；不要把 raster step01 的拆层、改深度权限带入组装阶段。参考图、两份 KRA 和输出位置由入口提供，不覆盖上游工程。

使用自定义根目录时，把 `--dir /绝对路径/运行根目录` 加在上述每条管线命令末尾。命令中的 `pnpm <管线> --dir ...` 是工作流参数；若使用 `pnpm --dir <skill路径> <管线>`，管线名前的 `--dir` 是 pnpm 的工作目录参数，两者含义不同。优先先进入 skill 目录运行，避免混淆。

part 的 `--jobs`（别名 `--agents`）控制全局 agent 调用并发，默认 3；没有另一个组任务并发上限。`--max-depth` 可限制本次制作层数，默认不限制。需要选择已有组续做时使用 `--groups`，具体前置条件见对应 part 文档。raster 和组装入口的 `--dry-run` 检查输入与 Krita 并展示提示词，不运行模型、不写任务文件。

## 监听、续跑与验收

单管线产物也能在[工作台](workbench.md)中展示。沿用同一 `--dir`，核对任务页中的具体子步骤与文件；没有总控记录时不把“已有产物”误报为整条流程已完成。独立 CLI 的进度主要从阶段文件和日志判断。

启动后持续查看该进程的输出。终端工具返回 session ID 或暂时没有输出不代表失败，不重复启动同一个任务。查看阶段文件和日志通报当前进度，等进程的明确退出结果再判断是否完成。

part 依据分组树、SVG、检查记录和输入指纹恢复。每层全部绘制与 review 完成后先同层去重，再补全和分析子组；不要在外部手动另建调度来绕过这个顺序。

raster 与组装的 `run.json` 记录配置和绘制 threadId，步骤进度由 `.running` / `.completed` 决定：

- `.running`：步骤未完成；停止后用同名任务、同一运行根目录续跑，恢复原 thread。该文件不证明进程仍然活着。
- `.completed`：交付检查通过。step02 必须完成 review／修复后才有此标记。
- 用户要求从已完成步骤重做时，删除该步骤的 `.completed`；下次启动会清空该步及后续步骤目录并建立新绘制 thread。不要为普通中断删除完成标记。

两套 raster 的每次 reviewer 使用新上下文，只给反馈，修复交给原绘制 thread。最多两次 review，每次反馈都进入修复；无问题直接结束，第二次修完不再 review。review/repair Markdown 记录轮次进度。续跑同时需要原 Codex 环境中的会话历史，只有 threadId 并不足以恢复已丢失的历史。

一个逻辑 part 可以对应多个绘画深度。part 的 `occlusion.json` 用互斥的 `level` 或 `levels: [{ level, region }]` 表达；人物和衣服 raster 的 step01 可按标注或拼装中发现的穿插自行拆 KRA 绘画层并精准修正上游 occlusion。保持共同运动物件的连续性，必要时补画；不因此要求回 part 重拆。重跑保留这些上游深度修正。

遵循各管线已有的绘图与验收提示词。不要混用人物与衣服提示词，不因安装或路径变化简化任务。agent 自行编写所需绘图辅助脚本；不能以统计指标代替逐层看图。

模型退出却没有交付时，工作流应报错并展示最后消息和 threadId；raster 还写入 `error.txt` 并保留 `.running`。先根据真实错误修复环境或输入再续跑，不手动伪造完成标记。临时服务错误自动退避重试直到成功或取消；认证、额度、上下文／图片上限和产物校验错误不会盲目重试。

最终给出本次产物的实际路径、完成阶段及报告中未解决的问题。不要把 part 控制图或静态 KRA 宣称为已绑定的 Live2D 模型。
