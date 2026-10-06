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

---

## 2026-10-06 revision-02-right-edge 独立复验

### 身份与冻结版本

- 实际 reviewer：`/root/review_neck_children`，仍为原独立 reviewer；工作流身份 `group_child_layers:neck:review`。
- 已先重新读取当前 2.2 `流程.yaml` 的 review 分支、`review/提示词.txt` 与 `review/gpt-6-astra-xhigh.model` 标记；没有创建代理或调用 cursor，没有推进后续。
- 实际本轮 maker：`/root/group_neck_resource_recovery`；冻结父级作者仍为 `/root/group_neck`。
- 当前且唯一审查候选：`block-layers/groups.svg`；直接计算 SHA-256 为 `8c81a17e87058d7e72637be440b5f7cc0c5c68e62d7de0f882813d33c0bbd75f`，与 `revision-02-right-edge/draft.groups.svg` 逐字节相同。
- 原参考、树、父输入、候选均只读；本次仅写当前 review 目录证据、独立核对记录及本报告追加部分。
- 本轮仍为 1/1 个直属 part：`neck/neck_skin`；无直属 group。

### 唯一部件即时记录：neck/neck_skin

- 完整路径：`neck/neck_skin`。
- 容器 id：`part-neck-neck-skin`。
- 轮廓 id：`neck-skin-silhouette`。
- 范围结论：**pass（8× 标准结果，已独立解释并保留 4× fail）**。
- 参考外缘修复结论：**pass**。
- 相邻连接结论：**revise**。
- 本轮部件结论：**revise**。

以下图均由本 reviewer 对当前冻结候选新调用声明的 `svg_preview.py` 生成并实际查看。先看整图，随后逐项看独显、右／左 8× 边缘、上下补全、孩子组合及排除父颈的接界；发现细缝后增加 10 号放大图与精确向量坐标核对。完成唯一组件查看后立即追加本节。

| 实际查看的图与定位 | 具体判断 |
| --- | --- |
| [01 全图 50% blend](evidence/revision-02-review-20261006/01-full-blend.png)，895 × 1758 | 位置、整体宽高无新变化。冻结父颈在孩子右侧露出窄黄带，所以连接检查必须排除该父层。 |
| [02 孩子独显参考边缘 4×](evidence/revision-02-review-20261006/02-child-only-4x.png)，crop `(365,260,150,160)`，`--only part-neck-neck-skin --reference … --edge-overlay` | 一片闭合形体；没有错误孔洞、孤片或漏掉的可见细条。**pass**。 |
| [03 修后右颈缘 8×](evidence/revision-02-review-20261006/03-right-edge-8x.png)，crop `(458,299,48,83)`，同上 only 与 edge-overlay | 旧报告 `y≈326–361` 的持续外扩已收回，当前轮廓主要贴近参考皮肤／后发分界；原右缘返修项已解决。**pass**。 |
| [04 左颈缘 8×](evidence/revision-02-review-20261006/04-left-edge-8x.png)，crop `(375,300,48,82)` | 左侧近直段、肩根转弯保持原来形态，没有新增偏移、缺口。**pass**。 |
| [05 上部补全 8×](evidence/revision-02-review-20261006/05-upper-connection-8x.png)，crop `(397,268,85,66)` | 上接点与顶弧保留，下颌后方隐藏余量连续；暂时覆盖脸部仍属后续堆叠顺序。**pass**。 |
| [06 下部补全 8×](evidence/revision-02-review-20261006/06-lower-connection-8x.png)，crop `(373,350,132,64)` | 下弧与肩根点保留，延入 body 的余量完整；锁骨归属未变。**pass**。 |
| [07 仅全部孩子组合](evidence/revision-02-review-20261006/07-children-only-combination.png)，全画布，仅 `part-neck-neck-skin` | 单独显示完整连通色块，无父层填补的内部孔洞。**pass**。 |
| [08 排除父颈的连接 4×](evidence/revision-02-review-20261006/08-adjacent-no-parent-4x.png)，crop `(335,280,210,150)`，`--hide group-neck` | 颈根／body 接合连续，但右颈中段与后发之间能看到细白缝。**revise**，具体见 10。 |
| [09 排除父颈的右颈根 8×](evidence/revision-02-review-20261006/09-right-root-no-parent-8x.png)，crop `(463,346,50,49)` | 修后两段曲线能够接回颈根，头发、颈部、body 三方颈根位置无游离角或断开。**pass**。本图并未覆盖全部中段细缝。 |
| [10 排除父颈的右中段 8×](evidence/revision-02-review-20261006/10-right-middle-no-parent-8x.png)，crop `(457,322,29,40)`，`--hide group-neck` | 当前候选中有真实的窄白缝；不是冻结父显示造成，也不是仅有阈值差异。**revise**。 |
| [4× 独立范围诊断图](evidence/revision-02-review-20261006/independent-containment-4x-images/01-outside.png) | 两个极小采样点都在左侧相同向量边缘；已与原始 alpha 和 d 文本核对，不能把这一 4× 结果记作通过。 |

