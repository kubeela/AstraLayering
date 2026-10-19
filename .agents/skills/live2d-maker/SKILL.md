---
name: live2d-maker
description: 从角色参考图制作适合 Live2D 后续绑定的分层素材，使用 Codex 调度人物和衣服的 part 拆分、遮挡补全及 Krita 栅格绘制，交付可编辑 KRA 与 PNG。用于开始制作、查看进度或续跑这些管线；当前不包含 Cubism 绑定与动画制作。
---

# Live2D Maker

用本 skill 内的 TypeScript 入口执行工作流。人物与衣服共用调度实现，各自保留独立提示词、参考资产和验收要求。交付是分层绘画素材；part 的 SVG 是轮廓控制图，最终绘画由 raster 完成。

## 安装与前置

安装 GitHub 仓库 `wu-tian807/AstraLayering` 中的 `.agents/skills/live2d-maker` **整个目录**；依赖、脚本、提示词和参考图片均已包含，不要只下载本文件。可让 Codex 的 skill 安装器按该仓库路径安装，或自行复制目录到用户的 skills 位置，无需下载 demos 和 archive。使用 skill 安装器时选择 `--method git` 稀疏检出，避免默认 ZIP 下载拉取整个大体积仓库。

定位本 `SKILL.md` 所在目录，以下命令均从这个目录执行：

```bash
cd /安装位置/live2d-maker
pnpm install --frozen-lockfile
```

需要 Node.js 24.12+、pnpm 10.33.0。四条管线共用一次安装。不要把运行任务建在 skill 内。

启动制作前确认：

- Codex 环境已登录或配置 provider，且绘制 agent 可用原生 `image_generation`。默认继承当前 `CODEX_HOME` 或 `~/.codex`；没有该工具时配置外部 Codex 环境，不用直接 Images API 或替代工具改写流程。
- raster 需要已安装的 Krita、可操作的桌面或显示环境，以及用户提供的可执行文件路径。工作流只检查该路径，不下载或搜索安装位置。可运行 `pnpm raster-layering --check-krita --krita /绝对路径/krita` 检查。
- 按需将 [example.env](example.env) 复制为 `.env`，填写模型、provider 或可选生图配置；未配置时沿用默认。shell 同名变量优先。`.env` 位于 skill 根目录，密钥不写入报告或提交。

模型默认：medium 为 `gpt-6.1-sol-xhigh`，high 为 `gpt-6-astra-xhigh`；末尾是思考力度。自定义原生生图服务默认模型为 `gpt-image-2.5-sunburst`。自定义生图及按图片数 compact 需要显式构建可选的 Codex 补丁，见 [构建说明](tools/codex/README.md)；正常启动不会自动下载或构建。

环境变量、图片阈值、临时错误重试和工具配置细节见 [配置与工作流细节](references/workflow-details.md)。

## 运行目录与输入

默认运行根目录是 **skill 上一级**，任务直接放在 `<skill上一级>/<name>/`，没有额外的 `.run`。每个入口可用 `--dir /绝对路径/运行根目录` 覆盖，结果为 `<dir>/<name>/`。`--dir` 指定的是任务集合的根目录，不是当前任务目录。

```text
<运行根目录>/<name>/
├── input/original.*          用户首次原图
├── part-layering/            人物参考、groups、parts、stages、occlusion
├── raster-layering/          run.json、step01～step03
├── clothing-part-layering/   纯衣服参考及衣片分组产物
└── clothing-raster-layering/ run.json、step01～step02
```

绝对输入路径直接使用；相对路径总是从 `<运行根目录>/<name>/` 解析，与 shell 当前目录无关。例如 `--name jianma --dir /data/art --image reference.png` 读取 `/data/art/jianma/reference.png`。`--groups` 与正常任务中的 `--krita` 相对路径遵循同一规则；`.env` 内的配置路径则相对于 skill 根目录。

只有人物 part 首次接收 `--image`。其余入口按同名任务读取确定位置的上游，不需要 `--input`。后续管线和续跑需使用相同的 `--name`，自定义根目录时也要继续传相同 `--dir`。缺少上游时，按报错先执行对应管线，或手动放置文件到提示的具体路径。

## 选择入口

按用户要求选择所需路线；每个入口自己完成内部调度，不自动启动其他入口。

