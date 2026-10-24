结论：第二步已完成

交付：[character-soft-edges.kra](character-soft-edges.kra)、[character-soft-edges.png](character-soft-edges.png)。画布932×1688，透明背景，65个逻辑part / 70个平级普通绘画层，无蒙版、无子节点。名称、顺序、位置、混合模式、透明度、通道锁定和原深度分片全部保留。66层做局部精修，4层经检查保留原生像素。

## 实际输入与参考

- 只读输入KRA：`/Users/wutian/Desktop/coding/AstraLayering/.run/pink-elf/raster-layering/step01/character-depth.kra`，SHA-256 `f9de3407e4c8c6e589ff9ce9ae3992ace16145b9ad3b35f7ce66566b2be940f9`。
- 已阅读[第一步报告](../step01/report.md)，沿用其repair02后的已确认绘画、补全、配准和深度说明。首次另存第二步后核对输入/副本全部层像素一致，见[建立工程记录](bootstrap-complete.json)。随后持续修同一个第二步工程，每批均实际保存。
- 唯一绘画参考：`/Users/wutian/Desktop/coding/AstraLayering/.run/pink-elf/part-layering/references/base-subject.png`，SHA-256 `811756ae2389b7e51eee0c0b683c0ca60d8db6adb0e833a07f5118148f44946e`。参考未平移、缩放或换图；局部对照只把相同坐标共同放大。
- `../part-layering/groups.json`、`occlusion.json`及parts中的SVG继续沿用；本步无结构、归属或深度变更，不需回写上游。88个已记录的前序/上游输入文件散列全部保持，见[只读检查与交付检查](delivery-checks.json)。

## 修画方式与定位依据

像素差异工具生成151个候选区域，作为检查入口；[原始候选与框选图](difference-candidates/033273dd-ff34-4426-98f8-c39374845a7f/)及[逐框处理原则与关联层范围](candidate-dispositions.json)保留。大范围发色、补全及既有形体的差异没有按色差自动修复。随后扩展到全部70层独显、上层隐藏、整图和同part联合检查。

本步在Krita 5.3.4.1中以原生`Node.paintPath`执行逐处观察后记录的局部笔触，实际路径、尺寸、力度、本层采色和原因全部写入[drawing-strokes.json](drawing-strokes.json)。主要使用`x) Filter Blur`笔刷，按部位使用1.1–3.8px不同笔径与不同力度；这是沿具体轮廓/细线的画笔操作，没有对整层施加模糊或羽化。笔径不等于统一羽化宽度。先在临时层比较画笔效果，移除临时层并核对恢复，再修正式层，见[画笔测试](brush-probes/)。

衣缘和小腿偏色残线以本层自身的衣料/肤色描边采色，用柔笔或细实笔收净，再局部接顺。实笔收边锁定现有alpha，范围在原边缘约1–2px带内；没有贴入任何原图像素，没有引入邻件绘画、阴影、AO、投影或新高光。原生画笔操作不依赖颜色阈值填色、轮廓公式生成修复或全幅模糊。脚本用于送达明确笔触、导出和检查；所有检查图均为实际KRA像素导出。

本次computer-use入口提示显示环境锁定，改用正在运行的Krita原生脚本桥完成真实绘画、保存和重开。检查证据来自原生文档导出，不冒充屏幕截图。重开校验首次使用了不适用的Document接口名，已改为根节点投影接口并实际重试通过；未因此回退工程。

## 重点修整及结果

