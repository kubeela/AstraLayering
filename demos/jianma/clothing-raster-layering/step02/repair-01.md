结论：已修复

本轮逐项处理 [review-01.md](review-01.md) 的 R01–R05、C01–C04、U01–U02，共 11 项，已完成绘制者的独显、隐藏上层、整体叠加及最终保存重开自检。此结论指这些反馈所述的假形体、缺料、接缝、窄边和银饰实体问题已落实修画；保留的还原度差异在下文逐项和统一记录，不等同于已通过下一次独立验收。

绘画依据为 [clothing.png](../../clothing-part-layering/references/clothing.png)，结构职责参考只读 [parts](../../clothing-part-layering/parts)、[groups.json](../../clothing-part-layering/groups.json)、[occlusion.json](../../clothing-part-layering/occlusion.json)，继承 [step01 报告](../step01/report.md) 与已批准拆片。用户 2026-10-19 最新澄清允许依据参考、衣料连续性和合理归属局部修正 KRA 轮廓，故 C/U 的旧 SVG 限制不再作为未处理或再次等待许可的理由；review 原文保持未改。续用当前工程和有效修画，未回跑 part、未重生成整套衣服。

在当前 step02 工程上续画，未用第一步工程覆盖。使用专用 Krita 5.3.4.1、DISPLAY=:108 和既有 Python bridge；笔刷操作脚本（历史路径：`repair-01-work/scripts/paint.py`） 通过 Qt 鼠标事件实际调用 Krita 笔刷。按局部选择软笔、Basic-2、涂抹/Blender Blur、小尺寸橡皮，分别设置笔径、透明度和走势，补画颜色取自本层材质或逐处指定的银蓝色。需要限界时使用临时选区，操作后清除；选区不是交付层的蒙版。脚本辅助定位、笔画操作、显隐、保存和导出，没有用图像数组填色、阈值修复、全层模糊或全局羽化代替绘画。

本轮未粘贴纯衣服参考或角色图的像素，也未调用生图。没有新增 AO、投影或人为阴影；所补内容为衣料、薄纱和银饰实体，原本衣料内部的褶面明暗仍保留。每组实际修画后保存工程，切换相关单层、仅本层及其下方层、全部叠加，对照参考检查颜色、线条、开口及隐藏接续。最终证据来自最后一次重开的 KRA，避免用早期试画代替交付。

**R01｜已修复：左袖口白叶假翻片与横向接缝**

