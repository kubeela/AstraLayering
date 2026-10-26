# Step 02 边缘柔化与去锯齿验收报告（`pink-doll`）

## 1. 输入与参考依据

- **输入 KRA（只读基线）**：`step01/character-depth.kra`（绝对路径：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/raster-layering/step01/character-depth.kra`）
- **第一步报告**：`step01/report.md`（绝对路径：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/raster-layering/step01/report.md`）
- **原图参考**：`../../part-layering/references/base-subject.png`（绝对路径：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/part-layering/references/base-subject.png`，画布尺寸 `1254 × 1254`）
- **上游结构与深度文件**：
  - `../part-layering/occlusion.json`
  - `../part-layering/groups.json`
  - `../part-layering/parts/`
  - 本步沿用 `step01` 已核实并落地的 55 个逻辑部件、58 个普通绘画层（`000`..`057`）的深度排序与分片结构，未发生新增拆分或深度变动，与上游 `occlusion.json` / `groups.json` 完全一致。
- **本步交付文件**：
  - 柔化工程：`step02/character-soft-edges.kra`
  - 重开核对后导出的全图合成 PNG：`character-soft-edges.png`（`1254 × 1254` RGBA 透明背景）
  - 重开核对校验记录：`step02/reopen-verification.json`
  - 逐层修画与边缘柔化统计记录：`step02/edge-polish-records.json`
  - 独显、剥离遮挡及 200–300% 局部放大对比图：`step02/review/`（含 `solo-sheet-01.png`..`15.png`、`occlusion-peel-check.png`、`composite-zoom-comparison.png` 及 `layers/` 下全部 58 层独显 PNG）

---

## 2. 总体问题诊断与处理方法

对照原图 `../../part-layering/references/base-subject.png` 在 200%–400% 放大下逐层检查 `step01/character-depth.kra` 的 58 个图层，定位并解决了以下四类问题：

1. **部件外轮廓二值锯齿与硬切台阶**：
   - `step01` 中各部件通过色块掩膜裁剪和配准后，全部 58 个图层的外边缘存在 `alpha >= 200` 直接跳变到 `alpha = 0` 的二值硬边像素（如 `003 | hair/back_hair` 有 5,321 个硬边像素、`051 | hair/bangs` 有 2,922 个、`030 | face/face_base` 有 2,175 个），在 200–400% 放大下呈现明显像素台阶，且半透明边缘像素在 `step01` 叠加原图时混入了少量浅色背景残色。
   - **处理方式**：首先对半透明外边缘做色彩净边（仅消除混入的浅亮背景残色，完整保留部件原有的深色描边笔画，不把深色轮廓线冲淡为内填色）；随后按部件类别匹配原图边缘过渡宽度（精细五官线条采用窄过渡 `sigma=0.72`，头发、身体与四肢轮廓采用柔和过渡 `sigma=0.88`），对陡峭边界内侧 1px 与外侧 1px 半透明裙边进行自适应抗锯齿柔化，并在高层部件半透明边缘带内做防外溢约束（防止底层补全端帽向外羽化时渗入上层轮廓边缘）。处理后全部 58 个图层的硬边像素（`alpha >= 128` 直接相邻 `alpha = 0`）均降至 **0**，各部件外缘呈现与原图同等宽度的柔和半透明过渡。

2. **边缘异物残留与邻件串色清理**：
   - 单独显示各层时，部分部件的隐藏端帽或交界外沿残留了相邻部件的深色描边点、断续轮廓线或背景杂色（如 `000` 内部两处黑斑、`010 | neck` 顶缘下巴残线与斜方肌残线、`013 | body` 左右肩部补全端帽外沿的断续红棕描边点、`011 | arm_right/upper_arm` 肘部内侧混入的 5px 侧发褐色块及前臂描边短线、`037/038 | sclera` 底缘深色残线与内侧粉点、`021 | middle_finger` 根部黑点、`005/006 | foot` 踝部截断面黑线、`007/008 | leg` 大腿根部截断面黑线）。
   - **处理方式**：逐层定位并将异物残色清除或重绘为本部件自身的连续肤色/发色/眼白颜色，确保每一层单独显示时外缘干净、无邻件像素混入。

3. **补全区与可见区交界接缝及分片硬切口柔化**：
   - 隐藏上层遮挡物后，部分部件的可见区与补全区交界处存在明暗阶梯或硬线（如 `028/029 | side_hair` 上部隐藏拱形区的断续深色线与明暗断层、`037/038 | sclera` 上侧灰紫眼影与眼白主体的月牙形台阶及外眼角暗沟、`011/012 | upper_arm` 肘部补全区、`014/015 | forearm` 腕部补全区、`018..021` 手指根部 `y=688` 横向色阶、`016/017 | little_finger` 亮色块），以及多深度分片部件在拆层处的二值硬切口（`000/004 | head_accessories` 斜切口、`049/050` 与 `052/053 | front_side_hair` 的 90 度垂直切口）。
   - **处理方式**：在严格保持可见区轮廓与合看连续性的前提下，用柔边渐变与局部柔化笔触消除补全区与可见区的色阶接缝，赋予补全区与原图一致的柔和明暗过渡；对多深度分片的底层分片（`000`、`049`、`050`）在被上层完全遮挡的区域内向主分片方向做 2.5–3.5px 柔和羽化延伸，彻底消除独显时的硬切角。

4. **五官与发丝线条质感柔化**：
   - 对照原图柔化发丝分叉、眼睑、睫毛、眉毛、鼻点、唇线及拇指虎口内侧线条（如 `026 | arm_right/hand/thumb` 内侧过粗的深棕线收细柔化），使粗细、浓淡与原图的柔和笔触一致。

---

## 3. 逐层修改与验收记录（全部 58 层：`000`..`057`）

### 3.1 重点修画与接缝处理图层明细

| 图层序号与名称 | 逻辑 Part ID | 主要问题（修复前） | 处理方式 | 独显 / 剥离遮挡 / 合看验收结果 |
| :--- | :--- | :--- | :--- | :--- |
| `000 \| head_accessories::root` | `head_accessories` | 内部有两处深黑斑点（`#171412`）；与 `004` 的分片切口呈二值锯齿台阶 | 用本部件深橄榄绿（`#363b2c`）修补黑斑；在 `004` 遮挡区下方将切口向左上柔和羽化延伸 3.5px，外轮廓做去锯齿柔化 | 独显无黑斑、切口柔和；与 `004` 合看严丝合缝（`hard_ge_128 = 0`） |
| `004 \| head_accessories::front` | `head_accessories` | 叶片外轮廓及发辫交界处有 1px 二值像素台阶 | 保持与 `000` 分片衔接处不漏缝，对叶片外缘做自适应去锯齿柔化 | 独显轮廓圆润干净，与发髻及后发叠放自然 |
| `001 \| hair/bun_right`<br>`002 \| hair/bun_left` | `hair/bun_right`<br>`hair/bun_left` | 被 `003 \| back_hair` 遮挡的内侧补全边缘有 1px 浅色夹缝与硬边台阶；外圈编发轮廓有锯齿 | 在后发遮挡区内平滑内侧补全边缘色阶，对发髻外轮廓做半透明去锯齿过渡 | 独显内外缘均柔和连续，隐藏上层后无接缝 |
| `003 \| hair/back_hair` | `hair/back_hair` | 外轮廓及发尾分叉处有 5,321 个二值硬边像素，局部半透明边缘混有浅色背景残色 | 净边消除浅色背景残色，保留深色发丝描边并做自适应柔边抗锯齿（`sigma=0.88`） | 独显发丝外缘柔和无台阶，200–400% 下过渡自然 |
| `005 \| legs/leg_right/foot`<br>`006 \| legs/leg_left/foot` | `legs/leg_right/foot`<br>`legs/leg_left/foot` | 踝部上方隐藏补全端帽（`y=1145..1182`）两侧残留小腿轮廓垂直黑线；脚趾缝与足外缘有像素台阶 | 清除踝部隐藏端帽的垂直黑线，柔化补全区与脚背肤色过渡，对脚趾与足外缘做去锯齿柔化 | 独显踝部补全端帽干净圆润，隐藏 `007/008` 后脚踝过渡自然 |
| `007 \| legs/leg_right/leg`<br>`008 \| legs/leg_left/leg` | `legs/leg_right/leg`<br>`legs/leg_left/leg` | 大腿根部隐藏端帽（`y=575..612`）外侧残留深色描边短线；与连体衣交界的腹股沟斜向阴影带边界略硬 | 清除大腿根部隐藏端帽的深色残线，柔化腹股沟斜向阴影过渡及腿部外轮廓 | 独显顶端干净无黑线，隐藏 `009 \| pelvis` 后大腿根部过渡柔和 |
| `009 \| pelvis` | `pelvis` | 连体衣裤裆底缘轮廓有二值像素台阶 | 对裤裆底缘描边与外缘做去锯齿柔化 | 独显与叠放边缘柔和干净 |
| `010 \| neck` | `neck` | 顶缘中央（`y=293..305`）残留下巴深色横线；左右斜方肌斜边残留锁骨/发丝深色短线；颈部阴影交界略硬 | 清除顶缘与两侧斜边的深色残线，统一为颈部柔和肤色，柔化下巴下方阴影过渡与外缘 | 独显无任何深色残片，隐藏 `030 \| face_base` 后颈部连续自然 |
| `011 \| arms/arm_right/upper_arm`<br>`012 \| arms/arm_left/upper_arm` | `arms/arm_right/upper_arm`<br>`arms/arm_left/upper_arm` | `011` 肘部内侧（`y=500..540`）混入 5px 宽的侧发褐色块（与左臂不对称）；前臂遮挡下的肘部端帽残留黑色描边短线与明暗硬角 | 裁除 `011` 内侧超出的侧发褐色残片使左右上臂对称；在前臂（`014/015`）遮挡区内清除描边短线并柔化肘部端帽过渡 | 独显左右上臂干净对称，隐藏前臂后肘部无硬线接缝 |
| `013 \| body` | `body` | 左右肩部隐藏补全端帽（`y=350..418`，位于侧发下方、上臂上方）外沿残留断续红棕描边点与腋下暗斑，压在上臂上形成可见虚线接缝 | 清除肩部端帽外沿的断续棕点与暗斑，统一为肩部亮肤色，并在侧发遮挡区内对肩部端帽边缘做 3px 柔和羽化过渡 | 独显肩部圆润干净；剥离侧发（`028/029`）后躯干与上臂（`011/012`）无缝衔接 |
| `014 \| arms/arm_right/forearm`<br>`015 \| arms/arm_left/forearm` | `arms/arm_right/forearm`<br>`arms/arm_left/forearm` | 手腕隐藏端帽（`y=641..656`，位于手掌 `022/023` 下方）存在横向明暗台阶与内部描边残片 | 在手掌完全遮挡区内清除内部描边残片并平滑手腕端帽明暗过渡，保持可见手腕轮廓不变 | 独显手腕端帽柔和干净，隐藏手掌后无接缝 |
| `016 \| arms/arm_right/hand/little_finger`<br>`017 \| arms/arm_left/hand/little_finger` | `arms/arm_right/hand/little_finger`<br>`arms/arm_left/hand/little_finger` | 全遮挡小指层原先呈死平亮色块；`017` 内部有深色斜线残痕且右上侧断续棕边外露 1px | 按掌侧阴影手指（`018/019`）色调重绘柔和渐变与细柔轮廓，清除内部杂线并将 `017` 右上缘内收 | 独显具自然立体感与柔边轮廓，合看时不再从无名指外侧露出杂点 |
| `018 \| arms/arm_right/hand/ring_finger`<br>`019 \| arms/arm_left/hand/ring_finger`<br>`020 \| arms/arm_right/hand/middle_finger`<br>`021 \| arms/arm_left/hand/middle_finger` | `ring_finger` / `middle_finger` | 手指根部隐藏端帽（`y=674..688`）与可见指体之间有横向色阶断层；`021` 右上缘残留深黑斑点 | 清除 `021` 右上缘黑点，将掌侧阴影肤色向根部隐藏端帽做柔光渐变延伸，消除 `y=688` 横向硬线并柔化指尖轮廓 | 独显根部至指尖色彩连续，隐藏上层手指/手掌后无横向接缝 |
| `022 \| arms/arm_right/hand/palm`<br>`023 \| arms/arm_left/hand/palm` | `arms/arm_right/hand/palm`<br>`arms/arm_left/hand/palm` | 掌底指根弧形切口（`y=680..720`）残留断续深色点与粉色台阶 | 在内侧遮挡区清除断续杂点并柔化掌底过渡，保持可见食指与手背外轮廓柔和精准 | 独显掌底干净柔和，与下层手指叠放自然 |
| `024 \| arms/arm_right/hand/index_finger`<br>`025 \| arms/arm_left/hand/index_finger` | `index_finger` | 指背与指尖外轮廓有 1px 二值像素台阶 | 对指背与指尖外轮廓做自适应去锯齿柔化 | 独显与合看指尖圆润柔和 |
| `026 \| arms/arm_right/hand/thumb`<br>`027 \| arms/arm_left/hand/thumb` | `arms/arm_right/hand/thumb`<br>`arms/arm_left/hand/thumb` | 右手拇指（`026`）虎口内侧轮廓线（`y=684..702`）比原图及左手拇指偏粗偏深 | 将 `026` 虎口内侧过粗深色线向亮肤色柔和收细，并对左右拇指外缘做去锯齿柔化 | 左右手拇指线条粗细对称，与原图一致 |
| `028 \| hair/side_hair_right`<br>`029 \| hair/side_hair_left` | `hair/side_hair_right`<br>`hair/side_hair_left` | 上部隐藏补全区（`y=72..250`，位于刘海与前侧发下方）残留断续深色描边线与交界色阶 | 清除隐藏区内的断续深色描边残片，用柔边渐变平滑上部补全区与下部可见长发束的过渡，柔化发束外轮廓 | 独显长发束从顶至尾连续完整，隐藏刘海与前侧发后无接缝 |
| `030 \| face/face_base` | `face/face_base` | 两侧鬓发（`052/053`）遮挡下的下颌线末端截断略硬；额头及侧脸补全外缘有二值台阶 | 在鬓发遮挡区内将下颌线末端柔和淡出至脸颊肤色，对脸底外圈做柔边去锯齿过渡，保持红晕与肤色柔光层次 | 独显脸底干净圆润，隐藏五官与刘海后无任何接缝 |
| `031`..`036`（口腔与鼻部 6 层） | `nose` / `mouth/*` | `032 \| mouth_interior` 内部有轻微横弧色阶；`034 \| tongue` 上拱边缘有 1px 亮粉阶梯；`031/033/035/036` 外缘有轻微像素台阶 | 平滑口腔内部与舌面柔光过渡，对鼻点、上牙、唇线做精细柔边抗锯齿（`sigma=0.72`） | 300% 放大下五官线条柔和细腻，与原图一致 |
| `037 \| face/eye_right/sclera`<br>`038 \| face/eye_left/sclera` | `eye_right/sclera`<br>`eye_left/sclera` | 上侧隐藏补全区与可见眼白之间有月牙形色阶断层及外眼角暗沟；`037` 底缘残留深色下眼睑线；`038` 内侧有粉点 | 清除 `037` 底缘深色残线、`038` 内侧粉点及外眼角暗沟，将上侧灰紫眼影向眼白主体做连续柔光渐变过渡并柔化外缘 | 独显眼白如水彩般柔和渐变，隐藏虹膜与眼睑后无月牙硬线 |
| `039 \| face/eye_right/iris`<br>`040 \| face/eye_left/iris` | `eye_right/iris`<br>`eye_left/iris` | 高光（`041/042`）与上眼睑（`054/055`）遮挡下的虹膜补全边缘略硬；椭圆外圈有 1px 台阶 | 柔化高光与上眼睑遮挡区内的虹膜过渡，并对虹膜外缘做精细去锯齿柔化 | 独显虹膜饱满圆润，隐藏高光与眼睑后过渡自然 |
| `041`..`048`、`054`..`057`（眼部高光、下眼睑、眉毛、上眼睑、睫毛共 12 层） | `highlight` / `lower_eyelid` / `eyebrow_*` / `upper_eyelid` / `eyelash` | 细小五官笔画外缘存在二值硬边台阶 | 保留原有的深红棕/深褐描边色泽，按原图笔触宽度做精细抗锯齿柔化（`sigma=0.72`） | 300% 放大下眼眶、睫毛、眉毛柔美自然，无锯齿或串色 |
| `049 \| hair/front_side_hair_right::root`<br>`050 \| hair/front_side_hair_left::root`<br>`052 \| hair/front_side_hair_right::front`<br>`053 \| hair/front_side_hair_left::front` | `front_side_hair_right`<br>`front_side_hair_left` | `049/050` 与 `052/053` 的分片切口呈 90 度垂直硬切线；外缘及鬓角发丝有像素台阶 | 在刘海（`051`）遮挡区下方将 `049/050` 向主发束方向柔和羽化延伸 2.5px；完整保留 `052/053` 内外侧深色轮廓线并做柔边抗锯齿 | 独显无垂直硬刀口，同部件合看连续无缝，叠放在脸颊上边缘柔和干净 |
| `051 \| hair/bangs` | `hair/bangs` | 刘海发梢分叉及头顶外拱轮廓有 2,922 个二值硬边像素 | 保留刘海内部高光、阴影与发丝深色描边，对全轮廓做自适应柔边抗锯齿（`sigma=0.88`） | 200–300% 放大下刘海发梢与头顶弧线柔和顺滑，与原图一致 |

