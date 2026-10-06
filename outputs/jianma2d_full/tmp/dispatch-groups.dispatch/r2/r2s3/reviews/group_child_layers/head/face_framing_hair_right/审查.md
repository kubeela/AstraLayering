# head/face_framing_hair_right / 2.2 独立审查

审查身份：`group_child_layers:head/face_framing_hair_right:review`；真实 worker：`/root/review_framing_right_children`。当前候选 SHA-256：`95ebed1d661d59bc86c50d864e52f5d363c6185dfd16c8d40a112bf0467c031a`；冻结父 SHA-256：`a3bd9532b171dbea909357ccfd32ae7100f81d9b39c8a50a6d4cc1389136986f`。

已读取当前 SKILL、路由交接、2.2 流程 review 分支、review 提示词与 gpt-6-astra-xhigh.model 文件；候选与全部输入只读。以下证据均由本轮审查独立生成并实际打开，不继承制作侧的视觉结论。

最终状态：**REVISE**。3件均已独立实际核查；main_long_lock 与 chest_side_curl 通过，ear_side_flyaway 的下半弧转向和尾端不贴参考。范围检查3/3通过，但视觉不通过。

## 整图与逐件实际查看

首先实际打开 `evidence/full-context-50.png`：整图参考、候选、50%混合并排。右侧游离发束位于参考的耳侧至胸前范围；该整图仅建立上下文，后续分别排除父底稿检查，未用父色块的连续性代替孩子连接。

### 1. head/face_framing_hair_right/main_long_lock — PASS

容器 id：`part-head-face-framing-hair-right-main-long-lock`；形状 id：`part-head-face-framing-hair-right-main-long-lock-shape`。实际打开本轮新图：`evidence/main-overview-2x.png`（crop 475,238,95,365，2×）、`evidence/main-root-4x.png`（475,238,65,145，4×）、`evidence/main-middle-4x.png`（485,365,90,165，4×）、`evidence/main-tip-8x.png`（521,515,40,83，8×）。每张均只独显本 part，并有同坐标参考、50%混合和边缘叠加。

具体判断：上端约(483–487,245–254)在额前发遮挡范围内保留尖形根部；耳侧约 y280–385 的宽长束从根部连续向下，内外缘的宽度、向右缓弯与参考一致。肩前 y385–453 开始向右加速转弯，胸前 y466–515 的向外鼓弧没有折角或断裂，内侧皮肤负形留出。下段约 y530–565 回向内侧，随后向右收尖至(546,589)，方向和自由尖梢位置吻合；主束没有需要贯通的孔，耳旁及胸前细缕留待对应独立 part。未见明显漏描或外缘偏移。结论：PASS。

### 2. head/face_framing_hair_right/ear_side_flyaway — REVISE

容器 id：`part-head-face-framing-hair-right-ear-side-flyaway`；形状 id：`part-head-face-framing-hair-right-ear-side-flyaway-shape`。实际打开本轮新图：`evidence/ear-flyaway-8x.png` 和 `evidence/ear-flyaway-line-8x.png`（均 crop 490,255,50,103，8×）；发现下端转向疑点后又独立生成并实际打开 `evidence/ear-lower-turn-line-8x.png`（crop 506,300,34,58，8×）。线参考明确以相同 `--crop` 与 `--reference-crop` 裁切；未把895×1757线参考全图拉伸到895×1758。

具体判断：上根(497,264)位于额前发遮挡下，允许与主束独立伸出；与主束间的透明负形也应保留。问题在可见下半弧：参考在约(532,320)至(529,329)附近转为向左下回收，并沿约(526,338)、(525,340)、(521,344)继续向左下渐尖，末端约在(514,348)的细线渐隐区（局部像素校准见下文）。候选却把最外鼓弧及回收放得更低，约 y334–346 仍占 x529–534，最后收于(530,348)，并在(529,342)产生一个可见拐角。8×参考/混合/edge-overlay中，参考左下弯尾在候选左侧露出，候选短钩落到后发边线附近。实际末段方向、长度、宽度均不对；不能以其与冻结父原文相同替代参考贴合。

需原制作身份按参考修正耳飞弧约 y310–350 的外弧转向及渐尖末端，保留上根遮挡关系和真实负形，不把耳飞弧硬接至主束。若正确向左下延长后超出冻结父范围，应先交回父级轮廓补全，再重新冻结和检查，不能裁短真实尾端以求包含通过。结论：REVISE。

### 3. head/face_framing_hair_right/chest_side_curl — PASS

