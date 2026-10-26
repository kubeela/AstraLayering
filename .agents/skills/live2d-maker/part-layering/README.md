# 人物分件与遮挡补全

从参考图准备标准参考、简化图和换装素体，逐层生成部件控制 SVG 与遮挡深度表，交给 [raster-layering](../raster-layering/README.md) 绘制 KRA。模型与默认力度统一见 [模型方案](../references/model-presets.md)，首次安装见 [setup](../references/setup.md)。

## 单独运行本 section

从 skill 根目录执行，数据位于 `<dir>/<name>/part-layering/`：

```sh
pnpm part-layering --name my-character --image /绝对路径/角色.png
# 姿态标准化按需追加 --standard；续跑省略则沿用保存值
pnpm part-layering --name my-character
# 只处理根层，登记下一层
pnpm part-layering --name my-character --max-depth 1
# 选择已有组及后代，需已有参考、祖先与前层成果
pnpm part-layering --name my-character --groups /绝对路径/selection.json
```

`--dir` 为运行根目录，相对输入从 `<dir>/<name>/` 解析。`--jobs`／`-j`（别名 `--agents`／`-a`）控制全局实际 agent 并发，默认 3。`--max-depth` 从根深度 0 计数，1 制作根层，2 制作至第二层；省略则处理完整树。`--groups` JSON 按 ID 选择本任务已有组，沿用准备参考与前置事实；前层去重尚未完成时需要完整处理该层。独立调试先停止同任务总调度。

## 参考准备

输出 `references/standard.png`、`simplified-subject.*`、`base-subject.png`。标准化选项默认关闭，开启后先判断姿态再按需调整；原图保留在任务 `input/`。素体保留手套、鞋袜和各自饰件，主体衣装以临时连体服替换。步骤目录按 preparation/step01～08 记录原图、选项、姿态、标准图、简化、素体与就绪；step05 为已退场的独立画风判断，其他步骤沿用原编号。

简化与素体各由一个 preparation agent 完成“判断 → 复制或生图”。图1已符合目标画风时，简化 agent 直接复用；当前画幅没有主体衣装、角色已是素体或已有合适的临时连体服时，素体 agent 直接复用。复制工具绑定当前参考与输出位置，PNG 原样复制；需要转换或换装时调用本步骤配置的生图工具。两份完整提示词为 `prompts/2-简化图片.md`、`prompts/3-素体参考.md`。

step06 与 step07 各自直接保存最终图片及步骤完成记录，选择理由保存在 agent 调用日志。复制结果原样交付，生图结果在准备函数内部完成后处理；续跑依据已有图片与步骤记录复用。旧任务已完成的图片继续沿用，缺图时按当前单次 agent 流程制作。

