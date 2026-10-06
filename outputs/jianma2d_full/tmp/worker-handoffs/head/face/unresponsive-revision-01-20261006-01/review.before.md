# head/face 2.2 独立审查

审查身份：`group_child_layers:head/face:review`（独立 reviewer `/root/review_face_children`）。

候选：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/block-layers/groups.svg`。

候选 SHA-256：`c4dc335da95d7b8532d92afb3684c124a53b93a677c30274cf5f1bc990d70288`。

冻结父输入 SHA-256：`5194da3dbde58177410cebbcd474dd0562f17048d09592c373ad819f8c63622f`。

本轮仅审查最新结构树中 head/face 的 3 个直属 group 与 6 个直属 part。候选、结构、参考及技能保持只读，独立图证重新由实际候选渲染。参考为原色 base-subject.png，与 SVG 同为 895×1758。以下图证路径均为绝对路径，逐件实际查看后写入结论。

## 整图先行核对

实际查看 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/00-whole-blend.png`（整图 50% 混合）与 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/01-face-context.png`（头脸局部 4×，参考、候选、混合、边缘对照）。五官总体位置对应参考；全稿中 neck 既有导引上端覆盖口部和下脸，属于输入既有画序情况，不能据此声称 mouth 缺失或以全稿判断它完整。本轮继续用独显与九孩子去父组合验证。最终正式稿画序仍需 root 在 stage 5 处理。

## 1. head/face/eye_right — pass

容器 id：`group-head-face-eye-right`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/02-eye-right.png`，裁切 `(445,227,58,39)`，8×，独显/原色参考/50% 混合/边缘叠加。上眼睑长弧沿参考黑睫毛上缘，内眼角落点、下缘椭弧和外侧两枚睫毛尖均有归属；右侧发丝下延伸连续。眼睑褶皱为同 group 内独立细长闭合色块，两端收细，未把褶皱与上睑间的面皮误作眼部实体。未见明显宽度、倾角、位置偏移或漏段。眼内细分留后续 eye_right 子节点，本轮完整外包络成立。

## 2. head/face/eye_left — pass

容器 id：`group-head-face-eye-left`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/03-eye-left.png`，裁切 `(377,229,51,39)`，8×，独显/原色参考/50% 混合/边缘叠加。左眼比右眼略低的真实高差保留；内眼角尖、上睑弧、下睑至外眼角的回转对应参考。左侧发丝横切处有连续隐藏眼部，外侧睫毛尖有独立外轮廓，没有沿遮挡线割断整眼。褶皱细条完整，眼白和瞳孔所在区域均被完整眼包络覆盖。未见本步需返修的可见漏描、断口或主要形变。

## 3. head/face/mouth — pass

容器 id：`group-head-face-mouth`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/04-mouth.png`，裁切 `(423,286,33,20)`，8×，独显/原色参考/50% 混合/边缘叠加。左右口角宽度及略不对称高度与参考相合；上唇峰和中央浅凹保留，下唇用完整浅弧连接两端。色块覆盖上唇、唇缝与下唇，不只是一条唇缝；闭口参考没有应镂空的背景孔。此图中完整 mouth 清晰可见，证明整稿被 neck 遮盖不是 mouth 本体缺失。需在去父组合中再核对口周连续性。

## 4. head/face/face_skin — pass

容器 id：`part-head-face-face-skin`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/05-face-skin.png`，裁切 `(350,138,164,192)`，4×，独显/原色参考/50% 混合/边缘叠加。可见面颊—下颌—下巴轮廓连续，左右曲率、下巴位置和尖圆转折基本贴合参考。上额至 y145 为冻结父允许的发下延续；没有错误沿冠饰、刘海或五官挖空面皮。面皮两侧转向为被发丝/耳根遮挡的交接延伸，需与双耳在去父组合再核对。此独显没有背景孔、内裂或零散残片，主要外轮廓成立。

## 5. head/face/ear_left — pass

容器 id：`part-head-face-ear-left`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/06-ear-left.png`，裁切 `(353,231,38,60)`，8×，独显/原色参考/50% 混合/边缘叠加。完整耳廓经发下连成同一面，参考中发丝切出的上方窄皮肤段和下方耳面均有色块覆盖；下端耳垂补片与主耳面相连并收圆，耳垂位置对应耳坠挂点上方。耳廓外侧大部在发下，不能把遮挡线误当完整耳轮廓切碎。耳根内侧与面皮允许搭接，独立耳坠不混入该容器。未见分离耳垂或真实背景孔；接界连续性待组合统一确认。

## 6. head/face/ear_right — pass

