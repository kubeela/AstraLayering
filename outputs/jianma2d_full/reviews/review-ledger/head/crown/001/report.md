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