相关实际层为 8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`、5 `outer_robe/right_sleeve/cuff_train`、25 `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall`。对照 x233–385、y695–835，白叶形内容是错误的内部翻片，不是正常袖口开口。已在 8 内恢复蓝色纵向褶面，去除 5 的假根部亮弧和 25 的重复下缘白边，并逐处衔接短搭接。真实上缘白弧、侧面回折与袖口开口保留。

独显确认白叶内容及假根部亮弧已处理；隐藏上层确认 5/8 自身蓝料连续；全部叠加确认不再以横向亮弧分隔两段衣面。纵褶和返面比参考简化，见差异记录。过程依据：根部接续（历史路径：`repair-01-work/audit/r01-r02-root-continuity.json`）、袖口边缘过渡（历史路径：`repair-01-work/audit/cuff-edge-transition.json`）。最终证据：R01-C03-05（历史路径：`repair-01-work/evidence/reopened-R01-C03-05.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R01-C03-05-native.png`）；R01-C03-08（历史路径：`repair-01-work/evidence/reopened-R01-C03-08.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R01-C03-08-native.png`）；R01-C03-25（历史路径：`repair-01-work/evidence/reopened-R01-C03-25.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R01-C03-25-native.png`）。

**R02｜已修复：右袖口附着壁／自由垂片假横缝与白尖齿**

相关实际层为 7 `outer_robe/left_sleeve/rear_cuff_drape/cuff_attachment_wall`、6 `outer_robe/left_sleeve/rear_cuff_drape/free_curled_drape`、26 `outer_robe/left_sleeve/front_sleeve_wall`。在 x640–800、y695–835 清理 6 上根假卷口、约 (720,790) 的白尖齿和 7 的外露截边，重接蓝料纵褶及短根部覆盖，协调 26 的真实袖口包边。6 与 7 继续分层，未将自由垂片合回附着壁。

独显检查本片根部内容；隐藏上层检查短搭接和下垂褶面；合成检查横向拆分线不再作为新衣边外露。真实白弧、侧缘回卷、下垂纹样和开口保留；返面较参考圆。最终证据：R02-06（历史路径：`repair-01-work/evidence/reopened-R02-06.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R02-06-native.png`）；R02-07（历史路径：`repair-01-work/evidence/reopened-R02-07.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R02-07-native.png`）；R02-26（历史路径：`repair-01-work/evidence/reopened-R02-26.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R02-26-native.png`）。

**R03｜已修复：两侧前襟尾卷被截薄与包边不连续**

相关实际层为 27 `outer_robe/right_front_panel`、28 `outer_robe/left_front_panel::front_main`。按参考恢复左端 x95–190、y1370–1400 和右端 x835–932、y1370–1400 的回返衣面、圆转趋势及白色包边，同时整理右侧 x795–835、y1410–1425 的相邻波形下缘。补修 28 的 x848–866、y1394–1398 小缺口，清除 27 的 x93–117、y1351–1357 游离椭圆点。

独显看到真实返面和连续边线；隐藏上层及全部叠加确认尾卷接续，不以封闭卷口空气间隙补布。左端返面比原图略宽、较平，右侧局部包边略重，已记录而不称完全一致。17 全层和 28 腰部保护框未动。最终证据：R03-left-27（历史路径：`repair-01-work/evidence/reopened-R03-left-27.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R03-left-27-native.png`）；R03-right-28（历史路径：`repair-01-work/evidence/reopened-R03-right-28.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R03-right-28-native.png`）。

**R04｜已修复：内裙下摆回折咬口及前后片包边突变**

相关实际层为 10 `inner_dress/skirt_side_back`、11 `inner_dress/skirt_front`。在 x430–600、y1340–1365 逐处补接回返衣料和细白包边、清理缺口与台阶，最后沿指定转弧小范围使用 Blender Blur，未添加下摆暗影或统一羽化。

两片分别独显、隐藏上层及合成检查圆转与交接，保留正常下摆空隙、裙褶和花纹。约 (565,1340) 的 10 隐藏边界尖端在合成中被覆盖，保留其隐藏衣料；部分包边仍较参考厚。末轮局部抗锯齿记录：末轮转弧处理（历史路径：`repair-01-work/audit/final-arc-antialias.json`）。最终证据：R04-left-10（历史路径：`repair-01-work/evidence/reopened-R04-left-10.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R04-left-10-native.png`）；R04-left-11（历史路径：`repair-01-work/evidence/reopened-R04-left-11.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R04-left-11-native.png`）；R04-right-10（历史路径：`repair-01-work/evidence/reopened-R04-right-10.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R04-right-10-native.png`）；R04-right-11（历史路径：`repair-01-work/evidence/reopened-R04-right-11.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R04-right-11-native.png`）。

**R05｜已修复：蓝长幅碎边和双肩台阶**

相关实际层为 14 `waist_sash/left_long_tail`、33 `outer_robe/collar_shoulders/right_shoulder_cover`、34 `outer_robe/collar_shoulders/left_shoulder_cover`。沿 14 的 x568–600、y988–1145 外长缘及两肩浅斜上弧逐处整理窄过渡和白线走势。本轮 33、34 确有像素修改，分别为 213 和 199 像素；旧报告“肩部试画无变化”仅描述 draw 阶段，已更新。

独显检查碎齿和台阶，隐藏上层排除珠链、前领遮挡影响，合成检查肩部透明层次、白包边及蓝幅邻边。没有全层模糊或改变大轮廓。最终证据：R05-blue-14（历史路径：`repair-01-work/evidence/reopened-R05-blue-14.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R05-blue-14-native.png`）；R05-shoulderL-33（历史路径：`repair-01-work/evidence/reopened-R05-shoulderL-33.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R05-shoulderL-33-native.png`）；R05-shoulderR-34（历史路径：`repair-01-work/evidence/reopened-R05-shoulderR-34.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R05-shoulderR-34-native.png`）。

**C01｜已判断并修复：左袖与前襟之间缺失衣料**

该处包含真实蓝色袖料及浅色前襟返面，不是应全部挖空的投影。依用户最新授权修正 KRA 局部范围：蓝色连续衣料归 8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`；浅色回返归 27 `outer_robe/right_front_panel`；25 保持前袖壁职责，没有把袖料画进前襟。沿 x400–450、y400–650 缺口逐段补画纹理、明暗和接边，另修 x434–436、y424–436 的细小接续。

独显确认两种衣料分别属于本层；隐藏上层确认隐藏衣料继续存在；叠加后宽透明楔形被合理衣面与窄折缝替代，保留外部真实空白。蓝色褶面比参考略宽、细节较简。修改约束坐标见下方记录和 衣料接续（历史路径：`repair-01-work/audit/c01-c02-material-continuity.json`）、细小接点修补（历史路径：`repair-01-work/audit/measured-last-joins.json`）。最终证据：C01-upper-08（历史路径：`repair-01-work/evidence/reopened-C01-upper-08.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-C01-upper-08-native.png`）；C01-upper-27（历史路径：`repair-01-work/evidence/reopened-C01-upper-27.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-C01-upper-27-native.png`）；C01-lower-08（历史路径：`repair-01-work/evidence/reopened-C01-lower-08.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-C01-lower-08-native.png`）；C01-lower-27（历史路径：`repair-01-work/evidence/reopened-C01-lower-27.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-C01-lower-27-native.png`）。

**C02｜已判断并修复：右下内裙／前襟之间长楔形缺料**

原图该楔形是蓝灰裙面延续。本轮归 10 `inner_dress/skirt_side_back` 补画，11 `inner_dress/skirt_front` 整理自身错色条带与接边，28 `outer_robe/left_front_panel::front_main` 仅清理自身覆盖边，未将缺料全部并入外襟。范围约 x688–720、y1260–1360，并修约 (693,1258) 的尖接点。

独显与隐藏上层检查补齐后的裙料、自然藏接；全部叠加检查长透明楔口不再切断衣面，保留真实下摆间隙及裙／襟独立性。新褶面较原图简化。最终证据：C02-10（历史路径：`repair-01-work/evidence/reopened-C02-10.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-C02-10-native.png`）；C02-11（历史路径：`repair-01-work/evidence/reopened-C02-11.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-C02-11-native.png`）；C02-28（历史路径：`repair-01-work/evidence/reopened-C02-28.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-C02-28-native.png`）。

**C03｜已判断并修复：左袖口下方三角缺布**