### 范围分辨率差异的独立核对

本 reviewer 阅读了 `svg_containment.py` 源实现：支持 scale 1–8，默认 4，先渲染 alpha，再以 `alpha >= 128` 二值化比较父子；YAML 没有将 scale 锁为 4。本次在 review 目录分别用该源工具的 `check` 原函数对同一当前候选、冻结父和树独立复算，结果与制作报告一致：

| 复算分辨率 | 实际结果 |
| --- | --- |
| [4× 原始独立报告](evidence/revision-02-review-20261006/independent-containment-4x.json) | **fail**，`outside_samples=2`，`outside_area_px2=0.125`；原位置 `(399.75,362.5)`、`(395.0,365.25)`。 |
| [8× 原始独立报告](evidence/revision-02-review-20261006/independent-containment-8x.json) | **pass**，`outside_samples=0`，`outside_area_px2=0.0`，`outside_bbox=null`。 |

独立直接读取 alpha，第一点父／子为 `119/131`，第二点为 `119/136`，均恰好跨越阈值 128。独立解析并比较 SVG：旧孩子 d 与冻结父 d 完全相同；新孩子只替换右侧两条 C 指令，其余指令原文相同；把新 d 改回旧值可逐字节恢复旧 SVG。左侧的两处被报位置位于完全相同的向量边界，故这两个 4× 差异不是孩子左缘真实外越；它们是该栅格分辨率对边缘 alpha 的离散差异。核对记录保存在 [independent-raster-and-vector-record.json](evidence/revision-02-review-20261006/independent-raster-and-vector-record.json)。

右侧修形沿父轮廓内侧收回，8× 复算没有任何新增越界；左右、上下实看没有真实父范围外扩。因此本轮接受受支持的 8× 标准范围 **pass**，同时明确保留 **4× fail**。此范围判定不代表接界视觉通过，也没有为消除采样计数裁小未变的左轮廓。

### 本轮需返修：右颈中段与后发的真实几何间隙

对象为 `neck/neck_skin`，容器 `part-neck-neck-skin`，轮廓 `neck-skin-silhouette`；相邻冻结头发轮廓为 `head-hair-neck-right`。

当排除父底稿 `group-neck` 时，白缝约位于原坐标 **`x=465.67–466.61`、`y=332.50–346.21`**。10 号图明确显示其位置，08 号组合图可见同一细缝。孩子右缘本次向内收，在这段越过了冻结后发的内边缘；父底稿在默认组合中会遮住这一空白。

已直接核对两条真正的向量边界，而非从 4× 越界计数推断：

