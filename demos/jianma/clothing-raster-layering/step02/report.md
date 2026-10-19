状态：step02 第二轮修复完成；R2-01–R2-10 已修复并完成自检，最终 KRA 已保存关闭重开。

本次对 [review-02.md](review-02.md) 的 R2-01–R2-10 均已作实际修画或保留本轮已经合格的处理，并完成相关图层独显、隐藏上方层及全部叠加自检。此结论对应当前保存重开的工程与下列证据，不是以文件存在、哈希一致或报告文字替代看图。

继续的是现有 [clothing-soft-edges.kra](clothing-soft-edges.kra)，没有从 step01 覆盖重来。第二轮早段 g01–g19 的合格内容、接续 g20–g35 和最终 g36 均按实际保留结果汇总；早段“仍有问题”的报告快照保留在 接续基线（历史路径：`repair-02-continuation/baseline/report.md`）。只更新当前绘制报告及指定 repair 暂存报告，没有写正式 review／repair 报告。

绘画参考仅为 [clothing.png](../../clothing-part-layering/references/clothing.png)，职责核对使用 [groups.json](../../clothing-part-layering/groups.json)、[occlusion.json](../../clothing-part-layering/occlusion.json)、[parts](../../clothing-part-layering/parts) 和 [step01 报告](../step01/report.md)。本轮依据用户授权局部纠正轮廓及补齐同片衣料，输入与批准拆层资料保持只读；没有粘贴参考像素、使用角色贴图、新增人体、AO 或投影。本次无需补全生图。

实际笔画由专用 DISPLAY=:108 的 Krita 执行。Python bridge 负责定位画布、选择图层、设置本次局部笔刷和发送笔画操作；没有用阈值、全层模糊或自动栅格填色替代绘画。局部选区在操作后清除，没有留成交付蒙版。每组保存、前后单层、BELOW 和组合导出见 操作记录（历史路径：`repair-02-continuation/logs`）、笔画计划（历史路径：`repair-02-continuation/plans`） 与 绘画审计（历史路径：`repair-02-continuation/audit`）。

坐标为 1024×1536 画布，左上原点、x 向右、y 向下；索引为 KRA 从后到前的 0 起顺序。最终检查板包含 REFERENCE／SOLO／BELOW／ALL，BELOW 为本层及全部更后方层；灰底与深浅底只用于检查透明度。每项均有原尺寸以及 3×／4× 局部，全部画面另以原尺寸检查。

**R2-01｜右腰侧后带外露与透明裂口：已修复**

图层：1 `waist_sash/circumferential_band/side_back_band`；9 `outer_robe/left_sleeve/rear_sleeve_wall`；28 `outer_robe/left_front_panel::front_main`。位置：x560–626、y450–610。

实际处理：保留先前已完成的 9 蓝袖料藏接与窄褶修画。补回属于后袖壁的连续蓝料，使后腰带侧端藏在自身应有的袖／襟界面之后；没有裁掉或移走 1，也没有用腰带填裂口。本次接续没有再改这组已经合格的像素。

自检结果：9 独显时补料与原袖壁相连，没有蓝白腰带斜纹；BELOW 9 及全部叠加时旧条端和其下破口不再外露。隐藏 1 后对比确认袖料连续性来自 9，不依赖后带遮盖。28 的批准腰部像素不变，A/B 的前后关系保持。 后腰带完整、窄折缝和袖／襟分层保留。

证据：1：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-01-01-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-01-01.png`）；9：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-01-09-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-01-09.png`）；28：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-01-28-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-01-28.png`）；waist-sash-hidden.png（历史路径：`repair-02-continuation/evidence/waist-sash-hidden.png`）；approved-split-preserved.png（历史路径：`repair-02-continuation/evidence/approved-split-preserved.png`）。

笔画记录：g01-waist-and-lapel-joins（历史路径：`repair-02-work/plans/g01-waist-and-lapel-joins.json`）；g09-local-material-and-root-cleanup（历史路径：`repair-02-work/plans/g09-local-material-and-root-cleanup.json`）。

**R2-02｜左袖口回折厚块与内端收束：已修复**

图层：5 `outer_robe/right_sleeve/cuff_train`；8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`；25 `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall`。位置：x229–391、y697–844，延伸检查袖／襟接边至 y1101。

实际处理：在 8 中收窄内端回边及重复重白线，按转折逐段改变线宽；5 中重新衔接三角折面和细纵褶，修整根部藏接。沿约 (327.5,776)→(350,763)→(366.6,754.9)→(378,744.4) 的薄回边绘制，具体曲线、笔径和两层分配见笔画计划。

