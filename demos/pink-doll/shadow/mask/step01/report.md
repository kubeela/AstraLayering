# Live2D 投影蒙版制作报告（step01 / mask）

## 1. 已建立的投影关系（`shadows.json` v2）

本次在 `character-assembled.kra` 原尺寸（`1254×1254`，RGBA U8）基础上建立两个非穿透隔离组，共制作 4 条独立投影关系：

1. **`bangs-to-face`（`character:hair/bangs` -> `character:face/face_base`）**
   - **部件与图层 UUID**：投射层 `051 | hair/bangs`（`afba6c2a-e2c9-4741-8d14-b343a2aa86a0`），接收层与裁切底层 `030 | face/face_base`（`7800356f-9032-4024-869a-e72d6b74200a`），阴影层 `阴影｜hair/bangs｜face/face_base`（`da96d840-c3c6-4f13-a200-64b167e40a0a`），位于隔离组 `投影组｜face/face_base`（`6c8ff780-8eda-40b2-a809-af50c411bd37`，`passthrough="0"`）内并开启原生 `inheritAlpha`。
   - **选色与混合模式**：对照 `simplified-subject.png` 前额刘海实际落影采样实色 `#d8b3ab`（`RGB(216, 179, 171)`），使用 `normal`（`opacity=255`），与左右前侧发影层共享同一不透明发影色，重叠处不会产生二次叠黑；眉毛与五官位于隔离组上方，保持清晰可读。
   - **完整影层与偏移余量**：完整保留刘海冠部遮挡区、额角外侧裁切外余量（`outsideReceiverPixels = 12281`）、额前大三角分缝顶点与内缘投射，以及中央刘海尖下 2–3px 窄影带与两侧斜刘海下 4–5px 影带，通过 `[[0, 0], [-6, 0], [6, 0], [0, -4], [0, 6]]` 偏移复核。

2. **`front-side-hair-right-to-face`（`character:hair/front_side_hair_right` -> `character:face/face_base`）**
   - **部件与图层 UUID**：投射层 `052 | hair/front_side_hair_right::front`（`1e71109d-8aa2-47de-a18b-b2263dac69d9`）与 `049 | hair/front_side_hair_right::root`（`50caed0f-2a51-41b8-abee-e1cca6f5574b`），裁切底层 `030 | face/face_base`（`7800356f-9032-4024-869a-e72d6b74200a`），阴影层 `阴影｜hair/front_side_hair_right｜face/face_base`（`ae087aea-4d09-45fc-8de7-e6cde295760e`）。
   - **逐束判断、选色与余量**：对照 `simplified-subject.png`（与组装头脸配准偏移 `dy=+8`），右前侧发（画面左侧）仅在上方太阳穴至上睫外角上方（`y=155..226`）与脸缘实际接触并投出窄影；下眼睑外侧至腮红脸颊段（`y=228..280`）在参考图中为纯亮面肤色，无外露影线。因此静帧 `[0, 0]` 仅在太阳穴接触段显影，脸颊段收于贴脸发束不透明主体之后（保留完整遮挡区与脸外余量，`outsideReceiverPixels = 5299`），使向脸内偏移 `[6, 0]` 时能自然露出连续贴脸发束影；外侧飞散细发（`x=501..525`）与下方离开脸缘悬空的分叉卷尾（`y=272..356` 外侧支）不接触脸部，未向脸内平移成假影线。颜色同样采用 `#d8b3ab`（`normal`）。

3. **`front-side-hair-left-to-face`（`character:hair/front_side_hair_left` -> `character:face/face_base`）**
   - **部件与图层 UUID**：投射层 `053 | hair/front_side_hair_left::front`（`e9e0a043-bac8-43b9-9551-a96f91136236`）与 `050 | hair/front_side_hair_left::root`（`1057823f-d760-4671-bfcd-e91cc0907013`），裁切底层 `030 | face/face_base`（`7800356f-9032-4024-869a-e72d6b74200a`），阴影层 `阴影｜hair/front_side_hair_left｜face/face_base`（`7be235e3-b70f-4809-8834-a0b56190afc6`）。
   - **逐束判断、选色与余量**：与右侧对称，仅在画面右侧太阳穴接触段（`y=155..226`）于 `[0, 0]` 显影，脸颊段（`y=228..281`）保留在贴脸发束遮挡体内并向脸外延伸（`outsideReceiverPixels = 5175`），支持 `[[0, 0], [-6, 0], [4, 0], [0, 5]]` 偏移；外伸细发与下方离开下颌线的卷尾不搬移到脸上。颜色采用 `#d8b3ab`（`normal`）。

