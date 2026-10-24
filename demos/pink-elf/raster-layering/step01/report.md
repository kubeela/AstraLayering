# Step01 人物绘画与深度分层 — repair02 后当前版本

当前交付：[character-depth.kra](character-depth.kra)、[character-depth.png](character-depth.png)。画布 **932×1688**，**65个逻辑part / 70个普通绘画层**，平级、无子节点及蒙版、按实际深度由下到上排列；鼻层透明度95/255保持。review02重新编号的 **R1–R9** 已逐项修复、自检并保存重开，见 [本轮返修暂存报告](repair-02.md.tmp)。

延续原工程，未重做合格的手、肩胸、骨盆、五官、饰品或已落实分片。返修前KRA、PNG、报告和结构记录在 [repair-02-work/before](repair-02-work/before/)，原生成、repair01过程和正式review/repair历史保留。当前完整part PNG在 `parts/<part_id>/final.png`，当前原生独显索引为 [inspection/layers-manifest.json](inspection/layers-manifest.json)。

## 参考、补绘与内容归属

- 参考始终为 [base-subject.png](../../part-layering/references/base-subject.png)，SHA-256 `811756ae2389b7e51eee0c0b683c0ca60d8db6adb0e833a07f5118148f44946e`。没有替换为standard/simplified，没有移动或缩放参考消差；局部对照按相同原坐标共同放大。
- 两片厚后发上部原绘画仍有硬块，使用 **内置image_gen.imagegen / imagegen技能** 分别补绘，每件1次。输入图1上部待修内容先清为中性灰，红区保留本件合格下段，黄区补本件头发、绿区透明；没有脸、身体、侧发或饰品作为补全来源。两个结果逐张检查后采用：长而弯曲、渐收尖的亮暗带连续，没有原拱形内边界和圆头短亮条。原始输出、两输入、精确提示词与注册记录在 [生成目录](repair-02-work/generation/)、[配准记录](repair-02-work/hair-registration.json)。
- 新补绘以连续RBF轮廓配准到原形；少量边缘不足仅沿本次生成纹理外推（全幅配准统计992/428像素，不从原图遮挡物取像素）。导入时保留旧alpha；上部与原中段重叠后在Krita沿发流画通，y≥585的合格原发尾从同part历史原生像素逐字节保留。不是只将旧补丁边缘抹软。
- 本轮使用Krita 5.3.4.1真实 `Node.paintPath` 画笔操作，共 **25条路径记录**，包括按路径逐段改变画笔尺寸的渐收尖发束；见 [笔触](repair-02-work/strokes.json)。两侧长侧发、颈隐藏端及双靴滚边均在本层真实修画；没有全层模糊、颜色阈值填色或新增AO/投影。
- R5清掉torso内的粉发与线色，补回的是本torso此前合格生成的承底及本件画笔；正确0530原生RGBA完全保持。R7参考覆盖仅为本腿真实可见皮肤，双靴支持及5px邻域明确排除；覆盖后用Krita接顺。其他隐藏发面/颈端仅由本件生成与画笔完成，没有复制参考遮挡物。见 [皮肤来源及选择记录](repair-02-work/skin-source-log.json)。

## 本轮9项修复

