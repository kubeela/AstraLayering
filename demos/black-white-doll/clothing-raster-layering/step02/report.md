# clothing raster step02 — 衣服边缘柔化与去锯齿报告

交付：`step02/clothing-soft-edges.kra`（19 个普通绘画层，1086×1448，RGBA/U8/sRGB-elle-V2-srgbtrc.icc），在 `step01/clothing-depth.kra` 基础上首次另存为新文件，step01 未改动。
- step02 KRA：sha256 `4fd52d64df48f5f937f60f0626b06154ea5726dafc4386b2ade528cfe6a48bb7`，3 584 533 字节，由 Krita 保存后重新打开核对。
- step01 KRA：sha256 `df871e2f3df127c522f4d999730709dfe9833634b3f4d27245f0040dd825983a`，交付时复核未变。
- 临时脚本与中间数据：`agents/2026-10-26T03-42-59-610Z-clothing_raster_step02-0dgtFo/workspace/`（下称 W3，位于 `clothing-raster-layering/` 下）。
- 上游 `clothing-part-layering/` 下的 `references/clothing.png`、`groups.json`、`occlusion.json` 与 10 个 part SVG 在本步均未改。
- 图层数、名称、顺序、归属、深度与 step01 完全一致，无新增拆层、无蒙版、无子节点。

结论：全部 19 层逐层检查并处理完毕，**没有阻塞验收的未解决问题**。§7 列出的是参考原有内容或 step01 继承的、按任务要求保留的残余项，每项都已说明保留理由。

## 1 输入与指纹

| 输入 | 用途 | 指纹 / 说明 |
|---|---|---|
| `step01/clothing-depth.kra` | 起点工程 | sha256 `df871e2f…5983a`，本步前后一致（只读） |
| `step01/report.md` | 层表、已知偏差与不可重做的决定 | 已读，沿用其层名、深度和归属 |
| `../../clothing-part-layering/references/clothing.png` | 纯衣服参考（唯一的细节依据） | sha256 `96feb3b3b647d6b404b187cb852eba6be275170b1e12eeedf579b0253df6420f` |
| `clothing-part-layering/groups.json` | 部件职责 | sha256 `ac205eeee859094b61aff0794f2e855af61156b2475d591bda1629695f30c1f2`，只读 |
| `clothing-part-layering/occlusion.json` | 深度分片 | sha256 `fcc49dcd5ef1819488c70b1abdd406e3c9dfa7531eca1d87ef7d4b54f9af3e5b`，只读 |
| `clothing-part-layering/parts/` | 结构依据 | 只读，未改 |

原穿衣角色图仅用于确认穿插关系；没有把参考或角色图的像素粘贴进任何图层（参考只用于比较、取色定位和度量）。

## 2 方法

### 2.1 Krita 通道（私有实例，隔离环境只作用于 Krita 子进程）
- 启动脚本 `W3/kr/gui.sh`：独立 Xvfb（`-displayfd`）、`TMPDIR`、`XDG_CONFIG_HOME`、`XDG_DATA_HOME`、`XDG_RUNTIME_DIR`、`--resource-location W3/kr/gui/share/krita`，以及 AppImage 解包后的 `PYTHONHOME/PYTHONPATH`，这些变量只设在 Krita 子进程，没有改当前 agent 的 HOME、登录环境、用户插件或全局 Krita 设置。
- 插件五项分开核对：
  1. 发现：`W3/kr/gui/share/krita/pykrita/astra_task(.desktop)` 存在于私有资源目录。
  2. 启用：实例启动后写出 `kr/gui/ready.json`（Krita 5.3.4.1），插件已加载。
  3. 导入/执行：每个任务经 `sh kr/job.sh script.py [timeout]` 投递，返回 `{ok,result,error}`，全部 `ok:true`；`--version` 不作为可用性依据。
  4. 保存：用 `Document.saveAs` 另存为 `step02/clothing-soft-edges.kra`，之后每批修改后都保存。
  5. 重开：`openDocument` 读回逐层像素，与最后一批脚本输出逐字节比较，差异 0（§5.5）。