4. **`skirt-to-legs`（`clothing:skirt/lower_tier` -> `character:legs/leg_right/leg`, `character:legs/leg_left/leg`）**
   - **部件与图层 UUID**：投射层 `002 | skirt/lower_tier::front`（`f16a16dc-91e9-448f-9e9a-fb3b096e5799`）与 `001 | skirt/lower_tier::back`（`7381db10-bf7b-4238-bccf-25c11543179e`），接收层 `007 | legs/leg_right/leg`（`28730050-72ea-410f-98da-bb96875a6436`）与 `008 | legs/leg_left/leg`（`b7de4261-4b44-46ee-af8a-6f612d249448`）置于隔离组 `投影组｜legs/leg`（`9d827838-1cfb-47f3-a2d4-b8ca4576800e`）内的子组 `受影底座｜legs/leg`（`80158e91-98bd-4e56-baff-8d32c3baa172`），阴影层 `阴影｜skirt/lower_tier｜legs/leg`（`3b090e20-4d6b-404b-961d-397373b46339`）置于底座组正上方并启用 `inheritAlpha`。
   - **选色与混合模式**：采用 `#e0c0be`（`RGB(224, 192, 190)`）与 `multiply` 模式，叠乘亮部大腿肤色 `RGB(253, 227, 214)` 后得到 `RGB(222, 171, 159)`，与 `simplified-subject.png` 大腿裙影色一致，且自然加深腿部轮廓线稿。
   - **完整影层与偏移余量**：完整影层从大腿顶端上方（`y=598`）沿裙摆梯形外扩轮廓（`x=444..810`）连续覆盖至裙摆下缘下方约 19.5px 的平滑弧线（`y≈849..859`），横跨双腿间隙与双腿外侧（`outsideReceiverPixels = 51633`），通过 `[[0, 0], [-10, 0], [10, 0], [0, -10], [0, 12]]` 偏移复核。

---

## 2. 脸周及其他排除候选说明（`excluded`）

- **`character:hair/front_side_hair_right` / `character:hair/front_side_hair_left` 的外伸细发与下方卷尾**：外伸细发悬空于头部外侧；下方分叉卷尾（`y=272..356` 外侧支）位于 `face_base` 下颌轮廓线外侧，在 `simplified-subject.png` 中无落脸影，故不搬移到脸内。
- **`character:hair/side_hair_right`（`028`）与 `character:hair/side_hair_left`（`029`）**：图层深度在 `030 | face/face_base` 之后且整体位于脸颊与躯干外侧；对照 `simplified-subject.png`，脸部、双侧上臂与连衣裙上均无该部件投射的阴影。
- **`character:hair/bun_right`（`001`）、`character:hair/bun_left`（`002`）、`character:hair/back_hair`（`003`）**：分别位于头顶后方与角色最底层，不遮挡前向光源。
- **`character:face/face_base` -> `character:neck` / `character:body`**：对照 `simplified-subject.png`，锁骨结构线以上的整个颈部平面（`010 | neck` 及 `013 | body` 颈窝上缘）整体处于统一固有暗面 `RGB(223, 173, 159)`，无局部下巴投影分界线，原图层已完整保留该暗面。
- **`clothing:chest_bow`、`clothing:bodice`、`clothing:skirt/upper_tier`、`clothing:skirt/middle_tier`**：对照 `simplified-subject.png`，蝴蝶结与各层裙摆交界处仅按竖向褶皱分面着色，上臂内侧窄暗边为手臂体积固有暗，均无跨部件横向投影带。

---

## 3. 接收底色局部补画与原蒙版保持

- **局部去影补画**：检查接收面时发现 `007 | legs/leg_right/leg` 与 `008 | legs/leg_left/leg` 在裙摆遮挡的大腿内侧上段（`y=710..815`）残留了素体阶段临时白色连体衣（`009 | pelvis`）投下的纵向暗色旧影。仅对该局部内部肤色像素按同行亮部肤色 `RGB(253, 227, 214)` 平滑补齐，100% 保留原有 alpha 覆盖范围与腿部内侧 2px 轮廓线稿；其余图层未做底色擦除。
- **原穿戴蒙版保持**：工程原有的 4 个 `transparencymask`（`321ce33e-...`、`71abc6fc-...`、`88877396-...`、`0c854e7c-...`）归属、UUID、启用状态与像素均原样保留。

---

## 4. 原生检查与原尺寸复核观察

- 运行 `inspect.ts` 通过全部结构与原生渲染检查（`passed: true`，`warnings: []`）。
- 逐图复核 `inspection/overview.png`、`inspection/relation-000-review.png` 至 `relation-003-review.png`、原生输出目录中的 `full-paint.png`、`receiver.png`、`clip-offset-*.png`，以及原尺寸 1:1 拼图 `face-review.png`：
  - 静帧与各声明偏移下，所有阴影均严格裁切在 `face_base` 与 `legs/leg` 接收范围内，无画布外溢或隔离组漏色。
  - 刘海与左右前侧发在额角重叠处颜色平整无叠黑，眉眼五官清晰，前侧发在向内偏移时贴脸发束影自然显露且无下方卷尾伪影。