| 入口 | 上游 | 交付与说明 |
| --- | --- | --- |
| [part-layering](part-layering/README.md) | 首次原图 | 参考准备、按层分组、轮廓 review、同层去重、补全、子组分析；最后交付 parts、preview.svg、occlusion.json |
| [raster-layering](raster-layering/README.md) | 同名人物 part | step01 分层补全、step02 边缘修画及 review、step03 去连体服；最终 `step03/character-dressup-base.kra`、同名 PNG、report.md |
| [clothing-part-layering](clothing-part-layering/README.md) | 人物 part 的 `references/simplified-subject.*` | 生成匹配角色身形的纯衣服图，再拆分；独立运动是核心标准，考虑袖口、衣领等前后穿插 |
| [clothing-raster-layering](clothing-raster-layering/README.md) | 同名衣服 part | step01 分层补全、step02 边缘修画及 review；最终 `step02/clothing-soft-edges.kra`、同名 PNG、report.md |

人物路线：

```bash
pnpm part-layering --name jianma --image /绝对路径/角色.png
# part 完成后
pnpm raster-layering --name jianma --krita /绝对路径/krita
```

衣服路线使用同名人物 part 的简化穿衣角色图，不依赖人物 raster 完成：

```bash
pnpm clothing-part-layering --name jianma
# clothing part 完成后
pnpm clothing-raster-layering --name jianma --krita /绝对路径/krita
```

使用自定义根目录时，把 `--dir /绝对路径/运行根目录` 加在上述每条管线命令末尾。命令中的 `pnpm <管线> --dir ...` 是工作流参数；若使用 `pnpm --dir <skill路径> <管线>`，管线名前的 `--dir` 是 pnpm 的工作目录参数，两者含义不同。优先先进入 skill 目录运行，避免混淆。

part 的 `--jobs`（别名 `--agents`）控制全局 agent 调用并发，默认 3；没有另一个组任务并发上限。`--max-depth` 可限制本次制作层数，默认不限制。需要选择已有组续做时使用 `--groups`，具体前置条件见对应 part 文档。raster 的 `--dry-run` 检查输入与 Krita 并展示提示词，不运行模型、不写任务文件。

## 监听、续跑与验收

启动后持续查看该进程的输出。终端工具返回 session ID 或暂时没有输出不代表失败，不重复启动同一个任务。查看阶段文件和日志通报当前进度，等进程的明确退出结果再判断是否完成。

part 依据分组树、SVG、检查记录和输入指纹恢复。每层全部绘制与 review 完成后先同层去重，再补全和分析子组；不要在外部手动另建调度来绕过这个顺序。

raster 的 `run.json` 记录配置和绘制 threadId，步骤进度由 `.running` / `.completed` 决定：

- `.running`：步骤未完成；停止后用同名任务、同一运行根目录续跑，恢复原 thread。该文件不证明进程仍然活着。
- `.completed`：交付检查通过。step02 必须完成 review／修复后才有此标记。
- 用户要求从已完成步骤重做时，删除该步骤的 `.completed`；下次启动会清空该步及后续步骤目录并建立新绘制 thread。不要为普通中断删除完成标记。

每次 reviewer 使用新上下文，只给反馈，修复交给原绘制 thread。最多两次 review，每次反馈都进入修复；无问题直接结束，第二次修完不再 review。review/repair Markdown 记录轮次进度。续跑同时需要原 Codex 环境中的会话历史，只有 threadId 并不足以恢复已丢失的历史。

一个逻辑 part 可以对应多个绘画深度。part 的 `occlusion.json` 用互斥的 `level` 或 `levels: [{ level, region }]` 表达；step01 可按标注或组装中发现的穿插自行拆 KRA 绘画层并精准修正上游 occlusion。保持共同运动物件的连续性，必要时补画；不因此要求回 part 重拆。重跑保留这些上游深度修正。

遵循各管线已有的绘图与验收提示词。不要混用人物与衣服提示词，不因安装或路径变化简化任务。agent 自行编写所需绘图辅助脚本；不能以统计指标代替逐层看图。

模型退出却没有交付时，工作流应报错并展示最后消息和 threadId；raster 还写入 `error.txt` 并保留 `.running`。先根据真实错误修复环境或输入再续跑，不手动伪造完成标记。临时服务错误自动退避重试直到成功或取消；认证、额度、上下文／图片上限和产物校验错误不会盲目重试。

最终给出本次产物的实际路径、完成阶段及报告中未解决的问题。不要把 part 控制图或静态 KRA 宣称为已绑定的 Live2D 模型。
