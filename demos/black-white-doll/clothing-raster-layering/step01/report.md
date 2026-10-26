# clothing raster step01 — 衣服深度分层绘制报告（临时稿）

交付：`step01/clothing-depth.kra`（19 个普通绘画层，1086×1448，RGBA/U8/sRGB-elle-V2-srgbtrc.icc）。
上游同步：直接修改 `clothing-part-layering/occlusion.json`（逐 level 区域、深度、范围、连续分界、前后对象 + `layer` 字段）；`groups.json` 与 10 个 part SVG 未改（无新增拆层、无部件 ID/形状变化）。
临时脚本与中间数据：初版在 `agents/2026-10-25T23-56-13-731Z-clothing_raster_step01-qmeeDG/workspace/`（下称 W）；review-01 返修在 `agents/2026-10-26T02-08-18-213Z-clothing_raster_step01_repair-ROqgiC/workspace/`（下称 W2，由 W 复制后继续，返修前的 KRA、parts 与报告存档在 `W2/tmp/pre-repair/`）。

**review-01 返修（§9）**：R1 腰头下缘接缝线改为由 L11 单层承载的连续弧线，R2 隐藏衣尾 L9 重画为与 L12 下摆同色系的近白衣料。只改了 L9/L10/L11 三层，其余 16 层像素不变；层序、归属、拆分与 SVG 均未变。occlusion.json 中 L9/L10/L11 的像素数与重叠记录已同步。

## 1 输入与指纹

| 输入 | 用途 | 指纹 / 说明 |
|---|---|---|
| `../../clothing-part-layering/references/clothing.png` | 绘制/修复参考、可见像素来源 | sha256 记录于 `step01/input-manifest.json`，复核一致 |
| `clothing-part-layering/parts/<group>/<part>.svg` ×10 | 形状标准（rast.py 栅格化为 full/main 掩码） | 每片 `source_svg_sha256` 记录于 input-manifest，交付时复核全部一致（SVG 未改） |
| `clothing-part-layering/groups.json` | 归属与控制职责 | 只读；occlusion 中 10 个 part ID 均在其中 |
| `clothing-part-layering/occlusion.json` | 由后到前深度、levels | 按 levels 切层；本步已回写（见 §6） |
| `../../part-layering/references/simplified-subject.png` | 只用于判断与身体的穿插 | fit.py 求相似变换（scale 0.4025, tx 324, ty 174, err 6.05），只生成 `W/inspect/subject-with-part-edges.png` 对照，从未作为纹理来源 |

穿插判断（simplified-subject 对照）：裙身两侧外裙尖与前臂/手内侧相邻、衣身两侧缘与上臂相邻、肩带上端越过肩顶，这些都已在 occlusion.json 的 levels 中标注（skirt L1/L13、bodice L5、strap L3/L4）。组装中未发现新的穿插，不需要新增拆层。

## 2 方法

### 2.1 Krita 通道
- 使用私有 Krita GUI 实例：AppImage `~/.local/opt/krita/squashfs-root/usr/bin/krita --nosplash`，独立资源目录 `W/kr/gui/share/krita`，Xvfb `:6`，pid 在 `W/kr/gui/{krita,xvfb}.pid`（review-01 返修使用 W2 中同样配置的独立实例 `W2/kr/gui.sh`，Xvfb :6，仅对 Krita 子进程设置 DISPLAY/TMPDIR/XDG_*）。
- 任务脚本经 `sh W/kr/job.sh <script.py> [timeout]` 投递到该实例的 Python 插件队列，返回 JSON `{ok,result,error,start,end}`。
- 隔离环境只作用于 Krita 子进程，未改全局设置或用户插件；`--version` 不作为可用性依据，每次画笔/建档/重开都由实际 job 结果确认。
- 层像素读写使用 `Node.setPixelData / pixelData`（BGRA）。画笔使用 `View.setCurrentBrushPreset + Node.paintLine`。
- 建档用 `build_kra.py`：createDocument、按深度 addChildNode、删除默认 Background、`saveAs`。
- 重开校验用 `verify_kra.py`：openDocument，逐层读取类型、子节点、可见、不透明度、混合模式和像素 md5；并导出投影。

### 2.2 切层与控制图（prepare.py）
- 每片的 SVG full 形状按 occlusion.json levels 切成互斥的像素分区，并断言分区并集等于 full、无重叠。各分区如下。
  - **skirt_body**：L1 是两侧外轮廓内 7 px 的环绕窄条（两端 20 px 渐细）；L13 是两处外裙尖；L10 是其余。
  - **waistband**：L2 是两端 5 px 端条；L8 是位于可见上衣下摆曲线（从参考逐列读出暗色下摆线，中值平滑）上侧的上伸搭接；L11 是其余可见前腰头。
  - **straps**：L3/L4 是顶端约 7 px 的斜切端条；L6/L7 是其余带体与根部。
  - **bodice**：L5 是 y389–481 两侧 6 px 的腋下窄条；L9 是下摆曲线下侧、伸入腰头的衣尾；L12 是其余。
  - **knot**：L14 是 full 减去 main（隐藏回接）；L19 是 main（可见正面）。
  - **tails/loops**：各自为单层 15–18。