- 本步结束时该实例的 Krita 与 Xvfb 均已停止；Krita 自动生成的 `clothing-soft-edges.kra~` 备份在停止后删除。

### 2.2 笔触流程（所有像素修改都是 Krita 内的真实笔触）
1. 从 KRA 导出的层数据中裁出局部，4× 最近邻放大，写入临时 Krita 文档的绘画层（`setPixelData`）。
2. 选 Krita 预设（`b) Basic-1` 画笔、`a) Eraser Soft` 柔边橡皮、`a) Eraser Small`），笔径按 4× 设置，设置不透明度、前景色（`ManagedColor`）与混合模式（`normal`/`erase`）。
3. 用 `Node.paintLine` 逐段落笔，读回 `pixelData`，以预乘 alpha 做 4×4 盒式平均缩回 1×。
4. 只把落在允许蒙版（边缘过渡带或指定像素）内的结果提交回目标层，蒙版外像素保持不变。
5. 提交后用脚本计算合成变化，确认没有越界。

脚本只负责定位、规划笔迹和提交；没有任何全层模糊、全局羽化、阈值批量改写或从参考粘贴像素。

### 2.3 一类需要说明的脚本操作：归属转移（批 4a）
批 4a 把 31 个像素从层 X 搬到层 Y 并将 X 的该像素清零。这些像素处在两个互斥分片逐像素交错的位置（例如 L10/L1 的接缝），搬动后合成逐字节不变，只是把交错的归属理顺，使后续软边笔触能连续进行。它不是画笔操作，此处如实标注。

### 2.4 过渡带处理方式（`do_cut`，批 3 和批 4b 使用）
对上下相邻、互斥的分片 U（上）与 D（下）：
1. 沿 U/D 的分界点追踪、平滑得到分界曲线（σ≈2.5 px，RDP 简化）。
2. 在 D 层 U 之下约 4.2 px 的补全带内，用从 U 取样的颜色以 `Basic-1` 画笔铺色，使 D 在软边之下有连续的衣料。
3. 用 `Eraser Soft`（6 px 笔径，沿分界曲线偏入 U 约 0.6 px）把 U 的硬切边擦成 2–3 px 的 alpha 渐变。
4. 擦后合成与参考的残差超过 5 的位置，用 U 原色在 D 上补点。
5. 提交蒙版限定在合成内部（5×5 腐蚀后的内部），不碰外轮廓。

渐变宽度由原图对应分界两侧的像素分布决定（不同位置分界曲线的曲率、被擦宽度不同），没有一刀切的统一羽化。

## 3 批次记录

每批之后都用脚本比较改前改后的合成：批 3/4b 的分界软化合成变化 ≤11 级，批 4a、4c、4d、4e 合成不变或仅限被修像素；最终合成对参考的最大 RGB 差 36 级（step01 为 233）。

| 批 | 内容 | 方法 | 要点 |
|---|---|---|---|
| 0 | 另存为 | Krita `saveAs` | 首次将 step01 工程另存为 `step02/clothing-soft-edges.kra`，step01 未覆盖 |
| 1 | 外缘异色/多余残点 | `Eraser`（1.3 px，107 笔） | 合成 alpha 比参考多出 >40 的像素，按各层多出的 alpha 比例擦除 |
| 2 | 逐像素 AA 与接缝线 | `Basic-1` 逐点落笔 | 肩带根部、结心两侧线、蝴蝶结外缘 AA、腰头 y723 线、L10 隐藏端、L1 外缘 AA |
| 3 | 六处上下覆盖分界软化 | `do_cut` | L10/L1、L13/L10、L12/L5、L11/L2、L6/L3、L7/L4（表见下） |
| 4a | 31 个像素归属转移 | 脚本转移（§2.3） | 合成不变 |
| 4b | L12/L5 腋下尖端处理 | `do_cut`（限定 4 个区域，er=3） | 腋下尖端处的折线避免被抹糊 |
| 4c | 孔洞与缺口填补 | `Basic-1`（共 6 + 26 笔） | L1 三处针孔 6 笔；L2 十三处缺口像素 26 笔，色取同层邻域 |
| 4d | 孤立弱 alpha 残点与暗点 | `Eraser Small` + `Basic-1` | 擦除 ≤8 像素、alpha ≤8 的碎点；修复 L2 两处原有暗点 |
| 4e | L5 针孔 | `Basic-1` 2 笔，色 (171,166,178) | 修复 (726,397) 的 1 像素孔，合成差 0 |