|review02编号 / 实际层|原因与实际处理|当前自检|
|---|---|---|
|[R1：画面左厚后发](repair-02-evidence/05-final/checks/R1.png)<br>0010 hair/back_hair/long_right|根至中段有拱形硬界、平直宽面及孤立圆头亮条。以本件下段为画风依据，上部灰化、逐件RGB控制补绘；连续RBF配准后保留原alpha，在Krita用渐收尖笔触接续新旧发面。|完整独显及只显头发看不到旧拱形分界/圆头亮条，亮暗带向下连续；原隐藏宽度、小尖、外卷尾及y≥585合格原像素保留。 **通过。**|
|[R2：画面右厚后发](repair-02-evidence/05-final/checks/R2.png)<br>0020 hair/back_hair/long_left|本侧根中段同样有拱形换色与片状亮条，不能镜像另一侧。本侧单独生成上部完整连续发面，按自身向外下弯曲配准，原生接通中段宽窄变化和柔线；同样保留原alpha及合格发尾。|单层、只显头发及全叠加核对发流连续；多尖末端、外卷尾、中央主尖、共同中央覆盖与0040在前关系保留。 **通过。**|
|[R3：画面左肩后长侧发](repair-02-evidence/05-final/checks/R3.png)<br>0030 hair/side_hair_right|y337附近是同一层内部的水平色面/发纹接头，不是cap切口。在本层跨界重画底色，以可变画笔尺寸的真实原生路径延展深粉分束、浅亮面及柔线，向隐藏圆端逐渐收尖。|独显、隐藏cap和叠加均无原横向接头；根端、长弧、回钩和开放空隙不变，没有并入0010或肩部像素。 **通过。**|
|[R4：画面右耳下侧发](repair-02-evidence/05-final/checks/R4.png)<br>0040 hair/side_hair_left|耳下浅粉亮条方头和短横折线破坏本侧曲率。在0040内消去方头色片，按耳后向下转弯的曲率延展亮暗带，原生渐收尖笔触接入长发。|单层、无cap及合成检查方头/阶梯块消除；小翘梢、完整根部和悬空长弧保留，耳朵/耳饰/前侧发未移动。 **通过。**|
|[R5：torso异属前侧发副本](repair-02-evidence/05-final/checks/R5.png)<br>0250 body/torso；正确发梢0530保持|肩带内侧粉弧同时存在于torso和0530，不能因合成相似保留。只在明确粉发足迹附近恢复本torso既有生成承底的皮肤与衣料，再用Krita小笔接顺肤色；没有从参考的遮挡发梢取像素。|torso独显与隐藏前侧发后无粉发残痕；0530完整RGBA与返修前一致，合成只由0530显示正确长梢，原锁骨和肩带保留。 **通过。**|
|[R6：neck隐藏下端](repair-02-evidence/05-final/checks/R6.png)<br>0240 neck|本层下端横向浅界和三角换色面是皮肤内部接缝。在neck内跨界重画连续肤色，以邻近皮肤暖色逐渐接向圆端，不复制被torso覆盖位置的原锁骨/衣料。|独显、隐藏torso及全叠加检查下端连续；上下完整圆端和alpha保留，上方颈侧体积保持，锁骨仍只由torso承担。 **通过。**|
|[R7：画面左小腿至踝](repair-02-evidence/05-final/checks/R7.png)<br>0060 legs/leg_right/leg|y1318附近浅色带和下方平直色区仍是宽区域接头。恢复本腿确实外露的参考皮肤，排除双靴支持及5px邻域，选择柔化仅控制合法可见像素混合；随后在Krita沿腿轴接顺。|单层、无前靴和叠加均无原横亮带；皮肤过渡连续，腿长、宽度、既有形体和完整靴内圆端保持，无靴色进入皮肤。 **通过。**|
|[R8：画面左靴V前口](repair-02-evidence/05-final/checks/R8.png)<br>0610 front；0056 rear保持|当前片界职责合理；主要缺少front内部连续滚边，旧描线偏切边且被低alpha削弱。在既有0610靴面内按实际本侧V口补通暗轮廓、浅粉滚边及上段浅亮，沿连续弧线接回两侧前翻口。|front/rear独显、同foot联合和合成均核对：V两支至底部连续，后衬仍在腿后；未扩靴、改alpha、挪腿或复制皮肤。 **通过。**|
|[R9：画面右靴V前口](repair-02-evidence/05-final/checks/R9.png)<br>0600 front；0055 rear保持|本侧同类前口绘画弱失；不是需要再提rear的深度问题。依本侧独立弧线在0600内补通暗边和浅粉滚边，保持本侧弯曲与V底暖粉层次，不镜像另一侧。|front/rear、联合与合成检查边沿结构完整；现有腿部范围、靴尺寸、固定花叶和独立链串保留，片界与层序不变。 **通过。**|

## 当前结构、形状与保留范围

本轮没有新深度穿插、独立运动节点或轮廓缺口需要拆层；R3/R4是同层绘画接头，R8/R9是前口内容，继续保留review02认可的分片。**全部70层原生alpha逐字节与返修前一致**；61层完整RGBA不变，仅9层修改绘画。两片厚后发下段、torso/左小腿明确修补盒外的原生像素也恢复为同part历史字节，防止PNG中转改变已合格区域。证据：[shape-and-preservation.json](repair-02-evidence/shape-and-preservation.json)。此检查验证归属支持及保留范围，不代替上述单层看图。

