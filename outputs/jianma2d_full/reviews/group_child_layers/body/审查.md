# body 直属轮廓色块独立审查

- 审查身份：`group_child_layers:body:review`。
- 审查范围：`body` 的直属 group 与 part。树中直属 group 为 0，直属 part 为 1；已完成 1/1 组件检查。
- 结构树：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/structure/groups.json`。
- 参考：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/references/base-subject.png`。
- 候选：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/block-layers/groups.svg`。
- 范围检查：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/refinement/groups/body/2.直属拆分与色块/2.2.直属轮廓色块/轮廓检查.json`。
- 预览工具：`/Users/wutian/Desktop/coding/AstraLayering/workflow-next/live2d-layering/tools/svg_preview.py`。
- 实际查看方式：先查看整图参考/候选/35%混合，再独显直属容器，并对独显组件执行 `--reference --edge-overlay`，查看原图坐标裁切的 2–4 倍对照。下列证据图均由审查者针对本次候选重新生成并实际打开查看。

## 整图核对

已查看 [整图混合](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/full-blend.png)。躯干位置和宽度与参考的肩、胸、腰、腹区域对应，连接颈部、双臂及骨盆，没有躯干断段或整体平移。当前整图仍是分组色块，头发前后关系及最终显影不作为本节点缺陷。白色临时连体服仅用于辨认身体形状，其领口、肩带、侧缝、胸下阴影及裤口不拆成躯干孔洞或衣物组件。

## 组件即时检查记录：body/torso_skin

- 完整路径：`body/torso_skin`。
- 色块容器 id：`part-body-torso-skin`。
- 形状 id：`body-torso-skin-silhouette`。
- 实际独显：[躯干独显，3 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/torso-only.png)。
- 实际整段对照：[躯干参考、独显、混合与 edge-overlay，2 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/torso-edge.png)。

### 范围判定：pass

`轮廓检查.json` 对 `body/torso_skin` 返回 `pass`，`outside_samples=0`、`outside_area_px2=0.0`、`outside_bbox=null`。审查另核验：实际查看的 `block-layers/groups.svg` 与范围报告所引用的步骤 `candidate.svg` 字节一致；容器 id 唯一，容器内只有一条闭合路径；该路径几何与 `input-parent.svg` 中 `group-body` 的父轮廓一致。证据：[候选与几何核验](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/review-integrity.json)。范围通过仅说明该孩子被父范围容纳，以下视觉判断独立进行。

### 可见轮廓、连接与隐藏延伸判定：pass

| 核对部位 | 实际查看图 | 具体对照与结论 |
| --- | --- | --- |
| 颈根与锁骨上方，x355–525、y335–430 | [颈根 edge-overlay，4 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/neck-edge.png) | 肩上缘向颈根连续上拱，两边斜率平顺。中央上拱约至 y361，属于与 neck 的隐藏重叠；颈部向下延至胸前与本部件相交，未见空隙。头发挡住的肩内侧有连续补全，没有照抄头发边缘造成凹口。锁骨线是表面信息，本步无需挖空。pass。 |
| 画面左肩、肩腋及左胸侧，x285–385、y365–550 | [左肩 edge-overlay，4 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/left-shoulder-edge.png) | 可见肩顶的位置、宽度和向外圆转与参考主轮廓对应；圆肩下方回收到腋侧，再接入胸侧，曲线连续。肩球下缘穿过参考上臂内部是与 arms 搭接的隐藏闭合边，不是可见肩部外缘偏差。前发和上臂遮挡处保留身体连续形体，未见窄条漏补或断裂。pass。 |
| 画面右肩、肩腋及右胸侧，x510–595、y365–550 | [右肩 edge-overlay，4 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/right-shoulder-edge.png) | 肩顶与外肩起始弧线对准参考，随后向腋下回收并连续进入胸侧。隐藏圆肩与上臂的重叠合理；没有将发丝遮挡边当成身体缺口，也没有新增孔洞、尖端或零散孤岛。pass。 |
| 胸侧至两侧腰线，x320–560、y450–635 | [胸腰 edge-overlay，3 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/chest-waist-edge.png) | 逐段核对左右胸廓的外鼓、转向腰线的收束及窄腰位置。主要宽度与走势一致；可见腰缘从胸下向内收，至 y608–626 附近短折后外展，未见明显偏移、局部削窄或鼓包。头发及上臂切开的局部区域由连续身体补全承接。衣装领口、胸部明暗与侧缝没有错误成为轮廓开口。pass。 |
| 腰胯搭接，x330–555、y600–710 | [腰胯 edge-overlay，4 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/pelvis-join-edge.png) | 两侧腰线在 y626 后向胯侧外展，左右接点约为 (357,645)、(523,645)，与 pelvis 顶部两侧连接连续。下端向中部 y681 的圆弧为藏入 pelvis 的下腹延伸，位于身体内部，有充足重叠而无断缝；不把这条隐藏闭合弧当作参考可见外缘。pass。 |
| 单元完整性 | [躯干独显](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/torso-only.png)、[躯干总对照](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/torso-edge.png) | 一条连续闭合形体涵盖肩、胸廓、腰腹及下腹连接余量。未见自交引起的异常空洞、开口、脱离小块、漏描尖端或被遮挡后失去连接的区域。pass。 |

组件结论：**pass**。可见主轮廓描齐，肩颈腰胯接续连续；肩部、颈根及下腹的隐藏延伸在身体结构与相邻部件搭接范围内合理。本记录依据实际图像对照作出，不以父范围检查替代视觉判断。

## 整体结论

**pass**。全部 1 个直属组件均有实际独显及放大参考边缘对照记录；范围检查 pass，视觉贴合与连接检查 pass。无返修项、无 blocked 项。本轮未修改输入、结构树、候选图或技能文件，未派发后续节点。