批 3 六处分界的结果（终稿；overlap = 上下两层 alpha ≥128 同时存在的像素数，ramp = U alpha 40–249 且 D 不透明的渐变像素数；step01 均为 0/0，即硬切）：

| U / D | 位置 | overlap | ramp |
|---|---|---|---|
| L10 / L1 | 裙身主体与侧后环绕条 | 2986 | 1427 |
| L13 / L10 | 外裙尖与裙身 | 530 | 262 |
| L12 / L5 | 衣身与腋下侧缘 | 679 | 301 |
| L11 / L2 | 前腰头与侧后端条 | 246 | 83 |
| L6 / L3 | 右肩带前段与肩后段 | 32 | 12 |
| L7 / L4 | 左肩带前段与肩后段 | 41 | 16 |

## 4 逐层问题、处理、证据

“改动像素”为 step01 → step02 该层 RGBA 有任何变化的像素数；其中大部分 L1/L2/L5 的增量是 D 层在上层之下的补全带，被上层覆盖，合成看不到。每层 solo（独显）、隐藏上层、全叠加和参考对照见 `step02/inspect/layer-NN.png`（2×2：参考 / 全层合成 / L1..Lk 隐藏上方层 / 单层独显绿底；放大 1–8×，按层大小取最大整数倍）。