|共同逻辑part|实际普通绘画层 / 深度|当前区域和原因|
|---|---|---|
|`hair/back_hair/cap`|0005 nape_under_roots；0050 back；0560 crown|继承repair01确认的颈旁承底穿插：5在长/侧发根后，50为其余后脑，560为冠顶。三片同运动；本轮像素及片界不变。|
|`legs/leg_left/foot`|0055 rear；0600 front|预先多深度及repair01细化片界保持；蓝灰后衬/后唇在腿后，实际V前口和靴面在腿前。本轮只修600内的滚边。|
|`legs/leg_right/foot`|0056 rear；0610 front|同上，按本侧曲线；本轮只修610内的滚边。|
|`legs/leg_left/boot_gem_chain/flexible_connector`|0599 hidden_tip；0620 visible|原y≥1527末梢在固定花瓣后，其余在靴前；本轮RGBA和片界不变。|

其余61件各一完整层。精确区域和互补mask仍见 [depth-regions.json](depth-regions.json)，全部映射见 [structure-layer-map.json](structure-layer-map.json)。本轮相对当前有效色块图无形状超出/缺失、归属节点或深度变更；R5是清除违背既有归属的torso副本，不改变0530身份。初次眉形/眉层序、连接末梢及repair01左掌虎口修正继续有效。

## 逐件当前结果

全部70个普通分片的原生独显已在重开后刷新，65个逻辑part完整联合图位于 [05-final/parts](repair-02-evidence/05-final/parts/)。当前 [头发](inspection/hair.png)、[身体](inspection/body.png)、[手臂与手](inspection/arms-hands.png)、[脸与耳饰](inspection/face.png)、[靴及饰品](inspection/boots.png) 为1:1独显排版。本轮9个修改层逐一看独显、相应隐藏上层及全叠加；其余61层结合当前独显与原生RGBA一致性保留已合格结果。多深度件逐片及同part合看，没有把多层误作重复件。

