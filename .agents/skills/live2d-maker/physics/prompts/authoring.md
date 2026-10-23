读取 step01 分析和源图片，配置各已选择组件的真实形状与连续活动范围。
原尺寸源图按部位用 uuids 批量查看；分析与绑定为独立上下文，依据已保存的分析/coverage 和实际源像素，不能依赖另一会话的临时变量。
前发和侧发先固定贴头根部，仅开放有依据的外侧/尾端；不可让整片头部起伏。硬坠始终保形，短颈和前后片可同场；串联只用真实的单向父支撑。逐个核对 sourcePartIds 和 layerRefs 与分析一致，不能用同名组件却换成另一张层。没有缓存时仍须完整从源层建出配置；本次效果必须由 physics_save_binding 保存。
全部坐标为源画布像素。supports 指实际缝接/头皮/腰口；fixedRegions 为固定多边形，transitionPixels 连续过渡。strand 用中心线和每节横截面宽度，至少 3 节，根部在固定区内；cloth 用完整 contour/holes 与 subdivisions；pendant 用 pivot 和轮廓。freeLength 用实际自由段长度。轮廓须覆盖整张源层，不能裁掉发梢或装饰。
layerRefs 每项 uuid/contentHash 来自 catalog。共享表面所有层同场，但保留源层序和 UV。supports.componentId 仅用于明确的单向连接；闭环 defer。默认参数只是起点：调频率、阻尼和柔顺性，限幅按自由长度；禁止凭空降低验收输入。每项必须明确 maxTravel、maxAngle、maxStretch、maxCompression、maxShear、minAreaRatio。
配置结构参照 web/studio/component-physics-schema.js；可由 physics_catalog 取得默认参数。调用 physics_save_binding 验证并保存 physics.draft.json，再写 report.md，解释每个固定区/活动段和复用原因。不要声称尚未运行的动画已经自然。

布片优先显式设置 controlGrid:[4,8]（列、行，各 2–16），以规则控制格模拟，再映射完整 contour/holes；复杂剪影不可直接充当稀碎求解网格。固定边界切入显示网格，固定像素权重为 0；调整控制格密度以覆盖细袖口与自由段。保留 subdivisions 用于显示精度，无需增加到控制网格。狭长连续带子优先 strand。

运行时采用 psd2live/Cubism 短摆链、psd2live 布片 XPBD、Inochi2D 刚性摆。原画中心线点数不是物理节数；显示网格与控制格边界对齐。布片保持纵向拉伸约束，允许横向剪切与压缩；不要用独立位置弹簧或无限增益替代材质。
