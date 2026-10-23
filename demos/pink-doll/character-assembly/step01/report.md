# 人物与衣服穿戴组装记录

已使用 Krita 5.3.4.1 (git bd6e8d0) 完成组装、另存、关闭重开和透明 PNG 导出。画布为 1254 × 1254。

## 交付

- [可编辑工程 character-assembled.kra](character-assembled.kra)
- [透明背景合成 character-assembled.png](character-assembled.png)
- [参考图与灰／浅底合成对照](final-overall-comparison.jpg)
- [领口肩带、肩袖肘部、腰侧后发尾、裙摆局部检查](final-details.jpg)

## 调整

1. 完整保留人物素体 58 层、衣服 8 层，共 66 个原绘画层及原名称。没有拆分部件、合并图层或新增绘画层。
2. 按穿戴前后关系重新穿插排序（由后到前）：
   - 人物后层：`000 | head_accessories::root` ～ `006 | legs/leg_left/foot`（发饰、双髻、`003 | hair/back_hair`、双脚）；
   - 衣服后层：`001 | skirt/lower_tier::back`（下层裙摆后侧内折片，置于双腿后方）；
   - 人物躯干与上肢上段：`007 | legs/leg_right/leg` ～ `013 | body`（左右大腿、骨盆、颈部、左右上臂、躯干）；
   - 衣服主层：`002 | skirt/lower_tier::front`、`003 | skirt/middle_tier`、`004 | skirt/upper_tier`、`005 | shoulder_straps/right_shoulder_strap`、`006 | shoulder_straps/left_shoulder_strap`、`007 | bodice`、`008 | chest_bow`（三层前裙片由下至上叠合，肩带压住上臂肩头与躯干上缘，抹胸衣身压住上层裙腰与肩带下端，胸前蝴蝶结位于最前）；
   - 人物前层：`014 | arms/arm_right/forearm` ～ `057 | face/eyebrow_left`（前臂与双手位于裙侧前方，左右侧发 `028 | hair/side_hair_right`、`029 | hair/side_hair_left` 垂落在肩带、抹胸与上层裙面之前，头部五官与前发位于最前）。
3. 用 Krita 原生透明度遮罩收住躯干肩头越出肩带的部分及衣下胸腰侧缘，收住左右上臂在肩部荷叶边外侧及腋侧的多余露肤，并将后发在双臂与裙侧负空间内多余外露的补全发尾收起；原素体与后发内容完整保留。
4. 在原有 `005 | shoulder_straps/right_shoulder_strap` 与 `006 | shoulder_straps/left_shoulder_strap` 顶端局部补画 4 像素肩带布面与上沿深色轮廓线（`y=349..354`），使肩带上口与素体 `013 | body` 的肩线齐平衔接；在原有 `011 | arms/arm_right/upper_arm` 与 `012 | arms/arm_left/upper_arm` 下段（`y=460..541`）局部修顺肘部外沿线与内侧暗部过渡，消除上臂与前臂交界处的色阶断层。其余 62 个原绘画层像素保持完全未改动。

## 透明度遮罩

共 4 个 Krita 原生 `transparencymask`，保存时全部开启。在 Krita 图层面板展开对应部件并点击遮罩眼睛图标即可关闭并恢复完整原部件。

| 用途 | 所属部件 | 遮罩名称 | 数量 |
| --- | --- | --- | ---: |
| 收起双臂与裙摆之间负空间的多余补全后发尾 | `003 \| hair/back_hair` | `穿戴｜收起裙侧多余后发尾（保留原发束）` | 1 |
| 右肩荷叶边外侧收边、腋侧与肘部交界遮挡 | `011 \| arms/arm_right/upper_arm` | `穿戴｜右肩袖外露收边与腋侧遮挡（关闭恢复素体）` | 1 |
| 左肩荷叶边外侧收边、腋侧与肘部交界遮挡 | `012 \| arms/arm_left/upper_arm` | `穿戴｜左肩袖外露收边与腋侧遮挡（关闭恢复素体）` | 1 |
| 肩带外侧肩头收边及胸腰下部收入衣内 | `013 \| body` | `穿戴｜肩部外露与胸腰侧缘收入衣内（关闭恢复素体）` | 1 |

遮罩仅控制显示透明度，不删除对应绘画层的原像素；后续调整姿态或衣片位置时可随时重绘或开关遮罩。

## 验收

- 已对照简化穿衣角色参考图检查全身比例、领口与肩带、肩部荷叶边与肘部衔接、双臂与裙侧后发尾负空间、双手与裙边穿插、裙摆前后片与大腿交界，并以深底、灰底、浅底核对透明合成效果。
- KRA 另存后已关闭并重新打开，重开前后的整幅合成像素 SHA-256 完全一致（`4532fdef1b4a63556c6615a1f7560a18d309666cf3f1e8a13e9c173a4c2b09cc`）。
- 逐一关闭再启用 4 个透明度遮罩，均确认合成画面发生预期遮挡变化，重新启用后完全恢复原合成。
- 重开文件含 66 个 `paintlayer` 和 4 个 `transparencymask`，全部处于开启状态；导出的 RGBA PNG（`1254 × 1254`）与 KRA 内置 `mergedimage.png` 逐像素完全一致，背景全透明。
- 两份输入 KRA 工程保持只读未改动。详细核对数据见 [verification.json](verification.json)、[paint-preservation-audit.json](paint-preservation-audit.json) 和 [file-verification.json](file-verification.json)。

## 仍有的差异

- 上游衣服工程的三层百褶裙摆（`upper_tier`、`middle_tier`、`lower_tier`）相比参考图整体略宽、下摆略低约 15 像素，双手拇指内侧与中层裙边距离更近；本次完整保留既有衣片造型与层间连续性，未对裙片作破坏性缩放重绘。
- 素体头部、发髻、颈部锁骨线位置及大腿明暗沿用人物素体工程（相比穿衣参考图整体偏高约 5 像素，且大腿上段未烘焙裙摆投射阴影，以便后续绑定独立运动）；颈侧沿用素体柔和边缘，参考图中的白色背景外发光未纳入透明背景交付。