容器 id：`part-head-face-framing-hair-right-chest-side-curl`；形状 id：`part-head-face-framing-hair-right-chest-side-curl-shape`。实际打开本轮新图：`evidence/chest-curl-8x.png`、`evidence/chest-curl-line-8x.png`（crop 530,438,45,83，8×）。两图只独显本 part，有同坐标参考、50%混合与边缘叠加；线参考明确使用相同坐标裁切。

具体判断：上端(538.8,446.5)渐尖，沿胸前主束外侧向右下舒展，最大外鼓在 x562–563,y490–497 附近，随后向左下回到约(551,512)。可见外侧轮廓、细弧宽度和回收方向贴近参考，曲率平滑；末端为进入主束搭接区的短接界，不要求作为自由尖梢。参考与候选均为右侧特有细弧；上端与主束分离，应保留窄缝，不能套用左侧两端连接形态。弧内皮肤负形在独显下完全透明，无错误封孔或漏段。结论：PASS；下端与主束的实际连接另在去父组合复核。

## 去父组合、连接与真实负形

实际打开 `evidence/children-no-parent-overview-2x.png`、`evidence/children-no-parent-root-4x.png`、`evidence/children-no-parent-chest-8x.png`、`evidence/children-no-parent-chest-checker-8x.png`。这些图只选择本轮三孩子 id，不包含 `head` 或 `group-head-face-framing-hair-right` 的任何父底稿，也没有其他兄弟填底。

根部：主束和耳旁飞弧分别进入额前发遮挡范围，独立渲染有真实空隙；独立8×alpha采样与 front_hair 的搭接分别为210.9375px²和15.828125px²，见 `coverage-independent.json`。不要求把耳旁飞弧的自由下梢接到主束。当前组合没有因为父底稿遮盖而隐藏的接缝；耳旁下端仍保留第2项所述形态问题。

胸前：上端(538.8,446.5)与主束之间的狭窄透明分离缝清楚可见，不能填掉。弧内背景区域保持透明。下端在去父组合中真实进入主束，没有白缝；本轮独立8×、alpha≥128相交采样得到2.09375px²搭接，bbox为(550.25,510.75)–(551.875,513.125)。棋盘图可直接核对该搭接与弧内透明区。胸前连接：PASS。

三个孩子与冻结父渲染在本组完整范围(475,230,100,375)的8×alpha逐像素相同，差异0；该事实只证明当前拆分没有漏掉冻结父几何，不能证明冻结父耳弧贴参考。返修时也不能把旧错误父色块未被孩子覆盖自动判作漏描；以真实参考归属为准。

## 耳尾父范围的局部证据与返修路由

实际打开额外新图 `evidence/frozen-parent-ear-lower-line-8x.png`（crop 506,300,34,58，8×），仅独显当前冻结父，参考与SVG保持同坐标。真实向左下回收的尾迹落在当前主束右缘与旧耳钩左缘之间的透明区，不能全由现有 main_long_lock 范围容纳。

视觉发现后使用同坐标参考像素进一步校准尾迹位置，见 `ear-tail-parent-gap-samples-refined.json`。冻结父对以下参考尾迹像素所对应的整个8×8采样块，alpha均为0：(528,336)、(526,338)、(525,340)、(521,344)、(518,346)；末端(514,348)的alpha仅0–5，64个采样均低于128。它们不是依据旧错误钩形反推的待填区域，而是在实际参考与新叠加图上核准的左下尾迹。

初次宽区间末端灰度搜索误选了主束边线(511,348)；其父alpha255与真实尾迹无关，已在 refined 文件明确排除。初次采样文件保留，未改写历史。视觉初判的近似坐标现以上述校准点为准。

据此当前冻结父有真实局部缺口，需要由总控交原制作身份重新打开父级轮廓补全，仅依参考修正本侧耳弧的下半弧与左下渐尖尾，再重新冻结父、绘制对应孩子并复跑包含检查。主束和胸前细弧本轮结论为PASS，应严格保护；不扩大无参考依据的区域，不补死真实空隙，不继续2.3。上述坐标是缺口证据，不是要求机械连成最终路径。

## 独立范围检查与保护

`containment-independent.json` 由审查者对2.2/input/groups.svg冻结父、当前标准候选、当前树重新运行默认检查得到：scale=4、alpha_threshold=128，全部3个直属part PASS，outside_samples全部0。工具通过与视觉结论分开。

`protection-independent.json` 独立比对：原163个id元素含尾随空白均未改变或删除；新增恰为3个part容器及3条闭合path，合计169 id全局唯一。原文件闭合标签前的完整字节前缀保留，root属性相同，当前父三条原曲线d与各孩子d分别原文一致。其他兄弟及左侧3 part原文保留，左侧专项281文件SHA全部保持。树、两张参考、formal `refinement/character.svg` 与registry `structure/rendering.json`的SHA均与制作前快照一致。审查前后全部输入SHA再次一致，见 `final-input-verification.json`。

