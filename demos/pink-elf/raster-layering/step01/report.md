# Pink Elf raster step01 交付与验收报告

状态：完成。65 个逻辑部件，69 个普通绘画层；932×1688，透明画布。最终 KRA 已保存、重新打开，并确认图层顺序、类型、子节点数和每层像素未变化。

## 交付

- `character-depth.kra`：最终可编辑文件，所有分片均为普通绘画层；无蒙版、无组子节点。按深度数值由下到上排列。
- `character-depth.png`：最终整图预览。
- `krita-exports/*-native.png`：每个实际绘画层的原尺寸独立预览，透明外围裁边仅用于查看；同名无 `-native` 文件为完整画布 PNG。
- `final-layer-map.json`：原 part ID → 实际绘画层、深度和 PNG 的映射。
- `visual-review/acceptance.json`：逐部件原尺寸目视检查记录；头、躯干、手、靴的参考及组装原尺寸裁图也在该目录。
- `reopen-verification.json`、`final-audit.json`：重开保持性、层结构、深度和形状边界的辅助核对。

## 参考与生成流程

直接读取上游 `groups.json`、`occlusion.json`、65 个 part SVG 和 `references/base-subject.png`，未建立输入副本。原图为 932×1688；本步保留白色连体服，与本步参考图的可见外观一致。没有推进后续步骤。

每件均调用 `image_gen.imagegen` 生成三色控制图及透明部件补全图。`control-guide.png` 仅是几何输入草稿，实际生成图为 `control-generated-v*.png`；再约束到正式 part 形状，得到 `control-registered.png`。黄色和绿色区域的原图遮挡物在送入补全前清为中性灰；灰底输入、控制图和提示词均保存在对应 `parts/<ID以__分隔>/` 中。

每件保存 `completion-generated-v*.png`、配准 PNG、`part.json` 和生成记录。最早的脸底记录采用 `control-prompt-v1.txt`、`completion-prompt-v1.txt` 与对应生成 PNG；其余主要采用 `*-record-v*.json`。等比放大的裁图用于生成，最终均配准回原画布。宽件采用全框仿射，窄长件视情况采用平滑行轮廓配准；不得把生成结果的比例漂移作为最终形状。

可见原图像素只叠入已核对的本件区域；头发、衣物、饰物和独立五官的边缘污染按目视位置排除，位置见 `visible-exclusions.json`。黄色区保持真实生成补全，不用原图遮挡物填回。原尺寸查看后在 Krita 进行采色笔触、可见区克隆、边缘修整和沿手工指定接缝的局部柔化；操作及参数见 `krita-operation-log.jsonl`、`krita-control.py`。颜色分类只读取 RGB 控制指令，未用颜色阈值自动填色代替修画。

## 重生与修画

- 两束长后发第1稿出现透明月牙裂口，改提示后采用第2稿；补全面恢复为连续发丝。
- 左上臂第1稿多出明显暗弧，采用第2稿；骨盆第1稿顶弧不足，采用第2稿补足；左手掌第1稿腕端缺口及条纹，采用第2稿。
- 下唇、右耳饰采用第2稿；躯干、右靴及右靴宝石的控制图按实际颜色指令错误重生。全部版本及采用版号保留在每件目录。
- 胸片、骨盆和个别手指生成时曾遭服务拒绝；保留拒绝记录，改成中性部件与着衣描述并重试成功。不存在失败后悄悄用原图替代补全的部件。
- 脸底的眉线/发色残留、窄发边拉纹、眼睑与唇缘的邻接像素、手指多余深线、靴面饰物残留逐项清理；胸腹、腰髋、肩肘、腿根和发根接合反复检查后修顺。
- 所有层完成后逐张单独查看实际 Krita 原尺寸导出；修改过的部件再次查看。组装验收另外比对整体比例、脸部表情、发型、色调、衣料轮廓、手部和靴部前后关系，不使用 PSNR 或原图逐像素相似度代替观感。

## 深度拆层

以下4件为上游预先标注的多深度件，全部已落实。先对已生成、配准的完整件作互补像素切分，再导入/替换为 Krita 普通绘画层；切分过程的复合 RGBA 无损记录见 `depth-slices/verified-slices.json`。串线随后按上游要求收窄末端，单列于形状调整。共同的逻辑 part 和运动身份不变。