- 眼线：上眼缘内外边分段柔化，复修过锐弧段；保留深棕核心、睫毛尖、外翼和原厚度。眼白、虹膜、反光及浅睑线分别在自己的层上轻柔处理。
- 头发：冠顶、后脑外缘、刘海、前侧发、悬空长弧与发梢逐处微柔；保留尖束和回钩，未糊合开放空隙，第一步已修好的发流与内部补绘保持。
- 皮肤/衣料：手指、掌缘、四肢、尖耳、下颌及衣缘局部去阶梯；小腿最后复看发现细白缘，使用各自本腿的暖描边色收净后接顺。隐藏关节端与颈部补全连续性保持。
- 躯干右衣缘：约x538–544、y510–543的粉发残色，经单层8倍复看后多轮小笔修正为本衣料紫灰线色；未改alpha，未把后发贴入本层。见[最终衣缘局部](inspection/torso-edge-accepted-8x.png)。
- 靴/饰品：前靴圆趾、外沿、V口滚边和后唇局部微柔，连续滚边核心保持；菱饰只轻柔外斜缘，链条分段极轻处理；没有新切面或发光。鼻点、小坠、小珠和隐藏链尖已足够柔和，保留。

[参考 / step01 / step02局部三列对照](inspection/final/selected-before-after.png)展示眼缘、冠顶、指缘、衣缘、小腿和V口。灰底仅用于检查透明边，未写入工程或交付PNG。

## 逐层验收

全部层均查看原尺寸完整独显，以及400%同坐标局部；最终18页[外缘检查索引](inspection/final/edge-atlas/index.json)的R/S/H三行依次是原参考上下文、该层独显、实际隐藏全部上层后的Krita投影。隐藏端参考位置常是遮挡物，未用遮挡物当本层补全像素目标。完整独显：[头发](inspection/final/hair.png)、[身体](inspection/final/body.png)、[手臂与手](inspection/final/arms-hands.png)、[脸/耳饰](inspection/final/face.png)、[靴/饰品](inspection/final/boots.png)。

下表“S/H/A通过”分别表示单层边缘与归属检查、隐藏上层后完整连续性检查、全部叠加对照检查。每行链接提供相应独显与400%局部；[机器可读逐层记录](layer-acceptance.json)另含每层实际上层隐藏投影及同part联合图路径。