- 可见归属：参考 alpha>0 的像素归“该处最上层”的 slice。SVG 外 4 px 内的参考边缘按最近归属分配（8873 px）；更远的 1505 px 未分配（见 §7）。
- 控制图：红为本片 safe 可见区；黄为 hidden，加上与更上层遮挡物相邻的 band（可见但含遮挡物描边或混色，需要重画）；绿为其他。
- 输入 1：本片 safe 像素合成在 128 中性灰上，其余全灰。输入 2：控制图。两者按 bbox 外扩裁切，缩放到 1024² / 1024×1536 / 1536×1024。

### 2.3 生成（mcp__layering__image_generation，transparent，全部 hasAlpha=true）
共 28 次调用，全部返回成功，无拒绝。逐次记录（提示词文件、输入、savedPath、model、尺寸、sha256、备注）见 `step01/generation-records.json`，每片的配准与取用像素见 `step01/parts/<slug>/compose.json` 与 `reg-*.json`。

| 轮次 | 部件 | 原因 / 结论 |
|---|---|---|
| v1 ×10 | 全部 10 片 | 原尺寸检查：多数片在红/黄交界处画了收口线或接缝，黄色条带未画满；bodice 胸前留下淡的蝴蝶结印痕 |
| v2 ×10 | 全部 10 片 | 提示词强调黄色必须画满到黄/绿交界、红/黄交界不收口，bow 区不留印痕；作为各片主要整体来源 |
| p1, p2 | waistband、skirt_body、bodice | 对 v1/v2 仍为空或有接缝的窄隐藏带做局部放大补丁（×7.7–8.5）：waistband L8 上伸带、裙根被腰头遮住的弧形带、bodice L9 衣尾 |
| p3 | waistband | p2 把高光块一直拉到最上沿，与 p1/v1/v2 中“圆角高光块上方一条黑色窄条”的结构矛盾。对 L8 右半重做（×4.4），以 p1 左侧黑条为红色上下文；采用 |
| p3 | bodice（胸前 bow 区，×4.9） | **拒绝**：生成器重画并重新构图了整个衣身前片（配准 sx 1.85），褶线正好落在蝴蝶结轮廓上，反而加重印痕；未使用（`W/sources.json`）。bow 区改用 v2 结合 Krita 画笔修整（§2.5） |

### 2.4 配准与合成（compose.py，每片执行，整体需跑两遍）
- 每个生成结果按本片 safe 像素做缩放/平移配准（sx, sy, dx, dy；err 对比 identity）和逐通道线性色彩拟合，再按优先级取用到黄色需补区。
- 可见区一律叠回参考自身像素，不用原图像素替代遮挡补全。hidden 区像素全部来自生成或画笔。
- 合成结束时缺失（missing）均为 0。

| 部件 | need (hidden+band) | 取用像素（按优先级） | Krita 画笔改写像素 |
|---|---|---|---|
| skirt_body | 10180 (9398+782) | p2 5298, p1 4110, v1 4 | brush-1 8137 |
| waistband | 7330 (6640+690) | p3 3812, p1 3390 | brush-1 3739 |
| right_shoulder_strap | 478 (437+41) | v2 413 | brush-1 129, brush-2 444 |
| left_shoulder_strap | 421 (386+35) | v2 415 | brush-1 25, brush-2 420 |
| bodice | 22022 (19806+2216) | p2 3964, p1 3888, v2 13049, v1 152 | brush-1 13743, brush-2 623 |
| knot | 59 (59+0) | v2 13, v1 19 | brush-1 45 |
| right_tail | 225 (178+47) | v2 145, v1 22 | brush-1 145 |
| left_tail | 271 (218+53) | v2 206, v1 4 | brush-1 117 |
| right_loop | 221 (176+45) | v2 102, v1 19 | brush-1 164 |
| left_loop | 155 (111+44) | v2 94, v1 26 | brush-1 104 |

边缘处理规则（compose.py）：
- **轮廓收养/解混（adopt）**：上层片的抗锯齿外轮廓约有 1 px 落在本片 SVG 外、下层片 SVG 内。按 `参考 = Co·α + Cb·(1−α)` 解混后，把 α 部分收养到上层片，下层片该处换成补全的本片底色。收养阈值为 α≥0.15，或 α≥0.04 且 α·|ΔC|≥15（后者处理淡外圈仍可见的暗化）。
- **可见 band**：
  - 干净像素保留参考色（vref）。
  - 被遮挡物描边或混色污染的像素换成局部本片色 Cl（vmix）。Cl 的估计排除本片自身的暗描边。
  - 亮边光晕规则要求 lum > Cl+4 且 lum > 邻域最大本片亮度 + 1。