- 后发内缘为从 `(464,308)` 至 `(467,352)` 的直线，`x_hair(y)=464+3(y−308)/44`。
- 新颈缘上段按从上到下表示为 `(467,302)`、`(467,319)`、`(462.5,346)`、`(470,354)` 的三次曲线，`x_neck(t)=467−13.5t²+16.5t³`、`y_neck(t)=302+51t+30t²−29t³`。
- 在 `t=0.65`、`y=339.860875`，颈缘 x 为 `465.8275625`，后发内缘 x 为 `466.172332386…`，留下约 **0.34477 原图像素** 的真实空隙。另在 `y=337.136` 留约 `0.28255` 像素，在 `y=340.74074` 留约 `0.34343` 像素。这是连续一段几何空隙，虽窄，8× 实图已有白缝，不能用抗锯齿或默认父底稿掩盖。

详细坐标见 [independent-right-middle-gap.json](evidence/revision-02-review-20261006/independent-right-middle-gap.json)。这与左侧的 4× alpha 阈值差异是不同问题。

修复应由制作角色在保持参考贴合及冻结父容纳的前提下，令右中段与冻结后发内缘有连续覆盖；只需修正这段局部接合余量，保留已通过的颈根接点和上下隐藏延伸。复验需再次隐藏 `group-neck`，实际查看 10 号位置和右颈根，并复核独显参考外缘；不能依赖父底稿填缝。

### 本次最终结论：revise

本轮冻结 SHA `8c81a17e87058d7e72637be440b5f7cc0c5c68e62d7de0f882813d33c0bbd75f`：**范围 pass（8×）／参考外缘 pass／相邻连接 revise／整体 revise**。上一轮右缘外扩已解决，当前唯一返修项是排父后右颈中段与后发的真实细缝。4× fail2、8× pass0 和两类问题的区别均已独立核对并保存；不推进后续。

---

## 2026-10-06 revision-03-right-middle-gap 独立复验

### 版本、身份与范围

- 真实 reviewer：`/root/review_neck_children`；工作流身份 `group_child_layers:neck:review`，继续原独立审查。
- 已先重新读取当前 2.2 `流程.yaml` 的 review 分支、`review/提示词.txt` 和 `review/gpt-6-astra-xhigh.model` 标记。
- 本次真实 maker：`/root/group_neck_gap_recovery`。revision-02 的作者仍为 `/root/group_neck_resource_recovery`；冻结父作者仍为 `/root/group_neck`。历史作者与结论保留。
- 当前候选 `block-layers/groups.svg` 的独立实算 SHA-256：`afb7ce5c2cab6c2144ffd3417c275a6455bbc31c4eaa3159d0750419653b2f16`。已直接核对与 `revision-03-right-middle-gap/draft.groups.svg` 逐字节相同。
- 仍为唯一直属 part：`neck/neck_skin`（1/1），没有直属 group。
- 候选、参考、树、父级及技能只读；仅新增 review 证据与记录并追加本报告，未调用 cursor、创建代理或推进后续。

### 部件即时记录：neck/neck_skin

完整路径 **`neck/neck_skin`**；容器 **`part-neck-neck-skin`**；轮廓 **`neck-skin-silhouette`**。

- 范围：**pass（8×，4× fail2 如实保留）**。
- 可见颈缘与上下隐藏补全：**pass**。
- 上一轮右中段细缝：**已修复，pass**。
- 该孩子本轮自身修形：**pass**。
- 当前组合仍有需要处理的邻组 head 接界缺口：**revise**，坐标、归属与证据见下文；因此当前冻结候选的最终整体结论仍为 **revise**，不是无条件放行。

本 reviewer 先实际查看新整图，再逐项查看下列新图。review 目录中的 01–10 均由 reviewer 对当前冻结 SHA 重新调用声明的 `svg_preview.py` 生成；另外实际查看了制作目录中对应旧／新候选的两幅 8× 对照图。所有独显参考边缘图均使用真实容器 `--only part-neck-neck-skin` 与 `--reference … --edge-overlay`。检查完成后立即追加本节。

