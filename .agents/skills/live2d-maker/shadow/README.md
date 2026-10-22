# 阴影制作

```sh
pnpm shadow --name jianma --krita /path/to/krita
pnpm shadow --name jianma --shadow-mode normal-depth --krita /path/to/krita
# 总流程透传；首次默认 mask
pnpm start --name jianma --from shadow --to shadow --shadow-mode mask
```

`--dir` 指定运行根目录；输入从 `<dir>/<name>` 的固定产物读取。独立入口省略模式默认 `mask`，总入口续跑省略则沿用保存的模式。首次需要 Krita；续跑复用该分支记录的路径。`--dry-run` 检查输入与提示词，不写任务或调用模型。

| 分支 | 输入 | 交付 |
| --- | --- | --- |
| `mask`（默认） | 组装 KRA / PNG、simplified、人物与衣服分组和遮挡顺序 | `shadow/mask/step01/character-shadowed.kra`、同名 PNG、`shadows.json`、`report.md` |
| `normal-depth` | 组装 KRA / PNG、simplified | `shadow/normal-depth/step01/normal.png`、`depth.png`、`report.md`；检查后发布至 `lighting/normal.png`、`lighting/depth.png` |

只制作随部件运动的投影，褶皱等固有明暗保留。用 simplified 判断实际投影范围，以组装图的位置和尺寸制作。优先复用分件绘制已经去掉投影的底色；残留旧影时仅局部补画新工程。蒙版直接在 Krita 绘制，完整面积一般远大于静帧可见投影，并包含充分运动延伸，按投影物运动设计形变、由受影面裁切；后续可独立修正阴影形状与相位，不强制同一 deformer；本工作流不制作动作关键形。

Krita 阴影采用隔离组和透明度继承，JSON 保存真实 part ID 与最终图层 UUID、跟随／裁切关系。重叠发束优先正常阴影色层，避免叠底重复压暗。KRA 是可编辑素材，`shadows.json` 是供后续绑定消费的关系；它们不是 cmo3/moc3，也不代表已经绑定 deformer。

复用现有 raster runner 的模型调用、日志、thread 与完成标记。两分支有独立 `run.json` 和 `step01/.running` / `.completed`。切换模式只检查对应分支；另一分支不被清空。源 KRA、PNG、simplified、所需结构或提示词改变时，旧分支原样保留到 `<模式>.previous-*`，新建本分支会话。删除某分支 `step01/.completed` 可按既有规则重做该分支。

仅文件存在不代表检查通过：检查原尺寸、KRA 合成与 PNG 一致、真实图层与 part 引用、原生裁切和模式；地图检查原尺寸、深度灰度、原画 alpha。视觉配准、阴影余量和画法仍由绘制 agent 逐图检查并记录，不能把自动尺寸检查当成艺术验收。

只有完整交付后更新 `shadow/selection.json`，角色工作台据此载入最近完成的路线。两套产物共存时，蒙版工程预览不自动叠加旧法线光照；选择法线／深度则使用原组装工程。源输入变化时暂停旧结果，等待对应分支续跑生成。

角色原素材精度保持不变，PNG 无损输出。模型配置使用 `layering_agent_shadow_model`；蒙版不启用生图工具。法线／深度生图设置 `layering_shadow_maps_image_model`，省略复用既有默认生图服务。

正式蒙版方法：`tutorial/live2d-guidance/formal/09-clipped-cast-shadows.md`，依据真实 Milly 裙影／发影、PSD 与 moc3、官方裁切实现；一个来源允许联合裁切到多个受影 part。

教程依据：仓库 `tutorial/live2d-tutorial-text/8.下半身的拆分与制作.txt`、`14.透明，阴影，高光的拆分方式.txt`，正式方法 `tutorial/live2d-guidance/formal/01-lighting-and-depth.md` 和 `08-part-surface-completion.md`。制作原则已完整纳入分支提示词，独立安装不依赖外部教程目录。