自检结果：5／8 独显及各自 BELOW 检查内端、三角面和纵褶；全部叠加后内端不再形成平头凸块，回边从细弧接入向下折面。另沿整段 5／27 接边检查，未因缩整根部重新出现断料。25 像素保留。 前轮补回的蓝料、正常袖口、真实外上白弧及下垂纹样保留，未恢复假白叶。

证据：5：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-02-05-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-02-05.png`）；8：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-02-08-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-02-08.png`）；5：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-02-05-join-05-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-02-05-join-05.png`）；27：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-02-05-join-27-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-02-05-join-27.png`）；broad-left-cuff.png（历史路径：`repair-02-continuation/evidence/broad-left-cuff.png`）；broad-left-full-join.png（历史路径：`repair-02-continuation/evidence/broad-left-full-join.png`）；compare-R2-02-05-join.png（历史路径：`repair-02-continuation/evidence/compare-R2-02-05-join.png`）。

笔画记录：g20-reference-cuff-returns（历史路径：`repair-02-continuation/plans/g20-reference-cuff-returns.json`）；g26-left-fold-and-sewn-roll-lip（历史路径：`repair-02-continuation/plans/g26-left-fold-and-sewn-roll-lip.json`）；g30-cuff-lips-and-root-ownership（历史路径：`repair-02-continuation/plans/g30-cuff-lips-and-root-ownership.json`）。

**R2-03｜右袖口交叉折边与附着根部：已修复**

图层：6 `outer_robe/left_sleeve/rear_cuff_drape/free_curled_drape`；7 `outer_robe/left_sleeve/rear_cuff_drape/cuff_attachment_wall`；26 `outer_robe/left_sleeve/front_sleeve_wall`。位置：x637–803、y691–878。

实际处理：以弯曲斜线恢复交叉折面，重接 6 的自由垂段和 7 的短附着根。外折曲线由约 (775,773.5) 经 (753.8,810)、(742.9,853) 至 (753.4,877.7)，相交折线经 (760.5,753)、(766.1,772) 至 (772,791)。7 的真实上弧局部向外校正约 2–5 px；清掉 6 中 y772 以上重复的上弧，使职责回到 7。

自检结果：6／7 分别独显时自由段、附着壁和隐藏接根各自连续，原来的宽圆鼓边已改为可读的交叉细折与窄蓝面。BELOW 与全部叠加的转向一致，无脱离衣片的试画线端。最终坐标核查确认 7 在 y805–870 没有游离白线；较大的改变包围框包含旧像素的删除，不能误读为该处仍有内容。 6／7 独立和根部搭接保留，26 未改，正常开口、上弧和长垂纹样保留。

证据：6：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-03-06-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-03-06.png`）；7：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-03-07-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-03-07.png`）；broad-right-cuff.png（历史路径：`repair-02-continuation/evidence/broad-right-cuff.png`）；sleeve-roots-light-dark.png（历史路径：`repair-02-continuation/evidence/sleeve-roots-light-dark.png`）；attachment-stray-coordinate-check.png（历史路径：`repair-02-continuation/evidence/attachment-stray-coordinate-check.png`）。

笔画记录：g24-reference-curves-corrected（历史路径：`repair-02-continuation/plans/g24-reference-curves-corrected.json`）；g30-cuff-lips-and-root-ownership（历史路径：`repair-02-continuation/plans/g30-cuff-lips-and-root-ownership.json`）；g31-crossing-fold-and-rounded-silver（历史路径：`repair-02-continuation/plans/g31-crossing-fold-and-rounded-silver.json`）。

**R2-04｜左上蓝袖／白襟返面过宽：已修复**