| 原 part ID | 实际绘画层 | 区域、最终深度与原因 |
|---|---|---|
| `hair/back_hair/cap` | `0050 hair/back_hair/cap :: back` | 完整后脑承底、两侧贴头发面及耳根以下接合；在长后发与侧发根之前，在脸、耳、前侧发、刘海之后。与冠顶560沿发旋外侧弧连续连接，无脸形洞。 |
| `hair/back_hair/cap` | `0560 hair/back_hair/cap :: crown` | 冠顶外壳至约(453,94)的发旋根部覆盖层；实际像素分界为 y=94+0.0033*(x-453)^2 且 y<151 的弧形上侧，覆盖呆毛、前侧发及刘海伸入根端。弧外及耳根下行部分仍归50，不横切头盖。 |
| `legs/leg_left/foot` | `0055 legs/leg_left/foot :: rear` | 画面右靴的后侧蓝灰内衬、后唇及踝后包裹面；在左腿70之后。沿两侧翻口折转至中心x510附近的V形接合线，与600互补连续，不作水平截断。 |
| `legs/leg_left/foot` | `0600 legs/leg_left/foot :: front` | 画面右靴的前V口、前翻边、完整筒面、鞋面、鞋头、鞋底和固定花叶；覆盖左腿隐藏踝端。V形分界中心约(510,1449)，向两侧翻口上行；宝石和外露串线在本层前，连接短尾599在固定花瓣后。 |
| `legs/leg_right/foot` | `0056 legs/leg_right/foot :: rear` | 画面左靴的蓝灰后侧内衬、后唇和踝后包裹面，在右腿60之后；沿两侧翻口折线向中心x419附近V口连续连接610。 |
| `legs/leg_right/foot` | `0610 legs/leg_right/foot :: front` | 画面左靴前V口、前翻边、完整筒面、鞋面、鞋尖、鞋底和本体固定珠点，在右腿60之前。中心分界约(419,1449)向两侧折口上行；独立宝石660和花簇670在本体前。 |
| `legs/leg_left/boot_gem_chain/flexible_connector` | `0599 legs/leg_left/boot_gem_chain/flexible_connector :: hidden_tip` | 仅圆珠下短尾的末端 y1527–1529，约x509.4–510.6，位于左靴600固定花瓣后；与620尾段连续，不将整串线埋在靴后。 |
| `legs/leg_left/boot_gem_chain/flexible_connector` | `0620 legs/leg_left/boot_gem_chain/flexible_connector :: visible` | 大宝石至小菱坠、小菱坠至圆珠两段细线，以及圆珠至花瓣接触前的短尾；在靴600之前、硬件630/640/650之后。尾段于y1527转入599，y1525之后局部收窄，不穿过花瓣正面。 |

Krita 核对完成后已通过配套 `update_occlusion` 工具，仅精准更新上述4条的区域及核对说明。最终数值为 cap 50/560、左靴55/600、右靴56/610、串线599/620。眉毛与刘海的交界已专门比较，最终沿用上游510/520的遮挡顺序；组装未发现必须新增的其他多深度 part。没有因多深度退回上游重拆。

## 形状与归属调整、偏差

1. `face/eyebrow_left`：落实上游已注明的位置错误修正，将原 SVG 的 y185–193 上移19px至 y166–174，保持原弧形与逻辑身份。局部工作形状为该件目录中的 `raster-shape-adjustment.svg`；正式上游 SVG 未改，最终深度仍为510。
2. `legs/leg_left/boot_gem_chain/flexible_connector`：落实上游已注明的末端过粗修正，在 y1525–1529、x约509.4–510.6 局部收窄至约1.2px，并将 y1527以后短尾放在599。相对原 SVG，13个像素的 alpha 改变，其中4个原边缘采样清为透明；无向外增加像素。两段主要串线及各硬件归属不变。
3. 除上述2项外，所有逻辑部件的最终 alpha（多深度按分片并集）与对应正式 SVG 栅格形状一致；没有其他轮廓外扩、缺失或所有权改动。胸腹和骨盆的白色衣料在本步保留。左靴固定花叶、右靴固定小珠点均按上游说明属于靴本体，并非拆层残留。

逐层看补全面均连续、完整，未见头发/衣物/饰品误画到皮肤补全区，或脚链/独立花簇残留到应清空的靴面。整图在发型、姿态、比例和浅淡动漫上色上高度还原参考；新增隐藏发丝和皮肤/衣料过渡是补全推断，保留同一画风。原图透明边缘的散点不作为应保留的人物形状。

## 逐件验收与最终层表

下表采用版号来自每件 `part.json`；所有项均已检查实际原尺寸绘画层。多深度件的每个分片分别查看，并额外检查合成连续性。