|实际绘画层 / 深度|主要问题与处理|独显 / 隐藏上层 / 全叠加|
|---|---|---|
|[0005 hair/back_hair/cap :: nape_under_roots](inspection/final/solos/0005.png)<br>[400%局部](inspection/final/edge-atlas/page-01.png)|修改：颈旁承底的物理外弧细阶梯；只柔化真实外缘，互补直切边保持。|S/H/A通过；补全连续，归属保持。|
|[0010 hair/back_hair/long_right](inspection/final/solos/0010.png)<br>[400%局部](inspection/final/edge-atlas/page-01.png)|修改：左厚后发长弧、卷尾及独显内侧边局部柔化，保留第一步渐收尖发流。|S/H/A通过；补全连续，归属保持。|
|[0020 hair/back_hair/long_left](inspection/final/solos/0020.png)<br>[400%局部](inspection/final/edge-atlas/page-01.png)|修改：右厚后发根端、内缘、外展弧及尾卷局部柔化，保留尖束和原补绘。|S/H/A通过；补全连续，归属保持。|
|[0030 hair/side_hair_right](inspection/final/solos/0030.png)<br>[400%局部](inspection/final/edge-atlas/page-01.png)|修改：左肩后长侧发主弧、回钩及内弧微柔，原横缝修复保持。|S/H/A通过；补全连续，归属保持。|
|[0040 hair/side_hair_left](inspection/final/solos/0040.png)<br>[400%局部](inspection/final/edge-atlas/page-02.png)|修改：右耳后长侧发外弧与悬空内弧微柔，未合拢开放空隙。|S/H/A通过；补全连续，归属保持。|
|[0045 hair/ahoge](inspection/final/solos/0045.png)<br>[400%局部](inspection/final/edge-atlas/page-02.png)|修改：呆毛内外细弧局部减锐，二次沿准确轮廓收顺顶端，细梢保持。|S/H/A通过；补全连续，归属保持。|
|[0050 hair/back_hair/cap :: back](inspection/final/solos/0050.png)<br>[400%局部](inspection/final/edge-atlas/page-02.png)|修改：后脑两侧轮廓与耳旁小折点微柔；冠顶和颈片互补切口保持。|S/H/A通过；补全连续，归属保持。|
|[0055 legs/leg_left/foot :: rear](inspection/final/solos/0055.png)<br>[400%局部](inspection/final/edge-atlas/page-02.png)|修改：左靴后衬物理外唇微柔，原后片内部切口保留。|S/H/A通过；补全连续，归属保持。|
|[0056 legs/leg_right/foot :: rear](inspection/final/solos/0056.png)<br>[400%局部](inspection/final/edge-atlas/page-03.png)|修改：右靴后衬两侧唇弧微柔，未改变后衬在腿后关系。|S/H/A通过；补全连续，归属保持。|
|[0060 legs/leg_right/leg](inspection/final/solos/0060.png)<br>[400%局部](inspection/final/edge-atlas/page-03.png)|修改：腿缘局部去台阶；最终复看外侧小腿白缘，用本腿暖线色在1–2px边缘带重接后局部柔化。|S/H/A通过；补全连续，归属保持。|
|[0070 legs/leg_left/leg](inspection/final/solos/0070.png)<br>[400%局部](inspection/final/edge-atlas/page-03.png)|修改：腿缘局部去台阶；小腿内外偏白细缘用本腿已有暖线色接顺，原腿形与膝部明暗保持。|S/H/A通过；补全连续，归属保持。|
|[0080 pelvis](inspection/final/solos/0080.png)<br>[400%局部](inspection/final/edge-atlas/page-03.png)|修改：骨盆衣片两侧、裤口细硬线及隐藏腰端微柔，内部衣褶保持。|S/H/A通过；补全连续，归属保持。|
|[0090 arms/arm_left/hand/little_finger](inspection/final/solos/0090.png)<br>[400%局部](inspection/final/edge-atlas/page-04.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0100 arms/arm_left/hand/ring_finger](inspection/final/solos/0100.png)<br>[400%局部](inspection/final/edge-atlas/page-04.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0110 arms/arm_left/hand/middle_finger](inspection/final/solos/0110.png)<br>[400%局部](inspection/final/edge-atlas/page-04.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0120 arms/arm_left/hand/index_finger](inspection/final/solos/0120.png)<br>[400%局部](inspection/final/edge-atlas/page-04.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0130 arms/arm_left/hand/thumb](inspection/final/solos/0130.png)<br>[400%局部](inspection/final/edge-atlas/page-05.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0140 arms/arm_left/hand/palm](inspection/final/solos/0140.png)<br>[400%局部](inspection/final/edge-atlas/page-05.png)|修改：左掌腕端、拇指侧及外缘微柔，复修硬斜缘，虎口空隙保持。|S/H/A通过；补全连续，归属保持。|
|[0145 arms/arm_right/hand/little_finger](inspection/final/solos/0145.png)<br>[400%局部](inspection/final/edge-atlas/page-05.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0150 arms/arm_right/hand/index_finger](inspection/final/solos/0150.png)<br>[400%局部](inspection/final/edge-atlas/page-05.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0160 arms/arm_right/hand/middle_finger](inspection/final/solos/0160.png)<br>[400%局部](inspection/final/edge-atlas/page-06.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0170 arms/arm_right/hand/ring_finger](inspection/final/solos/0170.png)<br>[400%局部](inspection/final/edge-atlas/page-06.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0180 arms/arm_right/hand/thumb](inspection/final/solos/0180.png)<br>[400%局部](inspection/final/edge-atlas/page-06.png)|修改：本指两侧、弯折与指尖按参考局部微柔；指甲和已有暖描边保持，未糊合邻指或指缝。|S/H/A通过；补全连续，归属保持。|
|[0190 arms/arm_right/hand/palm](inspection/final/solos/0190.png)<br>[400%局部](inspection/final/edge-atlas/page-06.png)|修改：右掌腕端与两侧斜缘局部微柔，保持指根覆盖与真实指缝。|S/H/A通过；补全连续，归属保持。|
|[0200 arms/arm_left/forearm](inspection/final/solos/0200.png)<br>[400%局部](inspection/final/edge-atlas/page-07.png)|修改：左前臂两侧和完整肘腕端局部柔化，保留皮肤自有暖线。|S/H/A通过；补全连续，归属保持。|
|[0210 arms/arm_right/forearm](inspection/final/solos/0210.png)<br>[400%局部](inspection/final/edge-atlas/page-07.png)|修改：右前臂肘侧至腕端及外斜缘局部柔化，原手势保持。|S/H/A通过；补全连续，归属保持。|
|[0220 arms/arm_left/upper_arm](inspection/final/solos/0220.png)<br>[400%局部](inspection/final/edge-atlas/page-07.png)|修改：左上臂肩端、内外缘与完整肘端局部柔化，不增加投影。|S/H/A通过；补全连续，归属保持。|
|[0230 arms/arm_right/upper_arm](inspection/final/solos/0230.png)<br>[400%局部](inspection/final/edge-atlas/page-07.png)|修改：右上臂肩缘、内外侧及肘端局部微柔，原关节体积保持。|S/H/A通过；补全连续，归属保持。|
|[0240 neck](inspection/final/solos/0240.png)<br>[400%局部](inspection/final/edge-atlas/page-08.png)|修改：颈的完整隐藏端和两侧轮廓微柔，第一步连续底色与下端保持。|S/H/A通过；补全连续，归属保持。|
|[0250 body/torso](inspection/final/solos/0250.png)<br>[400%局部](inspection/final/edge-atlas/page-08.png)|修改：肩/衣缘局部微柔；右衣缘y约510–543的粉发残色以本层紫灰描边色逐段收净，再局部接顺。|S/H/A通过；补全连续，归属保持。|
|[0260 body/breast](inspection/final/solos/0260.png)<br>[400%局部](inspection/final/edge-atlas/page-08.png)|修改：胸衣两侧、下弧及隐藏上缘局部微柔；复修过硬紫灰描边，保留描边核心。|S/H/A通过；补全连续，归属保持。|
|[0270 face/ear_left](inspection/final/solos/0270.png)<br>[400%局部](inspection/final/edge-atlas/page-08.png)|修改：尖耳根、内耳细线与外弧局部微柔，准确耳尖二次收顺，不缩短尖耳。|S/H/A通过；补全连续，归属保持。|
|[0280 face/ear_right](inspection/final/solos/0280.png)<br>[400%局部](inspection/final/edge-atlas/page-09.png)|修改：另一尖耳完整耳根、耳尖、外弧及内耳线局部微柔，耳肉补全保持。|S/H/A通过；补全连续，归属保持。|
|[0290 head_accessories/left_earring](inspection/final/solos/0290.png)<br>[400%局部](inspection/final/edge-atlas/page-09.png)|修改：左耳饰金属端和粉色垂坠外缘轻柔，未加入宝石细节。|S/H/A通过；补全连续，归属保持。|
|[0300 head_accessories/right_earring](inspection/final/solos/0300.png)<br>[400%局部](inspection/final/edge-atlas/page-09.png)|修改：右耳饰外缘与垂坠细线轻柔，金色浅纹保留。|S/H/A通过；补全连续，归属保持。|
|[0310 face/face_base](inspection/final/solos/0310.png)<br>[400%局部](inspection/final/edge-atlas/page-09.png)|修改：脸底额头、太阳穴及下颌逐段微柔；复修隐藏额缘和下颌细硬阶梯，不画眉眼发色。|S/H/A通过；补全连续，归属保持。|
|[0320 face/mouth/mouth_interior](inspection/final/solos/0320.png)<br>[400%局部](inspection/final/edge-atlas/page-10.png)|修改：口腔完整底片外缘轻柔，内部原色面保留。|S/H/A通过；补全连续，归属保持。|
|[0330 face/mouth/lower_teeth](inspection/final/solos/0330.png)<br>[400%局部](inspection/final/edge-atlas/page-10.png)|修改：下齿浅白片下弧轻柔，保留完整独立齿片。|S/H/A通过；补全连续，归属保持。|
|[0340 face/mouth/tongue](inspection/final/solos/0340.png)<br>[400%局部](inspection/final/edge-atlas/page-10.png)|修改：舌面的外缘与小弧微柔，原粉色层次保持。|S/H/A通过；补全连续，归属保持。|
|[0350 face/mouth/upper_teeth](inspection/final/solos/0350.png)<br>[400%局部](inspection/final/edge-atlas/page-10.png)|修改：上齿薄片边缘极轻柔，保留完整浅白片。|S/H/A通过；补全连续，归属保持。|
|[0360 face/mouth/lower_lip](inspection/final/solos/0360.png)<br>[400%局部](inspection/final/edge-atlas/page-11.png)|修改：下唇细浅弧轻柔，不加粗唇线。|S/H/A通过；补全连续，归属保持。|
|[0370 face/mouth/upper_lip](inspection/final/solos/0370.png)<br>[400%局部](inspection/final/edge-atlas/page-11.png)|修改：上唇细暖弧局部柔化，保持角端与完整弧。|S/H/A通过；补全连续，归属保持。|
|[0380 face/nose](inspection/final/solos/0380.png)<br>[400%局部](inspection/final/edge-atlas/page-11.png)|检查保留：原鼻点已经淡软，95/255层透明度及原生RGBA全部保留。|S/H/A通过；补全连续，归属保持。|
|[0390 face/eye_left/sclera](inspection/final/solos/0390.png)<br>[400%局部](inspection/final/edge-atlas/page-11.png)|修改：完整左眼白轮廓及下弧微柔，未混入皮肤/虹膜。|S/H/A通过；补全连续，归属保持。|
|[0400 face/eye_right/sclera](inspection/final/solos/0400.png)<br>[400%局部](inspection/final/edge-atlas/page-12.png)|修改：完整右眼白外轮廓及下弧微柔，浅紫灰角部保持。|S/H/A通过；补全连续，归属保持。|
|[0410 face/eye_left/iris](inspection/final/solos/0410.png)<br>[400%局部](inspection/final/edge-atlas/page-12.png)|修改：左虹膜圆缘与极小瞳孔边局部减锐，下缘复修，蓝色层次保持。|S/H/A通过；补全连续，归属保持。|
|[0420 face/eye_right/iris](inspection/final/solos/0420.png)<br>[400%局部](inspection/final/edge-atlas/page-12.png)|修改：右虹膜圆缘和极小瞳孔边轻柔，原完整椭圆保持。|S/H/A通过；补全连续，归属保持。|
|[0430 face/eye_left/highlight](inspection/final/solos/0430.png)<br>[400%局部](inspection/final/edge-atlas/page-12.png)|修改：左白点与青白反光边极轻柔，不减掉小亮点。|S/H/A通过；补全连续，归属保持。|
|[0440 face/eye_right/highlight](inspection/final/solos/0440.png)<br>[400%局部](inspection/final/edge-atlas/page-13.png)|修改：右反光点及下斑微柔，保留独立透明职责。|S/H/A通过；补全连续，归属保持。|
|[0450 face/eye_left/lower_eyelid](inspection/final/solos/0450.png)<br>[400%局部](inspection/final/edge-atlas/page-13.png)|修改：左下眼缘细浅弧局部减锐，不扩成粗线。|S/H/A通过；补全连续，归属保持。|
|[0460 face/eye_right/lower_eyelid](inspection/final/solos/0460.png)<br>[400%局部](inspection/final/edge-atlas/page-13.png)|修改：右下眼缘薄弧局部微柔，保留角端短尖。|S/H/A通过；补全连续，归属保持。|
|[0470 face/eye_left/upper_eyelid](inspection/final/solos/0470.png)<br>[400%局部](inspection/final/edge-atlas/page-13.png)|修改：左上眼缘内外边分段柔化并复修偏锐段，深棕核心与睫毛尖保留。|S/H/A通过；补全连续，归属保持。|
|[0480 face/eye_right/upper_eyelid](inspection/final/solos/0480.png)<br>[400%局部](inspection/final/edge-atlas/page-14.png)|修改：右上眼缘内外弧分段柔化，外翼与睫毛细端保持。|S/H/A通过；补全连续，归属保持。|
|[0490 face/eye_left/eyelid_crease](inspection/final/solos/0490.png)<br>[400%局部](inspection/final/edge-atlas/page-14.png)|修改：左睑褶细暖弧轻柔，原隐藏端连续。|S/H/A通过；补全连续，归属保持。|
|[0500 face/eye_right/eyelid_crease](inspection/final/solos/0500.png)<br>[400%局部](inspection/final/edge-atlas/page-14.png)|修改：右睑褶细暖弧轻柔，不混入眉线。|S/H/A通过；补全连续，归属保持。|
|[0530 hair/front_side_hair_right](inspection/final/solos/0530.png)<br>[400%局部](inspection/final/edge-atlas/page-14.png)|修改：左前侧发脸旁内外弧、颈侧细梢及少数硬发丝局部柔化。|S/H/A通过；补全连续，归属保持。|
|[0540 hair/front_side_hair_left](inspection/final/solos/0540.png)<br>[400%局部](inspection/final/edge-atlas/page-15.png)|修改：右前侧发额旁、耳下小尖及内外弧微柔，保持耳饰空间。|S/H/A通过；补全连续，归属保持。|
|[0550 hair/bangs](inspection/final/solos/0550.png)<br>[400%局部](inspection/final/edge-atlas/page-15.png)|修改：刘海轮廓、额前切边及两处硬细发丝局部减锐，细尖保持。|S/H/A通过；补全连续，归属保持。|
|[0560 hair/back_hair/cap :: crown](inspection/final/solos/0560.png)<br>[400%局部](inspection/final/edge-atlas/page-15.png)|修改：冠顶真实上轮廓和两侧斜缘复修细阶梯；内部互补弧切口保留。|S/H/A通过；补全连续，归属保持。|
|[0570 face/eyebrow_left](inspection/final/solos/0570.png)<br>[400%局部](inspection/final/edge-atlas/page-15.png)|修改：左眉细弧减锐，原长度、位置和透发层序保持。|S/H/A通过；补全连续，归属保持。|
|[0580 face/eyebrow_right](inspection/final/solos/0580.png)<br>[400%局部](inspection/final/edge-atlas/page-16.png)|修改：右眉弧微柔，细端及淡暖色保持。|S/H/A通过；补全连续，归属保持。|
|[0599 legs/leg_left/boot_gem_chain/flexible_connector :: hidden_tip](inspection/final/solos/0599.png)<br>[400%局部](inspection/final/edge-atlas/page-16.png)|检查保留：仅2×3px的隐藏链尖原已柔和，原生RGBA与切口全部保留。|S/H/A通过；补全连续，归属保持。|
|[0600 legs/leg_left/foot :: front](inspection/final/solos/0600.png)<br>[400%局部](inspection/final/edge-atlas/page-16.png)|修改：左前靴外侧、鞋底、圆趾及V口滚边细缘局部柔化，连续粉滚边核心保持。|S/H/A通过；补全连续，归属保持。|
|[0610 legs/leg_right/foot :: front](inspection/final/solos/0610.png)<br>[400%局部](inspection/final/edge-atlas/page-16.png)|修改：右前靴内外侧、底端及V口局部轻柔，保留第一步连续滚边。|S/H/A通过；补全连续，归属保持。|
|[0620 legs/leg_left/boot_gem_chain/flexible_connector :: visible](inspection/final/solos/0620.png)<br>[400%局部](inspection/final/edge-atlas/page-17.png)|修改：可见细链三个短段极轻减硬，连接tip和小坠独立性保持。|S/H/A通过；补全连续，归属保持。|
|[0630 legs/leg_left/boot_gem_chain/large_diamond_gem](inspection/final/solos/0630.png)<br>[400%局部](inspection/final/edge-atlas/page-17.png)|修改：左大菱饰斜缘轻柔，保留原顶点及淡色面。|S/H/A通过；补全连续，归属保持。|
|[0640 legs/leg_left/boot_gem_chain/small_diamond_charm](inspection/final/solos/0640.png)<br>[400%局部](inspection/final/edge-atlas/page-17.png)|检查保留：7×7px小菱坠原有半透明过渡足够，原生RGBA保留，避免把尖端磨掉。|S/H/A通过；补全连续，归属保持。|
|[0650 legs/leg_left/boot_gem_chain/round_bead](inspection/final/solos/0650.png)<br>[400%局部](inspection/final/edge-atlas/page-17.png)|检查保留：5×5px小珠原已柔和，原生RGBA保留，未新增光晕。|S/H/A通过；补全连续，归属保持。|
|[0660 legs/leg_right/boot_gem](inspection/final/solos/0660.png)<br>[400%局部](inspection/final/edge-atlas/page-18.png)|修改：右菱饰斜缘微柔，未新增切面或高光。|S/H/A通过；补全连续，归属保持。|
|[0670 legs/leg_right/boot_flower_ornament](inspection/final/solos/0670.png)<br>[400%局部](inspection/final/edge-atlas/page-18.png)|修改：右鞋花饰逐段柔化外瓣细缘，原薄瓣层次与固定归属保持。|S/H/A通过；补全连续，归属保持。|

