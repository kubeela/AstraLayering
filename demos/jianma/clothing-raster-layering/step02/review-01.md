结论：需要修复

本轮已在专用 Krita 5.3.4.1（DISPLAY=:108）打开实际 `step02/clothing-soft-edges.kra`，完成整图、全部 69 个实际绘画层及重点接续位置的视觉检查。当前的主要问题是两侧袖口出现原图没有的横向接缝和内部形体、前襟尾端卷边内容被截掉，以及裙摆、肩缘和蓝长幅的局部边缘质量不足。另有四处可见衣料空缺与既定 SVG 范围冲突，不能通过随意扩形补布解决。胸饰、雪花银线的实体宽度与去阴影边界仍需确认。

以下 R01–R05 是有明确绘画依据的修复项；C01–C04 是须先明确标准的还原度问题；U01–U02 保留为待确认。来源在第一步不降低问题的重要性，第二步已有柔化操作也不代表问题已经解决。

**检查依据与证据读法**

绘画参考固定为 [clothing.png](../../clothing-part-layering/references/clothing.png)，与 [step01 正式报告](../step01/report.md) 和 [step02 正式报告](report.md) 一致。结构核对使用 [parts](../../clothing-part-layering/parts)、[groups.json](../../clothing-part-layering/groups.json) 和 [occlusion.json](../../clothing-part-layering/occlusion.json)；必要处比对 [第一步工程](../step01/clothing-depth.kra)。检查时 `step02/` 没有既有正式 review 或 repair 报告；本轮没有将暂存文件或操作记录视为修复验收。

位置均为 1024×1536 原画布坐标，左上为原点，x 向右、y 向下。“画面左／右”指观看方向；图层名中的 left/right 沿用原命名。索引为实际 KRA 从后到前、从 0 开始，完整名称、层型和范围见 实际图层清单（历史路径：`review-01-evidence/layer-inventory.json`）。

证据中 `REFERENCE` 为原图，`CURRENT` 为当前工程合成，`SOLO` 为当前实际单层，`STEP01` 为第一步合成。灰底用于看透明部分；`SVG` 是结构范围，红色 `OUTLINE` 仅辅助定位该范围，不是绘画轮廓或修复目标。放大板采用整数倍显示；没有使用像素差、PSNR 等指标判定质量。KRA 层数据、标准范围与文件哈希仅用于确认来源、归属和未改动状态。

**R01｜优先修复：画面左袖口的白色叶片形内容和横向接缝改变了原有连续衣面**