| 实际查看的图 | 具体对照及本项结论 |
| --- | --- |
| [01 全图及 50% 混合](evidence/revision-03-review-20261006/01-full-blend.png) | 全局位置、宽高和角色轴向未变。默认全图仍含父底稿，因此另看排父组合。**pass**。 |
| [02 孩子独显及参考边缘 4×](evidence/revision-03-review-20261006/02-child-only-reference-4x.png)，crop `(365,260,150,160)` | 一片闭合形体；左缘、顶弧和下部补全完整；无新孔洞、孤片或遗失窄条。**pass**。 |
| [03 完整右侧排父 8×](evidence/revision-03-review-20261006/03-right-full-no-parent-8x.png)，crop `(454,302,63,83)`，`--hide group-neck` | 从颈侧到颈根的旧中段白缝消失，y308–376 段连续。顶端仍有头部小白尖，单独列入邻组问题，不能把整张图无条件标 pass。 |
| [04 原中段定位排父 8×](evidence/revision-03-review-20261006/04-right-middle-no-parent-8x.png)，crop `(457,322,29,40)` | 原 `y≈332.50–346.21` 白缝不再出现；肤色与后发之间连续覆盖。**pass**。 |
| [05 右颈根排父 8×](evidence/revision-03-review-20261006/05-right-root-no-parent-8x.png)，crop `(463,346,50,49)` | 向头发和 body 的接合连续，下接点稳定，无白缝、折断或孤尖。**pass**。 |
| [06 修后右缘独显参考 8×](evidence/revision-03-review-20261006/06-right-edge-only-8x.png)，crop `(458,299,48,83)` | 小量接合余量仍落在参考交界描线附近；没有恢复最初约 3–5px 的持续外扩。上直段到肩根的转向自然。**pass**。 |
| [07 仅孩子组合](evidence/revision-03-review-20261006/07-children-only-combination.png) | 唯一孩子独立闭合、连续，父层未参与显示，没有内部空洞或碎片。**pass**。 |
| [08 顶部接界完整组合 8×](evidence/revision-03-review-20261006/08-head-join-full-8x.png)，crop `(457,294,25,25)` | 小白尖仍存在，即使父颈显示也没有填满。邻组接界 **revise**。 |
| [09 仅 head 参考边缘 8×](evidence/revision-03-review-20261006/09-head-only-reference-8x.png)，同一 crop，仅 `group-head` | 能直接看到 `head-face-cap` 与 `head-hair-neck-right` 之间的缺口；参考该处是连续的下颌／颈皮肤与后发交界，没有背景穿孔。邻组 head **revise**。 |
| [10 顶部接界排父组合 8×](evidence/revision-03-review-20261006/10-head-join-with-parent-hidden-8x.png)，同一 crop | 小白尖保留，进一步确认不是父底稿露色造成的假象。邻组接界 **revise**。 |
| [制作目录 12 中段前后 8×](../../../refinement/groups/neck/2.直属拆分与色块/2.2.直属轮廓色块/revision-03-right-middle-gap/evidence/12-right-middle-before-after-8x.png) | 实际查看旧稿细白缝与新稿连续接合的同倍率对照。原中段返修项 **pass**。 |
| [制作目录 13 完整右侧前后 8×](../../../refinement/groups/neck/2.直属拆分与色块/2.2.直属轮廓色块/revision-03-right-middle-gap/evidence/13-full-right-before-after-8x.png) | 顶部小白尖在前后均存在，中段修好、颈根稳定；这只能证明其继承性，不能证明该白尖合理。 |

### 保护与范围核对

独立解析当前 d 与 revision-02 的 d：仅右侧两条 C 指令变化；替回旧 d 后能逐字节恢复整份前候选。左侧、顶部、下方隐藏弧以及 head、父颈和 body 的路径未改变。对这些未改对象，继承前次逐段证据，并已在本次 02 独显和受影响的 03、05、08–10 组合中复核。该继承不覆盖本次新确认的头部白尖问题。

本 reviewer 用同一个声明源工具、当前候选和冻结父再次独立复算：

- [8× 独立原始报告](evidence/revision-03-review-20261006/independent-containment-8x.json)：**pass，outside_samples=0，outside_area_px2=0.0**。
- [4× 独立原始报告](evidence/revision-03-review-20261006/independent-containment-4x.json)：**fail，outside_samples=2，outside_area_px2=0.125**，包围盒 `[395.0,362.5,5.0,3.0]`，位置与上轮完全相同。