## 多深度件联合检查

|同一逻辑part|沿用普通层深度|联合核对|
|---|---|---|
|hair/back_hair/cap|0005 nape_under_roots / 0050 back / 0560 crown|只处理真实外轮廓，不把内部互补切口当轮廓羽化；联合后无新透明缝，完整后脑连续。|
|legs/leg_left/foot|0055 rear / 0600 front|后唇仍在腿后、V口及靴面在腿前；联合完整，滚边连续。|
|legs/leg_right/foot|0056 rear / 0610 front|同上，保留本侧曲率，未合层或调深度。|
|legs/leg_left/boot_gem_chain/flexible_connector|0599 hidden_tip / 0620 visible|仅可见短段轻柔；2×3px隐藏末梢保留，联合连续，固定花瓣前后关系保持。|

[同part完整联合检查图](inspection/final/depth-unions.png)。没有把一个共同运动part的多个普通层误判为重复件。

## 重开与交付核对

完成最后小腿修整后再次保存、关闭并从`step02/character-soft-edges.kra`重新打开。逐层原生RGBA散列、alpha、名称、顺序、透明度、位置、混合模式、可见性与保存前逐项一致；根节点合成投影字节散列一致。见[实际重开证据](reopen-proof.json)。KRA内全部70层XML属性进一步与输入逐项比较一致，包含原选中层和通道锁定；无新增层、蒙版或子节点。

