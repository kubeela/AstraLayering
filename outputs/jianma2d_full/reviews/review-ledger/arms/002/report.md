# arms 直属轮廓色块独立审查

- 审查身份：`group_child_layers:arms:review`
- 工作根：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s4`
- 输入：`structure/groups.json`、`references/base-subject.png`、`block-layers/groups.svg`、`refinement/groups/arms/2.直属拆分与色块/2.2.直属轮廓色块/轮廓检查.json`（只读）。
- 范围：直属 `arms/arm_left`、`arms/arm_right`，无直属 part。
- 已实际查看整图混合：`evidence/full-blend.png`。左右臂整体位置、肩至手的连续性均存在；局部准确度以下列 4 倍独显叠线为准。
- 工具：技能 `tools/svg_preview.py`；局部均带 `--only <id> --reference references/base-subject.png --edge-overlay --scale 4`，含参考、独显、50% 混合、粉色轮廓叠加四栏。

## 1. arms/arm_left — revise

- 完整路径：`arms/arm_left`
- 容器 id：`group-arms-arm_left`
- 色块 path id：`arm-left-child-silhouette`
- 范围：**pass**。报告该项 `outside_samples=0`、`outside_area_px2=0.0`，孩子被父 arms 范围容纳。
- 实际查看图证（原 SVG 像素坐标 crop x/y/w/h）：
  - `evidence/full-blend.png`：整图、参考与 40% 混合。
  - `evidence/left-shoulder-4x-edge.png`：`275 360 115 260`。
  - `evidence/left-elbow-wrist-4x-edge.png`：`225 540 125 300`。
  - `evidence/left-hand-4x-edge.png`：`200 800 85 160`。
- 逐段对照：
  - 肩端约 x307–366/y380–440 的闭合圆弧完整，外肩可见弧度基本跟随参考；内侧隐藏肩端进入头发与躯干遮挡区，和 body 有重叠而没有断缝。上臂外缘至肘部连续，轮廓有少量线宽级差异。
  - **前臂内侧需返修**：约 y625–805，候选向画面左侧收得过早，尤其 y675–780 段明显切入参考皮肤内部，留下连续约 5–9 原图像素的未覆盖皮肤带；前臂因此偏窄，腕上内收转向也偏早。证据为 `left-elbow-wrist-4x-edge.png` 第三栏的浅肤色露出条、第四栏位于皮肤内部的粉线。外侧虽较接近参考，不能抵销内側轮廓偏移。
  - 腕至手掌外侧连接连续；掌外缘转折、三个分开的下端/侧向指尖及拇指回弯都存在，没有漏掉整根手指或新增断裂。指尖位置总体在参考描线附近，未发现影响主要形状的偏移。
  - 手内孔为真实负空间，约 x237–246/y872–906，开口与弯指走势大体保留；孔左侧比参考可见空隙稍扩，约 1–3 像素，复修时宜同时贴合其左缘。孔顶部、拇指末端及三个指尖均已逐一看图。
  - 与相邻 body 的上臂连接及头发遮挡带连续；目前无身体接点断裂。问题发生在清楚可见的前臂内侧，不能以隐藏补全或父范围 pass 解释。
- 视觉：**revise**。当前色块沿用了父形体，但独立看图仍发现上述可见臂缘偏窄；需原制作 worker 修正，并协调父范围使范围与视觉同时成立。

## 2. arms/arm_right — revise

- 完整路径：`arms/arm_right`
- 容器 id：`group-arms-arm_right`
- 色块 path id：`arm-right-child-silhouette`
- 范围：**pass**。报告该项 `outside_samples=0`、`outside_area_px2=0.0`，孩子被父 arms 范围容纳。
- 实际查看图证（原 SVG 像素坐标 crop x/y/w/h）：
  - `evidence/full-blend.png`：整图、参考与 40% 混合。
  - `evidence/right-shoulder-4x-edge.png`：`490 360 120 260`。
  - `evidence/right-elbow-wrist-4x-edge.png`：`525 540 145 300`。
  - `evidence/right-hand-4x-edge.png`：`600 800 80 160`。
- 逐段对照：
  - 肩端约 x513–573/y380–440 的补全圆弧闭合、平顺；可见外肩及上臂外缘基本贴合，边界存在约线宽级余量。内肩在头发与 body 下的延续保留，与身体重叠连续。上臂内侧被发束切开的可见窄条有覆盖，无明显缺片。
  - **前臂内侧需返修**：约 y650–810，候选向画面右侧收窄，粉色边界持续位于可见皮肤内部；中下段约 3–6 原图像素的肤色条露在色块之外，腕上内收偏早。`right-elbow-wrist-4x-edge.png` 的混合栏和粉线栏清楚显示。右侧虽弱于左侧，仍是连续可见边缘偏移，不能给视觉 pass。
  - 外侧从肘到腕及手背保持连续，未发现断裂；掌外缘折点与全部可见指尖均已核对。下指尖、两个向左伸出的指尖及拇指末端都有独立的转折/回弯，位置大体跟随参考，未漏掉整块手指区域。
  - 手内孔约 x632–642/y872–906，负空间存在。孔顶略向左上偏，右侧边缘覆盖了参考弯指内侧的少量皮肤，约 1–3 像素；复修应贴近参考的弯指内缘，同时保留完整孔洞。不是内部纹理问题，而是孔边的局部几何差异。
  - 手腕与前臂、肩与 body 的接点均连续。头发遮挡处允许的延续没有断缝；上述前臂偏窄处本身清楚可见，不属于隐藏区域。
- 视觉：**revise**。需原制作 worker 调整可见前臂内缘与腕上过渡，并复核手孔边缘。

## 整体结论 — revise

两个直属组件已全部完成范围与实际图像审查。范围均 pass，视觉均 revise，因此整体 **revise**。

返修重点：

1. `arms/arm_left` / `group-arms-arm_left` / `arm-left-child-silhouette`：补齐 y625–805 的内侧前臂可见轮廓，重点 y675–780，顺接腕上转向；图证 `evidence/left-elbow-wrist-4x-edge.png`。
2. `arms/arm_right` / `group-arms-arm_right` / `arm-right-child-silhouette`：补齐 y650–810 的内侧前臂可见轮廓并顺接腕部；图证 `evidence/right-elbow-wrist-4x-edge.png`。
3. 同步小幅修整双手孔边，不改掉孔洞或指尖；图证 `evidence/left-hand-4x-edge.png`、`evidence/right-hand-4x-edge.png`。

两个孩子复用父 arms 几何，因此直接贴合参考会可能超出现有父范围。应由总控协调父形体与制作 worker；不能为了保留范围 pass 而保留已查出的可见皮肤缺口。本审查未修改 SVG、树、参考或技能资料，未派发后续任务。


# 第二轮独立复验（candidate-02）

- 原审查身份续用：`group_child_layers:arms:review`。
- 已重新读取当前 2.2 `流程.yaml` 与 `review/提示词.txt`。树仍为两个直属 group，无直属 part。
- 只读冻结候选：`reviews/group_child_layers/arms/candidate-02.svg`。已核对它与当前 `block-layers/groups.svg`、范围报告对应的 `tmp/arms-child-layers/candidate-02.svg` SHA-256 一致，均为 `612866b55282340cfd4f69884d8e0b99abe35bbdf5031fc6353e126557398de6`。
- 范围报告现以 `tmp/arms-child-layers/input-parent-02.svg` 的 `group-arms` 为父范围，两个孩子均 pass、越界采样与面积均为 0。
- 已先实际查看 `evidence-02/full-blend.png` 整图、参考与 40% 混合。双臂完整连续，前臂增宽未造成整体位置偏移；具体贴合仍按以下 4 倍独显叠线及前后对照判断。
- 前后对照的旧稿来自首轮 `tmp/arms-child-layers/candidate.svg`，用工具独显成 `evidence-02/previous-left-only.png` / `previous-right-only.png`，再用于 `--compare`；前后图为 previous / candidate / 50% blend 三栏，旧稿 1 倍位图放大有采样软边，未将其当成几何改变。

## 第二轮 1. arms/arm_left — pass

- 完整路径：`arms/arm_left`。
- 容器 id：`group-arms-arm_left`；色块 path id：`arm-left-child-silhouette`。
- 范围：**pass**，新版父范围检查 `outside_samples=0`、`outside_area_px2=0.0`。
- 已实际查看图证：
  - `evidence-02/full-blend.png`。
  - 肩端 crop `275 360 115 260`：`evidence-02/left-shoulder-4x-edge.png`、`evidence-02/left-shoulder-4x-before-after.png`。
  - 肘腕 crop `225 540 125 300`：`evidence-02/left-elbow-wrist-4x-edge.png`、`evidence-02/left-elbow-wrist-4x-before-after.png`。
  - 手部 crop `200 800 85 160`：`evidence-02/left-hand-4x-edge.png`、`evidence-02/left-hand-4x-before-after.png`。
- 逐项复验：
  1. 首轮 y625–805 的内缘偏窄已修正。y640 约 x325.4、y700 约 x308.7、y780 约 x272.4 的新曲线沿参考皮肤边缘行进；重点 y675–780 不再露出首轮 5–9 px 的连续皮肤条。参考叠线已贴住肤色/背景发束分界，前后图清楚显示补回的内侧窄带。
  2. y780–835 从前臂到腕上凹弧顺接：旧稿过早内收消失，y830 约 x256 的凹点与参考对应，向手背凸弧连续，无额外尖角、台阶或断裂。
  3. 手孔从首轮宽孔收至参考可见负空间。约 x240–246/y874.5–904.5 的尖顶、左缘弯折及下端回收基本沿参考空隙边界，原先割入弯指的左缘偏差已消除。孔洞完整，未被填死；与拇指和弯指的连接仍连续。
  4. 回归检查：外肩可见弧与隐藏肩端完整，肩端仍与 body 重叠；外侧上臂、肘及前臂轮廓没有新增缺口。头发分割出的上臂窄条保留。三个外伸指尖与拇指端逐一核对，形状及位置没有被本轮改变，掌外缘及身体接点无断裂。
- 视觉：**pass**。首轮该件的连续皮肤漏覆及手孔差异均已修复，可见轮廓、孔洞、端点和连接满足本步要求。

## 第二轮 2. arms/arm_right — pass

- 完整路径：`arms/arm_right`。
- 容器 id：`group-arms-arm_right`；色块 path id：`arm-right-child-silhouette`。
- 范围：**pass**，新版父范围检查 `outside_samples=0`、`outside_area_px2=0.0`。
- 已实际查看图证：
  - `evidence-02/full-blend.png`。
  - 肩端 crop `490 360 120 260`：`evidence-02/right-shoulder-4x-edge.png`、`evidence-02/right-shoulder-4x-before-after.png`。
  - 肘腕 crop `525 540 145 300`：`evidence-02/right-elbow-wrist-4x-edge.png`、`evidence-02/right-elbow-wrist-4x-before-after.png`。
  - 手部 crop `600 800 80 160`：`evidence-02/right-hand-4x-edge.png`、`evidence-02/right-hand-4x-before-after.png`。
- 逐项复验：
  1. 首轮 y650–810 的可见前臂内侧偏窄已修复。新曲线通过 y640 约 x554.8、y700 约 x571.8、y780 约 x608.2，连续沿参考的皮肤边缘前进；中下段原先 3–6 px 的露肤条已被补回。参考叠线覆盖了原先的分界，前后对照中内侧补回的窄带与问题位置一致。
  2. 前臂向腕部过渡已移至参考转向处。约 x623.5/y830 的内收，与 y835/623 至手背凸起连续；有与参考对应的腕部凹折，未产生新断裂、细缝或超出参考的大鼓包。外侧肘腕连线无回退。
  3. 手内孔已收整为约 x633–639.5/y875.4–904.1 的窄孔；孔顶下降，右边缘沿弯指内侧收回，首轮右边界切入皮肤的问题消除。参考孔内背景保持贯通，拇指侧与孔底回弯均存在，孔没有被封闭或挤断。
  4. 回归检查：隐藏肩端圆弧与 body 连接重叠保留，外肩、上臂外缘及头发切开的窄条没有新增遗漏。掌外折角、最下指尖、两个向左伸出的指尖及拇指末端均实际逐一看图；前后位置一致，主要指形未改变，腕手与肩身接点连续。
- 视觉：**pass**。首轮该件问题已修复，主要可见轮廓对准，孔洞、端点与相邻接点无回退。

## 第二轮整体结论 — pass

本轮两个直属 group 均已完成独立逐件复验，实际查看 1 张整图混合、6 张四倍参考叠线和 6 张四倍前后对照；每件范围 **pass**、视觉 **pass**，整体 **pass**。第二轮结论取代首轮待返修状态，首轮记录保留为历史。

本结论适用于 SHA-256 `612866b55282340cfd4f69884d8e0b99abe35bbdf5031fc6353e126557398de6` 的冻结候选及本轮两个直属臂组，不延伸为后续关节拆分的审查。当前无直属 part。报告交总控推进 checkpoint / complete；审查未改候选、父范围、树或参考，未派发后续。
