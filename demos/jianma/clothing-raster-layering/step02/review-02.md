结论：需要修复

本轮已完成实际 KRA 的整体、全部 69 个绘画层及疑点显隐检查。上一轮的假白叶、袖口横向亮缝、部分缺料和银线断续已有实际处理，必须保留这些有效进度；当前仍有腰侧错误外露与裂口、袖口和前襟折返变形、尖纱折边过度模糊，以及若干包边、饰件形状问题。以下列出 10 项有明确视觉依据的修复反馈。

本报告只评价当前 `step02/clothing-soft-edges.kra`，不把 repair 报告中的“已修复”直接视为验收通过，也不把来自第一步的问题排除在外。所有建议均针对衣料、固有褶面、包边或饰件实体，不要求新增阴影、AO、投影。

## 检查依据与证据读法

绘画参考为 [input/references/clothing.png](../../clothing-part-layering/references/clothing.png)，与 [step01/report.md](../step01/report.md)、[step02/report.md](report.md) 一致。已阅读正式 [review-01.md](review-01.md) 和 [repair-01.md](repair-01.md)，并对照 [groups.json](../../clothing-part-layering/groups.json)、[occlusion.json](../../clothing-part-layering/occlusion.json)、[parts](../../clothing-part-layering/parts) 及 [第一步工程](../step01/clothing-depth.kra)。暂存材料未作为完成依据。

沿用用户已批准的前襟拆片与最新局部修形授权。旧 SVG 范围与合理补画不一致，本身不构成缺陷；本报告依据原图可见内容、衣料连续性和实际归属判断，不要求撤销 C01–C04 等已完成的合理补料。

坐标为 1024×1536 原画布像素，左上原点；“画面左／右”为观看方向，图层名称保持工程原名。索引从后到前、从 0 开始。`REFERENCE` 为原图，`CURRENT` 为本轮实际打开的 KRA 合成，`SOLO nn` 为其单层，`BELOW nn` 为本层及所有更后方层，`STEP01` 为第一步合成。灰底及棋盘底仅帮助辨认透明区域。对比板采用同坐标整数倍放大，没有以像素差、PSNR 或哈希评价画质。

优先级：P1 为明显影响形体、衣料接续或材质可读性的问题；P2 为局部轮廓、包边及细节问题。两类均需逐项处理。

## 已确认问题

### R2-01｜P1：画面右腰侧后腰带端部错误外露，邻接衣料仍有透明裂口

- **相关层**：1 `waist_sash/circumferential_band/side_back_band`；9 `outer_robe/left_sleeve/rear_sleeve_wall`；28 `outer_robe/left_front_panel::front_main`。
- **位置**：x560–626、y450–610；重点为约 x578–594、y486–531 的蓝白条，以及条端向下延伸的透明缝。
- **当前表现与定位**：后腰带的一截蓝白斜纹从白前襟与蓝袖料之间露出，形似多余的小带头，下方接着不规则透明裂口。在实际 Krita 中隐藏 1 后，斜纹带头消失而裂口仍在；独显 1 确认其来源。9／28 的单层与组合显示这里没有足够的衣料接续。第一步对照已存在同类外露。
- **参考依据及影响**：原图对应位置是连续的蓝色窄褶面与白襟折边，没有这一截外露斜纹带头，也没有同范围的透明裂口；棋盘底对照能区分真实衣料与空白。groups 将 1 定义为腰侧转折后的隐藏延续，接头应在前襟遮挡区。当前破坏腰侧衣料连续性，在整体中形成杂条与破口。
- **修复方向与保留内容**：按 9 的蓝色袖料和 28 的白襟返面各自走势修整相接界面及必要藏接，使后腰带端部正确藏入；如需修正 1 的局部端形，保留其有效后绕衣料，不直接删掉整个后带或用后带填裂口。保留窄折缝、袖／襟独立性和真实衣面纹理。此处与已批准的 17／28 拆片不是同一问题，不合并拆片、不改整套层序。
- **证据**：原图／当前／基线及 9、28 单层（历史路径：`review-02-evidence/focus/join-right.png`）、后带归属对照（历史路径：`review-02-evidence/focus/waist-strip-owner.png`）、透明性对照 400%（历史路径：`review-02-evidence/focus/waist-checker.png`）、Krita 全部叠加（历史路径：`review-02-evidence/screens/waist-owner-all.png`）、隐藏 1（历史路径：`review-02-evidence/screens/waist-owner-without1.png`）、独显 1（历史路径：`review-02-evidence/screens/waist-owner-solo1.png`）。