参考与选项按内容指纹复用；主动改变选项或重做参考的规则见 [workflow](../workflow/README.md#姿态与参考)。生成图后处理见 [shared](../shared/README.md#参考图后处理)。

## 逐层制作

第一层按角色需要识别 face、hair、head_accessories、neck、body、arms、pelvis、legs；face 的范围为脸型和耳朵。完整树同深度的节点构成一层，固定本层名单后依次进行：

1. 各组轮廓绘制、自检、独立 review 与返修。
2. 全层轮廓结束后统一去重。
3. 各组直接遮挡补全、自检与直属 group／part 拆分。
4. 本层全部完成后，收集子组进入下一层。

轮廓使用纯矢量色块，对照原图可见形体、开口、可靠边缘和联合覆盖；完整位于父底形内的纹样可留给下层。`write_outline_svg` 绑定指定草稿，`preview_svg` 提供独显、blend、edge 与局部观察。`read_svg` 仅开放本轮绑定源文件，支持带哈希分页；几何读取与视觉核对分别完成。

子轮廓受父完成范围约束。父内可修缺漏返修；贴父边界且需扩大父才能恢复的区域，在反馈记录上游证据，并按当前有效范围验收。`update_group_note` 可精确修正本组职责说明，reviewer 负责反馈，绘制者负责修改。

同组绘制和返修共用会话，每次 reviewer 使用独立只读上下文。最多两轮正式质量审核，提前通过可结束，第二轮反馈修复完成后进入下一步。原 verdict 与 repairedCandidateHash 保留；服务重试和执行受阻单独记录，质量轮数跨启动累计。

## 去重、补全与拆分

去重确认同一实体、同一控制职责被重复领取后，保留一个完整归属，清理其他副本。独立运动层、隐藏根部和合理接缝允许投影重叠；证据不足时保留并记录疑点。修改件经 `write_reduction_svg`、重新预览和 `submit_reduction` 发布，其他组原字节保留。单组层直接复制。去重清空的重复件由程序发布空结果；原本完全遮挡的节点照常补全。

补全在保留已有 SVG 正文、属性和顺序的基础上，用 `set_completion_paths` 增加直接遮挡下的闭合结构，经独显／blend 自检后 `submit_completion`。脸部补完整脸型与双耳，后发补正面联合范围；辅助图用于理解结构，已有路径保护由发布校验执行。

直属拆分基于独立运动、变形、透视、绘制顺序、显隐与剪贴职责，`submit_children` 保存唯一直属结果到 step03/children.json。group 可继续拆分，part 到此终止；空子列表表示当前组本身是最终单元。各节点的 note 记录职责与跨深度区域，固定纹样随所属结构保留。手掌与五根完整手指、左右手臂、合理发根与完整发面等先验来自对应 prompts，按实际角色决定节点和深度。

### 提示词与专项参考

通用正文位于 `prompts/4`～`11`。`prompts/groups/<完整ID>/outline.md`、`review.md`、`completion.md`、`children.md` 可完整覆盖对应正文，只对当前 ID 生效。补全和拆分各自始终带 `9-补全操作约定.md`、`10-拆分操作约定.md`；动态输入填入模板声明的占位符，维护规则见 [shared](../shared/README.md#提示词模板与动态位置)。

`completion.references.json`／`children.references.json` 显式列出 path、description，相对路径从清单目录解析，只开放所列文件。模型按需要观察；配置文件缺图会报告具体路径。参考素材来源和准备要求保留在对应素材目录的 README。

## 输出与恢复

| 步骤 | 产物／事实位置 |
| --- | --- |
| 首次分组 | `initial/step01/groups.json` |
| 轮廓与复核 | `groups/<id>/step01/outline.svg`、`review.json`、`outline.repairs/`、`session.json` |
| 同层去重 | `layers/depthNN/<id>.svg` |
| 补全与检查 | `groups/<id>/step02/check.json`、`session.json`；正式 `parts/<id>.svg` |
| 直属拆分 | `groups/<id>/step03/children.json` |
| 整树合并 | `merge/`；正式 `preview.svg` |
| 深度与逐件检查 | `occlusion/`；正式 `occlusion.json` |

子组目录嵌套为 `groups/<父>/children/<名>`。步骤使用 `.running`／`.completed` 与依赖产物哈希，`groups.json` 是名称、note 与结构视图。轮廓与补全会话持久保存在各自 session.json，续跑恢复同一会话；重试会重置该步骤并留存旧会话历史。reviewer、去重、子组分析每次独立调用。

统一先写 `.draft.svg`，通过校验再发布正式 SVG。整树完成后程序合并终止部件、隔离资源 ID 并发布 preview，保留逻辑父容器。相同输入复用结果，内容改变只重跑实际依赖；主动删除完成标记或产物会重做对应步骤及下游。旧 stages/ 布局可继续浏览，运行时需要当前事实布局；原参考、调用与其他 section 成果保持各自归属。

## 深度规划

preview 完成后 `propose_occlusion` 提交全表，按原图、完整部件和去重轮廓检查候选，`check_occlusion_part` 确认每件与每个区域，最后 `submit_occlusion` 发布。组树表示包含关系，深度表表达绘制前后。

当前输出 v3、back-to-front，每个逻辑 part 对应一行：单深度为 `level`，跨层同动整体用 `levels: [{ level, region }]`。数值唯一、越大越靠前，可用小数插层；每个区域带说明与检查依据，v2 单深度表兼容读取。实际跨层像素由 raster step01 拆分，完整协议见 [shared](../shared/README.md#多深度与上游修正)。

sourceHash 绑定树语义、SVG、参考、preview 和规划提示词；深度记录缺失或输入变化时只重做本步。完整交付包含当前 preview 与通过检查的深度表。单测使用本地模拟；真实艺术质量由制作中的视觉观察与审核确认。