- 相关层：8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`；5 `outer_robe/right_sleeve/cuff_train`。组合检查同时包含上方的 25 `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall`。
- 位置：x233–385、y695–835。重点为 x268–318、y710–800 的宽白片，以及 y790–803 附近与垂片相接的横边。
- 当前表现：8 内部出现向下收尖的大块白色叶片／翻片，原图对应位置是连续向下的蓝色褶面。8 下缘与 5 的亮色弧形上缘组合后形成横向割断，褶线和明暗走向在此突变。独显 8 仍有白片；独显 5 可见其根部另画的亮弧，确认不是上方袖片遮挡造成的假象。
- 依据及影响：原图袖口外弧以下的蓝色纵褶连续下垂，没有这块白色翻片和横向接缝。当前把连续袖料画成了额外叠片，影响袖口形体和上下衣料的完整接续；第一步已经存在，第二步的边缘柔化未解决。
- 修复方向：在现有本层范围内重新整理 8 的内部蓝色褶面，去掉无参考依据的白叶形体；协调 8 与 5 的短搭接，使纵褶和颜色连续，消除外露的假根部亮弧。保留原图真实袖口白包边、侧面回折、开口和蓝料本身的深浅，不把整片改成均匀蓝色，不合并前后片。右下三角空缺另见 C03，不能借本项擅自扩形。
- 证据：原图／组合／两单层 300%（历史路径：`review-01-evidence/plates/diag-left-cuff.png`）、结构范围（历史路径：`review-01-evidence/plates/standard-left-cuff.png`）、第一步对照（历史路径：`review-01-evidence/plates/baseline-cuff-left.png`）、Krita 单层 8（历史路径：`review-01-evidence/screens/left-cuff-solo8.png`）、隐藏上方层（历史路径：`review-01-evidence/screens/left-cuff-below8.png`）。

**R02｜优先修复：画面右袖口附着壁与自由垂片之间有新增横缝和白色尖齿**

- 相关层：7 `outer_robe/left_sleeve/rear_cuff_drape/cuff_attachment_wall`；6 `outer_robe/left_sleeve/rear_cuff_drape/free_curled_drape`。上方对应 26 `outer_robe/left_sleeve/front_sleeve_wall`。
- 位置：x640–800、y695–835，重点 y775–805 的根部与约 x720、y790 的亮色尖齿。
- 当前表现：7 下缘呈生硬的斜截边，6 上根带有额外的亮色卷口及白色三角尖齿；叠加后露出贯穿蓝料的横向接缝，原来的纵向褶面在这里中断。隐藏上方层后仍可见两层自身的断面。
- 依据及影响：原图此处是连续的蓝色下垂衣面。groups 对 7 明确要求“以短而平顺的根部控制界面连接，不新增可见接缝”；6 上根应藏入 7 下方。当前把拆分边界画成了新的可见衣边，影响结构和整体还原度，不能以部件独立为由保留。
- 修复方向：保留两个独立绘画层，调整父范围内的短搭接和根部内容，让 6 的根部亮边、尖齿不再作为外露新卷口；续接原图纵褶和蓝色折面。保留真实侧缘回卷、袖口白弧、下方长垂料纹样和正常开口，不用大范围模糊掩盖接缝。
- 证据：原图／组合／两单层 300%（历史路径：`review-01-evidence/plates/diag-right-cuff.png`）、结构范围（历史路径：`review-01-evidence/plates/standard-right-cuff.png`）、第一步对照（历史路径：`review-01-evidence/plates/baseline-cuff-right.png`）、Krita 单层 7（历史路径：`review-01-evidence/screens/right-cuff-solo7.png`）、隐藏上方层（历史路径：`review-01-evidence/screens/right-cuff-below7.png`）。

**R03｜优先修复：两条前襟尾端的回卷被截薄，白色包边不完整**

- 相关层：27 `outer_robe/right_front_panel`；28 `outer_robe/left_front_panel::front_main`。
- 位置：画面左尾端 x95–190、y1370–1400；画面右尾端 x835–932、y1370–1400，并检查其相邻 x795–835、y1410–1425 的下缘。
- 当前表现：左端本应圆转的卷口被一条直斜线削去一段，回返面和白色边线不能闭合为原图的卷形；右端卷边缩为几段短白线，相邻下缘呈平直、台阶状白边。单层可见同样截断。左端缺少的回卷位于既定 SVG 范围内，不能归因于标准排除。
- 依据及影响：原图两端均有可辨识的圆转回折和连续细白边；当前在整图中呈削尖、破口的尾端，丢失本部件自身的绘画内容。第一步对照可见同源问题。
- 修复方向：依据原图在本层既定轮廓内补足回返衣面和连续包边，恢复圆转趋势及合适的线宽；分别复查两个尾端与邻近波形下缘，避免短白线、硬台阶。保留卷口真实空隙、浅纱／衣面的透明层次和纹样，不填实卷口。保持 17 与 28 的已批准拆层，修尾端不涉及腰部层序。
- 证据：左端局部（历史路径：`review-01-evidence/plates/diag-hem-tip-left.png`）、左端结构范围（历史路径：`review-01-evidence/plates/standard-hem-tip-left.png`）、右端局部（历史路径：`review-01-evidence/plates/diag-hem-tip-right.png`）、右端结构范围（历史路径：`review-01-evidence/plates/standard-hem-tip-right.png`）、左端第一步对照（历史路径：`review-01-evidence/plates/baseline-hem-left.png`）。右侧更靠内的长楔形空隙属于 C02，勿混作同一修复。

**R04｜局部修复：内裙下摆回折角及前后片包边接续仍有咬边和突变**

- 相关层：10 `inner_dress/skirt_side_back`；11 `inner_dress/skirt_front`。
- 位置：x430–600、y1340–1365 的中央下摆，重点查看回折角和两片相接的细白轮廓。
- 当前表现：圆转角有小块状咬口、折线台阶，包边粗细在接续处突变；当前单层和合成都可辨认，已有轻微柔化未使走势连续。
- 依据及影响：原图对应部位是流畅的细包边和圆转回返，当前局部呈缺口与粗白块，削弱下摆质感。此项只针对可见轮廓及部件自身的包边，不要求恢复下摆下方暗影。
- 修复方向：沿原有走势清理小范围咬边，补足连续且粗细合适的包边，协调 10／11 的相接转角。保留波形下摆、正常空气间隙、裙褶和花纹，避免统一羽化或增画暗色底边。
- 证据：原图／组合／两单层（历史路径：`review-01-evidence/plates/diag-hem-center.png`）、结构范围（历史路径：`review-01-evidence/plates/standard-hem-center.png`）、第一步对照（历史路径：`review-01-evidence/plates/baseline-hem-center.png`）、Krita 单层 11（历史路径：`review-01-evidence/screens/hem-solo11.png`）。

**R05｜局部修复：蓝长幅外缘及双肩上缘仍有明显碎边、台阶**

- 相关层与位置：14 `waist_sash/left_long_tail` 的 x568–600、y988–1145 外长缘；33 `outer_robe/collar_shoulders/right_shoulder_cover` 的 x411–506、y283–355；34 `outer_robe/collar_shoulders/left_shoulder_cover` 的 x523–617、y283–355。
- 当前表现：14 与白衣相邻的蓝边有连续细碎齿点和局部凹凸，单层仍可见，非上方白衣造成。33／34 的浅斜肩弧存在规整阶梯，局部白线的粗细和柔和度跳变。
- 依据及影响：原图蓝幅边界细而连续，肩上缘顺滑，允许有绘画软硬变化；当前边缘的碎齿和台阶脱离这些位置的原有笔触。问题范围有限，不应据此重绘整层。step02 已处理 14；报告明确 33／34 的试画没有实际像素变化，当前观察也未见其台阶得到解决。
- 修复方向：仅在可见窄边上整理抗锯齿与局部线宽，连贯蓝料外缘和肩弧走势；保留原轮廓、细白包边、肩部透明度、珠链、领口和邻近纹样。不要靠扩形、全层模糊或抹掉浅亮边来“变软”。
- 证据：蓝幅 400%：原图／组合／单层／基线（历史路径：`review-01-evidence/plates/focus-blue-tail-edge-readable.png`）、蓝幅范围（历史路径：`review-01-evidence/plates/scope-blue-tail-edge-readable.png`）、画面左肩 400%（历史路径：`review-01-evidence/plates/focus-shoulder-left.png`）、画面右肩 400%（历史路径：`review-01-evidence/plates/focus-shoulder-right.png`）。

**需要先明确标准的还原度问题**

下列空缺在当前合成中可见，并有原图衣料依据；现有相邻 SVG 又未完整收取对应区域。它们既不能因“本阶段不做阴影”而被忽略，也不能由 repair 擅自归给最近的衣片。须先确认部件范围／归属，再按确认结果补画。此处没有提出改层序或改动已批准前襟拆片。

**C01｜画面左袖与前襟之间的宽透明楔形缝**

- 相关层：8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`、25 `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall`、27 `outer_robe/right_front_panel`。
- 位置：约 x400–450、y400–650。
- 表现、依据和影响：原图这里是较窄的深色折缝及相邻蓝色衣料，当前是明显更宽的透明楔形空隙。隐藏上方层后空隙仍在；对照相邻 SVG，主要缺口未被这些层完整分配。step02 正式报告也承认该继承差异，现有软边处理未恢复衣面。缺失包含衣料实体，不能将整段都解释为去掉投影。
- 待处理方向：先明确这段衣料应归哪一片、允许轮廓及必要藏接范围，再恢复窄折缝与衣料连续性。不要用整块不透明填色填平原有缝隙，或把相邻衣片画进 27。保留真实外部空白、袖／襟分层和原有纹样。
- 证据：局部原图／合成／单层（历史路径：`review-01-evidence/plates/diag-gap-left.png`）、三片结构范围（历史路径：`review-01-evidence/plates/standard-gap-left.png`）、Krita 隐藏上方层（历史路径：`review-01-evidence/screens/gap-below27.png`）。画面右侧的较小差异未确认成同类缺布，不据此要求对称填补。

