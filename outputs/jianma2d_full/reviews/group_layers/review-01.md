# group_layers 独立审查

审查身份：`group_layers:review`。候选：`reviews/group_layers/candidate-01.svg`。参考：`references/base-subject.png`。组清单：`structure/groups.json`。

候选 SHA-256：`087c24f754b10b10f857fea2cb85ba7a20979f45746a0c5359381469df0961bb`。

范围：仅初始六组可见轮廓与实际相接处；相邻色块可重叠，不审遮挡下补全、最终显影顺序和组内细节。判定标准：主要外形基本对准，所有可见轮廓片段描齐，无明显接缝问题。

结构核对：六组均存在完整 `data-group-path`，分别绑定 `group-head`、`group-neck`、`group-body`、`group-arms`、`group-pelvis`、`group-legs`，均包含可独显的填色色块。

初始记录时审查进行中；最终整体结论见文末。

## 整图初看

实际查看：`references/base-subject.png`；`reviews/group_layers/evidence/overall.png`。

六组配色可辨，画布 895 × 1758 与参考一致。头冠、两侧垂带、手指、长发各支和双脚均有对应色块，初看主要外轮廓及身体比例接近参考；长发的孔洞与脚间留白可见。以下按清单顺序逐组放大核对，整图初看不代替逐组结论。

## 1. head — revise

绑定：`data-group-path="head"`，容器 `group-head`。

实际查看（均在 `reviews/group_layers/evidence/`）：
- `head-full-isolated.png`（全组独显）；
- `head-top-edge.png`（原图 x265 y0 w340 h380，3×）；
- `head-chest-edge.png`（x265 y280 w350 h380，3×）；
- `head-left-mid-edge.png`（x85 y540 w370 h600，2×）；
- `head-right-mid-edge.png`（x440 y540 w410 h600，2×）；
- `head-left-low-edge.png`（x90 y1090 w365 h450，3×）；
- `head-right-low-edge.png`（x440 y1090 w415 h450，3×）；
- `head-inner-tail-right-reference.png`、`head-inner-tail-right-edge.png`（x638 y1270 w105 h185，6×）；
- `head-center-strip-edge.png`（x415 y800 w50 h525，3×）。

所有 edge 图均由绑定预览工具用 `--only group-head --reference references/base-subject.png --edge-overlay` 生成的叠加面板提取，未改候选或参考。

外缘逐段：头冠拱弧、发髻、两侧冠饰尖端、坠链和长垂带均有色块；头盖、面颊和下颌主要轮廓基本对准。两侧长发从肩部到手部、再到小腿的主外弧及外侧尖梢基本沿参考，左侧底部各支收尖齐全。胸前发束与后发合并处允许相邻身体色块重叠，本步不以独显图内的遮挡下边界作最终显影判定。

窄条、孔洞：冠饰小孔、脸侧窄缝、双臂外侧的四处长发孔洞以及双腿之间的细长发条均有对应形状，主要弧度连续。**右下发束中部凹口漏描了参考中可见的一段发片**：`head-hair-right` 在约 `(645,1292)` 提前开始孔洞；参考凹口实际位于约 `(683,1325)`，并有沿 `(681,1350)` 到 `(674,1405)` 延伸的可见窄发片。当前孔洞边缘切入该可见发片，约 x660–685、y1310–1405 的一段有明显缺失。6×证据 `head-inner-tail-right-edge.png` 中，粉色凹口线穿过浅紫发面，右侧细长发尖处于候选填色之外；对照 `head-inner-tail-right-reference.png` 可确认其不是阴影或隐藏补全。

邻组连接：下颌—neck 接口基本重合；肩部、胸侧与 body/arms 的关系连续，手指间及手臂和躯干之间仍有后发覆盖；髋部外侧、腿侧和腿间的 head–pelvis/legs 连接无肉眼可见断缝。右下漏描处是发束对背景的外缘问题，与邻组覆盖无关。

结论：**revise**。修复 `head / head-hair-right` 的右下内凹轮廓，保留约 x660–685、y1310–1405 的可见发片与尖梢；其他已查段本轮未见达到明显错位标准的问题。

## 2. neck — revise

绑定：`data-group-path="neck"`，容器 `group-neck`；色块 `neck-silhouette`。

实际查看（位于 `reviews/group_layers/evidence/`）：`neck-isolated.png`、`neck-edge.png`（x340 y285 w200 h125，5×）；`neck-junction-isolated.png`（head+neck+body 组合，x335 y290 w210 h120，4×）；`neck-junction-native-isolated.png`（同区域原尺寸）。独显边缘图按 `--only group-neck --reference … --edge-overlay` 生成。

可见外缘：下颌承接弧、颈部两侧竖弧及向双肩张开的底部都已覆盖，颈宽和弧度基本对准参考。颈底与锁骨区是组间切分，不要求描成参考中的锁骨线。该组无独立小岛或孔洞；两侧发束切出的可见颈侧窄区已覆盖。

