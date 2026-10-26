# character-assembly

在人物和衣服 raster 都完成后，用一个绘制 agent 将两份 KRA 组装成穿戴工程，尽可能贴近简化穿衣角色参考。读取 skill 根目录 `.env` 的 `layering_agent_assembly_model`，默认值统一见 [模型方案](../references/model-presets.md)，组装后由绘制者自检。

在 skill 根目录执行：

```bash
pnpm character-assembly --name jianma --krita /绝对路径/krita
# 续跑
pnpm character-assembly --name jianma
# 自定义运行根目录时，首次和续跑均加 --dir
pnpm character-assembly --name jianma --dir /绝对路径/运行根目录 --krita /绝对路径/krita
```

默认任务目录是 `<仓库>/.run/<name>/`，独立安装时为 `<skill上一级>/.run/<name>/`；显式 `--dir` 则使用 `<dir>/<name>/`。本入口只读取同名任务的这三个输入，不复制文件，不自动运行上游：

| 输入 | 任务目录内的位置 |
| --- | --- |
| 人物素体 | `raster-layering/step03/character-dressup-base.kra` |
| 衣服终稿 | `clothing-raster-layering/step02/clothing-soft-edges.kra` |
| 简化穿衣参考 | `part-layering/references/simplified-subject.*`，自动定位 PNG/JPEG/WebP |

缺少文件时，终端给出对应上游命令与手动放置的具体路径。可用完整成果归档作为输入，不要求搬入上游的 agent 会话或状态标记。

[完整绘制提示词](prompts/01-人物与衣服组装.md) 先对照简化穿衣参考，将整套衣装等比缩放、平移到人物的对应位置，再调整穿插与局部贴合。允许在现有图层上局部修画；漏肤或多余外露可用原生可关闭的透明度遮罩处理，保留透纱效果。不随意拆分现有部件或新增绘画层，不覆盖两份输入工程。

agent 的工作目录为 `<任务目录>/character-assembly/`，提示词中明确给出两份 KRA、参考图、Krita 和输出的绝对路径。交付位置：

```text
character-assembly/
├── run.json
└── step01/
    ├── character-assembled.kra
    ├── character-assembled.png
    ├── report.md
    └── .completed
```

报告简述调整、遮罩用途和剩余差异。绘制 agent 负责保存重开、检查图层及合成效果；调度器在交付齐全后写 `.completed`。

复用 raster 的顺序调度、临时错误重试、日志和异常说明。这个入口新建自己的绘制 thread，中断保留 `.running` 并恢复原 thread；已完成时跳过。删除 `step01/.completed` 后重跑会清理组装步骤并重建 thread，保留上游工程。只有一个步骤，不调用第二个绘制者或 reviewer，也不提供上游深度修改工具。

`--dry-run` 检查上游和指定的 Krita、显示本次完整提示词，不调用模型、不写文件。配置与安装见 [SKILL.md](../SKILL.md)。

## 单测本 section

从 skill 根目录运行 `node --test character-assembly/tests/*.test.ts`；单文件可直接指定文件名。测试使用本地模拟，不调用付费模型。