4× 原文未改左缘的两个阈值采样点仍按上一轮已独立读取的 `119/131`、`119/136` alpha 解释；本轮 maker 报告也记录相同值。没有将 4× 记为通过。当前工具支持的 8× 通过，结合未改左侧的完全相同向量路径，可接受该父范围结果。此次独立哈希、保护核对和两倍率结果见 [independent-verification.json](evidence/revision-03-review-20261006/independent-verification.json)。

制作侧 `right-side-continuity.json` 的数值扫描给出原中段最小重叠约 0.51668px、完整 y308–376 最小约 0.30047px。这里将它作为制作侧数值佐证，不冒称 reviewer 重做了整个扫描；reviewer 自身的实际排父 8× 图确认该检查段没有旧细缝，且右缘贴合参考。

### 仍需处理的邻组 head 问题：顶部脸颊／后发接合小白尖

**归属：`head` / `group-head`，主要轮廓 `head-face-cap` 与 `head-hair-neck-right`；不是本次 neck 孩子中段返修回退。** 该处在冻结父颈边界外仍存在缝隙，不能要求 neck 孩子通过越出冻结父来掩盖。

实际小白尖集中在原坐标约 **`x=467.0–468.7`、`y=303.4–305.2`**。本次 08（父层存在）、09（仅 head）、10（父层隐藏）及前后图 13 均确认它；参考该位置是下颌边缘的连续皮肤／后发连接，没有白色背景穿孔。参考边线高亮可以表现为颜色，但不能据此保留透明的几何缺口。

直接依据当前头部、孩子、父级的三次曲线作 y 反解核对，记录在 [independent-top-head-junction.json](evidence/revision-03-review-20261006/independent-top-head-junction.json)：

- 在 `y=304.5`，`head-face-cap` 右缘为 `x≈467.28830`，`head-hair-neck-right` 左缘为 `x≈467.62603`，两条头部轮廓之间留约 **0.33773px** 空隙。
- 同一行孩子颈缘约 `x=466.98087`，冻结父颈约 `x=467.00060`；二者均达不到缺口。即使让孩子填满整个冻结父，也不能消除此行的头部间隙。
- 在 `y=304.0`，两条 head 轮廓间仍有约 `0.17817px` 空隙；`y=305.0` 全组合尚留约 `0.15156px`，显示父底稿后仍留约 `0.12364px`。因此是实际向量缺口，并非只由抗锯齿或阈值导致。

本轮没有头部写权限，因此没有修改它，也没有将其伪造为 pass。应由总控将这一明确范围交给 head 制作角色，补齐脸颊／后发的隐藏接合，并在保留本次颈部已通过形状的前提下复查这处上接界；若决定修改冻结父，也必须另行走该父范围的制作与审查。这里只记录需处理项，不自行派发。

### 当前冻结候选最终结论：revise（邻组 head 接界待处理）

SHA **`afb7ce5c2cab6c2144ffd3417c275a6455bbc31c4eaa3159d0750419653b2f16`** 的 neck 孩子自身范围、参考外缘、原右中段返修及颈根连接均 **pass**。左／顶／下隐藏形体仍完整，未发现新增 neck 孩子缺口。

但是当前组合在顶部存在已明确定位的真实 head 接合小白尖，因此本报告不作“全部接界已通过”的放行；整体 **revise**，需处理对象为邻组 `head` 的两条轮廓，坐标如上。该结论并非因为问题旧、无头部权限或 4× fail2 而生成，而是根据当前参考、实际图和向量缺口证据生成。中段 neck 不应恢复旧外扩，也无需再次无差别重画。

---

## 2026-10-06 同轮 head READY 实际依赖联合复验 — neck 节点 pass

### 不变的当前候选与明确依赖