邻组连接：neck–body 下缘主要连续。**neck–head 存在两条真空隙**，在组合独显原尺寸亦能见到白线：一条沿右半下颌约 x437–465、y309–323；另一条沿右颈根/后发边界约 x467–494、y348–374。放大可见白缝并非候选描边，而是 `neck-silhouette` 与 `head-face-cap` / `head-hair-neck-right` 的色块边缘未贴合，局部约 1–2 像素宽。左颈侧连接连续。neck–body 中央斜切边仅有局部亚像素级边缘，不单列返修。

结论：**revise**。在 `neck / neck-silhouette` 的右半下颌和右颈根处补足与 head 的连接，可用适量色块重叠消除原尺寸可见白缝；不要求改变颈部基本外形。

## 3. body — revise

绑定：`data-group-path="body"`，容器 `group-body`；色块 `body-silhouette`。

实际查看（位于 `reviews/group_layers/evidence/`）：`body-isolated.png`、`body-edge.png`（x285 y355 w305 h325，3×）；`body-junction-isolated.png`（head+neck+body+arms+pelvis，x275 y345 w325 h355，3×）；`body-left-seam-isolated.png`、`body-left-seam-edge.png`（head+body+arms，x312 y438 w54 h113，6×）；`body-junction-native-isolated.png`（组合原尺寸）。独显边缘图使用 `--only group-body --reference … --edge-overlay`。

可见外缘：肩峰、胸部两侧弧度、腰部收窄和向腹部扩展的轮廓均有覆盖且基本对准。肩部到胸侧的上段属于与 arms 的组间切分；胸侧至腰部可见轮廓跟随参考，没有一整段漏描或明显越界。两侧发束与手臂之间可见的躯干窄区覆盖完整，body 本身无孔洞或分离小岛。

邻组连接：双肩与 arms、腰腹与 pelvis 连续重叠；body–neck 的主接口正常。**左胸侧 body–arms/head 组合出现两处小白缝**：约 x337–339、y471–502 的细长弧缝，以及约 x342–346、y524–536 的短三角缝；6×叠加图显示二者位于参考皮肤/躯干连续区域，组合色块却留下背景孔洞。原尺寸组合仍能看到上方细白弧。关联色块为 `body-silhouette`、`arm-left`、`head-hair-left`。右胸侧未见同类开缝。

结论：**revise**。保持现有主要外形，补足左胸侧与 arms/head 的两处接缝。此为相接处追加发现，也补充 head 记录中的胸侧连接初判，不影响此前已查外侧长发段。

## 4. arms — revise（仅共享接缝）

绑定：`data-group-path="arms"`，容器 `group-arms`；色块 `arm-left`、`arm-right`。

实际查看（位于 `reviews/group_layers/evidence/`）：`arms-full-isolated.png`、`arms-full-edge.png`（x195 y365 w485 h590，2×）；`arms-left-hand-edge.png`（x205 y802 w72 h150，6×）；`arms-right-hand-edge.png`（x602 y802 w72 h150，6×）；`arms-hand-junction-isolated.png`（head+arms，x195 y795 w485 h160，2×）。肩胸连接同时复用刚看过的 `body-junction-isolated.png`、`body-left-seam-edge.png` 和原尺寸组合证据。独显图按 `--only group-arms --reference … --edge-overlay` 生成。

可见外缘：两侧肩峰到上臂、肘部、前臂与手腕连续，长弧与参考基本对准；两手掌的外凸、手指伸出和指尖收圆都已有闭合轮廓。左右手均保留参考可见的三处分叉指端；放大看指尖附近仅有轻微轮廓差，不构成明显漏描。

窄条、孔洞：双手拇指和弯曲手指之间的长孔已保留；指间的窄缺口与细指端可独显，没有被填成拳头或断开成错误小岛。胸前发束切过的上臂区域有连续手臂覆盖，遮挡下伸展不在本步审查范围。

邻组连接：肩部与 body 重叠正常；手、手指孔与后发连接覆盖，前臂沿后发无白缝。左上臂内侧与 body/head 共用的两处白缝已在第 3 组记明（约 x337–339、y471–502，及 x342–346、y524–536），本组不重复计为新问题。

结论：**revise，仅限第 3 组记录的共享接缝**；双臂、双手本身的可见外形检查通过，未发现额外需返修的外缘片段。

## 5. pelvis — pass

绑定：`data-group-path="pelvis"`，容器 `group-pelvis`；色块 `pelvis-silhouette`。

实际查看（位于 `reviews/group_layers/evidence/`）：`pelvis-isolated.png`、`pelvis-edge.png`（x305 y620 w270 h225，4×）；`pelvis-junction-isolated.png`（head+body+pelvis+legs，x300 y620 w285 h260，3×）。独显边缘图使用 `--only group-pelvis --reference … --edge-overlay`。

可见外缘：腰腹到髋外缘的两侧弧线、向腹股沟收拢和会阴底部均已覆盖，整体宽度与参考一致。与腿根的切分弧线在参考临时连体服边缘内外略有差异，但本组按身体区域切分，临时衣服并非独立组；未因此造成可见主体漏描。

