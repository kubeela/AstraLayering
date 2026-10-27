# 衣服 raster step01 绘画报告

已完成衣服分层、原尺寸逐层验收及保存重开。工程为1145×1374，4个逻辑part、8个普通绘画层、7个Krita原生透明度蒙版。全部分片与蒙版默认开启。

交付：[clothing-depth.kra](clothing-depth.kra)；重开后透明合成：[clothing-depth.png](clothing-depth.png)。本报告为待调度器发布的暂存报告。

## 依据与内容归属

- 绘画标准：[纯衣服参考](../../../../clothing-part-layering/references/clothing.png)。画布、位置及比例全程不移动、不缩放参考。
- 完整形体：[parts](../../clothing-part-layering/parts)；控制职责：[groups.json](../../clothing-part-layering/groups.json)；深度：[occlusion.json](../../clothing-part-layering/occlusion.json)。
- 同名人物简化穿衣参考仅用于理解颈位和上臂穿过衣物的关系，没有作为纹理来源。工程无人体或占位绘画层。
- 四个终止节点均未设置hiddenInReference，allowOutsideParent也均未设置；本次无全不可见衣片，无需隐藏内容控制组。逻辑ID、父组、控制职责和顺序保持原结构。
- 每个part独立生图一次；左右袖的姿态、折线与光照不完全对称，没有镜像复用。每片可见覆盖仅来自clothing.png中本衣片自己的衣料，不借用邻片、人体或开口残点。袖根实际可见窄带以真实接缝及衣身主片边界分配；埋入衣身的区域保持生成及修画。

## 逐片生成、配准与绘画

使用内置image_gen.imagegen，4次均成功，无失败、拒绝或生成重试。输入1的非本片区域和黄色补全位置清空为中性灰，输入2为同坐标RGB控制图。红保留本片衣料；黄延续同片；绿透明。领口内零散蓝色残点依上游note排除，未作为领标或衣料。

[完整实际提示词、工具参数与原始输出路径](evidence/generation-record.json)。生成时输入已独立归档，右袖后续几何修正后的控制图另存，未混淆生成前后的目标。

| part ID | 原输入1 / 控制图2 | 生成透明PNG | 检查与处理 |
|---|---|---|---|
| tshirt_body | [输入](../../evidence/generation/tshirt_body/input.png) / [RGB](../../evidence/generation/tshirt_body/control.png) | [原始生成](../../evidence/generation/tshirt_body/generated.png) | 原尺寸看图合格用于补全；保留下摆内返、双缝线与前胸折面；生成领缝/袖根隐藏条。 |
| sleeve_image_left | [输入](../../evidence/generation/sleeve_image_left/input.png) / [RGB](../../evidence/generation/sleeve_image_left/control.png) | [原始生成](../../evidence/generation/sleeve_image_left/generated.png) | 原尺寸看图合格用于补全；保留斜椭圆袖口深色内壁，不将其当空洞删除。 |
| sleeve_image_right | [输入](../../evidence/generation/sleeve_image_right/input.png) / [RGB](../../evidence/generation/sleeve_image_right/control.png) | [原始生成](../../evidence/generation/sleeve_image_right/generated.png) | 原尺寸看图合格用于补全；独立保留相反斜向袖口和该侧折面；后修根缝搭接。 |
| neckline_band | [输入](../../evidence/generation/neckline_band/input.png) / [RGB](../../evidence/generation/neckline_band/control.png) | [原始生成](../../evidence/generation/neckline_band/generated.png) | 原尺寸看图合格用于补全；保持完整领圈和中空；不增加领标。 |

生成画幅有比例漂移；以实体材质跨度逐行配准至完整SVG，开口不参与衣料采样。登记见[配准记录](evidence/registration.json)。实际可见区以本片参考覆盖拟合，黄色区使用生成衣料。没有用颜色阈值填色、原图隐藏区域像素或整件原图替代补全。

