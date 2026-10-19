# Jianma：四条管线的完整成果结构

原人物任务 `test` 现名为 `jianma`。这里按 `<运行根目录>/<name>/` 的管线目录整理正式成果，保留完整分组树、深度表、所有部件 SVG、阶段 SVG 与检查结论、关键 KRA 和过程图片。逐次观察图、agent 会话、请求响应、提示词副本、操作脚本和临时备份不收录。

人物 part 有 **115 个节点、90 个末端 part**；衣服 part 有 **93 个节点、68 个末端 part**。人物 KRA 为 **90 个绘画层**，衣服 KRA 为 **69 个绘画层**。衣服 preparation 使用的简化角色图与此人物任务的参考图字节一致。

```text
jianma/
├── input/original.jpg
├── part-layering/           # references、groups、parts、stages、occlusion、previews
├── raster-layering/
│   ├── step01/              # 分层与补全
│   ├── step02/              # 边缘修画
│   └── step03/              # 去除连体服的素体
├── clothing-part-layering/  # 纯衣服参考、完整组树、部件与深度
├── clothing-raster-layering/
│   ├── step01/              # 分层与跨深度拆层
│   ├── step02/              # 边缘修画和两轮反馈、修复结论
│   └── images/              # 生图、拆层、修画的代表性过程图片
├── assembled/              # 人物与衣服穿戴合成、交互查看页
└── delivery-sources.json    # 关键工程与合成图的历史出处、SHA-256
```

| 阶段 | 查看成果 |
| --- | --- |
| 人物分件 | [完整阶段预览](part-layering/previews/index.html) · [分组树](part-layering/groups.json) · [深度](part-layering/occlusion.json) |
| 人物分层补全 | [KRA](raster-layering/step01/character-depth.kra) · [PNG](raster-layering/step01/composite.png) |
| 人物边缘修画 | [KRA](raster-layering/step02/character-soft-edges.kra) · [PNG](raster-layering/step02/character-soft-edges.png) |
| 换装素体 | [KRA](raster-layering/step03/character-dressup-base.kra) · [PNG](raster-layering/step03/character-dressup-base.png) |
| 衣服分件 | [参考](clothing-part-layering/references/clothing.png) · [色块 SVG](clothing-part-layering/preview.svg) · [分组树](clothing-part-layering/groups.json) · [深度](clothing-part-layering/occlusion.json) |
| 衣服分层补全 | [KRA](clothing-raster-layering/step01/clothing-depth.kra) · [PNG](clothing-raster-layering/step01/composite.png) |
| 衣服边缘修画 | [KRA](clothing-raster-layering/step02/clothing-soft-edges.kra) · [PNG](clothing-raster-layering/step02/composite.png) |

![衣服参考与最终结果](clothing-raster-layering/images/comparison.png)

这是成果归档。人物 raster 的三个工程来自此前分阶段交付，衣服来自 `live-clothing-20261018`；整理时没有重画、修改 KRA 或伪造统一运行的 threadId、完成标记。为匹配当前输出规范，人物 step02、step03 的文件名已规范化，历史出处和校验值见清单。分散的旧目录已合并到这里：[人物补全](raster-layering/step01/README.md)、[边缘修画](raster-layering/step02/README.md)、[素体](raster-layering/step03/README.md)、[衣服](clothing-raster-layering/README.md)、[穿戴合成](assembled/README.md)。完整 SVG 旧版单独保存在 [jianma-svg-ver](../jianma-svg-ver/readme.md)。

历史检查结论可能引用未收录的逐次观察图或当时机器路径；这些引用只用于追溯，不是当前可运行入口。归档不代表所有美术细节或动画变形已通过验收，既有问题以各阶段报告为准。

本机续跑数据保存在 skill 外同级的任务目录，仓库内默认位置 `.agents/skills/jianma/` 被 Git 完全忽略；也可用 `--dir` 选择外部运行根目录。复制本归档可提供上游输入，但恢复原 raster 上下文仍需本机原有 `run.json`、标记及 Codex 会话；归档不冒充可移植的 agent 会话备份。
