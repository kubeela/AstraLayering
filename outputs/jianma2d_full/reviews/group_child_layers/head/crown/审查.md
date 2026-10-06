# head/crown 直属轮廓色块独立审查

审查身份：`group_child_layers:head/crown:review`。候选只读；所有新证据写在本目录。

冻结候选：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s5/block-layers/groups.svg`

候选 SHA-256：`725c8bf919232c080741c05bcdcb53eec841f122437f0d5e0324a8ab24f1faa4`。

已读当前 2.2 流程 YAML、review 提示词及 `gpt-6-astra-xhigh.model`、group-route-instructions.md、结构树、范围报告。范围报告为 4×/alpha128，5/5 pass、越界 0；这仅证明父范围容纳，不替代以下逐项视觉审查。

原色 895×1758；线稿 895×1757。所有局部参考均显式同坐标 reference-crop，未整图拉伸。以下图由本审查身份从冻结候选新渲染。实际查看后逐项追加。

## 1. head/crown/wing_ornament_left — revise

- 容器：`group-head-crown-wing-ornament-left`；形体：`head-crown-wing-ornament-left-left`、`head-crown-wing-ornament-left-left-scroll`、`head-crown-wing-ornament-left-hidden-anchor-left`。
- 实际查看新图：`evidence/wing_ornament_left-color.png`、`evidence/wing_ornament_left-line.png`（crop 275,30,130,130，4×）；`evidence/left-root-color.png`、`evidence/left-root-line.png`（crop 357,102,50,45，8×）。每张均含独显/参考/混合/外缘叠加，局部参考 crop 明确一致。
- 左外卷钩的尖端、圆孔、上方小水滴孔、向上角尖、下卷带的长背景孔已保留；形状有左右实际差异。原色可见外轮廓大体贴合；线稿局部与原色有偏差，以原色校准可见外缘。隐藏安装根 `(385–398,127–140)` 延入前发，未填住下卷背景孔。
- **需修复：内侧小横梁与竖翼之间有真实透明细缝。** 在 `(376–377,120–124)`，主翼 `...-left` 的右边界约 x376 附近，而 `...-left-scroll` 的小梁从 `M 377 120` 到 `...377 124` 开始，形成约 1 原图像素宽、约 4 像素高的透明竖缝。8× 的 `left-root-color.png` / `left-root-line.png` 候选格可直接看到；原色中小梁连续连入竖翼，不能把它视为真正背景孔。去父组合仍有该缝，父 alpha 与孩子相同不能证明这里正确。
- 范围：pass（已提供范围报告该对象 0 越界）。参考与连接：**revise**。此缝继承自冻结父几何，若补连接超出冻结父范围，应按流程交回父轮廓补全，不可保留断裂后继续宣称视觉 pass。

## 2. head/crown/wing_ornament_right — revise

- 容器：`group-head-crown-wing-ornament-right`；形体：`head-crown-wing-ornament-right-right`、`head-crown-wing-ornament-right-right-scroll`、`head-crown-wing-ornament-right-hidden-anchor-right`。
- 实际查看新图：`evidence/wing_ornament_right-color.png`、`evidence/wing_ornament_right-line.png`（crop 470,30,130,130，4×）；`evidence/right-root-color.png`、`evidence/right-root-line.png`（crop 468,102,50,45，8×）。
- 右翼外卷尖、内外转折、上圆饰、斜椭圆负孔、水滴小孔与下卷长背景孔均存在；外侧各尖梢方向与原色相符。右侧隐藏根 `(474–487,128–140)` 接入内侧小梁，延入前发，没有把卷带间背景填实。
- **需修复：右翼也有内侧小横梁与竖翼之间的透明竖缝。** 位置约 `(495–496,120–124)`；8× 的 `right-root-color.png` / `right-root-line.png` 候选格显示小梁右边的平直断口和其右侧竖翼之间约 0.8–1.0 原图像素宽的棋盘格。原色这里是连续金属连接。该处不是真正的镂空孔，父与孩子复制相同路径不会消除问题。
- 范围：pass（0 越界）。参考与连接：**revise**。处理同左翼；若真实桥接需要越出冻结父，先交回父补全。

## 3. head/crown/forehead_chain — pass

- 容器：`group-head-crown-forehead-chain`；形体：`head-crown-forehead-chain-mid-chain`、`head-crown-forehead-chain-mid-gems`。
- 实际查看新图：`evidence/forehead_chain-color.png`、`evidence/forehead_chain-line.png`（crop 416,110,40,118，8×）；组合接头 `evidence/crest-chain-root-color.png`、`evidence/crest-chain-root-line.png`（crop 417,104,39,43，8×）。
- 从链首到末端逐段查看：上方小菱饰、中段长菱饰、额前最大菱饰、末端小坠四枚均在；大小与排序、各自尖端方向和中心线位置与原色相符。四段窄链均接到相邻饰面，没有中途断开或孤立末端。当前为轮廓色块，宝石边框和细节线在后续阶段处理。
- 链首向上进入中央饰面，去父组合可见橙色链首与紫色蓝饰有实重叠，未出现透明断缝。紫色中央宽背根属于 center_crest，不能视为可见的粗链；forehead_chain 需在前发可见面前显影，中央背根在前发后。已记录这个后续显影顺序要求。
- 范围：pass（0 越界）。本节点可见轮廓与连续性：**pass**。

## 4. head/crown/arch_band — revise

- 容器：`part-head-crown-arch-band`；形体：`head-crown-arch-band-arch`。
- 实际查看新图：`evidence/arch_band-color.png`、`evidence/arch_band-line.png`（crop 355,10,160,70，4×）；`evidence/arch-thin-top-color.png`、`evidence/arch-thin-top-line.png`（crop 384,10,103,30，8×）；两端 `evidence/arch-left-joint-color.png`、`evidence/arch-left-joint-line.png`（crop 350,25,55,50，8×）与 `evidence/arch-right-joint-color.png`、`evidence/arch-right-joint-line.png`（crop 475,20,55,60，8×）。
- 两端与左右翼饰有真实重叠，无贯通透明白缝；弧顶连续，未漏掉整段梁，左右端部也未裁断。顶部白色高光是实体内部亮面，不应挖透明孔。
- **需修复：冠梁两肩的细可见外缘没有贴合原色。** 顶部中央大致贴合，但向两侧下降时，候选弧带向圆弧内侧/下方偏移。尤以右肩约 `(466–501,22–57)` 可见：原色的上侧细蓝外缘在候选 magenta 外缘外仍完整露出，候选下缘已进入冠内白背景；左肩约 `(374–402,30–62)` 也有同向偏差。局部偏移从约 2 原图像素发展到右肩约 6–7 像素，已接近或超过这条窄梁自身的宽度，不能只用全图外观判合格。`arch-thin-top-color.png` 和两端 color 放大直接显示这一点。
- 线稿的整条冠梁比原色位置更高，差异大于原色对照；不能按线稿把原色整体强移。但上述 revise 判断基于原色本身的外缘与候选叠加，而非仅线稿差异。应按原色重新核对窄梁外/内边，不把材质中间暗线当整体轮廓。补充实际曲线坐标（`evidence/arch-bezier-columns.json`）：在 x475，候选 y28.449–33.794，原色可见带约 y25–32；在 x490，候选 y40.590–46.657，原色可见带约 y34–42。该数值是已查看原色叠加后的辅助定位，不作为替代视觉证据。
- 范围：pass（0 越界）。可见窄梁外缘：**revise**。现有父也使用同一弧线，需要遵守冻结父规则；必要时返回父轮廓校准后再同步孩子。

## 5. head/crown/center_crest — pass

- 容器：`part-head-crown-center-crest`；形体：`head-crown-center-crest-jewel`、`head-crown-center-crest-hidden-anchor-center`。
- 实际查看新图：`evidence/center_crest-color.png`、`evidence/center_crest-line.png`（crop 382,60,110,80，4×），及前项已实际看的 `evidence/crest-chain-root-color.png` / `evidence/crest-chain-root-line.png`（8×）。
- 主体顶尖位于参考中央；两侧展开瓣尖、凸出的左右侧瓣和下方沿前发的接界均已包含。中央蓝饰与发髻边界区分清楚，没有把上方发髻外轮廓并进当前孩子。主轮廓与原色莲瓣形饰面位置、宽度相符；内部各瓣分界、金属细线和宝石高光在后续细化。
- 约 `(430–442,121–131)` 的短圆背根是补全隐藏安装部分；形体与主饰连接，未归给额前链。最终组合须使这条背根被 `head/front_hair` 遮挡，但保留中央饰面约 `(389–484,70–123)` 可见主体，不能为了藏根把整件中央蓝饰后置到发髻后。额前链在前发前显影。
- 范围：pass（0 越界）。本节点主轮廓、隐藏安装根和链首连接：**pass**。

## 去父组合、范围复核及总判定

实际查看 `evidence/full-blend.png`，检查整图原色、候选与 50% 混合；然后查看 `evidence/children-only-checker.png`、`evidence/children-only-color.png`、`evidence/children-only-line.png`（crop 275,10,325,220，4×）。这三图只显示五个直属孩子，明确排除 `group-head-crown`、上一级 head 和其他对象。两翼真实镂空、长卷纹孔和冠梁下大面积背景仍透明，中央饰面与细链实接；但左右小横梁的两条细竖缝在组合中仍存在。把父加回来或引用父/孩子 alpha 一致均不能消除这个参考连接错误。

三处隐藏根均已分别在 8× 左根、右根、中央根图里查看：隐藏延续有归属，没有重复当成额链或两侧长垂带。后续前发遮挡关系必须保留，尤其 center_crest 背根在前发后、forehead_chain 在前发前。

为定位两条缝，另外新渲染并实际查看了透明底 `evidence/left-gap-alpha.png`（crop 373,118,8,10，8×）和 `evidence/right-gap-alpha.png`（crop 491,118,8,10，8×）。y122.4375 采样横线上，左边 x376.1875…376.9375、右边 x495.0625…495.8125 的采样中心 alpha 为 0；两者各有 7 个连续 8× 样点（0.875px 采样宽）完全透明。这是已看见的断缝的辅助确认，不以数值代替对参考的判断。

本审查另行用当前候选、当前结构、冻结父输入重跑范围检查：`evidence/independent-containment.json`，默认 4×/alpha128，5/5 pass、各对象 outside_samples=0。`evidence/independent-verification.json` 还确认当前完整 guide 与制作 candidate 字节一致，重复 id 为 0。父范围 pass 与参考连接 revise 分开记录。

| 完整路径 | 范围 | 视觉结论 |
| --- | --- | --- |
| `head/crown/wing_ornament_left` | pass | revise：内侧小横梁透明连接缝 |
| `head/crown/wing_ornament_right` | pass | revise：内侧小横梁透明连接缝 |
| `head/crown/forehead_chain` | pass | pass |
| `head/crown/arch_band` | pass | revise：两肩窄弧带偏入内侧，原色细外边漏描 |
| `head/crown/center_crest` | pass | pass |

**整体：REVISE（5 项审完，2 pass / 3 revise）。** 不进入后续 2.3/geometry。返修由原制作身份处理；三项问题都可追溯到被冻结父路径，若修复超出父范围，应由总控回到父轮廓补全/校准，再依新冻结父重做受影响孩子，保留本报告并追加复验。不能借“父已经批准”或“copy 父 d”把目前发现的具体断缝/错位忽略。

最终结论对应实际当前候选 SHA-256：`725c8bf919232c080741c05bcdcb53eec841f122437f0d5e0324a8ab24f1faa4`。候选和输入未修改；未修改 state/tree/cursor，未创建其他 agent。新渲染调用与文件路径见本目录 `evidence/render-manifest.json`；全部新证据位于 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s5/reviews/group_child_layers/head/crown/evidence/`。

