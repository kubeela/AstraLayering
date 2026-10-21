结论：仍有问题

# 第二步边缘柔化工程 — repair 01 同步状态

当前工程已继续修画 22 层并保存、重开和导出。上一版“全部通过”的结论撤回；旧报告保留于 [before-report.md](repair-01-work/before-report.md)。R01/R02/R03/R07/R08/R09/R10 已做局部修画及本轮自检；R04/R05 只完成现有形状内的绘画处理，R06 与 C01–C03 尚未关闭。**当前文件是保留进度的工作工程，不是第二步完成交付。**

## 输入与参考

- 本轮直接继续的工程：`D:\Resources\workspace\AstraLayering\.run\pink-elf-20261020\raster-layering\step02\character-soft-edges.kra`。本轮输入 SHA-256：`05eb5d54f2b908367b160ed1fcdcc0e5157e8b698d26481bb416bc11a47d9cda`，修复前副本保存在 [before-character-soft-edges.kra](repair-01-work/before-character-soft-edges.kra)。
- 唯一原图：`D:\Resources\workspace\AstraLayering\.run\pink-elf-20261020\part-layering\references\base-subject.png`，沿用第一步，不更换参考。
- 结构标准：[groups.json](../../part-layering/groups.json)、[occlusion.json](../../part-layering/occlusion.json)、[parts](../../part-layering/parts/)。这些文件本轮只读。
- 已阅读 [step01/report.md](../step01/report.md)、本轮之前的 step02/report.md，以及 [review-01.md](review-01.md) 和其局部、逐层、合看检查证据。

## 当前阻塞与差异

1. **C01：眉毛透显标准仍待确认。** 0510/0520 完整且未改动；既定 510/520 位于刘海后，而原图有跨在刘海上的浅眉弧。已发出确认问题，尚未收到答复。没有把眉提到刘海前，也没有把眉画进头发。review 明确要求“确认前标记为待确认，不判通过”。
2. **R04/R05/C02：手部可见轮廓冲突仍在。** 白甲面和圆盖绘画已局部修正，但正式 index_finger SVG 末端约到 y868，原图侧向末端约到 y863；palm 的绿色补全区域覆盖了原图可见的部分指根。仅重新上色不能消除该覆盖。已提交局部轮廓修正/保持正式 SVG 两种选择，尚未收到标准结论。没有收窄指尖、削掌片、开新指缝或删除隐藏指根。
3. **R06/C03：靴口切界和前沿补画未完成。** 已确认部分浅色前沿留在 rear 并被腿遮挡；左靴前沿本身还偏弱。提出仅重分配同 foot 的约 2–7 像素窄卷边并随后补接镶边的方案，保持 55/600、56/610 及靴子整体形状，等待标准确认。本轮未实施切界修改，也未把整条腿后移或将 rear 整片前移。

手部的[三方轮廓证据](repair-01-work/C02-index-standard.png)、[掌片证据](repair-01-work/C02-palm-standard.png)及[右靴](repair-01-work/C03-boot-right-comparison.png)/[左靴](repair-01-work/C03-boot-left-comparison.png)证据已保存。眉毛可见量仍按既定深度较少。没有擅自改正式形状或靴片分配。

## 本轮实际修画层

采用 Krita 原生笔刷逐处补线、接色与局部收柔，由手工定位的曲线笔画执行；没有原图像素贴补、阈值批处理、全层模糊或新增 AO/投影。完整逐项结果在本轮 repair-01.md.tmp，操作记录在 operation-log.jsonl。

