结论：通过

已完成当前工程全部 4 个逻辑衣片、8 个普通绘画分片和 7 个原生透明度蒙版的独立视觉检查。第一轮 R1 的左袖内端开口问题已修复；本次没有确认需要第一步返修的内容缺失、形体组合、归属、层序或明显画风问题。细微硬边、阶梯和描边接合留给第二步。

## 检查对象与依据

- 实际工程：`/Users/wutian/Desktop/coding/AstraLayering/.run/closed-face-full-20261026/clothing-raster-layering/step01/clothing-depth.kra`，1145×1374；SHA-256：`0e81355f9f21a8cff7697c5175b99a5f06648bf8971647dfdfd075054517185d`。
- 绘画参考：`../../clothing-part-layering/references/clothing.png`，与 [report.md](report.md) 确认的标准一致。全程保持参考原画布坐标，没有移动、缩放或变形参考来掩盖偏差。
- 结构依据：[groups.json](../../clothing-part-layering/groups.json)、[occlusion.json](../../clothing-part-layering/occlusion.json) 和 [parts](../../clothing-part-layering/parts) 中四份完整 SVG。沿用已经落实的 10/70、20/50、30/60、40/80 分片及其共同 part 归属。
- 已阅读本步正式 [review-01.md](review-01.md)、[repair-01.md](repair-01.md) 及当前绘画报告。旧报告用于定位和理解处理过程，本次结论依据现有 Krita 会话中的实际工程、重新导出的原生投影和局部看图。
- 在 Krita 5.3.4.1 中使用已验证的 Python bridge 临时切换显隐、停用蒙版、导出投影和原生窗口截图。未执行绘画、蒙版编辑或保存；结束后恢复原始图层显隐、蒙版、活动层及原有缩放。输入文件哈希均未改变，文档 modified=false。当前原生默认投影与磁盘 KRA 的 mergedimage 一致，证明检查的是本次保存版本。见 [只读及恢复核对](review-evidence/independent-02/readonly-verification.json)。这些核对不作为美术质量或像素一致的通过门槛。

## 实际检查方法与覆盖

先查看参考和当前工程的原尺寸整体，再在 Krita 100% 分上、下核对轮廓、比例和外露范围；随后以 200% 平移覆盖领圈、双肩、两只完整袖筒及袖口、胸腹、双侧腰线、全部下摆。左袖旧 R1 追加 400% 原图/当前、分片独显、同 part 合看和隐藏相关层检查。

全部 8 个绘画分片分别检查蒙版启用与停用投影；4 个逻辑 part 各以前后分片合看检查两种蒙版状态。另隐藏 0070 检查两侧袖根及下摆内返，隐藏 0080 检查衣身领缝补全与后领的职责。单层可见内容只与参考中属于本衣片的可见部分比较；隐藏余量依据完整 SVG、接缝结构及同件衣料风格判断，没有用参考遮挡物像素要求补全一致。

主要检查证据：

- [当前默认原尺寸投影](review-evidence/independent-02/default.png)、[参考/当前 1:1 整体并排](review-evidence/independent-02/comparisons/whole-reference-current-100.png)。
- Krita 当前 [100% 上部](review-evidence/independent-02/krita-100-upper.png)、[100% 下部](review-evidence/independent-02/krita-100-lower.png)；参考 [100% 上部](review-evidence/independent-02/krita-reference-100-upper.png)、[100% 下部](review-evidence/independent-02/krita-reference-100-lower.png)。
- [200% 截图覆盖索引图](review-evidence/independent-02/native-200-contact.png)，[默认分区及 400% 检查清单](review-evidence/independent-02/native-inspection.json)，[同 part 蒙版切换及隐藏上层检查清单](review-evidence/independent-02/supplement-inspection.json)。索引图仅用于导航，细节依据原尺寸截图和同坐标局部对照。
- [完整图层、UUID、蒙版映射及全部独显/合看投影路径](review-evidence/independent-02/layer-audit.json)。所有绘画分片均为独立 paintlayer，七个附着蒙版均为 transparencymask，inheritAlpha=false，没有剪贴组或靠蒙版代替实际前后切片。

## 确定问题清单

无。本次没有新增问题编号或待第一步返修项，也没有未检查部件。因没有确定需要修改的区域，本轮不生成返修框选，避免把已修复区域或第二步边缘精修项标成未解决问题。

### 旧 R1 复核：左袖内端搭接料外露——已解决

复核原框 `[240,772,30,42]`，相关层为 `0050 sleeve_image_left :: front_tube`、`0020 sleeve_image_left :: cuff_return` 及两者附着的袖口/袖根显隐蒙版，关联衣身层为 `0070 tshirt_body :: front_body`。

默认组合中，原先填低凹口的短蓝凸片和突兀竖向深线已收回。约 x=247–257、y=778–801 的开口重新向上收尖，袖口内端按参考回折接入，未形成与衣身的额外粘连。0020 深色内壁、0050 近侧前缘及双道缝线完整，上方肩袖接合没有产生新缺口。