- **本片线稿保留**：band_lo 像素若比本片色暗 >8、且邻接下层比本片亮 >40，判为本片自身描边，不做去边色。
- **去邻色边（defringe）**：本片可见边缘上残留的邻片颜色，换成本片色。

### 2.5 Krita 画笔修整（brush.py，私有实例内真实笔触，结果写入 parts/<slug>/brush-N.png 并以 force 覆盖补全像素）
用到的预设：
- `b) Basic-1`：补色条与轮廓线；
- `k) Blender Blur`：alpha 锁定的接缝点涂；
- `k) Blender Basic`：alpha 锁定的拖拽混色；
- `b) Airbrush Soft`：大面积柔和阴影过渡（bodice、waistband 的 extra 笔触）。

| 部件 | 笔触（种类：条数） | 目的 |
|---|---|---|
| skirt_body brush-1 | fill 298, seam 49, blend 858 | 裙根弧形带：沿褶线方向延续、各补丁接缝混合；blend 用 'up' 方向从可见侧向上拖，使褶面明暗连续 |
| waistband brush-1 | fill 128, extra 53 | L8 上伸带补满、上沿描边，高光块上方黑条与圆角对齐 |
| straps brush-1 / brush-2 | fill 93/5, seam 5/6；extra 16/17（strap_strokes.py） | 生成的根部是无侧描边的平白块：按可见带面逐列延续带面色，再沿 SVG 轮廓补两侧描边直到根部 |
| bodice brush-1 | fill 329, edge 8, seam 467, extra 419 | bow 区去印痕（延续周围浅灰紫褶影与中央收褶）、L9 衣尾补满和下缘弧线 |
| bodice brush-2 | extra 18 | bow 区残余色阶的 Blender Basic 拖拽与 Basic-1 点补 |
| bow 五片 brush-1 | fill 15–23, seam 4–15 | 根部 / 结心回接补满，接缝混合 |

没有用颜色阈值填充代替绘制。阈值只用于判断哪些像素需要修，修补本身来自生成或 Krita 笔触。

## 3 图层表（KRA 由下到上 = occlusion 深度 1→19）

所有拆层都来自 occlusion.json 已有的 levels 标注，组装中**未新发现需要拆层的穿插**，也没有新增拆层。图层名为 `NN <完整 part ID> L<level>`。

| 序 | 图层名 | 原 part ID | 区域 / 范围（像素数，bbox x0,y0,x1,y1） | 最终深度 | 拆层原因（已有标注） |
|---|---|---|---|---|---|
| 01 | `01 pleated_skirt/skirt_body L1` | pleated_skirt/skirt_body | 两侧外轮廓内 7 px 环绕窄条；左 x168–379、右 x726–931，y763–1138（7385） | 1 | 裙身侧后环绕接续，位于腰侧/后腰之后 |
| 02 | `02 pleated_skirt/waistband L2` | pleated_skirt/waistband | 两端 5 px 端条；左 x377–387 y717–746，右 x716–729 y718–767（481） | 2 | 腰头侧后环绕接续 |
| 03 | `03 camisole/right_shoulder_strap L3` | camisole/right_shoulder_strap | 顶端约 7 px 斜切端条 x398–426 y243–260（219） | 3 | 越过右肩顶的回转，在肩后 |
| 04 | `04 camisole/left_shoulder_strap L4` | camisole/left_shoulder_strap | 顶端端条 x679–708 y243–260（248） | 4 | 越过左肩顶的回转，在肩后 |
| 05 | `05 camisole/bodice L5` | camisole/bodice | 腋下侧缘 6 px 窄条；左 x343–380、右 x726–759，y389–481（1367） | 5 | 衣身侧缘在上臂之后 |
| 06 | `06 camisole/right_shoulder_strap L6` | camisole/right_shoulder_strap | 可见带体及根部 x387–424 y252–394（2868；其中 424 被 L12 覆盖） | 6 | 前肩带，在肩前、荷叶领缘之后 |
| 07 | `07 camisole/left_shoulder_strap L7` | camisole/left_shoulder_strap | 可见带体及根部 x682–719 y252–394（2713；其中 398 被 L12 覆盖） | 7 | 同上 |
| 08 | `08 pleated_skirt/waistband L8` | pleated_skirt/waistband | 下摆曲线上侧的上伸搭接 x388–717 y701–724（6640，全部被 L12 覆盖） | 8 | 腰头上伸余量，藏在上衣可见下摆之后 |
| 09 | `09 camisole/bodice L9` | camisole/bodice | 下摆曲线下侧伸入腰头的衣尾 x391–715 y718–753（9234，含下缘轮廓外 138 px 的 SVG 覆盖率 AA；全部被 L11 覆盖，另有 84 在 L10 下） | 9 | 上衣衣尾在腰头之后 |
| 10 | `10 pleated_skirt/skirt_body L10` | pleated_skirt/skirt_body | 前裙面、裙根补全、前下摆 x166–931 y741–1270（282388；9886 被 L11 覆盖） | 10 | 裙身主体 |
| 11 | `11 pleated_skirt/waistband L11` | pleated_skirt/waistband | 可见前腰头 x375–727 y718–784（19809，全可见；含下缘暗线下半从 skirt_body 解混收养的 513 px） | 11 | 前腰头，在衣尾 L9 与裙根之前 |
| 12 | `12 camisole/bodice L12` | camisole/bodice | 可见衣身、荷叶领缘、蓬松下摆与胸前补全 x342–760 y361–724（129192） | 12 | 衣身主体，在肩带根与腰头上伸之前，在蝴蝶结之后 |
| 13 | `13 pleated_skirt/skirt_body L13` | pleated_skirt/skirt_body | 两处外裙尖；左 x164–227 y1141–1184，右 x875–934 y1137–1198（2915） | 13 | 外裙尖在前臂内侧之前 |
| 14 | `14 chest_bow/knot L14` | chest_bow/knot | 结心两侧隐藏回接；左 x542–547、右 x562–567，y442–460（59，全被覆盖） | 14 | 结心回接在尾/环根之后 |
| 15 | `15 chest_bow/right_tail L15` | chest_bow/right_tail | x505–550 y447–598（3622） | 15 | 单层 |
| 16 | `16 chest_bow/left_tail L16` | chest_bow/left_tail | x558–606 y446–599（3782） | 16 | 单层 |
| 17 | `17 chest_bow/right_loop L17` | chest_bow/right_loop | x477–556 y439–497（2292） | 17 | 单层 |
| 18 | `18 chest_bow/left_loop L18` | chest_bow/left_loop | x557–632 y440–497（2205） | 18 | 单层 |
| 19 | `19 chest_bow/knot L19` | chest_bow/knot | 可见包束正面 x543–565 y439–462（420） | 19 | 结心正面在最前 |