本轮未修改候选、冻结父、树、formal、registry、技能、状态、cursor或其他worker产物，未推进2.3。命令和图像清单保存在本审查目录；本轮所有预览和默认范围检查均成功。制作侧发布前失败历史保持原样，不作为当前通过依据。

## 最终逐件表

| 完整路径 | 容器id | 结论 | 未解决项 |
| --- | --- | --- | --- |
| head/face_framing_hair_right/main_long_lock | part-head-face-framing-hair-right-main-long-lock | PASS | 无 |
| head/face_framing_hair_right/ear_side_flyaway | part-head-face-framing-hair-right-ear-side-flyaway | REVISE | 约y310–350外弧转向及左下渐尖尾偏差；真实尾迹有超冻结父范围证据，须父级局部修正后重验 |
| head/face_framing_hair_right/chest_side_curl | part-head-face-framing-hair-right-chest-side-curl | PASS | 无；上端分离、下端搭接均确认 |

整体：**REVISE**。不批准进入2.3。本轮有且仅有上述耳侧形态/对应父局部缺口一项待返修；不确定而无法核对的项目：无。结论对应候选SHA-256 `95ebed1d661d59bc86c50d864e52f5d363c6185dfd16c8d40a112bf0467c031a`，冻结父SHA-256 `a3bd9532b171dbea909357ccfd32ae7100f81d9b39c8a50a6d4cc1389136986f`。


---

# 2.2 局部返修复验 — 第1轮追加

本追加保留上文REV1全文及历史结论；该历史报告SHA为 `80de403721cdf41c859449f80715ec3de60048b1b9229a558a8471b5cb7cfe3a`，对应旧候选 `95ebed1d661d59bc86c50d864e52f5d363c6185dfd16c8d40a112bf0467c031a`。审查身份仍为 `group_child_layers:head/face_framing_hair_right:review`，真实worker `/root/review_framing_right_children`。

本轮候选SHA：`51e519e09881b5eec6c7b4f15d7d4a6b60cc63fa416810bbb8bc94faadb9a694`；新冻结右父输入 `2.2.直属轮廓色块/返修-01/input/groups.svg` 的SHA：`e2d8966bb6e8ebca25fd4ed4ce291ce7a0b76bee26b5b944b81c1218a0073bc3`。已重读当前2.2 YAML/review分支、review提示词/model和最新group-route-instructions。本轮新证据集中在本报告旁 `复验-01/`；先实际打开新整图50%混合 `复验-01/evidence/full-context-50.png` 建立上下文，再看改动耳弧。

## 已通过对象的明确继承

`head/face_framing_hair_right/main_long_lock` / `part-head-face-framing-hair-right-main-long-lock`：继承REV1第1项PASS及其4张实际看图记录。`head/face_framing_hair_right/chest_side_curl` / `part-head-face-framing-hair-right-chest-side-curl`：继承REV1第3项PASS、真实上端分离及下端搭接结论。本轮独立证明这两个完整容器含属性、内容、几何和尾随空白均与REV1候选相同；全SVG只把已批准右父耳曲线d和耳孩子d改变，其外全部原始字节一致。见 `复验-01/protection-independent.json`。不声称本轮重新逐件打开这两件的旧局部图；受影响组合另用本轮新图复验。

## 改动对象：head/face_framing_hair_right/ear_side_flyaway — PASS

容器id：`part-head-face-framing-hair-right-ear-side-flyaway`；形状id：`part-head-face-framing-hair-right-ear-side-flyaway-shape`。实际新看图：`复验-01/evidence/ear-base-8x.png`、`复验-01/evidence/ear-line-8x.png`（crop 490,255,50,103，8×）；`复验-01/evidence/ear-turn-tip-line-8x.png`（crop 506,300,34,58，8×）。均只独显该part，对照原色或线参考、50%混合及edge-overlay；线参考显式使用与SVG crop完全相同的reference-crop，没有整图拉伸。

上根(497,264)及上半弧保持原文，继续从额前发遮挡区单独伸出。新下弧在约(533,314)后向右略鼓，约y326–332开始向左下转；沿参考经过约(528,336)、(525,340)、(521,344)，连续渐尖到(513.8,348.4)。本轮新图实际显示原来偏右向下的宽钩和(529,342)拐角已去除；新尾形沿参考左下弯尾，外缘位置、方向、宽度渐变和尖端均可核对。尾迹没有被裁回旧父缺口，没有多余短钩或明显漏段。弧内透明负形保留，上根不要求与主束可见边相连。结论：PASS；与主束的真实间隙在新去父组合继续核对。