分别独显 0050、0020、0070，并隐藏 0050、0020、0070 后，确认正常开口由当前袖片显示范围与衣身自身边界共同形成，未看到扩大衣身或把衣身像素归入袖片来遮盖问题。停用袖片蒙版后，完整根部补全和连续回折仍在；修复控制的是默认外露范围。20 在 50 后、两者根部在 70 后的关系保持正确。

本项无需继续调整第一步形体。第二步处理附近细边时，应保留当前上收凹口、完整深蓝内壁、双缝线、隐藏袖根余量及 20/50/70 层序。

证据均由本次当前 KRA 重新导出：

- [400% 参考、当前及 0050/0020/0070 逐层归属](review-evidence/independent-02/comparisons/old-R1-layer-check-400.png)。
- [400% 默认、隐藏0050、隐藏0020、隐藏0070](review-evidence/independent-02/comparisons/old-R1-occlusion-check-400.png)。
- [400% 左袖完整底稿与默认蒙版范围](review-evidence/independent-02/comparisons/old-R1-completion-check-400.png)。
- 原生 Krita [当前400%](review-evidence/independent-02/krita-400-left-notch-default.png)、[参考400%](review-evidence/independent-02/krita-reference-400-left-notch.png)、[左袖合看/蒙版开启](review-evidence/independent-02/krita-400-left-notch-part-enabled.png)、[停用蒙版](review-evidence/independent-02/krita-400-left-notch-part-disabled.png)。

![旧R1复核：参考、当前及逐层归属](review-evidence/independent-02/comparisons/old-R1-layer-check-400.png)

## 全部分片的内容与结构检查

以下按实际从后到前的层序列出。后片上缘少量被本件前片盖住的同衣料搭接属于连续余量，没有因同 part 多层、搭接或共同运动而判为重复。

| 实际绘画层 | 内容、拆分及衔接结果 | 本次独显证据：蒙版启用 / 停用 |
|---|---|---|
| 0010 tshirt_body :: hem_return | 远侧下摆内返衣料完整，位于0070之后；深蓝弧带的两端回折和中段连续，没有按双缝线错误切片。 | [启用](review-evidence/independent-02/solo-enabled/0010-tshirt_body-hem_return.png) / [停用](review-evidence/independent-02/solo-disabled/0010-tshirt_body-hem_return.png)；该层无附着蒙版，两者相同。 |
| 0020 sleeve_image_left :: cuff_return | 左袖远侧深色内壁及后口缘独立存在，位于0050后；内端收顺后仍保留完整深色衣料，与前缘回折接续。 | [启用](review-evidence/independent-02/solo-enabled/0020-sleeve_image_left-cuff_return.png) / [停用](review-evidence/independent-02/solo-disabled/0020-sleeve_image_left-cuff_return.png) |
| 0030 sleeve_image_right :: cuff_return | 右袖深蓝远壁及后缘完整，位于0060后；内外端回折相接，没有被当作透明空洞删除。 | [启用](review-evidence/independent-02/solo-enabled/0030-sleeve_image_right-cuff_return.png) / [停用](review-evidence/independent-02/solo-disabled/0030-sleeve_image_right-cuff_return.png) |
| 0040 neckline_band :: back_arc | 后领横弧及两端回转完整，在0080之后；端部隐藏搭接与前领合看连续，开口内没有误画人体或领标。 | [启用](review-evidence/independent-02/solo-enabled/0040-neckline_band-back_arc.png) / [停用](review-evidence/independent-02/solo-disabled/0040-neckline_band-back_arc.png) |
| 0050 sleeve_image_left :: front_tube | 左近侧袖筒、双缝边和前口缘齐全；肩根在0070后。完整底稿延续本袖折面，没有衣身大面混入；旧R1默认开口已恢复。 | [启用](review-evidence/independent-02/solo-enabled/0050-sleeve_image_left-front_tube.png) / [停用](review-evidence/independent-02/solo-disabled/0050-sleeve_image_left-front_tube.png) |
| 0060 sleeve_image_right :: front_tube | 右近侧筒面及双缝边独立完整，保留与左袖不同的折线和袖口倾向；袖根在0070后，上下根缝补全连续，默认组合没有贯通裂缝。 | [启用](review-evidence/independent-02/solo-enabled/0060-sleeve_image_right-front_tube.png) / [停用](review-evidence/independent-02/solo-disabled/0060-sleeve_image_right-front_tube.png) |
| 0070 tshirt_body :: front_body | 肩胸、腹部、双侧腰线、近侧下摆及全部下摆双缝线完整；位于两袖根与0010前、0080后。停用蒙版可见两侧窄搭接及领缝补全，与本衣身颜色和折面协调。 | [启用](review-evidence/independent-02/solo-enabled/0070-tshirt_body-front_body.png) / [停用](review-evidence/independent-02/solo-disabled/0070-tshirt_body-front_body.png) |
| 0080 neckline_band :: front_U | 双侧前转带和整个前U包边连续，覆盖0070领缝；独显没有悬浮后弧残线，没有用衣身或后领像素填充中空区。 | [启用](review-evidence/independent-02/solo-enabled/0080-neckline_band-front_U.png) / [停用](review-evidence/independent-02/solo-disabled/0080-neckline_band-front_U.png) |