逐层上下覆盖关系与兄弟分界见 `W/tmp/relations.json`，已写进 occlusion.json 的 region 文字。

## 4 solo 检查（原尺寸 + 放大）

证据都从重开后的 KRA 逐层读出（`W/tmp/kra/reopen/layer-NN.raw`），放在 `step01/inspect/`：

| 证据 | 内容 |
|---|---|
| `layers-solo-from-reopened-kra.png` | 19 层逐层单独显示（按各自 bbox 裁切、标注层名） |
| `solo-skirt.png`, `solo-bodice.png`, `solo-straps.png`(×3), `solo-bow.png`(×4) | 各片完整单显与参考对照 |
| `bodice-under-bow-x3.png` | 蝴蝶结下方衣身补全（×3） |
| `zoom-hem-waistband-x3.png` | 下摆 / 腰头 / 裙根交界 |
| `zoom-strap-roots-x4.png` | 肩带根部（实际为 ×3） |
| `zoom-bow-composite-x4.png` | 蝴蝶结合成轮廓 |

结论：
- **轮廓缺口**：各层补全区补满到 SVG 外轮廓，missing 全为 0；bow 五片外轮廓连续，无断线或缺口。
- **错位**：补丁配准后接缝处褶线、高光块、肩带两侧描边对齐。多轮返修已处理：
  - 肩带根部的淡灰横线：Cl 被本片描边拉暗，修正 Cl 估计和亮边规则；
  - bodice solo 上的点状蝴蝶结轮廓痕：淡 AA 收养阈值；
  - right_tail 右缘虚线化描边：本片线稿保留规则。
- **画风差异**：补全区为同一种低对比赛璐璐平涂。bodice 胸前 bow 区为平整白布，延续周围褶影，solo 下无蝴蝶结印痕（保留的投影见 §7）。

## 5 合成对照与重开验证

### 5.1 重开验证（verify_kra.py，在私有 Krita 实例中 openDocument）
- problems = []。尺寸 1086×1448，颜色 RGBA / U8 / sRGB-elle-V2-srgbtrc.icc。
- 根节点下恰好 19 层，名称和顺序与表 §3 一致；无 Background。
- 每层都是 `paintlayer`，子节点 0（无透明蒙版、无组、无子节点），可见，opacity 255，混合 normal。
- 每层像素 md5 与建档计划一致。
- KRA 在建档后和每批修改后都保存过；初版保存于 09:47:59，09:48:01 重开校验通过。
- review-01 返修版（W2/build_kra.py）保存于 2026-10-26 11:19:29（sha256 df871e2f…），11:19:31 重开校验 problems = []，19 层名称、顺序、类型、属性同上，md5 与建档计划一致。与返修前相比只有 L9（c29298dc5e）、L10（c341c0898b）、L11（d8cde42caa）的 md5 改变。