| 层 | 发现的问题 | 处理 | 改动像素 | 证据 | 残余 |
|---|---|---|---|---|---|
| 01 skirt_body L1 | 外缘阶梯锯齿；与 L10 的硬切接缝；3 处针孔；隐藏端不规则 | 批 2 逐点 AA 笔触；批 3 对 L10/L1 做补全带 + 柔边橡皮渐变；批 4c 填 3 个针孔（(726,770)、(921,1128)、(175,1132)）；批 4a 归属转移 | 4532（alpha 变化 4504，主要是 L10 之下的补全带） | `layer-01.png`、`roi-skirt-side-*`、`roi-skirt-tip-*` | 隐藏端（被 L10/L11 覆盖处）的个别不规则保留；alpha ≤5 的参考光晕尾巴保留 |
| 02 waistband L2 | 侧后端条隐藏延伸参差；(382–383,741–745) 与 (720–721,741–745) 缺口；2 处暗点；与 L11 的硬切 | 批 3 的 L11/L2 分界渐变（`endtrim`=2.5 并补洞）；批 4c 缺口 26 笔；批 4d 修复两处暗点 | 313 | `layer-02.png`、`roi-waistband-left/right.png` | (724,763–766) 的分离小片；y717.5 的 SVG 阶梯“耳”；(383,744) 一个 alpha=114 的隐藏 AA 像素，均为上游/step01 内容，保留 |
| 03 right_shoulder_strap L3 | 肩后端条与前段的硬切 | 批 3 的 L6/L3 分界渐变 | 64 | `layer-03.png` | 无 |
| 04 left_shoulder_strap L4 | 同上 | 批 3 的 L7/L4 分界渐变 | 61 | `layer-04.png` | 无 |
| 05 bodice L5 | 腋下侧缘与 L12 的硬切；尖刺（26 → 7）；(726,397) 针孔；归属交错 | 批 3 的 L12/L5 分界渐变；批 4b 腋下尖端处理；批 4e 针孔 2 笔；批 4a 归属转移 | 1052 | `layer-05.png`、`roi-armpit-left/right.png` | 剩 7 个单像素尖：(379,390)、(381,390)、(726,394)、(727,395)、(348,477)、(754,479)、(352,480)，位于腋下侧缘的极细末端，擦掉会改变外轮廓，保留 |
| 06 right_shoulder_strap L6 | 带根与 L12 接缝处个别异色点；肩带/下摆交接的 1 px 小刺 | 批 1–3：擦除异色点；带根逐点笔触；L6/L3 分界渐变 | 51 | `layer-06.png`、`roi-strap-right-top/root.png`、`roi-hem-junction.png` | L12/L6 交接处的 1 px 参考小刺保留 |
| 07 left_shoulder_strap L7 | 同 L6（左侧） | 同上 | 45 | `layer-07.png`、`roi-strap-left-top/root.png`、`roi-hem-junction.png` | L12/L7 交接处的 1 px 参考小刺保留 |
| 08 waistband L8 | 全部被 L12 覆盖 | 独显和隐藏上层检查，未见问题，未改 | 0 | `layer-08.png` | 无 |
| 09 bodice L9 | 全部被 L11/L10 覆盖 | 同上，未改 | 0 | `layer-09.png` | 无 |
| 10 skirt_body L10 | 外缘阶梯；与 L1 的接缝；与 L13 的接缝；L10 隐藏端不规则；孤立残点 | 批 1 擦除；批 2 逐点；批 3 的 L10/L1、L13/L10 分界渐变；批 4d 擦碎点 | 3091 | `layer-10.png`、`roi-skirt-side-top-left/mid-left/top-right/mid-right.png`、`roi-skirt-tip-*` | L10/L1 隐藏端不规则、上游 SVG 在 x420–670、y748–756 的隐藏缺口未动 |
| 11 waistband L11 | 下缘暗线处的过硬接缝；与 L2 交界 | 批 2 的 y723 线逐点；批 3 的 L11/L2 分界渐变 | 150 | `layer-11.png`、`roi-waistband-left/right.png`、`roi-hem-junction.png` | 无 |
| 12 bodice L12 | 腋下与肩带根的硬切；领缘/蝴蝶结周围残点；折线处易糊 | 批 1 擦除；批 3 的 L12/L5；批 4b 尖端处理；批 4d 擦碎点 | 563 | `layer-12.png`、`roi-armpit-*`、`roi-strap-*-root.png`、`roi-hem-junction.png` | 蝴蝶结外白光环 27 像素（step01 已用衣身色替换，见 §7）；bow 轮廓 ≤3 级的残影；L12/L6/L7 交接 1 px 小刺 |
| 13 skirt_body L13 | 外裙尖锯齿与小尖；与 L10 的接缝 | 批 3 的 L13/L10 分界渐变（受内部蒙版门控，外轮廓不动）；批 4d | 421 | `layer-13.png`、`roi-skirt-tip-left/right.png` | 右裙尖一条细长小片保留 |
| 14 knot L14 | 全部被覆盖 | 独显检查，未改 | 0 | `layer-14.png` | 无 |
| 15 right_tail L15 | 垂带外缘 AA 偏硬、个别异色点 | 批 2 逐点笔触 | 10 | `layer-15.png`、`roi-bow-tails.png` | 无 |
| 16 left_tail L16 | 同上 | 批 2 逐点笔触 | 16 | `layer-16.png`、`roi-bow-tails.png` | (582,474) 的 alpha=21 像素是参考自带的结下阴影，保留 |
| 17 right_loop L17 | 环外缘 AA 偏硬 | 批 2 逐点笔触 | 25 | `layer-17.png`、`roi-bow-loops-knot.png` | 无 |
| 18 left_loop L18 | 同上 | 批 2 逐点笔触 | 19 | `layer-18.png`、`roi-bow-loops-knot.png` | 无 |
| 19 knot L19 | 结心边缘 AA、结线粗细 | 批 2 逐点笔触（结心两侧线与环交接） | 14 | `layer-19.png`、`roi-bow-knot.png`（8×） | 无 |