原图 x333–375、y775–817 为袖口下方蓝色折返衣料，和真正袖口空气开口不同。本轮把下折返延续归 5 `outer_robe/right_sleeve/cuff_train`，与 8 的蓝色袖壁接续，配合 R01 去除假白片和假横缝；不新增一片横向封口。

独显看 5 自身蓝返面，隐藏上层看其与 8 的短接续，合成检查三角缺料及白色回边。真实袖口开口仍保留。具体笔刷限界与 R01 的最终证据共同见：R01-C03-05（历史路径：`repair-01-work/evidence/reopened-R01-C03-05.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R01-C03-05-native.png`）；R01-C03-08（历史路径：`repair-01-work/evidence/reopened-R01-C03-08.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-R01-C03-08-native.png`）。

**C04｜已判断并修复：右下尖纱人为截限**

4 `outer_robe/left_sleeve/side_pointed_gauze` 的旧 groups 已把该凹缺说明为父稿人为截限。按用户本轮允许局部修正范围的授权，恢复 x855–925、y1065–1175 连续浅纱，衣料仍归 4；6 的蓝色卷曲垂料不并入纱层。以低透明度同材质色逐处铺接、修边，清理 (866,1049)→(941,1133) 重复斜线及尖尾外缘小鼓出，没有将整片改为不透明。

独显在深浅底看透明层次及尖尾，隐藏上层检查与蓝垂料的接续，全部叠加检查人为大凹缺已补回。上方 x777–805、y800–833 的真实回卷空气开口保持；已有菱格和真实细边保留。新纱渐变较参考宽柔，是保留的质感差异。依据：薄纱局部渐变（历史路径：`repair-01-work/audit/c04-graded-gauze-repair.json`）、局部薄料重绘（历史路径：`repair-01-work/audit/c04-local-sheer-rebuild.json`）、尖尾透明度修整（历史路径：`repair-01-work/audit/tip-alpha-repair.json`）。最终证据：C04-04（历史路径：`repair-01-work/evidence/reopened-C04-04.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-C04-04-native.png`）。

**U01｜已逐段判断并修复：胸饰／雪花银线实体**

相关实际层为 39 `chest_ornament`、57 `waist_pendant/snowflake_pendant`。对照原图确认需要恢复的是卷枝、下伸卷脚、连接杆以及雪花上瓣和下方 V 形的银色实体，并非外围暗晕。分别重画窄银色材质芯和局部过渡；保持胸饰中央露空、雪花镂空、宝石和嵌色。没有把后方白衣或蓝幅画进饰件层。

胸饰左右连接杆逐条定位，笔画止于金属端点，未延长到前襟包边。最后连接芯使用 Basic-2 1.5 px、透明度 0.83、RGB(225,233,247)，局部 Blender Blur 2.8 px、透明度 0.2；没有统一增粗整件饰品。独显检查实体连续和内部空孔，隐藏上层及合成检查与挂接点的关系；雪花花瓣和下 V 银线同样完成三种显隐检查。记录：连接杆（历史路径：`repair-01-work/audit/u01-openwork-connectors.json`）、连接杆银芯（历史路径：`repair-01-work/audit/u01-connector-material-core.json`）。最终证据：U01-chestL-39（历史路径：`repair-01-work/evidence/reopened-U01-chestL-39.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U01-chestL-39-native.png`）；U01-chestR-39（历史路径：`repair-01-work/evidence/reopened-U01-chestR-39.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U01-chestR-39-native.png`）；U01-snow-57（历史路径：`repair-01-work/evidence/reopened-U01-snow-57.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U01-snow-57-native.png`）；胸饰完整原尺寸（历史路径：`repair-01-work/evidence/reopened-U01-complete-native.png`）；连接杆 400%（历史路径：`repair-01-work/evidence/reopened-U01-connectors-4x.png`）。

**U02｜已逐件判断并修复：八个小饰件的实体范围差异**

已分别对照原图判断浅银实体和外部阴影，补回本件细小端头／侧缘；未按坐标一律扩宽。具体为：46 `upper_flexible_neck` 的 y605.7–608.7 连接末段；48 `upper_chain` 的 x509–514、y667–668；49 `lower_bead_link` 的 y781 两侧；52 `central_diamond_pendant` 的 y834–837；54 `middle_bead` 的 x508–509.5／512.5–514、y606–608；58 `elongated_silver_link` 的 y724–727；59 `upper_bead_link` 的 x507–510、y713–716；61 `teardrop_pendant` 的 x508–510／514–517、y788–792。完整实际 ID 见逐层表。

这些内容均继续归原有饰件层；46 按参考将连接实体延续至原文字端点附近，不再把 y605.7 的 SVG 截止机械当作绘画终点。各件独显检查自身银料、端头和孔隙，隐藏上层及全部叠加检查链体连续、覆盖正确，没有补外围投影或后方衣料。52 较浅柔、58 上肩较厚浅的差异保留记录。最终八件证据：U02-46（历史路径：`repair-01-work/evidence/reopened-U02-46.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U02-46-native.png`）；U02-48（历史路径：`repair-01-work/evidence/reopened-U02-48.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U02-48-native.png`）；U02-49（历史路径：`repair-01-work/evidence/reopened-U02-49.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U02-49-native.png`）；U02-52（历史路径：`repair-01-work/evidence/reopened-U02-52.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U02-52-native.png`）；U02-54（历史路径：`repair-01-work/evidence/reopened-U02-54.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U02-54-native.png`）；U02-58（历史路径：`repair-01-work/evidence/reopened-U02-58.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U02-58-native.png`）；U02-59（历史路径：`repair-01-work/evidence/reopened-U02-59.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U02-59-native.png`）；U02-61（历史路径：`repair-01-work/evidence/reopened-U02-61.png`） / 原尺寸（历史路径：`repair-01-work/evidence/reopened-U02-61-native.png`）。