交付PNG由重新打开并核对过的最终KRA导出，932×1688、RGBA、透明背景；PNG的完整RGBA与KRA内mergedimage逐字节一致。诊断显示半alpha轮廓最大外移1px、最大内移2px，alpha24支持最多向外约1.42px；这些仅验证改动未越出边缘职责，不代替看图验收。

最终[原坐标整图对照](inspection/final/reference-vs-final-native.png)及[同坐标局部对照目录](inspection/final/checks/)已检查。保留第一步形体和补绘基线；参考中脸部光感、口眼细形及部分后发内部纹理与既有分件补绘仍有差异，本步没有为了消色差而重塑五官、重画整发或增加阴影。上述属于沿用输入的差异，完整保留参考对照供后续查看。本步范围内未发现需继续修理的明显硬切边、异属残线、新接缝或结构问题。

本次记录155条明确局部笔触、实际157次落笔；66层像素有变，0380/0599/0640/0650四层原生RGBA保持。最终文件SHA-256：

- `character-soft-edges.kra`：`43e02e0ceeeb8c5434b65b1a6f84a430c0e5994fd6265a6ccbdde541235cbe5c`。
- `character-soft-edges.png`：`c72636222385240859a31789d363bd79d9f9be2dc262dba9feecc178001b2459`。