|逻辑part|实际普通层|当前观察|
|---|---|---|
|`face/face_base`|0310 face/face_base|额头、太阳穴、眼口下方和下颌为连续皮肤；清除额头粉点、下巴圈状亮斑，原生细笔修下颌；无发丝、眉眼或嘴烘入。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_left/upper_eyelid`|0470 face/eye_left/upper_eyelid|完整厚上眼缘及连体睫毛，细端与外翼齐全，发下端已补。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_left/lower_eyelid`|0450 face/eye_left/lower_eyelid|细浅下缘及短尖完整，原生减淡硬边；不扩为粗眼线。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_left/sclera`|0390 face/eye_left/sclera|完整实心眼白，虹膜后无洞；浅紫灰角部保留，发下隐藏端完整。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_left/iris`|0410 face/eye_left/iris|完整椭圆虹膜含同动瞳孔；反光下有青蓝/紫蓝底；原生清除瞳孔下灰色小尾。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_left/highlight`|0430 face/eye_left/highlight|两处同动反光独立透明；按控制范围重修白点与青白下斑，未把虹膜底色并入。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_left/eyelid_crease`|0490 face/eye_left/eyelid_crease|独立浅弧睑褶，眉线不在此；发下隐端自然延续。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_right/upper_eyelid`|0480 face/eye_right/upper_eyelid|完整厚上眼缘及连体睫毛，细端与外翼齐全，发下端已补。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_right/lower_eyelid`|0460 face/eye_right/lower_eyelid|细浅下缘及短尖完整，原生减淡硬边；不扩为粗眼线。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_right/sclera`|0400 face/eye_right/sclera|完整实心眼白，虹膜后无洞；浅紫灰角部保留，发下隐藏端完整。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_right/iris`|0420 face/eye_right/iris|完整椭圆虹膜含同动瞳孔；反光下有青蓝/紫蓝底；原生清除瞳孔下灰色小尾。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_right/highlight`|0440 face/eye_right/highlight|两处同动反光独立透明；按控制范围重修白点与青白下斑，未把虹膜底色并入。 保留合格绘画，原生像素与返修前一致。|
|`face/eye_right/eyelid_crease`|0500 face/eye_right/eyelid_crease|独立浅弧睑褶，眉线不在此；发下隐端自然延续。 保留合格绘画，原生像素与返修前一致。|
|`face/eyebrow_left`|0570 face/eyebrow_left|改正误取睑褶的旧轮廓，独立真实眉弧；570在前发前表达透发线。 保留合格绘画，原生像素与返修前一致。|
|`face/eyebrow_right`|0580 face/eyebrow_right|保留真实眉弧，580在前发前；发层已不承载眉线。 保留合格绘画，原生像素与返修前一致。|
|`face/ear_left`|0270 face/ear_left|完整尖耳与耳根；隐藏端是耳肉，不是侧发。 保留合格绘画，原生像素与返修前一致。|
|`face/ear_right`|0280 face/ear_right|完整尖耳与耳根；细软内耳色，根部接续。 保留合格绘画，原生像素与返修前一致。|
|`face/nose`|0380 face/nose|保留浅暖棕鼻点，原生淡化和收低端；图层透明度95/255，未生成写实鼻体。 保留合格绘画，原生像素与返修前一致。|
|`face/mouth/upper_lip`|0370 face/mouth/upper_lip|细软暖色上唇缘，原生顺线；与牙、口腔独立。 保留合格绘画，原生像素与返修前一致。|
|`face/mouth/lower_lip`|0360 face/mouth/lower_lip|完整浅暖下唇弧，补全内缘，原生减淡。 保留合格绘画，原生像素与返修前一致。|
|`face/mouth/mouth_interior`|0320 face/mouth/mouth_interior|完整暖砖红口腔底，已刷掉生成的硬条带；无牙舌烘入。 保留合格绘画，原生像素与返修前一致。|
|`face/mouth/upper_teeth`|0350 face/mouth/upper_teeth|完整浅白上齿片，原生减硬边，无夸张牙缝。 保留合格绘画，原生像素与返修前一致。|
|`face/mouth/lower_teeth`|0330 face/mouth/lower_teeth|完整小浅白下齿片，清楚独立，无舌色并入。 保留合格绘画，原生像素与返修前一致。|
|`face/mouth/tongue`|0340 face/mouth/tongue|完整柔和粉舌面，根部在口腔中连续；无多余牙齿。 保留合格绘画，原生像素与返修前一致。|
|`hair/bangs`|0550 hair/bangs|采用第2版，去掉生成时烘入的眉线；尖束、根部完整，原生收外缘，最终加强保守红区的本件可见像素恢复。 保留合格绘画，原生像素与返修前一致。|
|`hair/front_side_hair_left`|0540 hair/front_side_hair_left|完整前侧弧与末梢；脸边、耳根和颈侧遮挡区为同束粉发。 保留合格绘画，原生像素与返修前一致。|
|`hair/front_side_hair_right`|0530 hair/front_side_hair_right|完整前侧弧及细末梢；不含眉线；耳下到颈侧长束已实画去碎白线，保留本件分叉和连续性。 保留合格绘画，原生像素与返修前一致。|
|`hair/side_hair_left`|0040 hair/side_hair_left|耳下方头亮条和横折接线已实画接顺，按本侧曲率延展，保留小翘梢和完整悬空弧。 repair02 R4修复复核通过。|
|`hair/side_hair_right`|0030 hair/side_hair_right|y337内部横缝已跨界实画，亮暗发束向下自然收尖，完整圆端、长弧、回钩及开放空隙保留。 repair02 R3修复复核通过。|
|`hair/back_hair/cap`|0005 hair/back_hair/cap :: nape_under_roots<br>0050 hair/back_hair/cap :: back<br>0560 hair/back_hair/cap :: crown|同一完整后脑分为5颈旁承底、50后脑、560冠顶；颈旁后置不改联合轮廓，三片同运动身份。 保留合格绘画，原生像素与返修前一致。|
|`hair/back_hair/long_left`|0020 hair/back_hair/long_left|本侧单独补绘根至中段，长而渐收尖的亮暗带连续；不镜像另一侧，多尖尾/主尖及585以下合格原像素保留。 repair02 R2修复复核通过。|
|`hair/back_hair/long_right`|0010 hair/back_hair/long_right|本轮上部RGB控制补绘并平滑配准，原生渐收尖笔触接通中段；无拱形换色/圆头亮条，585以下合格原发尾逐字节保留。 repair02 R1修复复核通过。|
|`hair/ahoge`|0045 hair/ahoge|完整呆毛弧，根端藏冠顶；无多余相邻发面。 保留合格绘画，原生像素与返修前一致。|
|`head_accessories/left_earring`|0290 head_accessories/left_earring|补全金色顶沿与粉色垂坠，已原生补金边并收粉坠边；未把侧发归入耳坠。 保留合格绘画，原生像素与返修前一致。|
|`head_accessories/right_earring`|0300 head_accessories/right_earring|金色三道顶边与粉坠同件，原生修复遗漏金边；根部在侧发后、内侧在脸后。 保留合格绘画，原生像素与返修前一致。|
|`neck`|0240 neck|隐藏下端横向肤色界和三角色面已在本层跨界实画接顺，上方形体及完整上下圆端保持，不再画锁骨。 repair02 R6修复复核通过。|
|`body/torso`|0250 body/torso|清除误带入的0530粉发及线色；用本torso已有生成承底恢复皮肤/衣料并原生修接，锁骨与肩带保留；正确发梢只在0530。 repair02 R5修复复核通过。|
|`body/breast`|0260 body/breast|两侧上角按各自衣边接顺；完整前部体积及衣料连续，无额外分界。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_left/upper_arm`|0220 arms/arm_left/upper_arm|完整肩头至肘；肩根为皮肤、无衣物或粉发；按本件真实SVG弧修轮廓，肘部衔接已复查。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_left/forearm`|0200 arms/arm_left/forearm|完整近肘圆端及腕端保留；腕/掌半圆色带接顺，只复用本前臂可见参考。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_left/hand/palm`|0140 arms/arm_left/hand/palm|掌体与腕根完整；指根横切假描边已消，真实虎口和指缝保留。删除误加虎口三角片并同步当前SVG。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_left/hand/thumb`|0130 arms/arm_left/hand/thumb|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_left/hand/index_finger`|0120 arms/arm_left/hand/index_finger|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_left/hand/middle_finger`|0110 arms/arm_left/hand/middle_finger|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_left/hand/ring_finger`|0100 arms/arm_left/hand/ring_finger|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_left/hand/little_finger`|0090 arms/arm_left/hand/little_finger|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_right/upper_arm`|0230 arms/arm_right/upper_arm|完整肩头至肘；肩根为皮肤、无衣物或粉发；按本件真实SVG弧修轮廓，肘部衔接已复查。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_right/forearm`|0210 arms/arm_right/forearm|完整近肘圆端及腕端保留；腕/掌半圆色带接顺，只复用本前臂可见参考。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_right/hand/palm`|0190 arms/arm_right/hand/palm|掌体与腕根完整；指根横切假描边已消，真实虎口和指缝保留。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_right/hand/thumb`|0180 arms/arm_right/hand/thumb|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_right/hand/index_finger`|0150 arms/arm_right/hand/index_finger|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_right/hand/middle_finger`|0160 arms/arm_right/hand/middle_finger|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_right/hand/ring_finger`|0170 arms/arm_right/hand/ring_finger|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`arms/arm_right/hand/little_finger`|0145 arms/arm_right/hand/little_finger|完整生成指根、指体、指尖及本指甲面保留；本指可见肤色与掌根接顺，独立图层、位置与真实指缝保持。 保留合格绘画，原生像素与返修前一致。|
|`pelvis`|0080 pelvis|上部圆弧完整，y624衣料换色硬缝已实画接顺；左右纵线贯通，无torso像素覆盖。 保留合格绘画，原生像素与返修前一致。|
|`legs/leg_left/leg`|0070 legs/leg_left/leg|本侧踝端色柱已顺本腿皮肤接通，完整隐藏圆端保留；未抬靴口掩盖。 保留合格绘画，原生像素与返修前一致。|
|`legs/leg_left/foot`|0055 legs/leg_left/foot :: rear<br>0600 legs/leg_left/foot :: front|在既有0600按本侧弧线补通V前口暗边/浅粉滚边；0055后衬在腿后，现有靴形、腿部范围及链串保持。 repair02 R9修复复核通过。|
|`legs/leg_left/boot_gem_chain/large_diamond_gem`|0630 legs/leg_left/boot_gem_chain/large_diamond_gem|完整单颗硬质菱晶，切面同件；无靴面或新增扣环。 保留合格绘画，原生像素与返修前一致。|
|`legs/leg_left/boot_gem_chain/small_diamond_charm`|0640 legs/leg_left/boot_gem_chain/small_diamond_charm|完整小菱坠，保持硬质尖端；连接另层。 保留合格绘画，原生像素与返修前一致。|
|`legs/leg_left/boot_gem_chain/round_bead`|0650 legs/leg_left/boot_gem_chain/round_bead|单颗圆珠完整、圆整；未把反光当作新珠粒。 保留合格绘画，原生像素与返修前一致。|
|`legs/leg_left/boot_gem_chain/flexible_connector`|0599 legs/leg_left/boot_gem_chain/flexible_connector :: hidden_tip<br>0620 legs/leg_left/boot_gem_chain/flexible_connector :: visible|三段原连接完整；y>=1525局部收窄，末梢599在固定花瓣后，其余620在靴前。 保留合格绘画，原生像素与返修前一致。|
|`legs/leg_right/leg`|0060 legs/leg_right/leg|跨y1318亮带恢复本腿可见皮肤并原生修顺，排除双靴支持及5px邻域；连续踝面和完整靴内圆端保留。 repair02 R7修复复核通过。|
|`legs/leg_right/foot`|0056 legs/leg_right/foot :: rear<br>0610 legs/leg_right/foot :: front|在既有0610内补通V前口暗边及浅粉滚边；0056后衬在腿后，片界、alpha及独立靴饰均不变。 repair02 R8修复复核通过。|
|`legs/leg_right/boot_gem`|0660 legs/leg_right/boot_gem|单颗完整菱晶，靴面未并入；保留原有低细节切面。 保留合格绘画，原生像素与返修前一致。|
|`legs/leg_right/boot_flower_ornament`|0670 legs/leg_right/boot_flower_ornament|花叶簇为同动整体；其后靴面已补全，无靴头滚边并入。 保留合格绘画，原生像素与返修前一致。|