衣身和左右袖的隐藏缝条在Krita中使用b) Airbrush Soft逐段修顺色阶与生成边线，选区限制于生成补全部分，保留底层纹理。衣身/左袖保留34段笔触；右袖最终配准后重做7段隐藏根缝笔触。见[原生画笔记录](evidence/native-brush-log.json)和[右袖最终记录](evidence/native-brush-right-root-final.json)。

## 实际深度与逐层独显验收

深度从后到前列出。所有层均为普通paintlayer，挂在根下，以完整part ID追溯共同运动关系；蒙版附着各自绘画层，不用蒙版代替真实深度切片。每层均在其他绘画层隐藏时检查原尺寸的轮廓、衣料归属和补全；蒙版启用与暂时停用的原生投影分别留证。

| 深度 | 逻辑part / 实际图层名 | 绘画层UUID | 区域与独显结论 | 启用 / 停用蒙版证据 |
|---|---|---|---|---|
| 10 | tshirt_body<br>0010 tshirt_body :: hem_return | {42bccb78-bfdc-497f-851a-308fd7dc3272} | 远侧下摆内返；在70后，两端与前片回折连续。含约4px埋入70的同衣料搭接。 独显检查通过。 | [启用](../../evidence/solo-enabled/0010-tshirt_body-hem_return.png) / [停用](../../evidence/solo-disabled/0010-tshirt_body-hem_return.png) |
| 20 | sleeve_image_left<br>0020 sleeve_image_left :: cuff_return | {4650a7bc-e69c-40d0-bc45-1889e42d7b21} | 左袖口深色远壁/后口缘；在50后，沿真实椭圆前缘接合。 独显检查通过。 | [启用](../../evidence/solo-enabled/0020-sleeve_image_left-cuff_return.png) / [停用](../../evidence/solo-disabled/0020-sleeve_image_left-cuff_return.png) |
| 30 | sleeve_image_right<br>0030 sleeve_image_right :: cuff_return | {ccdd6631-ab19-4b44-bd85-a3b5299cd5d6} | 右袖口深色远壁/后口缘；在60后，内外回折端连续。 独显检查通过。 | [启用](../../evidence/solo-enabled/0030-sleeve_image_right-cuff_return.png) / [停用](../../evidence/solo-disabled/0030-sleeve_image_right-cuff_return.png) |
| 40 | neckline_band<br>0040 neckline_band :: back_arc | {d5dac9e9-f93e-4ea9-ba04-deb70f721b6a} | 后领横弧及两端回转；在80后，肩端埋入70。 独显检查通过。 | [启用](../../evidence/solo-enabled/0040-neckline_band-back_arc.png) / [停用](../../evidence/solo-disabled/0040-neckline_band-back_arc.png) |
| 50 | sleeve_image_left<br>0050 sleeve_image_left :: front_tube | {77df1e21-6b5d-4629-928d-4c3c4b99b201} | 左近侧袖筒、双缝边和前口缘；袖根在70后，保留生成搭接。 独显检查通过。 | [启用](../../evidence/solo-enabled/0050-sleeve_image_left-front_tube.png) / [停用](../../evidence/solo-disabled/0050-sleeve_image_left-front_tube.png) |
| 60 | sleeve_image_right<br>0060 sleeve_image_right :: front_tube | {9ec693b3-e14c-4b8f-bd6e-a68e2207bd17} | 右近侧袖筒、双缝边和前口缘；袖根在70后，包含修正的连续根缝搭接。 独显检查通过。 | [启用](../../evidence/solo-enabled/0060-sleeve_image_right-front_tube.png) / [停用](../../evidence/solo-disabled/0060-sleeve_image_right-front_tube.png) |
| 70 | tshirt_body<br>0070 tshirt_body :: front_body | {df7c9d8e-1b0e-469b-9acf-db276719b189} | 肩胸、躯干、腰侧、近侧下摆及全部下摆双缝线；在两袖和10前，80后。 独显检查通过。 | [启用](../../evidence/solo-enabled/0070-tshirt_body-front_body.png) / [停用](../../evidence/solo-disabled/0070-tshirt_body-front_body.png) |
| 80 | neckline_band<br>0080 neckline_band :: front_U | {556b20f5-7763-40b0-aa83-d1aa7c96c6c0} | 两侧前转领带和整个前U包边；覆盖70领缝，独显无后弧残线。 独显检查通过。 | [启用](../../evidence/solo-enabled/0080-neckline_band-front_U.png) / [停用](../../evidence/solo-disabled/0080-neckline_band-front_U.png) |