质量度量（W3 `metrics.py`，step01 → step02）：

| 层 | 孤立小片 | 孔洞 | 单像素尖刺 | 弱 alpha（1–39） | 半透明过渡（40–249） |
|---|---|---|---|---|---|
| L1 | 0→0 | 0→0 | 8→6 | 1060→1210 | 982→1699 |
| L2 | 2→1 | 0→1 | 8→4 | 151→157 | 87→126 |
| L3 | 0→0 | 1→0 | 11→2 | 87→90 | 46→54 |
| L4 | 0→0 | 0→0 | 2→1 | 95→98 | 52→62 |
| L5 | 1→0 | 0→0 | 26→7 | 433→463 | 247→409 |
| L6 | 0→0 | 0→0 | 17→1 | 561→568 | 299→312 |
| L7 | 6→0 | 0→0 | 1→1 | 472→464 | 269→282 |
| L10 | 4→1 | 1→0 | 15→2 | 1526→2136 | 974→2476 |
| L11 | 2→0 | 0→0 | 4→3 | 157→186 | 300→387 |
| L12 | 3→0 | 0→0 | 26→5 | 1946→2076 | 1266→1573 |
| L13 | 0→0 | 0→0 | 15→3 | 291→405 | 193→454 |
| L15–L19 | 0–1→同 | 0→0 | 0–2→0–2 | 基本不变 | 基本不变 |
| L8、L9、L14 | 不变 | 不变 | 不变 | 不变 | 不变 |

半透明过渡像素增多，正是本步要的结果：硬切边变成几像素的渐变。L2 的 1 个“孔洞”是该层 (383,744) 一个 alpha=114 的单像素 AA 像素（见 §7），被 L11 覆盖。

## 5 检查

### 5.1 每层独显与隐藏上层
对 19 层每一层生成 `inspect/layer-NN.png`：参考、全层合成、L1..Lk（上方层隐藏）、Lk 独显（绿底），原尺寸到 8×。逐层检查了外缘锯齿、异色残点、过硬描边，以及隐藏上层后的补全接缝（颜色、明度、质感与可见区连续，补全带里没有露出异色）。

### 5.2 放大局部对比（step01 / step02 / 参考三栏，3–8×）
`inspect/roi-*.png`：腰头左右、外裙尖左右、裙身侧缘四处、腋下左右、肩带顶与带根左右、下摆交接、蝴蝶结垂带、环与结心、结心 8×。最终稿目视复核：L10 外缘从阶梯变为渐变，L1 窄条同样柔化，合成与参考一致。

### 5.3 合成对照
`inspect/overview-ref-final-diff.png`（参考 | 最终合成 | |差|×8），`inspect/composite-krita.png`（Krita 投影）。

| 指标（白底合成 vs 参考） | step01 | step02 |
|---|---|---|
| RGB 差 >2 的像素 | 8457 | 9482 |
| RGB 差 >16 | 243 | 27 |
| RGB 差 >32 | 118 | 4 |
| 最大 RGB 差 | 233 | 36 |
| alpha 差 >16 | 128 | 1 |
| 最大 alpha 差 | 255 | 18 |

“>2”略增来自盒式平均笔触产生的 2–4 级细差；大偏差（>16）减少约 9 成。外轮廓：step02 合成与 step01 合成的 alpha 差 >32 只有 116 像素，其中 114 个在 step01 与参考的 alpha 差本就 >32（即被改回与参考一致的残点），轮廓没有被整体改形。

### 5.4 像素差异工具（`mcp__layering__locate_pixel_differences`）
参考为 `../../clothing-part-layering/references/clothing.png`，当前为从最终 KRA 导出的 PNG；输出在 `step02/pixel-review/<uuid>/`（`differences.json`、`marked.png`、`heatmap.png`、`comparison.png`）。