| 原 part ID | 实际层名（深度由前缀给出） | 补全采用版 | 原尺寸目视结论 |
|---|---|---|---|
| `hair/back_hair/long_right` | `0010 hair/back_hair/long_right` | v2 | 已原尺寸单看完整后发：身体后的宽补全面为连续发丝；无透明裂口或人体残留。修顺根部和亮暗接头，外卷、发梢及真实空隙保留。 |
| `hair/back_hair/long_left` | `0020 hair/back_hair/long_left` | v2 | 已原尺寸单看完整后发：身体后的宽补全面为连续发丝；无透明裂口或人体残留。修顺根部和亮暗接头，外卷、发梢及真实空隙保留。 |
| `hair/side_hair_right` | `0030 hair/side_hair_right` | v1 | 完整侧束与悬空回钩保持相连；弧内真实负空间保留，隐藏根端为发丝而非皮肤。 |
| `hair/side_hair_left` | `0040 hair/side_hair_left` | v1 | 完整侧束与悬空回钩保持相连；弧内真实负空间保留，隐藏根端为发丝而非皮肤。 |
| `hair/ahoge` | `0045 hair/ahoge` | v1 | 上翘弧与隐藏根端完整，弧内空隙保留；根端被冠顶遮住。 |
| `legs/leg_right/leg` | `0060 legs/leg_right/leg` | v1 | 髋根至靴内踝端为连续皮肤，未夹带衣物、靴或脚链；腿根与边缘经笔触及局部柔化修顺。 |
| `legs/leg_left/leg` | `0070 legs/leg_left/leg` | v1 | 髋根至靴内踝端为连续皮肤，未夹带衣物、靴或脚链；腿根与边缘经笔触及局部柔化修顺。 |
| `pelvis` | `0080 pelvis` | v2 | 腰部伸入端、髋部及裆部为完整着衣整体；第2稿补足顶弧，清除重复衣边并修顺腰腿接合。 |
| `arms/arm_left/hand/little_finger` | `0090 arms/arm_left/hand/little_finger` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_left/hand/ring_finger` | `0100 arms/arm_left/hand/ring_finger` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_left/hand/middle_finger` | `0110 arms/arm_left/hand/middle_finger` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_left/hand/index_finger` | `0120 arms/arm_left/hand/index_finger` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_left/hand/thumb` | `0130 arms/arm_left/hand/thumb` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_left/hand/palm` | `0140 arms/arm_left/hand/palm` | v2 | 手腕伸入端、掌面与拇指根完整；腕端无缺口或衣发混入，掌纹保持轻软。 |
| `arms/arm_right/hand/little_finger` | `0145 arms/arm_right/hand/little_finger` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_right/hand/index_finger` | `0150 arms/arm_right/hand/index_finger` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_right/hand/middle_finger` | `0160 arms/arm_right/hand/middle_finger` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_right/hand/ring_finger` | `0170 arms/arm_right/hand/ring_finger` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_right/hand/thumb` | `0180 arms/arm_right/hand/thumb` | v1 | 指根、指身和指尖独立完整；掌/邻指遮挡处补成皮肤，清理多余深线与错误甲线。 |
| `arms/arm_right/hand/palm` | `0190 arms/arm_right/hand/palm` | v1 | 手腕伸入端、掌面与拇指根完整；腕端无缺口或衣发混入，掌纹保持轻软。 |
| `arms/arm_left/forearm` | `0200 arms/arm_left/forearm` | v1 | 近肘圆弧至手腕完整，隐藏端为皮肤；可见肘接缝已清理。 |
| `arms/arm_right/forearm` | `0210 arms/arm_right/forearm` | v1 | 近肘圆弧至手腕完整，隐藏端为皮肤；可见肘接缝已清理。 |
| `arms/arm_left/upper_arm` | `0220 arms/arm_left/upper_arm` | v2 | 肩根和腋侧补成皮肤，至肘端连续；无衣带或头发，修顺隐藏区多余暗弧。 |
| `arms/arm_right/upper_arm` | `0230 arms/arm_right/upper_arm` | v1 | 肩根和腋侧补成皮肤，至肘端连续；无衣带或头发，修顺隐藏区多余暗弧。 |
| `neck` | `0240 neck` | v1 | 下颌后隐藏上端和衣领后颈根补成连续皮肤，已修顺交接，无头发或衣物残留。 |
| `body/torso` | `0250 body/torso` | v1 | 肩、锁骨、胸廓至腹部完整；胸片后的衣料承底连续，无透明洞；修顺胸腹与腰接缝。 |
| `body/breast` | `0260 body/breast` | v1 | 完整着衣胸部片，原图可见衣料和皮肤准确叠加；去掉生成稿在概念分界处增加的轮廓。 |
| `face/ear_left` | `0270 face/ear_left` | v1 | 耳根补成耳部皮肤与软骨，耳尖完整；无头发或耳饰混入。 |
| `face/ear_right` | `0280 face/ear_right` | v1 | 耳根补成耳部皮肤与软骨，耳尖完整；无头发或耳饰混入。 |
| `head_accessories/left_earring` | `0290 head_accessories/left_earring` | v1 | 饰件独立完整，清理邻接发色和皮肤边像素；小尺寸软线条保持。 |
| `head_accessories/right_earring` | `0300 head_accessories/right_earring` | v2 | 饰件独立完整，清理邻接发色和皮肤边像素；小尺寸软线条保持。 |
| `face/face_base` | `0310 face/face_base` | v1 | 完整额头、脸颊、下颌为连续皮肤；无眼口洞，无发丝、眉眼、鼻线、嘴或饰物残留。 |
| `face/mouth/mouth_interior` | `0320 face/mouth/mouth_interior` | v1 | 完整口腔承底，牙和舌下方连续；无牙齿/唇皮混入。 |
| `face/mouth/lower_teeth` | `0330 face/mouth/lower_teeth` | v1 | 独立牙带完整，边缘柔和，无舌或口腔色块残留。 |
| `face/mouth/tongue` | `0340 face/mouth/tongue` | v1 | 舌面完整连续，软粉色明暗，无牙齿残留。 |
| `face/mouth/upper_teeth` | `0350 face/mouth/upper_teeth` | v1 | 独立牙带完整，边缘柔和，无舌或口腔色块残留。 |
| `face/mouth/lower_lip` | `0360 face/mouth/lower_lip` | v2 | 唇缘独立，内侧保持透明，清理口腔和邻接皮肤污染。 |
| `face/mouth/upper_lip` | `0370 face/mouth/upper_lip` | v1 | 唇缘独立，内侧保持透明，清理口腔和邻接皮肤污染。 |
| `face/nose` | `0380 face/nose` | v1 | 仅鼻部独立细线，邻接面部底色及口部像素未混入。 |
| `face/eye_left/sclera` | `0390 face/eye_left/sclera` | v1 | 完整眼白含虹膜覆盖区，连续浅色眼球底面，无虹膜和睫毛残留。 |
| `face/eye_right/sclera` | `0400 face/eye_right/sclera` | v1 | 完整眼白含虹膜覆盖区，连续浅色眼球底面，无虹膜和睫毛残留。 |
| `face/eye_left/iris` | `0410 face/eye_left/iris` | v1 | 完整虹膜，瞳孔与蓝紫渐层连贯；独立高光归高光层。 |
| `face/eye_right/iris` | `0420 face/eye_right/iris` | v1 | 完整虹膜，瞳孔与蓝紫渐层连贯；独立高光归高光层。 |
| `face/eye_left/highlight` | `0430 face/eye_left/highlight` | v1 | 仅保留该眼高光形状，透明间隙干净，无虹膜底色。 |
| `face/eye_right/highlight` | `0440 face/eye_right/highlight` | v1 | 仅保留该眼高光形状，透明间隙干净，无虹膜底色。 |
| `face/eye_left/lower_eyelid` | `0450 face/eye_left/lower_eyelid` | v1 | 上下眼睑各自独立，清理邻接虹膜/眼白/发色像素，软线条与原图相符。 |
| `face/eye_right/lower_eyelid` | `0460 face/eye_right/lower_eyelid` | v1 | 上下眼睑各自独立，清理邻接虹膜/眼白/发色像素，软线条与原图相符。 |
| `face/eye_left/upper_eyelid` | `0470 face/eye_left/upper_eyelid` | v1 | 上下眼睑各自独立，清理邻接虹膜/眼白/发色像素，软线条与原图相符。 |
| `face/eye_right/upper_eyelid` | `0480 face/eye_right/upper_eyelid` | v1 | 上下眼睑各自独立，清理邻接虹膜/眼白/发色像素，软线条与原图相符。 |
| `face/eye_left/eyelid_crease` | `0490 face/eye_left/eyelid_crease` | v1 | 细软睑褶独立，未混入眉毛或发丝。 |
| `face/eye_right/eyelid_crease` | `0500 face/eye_right/eyelid_crease` | v1 | 细软睑褶独立，未混入眉毛或发丝。 |
| `face/eyebrow_left` | `0510 face/eyebrow_left` | v1 | 按上游待修要求上移19px，细眉完整；最终仍在510、刘海后。 |
| `face/eyebrow_right` | `0520 face/eyebrow_right` | v1 | 细眉完整；最终仍在520、刘海后，可见段与刘海交界核对。 |
| `hair/front_side_hair_right` | `0530 hair/front_side_hair_right` | v1 | 隐藏发根至沿脸侧下行发面连续；边缘无脸肤/眉线残留，窄尖和分叉保留。 |
| `hair/front_side_hair_left` | `0540 hair/front_side_hair_left` | v1 | 隐藏发根至沿脸侧下行发面连续；边缘无脸肤/眉线残留，窄尖和分叉保留。 |
| `hair/bangs` | `0550 hair/bangs` | v1 | 完整扇面、各尖端与隐藏发根连续；清除眉线归属残留，根部接缝已修顺。 |
| `legs/leg_left/boot_gem_chain/large_diamond_gem` | `0630 legs/leg_left/boot_gem_chain/large_diamond_gem` | v1 | 饰件完整独立，柔和原色与浅明暗保持；周围靴色和黑色描边污染已清理。 |
| `legs/leg_left/boot_gem_chain/small_diamond_charm` | `0640 legs/leg_left/boot_gem_chain/small_diamond_charm` | v1 | 饰件完整独立，柔和原色与浅明暗保持；周围靴色和黑色描边污染已清理。 |
| `legs/leg_left/boot_gem_chain/round_bead` | `0650 legs/leg_left/boot_gem_chain/round_bead` | v1 | 饰件完整独立，柔和原色与浅明暗保持；周围靴色和黑色描边污染已清理。 |
| `legs/leg_right/boot_gem` | `0660 legs/leg_right/boot_gem` | v1 | 饰件完整独立，柔和原色与浅明暗保持；周围靴色和黑色描边污染已清理。 |
| `legs/leg_right/boot_flower_ornament` | `0670 legs/leg_right/boot_flower_ornament` | v1 | 花簇及叶片完整独立；补全花瓣边缘，清理靴色和其他饰件像素。 |
| `hair/back_hair/cap` | `0050 hair/back_hair/cap :: back`<br>`0560 hair/back_hair/cap :: crown` | v1 | 后脑实心无脸洞；冠顶与承底分别检查，合成连续，冠顶压住伸入发根、耳根部分仍在耳后。 |
| `legs/leg_left/foot` | `0055 legs/leg_left/foot :: rear`<br>`0600 legs/leg_left/foot :: front` | v1 | 靴面承底补齐独立宝石、串线遮挡区；固定花叶依上游归本体。前后唇切片后连续，前口盖踝。 |
| `legs/leg_right/foot` | `0056 legs/leg_right/foot :: rear`<br>`0610 legs/leg_right/foot :: front` | v1 | 靴面承底补齐独立宝石与花簇遮挡区；固定细珠点依上游留本体。前后唇切片后连续，前口盖踝。 |
| `legs/leg_left/boot_gem_chain/flexible_connector` | `0599 legs/leg_left/boot_gem_chain/flexible_connector :: hidden_tip`<br>`0620 legs/leg_left/boot_gem_chain/flexible_connector :: visible` | v1 | 三段细连接及短尾检查通过；末端局部收窄并藏入固定花瓣后，普通绘画分片保持同一逻辑身份。 |

## 保存、重开与保留状态

- 最终重开检查：69层，全部为 paintlayer、子节点0；按深度递增排序，所有深度与更新后的 occlusion.json 一致。
- 保存后关闭并重开最终 KRA，69层的名称、顺序、类型、边界及原始像素哈希全部一致。重开核对不是视觉验收的替代，视觉检查记录另列于上表及原尺寸导出。
- 65个正式 part SVG 的 SHA256 均与开始准备时记录一致；未写入 groups.json。仅通过配套深度工具更新允许修改的 occlusion.json。
- 最终 KRA SHA256：`4062dacac65b4d935d76ff2f03f388dce9abe73959f04456d6bafa1ca122ed2f`。
- `character-progress.kra`、测试深度 KRA、修画前备份、旧生成稿和过程导出仅用于追溯；正式交付以 `character-depth.kra`、`character-depth.png` 和本报告为准。
- 未修改调度器维护的 run.json、标记、prompt.md、attempts.jsonl、events.jsonl、result.json 或 error.txt；未自行推进后续步骤。

未解决问题：无阻碍本步交付的未解决项。已知相对原色块的两处局部调整已在上文完整列出。