窄条、孔洞：双侧髋部在后发与腿之间的短外缘齐全，会阴中央窄区连续，组内无应保留而被误填的背景孔洞或遗漏小岛。

邻组连接：上缘与 body 有重叠；双侧腿根与 legs 连续覆盖；会阴下方可见中央发条由 head 承接。髋侧与 head 的边缘仅见局部亚像素抗锯齿线，未达到明显接缝问题标准；无独立白洞或断口。

结论：**pass**。

## 6. legs — revise（共享接缝）

绑定：`data-group-path="legs"`，容器 `group-legs`；色块 `leg-left`、`leg-right` 及四个 `leg-*-anklet-*`。

实际查看（位于 `reviews/group_layers/evidence/`）：
- `legs-full-isolated.png`（x290 y690 w300 h1035，原尺寸）；
- `legs-thigh-edge.png`（x292 y695 w295 h430，3×）；
- `legs-calf-edge.png`（x335 y1080 w215 h490，3×）；
- `legs-feet-edge.png`（x350 y1510 w185 h215，5×）；
- `legs-hair-junction-isolated.png`（head+pelvis+legs，x285 y690 w305 h850，2×）；
- `legs-seams-isolated.png`、`legs-seams-edge.png`（head+legs，x300 y870 w285 h250，3×）；
- `legs-seams-native-isolated.png`（同一区域原尺寸）；
- `toes-left-reference.png`、`toes-left-edge.png`（x400 y1645 w28 h58，8×）；
- `toes-right-reference.png`、`toes-right-edge.png`（x457 y1645 w29 h58，8×）。

单组边缘图均用 `--only group-legs --reference … --edge-overlay` 生成。

可见外缘：大腿根至大腿外弧、内侧收窄、双膝、小腿、踝部和足底均有连续轮廓，整体基本对准。两脚每个可见趾端都有外轮廓，四处脚链跨出脚踝边界的小凸出也纳入色块。趾间浅色细线与趾面明暗的极细差异不升级为本步主体外形问题。

窄条、孔洞：两腿间从会阴到膝上、膝下到小腿中段的细缝保留，双脚间的背景间隙没有被桥接；腿与长发交错的可见窄区都已检查。膝部同组双腿相贴区域允许重叠，不在此审左右腿内部拆分。

邻组连接：腿根与 pelvis 连续。**head–legs 有连续、原尺寸可见的白缝**：左大腿外侧约 x305–359、y890–1075；右大腿外侧约 x526–574、y890–1065；腿间发条右边约 x444–447、y940–1005，并在双腿合拢上方约 x438–445、y1060–1090 留有细长白口。`legs-seams-edge.png` 可见这些孔洞处参考原应由皮肤/头发连续覆盖；`legs-seams-native-isolated.png` 可见左右长白线，非仅高倍缩放的抗锯齿差。关联色块为 `leg-left`、`leg-right` 与 `head-hair-left`、`head-hair-right`、`head-hair-central-gap`。

结论：**revise**。腿部本身主要外形通过，需对上述 head–legs 接口提供充分覆盖，消除长白缝。可调整对应发块边界与腿块形成适量重叠，无需改变双腿基本形态。

## 相接处追加汇总

此为按后续组核对连接时对 head 初判的追加，不删除原记录：head–neck 见第 2 组；head/body/arms 左胸侧接缝见第 3 组；head–legs 见第 6 组。head–pelvis 与 pelvis–body/legs 本轮通过；arms–head 的前臂、手掌和指孔连接通过。

## 整体结论 — revise

六个初始 group 均完成独显、参考边缘叠加和局部放大检查，并按顺序即时记录；没有未能取得的输入或未完成组，故不判 blocked。

| group | 结论 | 返修范围 |
| --- | --- | --- |
| head | revise | 右下内凹发片漏描；与 neck、左胸侧、legs 的共享接缝 |
| neck | revise | 右半下颌及右颈根连接白缝 |
| body | revise | 左胸侧两处共享白缝 |
| arms | revise | 仅左胸侧共享白缝 |
| pelvis | pass | 无 |
| legs | revise | 仅与 head 的腿侧、腿间发条共享白缝 |

按独立问题合并，返修共四项：
1. `head / head-hair-right`：补齐右下凹口约 x660–685、y1310–1405 的可见发片/尖梢。
2. `neck / neck-silhouette` 与 head：消除右半下颌、右颈根白缝。
3. `body / body-silhouette`、`arms / arm-left`、`head / head-hair-left`：消除左胸侧两处白缝。
4. `legs / leg-left, leg-right` 与 `head / head-hair-left, head-hair-right, head-hair-central-gap`：消除腿侧与腿间发条的连续白缝。

此次不要求像素级照描或修改组内细节；其余主要外形基本对准。返修后由同一独立审查会话复验上述问题项，并保留本轮记录。