**附带局部清理**

2 `outer_robe/right_sleeve/outer_side_gauze` 在 x218–247、y781–811 整理本层袖口残边，保留透明料和正常空口。最终实际变化包围框为 `[213,780,250,815)`。本轮共 25 层改变、44 层像素保留；数字以 review 基线为比较对象，不是相对 step01 的累计改动数。

**局部归属修正及坐标记录**

坐标系统一为 1024×1536 原画布、左上原点、x 向右、y 向下，单位为原图像素。下面是实际操作计划使用的局部多边形限界，不是对最终衣片轮廓的重新矢量化；笔画、软边和 alpha 过渡只占其中部分。最终实际改动的包围框另列，具体笔画、笔径、颜色、透明度及选区保存在 `repair-01-work/audit/` 各组记录和 `plans/`，输入 SVG/metadata 未修改。

| 项目与归属 | 实际使用的局部限界有序坐标 |
| --- | --- |
| C01 蓝袖料 → 8 | `[[421,385],[431,385],[433,413],[444,450],[451,474],[450,498],[446,523],[436,550],[424,579],[411,614],[398,650],[392,675],[365,675],[376,632],[390,583],[402,539],[411,496],[417,450],[420,415]]` |
| C01 浅色返面 → 27 | `[[428,391],[433,391],[438,422],[447,451],[453,478],[451,500],[448,521],[434,549],[418,577],[399,600],[401,587],[412,559],[423,530],[434,500],[441,479],[443,467],[436,443],[430,419]]` |
| C02 裙料 → 10 | `[[689,1247],[700,1255],[706,1276],[716,1303],[729,1334],[732,1360],[717,1367],[707,1340],[694,1305],[685,1276]]` |
| C03 下蓝返面 → 5 | `[[365,757],[377,752],[387,749],[385,766],[382,785],[378,806],[373,824],[367,838],[364,832],[365,818]]` |
| C04 薄纱 → 4 | `[[837,1040],[863,1045],[889,1071],[915,1101],[939,1139],[955,1187],[941,1174],[916,1158],[890,1130],[865,1096],[843,1070]]` |
| C04 外缘小鼓出清理 → 4 | `[[953.8,1140],[955,1147],[955.7,1154],[956.2,1160],[956.8,1164],[965,1172],[968,1137]]` |

U01 胸饰左卷枝笔画中心线为 `[[450.2,411.2],[454.4,412.5],[458.7,411.9],[463.6,409.1],[469,404.8],[473.4,401.7],[477,401],[482.5,402.3]]`；左下卷脚为 `[[484,411.5],[480.6,414.1],[479.9,418.5],[480.7,424],[482.2,428.7],[481.8,432.6],[479.9,436],[476.5,439.4],[471.5,442.8]]`；右侧按 x→1024−x 对应处理。最后两条左连接杆为 `[[453.7,392.5],[452.9,396],[452.2,401],[452.1,407],[452.1,410.9]]` 及 `[[472.9,405.5],[472.3,412],[472.2,421],[472.3,431],[472.3,440.9]]`，右侧同样镜像定位。它们是实际笔画路径，不是扩大整个胸饰的统一偏移线。

本轮 KRA 的 C01–C04、U01–U02 局部内容因此可能超过旧 SVG 支持范围；这正是用户已授权的原图依据修正。旧输入保持只读，实际归属在本报告记录。没有用这些局部修正改变全局层序或已批准腰部拆片。


**逐层结果及最终检查文件**

以下索引为工程从后到前、从 0 开始。独显是全画布透明 PNG；“隐藏上层”保留本层和所有更后方的层。局部 34 张板为 REF / SOLO / BELOW / ALL 对照，既检查本片的外缘及补全，也检查组合接续。全部 69 层的完整记录均列出；44 层“保留”指本轮没有覆盖先前有效像素。