## 上游记录、保存与重开

- 直接更新上游 [groups.json](../../part-layering/groups.json) 中9个绘画修正part的当前revision/层对应记录，以及 [occlusion.json](../../part-layering/occlusion.json) 的相应检查记录与来源指纹。全部ID、层序、区域及65份SVG几何/文件内容保持；官方 [逻辑联合预览](../../part-layering/preview.svg) 仍与当前支持一致，实际 [深度预览](../../part-layering/preview-depth.svg) 更新来源声明。当前RGB绘画预览、完整part PNG及独显/隐藏检查均已刷新。
- merge来源 `e0d8e8a6527a10b5edfb0584289ca94173bb8504391e817f9eaffb41ba18ea23`；occlusion来源 `77a30b9c785756a5397ac6097e50c3289ec919a6621dfe43d06156d0021d232f`。因groups的本轮记录变化，occlusion指纹已重算；没有恢复旧输入或重启上游。原生工作流解析、SVG引用、65件支持及70层对应均通过，见 [来源验证](source-hash-verification.json)、[交付验证](delivery-integrity.json)、[形状支持](shape-conformance.json)。当前产物记录为上游 `stages/raster-step01-artifacts.json` / `raster-repair-02-artifacts.json`。
- 最后保存同一KRA并由Krita关闭重开。70层顺序、名称、类型、透明度、可见性、无子节点状态及每层完整RGBA逐项一致，差异0；当前PNG、重开PNG和05-final合成像素相同，已观察实际重开画面。见 [重开记录](reopen-verification.json)。
- KRA SHA-256：`f9de3407e4c8c6e589ff9ce9ae3992ace16145b9ad3b35f7ce66566b2be940f9`；PNG SHA-256：`bf2f6be1856590a51d100bf4c739898ba17384a10c0eadea9286931f66cf3899`。

当前自检：review02 R1–R9已处理完成；无已知待修的本轮宽面接头、异属副本或前口结构缺失。细微抗锯齿与半透明柔边按既定边界留第二步。未推进后续流程或改调度状态/日志；本轮repair仅写指定暂存文件。