## 本轮去父组合实际复验 — PASS

独立生成并实际打开 `复验-01/evidence/children-no-parent-overview-2x.png`（475,238,100,365，2×）、`复验-01/evidence/children-no-parent-root-4x.png`（475,238,75,125，4×）、`复验-01/evidence/children-ear-tail-line-8x.png` 与 `复验-01/evidence/children-ear-tail-checker-8x.png`（506,300,34,58，8×）。四张均只选择三个孩子，不含head底稿、当前右父底稿或其他兄弟。

实际组合中，新耳弧从上根连续穿过外侧鼓弯，向左下渐尖后靠近主束外缘；没有填缝片或强接桥，没有由父底稿托住的缺口。耳弧中间与主束之间的真实透明区保留；自由尖梢不要求与主束有搭接。独立8×alpha≥128采样确认ear/main交叠0，孩子自身组合的raw alpha与新冻结右父逐像素相同，见 `复验-01/coverage-independent.json`。胸前组合整体仍保持原上端分离、下端连接，未受耳弧修改影响；下端2.09375px²搭接本轮采样保持。main与chest的局部视觉PASS按前述严格字节证明继承，组合检查不冒称重做它们的完整单件审查。

## 新冻结范围、上级绑定及保护 — PASS

审查者重新运行默认 `svg_containment`，使用本轮明确的e2d8966…冻结右父与51e519…候选，以及当前structure/groups.json，对全部3个直属part检查。`复验-01/containment-independent.json`：scale=4、alpha_threshold=128，3/3 PASS，outside_samples全部0。命令、返回码和标准输出原样记录于 `复验-01/commands.jsonl`；本轮8次预览及1次范围检查全部返回0。

已读取上一父节点的approved ancestor binding与上级包含报告。新已批准head输入SHA为 `5e0b95940c5c8dcd306a72ccb49cf7e396f3154afc8959bdfb6632052c2c240f`；其专属r2s10序列的补全由总控核准，上一节点上级包含报告中right父outside_samples=0。绑定要求本D保留旧head字节，由独立head序列在aggregate中发布；本复验遵守此绑定，没有把旧head拷入新补全，也没有改写head。这是已核准上级关系的引用，当前2.2独立复跑范围仍明确针对新冻结右父e2d8966…。

本轮独立原始字节比对：从REV1旧候选到当前候选只改变 `head-framing-right-loop` 的d及 `part-head-face-framing-hair-right-ear-side-flyaway-shape` 的d，其外全SVG字节相同；从新冻结右父到当前候选只有耳孩子d改变；新耳孩子整条d与校准父耳d完全相同。未新增/删除id，169个id唯一。main/chest完整容器及尾随空白一致，root、资源、旧head、其他兄弟和全部原始属性受保护。左侧281文件重新核验全无变化；旧REV1报告仍是当前报告的逐字节前缀，旧图证及记录全无变化。

本轮审查前后候选、冻结右父、旧候选、approved head、binding、树、两张参考、formal及registry的SHA全部一致，详见 `复验-01/final-input-verification.json`。本轮只写审查目录及原报告追加，未修改制作SVG、状态、cursor或技能。旧失败和旧REV1结论全部留存。

## 当前候选最终逐件结论

| 完整路径 | 容器id | 当前结论 | 证据方式 |
| --- | --- | --- | --- |
| head/face_framing_hair_right/main_long_lock | part-head-face-framing-hair-right-main-long-lock | PASS | 严格字节不变，明确继承REV1第1项；新去父组合复验 |
| head/face_framing_hair_right/ear_side_flyaway | part-head-face-framing-hair-right-ear-side-flyaway | PASS | 本轮3张独显原色/线参考8×新图实际复验，原下弧/尾尖问题已解决 |
| head/face_framing_hair_right/chest_side_curl | part-head-face-framing-hair-right-chest-side-curl | PASS | 严格字节不变，明确继承REV1第3项；新去父组合及2.09375px²搭接复核 |

**当前整体结论：PASS。** 原REV1的耳下弧转向/尖梢及其对应父局部缺口已由校准父与当前正确孩子解决，无剩余返修项、未决项或blocked项。独立视觉判断和范围检查均通过；本轮未执行2.3，由总控继续调度。

本PASS仅绑定当前候选SHA-256 `51e519e09881b5eec6c7b4f15d7d4a6b60cc63fa416810bbb8bc94faadb9a694`，新冻结右父SHA-256 `e2d8966bb6e8ebca25fd4ed4ce291ce7a0b76bee26b5b944b81c1218a0073bc3`。本轮8张新图的实际查看清单及SHA保存在 `复验-01/actual-image-evidence.json`。
