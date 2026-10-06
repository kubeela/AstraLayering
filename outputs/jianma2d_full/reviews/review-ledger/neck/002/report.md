# neck 直属轮廓色块独立审查

- 审查身份：`group_child_layers:neck:review`。
- 审查日期：2026-10-05。
- 工作根：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s2`。
- 当前 group：`neck`。
- 参考：`references/base-subject.png`。
- 树：`structure/groups.json`。
- 候选：`block-layers/groups.svg`。
- 范围报告：`refinement/groups/neck/2.直属拆分与色块/2.2.直属轮廓色块/轮廓检查.json`。
- 本次只读取输入、候选和技能，新增本报告及其证据图；未修改图或结构树。

## 范围清点

`neck` 的直属 group 为 0 个，直属 part 为 1 个：`neck/neck_skin`。本次逐项检查覆盖 1/1；该 part 的容器为 `part-neck-neck-skin`，内部轮廓 path 为 `neck-skin-silhouette`。

## 整图检查

实际查看 [整图、参考及 50% 混合叠加](evidence/full-blend.png)。SVG 与参考均按原始 895 × 1758 坐标对齐。颈部处于下颌与双肩之间，整体宽度和轴向与参考一致。当前拼合图中上部隐藏补全暂时覆盖脸部，这是后续显影／堆叠顺序事项，不作为本步的可见外缘缺陷。

## 直属部件：neck/neck_skin

- 完整路径：`neck/neck_skin`。
- 色块容器 id：`part-neck-neck-skin`。
- 轮廓 id：`neck-skin-silhouette`。
- 范围结论：**pass**。
- 视觉结论：**pass**。
- 部件结论：**pass**。

### 实际查看的图

1. [独显、参考、混合和参考边缘叠加](evidence/neck-skin-edges.png)：由声明的 `svg_preview.py` 以 `--only part-neck-neck-skin --reference references/base-subject.png --crop 365 260 150 160 --scale 5 --edge-overlay` 生成，已实际查看。图中只显示该容器，粉色线为其轮廓与参考的叠加。
2. [相邻组件及颈根连接的放大混合图](evidence/neck-adjacent-blend.png)：原坐标裁切 `(335, 280, 210, 150)`，4 倍，包含参考、整图候选与 50% 混合，已实际查看。
3. [整图混合叠加](evidence/full-blend.png)：已先于独显图实际查看。

### 可见外缘与连接的逐段对照

- **左侧颈缘**：由下颌侧后方约 `(411, 309)` 向下到 `(408, 355)`，再转向左颈根 `(378, 373)`。独显边缘叠加显示侧缘与参考的皮肤／后发交界贴合，近竖直段、内收后向肩部展开的弧度与转向一致；没有明显漏描、外扩或缺口。
- **右侧颈缘**：由约 `(467, 307)` 经 `(473, 351)` 向右颈根 `(500, 376)` 展开。与参考相比没有明显位置或宽度偏移，曲线顺滑地从颈侧转入肩根。个别位置有约数个原图像素以内的线条／抗锯齿差异，未改变主要可见形状，不构成本步返修项。
- **上部连接和隐藏补全**：顶弧约在 `(439, 274)`，左右接入约 `(411, 305)` 与 `(467, 302)`，形成一个闭合、连续的圆滑上端。它延伸到下颌后方，以覆盖下颌运动可能露出的区域；不能把参考中的下颌外线作为该隐藏延伸应截断的边界。当前覆盖部分脸部的显影来自拼合顺序，留待后续最终渲染。
- **下部连接和隐藏补全**：从左右颈根向下延伸为连续弧面，中心约到 `(438, 406)`，与 body 有足够重叠。相邻混合图中左肩根、右肩根和中央接界连续，未见白缝、断裂或悬空片。锁骨线仍属 body，底部补全不改变该结构归属。
- **孔洞、开口、尖端和零散区域**：参考可见颈部是完整皮肤面，不要求孔洞或独立碎片。候选是一片闭合连续形体，没有误切孔洞或丢失的窄条；两侧颈根角点接入相邻范围，未产生外露孤尖。

### 范围独立判定

范围报告对 `neck/neck_skin`、`part-neck-neck-skin` 判为 `pass`：`outside_samples = 0`，`outside_area_px2 = 0.0`，`outside_bbox = null`，检查比例为 4。候选中该部件与已补全父轮廓的路径一致，因此隐藏上下端及左右可见轮廓均被父范围容纳。此项仅证明容纳关系；上面的可见边缘、形状和连接已通过独显及参考叠加另外核对。

已核对范围报告引用的 `draft.groups.svg` 与实际审查的 `block-layers/groups.svg` 内容一致：二者 SHA-256 均为 `ff482c808b128733355a07b0855a140629d90e78a299026cd065040afa719d54`，范围结论适用于本次候选。

## 整体结论

**pass**。所有 1 个直属组件均已实际查看并记录；父范围检查通过，可见颈缘与参考主要形状贴合，颈部向头部、双肩和躯干的连接连续，隐藏延伸合理。无本节点返修项。

---

## 2026-10-06 source repair 后的独立复验

### 身份、版本及复验范围

- 真实独立 reviewer：`/root/review_neck_children`；工作流身份：`group_child_layers:neck:review`。本次仍由原独立 reviewer 执行。
- 已重新读取本节点 `流程.yaml`、`review/提示词.txt` 和 `review/gpt-6-astra-xhigh.model`（模型标记文件为空，由文件名声明 `gpt-6-astra / xhigh`）。
- 本次 2.2 制作作者：`/root/group_neck_resource_recovery`；父级本次作者：`/root/group_neck`。这两者均不是本报告 reviewer。
- 当前候选：`block-layers/groups.svg`，SHA-256：`ff482c808b128733355a07b0855a140629d90e78a299026cd065040afa719d54`。已直接计算核对，与 `repair-recovery/draft.groups.svg` 及本报告上一轮候选一致。
- `repair-recovery/input-equivalence-and-protection.json` 记录父级、树和参考与旧输入严格一致：父级 SHA-256 为 `f323f8c4a90eceb8277c931879503d52283b3632c6a6be14a248433ab454e16f`，树为 `349a2e359b10964026f275fa00b5c70eaddf6de9a20317172402546fbd2fc523`，参考为 `7f17481a8416753247fc54c3e2433723ebf5464764a320f91cae279d356dfd3b`。
- 重新读取当前树，范围仍为 0 个直属 group、1 个直属 part：`neck/neck_skin`。检查覆盖 1/1。
- 候选、树、参考及技能只读；本次仅在本分支 review 目录生成证据并追加报告，没有修改制作文件、父级或结构，也未派发后续步骤。

### 部件即时复验记录：neck/neck_skin

- 完整路径：`neck/neck_skin`。
- 容器 id：`part-neck-neck-skin`。
- 轮廓 path id：`neck-skin-silhouette`。
- 本次范围结论：**pass**。
- 本次视觉结论：**revise**。
- 本次部件结论：**revise**。

以下八幅证据均由 reviewer 对当前候选重新调用声明的 `svg_preview.py` 生成，并已实际打开查看；不是仅引用制作自查或旧图。先查看整图混合，再查看独显、两侧 8 倍边缘、上下接界、孩子组合及相邻连接。查看完该唯一部件后立即追加本节。

| 实际查看的证据 | 参数与用途 |
| --- | --- |
| [01 整图参考混合](evidence/repair-recovery-review-20261006/01-full-blend.png) | 全图 895 × 1758；reference、candidate 与 50% blend；核对全局位置。 |
| [02 孩子独显与参考边缘](evidence/repair-recovery-review-20261006/02-child-only-4x.png) | `--only part-neck-neck-skin --reference … --edge-overlay`；crop `(365,260,150,160)`，4 倍；查看整片形体与闭合性。 |
| [03 左侧参考边缘 8 倍](evidence/repair-recovery-review-20261006/03-left-edge-8x.png) | 同上 only 与 edge-overlay；crop `(375,300,48,82)`，8 倍；逐段查看左侧可见颈缘及肩根转弯。 |
| [04 右侧参考边缘 8 倍](evidence/repair-recovery-review-20261006/04-right-edge-8x.png) | 同上 only 与 edge-overlay；crop `(458,299,48,83)`，8 倍；显示本次返修问题。 |
| [05 上部接界 8 倍](evidence/repair-recovery-review-20261006/05-upper-connection-8x.png) | 同上 only 与 edge-overlay；crop `(397,268,85,66)`，8 倍；检查下颌后方的隐藏顶弧与左右接入。 |
| [06 下部接界 8 倍](evidence/repair-recovery-review-20261006/06-lower-connection-8x.png) | 同上 only 与 edge-overlay；crop `(373,350,132,64)`，8 倍；检查肩根、下部隐藏弧及问题区向颈根的延续。 |
| [07 仅孩子组合](evidence/repair-recovery-review-20261006/07-children-only-combination.png) | 全画布、白底、`--only part-neck-neck-skin`；唯一孩子的组合，父轮廓未参与显示。 |
| [08 相邻连接混合](evidence/repair-recovery-review-20261006/08-adjacent-connections-4x.png) | crop `(335,280,210,150)`，4 倍，reference、完整 candidate 与 50% blend；检查 head／颈部／body 的相接。 |

#### 范围判断：pass

新标准 `refinement/groups/neck/2.直属拆分与色块/2.2.直属轮廓色块/轮廓检查.json` 对该路径和容器判为 `pass`，`outside_samples = 0`，`outside_area_px2 = 0.0`，`outside_bbox = null`，scale 为 4。报告指向本次 `repair-recovery/input-parent.groups.svg` 和 `repair-recovery/draft.groups.svg`；draft 与本次实际审查候选 SHA 相同，故该范围结果适用于本次候选。孩子当前几何与父轮廓相同，被父范围完整容纳。

#### 视觉判断：revise

1. **需返修：右侧可见颈缘局部外扩。** 在参考原坐标约 `y=326–361`、`x=466–483` 的右侧颈部直段转入肩根弧段，粉色候选外缘持续位于参考皮肤／后发分界的头发一侧；弯转最明显处目视约有 3–5 个原图像素的横向偏差（这是放大图目视估计，非自动测量值）。证据 04 的 reference、blend 与 outline 三格相互对应，证据 06 和 08 也能看到该段皮肤范围偏宽。差异跨越连续曲段，不能全部归为抗锯齿或描线厚度。需由原制作角色将 `part-neck-neck-skin / neck-skin-silhouette` 的这一可见侧缘按参考向内收，重点校正中下部转弯的弧度，再平顺接回颈根；保留上下隐藏延伸，并复查仍被父范围容纳及与 body 连续。本轮不要求更改父级文件。
2. **左侧外缘：pass。** 左颈侧近竖直段与向 `(378,373)` 的颈根转弯基本沿参考分界走向。局部有描线边缘级差异，但未发现与右侧相当的持续明显外扩；没有缺口或明显遗漏。
3. **上部隐藏补全与下颌接界：pass。** 顶弧连续，能向下颌后方延伸，左右附着未断开。整图中上端暂时覆盖脸部属于最终拼合顺序，本次不把它列为外缘返修项。
4. **下部隐藏补全与 body 接界：pass。** 圆弧延续至约 `(438,406)`，与 body 重叠充分；两侧接点和中央接界未见白缝或独立悬片。锁骨仍属 body。此项通过不消除前述右颈可见侧缘问题。
5. **孔洞、开口、窄条、尖端、零散片：pass。** 参考要求连续颈部皮肤面；孩子独显及仅孩子组合均为一片闭合形体，无误切孔洞、断裂、漏掉的分离可见片或异常游离尖端。

### 本次最终结论：revise

范围 **pass**，视觉 **revise**，整体 **revise**。返修定位为唯一直属部件 `neck/neck_skin`（容器 `part-neck-neck-skin`、轮廓 `neck-skin-silhouette`）右侧可见颈缘的连续外扩，主要证据为新图 04，并由新图 06、08 交叉确认。

旧候选的 SHA 相同，旧报告保留作为历史记录。本次没有观察到 source repair 引起的几何变化；是在新的 8 倍局部复验中重新确认了原来被低估的侧缘偏差，因此修正上一轮将其统归为轻微描线差异的判断。当前节点以本节 **revise** 为准，不能沿用旧整体 pass 放行。返修后应实际重看右侧 8 倍边缘、整个孩子独显、上下接界与相邻连接，再更新结论。
