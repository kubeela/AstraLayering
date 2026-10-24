# 人物与衣服组装记录

已交付 [可编辑 KRA](character-assembled.kra) 与 [透明 PNG](character-assembled.png)，932×1688、RGBA U8、原 sRGB 配置。保留人物70层＋衣服32层，共102个原有绘画层；新增3个 Krita 原生透明度遮罩，无新增绘画层、拆片或合并。两份输入 KRA 及参考图的 SHA-256 均保持，见 [文件核对](delivery-checks.json)。

实际调整：

- 衣服所有分片共同做 Krita 原生比例／位置对齐，匹配领口、袖高、腰线、短裙和长垂裙；头发头脸、腿宽、前臂手及靴口／靴底做小幅对齐。具体参数见 [变换记录](transform-log.json)。参考图始终保持原坐标和尺寸。
- 后垂裙在腿后，前臂与手在裙前；后腰接片移到后发前方，消除腰侧粉色发片透出。后领花瓣移至颈层前、前衣身后，使环颈衔接正确。原衣身两处孔会露出补全后的锁骨，而参考同处是白布，已在原 `0038` 衣身层局部补成布面；正常颈部露肤保留。
- 在原左右前袖层补半透明花边底色，保留透肤与既有轮廓；原上臂层补袖下轻暖接触色。原前臂层接柔肘部圆顶线；原腿层补裙下轻暖色，并修成柔和小起伏。两腿间缺失的深色后裙延续补在原 `0007` 后裙层，星纹为本层画笔补绘。全部局部修画见 [笔触记录](drawing-strokes.json)，未粘贴参考像素。

三个可关闭遮罩：

|父层|用途与确认|
|---|---|
|`0250 body/torso`|收掉衣身两侧和腰侧多余人体，保留肩部、领口正常露肤及衣料下承底。[重开独显开关](inspection/reopened/250-toggle.png)|
|`0260 body/breast`|收掉不透明衣身外的胸层边界。[重开独显开关](inspection/reopened/260-toggle.png)|
|`0080 pelvis`|收掉短裙腰口外的骨盆上端，保留隐藏下部内容。[重开独显开关](inspection/reopened/80-toggle.png)|

三个父绘画层的原始 RGBA 与输入逐字节一致。已实际独显并切换遮罩，再回到 [完整合成开关对照](inspection/reopened/all-toggle.png) 检查原因和效果；正常臂腿、关节连接及袖纱透肤保留。

像素诊断与视觉复核：

- 首次合成后运行：[诊断](pixel-review/934ee75c-5431-4e77-9bee-6de69068d504/differences.json) · [候选框](pixel-review/934ee75c-5431-4e77-9bee-6de69068d504/marked.png) · [热图](pixel-review/934ee75c-5431-4e77-9bee-6de69068d504/heatmap.png)。据此处理衣服过高、垂裙过宽过长、腰侧人体外漏、后裙中间缺口等真实问题。
- 最后一次保存关闭、重开并导出后再次运行：[最终诊断](pixel-review/e220afcf-3fef-4953-a171-13be64b1d797/differences.json) · [最终候选框](pixel-review/e220afcf-3fef-4953-a171-13be64b1d797/marked.png) · [最终热图](pixel-review/e220afcf-3fef-4953-a171-13be64b1d797/heatmap.png) · [同坐标原尺寸总对照](pixel-review/e220afcf-3fef-4953-a171-13be64b1d797/comparison.png)。最终107个候选逐项核对理由及原尺寸局部见 [候选记录](candidate-review.md)。中间诊断保留供追溯，最终以 e220afcf 为准。
- 重点局部已逐处核对：[领颈中心／开口／遮挡](inspection/final/collar.png)、[左袖与腋下](inspection/final/left-sleeve.png)、[右袖与腋下](inspection/final/right-sleeve.png)、[衣身与腰线](inspection/final/bodice-waist.png)、[左侧](inspection/final/left-side.png)、[右侧](inspection/final/right-side.png)、[裙摆与腿根](inspection/final/hem-thigh.png)、[手腕与手](inspection/final/hands.png)、[膝](inspection/final/knees.png)、[踝靴接头](inspection/final/ankles.png)。

仍有的差异：原五官和细发束笔触、肩线高度、手指弯曲、花簇纹样、腿部弧线、靴饰和部分布褶与参考不完全相同；肘部仍有很浅的原分片色差。中间后裙的补绘星纹及袖／裙下轻影也不是逐像素复刻。这些在整体和局部中保留原部件形体、画风与正常露肤，没有用擦掉正常人体或重画整块部件来追求差异清零。最终未再见需处理的腰侧人体漏出、腰口粉色发片穿出、后领被压没或两腿间透明缺口。

已完成保存、关闭、重开，核对102层、3遮罩、可见性和投影一致，见 [重开验证](reopen-verification.json)。KRA 内 mergedimage、交付 PNG 和重开导出 RGBA 一致，alpha 含0和255；检查用灰底与放大拼版未写入交付。最后也在现有 Krita 主窗口重新打开了最终工程，界面无未保存标记。