| 实际绘画层 | 反馈 | 本轮处理与结果 | 三状态证据 |
|---|---|---|---|
| 0010 hair/back_hair/long_right | R10 | 沿发流重接暗三角及补全带，保留发梢、孔隙及本有亮带 | [局部](repair-01-work/R10-longright-states.png)、[完整层](acceptance/0010.png) |
| 0020 hair/back_hair/long_left | R10 | 重接斜亮带与附近粉色层次，避免直斜硬界 | [局部](repair-01-work/R10-longleft-states.png)、[完整层](acceptance/0020.png) |
| 0030 hair/side_hair_right | R02 | 回钩及上段长弧内外细线补色、局部收柔 | [局部](repair-01-work/R02-hook-left-states.png)、[完整层](acceptance/0030.png) |
| 0040 hair/side_hair_left | R02 | 回钩及上段长弧内外细线补色、局部收柔 | [局部](repair-01-work/R02-hook-right-states.png)、[完整层](acceptance/0040.png) |
| 0050 hair/back_hair/cap :: back | R03 | 头盖 back 在原切界内与 crown 接色；归属及深度不变 | [局部](repair-01-work/R03-back-states.png)、[完整层](acceptance/0050.png) |
| 0060 legs/leg_right/leg | R01/R07 | 暖色腿缘细线、腿根横向接头及内侧尖折衔接 | [局部](repair-01-work/R07-left-leg-states.png)、[完整层](acceptance/0060.png) |
| 0070 legs/leg_left/leg | R01/R07 | 按该侧实际线色处理腿缘与腿根接头 | [局部](repair-01-work/R07-right-leg-states.png)、[完整层](acceptance/0070.png) |
| 0140 arms/arm_left/hand/palm | R05/C02 | 掌片内转折线、粉色过渡及浅色圆盖接缝；轮廓冲突未关闭 | [局部](repair-01-work/R05-palm-states.png)、[完整层](acceptance/0140.png) |
| 0150 arms/arm_right/hand/index_finger | R04/C02 | 盖除朝向错误的白甲面，改为侧向粉色末节；末端轮廓未改 | [局部](repair-01-work/R04-finger-states.png)、[完整层](acceptance/0150.png) |
| 0200 arms/arm_left/forearm | R01 | 分段补回前臂暖棕细线，内缘局部收柔 | [局部](repair-01-work/R01-right-forearm.png)、[完整层](acceptance/0200.png) |
| 0210 arms/arm_right/forearm | R01 | 分段补回前臂暖棕细线，内缘局部收柔 | [局部](repair-01-work/R01-left-forearm.png)、[完整层](acceptance/0210.png) |
| 0220 arms/arm_left/upper_arm | R01 | 上臂内外缘细线及肩弧，按参考浓淡调整 | [局部](repair-01-work/R01-right-upper.png)、[完整层](acceptance/0220.png) |
| 0230 arms/arm_right/upper_arm | R01 | 上臂内外缘细线及肩弧，按参考浓淡调整 | [局部](repair-01-work/R01-left-upper.png)、[完整层](acceptance/0230.png) |
| 0240 neck | R01/R07 | 颈侧细线与横向接头连续过渡；未补投影 | [局部](repair-01-work/R07-neck-states.png)、[完整层](acceptance/0240.png) |
| 0250 body/torso | R01/R08/R09 | 肩顶自身短线、布料断线接续、肩带旁外来发色清除 | [局部](repair-01-work/R09-torso-states.png)、[完整层](acceptance/0250.png) |
| 0270 face/ear_left | R01 | 耳下缘暖色细线与柔和过渡 | [局部](repair-01-work/R01-ear-right-states.png)、[完整层](acceptance/0270.png) |
| 0280 face/ear_right | R01 | 耳下缘暖色细线与柔和过渡 | [局部](repair-01-work/R01-ear-left-states.png)、[完整层](acceptance/0280.png) |
| 0310 face/face_base | R01 | 下颌自身细轮廓补色，保留脸底及五官分层 | [局部](repair-01-work/R01-jaw-states.png)、[完整层](acceptance/0310.png) |
| 0530 hair/front_side_hair_right | R02 | 脸侧长细发内外线及亮线连续性，收柔碎点 | [局部](repair-01-work/R02-front-right-states.png)、[完整层](acceptance/0530.png) |
| 0540 hair/front_side_hair_left | R02 | 脸侧分叉发尖及内外线，局部收柔 | [局部](repair-01-work/R02-front-left-states.png)、[完整层](acceptance/0540.png) |
| 0550 hair/bangs | R02/R03 | 刘海细尖线色、发根双弧及中央接头 | [局部](repair-01-work/R03-root-states.png)、[完整层](acceptance/0550.png) |
| 0560 hair/back_hair/cap :: crown | R03 | crown 与刘海/同 part back 在原切界内接色 | [局部](repair-01-work/R03-crown-states.png)、[完整层](acceptance/0560.png) |

## 保存、重开与整体检查

- 画布仍为 **932×1688**，透明背景；PNG 未铺底、未缩放。
- **69 个普通绘画层、65 个逻辑 part**；全部层名、顺序、类型与本轮输入相同；无蒙版、无子节点，保存时全部可见。
- 保存后关闭该工作文档并重新打开；69 层逐层 RGBA、名称、顺序、类型、边界和可见状态与保存前一致。记录：[reopen-verification.json](repair-01-work/reopen-verification.json)。
- PNG 从重开的当前 KRA 导出，与保存 KRA 内的 mergedimage 解码内容一致。此项只核对保存/导出一致性，不作为视觉质量指标。
- 第一阶段 KRA/report、上游 groups/occlusion 与全部 part SVG 的保护检查通过，未改写。完整核对：[audit.json](repair-01-work/audit.json)。
- 当前 KRA SHA-256：`8de77a451f95b87f026637463fe524ba9f5785c848839a9366ad518a37085e53`。
- 当前 PNG SHA-256：`44e5e60272c711b141359ac0b21e981af434086e6c2cfac5bb91080842cc42a9`。

[当前与原图的原尺寸整体对照](repair-01-work/overall-100.png)已目视；局部三状态证据见上表，灰底只属于检查图。当前 KRA/PNG 保持透明背景。4 个原有多深度 part 均保留分片和普通绘画层结构；cap 合看接续已修画，双靴仍按上述未关闭问题记录，串线两片保持不变。其余 47 层像素与修复开始时一致，未宣称重新修画或把旧检查替代当前反馈处理。

继续时使用当前 character-soft-edges.kra；本轮前的 KRA/PNG/报告备份在 repair-01-work/before-*。第一阶段文件及上游标准只读保留。
