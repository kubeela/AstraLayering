结论：已修复

# Repair02 逐项修复结果

review-02.md 的六项反馈均已按固定base-subject参考定位并处理，完成原尺寸单层、隐藏上方及默认叠加自检。继续同一KRA，保留已合格内容；当前41个普通绘画层、37个逻辑part、22个原生透明度蒙版。

[当前KRA](character-depth.kra) · [当前PNG](character-depth.png) · [更新绘画报告](report.md) · [返修前历史KRA](history/pre-repair-02/character-depth.kra)。

## 逐项处理

| 编号 | 处理结果（本轮自检通过） | 证据 |
| --- | --- | --- |
| R1 | 画面左眉线处逐束接回刘海本体alpha、侧缘及细丝，保留真实露额缝；眉103完整留在160后，未削眉、抬眉或贴入眉/肤色。 | [同坐标对照](repair-02-evidence/issues/R1-comparison.png) · [默认](repair-02-evidence/issues/R1-default.png) · [隐藏上层](repair-02-evidence/issues/R1-upper-hidden.png) · [刘海独显](repair-02-evidence/checks/R1-bangs-only.png) · [隐藏眉](repair-02-evidence/checks/R1-without-brows.png) |
| R2 | 画面右侧按本侧发流独立接回同高缺口与台阶，保留各束长短、内部真实分叉及间隙；眉102、刘海层序和位置不改，未镜像。 | [同坐标对照](repair-02-evidence/issues/R2-comparison.png) · [默认](repair-02-evidence/issues/R2-default.png) · [隐藏上层](repair-02-evidence/issues/R2-upper-hidden.png) · [刘海独显](repair-02-evidence/checks/R2-bangs-only.png) · [隐藏眉](repair-02-evidence/checks/R2-without-brows.png) |
| R3 | 左颈肩补齐原内缩的数像素可见外弧，收住颈底预留尖片；在实际归属内恢复颈侧/肩根皮肤并原生接色，消除斜向拼接。完整颈底和胸廓保留，原内部实底不退回。 | [同坐标对照](repair-02-evidence/issues/R3-comparison.png) · [默认](repair-02-evidence/issues/R3-default.png) · [隐藏上层](repair-02-evidence/issues/R3-upper-hidden.png) · [两件合看](repair-02-evidence/checks/R3-joint-only.png) · [多底色](repair-02-evidence/issues/R3-background-check.png) |
| R4 | 右侧独立修正外弧、预留显隐及颈侧体积接续，去掉外挑回折和亮碎接痕；保持本侧明暗、不对称及颈35/torso40职责，未以AO或投影盖缝。 | [同坐标对照](repair-02-evidence/issues/R4-comparison.png) · [默认](repair-02-evidence/issues/R4-default.png) · [隐藏上层](repair-02-evidence/issues/R4-upper-hidden.png) · [两件合看](repair-02-evidence/checks/R4-joint-only.png) · [多底色](repair-02-evidence/issues/R4-background-check.png) |
| R5 | 只在0010重新生成并配准连续后发宽面，修净浅金碎片、短折笔及横向游离侧发样残影。同步原生独显与节点投影确认长弧连续；0021真实弯束和两枚末梢原像素保持，完整后发alpha、耳下承接与深度10不变。 | [同坐标对照](repair-02-evidence/issues/R5-comparison.png) · [默认](repair-02-evidence/issues/R5-default.png) · [隐藏上层](repair-02-evidence/issues/R5-upper-hidden.png) · [后发独显](repair-02-evidence/checks/R5-back-only.png) · [保留的侧发](repair-02-evidence/checks/R5-side-only.png) |
| R6 | 0050同层以本件已有生成曲面素材局部延展并用原生画笔接色，将渐变及中央本体明暗续至y1374，去除底部横带；不增画画外形体，不把本件明暗转入torso，不复制衣料。 | [同坐标对照](repair-02-evidence/issues/R6-comparison.png) · [默认](repair-02-evidence/issues/R6-default.png) · [隐藏上层](repair-02-evidence/issues/R6-upper-hidden.png) · [本层独显](repair-02-evidence/issues/R6-solo.png) |

## 归属、结构与保留结果

- 刘海补回本件真实可见发色、alpha及细丝，眉体和层序均保持；隐藏眉后的原生截图仍显示完整发束。
- 颈根既有余量完整保留，新增附着neck的原生外弧控制蒙版；torso接色蒙版修正颈侧预留职责。两侧缺失外弧按各自实际可见颈/肩归属补齐，源像素覆盖范围互斥；隐藏底纹仍为自身素材，没有把邻件描边或服装贴入本层。
- 后发黄色目标先清灰再生图，去掉旧侧发样残影，完整alpha保持；0021的真实弯束和完整双尖逐字节保持，不靠扩大侧发遮盖后发。
- 胸前底边只续本件曲面与自身明暗，alpha、蒙版、体积和画布裁切保持；没有把参考背心当作补全目标。
- 本轮改5个绘画层，另36层原始像素未变；全部41个绘画层UUID保持。原21蒙版UUID/归属保持，20个数据不变，新增neck蒙版1个。
- 先保存3个终止部件及2个父轮廓SVG，再通过edit_groups/edit_occlusion保存完整数据并校验通过。逻辑ID及41个深度区域均不变，无新拆分或合层；相对旧色块的形状变化仅为刘海断口补回和颈肩可见窄弧补齐。

完整part、图层名/UUID、复用来源、蒙版所属、控制目标、启用/临时停用证据均在[绘画报告](report.md)及[原生图层索引](repair-02-evidence/layer-index.json)。[补全生图提示词和保存记录](repair-02-evidence/generation.json)、[归属与完整性记录](repair-02-evidence/checks/ownership-and-completeness.json)、[保留内容](repair-02-evidence/checks/retained-content.json)。

## 保存重开与自检证据

全部本轮状态图均等待Krita原生事件/投影刷新后导出，修正了临时显隐截图延迟取到前一状态的问题。15个蒙版所属part的启用/临时停用检查结束后恢复默认，22个蒙版全部启用；完全隐藏眼口12件底纹完整，默认闭眼闭嘴不漏出。

当前KRA已保存关闭并重开；41层/22蒙版的名称、UUID、顺序、关系、数据及默认合成前后一致。最终PNG由该重开状态原生导出。[重开核对](repair-02-evidence/checks/reopen-check.json) · [蒙版核对](repair-02-evidence/mask-audit.json)。

绘画结论依据逐件、局部及整图实际看图；数字检查只确认保留、引用和保存一致性。六项未推迟成第二步柔边，没有新增AO、投影或整图覆盖层，未用全层模糊或颜色阈值填色代替修画。前序历史和正式review/repair报告未改，本轮只提交本暂存报告。

补充放大观察（原坐标裁切后300%，不改变参考配准）：[左刘海独显](repair-02-evidence/checks/R1-bangs-only-300.png) · [右刘海独显](repair-02-evidence/checks/R2-bangs-only-300.png) · [后发本层独显](repair-02-evidence/checks/R5-back-only-300.png)。