**C02｜画面右下内裙与前襟之间的长楔形衣料空缺**

- 相关层：10 `inner_dress/skirt_side_back`、11 `inner_dress/skirt_front`、28 `outer_robe/left_front_panel::front_main`。
- 位置：约 x688–720、y1260–1360。
- 表现、依据和影响：原图蓝灰衣面连续，当前出现细长透明楔形缺口；相邻三层 SVG 没有完整收取该区域。它与 R03 的前襟尾卷截断性质不同，不能按“补回 28 被擦掉的部分”直接处理。空缺打断裙摆与外襟的整体连接。
- 待处理方向：确认是裙片还是前襟应延续到此处，以及两片实际覆盖边，再恢复衣料与藏接；保留裙褶、外襟独立性和真实下摆间隙，不任意扩大任一层或补一条暗带冒充衣料。
- 证据：局部原图／合成／三单层（历史路径：`review-01-evidence/plates/diag-hem-right.png`）、三片结构范围（历史路径：`review-01-evidence/plates/standard-hem-right.png`）。

**C03｜画面左袖口下方三角透明缺口的衣料归属未落实**

- 相关层：5 `outer_robe/right_sleeve/cuff_train`、8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`。
- 位置：约 x333–375、y775–817。
- 表现、依据和影响：原图该段蓝色折返衣料连续，当前为三角形透明缺口；对应区域被两片现行 SVG 排除。它位于袖口下方连续衣面中，应与正常袖口空气开口区别看待，不能因为独显时两层都有边界便认定完成。
- 待处理方向：先确认 5／8 的下折返衣料归属和轮廓，再接续本来的蓝色折面及白色回边。保持正常袖口开口，禁止横向封口；也不要让 R01 的内部重画越过未确认的边界。
- 证据：局部与两单层（历史路径：`review-01-evidence/plates/diag-left-cuff.png`）、两片结构范围（历史路径：`review-01-evidence/plates/standard-left-cuff.png`）。

**C04｜画面右下尖纱保留了标准人为截限，原图连续浅纱仍不完整**

- 相关层：4 `outer_robe/left_sleeve/side_pointed_gauze`；相邻为 6 的蓝色卷曲垂料。
- 位置：约 x855–925、y1065–1175。
- 表现、依据和影响：当前尖纱内侧留有较大的凹缺，原图蓝色斜卷边与外侧尖尾之间有连续浅纱。groups 已明确说明约 (854,1065) 的圆拱内凹“是父稿人为截限，不是参考真实空口”，同时要求“本轮仅恢复父内窄条，不越界补齐”。当前保留了该限制，因此这是尚未解决的标准／还原度冲突，不是可直接归责为本阶段越界擦除的缺口。
- 待处理方向：按标准注明的流程先明确修正后的尖纱范围及其与垂料的覆盖边，再同步本片说明和轮廓后补画。补画须保留薄纱透明度、原有菱格与细尖尾，不把蓝垂料归进纱层；尤其保留上方 x777–805、y800–833 的真实回卷空气缺口。
- 证据：原图／合成／单层（历史路径：`review-01-evidence/plates/diag-gauze-exclusion.png`）、结构范围（历史路径：`review-01-evidence/plates/standard-gauze-exclusion.png`）、Krita 单层 4（历史路径：`review-01-evidence/screens/pointed-solo4.png`）。

**待确认事项**

**U01｜胸饰与雪花的银线变细：需要区分实体内容、结构轮廓和已排除的阴影。**

相关层为 39 `chest_ornament`（x433–590、y344–449）和 57 `waist_pendant/snowflake_pendant`（x487–535、y615–676）。胸饰横向卷枝在合成中呈较暗、点状的细线，下伸卷脚更薄；雪花上侧花瓣及下方 V 形的银边也更细、更淡。两者主体、中心宝石和卷枝／镂空并非整件缺失。

原图的银饰更有连续实体感；groups 要求胸饰保留左右横向细卷枝、两条下伸卷脚及固定亮边，雪花保留内部花瓣、嵌色和线纹。但 SVG 本身已将部分枝线限定得很窄，原图可见厚度又混有周围暗影。当前证据不足以把全部变细量归为误擦，亦不足以指定统一增粗量。

请先逐段确认允许轮廓内应保留的银色亮边、嵌色与线纹；若银饰实体线条确被擦断或只剩深色边，应恢复该实体连续性。超出 SVG 的加粗须先明确标准，不要求补回投影、AO 或外围暗晕。保留胸饰中央露空和雪花镂空，不将后方白衣／蓝幅画进饰件层。本项在明确边界并复核前保持待确认，不作修复完成判断。

证据：胸饰原图／组合／单层／第一步（历史路径：`review-01-evidence/plates/focus-chest.png`）、胸饰 SVG 与范围（历史路径：`review-01-evidence/plates/scope-chest.png`）、雪花原图／组合／单层／第一步（历史路径：`review-01-evidence/plates/focus-snowflake-readable.png`）、雪花 SVG 与范围（历史路径：`review-01-evidence/plates/scope-snowflake-readable.png`）、Krita 胸饰独显（历史路径：`review-01-evidence/screens/chest-solo39.png`）。

**U02｜既有小饰件范围限制仍未确认消解，不将记录视为通过。**

step02 正式报告记载：46 `upper_flexible_neck` 的文字端点 y608.7 与 SVG y605.7 不同；48 `upper_chain` 在 x509–514、y667–668；49 `lower_bead_link` 在 y781 两侧；52 `central_diamond_pendant` 在 y834–837；54 `middle_bead` 在 x508–509.5／512.5–514、y606–608；58 `elongated_silver_link` 在 y724–727；59 `upper_bead_link` 在 x507–510、y713–716；61 `teardrop_pendant` 在 x508–510／514–517、y788–792，均有参考实体与父范围的既有差异。

本轮已看这些层的完整独显和局部组合，没有将报告文字直接升级为新的误擦结论；也没有逐段确证上述每个极小侧缘的实体／暗边归属，因此不能声称其限制已解决。它们保持为输入边界待确认记录：若要求补齐，先明确轮廓依据及归属；不得仅按坐标列举机械增粗。全名与独显定位见 图层清单（历史路径：`review-01-evidence/layer-inventory.json`） 和 逐层证据清单（历史路径：`review-01-evidence/plate-manifest.json`）。相关放大组合见 中央饰件（历史路径：`review-01-evidence/plates/region-jewelry.png`）、Krita 上段饰件（历史路径：`review-01-evidence/screens/upper-beads.png`）、Krita 下段圈链（历史路径：`review-01-evidence/screens/lower-rings.png`）。

**实际检查覆盖与结构结果**

先在 Krita 按 100% 比较当前合成和原图，再按 200% 分区检查；对袖口、前襟空隙、裙摆、尖纱、胸饰和圈链切换单层／隐藏上方层／全部叠加，重点放大到 300–400%。另外从本次打开的实际 KRA 取得 69 层独显，按完整非空范围分成 82 张 200% 或 400% 检查板，逐张检查可见内容与被遮区域的连续性。共查看 12 个区域对照，以及该轮 20 张 Krita 操作截图；大图分段有重叠，避免漏掉片尾。

本轮没有留下整片未看的图层或未扫视的画面分区。显隐诊断针对疑点实施，没有穷举每层所有遮挡组合；导出的 `hidden/00.png` 至 `hidden/68.png` 不等于全部这些文件均已逐一看过。尚无法确认的具体内容边界为 C01–C04、U01–U02，不将这些事项视为通过。

| 已检查索引 | 覆盖内容与结果 | 代表证据 |
| --- | --- | --- |
| 0、33–36 | 后领、双肩、前领；正常领口保留，肩缘见 R05；前领尖无充分依据另报缺陷 | 上部组合（历史路径：`review-01-evidence/plates/region-top.png`） |
| 1、18 | 前后腰带完整独立，整段带面及边界已看 | 腰部组合（历史路径：`review-01-evidence/plates/region-waist.png`） |
| 2–9、25–26 | 全部纱片、前后袖壁、袖口附着壁及自由垂片；R01、R02、C01、C03、C04 | 左袖（历史路径：`review-01-evidence/plates/region-left-sleeve.png`）、右袖（历史路径：`review-01-evidence/plates/region-right-sleeve.png`）、左袖口（历史路径：`review-01-evidence/plates/region-left-cuff.png`）、右袖口（历史路径：`review-01-evidence/plates/region-right-cuff.png`） |
| 10–12 | 内裙前后片及内衣上身，包括隐藏内容、下摆和接续；R04、C02 | 中央下段（历史路径：`review-01-evidence/plates/region-center-low.png`） |
| 13–14 | 两条蓝长幅全长、根部和补全连接；14 局部边缘见 R05 | 中左（历史路径：`review-01-evidence/plates/region-mid-left.png`）、中右（历史路径：`review-01-evidence/plates/region-mid-right.png`） |
| 15–16、22–23 | 两侧挂绳藏后入端与前弧，各自独立且有内容 | 腰部组合（历史路径：`review-01-evidence/plates/region-waist.png`） |
| 17、27–28 | 两条前襟及获批准的后片，完整长片至末端；R03、C01、C02 | 左下（历史路径：`review-01-evidence/plates/region-low-left.png`）、右下（历史路径：`review-01-evidence/plates/region-low-right.png`） |
| 19–21、24 | 前结双短环、束流苏和结心，正常开口保留 | 腰部组合（历史路径：`review-01-evidence/plates/region-waist.png`） |
| 29–32、37–38 | 领扣四条链、挂接和扣体；逐个看完整单层及胸口组合 | 上部组合（历史路径：`review-01-evidence/plates/region-top.png`） |
| 39 | 胸饰主体与所有细卷枝；U01 | 胸饰独显对照（历史路径：`review-01-evidence/plates/focus-chest.png`） |
| 40 | 白长流苏根帽、全长及细束末端 | 中央饰件（历史路径：`review-01-evidence/plates/region-jewelry.png`） |
| 41–56、58–68 | 全部细连接、珠链、莲体、双圈及前后连接片，含隐藏端；U02 | 小件板 2（历史路径：`review-01-evidence/plates/contact-small-2.png`）、小件板 3（历史路径：`review-01-evidence/plates/contact-small-3.png`）、小件板 4（历史路径：`review-01-evidence/plates/contact-small-4.png`）、小件板 5（历史路径：`review-01-evidence/plates/contact-small-5.png`） |
| 57 | 雪花主体、花瓣、孔隙、上下接尖；U01 | 雪花独显对照（历史路径：`review-01-evidence/plates/focus-snowflake-readable.png`） |

全部 69 层的完整名称、每张检查板的坐标与倍率可逐项追溯至 82 张逐层检查板清单（历史路径：`review-01-evidence/plate-manifest.json`），不以代表证据替代其余部件检查。

实际工程为 69 个普通 paintlayer、无子节点／蒙版，对应 68 个逻辑 part。已批准的 17 `outer_robe/left_front_panel::back_under_front_band` 和 28 `outer_robe/left_front_panel::front_main` 仍是两层，分别在 18 前腰带之后／之前，二者同属原逻辑 part。采用 [split-plan.json](../step01/split-test/split-plan.json) 和批准工程的实际顺序；没有因旧文字方向表述将其误判为层序缺陷。

其余需要分开的袖壁、袖口附着壁与自由段、前后领／腰带、挂绳前后段、圈间后穿杆与前露头、莲体下接前后端、流苏扣前后片均确为独立绘画层。合理隐藏延长没有被当成多余内容。未发现人体绘画混入衣片；62／64 的圈孔在单层中透明，合成中所见颜色来自后方衣料，不应填孔。纱片的主透明层次、领口、袖口及真实纱卷空气开口须继续保留。

整体 100% 与分区 Krita 证据：当前工程（历史路径：`review-01-evidence/screens/actual-all-100.png`）、原图（历史路径：`review-01-evidence/screens/reference-100.png`）、上部 200%（历史路径：`review-01-evidence/screens/all-200-upper.png`）、左中 200%（历史路径：`review-01-evidence/screens/all-200-left-mid.png`）、右中 200%（历史路径：`review-01-evidence/screens/all-200-right-mid.png`）、左下 200%（历史路径：`review-01-evidence/screens/all-200-left-low.png`）、右下 200%（历史路径：`review-01-evidence/screens/all-200-right-low.png`）、下摆 200%（历史路径：`review-01-evidence/screens/all-200-hem.png`）。

修复复核应逐项检查同一位置的原图、单层、相邻层组合及全图：先确认内容与接续已恢复，再看 100% 是否自然、200–400% 是否留下硬缝或过度柔化。C 类和 U 类须有明确处理结论或有效依据，不能仅写“继承限制”便当作验收通过。所有建议均不要求添加阴影、AO 或投影，也不包含身体装配、绑定或身体插层说明。

本轮只新增本暂存报告与 `review-01-evidence/` 下的检查材料，未保存修改输入工程，未改写正式合成图或参考文件。实际检查后恢复全部图层显示，见 恢复画面（历史路径：`review-01-evidence/screens/restored-all-100.png`）。完整性核验（历史路径：`review-01-evidence/protected-after-check.json`） 确认包括 input、step01 基线、split-test、当前 step02 工程、正式报告及合成图在内的 286 个受保护文件均未改变。没有启动后续绘制或 repair 阶段。
