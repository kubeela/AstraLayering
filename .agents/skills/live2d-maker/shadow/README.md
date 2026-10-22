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
| `mask`（默认） | 组装 KRA / PNG、simplified、人物与衣服分组和遮挡顺序 | `shadow/mask/step01/character-shadowed.kra`、同名 PNG、`shadows.json`、`report.md`、`inspection.json` 与检查图 |
| `normal-depth` | 组装 KRA / PNG、simplified | `shadow/normal-depth/step01/normal.png`、`depth.png`、`report.md`；检查后发布至 `lighting/normal.png`、`lighting/depth.png` |

只制作随部件运动的投影，褶皱等固有明暗保留。用 simplified 判断实际投影范围，以组装图的位置和尺寸制作。优先复用分件绘制已经去掉投影的底色；残留旧影时仅局部补画新工程。蒙版直接在 Krita 绘制，完整面积一般远大于静帧可见投影，并包含充分运动延伸，按投影物运动设计形变、由受影面裁切；后续可独立修正阴影形状与相位，不强制同一 deformer；本工作流不制作动作关键形。

Krita 阴影采用隔离组和透明度继承，JSON 保存真实 part ID 与最终图层 UUID、跟随／裁切关系。重叠发束优先正常阴影色层，避免叠底重复压暗。KRA 是可编辑素材，`shadows.json` 是供后续绑定消费的关系；它们不是 cmo3/moc3，也不代表已经绑定 deformer。

复用现有 raster runner 的模型调用、日志、thread 与完成标记。两分支有独立 `run.json` 和 `step01/.running` / `.completed`。切换模式只检查对应分支；另一分支不被清空。源 KRA、PNG、simplified、所需结构、提示词或该分支制作参考／检查代码改变时，旧分支原样保留到 `<模式>.previous-*`，新建本分支会话。删除某分支 `step01/.completed` 可按既有规则重做该分支。

仅文件存在不代表检查通过：检查原尺寸、KRA 合成与 PNG 一致、真实图层与 part 引用、原生裁切和模式；地图检查原尺寸、深度灰度、原画 alpha。每次新制作和续跑都会校验原生检查指纹；工程、关系或检查图改变时，重新在独立 Krita 进程中检查。绘制 agent 仍需逐图评估画法和余量，不能用像素计数替代艺术验收。

只有完整交付后更新 `shadow/selection.json`，角色工作台默认载入最近完成的路线。两套产物共存时，可显式选择混合预览：蒙版 KRA 加原组装生成的法线／深度。工作台分别核对两分支的 `step01/source.json` 与当前源工程，不把不匹配的旧结果混合；预览选择不改变制作参数。源输入变化时暂停旧结果，等待对应分支续跑生成。

角色原素材精度保持不变，PNG 无损输出。模型配置使用 `layering_agent_shadow_model`；蒙版不启用生图工具。法线／深度生图设置 `layering_shadow_maps_image_model`，省略复用既有默认生图服务。

正式蒙版方法：`tutorial/live2d-guidance/formal/09-clipped-cast-shadows.md`，依据真实 Milly 裙影／发影、PSD 与 moc3、官方裁切实现；一个来源允许联合裁切到多个受影 part。

教程依据：仓库 `tutorial/live2d-tutorial-text/8.下半身的拆分与制作.txt`、`14.透明，阴影，高光的拆分方式.txt`，正式方法 `tutorial/live2d-guidance/formal/01-lighting-and-depth.md` 和 `08-part-surface-completion.md`。制作要求由短提示词和随任务复制的参考文件共同提供，独立安装不依赖外部教程目录。

## 制作参考与原生检查

开工前生成 `references/inputs.json`：真实 part、单深度／多深度区域、KRA UUID 和明确的名称归属。未匹配的层仍需查看像素确认。随后复制 [制作格式](references/production.md)、[裙影示意](references/skirt.png) 与 [发影示意](references/hair.png)。两图是依据原模型结构绘制的原创示意，不再分发模型原画。

保存后使用运行提示提供的命令，或在 skill 根目录执行：

```sh
node shadow/inspect.ts --output /path/to/shadow/mask/step01 --krita /path/to/krita
```

`shadows.json` v2 必须为每处影层声明 `testOffsets`（原画像素，含复位与非零偏移）与依据。完整影层没有裁切外像素只提示复核，不按固定面积倍率拒绝；空影层、错误归属、错误原生结构与越界新增 alpha 阻止完成。

固定检查程序在独立设置与临时目录中打开保存工程，不保存修改；导出去影对照、完整影层、联合接收面和全部相对偏移。Linux 沿用可用显示环境，没有 DISPLAY 时启动并清理自己的 Xvfb；需安装 Krita Python 插件和 Xvfb。不转换工程色深，目前原始像素检查支持 RGBA U8。其他色深明确报错，不压缩素材以绕过检查。

私有运行目录使用短系统临时路径和 `0700` 权限；Krita 退出通过 `file_quit` 动作请求。启动警告、插件执行结果与进程退出是不同检查项；`Krita.instance().quit()` 不属于本次实测 Krita 5.3.4.1 的 Python API。Jianma 从头测试及环境问题见仓库 `tutorial/live2d-guidance/formal/sources/jianma-shadow-fresh-run.md`。

工作台阴影栏目提供参考图、去影对照、逐处余量拼图和检查记录；拼图只供比较，记录中的完整 PNG 保持原分辨率。此检查覆盖素材与原生裁切，尚不验证实际 deformer／物理动画或 Cubism 导出。