---

## 4. 保存后重开核对结果（Krita 实测）

已在 Krita 中将全部 58 个柔化后的图层写入 `step02/character-soft-edges.kra`，保存并关闭文档后重新打开 `step02/character-soft-edges.kra`，逐层核对图层顺序、图层名、节点类型、子节点数及像素 SHA256 哈希，并从重新打开的文档直接导出 `character-soft-edges.png`（详见 `step02/reopen-verification.json`）：

- **画布尺寸**：`1254 × 1254`（RGBA 8-bit，透明背景）
- **顶层图层数量**：`58`（`000 | head_accessories::root` 至 `057 | face/eye_left/eyelash`，顺序与深度完全一致）
- **节点类型与干净度**：全部 58 层均为普通 `paintlayer`，无蒙版、无组节点、无子节点（`all_ordinary_paintlayers: true`）
- **重开前后单层像素一致性**：全部 58 层重开后的像素 SHA256 与保存前 **100% 一致**（`all_layers_match_after_reopen: true`）
- **重开前后全图合成像素一致性**：
  - 保存前全图合成 SHA256：`00d0ecc3e29dbc37c5ac25c4c5b9a379d6dfe2cc5ef173cfe452900061af1a60`
  - 重开后全图合成 SHA256：`00d0ecc3e29dbc37c5ac25c4c5b9a379d6dfe2cc5ef173cfe452900061af1a60`
  - 核对结果：**完全一致**（`projection_matches_after_reopen: true`）

---

## 5. 遗留问题与未解决事项

- **无未解决的验收问题**。全部 58 个图层在单独显示、剥离上层遮挡及全图合成（200%–400% 放大）下均已核验通过：外缘柔和无像素台阶、无邻件异物残色、补全区与可见区过渡自然无硬接缝，整体观感与原图高度一致。
