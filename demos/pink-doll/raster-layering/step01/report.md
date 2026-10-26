# pink-doll 人物绘画与分层报告（step01）

## 1. 交付与验收结论

- **状态**：已完成并通过原尺寸（`1254 × 1254`）逐层单独检查、整图拼装视觉比对、上游结构同步校验与 Krita 保存重开一致性核验。
- **最终 KRA 交付**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/raster-layering/step01/character-depth.kra`
- **本步正式报告**：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/raster-layering/step01/report.md`
- **整图导出与检视产物**：
  - 最终拼装导出：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/raster-layering/step01/review/assembly-final.png`
  - 重开后导出：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/raster-layering/step01/review/assembly-reopened.png`
  - 原图与最终成果并排比对：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/raster-layering/step01/review/final-vs-reference.png`
  - 55 个逻辑部件与 58 个绘画层原尺寸检视表：`step01/review/solo-sheet-01.png` 至 `solo-sheet-14.png` 及 `step01/review/layers/000..057-*.png`
- **画布与图层规格**：`1254 × 1254` RGBA，共 **55 个逻辑部件**，拆分为 **58 个普通绘画层（`paintlayer`）**，按实际深度由下到上 `000`..`057` 排列，无蒙版、无分组或子节点，全部可见且不透明度为 `255`。

## 2. 红黄绿控制图构建与生图记录

1. **输入图与控制图准备**：
   - 直接读取上游 `/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/part-layering/groups.json`、`occlusion.json`、`parts/` 及 `references/base-subject.png`。
   - 对全部 55 个逻辑部件逐一构建 `control-rgb.png`（红色=可见主体，黄色=被高层部件遮挡需补全区域，绿色=部件外部）与 `input-masked.png`（将黄色遮挡区域与绿色外部区域清为中性灰底，仅保留本部件可见像素，防止模型照抄头发、衣服或五官等遮挡物），并按部件包围盒等比局部放大为 `crop-input.png` 与 `crop-control.png`（记录于 `step01/input-manifest.json`）。
2. **模型生图与重生筛选**：
   - 全部 55 个逻辑部件均通过内置 `image_generation` 工具完成提取与遮挡补全，共生成 62 张部件图（完整记录于 `step01/generation-records.json`），绝未用原图遮挡物像素代替补全。
   - 对初版生图存在瑕疵的 7 个部件进行了提示词微调与 `v2` 重生：`face/face_base`（消除内部伪线与侧脸尖角）、`hair/bun_right`（补齐上半部发髻体积）、`hair/bun_left`、`hair/back_hair`、`hair/bangs`、`hair/front_side_hair_right`、`hair/front_side_hair_left`。

## 3. 深度穿插、拆层与色块归属修正（区分预先标注与组装新发现）

在实际配准与拼装核对中，落实了上游已标注的穿插区域，并处理了组装中新发现的层序、色块归属与多深度分片问题，所有修改均已同步写回 `../part-layering/occlusion.json`、`../part-layering/groups.json`、`../../part-layering/preview.svg` 及对应部件 SVG/回执（详见 `step01/structure-changes.json` 与 `step01/upstream-sync.json`）：

| 原逻辑部件 ID | 类型（预先标注 / 组装新发现） | 调整前深度 | 调整后图层名与深度 | 区域说明与修改依据 |
| :--- | :--- | :---: | :--- | :--- |
| `head_accessories` | **预先标注**（上游已标注发饰根部与右发髻辫环双向穿插） | `4` | `000 \| head_accessories::root` (`level 0`)<br>`004 \| head_accessories::front` (`level 4`) | 保留同一逻辑发饰完整补全形状，按原可见叶瓣/圆珠几何与 `bun_right` 遮挡关系切分为两个普通绘画层：`root`（伸入右发髻辫环下方的深绿发饰根部及与右发髻交界处 `alpha < 96` 的半透明抗锯齿边缘，位于 `001 \| hair/bun_right` 后方）与 `front`（前方可见叶瓣与金珠主体，位于 `001 \| hair/bun_right` 前方）。合起来仍是连续完整的同一部件。 |
| `hair/front_side_hair_right` | **预先标注外露 + 组装确立分片方案** | `52` | `049 \| hair/front_side_hair_right::root` (`level 49`)<br>`052 \| hair/front_side_hair_right::front` (`level 52`) | 上游已提示头顶 `x=580..659, y=60..89` 处发根补全舌片在中分缝外露；若保持单深度 `52` 会压在 `051 \| hair/bangs` 顶部分缝上形成突兀色块。将该逻辑部件在 `x=580..659, y=60..89` 内原可见几何 `alpha=0` 的发根补全舌片拆为 `049 \| hair/front_side_hair_right::root`（位于 `051 \| hair/bangs` 后方），其余贴脸鬓发主体保留为 `052 \| hair/front_side_hair_right::front`（位于 `051 \| hair/bangs` 前方）。 |
| `hair/front_side_hair_left` | **预先标注外露 + 组装确立分片方案** | `53` | `050 \| hair/front_side_hair_left::root` (`level 50`)<br>`053 \| hair/front_side_hair_left::front` (`level 53`) | 与右侧对称，将 `x=580..659, y=60..89` 内原可见几何 `alpha=0` 的发根补全舌片拆为 `050 \| hair/front_side_hair_left::root`（位于 `051 \| hair/bangs` 后方），其余贴脸鬓发主体保留为 `053 \| hair/front_side_hair_left::front`（位于 `051 \| hair/bangs` 前方）。 |
| `face/eyebrow_right` | **组装新发现**（层序调整） | `49` | `056 \| face/eyebrow_right` (`level 56`) | 对照原图眉额局部确认：动漫透发眉线条完整画在刘海与贴脸鬓发表面；若置于 `49` 会被 `051 \| hair/bangs` 遮住而消失。故将右眉整体上移至 `level 56`（刘海与前侧发前方），同时将 `051 \| hair/bangs` 上原被眉毛覆盖的区域按上下发丝截面纵向修补为连续发丝。 |
| `face/eyebrow_left` | **组装新发现**（层序调整） | `50` | `057 \| face/eyebrow_left` (`level 57`) | 与右眉对称，将左眉整体上移至 `level 57`（刘海与前侧发前方），保留独立眉毛运动身份。 |
| `face/eye_left/highlight` | **组装新发现**（色块形状补入） | `42` | `042 \| face/eye_left/highlight` (`level 42`) | 对照原图发现左眼虹膜右下方 `x=679..685, y=238..245` 的浅米白反光点在上游归属中遗漏（与右眼 `face/eye_right/highlight` 的右下反光对称）。将该反光点补入 `face/eye_left/highlight` 的 SVG 与图层（共用深度 `42`），并将下方 `040 \| face/eye_left/iris` 对应位置修补为连续棕色虹膜底。 |

## 4. Krita 配准、原像素叠加与逐层精细修画记录

在 Krita 5.3.4.1 中完成了全部 55 个逻辑部件（58 个绘画层）的配准、可见区原图像素叠加、边缘收边以及补全区精细修画（详见 `step01/scripts/repair_*.py`、`step01/repair-polish-v12.json` 与 `step01/repair-polish-v13.json`）：

1. **头部与五官（`030..057`、`010`）**：
   - `030 | face/face_base` 与 `010 | neck`：抹除头发、刘海、五官遮挡区残留暗影，使额头、侧脸轮廓与颈部顶面过渡自然平滑。
   - `040 | face/eye_left/iris` 与 `042 | face/eye_left/highlight`：补齐左眼右下反光点并修复虹膜底层连续色彩。
   - `051 | hair/bangs`：消除 `y=175..200` 眉毛移除带的横向抹痕，按上下发丝截面纵向插值恢复发束纹理与分缝阴影，并还原 `x=611..643, y=74..75` 头顶 V 形分缝暗部描边。
   - `052 | hair/front_side_hair_right::front` 与 `053 | hair/front_side_hair_left::front`：清除内侧发梢 `y=224..241` 混入的浅棕亮斑，使内侧轮廓线干净连续。
2. **发饰、发髻与后发/侧发/前侧发（`000..004`、`028..029`、`049..053`）**：
   - `000 | head_accessories::root` 与 `004 | head_accessories::front`：补回 `004` 可见叶瓣与金珠的完整原图描边与暗部，将 `001 | hair/bun_right` 上方半透明交界边缘（`alpha < 96`）归入 `000`，并平滑 `000` 内部残留的发辫暗纹。
   - `028 | hair/side_hair_right` 与 `029 | hair/side_hair_left`：柔化隐藏上端补全区内部的阶梯状接缝。
3. **躯干、骨盆与四肢手足（`005..009`、`011..027`）**：
   - `009 | pelvis`：将 `y=589` 处干净的白色紧身衣明暗与两侧公主线平滑延伸至 `013 | body` 下方的隐藏补全区（`y=500..585`），消除水平亮度断层与锯齿状暗线。
   - `011 | arms/arm_right/upper_arm` 与 `012 | arms/arm_left/upper_arm`：清除肘部隐藏重叠区内的暗色残线与色斑，同时完整保留 `011` 在 `013 | body`、`014 | forearm` 与 `028 | hair/side_hair_right` 之间的可见内侧轮廓。
   - `014/015 | arms/arm_*/forearm` 与 `016..027 | arms/arm_*/hand/*`：在严格保留手腕可见外轮廓（`022/023 | palm` 未完全覆盖处）的基础上，将隐藏手腕端帽与手指根部端帽平滑收边；用原图手背自身肤色场统一 `palm`、`index_finger` 与 `thumb` 的手背接缝，消除单层黑点与整图接缝弧线。
   - `005/006 | legs/leg_*/foot` 与 `007/008 | legs/leg_*/leg`：在严格保留脚踝可见外轮廓（`007/008` 未完全覆盖处）的基础上，将脚踝两侧阴影向 `y=1101..1136` 隐藏端帽平滑渐变，消除 `y=1136` 处的水平色阶。

## 5. 55 个逻辑部件与 58 个 Krita 绘画层完整映射表

| 图层序号与名称 | 深度 (Level) | 逻辑部件 ID | 图层类型 | 子节点数 | 包围盒 [x, y, w, h] | 保存前/重开后像素 SHA256 |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- |
| `000 \| head_accessories::root` | `0` | `head_accessories` | `paintlayer` | `0` | `[471, 117, 60, 45]` | `d62c3e29c8d9157a...` |
| `001 \| hair/bun_right` | `1` | `hair/bun_right` | `paintlayer` | `0` | `[469, 111, 66, 92]` | `ed28dc8325655519...` |
| `002 \| hair/bun_left` | `2` | `hair/bun_left` | `paintlayer` | `0` | `[718, 101, 71, 98]` | `3f576867f9ec99aa...` |
| `003 \| hair/back_hair` | `3` | `hair/back_hair` | `paintlayer` | `0` | `[425, 59, 406, 619]` | `437b38dda65ecea8...` |
| `004 \| head_accessories::front` | `4` | `head_accessories` | `paintlayer` | `0` | `[462, 60, 83, 97]` | `da1d7f41a87a3eea...` |
| `005 \| legs/leg_right/foot` | `5` | `legs/leg_right/foot` | `paintlayer` | `0` | `[557, 1101, 61, 113]` | `d7ba34ba8822cf9c...` |
| `006 \| legs/leg_left/foot` | `6` | `legs/leg_left/foot` | `paintlayer` | `0` | `[638, 1104, 62, 110]` | `16b2e294f8e90c36...` |
| `007 \| legs/leg_right/leg` | `7` | `legs/leg_right/leg` | `paintlayer` | `0` | `[521, 614, 99, 527]` | `c92e0fb9974f95cb...` |
| `008 \| legs/leg_left/leg` | `8` | `legs/leg_left/leg` | `paintlayer` | `0` | `[637, 614, 98, 524]` | `75ddc26420b93f53...` |
| `009 \| pelvis` | `9` | `pelvis` | `paintlayer` | `0` | `[529, 500, 199, 220]` | `583f325b2cca17d4...` |
| `010 \| neck` | `10` | `neck` | `paintlayer` | `0` | `[566, 294, 125, 69]` | `1c4e2a05550f374f...` |
| `011 \| arms/arm_right/upper_arm` | `11` | `arms/arm_right/upper_arm` | `paintlayer` | `0` | `[468, 356, 88, 192]` | `f8b92655b494632e...` |
| `012 \| arms/arm_left/upper_arm` | `12` | `arms/arm_left/upper_arm` | `paintlayer` | `0` | `[701, 356, 85, 191]` | `7f2cc489ba688e0a...` |
| `013 \| body` | `13` | `body` | `paintlayer` | `0` | `[534, 343, 188, 249]` | `99b557891ea6d695...` |
| `014 \| arms/arm_right/forearm` | `14` | `arms/arm_right/forearm` | `paintlayer` | `0` | `[424, 518, 91, 148]` | `d3c4dc7a9a8c3cca...` |
| `015 \| arms/arm_left/forearm` | `15` | `arms/arm_left/forearm` | `paintlayer` | `0` | `[736, 500, 91, 159]` | `9b3f0c7c142be1a7...` |
| `016 \| arms/arm_right/hand/little_finger` | `16` | `arms/arm_right/hand/little_finger` | `paintlayer` | `0` | `[416, 679, 15, 48]` | `8357f339d75f9342...` |
| `017 \| arms/arm_left/hand/little_finger` | `17` | `arms/arm_left/hand/little_finger` | `paintlayer` | `0` | `[834, 673, 19, 53]` | `66bb076f87947b88...` |
| `018 \| arms/arm_right/hand/ring_finger` | `18` | `arms/arm_right/hand/ring_finger` | `paintlayer` | `0` | `[413, 678, 13, 52]` | `0d3b1ff4bf73399f...` |
| `019 \| arms/arm_left/hand/ring_finger` | `19` | `arms/arm_left/hand/ring_finger` | `paintlayer` | `0` | `[831, 677, 11, 53]` | `314fa4a157afba22...` |
| `020 \| arms/arm_right/hand/middle_finger` | `20` | `arms/arm_right/hand/middle_finger` | `paintlayer` | `0` | `[404, 678, 18, 64]` | `e2d54b7248a37142...` |
| `021 \| arms/arm_left/hand/middle_finger` | `21` | `arms/arm_left/hand/middle_finger` | `paintlayer` | `0` | `[836, 674, 17, 68]` | `efee90cda0357c58...` |
| `022 \| arms/arm_right/hand/palm` | `22` | `arms/arm_right/hand/palm` | `paintlayer` | `0` | `[406, 640, 55, 48]` | `99926f5f79124155...` |
| `023 \| arms/arm_left/hand/palm` | `23` | `arms/arm_left/hand/palm` | `paintlayer` | `0` | `[799, 640, 53, 52]` | `9b2e30b16c169e09...` |
| `024 \| arms/arm_right/hand/index_finger` | `24` | `arms/arm_right/hand/index_finger` | `paintlayer` | `0` | `[396, 674, 35, 65]` | `aad234743df73f99...` |
| `025 \| arms/arm_left/hand/index_finger` | `25` | `arms/arm_left/hand/index_finger` | `paintlayer` | `0` | `[825, 670, 36, 69]` | `903463d1ad619e8d...` |
| `026 \| arms/arm_right/hand/thumb` | `26` | `arms/arm_right/hand/thumb` | `paintlayer` | `0` | `[427, 669, 27, 46]` | `3088a59d1a7c90b5...` |
| `027 \| arms/arm_left/hand/thumb` | `27` | `arms/arm_left/hand/thumb` | `paintlayer` | `0` | `[802, 668, 28, 47]` | `c1efca178719af8f...` |
| `028 \| hair/side_hair_right` | `28` | `hair/side_hair_right` | `paintlayer` | `0` | `[489, 71, 115, 527]` | `09d5b4cb270c11ab...` |
| `029 \| hair/side_hair_left` | `29` | `hair/side_hair_left` | `paintlayer` | `0` | `[637, 72, 130, 526]` | `51a011fa0cbe0374...` |
| `030 \| face/face_base` | `30` | `face/face_base` | `paintlayer` | `0` | `[549, 143, 157, 176]` | `238158f8e466baa4...` |
| `031 \| face/nose` | `31` | `face/nose` | `paintlayer` | `0` | `[623, 247, 9, 13]` | `91f8e5dd8e4082ea...` |
| `032 \| face/mouth/mouth_interior` | `32` | `face/mouth/mouth_interior` | `paintlayer` | `0` | `[616, 272, 24, 25]` | `a18f75ca1b35a6ff...` |
| `033 \| face/mouth/upper_teeth` | `33` | `face/mouth/upper_teeth` | `paintlayer` | `0` | `[622, 272, 13, 4]` | `26e2429bcd143815...` |
| `034 \| face/mouth/tongue` | `34` | `face/mouth/tongue` | `paintlayer` | `0` | `[616, 282, 25, 15]` | `c223da96ad8b9a7b...` |
| `035 \| face/mouth/lower_lip` | `35` | `face/mouth/lower_lip` | `paintlayer` | `0` | `[616, 281, 25, 16]` | `7dd0058d8919d17e...` |
| `036 \| face/mouth/upper_lip` | `36` | `face/mouth/upper_lip` | `paintlayer` | `0` | `[616, 271, 25, 16]` | `aed0ebf662f84053...` |
| `037 \| face/eye_right/sclera` | `37` | `face/eye_right/sclera` | `paintlayer` | `0` | `[559, 212, 45, 41]` | `fc451dacde84195c...` |
| `038 \| face/eye_left/sclera` | `38` | `face/eye_left/sclera` | `paintlayer` | `0` | `[653, 211, 45, 42]` | `d72caa4b68528233...` |
| `039 \| face/eye_right/iris` | `39` | `face/eye_right/iris` | `paintlayer` | `0` | `[569, 212, 32, 40]` | `aa2e7a03704e5dd8...` |
| `040 \| face/eye_left/iris` | `40` | `face/eye_left/iris` | `paintlayer` | `0` | `[656, 211, 31, 41]` | `d268cc95ad2a7b70...` |
| `041 \| face/eye_right/highlight` | `41` | `face/eye_right/highlight` | `paintlayer` | `0` | `[573, 218, 25, 25]` | `66cd1a3f20387fa3...` |
| `042 \| face/eye_left/highlight` | `42` | `face/eye_left/highlight` | `paintlayer` | `0` | `[660, 218, 25, 26]` | `5a967551b69f75a0...` |
| `043 \| face/eye_right/lower_eyelid` | `43` | `face/eye_right/lower_eyelid` | `paintlayer` | `0` | `[574, 250, 22, 4]` | `877075f45b106e40...` |
| `044 \| face/eye_left/lower_eyelid` | `44` | `face/eye_left/lower_eyelid` | `paintlayer` | `0` | `[662, 251, 19, 2]` | `f89e5b31902b283b...` |
| `045 \| face/eye_right/lower_eyelashes` | `45` | `face/eye_right/lower_eyelashes` | `paintlayer` | `0` | `[566, 248, 8, 5]` | `d6a03b30fa9d3c89...` |
| `046 \| face/eye_left/lower_eyelashes` | `46` | `face/eye_left/lower_eyelashes` | `paintlayer` | `0` | `[683, 248, 7, 5]` | `82c7cfb3cfc95712...` |
| `047 \| face/eye_right/eyelid_crease` | `47` | `face/eye_right/eyelid_crease` | `paintlayer` | `0` | `[565, 204, 37, 8]` | `37562c4081ad3bd9...` |
| `048 \| face/eye_left/eyelid_crease` | `48` | `face/eye_left/eyelid_crease` | `paintlayer` | `0` | `[654, 203, 36, 7]` | `3545d35cdce9bf39...` |
| `049 \| hair/front_side_hair_right::root` | `49` | `hair/front_side_hair_right` | `paintlayer` | `0` | `[612, 71, 10, 10]` | `c6aa1ff4e74f941a...` |
| `050 \| hair/front_side_hair_left::root` | `50` | `hair/front_side_hair_left` | `paintlayer` | `0` | `[631, 72, 12, 9]` | `65a3bad8b57bdd91...` |
| `051 \| hair/bangs` | `51` | `hair/bangs` | `paintlayer` | `0` | `[544, 72, 168, 148]` | `b7110e42640d1f98...` |
| `052 \| hair/front_side_hair_right::front` | `52` | `hair/front_side_hair_right` | `paintlayer` | `0` | `[518, 71, 96, 241]` | `dab13ffae0d1f096...` |
| `053 \| hair/front_side_hair_left::front` | `53` | `hair/front_side_hair_left` | `paintlayer` | `0` | `[640, 72, 97, 240]` | `4854823d0c33c11b...` |
| `054 \| face/eye_right/upper_eyelid` | `54` | `face/eye_right/upper_eyelid` | `paintlayer` | `0` | `[546, 208, 59, 36]` | `47e5fdf3aa5dcf2b...` |
| `055 \| face/eye_left/upper_eyelid` | `55` | `face/eye_left/upper_eyelid` | `paintlayer` | `0` | `[651, 208, 58, 37]` | `39136a6491d1d485...` |
| `056 \| face/eyebrow_right` | `56` | `face/eyebrow_right` | `paintlayer` | `0` | `[554, 180, 51, 13]` | `4f41045511aee4b3...` |
| `057 \| face/eyebrow_left` | `57` | `face/eyebrow_left` | `paintlayer` | `0` | `[650, 179, 52, 13]` | `ca8a5ca15e93bb83...` |

## 6. 保存重开核验与上游文件一致性检查

1. **Krita 保存与重开校验（`step01/reopen-verification.json`）**：
   - 保存路径：`/data/home/lockliu/workspaces/AstraLayering-step-models/.run/pink-doll/raster-layering/step01/character-depth.kra`（画布 `1254 × 1254`）。
   - 图层数量：保存前 `58` 层，关闭文档并重新打开后 `58` 层。
   - 图层规范检查：`all_paintlayers = True`，`no_masks_or_children = True`，`layer_mismatches = []`。
   - 整图投影像素 SHA256：保存前与重开后均为 `b2a65d9f48aa1f4c8c77cd1ab9495343ef20c0d0f690eff66852dcdd26f597ea`（`projection_identical = True`，`all_58_layers_identical = True`）。
2. **上游分层结构文件同步校验（`step01/upstream-sync.json`）**：
   - `../part-layering/groups.json`（SHA256 `249d33122ebbcba07d134eae35021d5f858f3c9c1f304dd63a630d27b17468e7`）、`../part-layering/occlusion.json`（SHA256 `e92a0e5dc3a65dd061dcbd5dd0052b9e12087f6bc6c7460a2685fe533ae05b09`）与 `../../part-layering/preview.svg` 均解析正常，55 个逻辑部件、68 个树节点与 58 个深度层序完整对应，无未决问题。