图层：8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`；27 `outer_robe/right_front_panel`；25 `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall`。位置：x398–460、y385–612，接点检查延至 y649。

实际处理：按可见原图重新核定白襟返面的转折、收束及边界，收整 27 的钝凸与过宽返带；8 保持自己的蓝色窄褶，分别绘制本层颜色和连续衣面。最终采用 y550 附近 x417.5 的边界，否决了过度内削到 x403.8 的试画；局部下接点续到原衣料，不挖回旧楔形裂口。

自检结果：27 独显的返面由上段转折渐收至下段；8 独显保留蓝褶，二者没有相互贴入对方颜色。BELOW 27、全部叠加及上半身较大范围对照中，旧膨大白带已收整，连接没有新空洞。 已补回的有效衣料保留；蓝袖仍属 8、白襟仍属 27，25 像素及前后袖层序不变。

证据：8：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-04-08-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-04-08.png`）；27：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-04-27-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-04-27.png`）；broad-left-upper-return.png（历史路径：`repair-02-continuation/evidence/broad-left-upper-return.png`）；return-lower-join.png（历史路径：`repair-02-continuation/evidence/return-lower-join.png`）。

笔画记录：g21b-complete-painted-interface（历史路径：`repair-02-continuation/plans/g21b-complete-painted-interface.json`）；g24-reference-curves-corrected（历史路径：`repair-02-continuation/plans/g24-reference-curves-corrected.json`）。

**R2-05｜左下狭缝方台与突兀收尖：已修复**

图层：5 `outer_robe/right_sleeve/cuff_train`；27 `outer_robe/right_front_panel`。位置：x280–355、y1025–1195，并核对上行至袖口的窄内缘。

实际处理：保留已经完成的斜收边重画，去掉 27 在约 x312–326、y1099–1121 的矩形凸台；在本片内接顺浅色返面，随后小笔径处理残留内部接缝。5 的自身内缘延至约 (306–310,1095)，连续收尖，不把袖垂料转移到前襟。

自检结果：5／27 独显、BELOW 和全部叠加均检查到末端。原方台已改为随布势的斜收形，浅蓝硬块及其上方断续不再保留；下段透明空气缝仍存在，没有用灰蓝块整缝填平。 正常下段空隙、袖垂纹样及袖／襟独立性保留；外围暗晕没有当衣料补回。

证据：5：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-05-05-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-05-05.png`）；27：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-05-27-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-05-27.png`）；broad-left-full-join.png（历史路径：`repair-02-continuation/evidence/broad-left-full-join.png`）；compare-R2-02-05-join.png（历史路径：`repair-02-continuation/evidence/compare-R2-02-05-join.png`）。

笔画记录：g03-lower-slit-and-gauze-fold（历史路径：`repair-02-work/plans/g03-lower-slit-and-gauze-fold.json`）；g18-slit-material-and-roll-lip（历史路径：`repair-02-work/plans/g18-slit-material-and-roll-lip.json`）；g19-slit-material-tone（历史路径：`repair-02-work/plans/g19-slit-material-tone.json`）；g25-roll-lip-and-slit-polish（历史路径：`repair-02-continuation/plans/g25-roll-lip-and-slit-polish.json`）。

**R2-06｜尖纱斜内折边与雾状接面：已修复**

图层：4 `outer_robe/left_sleeve/side_pointed_gauze`。位置：x837–958、y1040–1195；连同上端开口和整片查看。

实际处理：在保留低透明度纱面的基础上重建窄斜折边与尖端，局部调整过宽过渡，将细边接回原来的菱格纱面。最终保留真实的渐淡蓝纱，而不是把其低 alpha 面当作污雾整片擦掉；未使用统一阈值或全层模糊。

自检结果：4 独显深浅底均能辨认细斜折边、纱面和尖尾；BELOW／ALL 中不再仅剩一团宽柔过渡。纱面透底、菱格及正常开口仍可见，6 的实色蓝垂料没有并入。局部透明度与原图存在正常绘画差异，不以 alpha 数值吻合代替看图。 上端 777,800,806,834) 正常回卷开口像素完全不变；恢复的纱料未被删空或填实。

证据：4：[原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-06-04-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-06-04.png`）；gauze-light-dark.png（历史路径：`repair-02-continuation/evidence/gauze-light-dark.png`）；broad-gauze-whole.png（历史路径：`repair-02-continuation/evidence/broad-gauze-whole.png`）。

笔画记录：g10-single-gauze-face-and-openwork（历史路径：`repair-02-work/plans/g10-single-gauze-face-and-openwork.json`）；g17-gauze-optical-transition（历史路径：`repair-02-work/plans/g17-gauze-optical-transition.json`）；g22-gauze-and-curled-lips（历史路径：`repair-02-continuation/plans/g22-gauze-and-curled-lips.json`）。

**R2-07｜两侧前襟尾卷的返面与卷唇：已修复**

图层：27 `outer_robe/right_front_panel`；28 `outer_robe/left_front_panel::front_main`。位置：左 x90–205、y1340–1435；右 x795–945、y1325–1435。

实际处理：分别调整左端回返衣料的宽窄、浓淡和细唇边，解除整条均匀蓝带的平硬感。右端按曲线重接约 (844,1392) 的内折切线，去掉短台口，并把相邻下缘的平段接成波形；每一段使用对应笔径与透明度，不统一加粗白边。

自检结果：27／28 独显及 BELOW 检查返面、内折和波形边；全部叠加与原图对比时卷口连续圆转，旧小台口和下缘平段已收整。卷口内的空气间隙与半透明返面仍清楚。 尾卷补料、纹样与薄纱层次保留；17 全层及 28 的批准腰部未改。