### 5.2 合成对照（Krita 投影 vs 参考，`inspect/composite-krita.png`、`inspect/composite-vs-reference.png`）

| 指标 | 值（review-01 返修后，括号内为返修前） |
|---|---|
| 参考非透明像素 / 合成非透明像素 | 440279 / 438877 |
| 平均 RGB 差（白底） | 0.89（0.90） |
| RGB 差 > 8 / > 32 的像素 | 1104 / 118（1403 / 121） |
| alpha 差 > 8 的像素 | 1049 |
| 合成超出参考 | 103 |
| 参考未被覆盖 | 1505（即 SVG 外 > 4 px 的未分配边缘，见 §7） |
| 最大 RGB 差 | 233（个别蝴蝶结外缘 AA 点） |

目视结论：合成与参考一致，没有移动或缩放参考；差异集中在 1 px 级抗锯齿外缘，留给 step 2 细化。PSNR 不作为判据。

## 6 上游文件更新

- **`clothing-part-layering/occlusion.json`**（原件备份 `W/tmp/occlusion.orig.json`，由 `W/tmp/occl_update.py` 改写，indent=2，保留末尾换行）：
  - version 3、direction、sourceHash、layers 顺序与每片 level 数值均未改。
  - 7 个多层片（skirt_body、waistband、两肩带、bodice、knot）的每个 level：`region` 改写为实际区域、像素数、bbox、深度、连续分界（与兄弟 level 的分界坐标）和前后对象（覆盖像素数），并新增 `layer` 字段指向 KRA 图层名。
  - 4 个单层片（tails/loops）新增 `layer` 字段，`note` 追加 raster 说明及边缘收养说明（SVG 比可见轮廓约小 1 px，外圈 AA 像素按解混 α 收养进本片；属归属调整，不是深度变化）。
  - 多层片 `note` 追加：“raster step01 已按 levels 在 clothing-depth.kra 中切成 N 个普通绘画层（均为已有标注的深度分片，未新增拆层）…”。
- **`groups.json`、`parts/*.svg`、`preview.svg`**：未改。原因是没有新增拆层，节点、部件 ID 与形状都与当前 KRA 一致，所以受影响预览和来源指纹无需更新。
- **sourceHash**（918b9010…）：与 groups.json / preview.svg / clothing.png / occlusion/candidate.svg 的 sha256 都不匹配，无法确认计算基准。因其对应的形状与分组输入均未变化，保持原值未动。
- **一致性检查**（交付时执行）：
  - occlusion.json 与 groups.json 均可解析；
  - occlusion 的 10 个 part ID 全部在 groups.json 中，对应 10 个 SVG 均存在且 sha256 与 input-manifest 一致；
  - 19 个 `layer` 引用与 KRA 图层名一一对应；
  - KRA 图层顺序与 level 深度顺序一致。
- **review-01 返修同步**（`W2/tmp/occl_update_r1.py`，返修前原件备份 `W2/tmp/occlusion.pre-repair01.json`，数值取自重开 KRA 的 `W2/tmp/relations.json`）：
  - 只改 3 个 region 文字中的 10 处短语，version、direction、sourceHash、layers 顺序、level 数值、`layer` 引用和 note 不变；
  - skirt_body level 10：与 L11 重叠 9375 → 9886 px，与 L9 重叠 44 → 84 px；补记“缝接处的下沿暗线整条由 waistband level 11 承载，本层不留线的残段”；
  - waistband level 11：19298 → 19809 px，范围 y718–783 → y718–784，与 L9 重叠 9096 → 9234 px，与 L10 重叠 9375 → 9886 px；补记“下沿暗线连续、整条属于本层，褶线顶与线相接处的暗像素按解混 α 收养进本层”；
  - bodice level 9：9096 → 9234 px（范围 x391–715、y718–753 不变），与 L10 重叠 44 → 84 px；补记“与上方下摆同为近白底色、浅灰紫低对比褶影，下缘沿 SVG 轮廓为连续弧线描边”；
  - groups.json、SVG、preview.svg 不需改动：层序、归属、部件 ID 与形状均未变。occlusion.json 新 sha256 为 fcc49dcd…；
  - 返修后复核（`W2/tmp/upcheck.py`）problems = []：两个 JSON 可解析，10 个 part ID 均在 groups.json 中，SVG sha256 与 input-manifest 一致，19 个 `layer` 引用按 level 1→19 与重开 KRA 的层名和顺序完全一致。

## 7 偏差、形状超出/缺失与归属/层级冲突

### 7.1 形状超出 / 缺失
- **形状超出参考**（SVG 内、参考透明、且不被其他衣片遮挡）：
  - camisole/right_shoulder_strap 33 px（顶端低 alpha 边缘斑点处）；
  - camisole/bodice 44 px；
  - pleated_skirt/skirt_body 25 px；
  - left_shoulder_strap 1 px；
  - 其余 0。
  - 这些按 SVG 形状保留，画为本片衣料。合成中超出参考共 103 px。