| 阶段（当前图） | 阈值（color / coarse / alpha / 最小像素） | 候选框 | 目录 |
|---|---|---|---|
| 起点（step01 内容，`cur0`） | 80 / 32 / 96 / 4（默认颜色阈值，小框） | 8 | `ed141d56-96fa-4480-9ece-648ec2f93b0c` |
| 起点 | 48 / 20 / 96 / 4 | 8 | `c35bcedb-fa3f-4134-b812-f62b888496a3` |
| 起点 | 24 / 10 / 40 / 2（敏感） | 44 | `b0bc5ecd-d3e4-4cb6-b79f-b32bd93da6dc` |
| 起点 | 20 / 10 / 24 / 2（最敏感） | 45 | `0bf13462-cfb4-40a7-b583-2ef1257b8ee3` |
| 批 1–2 后（`cur2`） | 80 / 24 / 96 / 12 | 0 | `cff0fd43-61db-4954-814f-6b891a35bc15` |
| 批 1–2 后 | 30 / 12 / 96 / 4 | 0（9 个色差像素低于最小框） | `3392aba5-d7cd-4ce7-b1a0-c0166e116859` |
| 批 3 后（`cur3`） | 80 / 32 / 96 / 64（默认） | 0 | `eeb30871-e693-4e86-92d1-75efda55258d` |
| 批 4d 后（`cur4`） | 默认 | 0 | `aea9f4a6-44c7-4626-bb42-17af1089227a` |
| 批 4d 后 | 24 / 10 / 40 / 4（敏感） | 1 | `894bc9cb-3866-490e-8311-ef0a2e32f826` |
| 终稿（批 4e，`cur5` 重开读回） | 默认 | 0 | `52f216b0-4770-42b2-b6fd-3f9c011a3d5f` |
| 终稿 | 24 / 10 / 40 / 4（敏感） | 1：[527,440,7,3] | `a1328af5-cf38-4f89-8489-6c460bf0aad5` |

起点的候选框（敏感阈值下 44–45 个）是本步逐处检查的入口：多出的 alpha 残点（107–114 像素）和色差处，对应批 1–3 的处理；逐层对照参考后才决定处理方式和程度。

终稿敏感阈值下唯一的候选框是蝴蝶结外围的白光环（14 像素，最大差 34 级）：参考在这里有一圈白色光晕，step01 已把它在 L12 中改为衣身色（归属和透明度由 step01 决定），本步保留该决定（§7）。

### 5.5 保存与重开核对
- 保存：Krita `saveAs`/`save`，保存时间 13:00:07，`unzip -tq` 通过。
- 重开：新开 `openDocument` 读回 19 层，类型均为 `paintlayer`，名称、顺序、可见性、不透明度（255）、混合模式（normal）与 step01 逐项相同（交付时另用 `maindoc.xml` 复核，无蒙版、无子节点）；读回像素与最后一批输出（`tmp/s4e`）逐字节比较，差异 0；Krita 投影与脚本合成一致。
- `maindoc.xml` 中图像为 1086×1448、RGBA、`sRGB-elle-V2-srgbtrc.icc`，包含 `mergedimage.png` 与 `preview.png`。

## 6 与 groups.json 部件职责的核对
- **肩带**（`camisole/right_shoulder_strap`、`left_shoulder_strap`）：前段与肩后端条仍是独立层（L6 与 L3、L7 与 L4），同一肩带控制身份，没有合层、没有另造背视图；本步只柔化了二者的分界。
- **衣身**（`camisole/bodice`）：L5（腋下侧缘，在上臂之后）、L9（隐藏衣尾，在腰头之后）、L12（衣身主体，在肩带根与腰头上伸之前、蝴蝶结之后）仍为三个独立层；腋下与肩带间开口保持透明，没有填皮肤或人体。
- **腰头**（`pleated_skirt/waistband`）：L2（侧后端条）、L8（上伸搭接）、L11（前腰头）独立。
- **裙身**（`pleated_skirt/skirt_body`）：L1（侧后环绕条）、L10（主体）、L13（外裙尖，在前臂内侧之前）独立，没有因同动而合层；外裙尖的内侧开口没有被封住。
- **蝴蝶结**（`chest_bow`）：L14 结心回接、L15/L16 垂带、L17/L18 环、L19 结心正面按原顺序，没有被并入衣身。
- 所有环绕穿插分片保持原归属和层序；没有新增阴影、AO 或投影；没有执行身体装配或动画验证。