证据：27：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-07-left-27-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-07-left-27.png`）；28：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-07-right-28-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-07-right-28.png`）；broad-hem.png（历史路径：`repair-02-continuation/evidence/broad-hem.png`）。

笔画记录：g22-gauze-and-curled-lips（历史路径：`repair-02-continuation/plans/g22-gauze-and-curled-lips.json`）；g25-roll-lip-and-slit-polish（历史路径：`repair-02-continuation/plans/g25-roll-lip-and-slit-polish.json`）；g26-left-fold-and-sewn-roll-lip（历史路径：`repair-02-continuation/plans/g26-left-fold-and-sewn-roll-lip.json`）；g29-right-wave-curvature（历史路径：`repair-02-continuation/plans/g29-right-wave-curvature.json`）。

**R2-08｜中央前后裙包边转角：已修复**

图层：10 `inner_dress/skirt_side_back`；11 `inner_dress/skirt_front`。位置：x430–604、y1330–1375。

实际处理：在 10／11 各自图层中按转折位置重画细缝边，收薄白块并衔接左右回钩切线。最终自检又在约 x463–475、y1340–1344 发现前片台阶使后返面小尖外露，因此仅用 11 自身材质续接前片约 4 px 宽的边缘过渡及 1.1 px 细边，没有删掉 10 的隐藏衣料。

自检结果：10／11 独显、BELOW 及全部叠加核查两钩和相接处，白块与粗细跳变已收整，末次小凸点也由连续前片接边解决。真实下方空气间隙、裙褶和波形仍在，独显中的合理隐藏尖端保留。 10 在约 (565,1340) 的隐藏尖端保留；C02 区域在 10／11／28 均未改动；前后裙继续独立。

证据：10：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-08-10-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-08-10.png`）；11：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-08-11-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-08-11.png`）；g36-hem-target-grid.png（历史路径：`repair-02-continuation/evidence/g36-hem-target-grid.png`）；g36-hem-check.png（历史路径：`repair-02-continuation/evidence/g36-hem-check.png`）；broad-hem.png（历史路径：`repair-02-continuation/evidence/broad-hem.png`）。

笔画记录：g28-skirt-sewn-turns（历史路径：`repair-02-continuation/plans/g28-skirt-sewn-turns.json`）；g36-lower-silver-loop-and-skirt-junction（历史路径：`repair-02-continuation/plans/g36-lower-silver-loop-and-skirt-junction.json`）。

**R2-09｜蓝长幅与双肩外弧局部锯齿：已修复**

图层：14 `waist_sash/left_long_tail`；33 `outer_robe/collar_shoulders/right_shoulder_cover`；34 `outer_robe/collar_shoulders/left_shoulder_cover`。位置：14：x565–603、y1000–1178；双肩：x345–680、y292–353。

实际处理：沿实际观察到的窄边分段修整切线、白线宽度和 alpha 台阶。蓝幅下转角用 2.7 px 局部 Blender Blur；肩弧用 3.5 px 局部模糊笔刷及沿外缘的 3.2 px 低强度软橡皮处理剩余阶梯，只改变约 1–2 px 过渡。

自检结果：14／33／34 独显在原尺寸和 300–400% 检查，蓝缘突点、下转角及肩弧阶梯已顺接；BELOW 和全部叠加没有出现光晕、纹样发糊或新缺口。保留源图边缘本来的软硬变化，而不是让整条边一样虚。 肩片透明度、固定珠缘、白细边和邻近纹样保留；没有全层模糊。