- **参考边缘缺失**：
  - SVG 外 ≤4 px 的参考边缘 8873 px 已就近分配给对应片；
  - 距所有 SVG >4 px 的 1505 px 未分配，主要是外轮廓更远处的淡 AA 和噪点，所以合成中“参考未被覆盖”= 1505；
  - 其中裙身左外轮廓 x275–293、y893–924 一段：参考描边与 AA 有 54 px 落在 skirt_body SVG 外 >4 px，未分配。合成中这段外轮廓少了最外约 1 px 的淡 AA，边缘略呈点状锯齿；主描边仍连续。留给 step 2 细化。
- 各片 hidden 补全区都补满（missing 0），**没有补全缺失**。

### 7.2 归属 / 层级冲突（均为归属微调，无深度变化、无新增拆层）
- **bow 五片 SVG 比可见轮廓约小 1 px**：外圈抗锯齿描边落在 bodice SVG 内。已按解混 α 从 bodice 收养进 bow 层：
  - knot 28 px；
  - right_tail 312 px；
  - left_tail 329 px；
  - right_loop 172 px；
  - left_loop 131 px。
  - bodice 该处换成补全白布。已写入 occlusion.json 对应 note。
- **bodice 荷叶边描边落在肩带根部 SVG 内**：收养到 bodice 33 px（右肩带 20、左肩带 13）。
- **waistband 下沿描边**：初版从 skirt_body 收养 2 px；review-01 R1 后，下沿暗线的下半（SVG 外 1–2 行）按解混 α 整条收养进 L11，共 513 px（§9.1）。
- **knot L14 与 waistband L8 / bodice L9 的相互覆盖**：
  - L8 和 L9 分别被 L12 和 L11 完全覆盖，合成中不可见；
  - L14 被 L15–L19 和 L12 完全覆盖；
  - L9 另有 84 px 落在 L10 下方（裙根补全区搭接，返修前 44）。
  - 这些都符合已标注的深度。

### 7.3 绘制偏差（已目视确认，留作记录）
- **skirt_body**：裙根 y≈777–781 处的暗线是参考中裙根可见像素自带的线条，保留在裙层上。裙根两端外缘的锯齿边也来自参考，未改。
- **bodice**：
  - 蝴蝶结在可见衣料上的投影阴影是参考可见像素，保留在 L12 上（在 solo 中可见浅灰阴影）；
  - L9 衣尾初版整体偏灰（≈193）、斑驳，已在 review-01 R2 重画（§9.2）。
- **left_shoulder_strap**：根部描边有 1–2 px 的折点。
- **waistband**：
  - 高光块 x657–667 有一处小缺口；
  - y717.5 处有 SVG 自带的台阶。
- **right_shoulder_strap**：顶端有少量低 alpha 边缘斑点。
- **参考噪点**：参考中 alpha 1–2 的孤立噪点按归属落在 L12/L5/L11/L2 上（`W/tmp/speck.py` 已确认为参考噪点），未删除。
- **蝴蝶结外缘**：有个别 RGB 差 >32 的点，属 1 px AA，留给 step 2。
- **生成拒绝**：bodice p3 被拒（见 §2.3）。生成器没有拒绝或失败的调用。

## 8 证据与记录文件索引

- `step01/clothing-depth.kra`：交付 KRA。
- `step01/generation-records.json`：28 次生成的完整记录。
- `step01/input-manifest.json`：输入指纹、切层像素与 bbox、每片 shape/visible/safe/band/hidden 统计、下摆曲线采样、边缘分配。
- `step01/parts/<slug>/`：
  - control.png, input-gray.png, prompt-v*/p*.txt, generated-*.png；
  - patch-N-*（输入、控制、区域）；
  - reg-*.json（配准）；
  - brush-N.png/.json/-plan.json/-strokes.json（Krita 笔触计划与结果）；
  - work.png（该片完整绘制层）、compose.json；
  - slice-L*.png、shape/visible/safe/hidden/band/missing 掩码。
- `step01/inspect/`：§4 / §5 所列证据 PNG。
- `W/`：全部临时脚本，包括：
  - prepare.py、prompts.py、patch.py、record_gen.py、compose.py、brush.py、strap_strokes.py；
  - build_kra.py、verify_kra.py；
  - tmp/evidence.py、tmp/relations.py、tmp/occl_update.py 等；
  - 以及 tmp/kra/verify.json 与 tmp/relations.json。