---

# 返修 01 独立复验追加（原报告全文保留）

继续使用身份 `group_child_layers:head/crown:review`，本追加真实审查作者 `/root/review_crown_children`。本次开始已重读当前 2.2 YAML、review 提示词、`gpt-6-astra-xhigh.model`、ROOT/group-route-instructions.md，读取当前树、标准范围报告、返修 input/manifest 与 protection。原报告 SHA 为 `4ef82cac2cb9d8befced19663d9126ceb74dc1aa9fd497634ea36dfaeef85518`，另只复制原报告单文件至 `recheck-01/original-report.md`，以下仅追加，保留原 725c8… 对应的 2 PASS / 3 REVISE 历史。

本次实际候选：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s5/block-layers/groups.svg`，SHA-256 `b58f4f5abb0fd0c8aac0041c7f161e705a7a65d9e1b14e7220601323835f9ede`。

本次范围父是已批准、真正冻结的 `refinement/groups/head/crown/2.直属拆分与色块/2.2.直属轮廓色块/返修-01-approved-parent-sync/input/frozen-parent.svg`，SHA-256 `07bd7b008a8afc0c79453316638dca5e810082ada6ef465a73d5b93d89489f9d`。不使用旧 725c8… 父，不使用外部 head 的 f4a95e… 代替 crown 父。

新增独立图证均在本报告同目录 `recheck-01/`。原色为895×1758，线稿为895×1757；所有局部原色/线稿均使用与 SVG 一致且明确的 `--reference-crop`。已首先实际查看新渲染 `recheck-01/full-blend.png` 和去父组合 `children-only-checker.png`、`children-only-color.png`、`children-only-line.png`。以下再逐项独显与放大检查并即时追加。

## 返修 01 / head/crown/wing_ornament_left — PASS

- 容器 `group-head-crown-wing-ornament-left`；本次改动路径 `head-crown-wing-ornament-left-left-scroll`。主翼与隐藏根路径仍为 `head-crown-wing-ornament-left-left`、`head-crown-wing-ornament-left-hidden-anchor-left`。
- 本次实际查看独立新图：`recheck-01/left-child-color.png`、`recheck-01/left-child-line.png`（275,30,130,130，4×），`recheck-01/left-root-color.png`、`recheck-01/left-root-line.png`（357,102,50,45，8×，仅五孩子的组合）。
- 原 `(376–377,120–124)` 透明竖缝已消失，小横梁与竖翼形成真实填充连接；上下边从翼身接入横梁，无旧稿的平直孤立断口。候选格和参考叠加均可确认，不依赖 crown 父底色。补桥只占原断缝，横梁下通往下卷的背景开口仍然透明。
- 复查左上圆饰、椭圆孔、水滴孔、外卷钩开口、尖梢、下卷长孔与内侧隐藏安装根：均保留，无补桥导致孔洞变实、截尖或新增断裂。原色可见外形延续此前通过部分；线稿与原色已有的位置差异没有被误用作整体移位依据。
- 默认4×当前07bd父范围：PASS、outside_samples=0。可见轮廓与修复连接：**PASS**，原该项 REVISE 已解决。

## 返修 01 / head/crown/wing_ornament_right — PASS

- 容器 `group-head-crown-wing-ornament-right`；本次改动路径 `head-crown-wing-ornament-right-right-scroll`。主翼与隐藏根路径仍为 `head-crown-wing-ornament-right-right`、`head-crown-wing-ornament-right-hidden-anchor-right`。
- 本次实际查看独立新图：`recheck-01/right-child-color.png`、`recheck-01/right-child-line.png`（470,30,130,130，4×），`recheck-01/right-root-color.png`、`recheck-01/right-root-line.png`（468,102,50,45，8×，去父孩子组合）。
- 原 `(495–496,120–124)` 小横梁右端与竖翼之间的透明竖缝已闭合。右端进入竖翼，候选格实际连续，外缘叠加与原色金属桥接相符；父容器未出现在此图，不存在父底色代填。
- 右侧斜椭圆孔、细水滴孔、外卷圆开口、分叉角尖、下层卷带长孔和根部大背景开口保持透明与原有转向；补桥没有横跨这些真孔。右隐藏根仍延入前发，左右实际几何差异保留。
- 默认4×当前07bd父范围：PASS、outside_samples=0。可见轮廓与修复连接：**PASS**，原该项 REVISE 已解决。

## 返修 01 / head/crown/arch_band — PASS

- 容器 `part-head-crown-arch-band`；改动路径 `head-crown-arch-band-arch`。
- 本次实际查看新图：`recheck-01/arch-child-color.png`、`recheck-01/arch-child-line.png`（355,10,160,70，4×）；`recheck-01/arch-top-color.png`、`recheck-01/arch-top-line.png`（384,10,103,30，8×）；`recheck-01/arch-left-color.png`、`recheck-01/arch-left-line.png`（350,25,55,50，8×）；`recheck-01/arch-right-color.png`、`recheck-01/arch-right-line.png`（475,20,55,60，8×）。三处放大均只显示五孩子，排除父底稿。
- 从弧顶沿左右两肩到翼饰逐段查看原色：当前外缘沿原色最外细蓝边，内缘沿暗蓝带底边，完整包含中间白高光。旧右肩 x475、x490 的整体向内/下偏移已消除；左肩也贴回窄带外缘，没有保留整条原色边在候选之外。宽度过渡连续，弧顶不塌、不漏段。
- 两端独显时为分件端面，组合中与左右翼饰实重叠，端面被连接区容纳；去父组合无透明楔缝、白线或伸入冠内背景的旧台阶。翼饰角尖仍在，冠梁内的大背景保持透明。
- 同坐标线稿整条冠梁仍较原色偏高，此为已知参考差异；本结论按原色可见边缘成立，没有把线稿高位当成新的修改目标，也没有用父几何复制证明代替看图。
- 默认4×当前07bd父范围：PASS、outside_samples=0。原色可见轮廓、窄带宽度与两端连接：**PASS**，原该项 REVISE 已解决。

## 返修 01 / 两项未改变对象的明确继承

本轮没有重新逐项独显审查以下两对象。独立字节核验以原审 725c8… 历史候选和当前 b58f4… 候选为两端，完整容器原文严格相同，故继承本报告初审各自的实际逐项图证与 PASS；并在本次五孩子组合中查看其受影响关系未发生变化。

| 完整路径 | 容器 id | 本次结论依据 | 容器原文 SHA-256 |
| --- | --- | --- | --- |
| `head/crown/forehead_chain` | `group-head-crown-forehead-chain` | 继承原第3项 PASS；完整容器字节不变；当前默认范围 PASS | `c2acb4d9063e7fb1315e77ea0cd6172ee9082a7beba4adcf4f071616b4677df8` |
| `head/crown/center_crest` | `part-head-crown-center-crest` | 继承原第5项 PASS；完整容器字节不变；当前默认范围 PASS | `e7fbdbdde4d28e98e5ed80fc03491fe6d53495aa4f495a5914f27c62767c5a8a` |

原图证为 `evidence/forehead_chain-color.png`、`forehead_chain-line.png`、`center_crest-color.png`、`center_crest-line.png` 与 `crest-chain-root-color/line.png`。本次不把这些历史图片写成新查看记录。原前后关系要求继续有效：center_crest 安装背根藏在前发后、中央主饰面保持可见；forehead_chain 在前发前。

## 返修 01 / 组合、范围、保护与最终结论

本次实际打开20张独立新渲染，清单与调用参数在 `recheck-01/render-manifest.json`。去父 `children-only-checker.png`、`children-only-color.png`、`children-only-line.png` 只包含五直属孩子：两端冠梁与翼饰、两处内桥均由孩子本身连接；原真实负孔、卷带间隙和冠内背景仍透明。中央蓝饰/额链关系在组合中保持，未发现修复引入的新断裂、错位或填孔。

独立范围检查使用上文当前07bd冻结父和b58f4候选、当前树，以默认4×/alpha128重新执行，结果 `recheck-01/independent-containment.json`：**五直属全部 PASS，outside_samples 全为0**。这与三项实际参考图复验分别成立。

保护复核见 `recheck-01/independent-protection.json`、`recheck-01/readonly-and-history-proof.json`：

- 从新冻结父全文替换三条孩子路径后可精确恢复当前候选全文；三个路径除 d 外的属性相同，其余全部字节不变。当前 crown 父11条路径完整原文保持；父/孩子六条隐藏根相对新父和原725候选均原文不变。
- 两个继承PASS孩子完整容器与原725候选逐字节相同，哈希列于上表。重复id为0。
- 候选、冻结父、原候选、树、渲染登记、正式稿、两张参考、标准范围报告和maker返修清单/保护文件在本审查前后哈希均相同。
- 本报告旧全文是当前报告的精确字节前缀；原33个其他审查文件完整保持。本次仅在D/reviews下新增证据/脚本并追加本报告，没有修改SVG、tree、formal、registry、cursor或state，没有创建其他agent，没有进入2.3。

| 完整路径 | 当前范围 | 当前视觉结论与来源 |
| --- | --- | --- |
| `head/crown/wing_ornament_left` | PASS / 0 | PASS：本次新图复验，原内桥缝已解决 |
| `head/crown/wing_ornament_right` | PASS / 0 | PASS：本次新图复验，原内桥缝已解决 |
| `head/crown/arch_band` | PASS / 0 | PASS：本次新图复验，原两肩偏移已解决 |
| `head/crown/forehead_chain` | PASS / 0 | PASS：严格字节不变，明确继承原第3项 |
| `head/crown/center_crest` | PASS / 0 | PASS：严格字节不变，明确继承原第5项 |

**本次最终结论：PASS（3项真实新图复验PASS + 2项严格不变继承PASS；5项范围PASS）。** 原三项REVISE均已解决，本节点未解决项目：无。最终显影顺序中“中央背根在前发后、中央主饰面可见、额链在前发前”仍是既有后续约束，不是本节点阻塞。

此最终结论仅对应实际当前候选 SHA-256：`b58f4f5abb0fd0c8aac0041c7f161e705a7a65d9e1b14e7220601323835f9ede`；冻结父 SHA-256：`07bd7b008a8afc0c79453316638dca5e810082ada6ef465a73d5b93d89489f9d`。本审查交总控后停止，后续调度由总控执行。