证据：14：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-09-tail-14-native.png`）／3×（历史路径：`repair-02-continuation/evidence/final-R2-09-tail-14.png`）；33：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-09-shoulderL-33-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-09-shoulderL-33.png`）；34：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-09-shoulderR-34-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-09-shoulderR-34.png`）；broad-top.png（历史路径：`repair-02-continuation/evidence/broad-top.png`）。

笔画记录：g23-narrow-edge-and-silver-faces（历史路径：`repair-02-continuation/plans/g23-narrow-edge-and-silver-faces.json`）；g33-shoulder-and-tail-edge-transition（历史路径：`repair-02-continuation/plans/g33-shoulder-and-tail-edge-transition.json`）；g35-shoulder-external-alpha（历史路径：`repair-02-continuation/plans/g35-shoulder-external-alpha.json`）。

**R2-10｜雪花银饰回环、内孔与连接比例：已修复**

图层：57 `waist_pendant/snowflake_pendant`。位置：x482–540、y613–674。

实际处理：逐瓣收整尖角、三角平面与下 V 的开度；修复一次试画造成的顶部回环短缺口，将过宽右侧花瓣收至约 x525。银线基底和亮芯分别以约 2.45–2.8 px／1.52–1.85 px 的不同笔径绘制，内部补窄金属侧面色。末次把左下过窄回环改为经过 (496.2,655.4)、(499.8,657.0)、(505.2,653.5) 的圆回返，保留真实孔洞。

自检结果：57 独显深浅底、BELOW 及全部叠加核查顶部连接、左右瓣、中央镶色和下 V：银线连续，回环与孔形可读，旧宽扁角瓣已收整，左下小回环不再压成短细缝。全部叠加时孔内蓝色由后方衣料透出，57 自身不含蓝幅。 中央嵌色、上下连接及镂空保留；窄深色只在现有金属 alpha 内表现固有侧面，没有外加暗晕、投影或 AO。

证据：57：原尺寸（历史路径：`repair-02-continuation/evidence/final-R2-10-57-native.png`）／4×（历史路径：`repair-02-continuation/evidence/final-R2-10-57.png`）；snow-light-dark.png（历史路径：`repair-02-continuation/evidence/snow-light-dark.png`）；g36-silver-check.png（历史路径：`repair-02-continuation/evidence/g36-silver-check.png`）。

笔画记录：g31-crossing-fold-and-rounded-silver（历史路径：`repair-02-continuation/plans/g31-crossing-fold-and-rounded-silver.json`）；g32-silver-connections-and-proportions（历史路径：`repair-02-continuation/plans/g32-silver-connections-and-proportions.json`）；g34-silver-material-faces（历史路径：`repair-02-continuation/plans/g34-silver-material-faces.json`）；g36-lower-silver-loop-and-skirt-junction（历史路径：`repair-02-continuation/plans/g36-lower-silver-loop-and-skirt-junction.json`）。

**全部 69 层与检查范围**

受影响的 14 层按上述局部逐项独显、BELOW 和全部叠加细查；其余 55 层像素与 review-02 检查基线一致，查看最终全层联系板并继承该轮已有的完整隐藏区检查。本次没有把“导出 69 张 BELOW”宣称为重新逐张细看了全部 69 张隐藏图。所有图层均另有最终重开后的全画布透明独显导出。

| 后→前 | 实际完整图层名 | 本次处理／保留与检查 | 最终导出 |
| ---: | --- | --- | --- |
| 0 | `outer_robe/collar_shoulders/standing_collar/side_back_collar` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/00.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-00.png`） |
| 1 | `waist_sash/circumferential_band/side_back_band` | 像素保留；R2-01 验证后带完整并正确藏接。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/01.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-01.png`） |
| 2 | `outer_robe/right_sleeve/outer_side_gauze` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/02.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-02.png`） |
| 3 | `outer_robe/left_sleeve/outer_flared_gauze` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/03.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-03.png`） |
| 4 | `outer_robe/left_sleeve/side_pointed_gauze` | R2-06：薄纱斜折、尖尾及深浅底透明检查；上开口保留。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/04.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-04.png`） |
| 5 | `outer_robe/right_sleeve/cuff_train` | R2-02／05：细回折、纵褶、根部及长内缘收尖；正常下缝保留。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/05.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-05.png`） |
| 6 | `outer_robe/left_sleeve/rear_cuff_drape/free_curled_drape` | R2-03：自由垂段交叉折与藏根；去掉重复的上袖弧。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/06.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-06.png`） |
| 7 | `outer_robe/left_sleeve/rear_cuff_drape/cuff_attachment_wall` | R2-03：真实上弧和短附着根；与 6 分开，无游离线端。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/07.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-07.png`） |
| 8 | `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall` | R2-02／04：内端、回边与自属蓝褶；与 5、27 分别续接。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/08.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-08.png`） |
| 9 | `outer_robe/left_sleeve/rear_sleeve_wall` | R2-01：蓝袖料覆盖旧带头外露并接通裂口；保留早段有效修画。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/09.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-09.png`） |
| 10 | `inner_dress/skirt_side_back` | R2-08：后裙回钩细缝边；隐藏尖端及 C02 衣料保留。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/10.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-10.png`） |
| 11 | `inner_dress/skirt_front` | R2-08：前裙转角、缝边及小台阶；未删除后片隐藏料。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/11.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-11.png`） |
| 12 | `inner_dress/bodice_front` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/12.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-12.png`） |
| 13 | `waist_sash/right_long_tail` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/13.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-13.png`） |
| 14 | `waist_sash/left_long_tail` | R2-09：局部外缘、细白线与下转角抗锯齿。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/14.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-14.png`） |
| 15 | `waist_pendant/upper_suspension/right_suspension_cord/rear_insertion_end` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/15.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-15.png`） |
| 16 | `waist_pendant/upper_suspension/left_suspension_cord/hidden_entry` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/16.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-16.png`） |
| 17 | `outer_robe/left_front_panel::back_under_front_band` | 全层像素保留；批准后片独立，处于前腰带后。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/17.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-17.png`） |
| 18 | `waist_sash/circumferential_band/front_band` | 像素保留；仍夹在批准前襟两分片之间。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/18.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-18.png`） |
| 19 | `waist_sash/front_tie/right_short_loop` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/19.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-19.png`） |
| 20 | `waist_sash/front_tie/left_short_loop` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/20.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-20.png`） |
| 21 | `waist_sash/front_tie/bound_tassel` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/21.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-21.png`） |
| 22 | `waist_pendant/upper_suspension/right_suspension_cord/front_arc_cord` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/22.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-22.png`） |
| 23 | `waist_pendant/upper_suspension/left_suspension_cord/front_arc` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/23.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-23.png`） |
| 24 | `waist_sash/front_tie/knot_core` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/24.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-24.png`） |
| 25 | `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall` | 像素保留；R2-02 组合检查前袖壁和正常开口。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/25.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-25.png`） |
| 26 | `outer_robe/left_sleeve/front_sleeve_wall` | 像素保留；R2-03 组合检查前袖壁及根部关系。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/26.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-26.png`） |
| 27 | `outer_robe/right_front_panel` | R2-04／05／07：上返面、接边、斜收口与左尾卷。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/27.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-27.png`） |
| 28 | `outer_robe/left_front_panel::front_main` | R2-07：右尾卷与波形细唇；批准腰部完全保留。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/28.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-28.png`） |
| 29 | `collar_fastener/right_collar_chain` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/29.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-29.png`） |
| 30 | `collar_fastener/left_collar_chain` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/30.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-30.png`） |
| 31 | `collar_fastener/right_chest_chain` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/31.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-31.png`） |
| 32 | `collar_fastener/left_chest_chain` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/32.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-32.png`） |
| 33 | `outer_robe/collar_shoulders/right_shoulder_cover` | R2-09：肩弧外侧窄过渡；透明面、珠缘和纹样保留。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/33.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-33.png`） |
| 34 | `outer_robe/collar_shoulders/left_shoulder_cover` | R2-09：肩弧外侧窄过渡；透明面、珠缘和纹样保留。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/34.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-34.png`） |
| 35 | `outer_robe/collar_shoulders/standing_collar/right_front_collar` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/35.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-35.png`） |
| 36 | `outer_robe/collar_shoulders/standing_collar/left_front_collar` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/36.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-36.png`） |
| 37 | `collar_fastener/central_clasp/hanging_junction` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/37.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-37.png`） |
| 38 | `collar_fastener/central_clasp/clasp_body` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/38.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-38.png`） |
| 39 | `chest_ornament` | 像素保留；继承 review-02 已确认的 U01 胸饰修复，无机械增粗。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/39.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-39.png`） |
| 40 | `waist_pendant/long_white_tassel` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/40.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-40.png`） |
| 41 | `waist_pendant/lotus_coupler/lower_ring_connector/rear_insertion_return` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/41.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-41.png`） |
| 42 | `waist_pendant/double_ring_chain/upper_inner_drop` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/42.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-42.png`） |
| 43 | `waist_pendant/double_ring_chain/lower_inner_drop` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/43.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-43.png`） |
| 44 | `waist_pendant/double_ring_chain/inter_ring_link/rear_threaded_stem` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/44.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-44.png`） |
| 45 | `waist_pendant/tassel_buckle/ring_return_back` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/45.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-45.png`） |
| 46 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/upper_flexible_neck` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/46.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-46.png`） |
| 47 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/lower_flexible_neck` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/47.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-47.png`） |
| 48 | `waist_pendant/lower_silver_strand/upper_chain` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/48.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-48.png`） |
| 49 | `waist_pendant/lower_silver_strand/lower_bead_link` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/49.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-49.png`） |
| 50 | `waist_pendant/lotus_coupler/right_side_link` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/50.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-50.png`） |
| 51 | `waist_pendant/lotus_coupler/left_side_link` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/51.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-51.png`） |
| 52 | `waist_pendant/lotus_coupler/central_diamond_pendant` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/52.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-52.png`） |
| 53 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/terminal_bead` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/53.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-53.png`） |
| 54 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/middle_bead` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/54.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-54.png`） |
| 55 | `waist_pendant/upper_suspension/junction_linkage/diamond_bead` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/55.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-55.png`） |
| 56 | `waist_pendant/upper_suspension/junction_linkage/junction_knot` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/56.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-56.png`） |
| 57 | `waist_pendant/snowflake_pendant` | R2-10：回环、上下连接、材质侧面、镶色和孔形检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/57.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-57.png`） |
| 58 | `waist_pendant/lower_silver_strand/elongated_silver_link` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/58.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-58.png`） |
| 59 | `waist_pendant/lower_silver_strand/upper_bead_link` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/59.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-59.png`） |
| 60 | `waist_pendant/lotus_coupler/silver_hanger` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/60.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-60.png`） |
| 61 | `waist_pendant/lower_silver_strand/teardrop_pendant` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/61.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-61.png`） |
| 62 | `waist_pendant/double_ring_chain/lower_ring_body` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/62.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-62.png`） |
| 63 | `waist_pendant/double_ring_chain/inter_ring_link/lower_front_head` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/63.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-63.png`） |
| 64 | `waist_pendant/double_ring_chain/upper_ring_body` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/64.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-64.png`） |
| 65 | `waist_pendant/double_ring_chain/inter_ring_link/upper_front_head` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/65.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-65.png`） |
| 66 | `waist_pendant/lotus_coupler/lower_ring_connector/front_connector_tip` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/66.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-66.png`） |
| 67 | `waist_pendant/lotus_coupler/lotus_body` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/67.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-67.png`） |
| 68 | `waist_pendant/tassel_buckle/buckle_front` | 像素保留；最终联系板复查，隐藏完整性沿用 review-02 的逐层检查。 | 独显（历史路径：`repair-02-continuation/exports/reopened-final/68.png`）／BELOW（历史路径：`repair-02-continuation/exports/reopened-final/below-68.png`） |

覆盖全部层的联系板：1（历史路径：`repair-02-continuation/evidence/all-layers-00.png`）、2（历史路径：`repair-02-continuation/evidence/all-layers-01.png`）、3（历史路径：`repair-02-continuation/evidence/all-layers-02.png`）、4（历史路径：`repair-02-continuation/evidence/all-layers-03.png`）、5（历史路径：`repair-02-continuation/evidence/all-layers-04.png`）、6（历史路径：`repair-02-continuation/evidence/all-layers-05.png`）。详细局部坐标和倍率见 检查板清单（历史路径：`repair-02-continuation/audit/final-evidence-manifest.json`）。

**实际变化范围与已批准深度例外**

下表是相对 review-02 实际工程基线的变化包围框，右／下边界不含。框内是局部笔画、清理或回退后的净变化，不是整框重画；统计只帮助追溯，不是画质验收指标。

| 索引 | 改变像素数 | 包围框 [x0,y0,x1,y1) |
| ---: | ---: | --- |
| 4 | 3325 | [849, 1037, 956, 1169] |
| 5 | 6745 | [296, 730, 387, 1101] |
| 6 | 1403 | [742, 720, 788, 878] |
| 7 | 1703 | [742, 714, 796, 878] |
| 8 | 4295 | [301, 419, 447, 830] |
| 9 | 2050 | [566, 473, 627, 595] |
| 10 | 207 | [566, 1346, 602, 1365] |
| 11 | 464 | [448, 1339, 602, 1365] |
| 14 | 542 | [574, 999, 593, 1164] |
| 27 | 15899 | [93, 421, 456, 1397] |
| 28 | 1036 | [780, 1366, 934, 1430] |
| 33 | 407 | [383, 299, 458, 353] |
| 34 | 406 | [565, 299, 642, 353] |
| 57 | 951 | [489, 621, 532, 667] |

本次修正仍归各自现有衣片：腰侧连续蓝料归 9；上袖蓝褶／白襟返面分别归 8／27；袖口长内缘归 5；右袖短根／自由段归 7／6；薄纱归 4；前后裙缝边分别归 11／10；银饰归 57。g36 的中央小接边补在 11，10 的隐藏尖端没有删掉。偏离旧 SVG 的局部轮廓按参考及衣料连续性记录在笔画计划和上述范围中，没有改写 input/。

共同逻辑父 part `outer_robe/left_front_panel` 仍对应两个普通绘画层：17 `outer_robe/left_front_panel::back_under_front_band` 位于 18 `waist_sash/circumferential_band/front_band` 后；28 `outer_robe/left_front_panel::front_main` 位于其前。共同随动关系保持，并非新增独立可动部件，本次没有制作绑定或动画。完整次序以及相邻的 16→17→18、27→28→29 均沿用 [批准映射](../step01/split-test/split-plan.json)。

实际批准分界仍为 `[[561,489],[561.8,494],[564.4,502],[567.1,510],[570.6,520],[574.6,530],[565,531],[548,532.5],[531.4,533.5]]`。前五段左侧归后片、右侧归前片；后三段上侧归后片、下侧归前片。后片 1.5 px 支撑搭接及前片两侧 0.5 px 过渡不变。17 全层、28 腰部 `528,488,585,552)` 均与 review-02 基线逐像素一致。A=(545,509) 蓝腰带在前、B=(570,509) 白襟在前；[显隐检查（历史路径：`repair-02-continuation/evidence/approved-split-preserved.png`） 未见此次尾部修画影响批准腰部。

依据 groups 的前后领、前后腰带、前后袖壁、附着壁／自由垂段、前后裙、挂绳后入端／前弧、圈链后杆／前头及扣件前后片继续独立。没有因同动合层，也没有人体占位、相邻衣片贴入或身体装配说明。

上一轮 C02 的 `688,1260,721,1360)` 在 10／11／28 全部保留；C01、C03、C04 的有效补料也保留并在 R2-02／04／06 中修整。U01 胸饰 39 及 U02 细件的本轮像素不变，沿用 review-02 实际检查结论，没有因模糊或外围暗晕而统一增粗。

**试画、回退与证据边界**

所有尝试均保留，计划存在不等于其全部笔画最后保留。早段 g01 错画布未改变目标；错位下摆、重复纱边、直折袖线和过削前襟等均已恢复本层自己的工程检查点后重画，未用原参考像素补洞。早段证据见 [回退审计目录（历史路径：`repair-02-work/audit`）。

接续中 g20／g21 的直折线和过度切削的 27 局部被否决，按 回退记录（历史路径：`repair-02-continuation/audit/rejected-g20-g21-geometry.json`） 恢复自身检查点，再由 g24 按实际参考曲线重画。g31 曾在银饰顶部留短缺口、右瓣偏宽；g32 接回并收整，g34 补金属内侧材质，g36 再圆整左下回环。这些问题没有作为最终合格像素保留。

g36 后生成证据时有一次在重开导出尚未结束前读取 PNG，因文件尚未写完报 truncated 错误；该次只读制板失败，没有改变绘画。等待实际重开导出完成后重新完整制板和核验，最终链接均指向成功完成的文件。

所有十项反馈已经对应到实际衣料、线条或金属实体并完成自检，未把它们当作“本阶段不画的阴影”跳过。没有新增第三轮 review，也没有设置人工确认或回跑 part。

隐藏衣料没有直接可见的背面绘画参考，仍按各片职责、合理藏接及连续性判断；细小笔触和金属／纱面明暗不宣称与参考逐像素相同。原图外围暗晕未被当作额外布面或加粗目标。上述限制不影响本次对十项具体缺陷的处理结论。

**最终保存、关闭重开与交付**

最后的 g36 修画后保存、关闭并重新打开正式 [clothing-soft-edges.kra](clothing-soft-edges.kra)，从该重开的工程导出 [透明合成 composite.png](composite.png)、全部 69 层透明 PNG 和 BELOW 检查图。

画布为 1024×1536、RGBA/U8，色彩配置 `sRGB-elle-V2-srgbtrc.icc`，原 xRes／yRes=7200 保持。69 层均是平级普通 paintlayer，无子节点、无蒙版，normal 混合、图层不透明度 255，最终全部可见。纱料透明度来自像素 alpha。

69 层保存前后名称、順序、设置和像素一致，合成像素也一致；完整层序符合 review-02 及批准 split-plan。相对 review-02，14 层改变、55 层不变；接续基线后改变 13 层，9 的早段有效修画继续保留。283 个保护文件（100 个 input、181 个 split-test、step01 KRA 与报告）无改动、无缺失。

重开记录：repair-reopen-final.json（历史路径：`repair-02-continuation/audit/repair-reopen-final.json`）；范围与保护核对：final-delivery.json（历史路径：`repair-02-continuation/audit/final-delivery.json`）；实际 Krita：重开截图（历史路径：`repair-02-continuation/evidence/repair-reopened-krita.png`）。

最终全图检查：原尺寸参考（历史路径：`repair-02-continuation/evidence/full-reference-native.png`）／原尺寸最终（历史路径：`repair-02-continuation/evidence/full-final-native.png`）。各反馈的最终原尺寸／放大单层、隐藏上层及全部叠加证据已在逐项记录链接。

KRA SHA256：`05ed07bc81c07c428c9326152ad02dc2f5de1ccfedb97fec4f9951a55c110fb0`。

透明合成 PNG SHA256：`7dc65e18ecee99e90847cea518aaac8bb0a336c2a1818cd6fd2af3ba8386fd01`。

结构、哈希和变化范围只核对交付、保存一致性与内容保留；本报告的修复判断来自上述实际看图。未另留尚未处理的 R2 项。本次仅完成当前第二轮 repair 的绘制、自检和报告交接，不启动后续任务，不修改调度标记。