容器 id：`part-head-face-ear-right`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/07-ear-right.png`，裁切 `(479,232,32,55)`，8×，独显/原色参考/50% 混合/边缘叠加。参考较完整的右耳外缘向下斜收、耳垂偏向脸内的形状都有对应；耳轮上段与耳根在发丝背后连续延伸，没有只保留发间露出的三角碎片。耳垂补片与主耳面的连接可见，圆端落在参考耳坠挂点上方；无耳坠误归属或额外背景孔。左右耳按实际差异分别成形，未机械镜像。接界连续性待组合统一确认。

## 7. head/face/eyebrow_left — pass

容器 id：`part-head-face-eyebrow-left`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/08-eyebrow-left.png`，裁切 `(377,218,51,22)`，8×，独显/原色参考/50% 混合/边缘叠加。细长实体的上弧、向眉头的缓降和末端收尖对应参考灰眉；发丝下外侧眉尾有完整延续。可见眉段宽度和走向基本对准，闭合色块没有断细条、孤立片或错误孔洞，眉头与眼睑褶皱的上下间隔清楚。

## 8. head/face/eyebrow_right — pass

容器 id：`part-head-face-eyebrow-right`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/09-eyebrow-right.png`，裁切 `(442,216,54,23)`，8×，独显/原色参考/50% 混合/边缘叠加。右眉外高内低的弧向与参考相符，完整灰眉可见段被覆盖，外端延续至发下；眉宽保持细长，没有与眼睑褶皱连成一片。与左眉的实际高低、倾角差得到保留，未见主要错位、断裂或漏描。

## 9. head/face/nose — pass

容器 id：`part-head-face-nose`。实际查看：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/10-nose.png`，裁切 `(423,253,28,34)`，8×，独显/原色参考/50% 混合/边缘叠加。鼻尖高光、两侧鼻孔与鼻翼所在范围均位于一个连续鼻面包络内；上端延至鼻梁下段，鼻底收成平顺圆弧。不是只描高光碎片或把鼻孔单独挖成背景孔。参考没有硬鼻面分割边，色块边界为同一皮肤表面的合理承接，特征中心与宽度对准；未见遗漏某一侧鼻翼或偏位。

## 追加复核：撤回 face_skin 暂 pass，改为 revise