| 后→前索引 | 实际完整图层名 | 本轮处理与检查结果 | 最终重开导出 |
| ---: | --- | --- | --- |
| 0 | `outer_robe/collar_shoulders/standing_collar/side_back_collar` | 本轮像素保留。后领完整，领口与前领独立。 | 独显（历史路径：`repair-01-work/exports/reopened-final/00.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-00.png`） |
| 1 | `waist_sash/circumferential_band/side_back_band` | 本轮像素保留。保留已做的后腰带边缘修画及完整带面。 | 独显（历史路径：`repair-01-work/exports/reopened-final/01.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-01.png`） |
| 2 | `outer_robe/right_sleeve/outer_side_gauze` | 附带清理：自身纱袖口 x218–247、y781–811 的局部残边；保持半透明衣料。 | 独显（历史路径：`repair-01-work/exports/reopened-final/02.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-02.png`） |
| 3 | `outer_robe/left_sleeve/outer_flared_gauze` | 本轮像素保留。外展纱的薄料、细尖和开口保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/03.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-03.png`） |
| 4 | `outer_robe/left_sleeve/side_pointed_gauze` | C04：补回尖纱连续薄料、清理重复斜线及外尖局部鼓出；保留真实回卷开口。 | 独显（历史路径：`repair-01-work/exports/reopened-final/04.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-04.png`） |
| 5 | `outer_robe/right_sleeve/cuff_train` | R01/C03：清除假根部亮弧，续接蓝色纵褶及下折返衣料。 | 独显（历史路径：`repair-01-work/exports/reopened-final/05.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-05.png`） |
| 6 | `outer_robe/left_sleeve/rear_cuff_drape/free_curled_drape` | R02：修正自由垂片根部假卷口与白尖齿，恢复短蓝料藏接。 | 独显（历史路径：`repair-01-work/exports/reopened-final/06.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-06.png`） |
| 7 | `outer_robe/left_sleeve/rear_cuff_drape/cuff_attachment_wall` | R02：修正附着壁斜截边和横缝，与 6 续接；保持两片独立。 | 独显（历史路径：`repair-01-work/exports/reopened-final/07.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-07.png`） |
| 8 | `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall` | R01/C01：去除白叶形假翻片、续接蓝褶，局部延续袖侧蓝料。 | 独显（历史路径：`repair-01-work/exports/reopened-final/08.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-08.png`） |
| 9 | `outer_robe/left_sleeve/rear_sleeve_wall` | 本轮像素保留。后袖壁的隐藏接续、纹样和内侧料保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/09.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-09.png`） |
| 10 | `inner_dress/skirt_side_back` | R04/C02：恢复下摆圆转与包边，延续右下裙料楔形区。 | 独显（历史路径：`repair-01-work/exports/reopened-final/10.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-10.png`） |
| 11 | `inner_dress/skirt_front` | R04/C02：修正下摆咬口及包边、错色条带和接续。 | 独显（历史路径：`repair-01-work/exports/reopened-final/11.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-11.png`） |
| 12 | `inner_dress/bodice_front` | 本轮像素保留。内衣上身完整，未混入人体。 | 独显（历史路径：`repair-01-work/exports/reopened-final/12.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-12.png`） |
| 13 | `waist_sash/right_long_tail` | 本轮像素保留。另一蓝长幅根部、全长和纹样保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/13.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-13.png`） |
| 14 | `waist_sash/left_long_tail` | R05：沿蓝长幅窄边局部抗锯齿，保留纹样与邻边。 | 独显（历史路径：`repair-01-work/exports/reopened-final/14.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-14.png`） |
| 15 | `waist_pendant/upper_suspension/right_suspension_cord/rear_insertion_end` | 本轮像素保留。右挂绳藏后入端保留，与前弧独立。 | 独显（历史路径：`repair-01-work/exports/reopened-final/15.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-15.png`） |
| 16 | `waist_pendant/upper_suspension/left_suspension_cord/hidden_entry` | 本轮像素保留。左挂绳藏后入端保留，与前弧独立。 | 独显（历史路径：`repair-01-work/exports/reopened-final/16.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-16.png`） |
| 17 | `outer_robe/left_front_panel::back_under_front_band` | 本轮像素保留。批准前襟后分片全层未变，仍在前腰带后。 | 独显（历史路径：`repair-01-work/exports/reopened-final/17.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-17.png`） |
| 18 | `waist_sash/circumferential_band/front_band` | 本轮像素保留。前腰带全层未变，夹在批准前襟两分片之间。 | 独显（历史路径：`repair-01-work/exports/reopened-final/18.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-18.png`） |
| 19 | `waist_sash/front_tie/right_short_loop` | 本轮像素保留。右短环自身回返与开口保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/19.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-19.png`） |
| 20 | `waist_sash/front_tie/left_short_loop` | 本轮像素保留。左短环自身回返与开口保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/20.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-20.png`） |
| 21 | `waist_sash/front_tie/bound_tassel` | 本轮像素保留。束流苏根部和末梢保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/21.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-21.png`） |
| 22 | `waist_pendant/upper_suspension/right_suspension_cord/front_arc_cord` | 本轮像素保留。右挂绳前弧保留，与藏后入端独立。 | 独显（历史路径：`repair-01-work/exports/reopened-final/22.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-22.png`） |
| 23 | `waist_pendant/upper_suspension/left_suspension_cord/front_arc` | 本轮像素保留。左挂绳前弧保留，与藏后入端独立。 | 独显（历史路径：`repair-01-work/exports/reopened-final/23.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-23.png`） |
| 24 | `waist_sash/front_tie/knot_core` | 本轮像素保留。结芯的衣料和覆盖关系保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/24.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-24.png`） |
| 25 | `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall` | R01：去掉重复下缘亮边，保留真实袖口上弧及开口。 | 独显（历史路径：`repair-01-work/exports/reopened-final/25.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-25.png`） |
| 26 | `outer_robe/left_sleeve/front_sleeve_wall` | R02：协调真实袖口包边及蓝料搭接，局部抗锯齿。 | 独显（历史路径：`repair-01-work/exports/reopened-final/26.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-26.png`） |
| 27 | `outer_robe/right_front_panel` | R03/C01：恢复尾端回返衣面和包边、补齐自身浅色折返，清除游离椭圆点。 | 独显（历史路径：`repair-01-work/exports/reopened-final/27.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-27.png`） |
| 28 | `outer_robe/left_front_panel::front_main` | R03/C02：恢复尾卷和连续包边、清理自身下缘；腰部保护框未变。 | 独显（历史路径：`repair-01-work/exports/reopened-final/28.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-28.png`） |
| 29 | `collar_fastener/right_collar_chain` | 本轮像素保留。右领链细线及连接保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/29.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-29.png`） |
| 30 | `collar_fastener/left_collar_chain` | 本轮像素保留。左领链细线及连接保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/30.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-30.png`） |
| 31 | `collar_fastener/right_chest_chain` | 本轮像素保留。右胸链細线及连接保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/31.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-31.png`） |
| 32 | `collar_fastener/left_chest_chain` | 本轮像素保留。左胸链細线及连接保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/32.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-32.png`） |
| 33 | `outer_robe/collar_shoulders/right_shoulder_cover` | R05：肩上弧实际局部抗锯齿；不再沿用旧报告的“试画无变化”。 | 独显（历史路径：`repair-01-work/exports/reopened-final/33.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-33.png`） |
| 34 | `outer_robe/collar_shoulders/left_shoulder_cover` | R05：另一侧肩上弧实际局部抗锯齿，保留透明层次。 | 独显（历史路径：`repair-01-work/exports/reopened-final/34.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-34.png`） |
| 35 | `outer_robe/collar_shoulders/standing_collar/right_front_collar` | 本轮像素保留。右前领与后领分开，正常领口保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/35.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-35.png`） |
| 36 | `outer_robe/collar_shoulders/standing_collar/left_front_collar` | 本轮像素保留。左前领与后领分开，正常领口保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/36.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-36.png`） |
| 37 | `collar_fastener/central_clasp/hanging_junction` | 本轮像素保留。吊结实体尖端和连接保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/37.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-37.png`） |
| 38 | `collar_fastener/central_clasp/clasp_body` | 本轮像素保留。中央扣体边缘和内部细线保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/38.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-38.png`） |
| 39 | `chest_ornament` | U01：逐段恢复银色卷枝、下伸卷脚和连接杆实体，保留镂空。 | 独显（历史路径：`repair-01-work/exports/reopened-final/39.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-39.png`） |
| 40 | `waist_pendant/long_white_tassel` | 本轮像素保留。保留已有流苏根帽修画、长丝和细尖。 | 独显（历史路径：`repair-01-work/exports/reopened-final/40.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-40.png`） |
| 41 | `waist_pendant/lotus_coupler/lower_ring_connector/rear_insertion_return` | 本轮像素保留。下圈连接后返入端独立保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/41.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-41.png`） |
| 42 | `waist_pendant/double_ring_chain/upper_inner_drop` | 本轮像素保留。上圈内垂件与圈体分开保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/42.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-42.png`） |
| 43 | `waist_pendant/double_ring_chain/lower_inner_drop` | 本轮像素保留。下圈内垂件与圈体分开保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/43.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-43.png`） |
| 44 | `waist_pendant/double_ring_chain/inter_ring_link/rear_threaded_stem` | 本轮像素保留。圈间藏后穿杆独立保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/44.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-44.png`） |
| 45 | `waist_pendant/tassel_buckle/ring_return_back` | 本轮像素保留。流苏扣后返环与前扣体分开，孔隙保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/45.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-45.png`） |
| 46 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/upper_flexible_neck` | U02：恢复上柔性短颈末段银色实体至参考连接位置。 | 独显（历史路径：`repair-01-work/exports/reopened-final/46.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-46.png`） |
| 47 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/lower_flexible_neck` | 本轮像素保留。下柔性短颈和接续保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/47.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-47.png`） |
| 48 | `waist_pendant/lower_silver_strand/upper_chain` | U02：补足上银链末段实体与连续接头。 | 独显（历史路径：`repair-01-work/exports/reopened-final/48.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-48.png`） |
| 49 | `waist_pendant/lower_silver_strand/lower_bead_link` | U02：补足下珠链接头两侧自身银料。 | 独显（历史路径：`repair-01-work/exports/reopened-final/49.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-49.png`） |
| 50 | `waist_pendant/lotus_coupler/right_side_link` | 本轮像素保留。莲体右侧链独立保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/50.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-50.png`） |
| 51 | `waist_pendant/lotus_coupler/left_side_link` | 本轮像素保留。莲体左侧链独立保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/51.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-51.png`） |
| 52 | `waist_pendant/lotus_coupler/central_diamond_pendant` | U02：恢复菱形吊件下部银侧实体；仍略偏浅、偏柔。 | 独显（历史路径：`repair-01-work/exports/reopened-final/52.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-52.png`） |
| 53 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/terminal_bead` | 本轮像素保留。末端珠自身珠面和连接保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/53.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-53.png`） |
| 54 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/middle_bead` | U02：修复中珠自身两侧浅银材质。 | 独显（历史路径：`repair-01-work/exports/reopened-final/54.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-54.png`） |
| 55 | `waist_pendant/upper_suspension/junction_linkage/diamond_bead` | 本轮像素保留。菱珠尖端、珠面与连接保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/55.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-55.png`） |
| 56 | `waist_pendant/upper_suspension/junction_linkage/junction_knot` | 本轮像素保留。汇合结完整保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/56.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-56.png`） |
| 57 | `waist_pendant/snowflake_pendant` | U01：恢复雪花上瓣及下方 V 形银线的实体连续性，保留细孔。 | 独显（历史路径：`repair-01-work/exports/reopened-final/57.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-57.png`） |
| 58 | `waist_pendant/lower_silver_strand/elongated_silver_link` | U02：恢复长银链上肩银料；仍略偏厚、偏浅。 | 独显（历史路径：`repair-01-work/exports/reopened-final/58.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-58.png`） |
| 59 | `waist_pendant/lower_silver_strand/upper_bead_link` | U02：恢复上珠链左上肩自身银料。 | 独显（历史路径：`repair-01-work/exports/reopened-final/59.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-59.png`） |
| 60 | `waist_pendant/lotus_coupler/silver_hanger` | 本轮像素保留。银吊架自身边缘、尖端和接续保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/60.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-60.png`） |
| 61 | `waist_pendant/lower_silver_strand/teardrop_pendant` | U02：恢复水滴件两侧浅银斜缘与连接。 | 独显（历史路径：`repair-01-work/exports/reopened-final/61.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-61.png`） |
| 62 | `waist_pendant/double_ring_chain/lower_ring_body` | 本轮像素保留。下圈体内外缘及真实环孔保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/62.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-62.png`） |
| 63 | `waist_pendant/double_ring_chain/inter_ring_link/lower_front_head` | 本轮像素保留。圈间下前露头与后穿杆分开保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/63.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-63.png`） |
| 64 | `waist_pendant/double_ring_chain/upper_ring_body` | 本轮像素保留。上圈体内外缘、真实环孔和自身高光保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/64.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-64.png`） |
| 65 | `waist_pendant/double_ring_chain/inter_ring_link/upper_front_head` | 本轮像素保留。圈间上前露头与后穿杆分开保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/65.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-65.png`） |
| 66 | `waist_pendant/lotus_coupler/lower_ring_connector/front_connector_tip` | 本轮像素保留。下圈连接前尖端与后返入端分开保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/66.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-66.png`） |
| 67 | `waist_pendant/lotus_coupler/lotus_body` | 本轮像素保留。莲瓣、金属包边和独立侧接保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/67.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-67.png`） |
| 68 | `waist_pendant/tassel_buckle/buckle_front` | 本轮像素保留。流苏扣前体、翼尖与后返环分开保留。 | 独显（历史路径：`repair-01-work/exports/reopened-final/68.png`） / 隐藏上层（历史路径：`repair-01-work/exports/reopened-final/below-68.png`） |

**本轮实际改动范围**

下表为相对 review 基线的变化像素包围框，右／下界不包含。框内可包含分散笔画，绝不表示整框涂抹或模糊。数量仅用于审计范围，不能替代视觉验收。

| 索引 | 变化像素数 | 原画布变化包围框 `[x0,y0,x1,y1)` |
| ---: | ---: | --- |
| 2 | 971 | `[213, 780, 250, 815]` |
| 4 | 18792 | `[796, 985, 960, 1213]` |
| 5 | 14203 | `[232, 703, 393, 861]` |
| 6 | 15441 | `[641, 700, 795, 861]` |
| 7 | 17826 | `[639, 693, 796, 861]` |
| 8 | 29703 | `[228, 365, 460, 861]` |
| 10 | 3426 | `[514, 1247, 732, 1367]` |
| 11 | 1721 | `[431, 1253, 722, 1369]` |
| 14 | 538 | `[572, 979, 589, 1147]` |
| 25 | 830 | `[233, 697, 379, 783]` |
| 26 | 698 | `[646, 697, 788, 740]` |
| 27 | 12481 | `[93, 383, 464, 1396]` |
| 28 | 1468 | `[696, 1272, 931, 1430]` |
| 33 | 213 | `[410, 298, 459, 314]` |
| 34 | 199 | `[571, 302, 618, 315]` |
| 39 | 721 | `[440, 392, 583, 444]` |
| 46 | 12 | `[510, 603, 512, 609]` |
| 48 | 11 | `[509, 666, 514, 669]` |
| 49 | 20 | `[507, 779, 515, 783]` |
| 52 | 26 | `[507, 832, 515, 838]` |
| 54 | 16 | `[508, 605, 515, 609]` |
| 57 | 629 | `[489, 622, 533, 665]` |
| 58 | 27 | `[507, 723, 515, 727]` |
| 59 | 11 | `[507, 712, 511, 716]` |
| 61 | 22 | `[507, 788, 517, 793]` |

**批准拆片与穿插职责保留**

`outer_robe/left_front_panel::back_under_front_band`（17）和 `outer_robe/left_front_panel::front_main`（28）共同属于逻辑父 part `outer_robe/left_front_panel`，共同随动，仍是两个普通独立绘画层。实际后→前关系为 17 → 18 `waist_sash/circumferential_band/front_band` → 28；相邻顺序保留 16→17→18 和 27→28→29。没有新建绑定、动画或独立可动部件。

按已批准的 [split-plan.json](../step01/split-test/split-plan.json) 保留折线：`[[561,489],[561.8,494],[564.4,502],[567.1,510],[570.6,520],[574.6,530],[565,531],[548,532.5],[531.4,533.5]]`。前五段左侧归后片、右侧归前片；后三段上侧归后片、下侧归前片。后片 1.5 px 接缝支撑及前片边界两侧各 0.5 px 过渡不变。17 全层及 28 的腰部 `528,488,585,552)` 与 review 基线逐像素相同。A=(545,509) 保持蓝腰带在前，B=(570,509) 保持白襟在前；整段腰带、襟边及隐藏腰带后的接续一并检查。证据：[腰部组合（历史路径：`repair-01-work/evidence/reopened-waist.png`）、拆片与接续（历史路径：`repair-01-work/evidence/reopened-waist-split.png`）、隐藏前腰带（历史路径：`repair-01-work/exports/reopened-final/waist-without-front-band.png`）。

step01 旧报告关于左右前襟相互先后的个别文字与实际索引方向不一致；本轮沿用批准工程和 split-plan 的实际顺序，没有据该句重排。其余袖管前后壁、后袖口附着壁/自由垂片、前后领、前后腰带、挂绳藏后端/前弧、圈间后穿杆/前露头、下圈连接后返端/前尖端、流苏扣后返环/前扣体均保持独立。正常领口、袖口、纱卷空气开口、胸饰镂空和环孔保留；没有人体或人体占位层，没有身体装配或动画验证。

**试画失败与回退记录**

QtTest 在当前环境不可用，实际改用 Qt 鼠标事件。早期橡皮状态不一致的笔画已纠正，后续每笔断言实际橡皮状态，见 橡皮纠正记录（历史路径：`repair-01-work/audit/correct-failed-eraser.json`）。脚本中名为 `precise` 的预设 XML 修改没有被选为实际预设，不能把它描述成成功提高精度；最终质量依据实际像素和看图，双肩确有最终变化。

过重／错位的金属笔画和部分裙边、纱尖试画已回退至本轮自身衣片检查点再修，不以失败试画作最终成果。记录包括 局部试画回退（历史路径：`repair-01-work/audit/restore-two-trials.json`）、雪花试画回退（历史路径：`repair-01-work/audit/snowflake-core-trial-undo.json`）、胸饰错位试画回退（历史路径：`repair-01-work/audit/chest-misaligned-trial-undo.json`）。所用回退像素来自本工程自身检查点，不是纯衣服原图贴片；最后重开导出和哈希反映实际保留结果。没有生图请求，因此本轮没有生成拒绝或生成失败记录。

**视觉差异与检查边界**

仍有可见的绘画差异，应与“反馈未处理”区分记录：C01 新接续褶面较原图宽、结构较简；R01/R02 的折返与纵褶也有简化，右袖返面更圆；R03 左尾卷略宽、略平，右侧局部白包边偏厚；R04 部分转角包边仍较原图重；C04 薄纱渐变范围较宽、较柔，未逐像素复制原图；U02 的 52 银料偏浅柔、58 上肩略厚且偏浅。它们是完成本轮局部补画后保留的还原度差异，不能据此声称与参考完全一致。

全图约 (309,1100) 的继承角状空隙仍可见，位于本轮反馈定位之外，未在本轮改画，也不写作已修复。图层 10 独显时约 (565,1340) 的藏后边界尖端仍保留，全部叠加时被相邻裙片覆盖，不作为新增可见装饰。其余 44 层保留 review 基线像素，包含 draw 阶段的有效修改。这里没有宣称整套绘画所有历史差异已消除，也没有代替下一次独立 review 作结论。

**保存重开及交付核对**

最后一次修画后，已保存、关闭并从同一路径重新打开 `step02/clothing-soft-edges.kra`。重开记录（历史路径：`repair-01-work/audit/repair-reopen-final.json`） 确认 69 层名称、顺序、类型、子节点数、透明度和混合模式与预期一致；均为平级普通 paintlayer、无蒙版、无子节点，最终全部可见。69 层全画布像素和合成投影在保存关闭前后相同。画布保持 1024×1536，RGBA/U8，`sRGB-elle-V2-srgbtrc.icc`，原 x/yRes 7200 不变。

最终从重开工程导出全画布透明独显 `00.png`–`68.png`、隐藏上层状态 `below-00.png`–`below-68.png` 和合成，位于 最终导出目录（历史路径：`repair-01-work/exports/reopened-final`）。[composite.png](composite.png) 与该次重开的合成导出一致；Krita 重开画面（历史路径：`repair-01-work/evidence/repair-reopened-krita.png`） 留存。原尺寸全图在 浅底（历史路径：`repair-01-work/evidence/reopened-native-light.png`） 和 深底（历史路径：`repair-01-work/evidence/reopened-native-dark.png`） 对照；重点区域在原尺寸及 300%/400% 检查，34 张原图/独显/隐藏上层/合成板见 证据清单（历史路径：`repair-01-work/audit/reopened-evidence-manifest.json`）。这些导出支持检查，不把“文件已导出”单独作为“逐层已看过”的证明；绘制时的逐层检查及本轮相关层显隐检查共同构成本次自检。

最终辅助核对（历史路径：`repair-01-work/audit/final-delivery.json`） 记录本轮 25 层改变、44 层像素保留，69 层名称和相对顺序不变。2413 个受保护文件无改动、无缺失，包括 input、step01 绘画和 split-test；获准复用的 `step01/krita/` 活动桥接运行文件另计。原 review 和调度文件未修改。本轮原始 step02 基线工程、合成和报告保存在 baseline（历史路径：`repair-01-work/baseline`）。哈希只核实来源、改动范围及保存一致性，质量结论来自看图。

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| [clothing-soft-edges.kra](clothing-soft-edges.kra) | 12759956 | `cacf4827c19e81ef279c3be2fa6b6dc4f6dfc7367cc128d453ef1c3a3b3b11d6` |
| [composite.png](composite.png) | 971412 | `06e18f556956e7f779eb701eddf80ef44b9d76fdbab7f23adbde37bc30642dc8` |



已同步 [step02 总报告](report.md)。本次仅提交 step02-repair 的暂存报告 `repair-01.md.tmp`、修画工程和最终透明合成；未写正式 repair/review 报告或调度完成标记，未启动后续 review、repair 或其他阶段。