---

## 2026-10-06 source repair 重跑后的独立复核

本次真实复验作者：`/root/review_body_children`，继续使用原独立审查身份 `group_child_layers:body:review`。本次制作作者是 `/root/group_body_resource_recovery`（制作身份 `group:body`），两者区分记录；本追加内容由独立复验作者亲自查看图像后写入，未将制作说明当作审查结论。

已读取当前 2.2 `流程.yaml`、`review/提示词.txt` 及本节点和 review 的 `gpt-6-astra-xhigh.model` 空标记文件。复核当前结构树：直属 group 为 0、直属 part 为 1，只有 `body/torso_skin`。本次保留以上旧审查全文，另生成并实际打开本次图证。

- 当前候选：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/block-layers/groups.svg`。
- 本次候选 SHA-256：`226d9dfd01a69be1be7c7408923a914a194d5f8a73d0dafdc882db0ff5f50523`，与本审查者先前 PASS 的候选相同；本次另确认其与新范围报告引用的 `repair-recovery/candidate.svg` 字节一致。
- 本次参考：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/references/base-subject.png`，SHA-256 为 `7f17481a8416753247fc54c3e2433723ebf5464764a320f91cae279d356dfd3b`。
- 新范围报告：[标准轮廓检查.json](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/refinement/groups/body/2.直属拆分与色块/2.2.直属轮廓色块/轮廓检查.json)；新冻结父范围及复用证据：[reuse-proof.json](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/refinement/groups/body/2.直属拆分与色块/2.2.直属轮廓色块/repair-recovery/evidence/reuse-proof.json)。
- 本轮图证来源及作者记录：[复验来源.json](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/复验来源.json)。所有下列图证均在本轮由当前候选重新渲染并实际查看；同 SHA 的旧 PASS 仅为历史参照。

### 本次整图实际查看

已先查看 [整图 35% 混合](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/full-blend.png)。躯干在全身的位置、肩胸腰腹主宽度和身体比例与参考对应。临时连体服仅作身体形状参照；整图色块的最终遮挡与显影留后续节点。

### 本次直属 part 紧邻记录：body/torso_skin

完整路径：`body/torso_skin`；容器 id：`part-body-torso-skin`；形状 id：`body-torso-skin-silhouette`。

实际查看与具体对照：

| 实际查看图证 | 本次核对 | 判定 |
| --- | --- | --- |
| [直属孩子 only 组合／独显，3 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/child-only-combined.png)、[躯干 edge-overlay 总图，2 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/torso-edge.png) | 本组仅一个孩子，故孩子 only 组合就是该 part 独显；图中没有父 `group-body` 帮助覆盖。肩、胸廓、腰腹到下腹延伸形成一个完整闭合单元，无孔洞、开口、脱离小块、漏描窄条或自交异常。 | pass |
| [颈根放大 edge-overlay，4 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/neck-edge.png) | 颈根上拱与两肩上缘平顺连接，中央上伸约至 y361；这段位于颈部内部，作为 neck 搭接的隐藏延伸合理。锁骨线不作为部件开口。 | pass |
| [左肩放大 edge-overlay，4 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/left-shoulder-edge.png) | 可见肩顶的位置与转弯对准参考主轮廓；肩球下缘进入上臂内部后回到腋侧，是隐藏搭接而不是暴露外缘。腋侧和左胸侧连续，发丝遮挡处有合理延续。 | pass |
| [右肩放大 edge-overlay，4 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/right-shoulder-edge.png) | 右肩顶的宽度和圆转对准，回收方向平顺；隐藏肩球与上臂重叠合理，发丝切开的区域没有断段或漏补。 | pass |
| [胸腰放大 edge-overlay，3 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/chest-waist-edge.png) | 两侧胸廓外鼓、向窄腰的内收及 y608–626 附近的短折与参考主要走势一致。未见本轮新增的明显偏移、削窄、变形或接缝。参考临时衣物领口、侧缝及胸下阴影均作为内部表面信息。 | pass |
| [腰胯放大 edge-overlay，4 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/pelvis-join-edge.png) | 腰侧向 (357,645)、(523,645) 附近外展，方向连续；下缘到中央 y681 是与 pelvis 重叠的下腹闭合余量，位于身体内部。未把隐藏闭合弧误判为可见轮廓。 | pass |
| [孩子与 neck、arms、pelvis 的接界组合，2 倍](/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s3/reviews/group_child_layers/body/evidence/source-repair-20261006/neighbor-joins.png) | 该图排除父 `group-body` 与头发，仅显示孩子及相关邻接组。颈根、两肩腋和腰胯的组合连续，没有靠父色块遮住的空隙；整段外缘的宽度与参考对应。 | pass |

本次范围判定：**pass**。新标准范围报告使用 `repair-recovery/input-parent.svg` 与 `repair-recovery/candidate.svg`，对该 part 的 `outside_samples=0`、`outside_area_px2=0.0`、`outside_bbox=null`。制作方的冻结证据记录父输入与历史父输入相同、孩子几何等于冻结父范围；范围数据仅用于容纳判断。

本次视觉判定：**pass**。以上本轮实际独显、边缘放大与邻接组合检查未发现足以推翻旧结论的新问题；可见主轮廓对准，主要连接连续，隐藏延伸合理。

本次组件结论：**pass**。1/1 直属组件已经逐项完成新图像复核，不以零越界或候选 SHA 相同代替视觉判断。

### 本次整体复核结论

**PASS**。范围检查、孩子 only 完整性、参考轮廓贴合与肩颈腰胯接界均通过，无返修项、无 blocked 项。本轮只追加本 branch 的审查记录及新图证，未修改候选、树或参考，未创建 agent 或 cursor，未派发后续。