原有occlusion已为四个part各标两个区域，本次实际落实全部8个分片；未新发现需要额外深度或独立控制身份的部件。前后衣片是当前姿态的深度区域。下摆、袖口不沿双缝线拆分，领圈不沿贯穿整圈的水平线拆分。前后分片之间保留约4px同片隐藏搭接，接合处衣料纹理来自同一配准整件。后片独显时搭接边可包含少量前侧纹理，这是被前片遮住的连续余量。

- tshirt_body：10远侧内返 / 70主衣身和近侧下摆，左右下摆回折相接。
- neckline_band：40后领横弧 / 80前U形，分界在左右最高回转处；后领内缘中间约(571,328)，前领内缘约(576,395)。
- sleeve_image_left：20远侧内壁 / 50近侧筒面，沿(2,722)至(244,797)的真实前口缘接合。
- sleeve_image_right：30远侧内壁 / 60近侧筒面，沿(914,804)至(1145,727)的真实前口缘接合。

## 原生蒙版及默认显隐

| 所属绘画层 | 蒙版名 / UUID | 控制区域及关系 | 默认 |
|---|---|---|---|
| 0020 sleeve_image_left :: cuff_return | M sleeve_image_left own_cuff_aperture; root_occluded_by_tshirt_body<br>{da6bcf63-8bf5-42b0-bd31-5d63d2738258} | 本袖完整形体/开口外部裁切；深蓝返回内壁保留。根部生成搭接由70的实际衣身轮廓自然遮挡，避免双侧相减造成缝隙。 | 启用 |
| 0030 sleeve_image_right :: cuff_return | M sleeve_image_right own_cuff_aperture; root_occluded_by_tshirt_body<br>{7e888928-acb5-4619-9d5f-88590b32f153} | 本袖完整形体/开口外部裁切；深蓝返回内壁保留。根部生成搭接由70的实际衣身轮廓自然遮挡，避免双侧相减造成缝隙。 | 启用 |
| 0040 neckline_band :: back_arc | M neckline_band own_inner_aperture<br>{aea5b287-d8a2-4100-a50b-0cf72e81d3b0} | 同part内缘控制领口中空，40/80各自附着；不拿衣身轮廓剪掉后领。 | 启用 |
| 0050 sleeve_image_left :: front_tube | M sleeve_image_left own_cuff_aperture; root_occluded_by_tshirt_body<br>{fc9452e9-d136-4d85-a255-daa65cae0b24} | 本袖完整形体/开口外部裁切；深蓝返回内壁保留。根部生成搭接由70的实际衣身轮廓自然遮挡，避免双侧相减造成缝隙。 | 启用 |
| 0060 sleeve_image_right :: front_tube | M sleeve_image_right own_cuff_aperture; root_occluded_by_tshirt_body<br>{ae3ad7c0-42f1-4c53-bef2-c188c7d6e25b} | 本袖完整形体/开口外部裁切；深蓝返回内壁保留。根部生成搭接由70的实际衣身轮廓自然遮挡，避免双侧相减造成缝隙。 | 启用 |
| 0070 tshirt_body :: front_body | M tshirt_body root_seams by sleeve_image_left+sleeve_image_right<br>{d16c7490-ef04-4df7-ac0d-d3138e2f711a} | 两袖接缝控制衣身越缝补全；只裁掉衣身伸入袖侧的窄条。领缝补全仍在底稿并被80覆盖。 | 启用 |
| 0080 neckline_band :: front_U | M neckline_band own_inner_aperture<br>{41eddef2-ea10-4ed2-aa7f-99e4c13f346f} | 同part内缘控制领口中空，40/80各自附着；不拿衣身轮廓剪掉后领。 | 启用 |