- 真实 reviewer 仍为 `/root/review_neck_children`，身份 `group_child_layers:neck:review`。先重新读取当前 2.2 YAML 的 review 分支及 review 提示词。
- neck 候选仍为 r1s2 `block-layers/groups.svg`，SHA-256 **`afb7ce5c2cab6c2144ffd3417c275a6455bbc31c4eaa3159d0750419653b2f16`**。本次未修改该文件、树、参考或任一分支。
- 联合依赖为同轮 r1s1 的真实 **head READY guide**，SHA-256 **`97e26f6fa4ad8eb3a35b52a8a21d121d3db6f30a8179b7cdfc63074b562c6815`**，不是临时修补、假定的未来版本或只含旧 head 父底稿的副本。
- 上一节 revision-03 的“neck 自身 pass、legacy head 接界 revise”及 ledger neck004 历史完整保留。本节添加了同轮已完成邻组的实际依赖证据，不声称 AFB 单支内旧 head 父底稿白尖被修改或消失。

### 源状态、实际文件与预合并独立核对

已读取实际 `structure/groups.dispatch.json`：head 节点状态为 `ready`；r1s1 的 carry.guide_svg 与 frame.outputs.guide_svg 都为 `block-layers/groups.svg`。frame 当前 guide producer 为 `part_motion_completion / group:head / /root/group_head_motion_recovery`；该 frame 的 READY snapshot 目录为 `tmp/dispatch-groups.dispatch/r1/snapshots/r1s1/n1`，其登记 guide SHA 与实算 snapshot、实算当前 r1s1 guide 全部等于上述 **97e26…**，snapshot 与当前 guide 逐字节相同。

head 的 2.2 独立报告已记录 candidate-05 12 个直属孩子整体 pass，face 的通过依据沿用完整无变更验证支持的先前实际审查；后续 guide 的输出来源和 READY snapshot 已按上述 source frame 核对。本次未代替 head 的完整审查，而是独立检查与 neck 接界有关的当前真实子层。

本 reviewer 还逐一实算总控 `tmp/neck-head-ready-join-preflight/input-proof.json` 的六份实际分支 guide SHA，全部匹配；共同 baseline SHA 为 `2ae56b3470abbaf522630a7355c316c3cef7da1d3d261c69644270fa413a774a`，与源 dispatch 状态及总控 proof 一致。然后直接调用技能源 `merge_artifacts.merge_svg`，只在本 review 证据目录写预合并副本，没有调用 aggregate、改状态、改分支或发布主产物。

独立预合并 SHA 为 **`4452b41de1083d290708c3e29f0c6d6b16bb5f425de8311d624b1d37174e5d58`**，与总控的 source 预合并逐字节一致；资源 remap 数量依次为 `[2,0,0,0,0,0]`。head 实际 `group-head-face` 与 neck `part-neck-neck-skin` 的完整子树在预合并中保持不变。全部核对结果与六分支实算 SHA 见 [独立依赖证明](evidence/head-ready-joint-review-20261006/independent-head-ready-dependency-proof.json)；实际独立源预合并为 [source-six-branch-premerge.svg](evidence/head-ready-joint-review-20261006/source-six-branch-premerge.svg)。

### 唯一 neck 直属部件的即时联合复验记录

完整路径 **`neck/neck_skin`**，容器 **`part-neck-neck-skin`**，轮廓 **`neck-skin-silhouette`**；仍为本组唯一直属部件，检查覆盖 1/1。

以下五幅图均由本 reviewer 从刚核对的真实 source 预合并重新调用声明的 `svg_preview.py` 生成并实际查看。01–04 同时使用 **`--hide group-head --hide group-neck`**，故头部与颈部父底稿都未参与显示；留下的是两组真实孩子与同轮邻组。先查看整图 blend，再查看顶部 8×、完整右侧和颈根组合，最后重新核对 neck 独显参考边缘。完成查看后立即追加本记录。