## 7 保留项与未解决事项

以下均为参考本身的内容或 step01 已确认的决定，不属于待修缺陷；没有会阻塞验收的未解决问题。

1. 参考中的 alpha 1–5 极弱光晕尾巴（各层沿外缘）保留；参考内部 alpha 约 240–253 的轻微不满也保留，没有强行补到 255。
2. L12/L6/L7 与下摆交接处的 1 px 小刺/小尖是参考线稿自带的细线，保留。
3. L2 (724,763–766) 的分离小片、y717.5 的 SVG 阶梯“耳”、(383,744) 的 alpha=114 隐藏 AA 像素：均在被覆盖区域，合成不可见，上游/step01 内容，保留。
4. L10/L1 隐藏端不规则、上游 SVG 在 x420–670、y748–756 的隐藏缺口：被 L11 覆盖，未动。
5. L13 右裙尖上一条细长小片保留（参考尖端的细线）。
6. 蝴蝶结外白光环：参考 27 像素（L12 内），step01 已改为衣身色；差异工具敏感阈值下唯一候选框 [527,440,7,3]（14 像素，最大差 34 级）。
7. L16 (582,474) 的 alpha=21 像素：参考里结下方的阴影像素，保留（本步不新增也不去除阴影）。
8. L12 上蝴蝶结轮廓的 ≤3 级残影：太弱，擦除只会引入新的边缘，保留。
9. 合成与参考的最大 RGB 差 36 级（>32 的共 4 像素）、最大 alpha 差 18 级，均在上面列出的位置。

## 8 证据与记录文件索引

- KRA：`step02/clothing-soft-edges.kra`；起点 `step01/clothing-depth.kra`（未改）。
- `step02/inspect/`（共 39 个 PNG）：`layer-01.png` … `layer-19.png`；`overview-ref-final-diff.png`；`composite-krita.png`；`roi-armpit-left/right`、`roi-bow-knot`、`roi-bow-loops-knot`、`roi-bow-tails`、`roi-hem-junction`、`roi-skirt-side-mid-left/mid-right/top-left/top-right`、`roi-skirt-tip-left/right`、`roi-strap-left-root/left-top/right-root/right-top`、`roi-waistband-left/right`。
- `step02/pixel-review/`：差异工具的 11 个输出目录（终稿两个见 §5.4）。
- W3 脚本：
  - 修改：`fixlib.py`、`b3lib.py`、`b3run.py`（`do_cut`、`interior_mask`）、`b1_erase.py`、`b2.py`、`b3.py`、`b4a.py`、`b4b.py`、`b4c.py`、`b4d.py`、`b4e.py`。
  - 检查：`metrics.py`、`permetrics.py`、`sil.py`、`specks.py`、`holes.py`、`dots.py`、`nearsil.py`、`evidence.py`、`roi.py`。
  - 通道：`kr/gui.sh`、`kr/job.sh`、`tmp/fx/`（任务文件）；各批数据 `tmp/layers0`（step01）→ `tmp/cur0`（起点）→ `tmp/s1`、`s2`、`s3`、`s4a`…`s4e` → `tmp/cur5`（重开读回）。

## 9 复核命令（交付时）
- `sha256sum step01/clothing-depth.kra step02/clothing-soft-edges.kra` 得到 §开头的两个值。
- `unzip -tq step02/clothing-soft-edges.kra` 通过；`maindoc.xml` 含 19 个 `paintlayer`，无 mask。
- 上游 `references/clothing.png`、`groups.json`、`occlusion.json` 的 sha256 与 §1 一致。