- `W2/`（review-01 返修）：
  - compose.py（R1 接缝规则）、edgebrush.py（R1 Krita 下缘笔触）、l9brush.py（R2 Krita 重画 L9）；
  - tmp/repair_ev.py（返修前后对照图）、tmp/seamcol.py、tmp/seamcol11.py、tmp/edgefit.py、tmp/l11mono.py、tmp/layerdiff.py、tmp/l9body.py、tmp/prebox.py、tmp/prechk.py、tmp/l11where.py、tmp/rboxes.py（复核量化）；
  - tmp/occl_update_r1.py、tmp/upcheck.py（上游同步与一致性复核）；
  - tmp/kra/verify.json、tmp/relations.json（返修后重开 KRA 的结果）；
  - tmp/pre-repair/（返修前 KRA、parts、报告与 inspect 存档）。

## 9 review-01 返修记录

依据 `step01/review-01.md`。对照参考 `../../clothing-part-layering/references/clothing.png` 的腰头/裙根接缝与上衣下摆，定位原因后在当前工程上继续修改。已合格的绘画、补全与配准都保留：只有 L9、L10、L11 三层像素有变化，其余 16 层逐像素不变（`W2/tmp/layerdiff.py`）。可见区仍是参考自身像素，未移动或缩放参考；未新增阴影、AO 或投影；没有用全层模糊或阈值处理代替绘制。层序、归属、拆分和 SVG 都不需要调整，部件与图层的对应关系同 §3。

### 9.1 R1 腰头下缘 / 裙根接缝（L11、L10，框 [376,764,352,30]）

**原因**：腰头下缘是“暗线压在暗布上”（线约 25，腰头约 45，裙约 60）。初版轮廓收养与 contour 判定的对比阈值是按“亮布上的暗线”设计的，所以：
- SVG 外那半条线有的列被收养进 L11，有的列留在 L10，线被切成短段；
- 裙褶线接到缝线的位置，L11 下缘上缩成台阶或鼓出小疙瘩；
- 右端 x700–707 有错位的黑点。

**修法**：
1. **compose.py 接缝规则**（`SEAMS`，框 x376–728 y750–798，只作用于最近归属为 L11 的像素）：
   - 比本片和下层两种局部底色都暗的 band 像素，判为本片线稿；
   - 线在 SVG 外的下半段 AA 按解混 α 整条收养进 L11，从 skirt_body 共收养 513 px；
   - L10 在被收养的线下，换成裙身本色（缝线下第 4 行的裙色，即解混用色）；
   - 裙身自己接到缝线的褶线顶保留参考像素。
2. **edgebrush.py edge-1**：私有 Krita 实例 `b) Basic-1`，在 4× 裁切上画真实笔触。
   - 逐列中值检验找出下缘偏离平滑弧线的列；
   - paint 3 段：x405–408、593–596、705–707；
   - erase 5 段：x408–411、524–526、591–594、656–660、701–703；
   - 改写 51 px（`parts/pleated_skirt__waistband/edge-1.*`）。
3. **edgebrush.py edge-2**：处理褶线顶与缝线相接处的缺口（底行有空洞、下面有孤岛，列覆盖和看起来正常，中值检验漏掉）。
   - 范围 x456–460、x703–704；
   - 先 erase 掉目标线以下的孤岛，再沿两侧插值的目标线 paint；
   - 只改这些列本身，改写 19 px（`edge-2.*`）。
4. **L10 在笔触半覆盖处**：按 L11 剩余覆盖率解混出裙身本色，保证合成仍等于参考。

**结果**（重开 KRA 的合成和逐层数据）：

| 检查 | 返修前 | 返修后 |
|---|---|---|
| 逐列接缝最暗值与参考之差 > 8 的列（x376–727，`seamcol.py`） | 79 / 352 | **0 / 352**（差值范围 −2…+4，平均 \|d\| 0.09） |
| 只显 L11（衬在裙身本色上）时线比参考浅 > 8 的列（`seamcol11.py`） | — | **0 / 349** |
| R1 框内合成 RGB 差 > 8 / > 32 | 300 / 3 | **3 / 0** |
| L11 下缘与平滑弧线（6 次稳健拟合）的残差 | — | 中位 0.17 px，最大 0.89 px |

- **R1 框剩余 3 px**：x379 y764–765、x376 y767，是左端转角的 AA，返修前后数值相同，属于评审认可的腰头两端外形。
- **L11 下缘残差 >0.5 px 的列**：x431–435、x507–514，跟随参考线条自身的粗细变化，不是台阶。
- **L11 底部 alpha 非单调的列**：只有 4 列，都在两端转角（x378–379、x724–725），属于评审要求保留的两端外形。
- **L10“线残段”检测剩 2 列**：x526 y784、x656 y780。这是裙褶线顶落在 L11 外缘 AA（α 15/62）下，L10 像素等于参考或解混本色；它们属于褶线，不是接缝线残片。
- **改动位置**：
  - L11 改 716 px，都在底行附近 k = 0…2；另有 x380–381 y751–761 的 4 px，从去邻色换回参考自身色，与参考相同；
  - L10 改 474 px，都在线下 k = 1…2。