四个逻辑 part 的前后分片均独立保留，未因共同运动而合并；左右袖没有镜像复用。四个上游节点都没有 hiddenInReference=true，本次不存在需另行验收的完全隐藏衣片或隐藏内容控制组。现有原生蒙版控制本件开口、形体外部或越缝余量，默认状态均开启，映射与报告/深度职责一致。衣身蒙版停用后外展的窄条是本件隐藏缝料；两袖埋入衣身的完整余量由0070自然遮挡，不要求把它们按当前可见轮廓擦掉。

同 part 合看及隐藏上层证据：

- 领圈：[蒙版开关局部](review-evidence/independent-02/comparisons/neckline_band-mask-check.png)、[完整底稿](review-evidence/independent-02/neckline_band-disabled.png)、[隐藏0080查看衣身领缝](review-evidence/independent-02/krita-200-neck-hide-0080.png)。
- 左袖：[蒙版开关局部](review-evidence/independent-02/comparisons/sleeve_image_left-mask-check.png)、[完整底稿](review-evidence/independent-02/sleeve_image_left-disabled.png)、[隐藏0070查看袖根](review-evidence/independent-02/krita-200-left-root-hide-0070.png)。
- 右袖：[蒙版开关局部](review-evidence/independent-02/comparisons/sleeve_image_right-mask-check.png)、[完整底稿](review-evidence/independent-02/sleeve_image_right-disabled.png)、[隐藏0070查看袖根](review-evidence/independent-02/krita-200-right-root-hide-0070.png)。
- 衣身：[蒙版开关局部](review-evidence/independent-02/comparisons/tshirt_body-mask-check.png)、[完整底稿](review-evidence/independent-02/tshirt_body-disabled.png)、[隐藏0070查看下摆内返](review-evidence/independent-02/krita-200-hem-hide-0070.png)。

## 可见内容、画风与整体还原度

固定原坐标的参考/当前对照覆盖：

- [领圈](review-evidence/independent-02/comparisons/neck.png)、[左肩袖接缝](review-evidence/independent-02/comparisons/left-shoulder.png)、[右肩袖接缝](review-evidence/independent-02/comparisons/right-shoulder.png)。
- [左根下段](review-evidence/independent-02/comparisons/left-root.png)、[右根下段](review-evidence/independent-02/comparisons/right-root.png)、[左袖口](review-evidence/independent-02/comparisons/left-cuff.png)、[右袖口](review-evidence/independent-02/comparisons/right-cuff.png)。
- [胸腹](review-evidence/independent-02/comparisons/chest.png)、[左腰](review-evidence/independent-02/comparisons/left-waist.png)、[右腰](review-evidence/independent-02/comparisons/right-waist.png)、[左下摆](review-evidence/independent-02/comparisons/hem-left.png)、[右下摆](review-evidence/independent-02/comparisons/hem-right.png)。

整体肩宽、领口比例、左右袖外露范围、腰线收放和下摆姿态符合参考；没有局部看似完整、叠加后却明显膨大、收缩、错位或异常重叠的区域。胸腹渐变、蓝色布料底纹、锐折面、袖口与下摆内壁、双缝线等绘画内容保留，未见明显串色或大块画风变化。

补全与可见覆盖的交接集中在窄袖根、领缝和回折余量。独显与隐藏上层检查未发现第一步尺度的硬色块接缝、纹理缺段或错归遮挡物。前后同 part 合看后，袖口、领圈及下摆回折均自然连续。

参考为不透明蓝色衣料，没有薄纱材质；领口中空、左右腋下正常透明凹口保留。袖口深色内壁和下摆内返是应保留衣料，未将其误判为空洞。领口中央参考零散蓝色残点依既定标准排除，未要求补为实体附件。

## 阶段边界与交接

领口内缘、肩外缘、腰侧和下摆仍有细微硬边或阶梯，右袖根局部细线接合也可在第二步顺边。这些差异没有造成当前阶段的内容缺失、开口误封或明显轮廓错位，属于已明确留至第二步的边缘精修。本结论不替代第二步验收。

本次不要求新增阴影、AO或投影；衣片原有的褶皱明暗、深色内壁和缝线已作为内容完整性检查。后续精修应保留现有 4 个逻辑 part、8 个独立深度分片、7 个原生蒙版及正确的默认开口与补全底稿。没有层序或拆分职责需要退回修改，也无需身体装配或身体插层说明。

全部检查已完成，无必要输入缺失、工具故障或未检查区域。仅写入本次暂存报告和检查证据，工程及上游分层文件保持只读。