在去父组合 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/12-left-seam.png` 的 8× 图中，左耳下方至左下颌出现参考边线外侧的明显色块余量。随即实际查看新增 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/15-left-jaw-base.png` 与 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/16-left-jaw-line.png`，均裁切 `(370,270,66,58)`，8×；线参考明确采用同坐标 reference-crop，未做整图缩放。两张图都确认 face_skin 的可见左颊—下颌外缘向画面左方/左下方偏出参考，约 y278–315，后段逐渐回到下巴。前述 4× 独显的“基本贴合”判断被本轮更高放大图推翻。具体位置与遮挡复核见后续最终问题清单。

## 追加复核：撤回 ear_left 暂 pass，改为 revise

与左颊偏移相邻的耳垂另作近距复验，实际查看 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/19-left-ear-lobe-base.png` 和 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/20-left-ear-lobe-line.png`，同坐标 `(370,257,26,30)`，8×。原色/线参考均显示靠脸一侧可见耳面从约 x383 至389、y266 至280 延伸；当前耳色块右缘停在更左处，耳垂补片主要向左下延伸，部分落到参考耳坠连接区，未覆盖完整的参考耳垂/耳面。早先较宽裁切的 pass 在这里被明确的新图推翻。面皮色块填满该区不等于 ear_left 自身完整归属。此项必须与 face_skin 左颊边界一起返修，避免收正面皮后形成缺口。

## 去父孩子组合与邻接复核

实际查看以下独立重新渲染图：

- `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/11-children-no-parent.png`：只保留九个直属孩子，排除 face 父底稿、head 父底稿及其他组；4×。面皮—耳面联合覆盖连续，没有需要父色块填住的背景孔。五官归属齐全。
- `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/12-left-seam.png`、`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/13-right-seam.png`：左右耳根—颞部—颊部 8×。双方搭接本身没有白缝或断裂；左侧发现上述可见边界和耳面归属问题，连续性通过不能覆盖贴合失败。右侧搭接和外侧转向成立。
- `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/14-features-no-parent.png`：五官 8×。双眼完整眼体、眼睑细条、眉毛、鼻面和闭口双唇均完整；眼睑褶皱周围是面皮，没有错误背景孔；mouth 在去父且排除 neck 后完整显现。
- `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/17-left-jaw-existing-occluders.png`：只保留九孩子及原有 front_hair、face_framing_hair_left/right，仍排除父底稿；8×。现有前发/框脸发没有遮住 y280–315 的左颊外扩段，候选边缘仍显露在参考颊缘之外。故不属于获准的发下隐藏延续。
- `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/18-left-jaw-coordinate-grid.png`：原色参考和候选轮廓同坐标每 5 像素网格。可直接读出 y280–305 的约 9–11 像素水平偏离。
- `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/21-chin-base.png`：下巴 8×。左下颌的外扩延续至下巴左侧，候选尖点约 `(435,323)`，参考转折约 `(438,322)`，也有轻微偏左/偏下；前述“后段逐渐回到下巴”不能解读为下巴已完全贴准。

## 独立结构、范围和保护检查

- 本次候选 SHA-256 仍为 `c4dc335da95d7b8532d92afb3684c124a53b93a677c30274cf5f1bc990d70288`，与接收时一致。
- 独立重跑 4× 父范围检查，报告 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/independent-containment.json`：全部 9 件 pass，各 `outside_samples=0`。这只确认位于冻结父范围中。
- 独立保护检查 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s1/reviews/group_child_layers/head/face/evidence-c4dc335d-independent/independent-protection.json`：原有 158 个 id 元素序列化子树全部不变、根属性不变、新增 22 个 id、无重复 id。父 `group-head-face` 序列化 SHA 前后均为 `07b1034d03a5500862b919ef823d98b4e5e8848dd0f0eb189487e11688fba925`；冻结父输入文件 SHA 为 `5194da3dbde58177410cebbcd474dd0562f17048d09592c373ad819f8c63622f`。
- 本审查只写 reviews 下图证与报告，没有修改候选、输入父稿、结构、参考、技能、cursor 或 dispatch 状态。

## 最终结论：REVISE

最终逐件结论为 7 pass、2 revise；前面 face_skin 和 ear_left 的初步 pass 已被明确撤回，以本表和以下问题为准。

| 完整路径 | 容器 id | 最终结论 |
| --- | --- | --- |
| head/face/eye_right | group-head-face-eye-right | pass |
| head/face/eye_left | group-head-face-eye-left | pass |
| head/face/mouth | group-head-face-mouth | pass |
| head/face/face_skin | part-head-face-face-skin | revise |
| head/face/ear_left | part-head-face-ear-left | revise |
| head/face/ear_right | part-head-face-ear-right | pass |
| head/face/eyebrow_left | part-head-face-eyebrow-left | pass |
| head/face/eyebrow_right | part-head-face-eyebrow-right | pass |
| head/face/nose | part-head-face-nose | pass |

### R1 — face_skin 可见左颊—下颌外扩

对象 `head/face/face_skin` / `part-head-face-face-skin` / path `head-face-face-skin-surface`。主要区段 y278–315，候选边缘在参考左颊轮廓的画面左侧。近似同 y 样点：

| y | 候选左边界 x（8× alpha 128） | 参考可见边界 x（原色/线参考目视与梯度辅助） | 水平间距 |
| --- | --- | --- | --- |
| 280 | 379.5 | 389 左右 | 9.5 左右 |
| 290 | 384.5 | 394 左右 | 9.5 左右 |
| 295 | 387.9 | 398 左右 | 10.1 左右 |
| 300 | 392.1 | 403 左右 | 10.9 左右 |
| 305 | 397.9 | 409 左右 | 11.1 左右 |

这是同 y 水平差，不是法线距离；最终以原色参考可见边界为准。图证 15、16、17、18 证明真实可见且未被现有前发遮住。应仅收正 face_skin 的左颊—下颌可见弧线，并把下巴左侧转向与参考约 `(438,322)` 连接平顺；保持发下上额、颞部合理补全、冻结父和其他组不动。此修正位于当前父范围内，不需要改父来绕过检查。

### R2 — ear_left 可见耳面/耳垂靠脸侧漏覆盖

对象 `head/face/ear_left` / `part-head-face-ear-left`，主要涉及 `head-face-ear-left-surface`、`head-face-ear-left-lobe-extension`。图证 19、20 中，参考靠脸侧耳面约 `(383–389,266–280)` 未被当前独立耳色块完整包住，当前耳垂主体偏向左下并触及参考耳坠连接区。不能用 face_skin 覆盖该区代替 ear_left 的完整耳面归属。应按可见耳—脸分界和耳垂下沿重接当前耳面及补片，保留发下完整耳廓，与 R1 同次复核耳根/颊部无缝。上述坐标是定位区间，不要求填满矩形或削除正确的隐藏延续；既有 earring_left 仍为独立对象。

## 未解决与交接

R1、R2 尚未修复，交原制作 worker 返修后由独立 reviewer 复验；本候选不得标记整体 pass。复验需保留本报告和当前图证，检查两修改容器及耳根—左颊—下颌组合，并确认其余七件保护。

已知输入 neck 导引在全稿画序遮盖嘴和下脸，交 root 在 stage 5 处理最终正式稿画序；本轮不要求修改 neck 或全局画序，也不将它列为新增本轮返修项。无其他 blocked 项。