- **保留**：
  - L11 平整亮面与高光块未动；
  - L10 褶线、裙根补全区和褶面明暗保留；
  - L2 端条 0 改动。
- **隐藏上层核对**（L1–L10，隐藏 L11 及以上）：裙根补全区没有暗线残片，褶线连续接入补全区。

**证据**：
- `inspect/repair01-R1-seam-left-x4.png`、`repair01-R1-seam-right-x4.png`：参考 / 返修前后全叠加 / L11 单显 / L10 单显 / 隐藏上层；
- `inspect/zoom-hem-waistband-x3.png`、`solo-skirt.png`、`composite-vs-reference.png`。

### 9.2 R2 隐藏衣尾 L9（框 [387,714,332,44]）

**原因**：L9 由 p1/p2 补丁和 bodice brush-1 填出，存在三处问题：
- 底色偏灰（约 193/191/197），斑驳，夹着生硬的深灰紫块；
- 下缘描边是形状阈值的台阶；
- 与 L12 下摆（约 238）不像同一块布。

**修法**：`l9brush.py brush-3`，私有 Krita 实例 `b) Basic-1`，4× 裁切，共 672 条 paintLine，覆盖 L9 切片全部 9096 px。
- **底色**：40 条横向笔触，取 L12 下摆本身的亮色 (245,245,247)。
- **褶影**：6 道楔形，共 241 条细笔触，颜色为下摆褶影的浅灰紫 (222,219,230)。每道从下摆线下的褶纹落点扇形收向尖端，方向延续上方下摆的褶纹：中线左侧向右下，右侧向左下。
- **描边**：3 条笔触，颜色为本片描边色 (90,86,100)，沿 SVG 亚像素下缘弧线和两侧短边。
- **edge-1**：轮廓上 364 px 用 SVG 覆盖率作 alpha，其中 138 px 在形状外，使下缘成为平滑的抗锯齿弧线。adopt=false，不从 L10/L11 取任何像素。

**结果**：

| 检查（`W2/tmp/prechk.py`、`l9body.py`） | 返修前 | 返修后 | L12 下摆参照 |
|---|---|---|---|
| L9 整层均值 RGB（含下缘描边带） | 193.4/191.4/197.3 | 226.0/225.2/229.6 | — |
| L9 衣身均值 RGB（不含描边带，7969 px） | 203.0/201.4/206.3 | **241.6/241.1/244.5** | 232.2/229.9/237.2 |
| 衣身亮度标准差 | 17.6（整层 36.4） | **7.6** | 12.2 |
| 衣身亮度 < 200 的像素 | 1952 | **0** | — |

- **范围**：inclusive bbox x391–714、y718–752，在规定范围 x391–715、y718–753 之内。
- **与 L12 的衔接**：衔接线不变（兄弟分界 323 px，x392–714 y718–724），L12、L5 均 0 改动。
- **深度**：仍是 level 9，在 L10、L11 之下；被 L11 全部覆盖（9234 px），与 L10 搭接 84 px。
- **合成**：R2 框内合成 RGB 差 > 8 仍为 15 px，返修前后相同，来自下摆线与腰头上沿交界处 1 px 的 AA（L12/L11 上未改动的像素）；因为 L9 被 L11 完全盖住，合成不受影响。
- **隐藏上层核对**：
  - 只隐藏 L11 时，L9 衣尾接在 L12 下摆下方，同为近白低对比布料；
  - L1–L10 视图中，衣尾下缘是连续弧线，没有台阶和深灰块。

**证据**：
- `inspect/repair01-R2-L9-left-x5.png`、`repair01-R2-L9-right-x5.png`：参考 / 返修前后 L5+L9+L12 / L9 单显 / SVG 覆盖率；
- `inspect/repair01-R2-hidden-views-x2.png`：返修前后 L1–L10、隐藏 L11、全部叠加、参考；
- `inspect/solo-bodice.png`。

### 9.3 不阻塞项与重开核对
- **评审 §3 列出的不阻塞观察均未改动**（L12 蝴蝶结投影、右肩带斑点、裙左外缘、蝴蝶结 AA、L13/L1/L5 描边、肩带根部折点）。对应层逐像素不变。
- **KRA**：保存后在私有 Krita 实例中重开（§5.1），problems = []。19 层名称和顺序与 §3 一致，均为可见、opacity 255、normal、无子节点的普通绘画层，md5 与建档计划一致。
- **验收 PNG**：从重开 KRA 重新导出了以下文件：
  - `composite-krita.png`、`composite-vs-reference.png`、`layers-solo-from-reopened-kra.png`；
  - `solo-skirt.png`、`solo-bodice.png`、`zoom-hem-waistband-x3.png`；
  - repair01-* 对照图。

  其余 inspect 图对应的层没有变化，保持原样。
- **上游**：occlusion.json 的 L9/L10/L11 记录已同步（§6），一致性复核 problems = []。