| 实际查看图 | 具体比较与结论 |
| --- | --- |
| [01 实际孩子整图与参考混合](evidence/head-ready-joint-review-20261006/01-full-blend-actual-children.png) | 全图位置对齐；head 与 neck 实际孩子组合未出现旧顶部白尖。颈部上端覆盖脸部属于后续堆叠顺序，不作本步外缘缺陷。neck 本项 **pass**。此图不代表本 reviewer 重审其余五组全部内容。 |
| [02 顶部接界排两个父 8×](evidence/head-ready-joint-review-20261006/02-top-joint-no-two-parents-8x.png)，crop `(457,294,25,25)` | 原 `x≈467.0–468.7，y≈303.4–305.2` 白尖位置现在由真实 head 孩子覆盖；下颌、颈部与后发连续，没有透空尖口。**pass**。 |
| [03 完整右侧排两个父 8×](evidence/head-ready-joint-review-20261006/03-right-full-no-two-parents-8x.png)，crop `(454,294,63,101)` | 从上接界、右颈中段到颈根完整连续；原中段白缝也未重现。头发与 neck 叠接合理，无新的缺口或断裂。**pass**。 |
| [04 头／颈／body 相邻组合 4×](evidence/head-ready-joint-review-20261006/04-head-neck-body-no-two-parents-4x.png)，crop `(365,284,150,135)` | 同时检查左右颈侧、下颌后方和两侧颈根，当前同轮邻组覆盖连续；无被父层隐藏的白缝。neck 连接项 **pass**。 |
| [05 neck 独显参考边缘 8×](evidence/head-ready-joint-review-20261006/05-neck-only-reference-8x.png)，crop `(458,299,48,83)`，`--only part-neck-neck-skin --reference … --edge-overlay` | 孩子几何保持 AFB 原样，颈侧仍贴近参考，旧明显外扩没有恢复，隐藏余量未被邻组组合图误当成新的可见外缘。**pass**。 |

### 顶部实际覆盖来源的准确归属

独立比对发现，`head-face-skin` 的下颌段 **`C 446 320 462 309 473 300`** 与 legacy `head-face-cap` 对应段相同。因此不能将白尖消失归因于该下颌段重新外扩。

真正的补齐来自已完成 `head/rear_hair_right / group-head-rear-hair-right` 中的 **`head-rear-right-root`、`head-rear-right-hidden`** 隐藏补全，与已通过的 `head/face / group-head-face` 及 neck 孩子共同构成连续接界。两者是 READY guide 中现存的实际子层，不是父底稿，也不是本 reviewer 临时画出的补片。

作为实图的独立佐证，对预合并逐 path 隔离，在原坐标 `(467.5,304.5)`、8× 栅格读取 alpha：`head-face-skin=0`、legacy `head-face-cap=0`、`neck-skin-silhouette=0`，而 `head-rear-right-root=255`、`head-rear-right-hidden=255`。这明确说明旧空点在真实 head 子层里已有实质覆盖，并没有通过父底稿或假称 face 曲线变化掩盖问题。该数据保存在上面的独立依赖证明中。

### 最终 neck 节点结论：pass，绑定上述实际 head READY 依赖

**neck AFB 候选自身的范围和外缘 pass，加上 head READY 97e26… 的实际孩子后，顶部与两侧相邻连接均 pass，故当前 neck 2.2 节点最终可判 pass。** 8× 范围 PASS0 与 4× FAIL2 的历史及解释继续有效，没有改写成“4× 通过”。

此结论仅适用于明确绑定的 neck SHA **`afb7ce5c2cab6c2144ffd3417c275a6455bbc31c4eaa3159d0750419653b2f16`** 和 head guide SHA **`97e26f6fa4ad8eb3a35b52a8a21d121d3db6f30a8179b7cdfc63074b562c6815`**；若回退为单支旧 head 父底稿，上一节小白尖观察仍然成立。现有同轮 READY 子层已满足该连接，无需为此修改已完成 head 或污染 neck 分支只读邻组。

正式 r1 aggregate 尚未由本 reviewer 执行；总控实际聚合后仍需核对相同依赖与排父接界。这里完成的是独立 source 预合并联合验证，没有代替实际聚合或后续流程。