### R2-02｜P1：画面左袖口回折被画宽，内侧端部鼓成块状

- **相关层**：8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`；5 `outer_robe/right_sleeve/cuff_train`；组合涉及 25 `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall`。
- **位置**：x229–391、y697–844，重点是约 (378,745) 的内侧袖口端部，以及向左下转折再下垂的回边。
- **当前表现与定位**：原来的假白叶已经去掉，下方缺失蓝料也已补入；但 8 的内侧端部变为宽而平头的蓝白块，向下的细折返变成较宽的青蓝带，白线在转角处偏重。8 与 5 的新纵褶较宽软，回折处的褶面分界、线宽和走势未衔接成原图的连续细折。单层及隐藏上方层后仍能看到这些形体，不能归因于 25 的遮挡。
- **参考依据及影响**：原图的上缘白弧在内端自然收束，下面是细窄的回边、可辨识的三角折面和向下连续的纵褶。当前像增加了厚包边，改变袖口开合处的形状与布料厚薄感。
- **修复方向与保留内容**：局部缩整端部凸块，恢复内端收束及回折的宽窄变化；分别接好 8／5 自身蓝色折面和真实白边，清理转角的重复重线及短台阶。保留已恢复的蓝料、正常袖口开口、外侧白弧和下垂纹样；不恢复旧白叶，不把蓝料擦回三角缺口，也不以涂抹整片代替褶面整理。
- **证据**：原图／当前／基线／单层／隐藏上方层 300%（历史路径：`review-02-evidence/focus/cuff-left.png`）、Krita 当前袖口（历史路径：`review-02-evidence/screens/focus-cuff-left-all.png`）、Krita 独显 8（历史路径：`review-02-evidence/screens/left-cuff-solo8.png`）、Krita 隐藏上方层（历史路径：`review-02-evidence/screens/left-cuff-below8.png`）。对应上一轮 R01、C03。

### R2-03｜P1：画面右袖口外侧回折变成圆鼓轮廓，原有交叉折边不完整

- **相关层**：7 `outer_robe/left_sleeve/rear_cuff_drape/cuff_attachment_wall`；6 `outer_robe/left_sleeve/rear_cuff_drape/free_curled_drape`；组合涉及 26 `outer_robe/left_sleeve/front_sleeve_wall`。
- **位置**：x637–803、y691–850，重点为外侧 x750–793、y752–833 的折返及 7／6 接续。
- **当前表现与定位**：旧的假横缝、白尖齿已有清理，但外侧蓝面被整理成鼓起、收腰、再鼓起的圆滑轮廓。原图在这里交叉延续的两段细折边及其间窄折面，被宽蓝面和偏厚白边替代；新旧纵褶在接根附近的质感也不一致。独显 7、6 及只显示至 7 时可以定位，不是前袖壁盖住细节。
- **参考依据及影响**：原图外侧折返有明确的斜向交叉和折面转向，并非一条圆鼓的管状边。它们是本片衣料和线条内容，不是待制作的投影。当前削弱袖口到自由垂片的折叠关系，与左袖一起改变整套衣服的布料质感。
- **修复方向与保留内容**：以原图重新明确外侧转折点、细回边和夹在其中的蓝色折面，再接续纵褶；局部收整不必要的圆鼓和重白边。保留已去掉的假横缝处理、原有开口、真实上弧、下垂纹样；6／7 必须继续独立，根部保持隐藏搭接。
- **证据**：原图／当前／基线／单层／隐藏上方层 300%（历史路径：`review-02-evidence/focus/cuff-right.png`）、Krita 当前袖口（历史路径：`review-02-evidence/screens/focus-cuff-right-all.png`）、Krita 独显 7（历史路径：`review-02-evidence/screens/right-cuff-solo7.png`）、Krita 隐藏上方层（历史路径：`review-02-evidence/screens/right-cuff-below7.png`）。对应上一轮 R02。

### R2-04｜P1：画面左上袖／襟接续补成了过宽的白色返带

- **相关层**：27 `outer_robe/right_front_panel`；8 `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall`。25 为邻接的前袖壁。
- **位置**：x398–460、y385–612，重点为 x430–455、y420–530 的上段转折。
- **当前表现与定位**：旧宽透明楔口已补入衣料，处理方向成立；但 27 新返面成为一条宽、平、弯曲的白蓝带，上段出现明显钝凸，向下的收尖也与原图不同。8 的蓝褶随之变宽、变简，补画段与原有细窄衣边质感不一致。独显 27、8 可分别看到这两部分。
- **参考依据及影响**：原图是白襟自身较窄的转折及邻接蓝色褶面，外缘走势和收束清楚。当前不是单纯去掉暗影造成变浅，而是白返面的实际形状、宽度改变，令上身侧缘显得膨大。
- **修复方向与保留内容**：保留补回衣料及 8／27 的蓝袖、白襟归属；按原图收整 27 的返面宽度、转折点与尖端，续接 8 的窄褶和本层纹理。不要把已恢复区重新挖空，不靠加深一条“阴影”模拟缺失的折面，也不改前后袖层序。
- **证据**：原图／当前／单层／基线／组合 300%（历史路径：`review-02-evidence/focus/join-left.png`）、Krita 独显 27（历史路径：`review-02-evidence/screens/gap-solo27.png`）、Krita 隐藏上方层（历史路径：`review-02-evidence/screens/gap-below27.png`）。对应上一轮 C01。

### R2-05｜P1：画面左下狭缝出现方形凸台，邻接收尖生硬

- **相关层**：27 `outer_robe/right_front_panel`；5 `outer_robe/right_sleeve/cuff_train`。
- **位置**：x280–355、y1025–1145，重点为约 x312–326、y1099–1121 的浅蓝方头及其上方蓝垂料尖端。
- **当前表现与定位**：27 外缘伸出一块平顶、直立侧边的浅蓝块，块内与白襟的接面也很硬；5 的内缘在其上方突兀收尖。组合呈方口状断续。方块在 27 单层中存在；第一步已有偏硬的狭缝与收尖，当前又出现这一方头，不能仅以“继承问题”略过。
- **参考依据及影响**：原图该处沿布料走势平顺收束，没有矩形凸台。下段原图确有透明空气间隙，外围暗晕不作为应补的衣料；本项确认的是实际轮廓与接面问题，不认定整条深色缝都缺布。
- **修复方向与保留内容**：重画 27 的局部斜收边及其内部颜色过渡，去掉无依据的方形台口；结合原图调整 5 自身内缘的连续收尖。groups 明确从袖口向约 (306–310,1095) 延伸的窄内缘属于 5，不能把该段袖料并入 27。保留真实下段空隙，不用一块灰蓝色把整缝填满。
- **证据**：原图／当前／基线／单层 400%（历史路径：`review-02-evidence/focus/gap-309.png`）、棋盘底辨认正常空隙（历史路径：`review-02-evidence/focus/gap-309-checker.png`）、Krita 全部叠加（历史路径：`review-02-evidence/screens/focus-gap309-all.png`）、独显 27（历史路径：`review-02-evidence/screens/focus-gap309-solo27.png`）、独显 5（历史路径：`review-02-evidence/screens/focus-gap309-solo5.png`）、隐藏上方层（历史路径：`review-02-evidence/screens/focus-gap309-below27.png`）。本轮新增反馈。

### R2-06｜P1：右下尖纱的斜向折边被模糊掉，补画区呈雾状

- **相关层**：4 `outer_robe/left_sleeve/side_pointed_gauze`；相邻蓝垂料为 6。
- **位置**：x837–958、y1040–1195，尤其约 (850,1065) 向尖尾延伸的长斜内边。
- **当前表现与定位**：旧人为凹缺已补入薄纱，仍有透明度；但原图清楚的长斜内边和三角纱面分界变成很宽的柔散过渡。组合及 4 单层均呈一团渐淡灰纱，斜向轮廓只余模糊痕迹，与旁边原有较清楚的纱边衔接不协调。
- **参考依据及影响**：原图这段细亮折边界定了透明纱片自身的形状和朝向，并非纱下投影。当前虽然补有像素，仍未恢复这部分绘画内容，尖纱的薄片感与折面可读性下降。
- **修复方向与保留内容**：保留新恢复的纱料，在本层重建参考所示的窄斜边、尖端与相邻纱面的渐变关系；局部减小过宽羽化，使新旧纱面连续。保留低透明度、已有菱格、细尖尾及上方 x777–805、y800–833 的正常回卷空口；6 的蓝垂料不得并入 4，不填成实色白片。
- **证据**：原图／当前／独显 300%（历史路径：`review-02-evidence/focus/gauze-tip.png`）、较大范围对照（历史路径：`review-02-evidence/plates/diag-gauze-exclusion.png`）、Krita 当前尖纱（历史路径：`review-02-evidence/screens/focus-tip-all.png`）、Krita 独显 4（历史路径：`review-02-evidence/screens/pointed-solo4.png`）。对应上一轮 C04。

### R2-07｜P2：前襟尾卷已补全，但返面与卷唇仍偏平、偏硬

- **相关层**：27 `outer_robe/right_front_panel`；28 `outer_robe/left_front_panel::front_main`。
- **位置**：左端 x90–205、y1340–1435；右端 x795–945、y1325–1435，重点包括约 (844,1392) 的内折接点。
- **当前表现与定位**：两端不再是上一轮的截薄缺口；左端返面有一条宽而均匀的蓝色带，回卷显得平硬，未形成参考的圆转层次。右端卷唇内接点仍有短横台口，邻近波形下缘存在平段与粗白边。27／28 单层中同样可见。
- **参考依据及影响**：原图卷口的返面、细白唇边与相邻波形连续圆转；当前在整图轮廓端点显得厚硬。反馈针对可见曲线和返面绘画，不要求补回卷口下的暗影。
- **修复方向与保留内容**：分别整理返面转向、包边浓淡与内折连接点，左端避免整条等宽蓝带，右端消除小台口并接顺邻近弧线。保留已补足的返面、真实卷口空气间隙、浅纱层次和纹样；保持 17／28 拆片，尾部修画不涉及腰部层序。
- **证据**：左端原图／当前／单层（历史路径：`review-02-evidence/plates/diag-hem-tip-left.png`）、右端原图／当前／单层（历史路径：`review-02-evidence/plates/diag-hem-tip-right.png`）、右侧内折及下缘 400%（历史路径：`review-02-evidence/focus/hem-right-notch.png`）、Krita 独显 28 尾部（历史路径：`review-02-evidence/screens/focus-hem-right-solo28.png`）。对应上一轮 R03。

### R2-08｜P2：中央内裙包边的转角仍有粗白块与折线台阶

- **相关层**：10 `inner_dress/skirt_side_back`；11 `inner_dress/skirt_front`。
- **位置**：x430–600、y1340–1365，两侧回折钩及前后片可见衔接处。
- **当前表现与定位**：包边已接上，但转角仍局部膨成白块，圆弧中夹有短平段和折线，前后片相接处粗细跳变。单层与合成都可定位，不是整个下摆缺失。
- **参考依据及影响**：原图是细、连续、随折面圆转的包边，当前几处轮廓显得切削、粘块，降低下摆的柔和质感。
- **修复方向与保留内容**：局部整顺转角切线、收薄不必要的白块并协调 10／11 的可见接边，不统一加粗或模糊全部裙摆。保留波形、正常空气间隙、裙褶、纹样及前后片分层。10 在约 (565,1340) 的隐藏尖端被上片覆盖，不能仅因独显有尖端而删除其隐藏衣料。
- **证据**：原图／当前／10、11 单层（历史路径：`review-02-evidence/plates/diag-hem-center.png`）、Krita 全部叠加 400%（历史路径：`review-02-evidence/screens/focus-hem-center-all.png`）、Krita 独显 11（历史路径：`review-02-evidence/screens/hem-solo11.png`）。对应上一轮 R04。

### R2-09｜P2：蓝长幅长缘与肩弧仍有局部碎齿和台阶

- **相关层及位置**：14 `waist_sash/left_long_tail`，x565–603、y1000–1178；33 `outer_robe/collar_shoulders/right_shoulder_cover`，x345–490、y292–353 的外上弧；34 `outer_robe/collar_shoulders/left_shoulder_cover`，x535–680、y292–353 的对应弧段。
- **当前表现与定位**：14 的蓝白邻边仍有不均匀小凸齿，局部白线呈短段粗细变化，接近下部转角处有突起。双肩外上弧的斜坡仍出现连续阶梯。独显可见，说明并非邻接白衣或链饰遮挡所致；本轮有修整效果，但尚未完全顺接。
- **参考依据及影响**：原图这些窄边有自然软硬变化，但走势连续，肩弧没有当前的规整台阶。属于局部边缘质量问题，不据此要求改大形或重绘整层。
- **修复方向与保留内容**：只整理可见窄边的抗锯齿、切线和局部线宽，优先消除蓝缘突点、肩弧阶梯；保留真实细白亮边、肩部透明度、固定珠缘及邻近纹样。不要全层模糊，也不要机械把白线统一画粗。
- **证据**：蓝长幅 400%（历史路径：`review-02-evidence/focus/tail-edge.png`）、画面左肩 400%（历史路径：`review-02-evidence/focus/shoulder-left.png`）、画面右肩 400%（历史路径：`review-02-evidence/focus/shoulder-right.png`）、Krita 独显 14（历史路径：`review-02-evidence/screens/focus-tail14-solo.png`）、独显 33（历史路径：`review-02-evidence/screens/focus-shoulder33-solo.png`）、独显 34（历史路径：`review-02-evidence/screens/focus-shoulder34-solo.png`）。对应上一轮 R05。

### R2-10｜P2：雪花银饰补线后花瓣偏扁、偏角，镂空比例与参考不一致

- **相关层**：57 `waist_pendant/snowflake_pendant`。
- **位置**：x482–540、y613–674，重点为上侧左右花瓣、中央交接和下方 V 形。
- **当前表现与定位**：银线连续性已有恢复，但上侧两瓣呈宽扁三角，外侧和下方转角偏尖，下 V 更张开；部分补入银料成为较宽的浅色平面，改变了内孔与花瓣的比例。单层形状与组合一致；基线对照可见原本的角形基础并未因补线而得到修正。
- **参考依据及影响**：原图是较圆、较收束的花瓣回环和细银色连接，当前更像展开的折角星形。此处只比较金属实体轮廓、花瓣与孔形，不把原图外围暗晕作为加粗目标。
- **修复方向与保留内容**：按原图逐瓣修整回环、接点和下 V 的宽窄，减少不必要的三角平面；保留已恢复的银线连续性、中央嵌色、镂空及上下连接。不要统一增粗或填实孔洞，不把后方蓝幅画入饰件。
- **证据**：原图／当前／单层／基线 400%（历史路径：`review-02-evidence/focus/snowflake.png`）、Krita 独显 57（历史路径：`review-02-evidence/screens/focus-snowflake-solo57.png`）。对应上一轮 U01 的雪花部分。

## 上一轮全部反馈的实际复核

下表区分已经有效处理的内容与本轮残留问题。“未另报问题”仅表示当前检查没有找到需追加的明确修复依据，不以旧 SVG 的范围限制免除绘画责任。

| 原编号 | 当前实际判断 | 本轮处理结论 |
| --- | --- | --- |
| R01 | 假白叶与大横向亮弧已去除，蓝面已续接；袖口端形、回折宽度仍不准确。 | 保留有效修画，继续 R2-02。 |
| R02 | 假横缝、白尖齿已清理；外侧回折改得过圆，细折面和交叉边仍需恢复。 | 继续 R2-03。 |
| R03 | 两端回返衣料已恢复，原有大截口不再按原状重报；仍有返面和卷唇质量问题。 | 继续 R2-07。 |
| R04 | 下摆包边已有补接，仍有局部粗白块和不顺的转角。 | 继续 R2-08。 |
| R05 | 蓝缘、双肩均经过局部整理；现图仍有可见碎齿与台阶。 | 继续 R2-09。 |
| C01 | 缺料已按蓝袖 8／白襟 27 分别补入，归属方向合理；当前返面宽度和转向仍不符原图。 | 不撤销补料，继续 R2-04。 |
| C02 | x688–720、y1260–1360 的右下长楔口已由后裙 10 延续，11／28 的邻接保留；当前未再见原有贯穿缺口。 | 本项未另报修复；见当前局部（历史路径：`review-02-evidence/plates/diag-hem-right.png`）。 |
| C03 | 左袖口下方原三角缺料已有蓝色折返内容，正常袖口未被整体封闭。 | 缺料处理有效；折返形状随 R2-02 整理。 |
| C04 | 4 中已补回连续低透明度纱面，6 未并入；旧人为凹缺不再作为应保留空口。 | 斜折边与材质衔接继续 R2-06。 |
| U01 | 39 胸饰的连接杆、卷枝和下伸卷脚已有可见连续实体，主体与中央露空保留；未确认需要再次统一增粗。57 银线已连接，但花瓣形状仍有问题。 | 胸饰不另加修复项；雪花继续 R2-10。见胸饰单层（历史路径：`review-02-evidence/plates/solo-39-0.png`）、Krita 胸饰（历史路径：`review-02-evidence/screens/chest-solo39.png`）。 |
| U02 | 已逐件检查 46、48、49、52、54、58、59、61 的本体、端头及组合连接；未见原反馈所指范围形成明确断裂。52 偏浅、58 上肩略厚，当前不足以据此提出机械扩形或增粗要求。 | 不再保留为等待旧 SVG 许可的事项；本轮无新增修复。见小件板 3（历史路径：`review-02-evidence/plates/contact-small-3.png`）、小件板 4（历史路径：`review-02-evidence/plates/contact-small-4.png`）、小件板 5（历史路径：`review-02-evidence/plates/contact-small-5.png`）及逐层清单。 |

## 检查覆盖与结构结果

在专用 Krita 5.3.4.1、`DISPLAY=:108` 中打开当前实际工程，先按 100% 对照原图与合成，再以 200% 分区覆盖全部画面，对疑点放大至 300–400%，切换全部叠加、独显及隐藏上方层。另从本轮打开的实际 KRA 取得 69 层完整独显，按非空范围分为 82 张 200%／400% 板，逐件检查可见内容与遮挡补全；长片分段有重叠，小件以联系板和单件板检查。已查看 12 个区域对照，并针对上述疑点补充局部证据。

没有遗留整片未看的图层或未扫视的画面分区。显隐组合用于定位疑点，没有穷举所有层组合；`hidden/00.png` 至 `hidden/68.png` 的存在不代表每份隐藏组合都单独逐张看过。

| 已检查索引 | 内容、完整性及衔接结果 | 代表证据 |
| --- | --- | --- |
| 0、33–36 | 后领、双肩、双前领完整独立，正常领口保留；肩弧见 R2-09。 | 上部组合（历史路径：`review-02-evidence/plates/region-top.png`） |
| 1、18 | 前后腰带各自有内容、独立保留；右侧端部外露及邻接见 R2-01。 | 腰部组合（历史路径：`review-02-evidence/plates/region-waist.png`） |
| 2–9、25–26 | 全部纱片、前后袖壁、附着壁与自由垂片均检查到根部、边缘和尾端；R2-01–06 涉及局部问题。2／3 主透明层次与正常空口保留，未另报缺失。 | 左袖（历史路径：`review-02-evidence/plates/region-left-sleeve.png`）、右袖（历史路径：`review-02-evidence/plates/region-right-sleeve.png`）、左袖口（历史路径：`review-02-evidence/plates/region-left-cuff.png`）、右袖口（历史路径：`review-02-evidence/plates/region-right-cuff.png`） |
| 10–12 | 前后裙及内衣上身的可见面、隐藏范围、接续和下摆均检查；C02 补料有效，下摆见 R2-08。 | 中央下段（历史路径：`review-02-evidence/plates/region-center-low.png`）、后裙独显（历史路径：`review-02-evidence/plates/solo-10-0.png`）、上身独显（历史路径：`review-02-evidence/plates/solo-12-0.png`） |
| 13–14 | 双蓝长幅全长及根部完整，14 窄边见 R2-09。 | 中左（历史路径：`review-02-evidence/plates/region-mid-left.png`）、中右（历史路径：`review-02-evidence/plates/region-mid-right.png`） |
| 15–16、22–23 | 两侧挂绳后入端与前弧分别独立，隐藏延续及前端连接有内容，未见需追加的断裂。 | 腰部组合（历史路径：`review-02-evidence/plates/region-waist.png`）、小件板 1（历史路径：`review-02-evidence/plates/contact-small-1.png`） |
| 17、27–28 | 两条长前襟及批准后片全部查看到尾端；接续、局部凸台及尾卷见 R2-01、04、05、07。 | 左下（历史路径：`review-02-evidence/plates/region-low-left.png`）、右下（历史路径：`review-02-evidence/plates/region-low-right.png`）、17 独显（历史路径：`review-02-evidence/plates/solo-17-0.png`） |
| 19–21、24 | 前结双短环、束流苏及结心完整，正常环口保留。 | 腰部组合（历史路径：`review-02-evidence/plates/region-waist.png`） |
| 29–32、37–38 | 领扣四链、挂接与扣体逐件检查，原有空窗、链体及连接保留。 | 上部组合（历史路径：`review-02-evidence/plates/region-top.png`）、小件板 2（历史路径：`review-02-evidence/plates/contact-small-2.png`） |
| 39 | 胸饰主体、卷枝、下伸卷脚、连接杆及镂空已查看；U01 胸饰部分不新增修复。 | 完整独显板（历史路径：`review-02-evidence/plates/solo-39-0.png`） |
| 40 | 白长流苏根帽、全长及细束末端已查看，未见明确新缺失。 | 独显板（历史路径：`review-02-evidence/plates/solo-40-0.png`） |
| 41–56、58–68 | 全部细连接、珠链、莲体、双圈及前后穿接片，包括隐藏端，均逐件查看；U02 已实际判断。圈孔透明，合成中孔内颜色来自后方衣料。 | 小件板 2（历史路径：`review-02-evidence/plates/contact-small-2.png`）、板 3（历史路径：`review-02-evidence/plates/contact-small-3.png`）、板 4（历史路径：`review-02-evidence/plates/contact-small-4.png`）、板 5（历史路径：`review-02-evidence/plates/contact-small-5.png`）、饰件组合（历史路径：`review-02-evidence/plates/region-jewelry.png`） |
| 57 | 雪花实体、内孔和上下接点均已检查；花瓣形状见 R2-10。 | 雪花局部（历史路径：`review-02-evidence/focus/snowflake.png`） |

全部层名、类型及范围见 实际图层清单（历史路径：`review-02-evidence/layer-inventory.json`），每张独显板的坐标与倍率见 82 张检查板清单（历史路径：`review-02-evidence/plate-manifest.json`）。表中代表图不代替其余部件的实际检查。

结构核对结果为 69 个平级普通 `paintlayer`，无子节点，全部正常混合、图层不透明度 255，对应 68 个逻辑 part。画布中的薄纱透明性来自绘画像素，不能因图层不透明度为 255 而判为实色。当前名称与顺序同时符合正式 step01 KRA 和批准的 [split-plan.json](../step01/split-test/split-plan.json)，其余 67 个逻辑 part 的相对深度与 input/occlusion.json 一致，见 结构核对记录（历史路径：`review-02-evidence/structure-verification.json`）。

17 `outer_robe/left_front_panel::back_under_front_band` 与 28 `outer_robe/left_front_panel::front_main` 确为独立绘画层，分别在 18 前腰带之后／之前，继续属于同一逻辑前襟。前后领、腰带、袖壁、裙片、挂绳入端／前弧、袖口附着壁／自由段、圈链后杆／前头及扣件前后片均没有因共同运动而合并。未发现人体内容被画入本套衣片。合理隐藏延长不作为多余内容，未要求身体装配或编写身体插层说明。

## 待确认事项、证据边界与交接

本轮没有另列缺乏依据的待确认修复项。隐藏补全部分在原图中不可见，其检查依据是既定职责、必要搭接、形体连续性与单层干净程度，不声称已验证一个不存在的背面绘画参考。

两处容易误判的范围已明确限定：R2-05 的正常下段空气间隙及其外围暗晕不要求填回；R2-10 的饰件外围暗晕不作为银料宽度。修复若涉及局部轮廓或归属调整，应按用户本轮授权在 repair 报告记录 KRA 实际结果，保留输入只读与已批准拆片；本报告没有提出新的全局层级变更，也不设置额外许可关卡。

整体及 Krita 分区证据：当前工程 100%（历史路径：`review-02-evidence/screens/verified-current-100.png`）、原图 100%（历史路径：`review-02-evidence/screens/reference-100.png`）、上部 200%（历史路径：`review-02-evidence/screens/all-200-upper.png`）、左中 200%（历史路径：`review-02-evidence/screens/all-200-left-mid.png`）、右中 200%（历史路径：`review-02-evidence/screens/all-200-right-mid.png`）、左下 200%（历史路径：`review-02-evidence/screens/all-200-left-low.png`）、右下 200%（历史路径：`review-02-evidence/screens/all-200-right-low.png`）、下摆 200%（历史路径：`review-02-evidence/screens/all-200-hem.png`）。早期 `screens/actual-all-100.png` 截到了参考页，不用作当前工程证据；当前 100% 以此处明确链接的已验证截图为准。

检查结束已恢复全部图层可见及 100% 显示，见 恢复截图（历史路径：`review-02-evidence/screens/review-final-restored-100.png`） 和 显隐操作记录（历史路径：`review-02-evidence/logs/ui-waist-confirm-1792410698560920737.json`）。未绘画、未保存 KRA，未改写正式合成或参考。对快照所列 288 个受保护文件的 最终核验（历史路径：`review-02-evidence/protected-after-verification.json`） 显示无改动、无缺失，包括 input、split-test、step01 基线、当前 KRA、正式 composite 和正式报告；哈希只证明这些文件未被改写，不作为视觉结论。

本次仅交付第二轮独立 review 暂存报告及检查证据。以上编号反馈交回绘制者逐项处理；本 reviewer 未启动 repair 或后续 review。