全部底稿保留完整生成衣料，蒙版暂时关闭后可检查隐藏缝条；本次无须alpha继承/剪贴组，inheritAlpha均为false。两袖的深色口内是实际内壁衣料，透明开口由真实分片和外部空区表达，未将内壁整块挖空。

[衣身接缝蒙版开关](../../evidence/details/body-left-mask-check.png)；[领缝底稿开关](../../evidence/details/body-neck-mask-check.png)；[左袖](../../evidence/details/left-mask-check.png)；[右袖](../../evidence/details/right-mask-check.png)。每张均为实际Krita原尺寸投影裁切，检查后恢复默认启用。

## 组装中发现并修正的项目

1. 初始袖根主轮廓裁切过紧，右肩根出现1–3px内缝，腋侧下段也有窄缝。先恢复完整袖根搭接，再依据实际参考对sleeve_image_right.svg内缘补入连续窄条：肩根约y347–467、腋侧约y720–817。用已有合格生成衣料重新配准，实际可见的本袖窄带覆盖自身参考，隐藏部分保留生成并用原生画笔修顺。左右袖完整底稿保留，70负责自然遮挡。复核已无该内部开裂。
2. 初次领圈切片在80层留有后弧细碎像素。将后弧区域贯通到外侧，并给80在后弧内缘增加2px安全排除范围；40仍保留4px接续搭接。最终80独显是连续前U，开口内无悬浮后弧。
3. 纯衣服图领口中央零散蓝点未纳入任何图层，符合neckline_band原note，不以缩小整图差异为目的错误覆盖。

上述1、2是组装中新发现的几何/切片问题；8个深度区域来自已有标注。无新逻辑part，无归属变更。已保存对应右袖SVG，并通过edit_occlusion校验保存完整深度表及逐区域检查依据；groups.json因节点和职责不变而未改。更新了occlusion/preview.svg中的右袖完整形体；该上游预览仍为whole-parts定位预览，实际8个深度以KRA及本表为准。SVG修改前形体保存在workspace/history。

## 组合比对与保存重开

整体观看及原尺寸局部对照，以固定参考坐标并排：

- [左袖接缝](../../evidence/details/left-root-comparison.png)与[右袖接缝](../../evidence/details/right-root-comparison.png)：连续折线、袖根和双缝边衔接自然，未把衣身大面归入袖片。
- [领圈](../../evidence/details/neck-comparison.png)：后领、两侧回转、前领连贯，保持中空。
- [下摆](../../evidence/details/hem-comparison.png)：双缝线归前衣身，深色内返沿完整下缘连续；隐藏70单独检查10仍有完整料。

![保存重开默认合成](clothing-depth.png)

保存当前工程并关闭，再用Krita 5.3.4.1重新打开指定KRA；重开后重新导出clothing-depth.png。8绘画层、7透明度蒙版的UUID、父属、默认开启状态、底层像素、蒙版选区及默认投影与保存前一致。验证结果见[重开核对JSON](evidence/reopen-verification.json)。哈希仅验证保存持久性；美术质量结论来自逐层和整体看图，不用PSNR或像素差代替。

[Krita重开整图](../../evidence/krita-reopened-default.png)；[右袖根200%原生窗口](../../evidence/krita-right-root-200.png)。

## 偏差与本步结论

- 现有SVG曲线与参考抗锯齿边缘存在约1–3px局部轮廓偏差，主要在肩外缘、领口内缘与下摆柔边；当前有少量硬边/锯齿及袖根隐藏条细边线，可由第二步精修。未发现本步尺度下的明显缺口、衣片错位或突兀画风断层。
- 补全受原图不可见范围限制，窄缝余量的内部折线属于合理延续设计；当前默认组合由真实可见衣片覆盖，独显检查连续且不含遮挡物。没有纱料或半透明材质被误删除。
- 无未解决的分层归属/深度冲突；无必要输入、权限或工具故障阻塞。SVG光栅化的本地Cairo依赖不可用，已切换至现有Krita Qt SVG通道执行并验收，未影响交付。

本阶段交付完成。正式report.md由调度器检查后发布，本次仅写report.md.tmp。
