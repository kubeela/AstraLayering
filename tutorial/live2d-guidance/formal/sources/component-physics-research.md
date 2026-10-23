# 组件物理研究记录 · 2026-10-22

用于[正式教程 10](../10-component-physics-authoring.md)。本轮阅读的是文档和指定源码函数，并检查已有模型的 physics3 数据；没有运行这些第三方编辑器，没有验证它们的全部模型、导出兼容性或美术效果。实际下载文件的 SHA-256 与固定源码 URL 收录在[来源清单](component-physics-sources.json)。第三方源码未随本次提交复制。

## 1. psd2live：作者形变、物理体与响应审核

读取版本：`ef527ddf9a7e738de642a0f19bdda17da1ef6191`，GPL-3.0。相关入口：

- [PHYSICS.md](https://github.com/tsunehimatoi/psd2live/blob/ef527ddf9a7e738de642a0f19bdda17da1ef6191/docs/zh/guide/PHYSICS.md)：输入标准化、摆链与逐节输出、响应曲线、输出倍率、组计算顺序及固定计算 FPS。
- [SWING.md](https://github.com/tsunehimatoi/psd2live/blob/ef527ddf9a7e738de642a0f19bdda17da1ef6191/docs/zh/guide/SWING.md)：固定边、轴角和固定边平移；根部柔软度；弧形保长；横截面平行；1–3 段的作者参数。
- [SIMULATION.md](https://github.com/tsunehimatoi/psd2live/blob/ef527ddf9a7e738de642a0f19bdda17da1ef6191/docs/zh/guide/SIMULATION.md)：一个物理体包含多张网格；固定点、刚度、保形权重；胶水跟随另一网格的实际姿态；顶点按面积分配质量；材质预设；静止标定；参考模拟与烘焙结果的区别。
- [PhysicsGenerator.kt](https://github.com/tsunehimatoi/psd2live/blob/ef527ddf9a7e738de642a0f19bdda17da1ef6191/src/main/kotlin/io/github/psd2live/core/PhysicsGenerator.kt)：`skeletonRules` 为尾巴下级与翼建立跟随输入，手臂和腿保留作者动作；`swingRules` 为每段输出分配对应 `PhysicsOutput`。前／后发预设不等于完整长发分段的制作。
- [PhysicsSimulation.kt](https://github.com/tsunehimatoi/psd2live/blob/ef527ddf9a7e738de642a0f19bdda17da1ef6191/src/main/kotlin/io/github/psd2live/core/PhysicsSimulation.kt)：先稳定模型，施加输入、保持、释放，再记录峰值和稳定时间；`PhysicsResponse.trace` 使用与面板相同的拖动响应和物理引擎。返回的采样与实时数值并不是独立的正弦示意动画。

采用的原则：物理组与图层分开；按连接处配置；共享运动；以规范输入审核参数。此轮没有逐行核对 psd2live 的所有二维布料求解与烘焙代码；质量、权重和材质部分明确来自 SIMULATION 文档，不能声称已经复现该软件的完整模拟器。

## 2. Cubism：物理驱动参数，不自动制作网格

[物理参数手册](https://docs.live2d.com/en/cubism-editor-manual/physics-operation/)和[设置说明](https://docs.live2d.com/en/cubism-editor-manual/physical-operation-setting/)于 2026-10-22 获取；网页会更新，本地阅读指纹见来源清单。读取重点是输入／输出标准化、多级摆链、输出最大值与计算 FPS。

[CubismWebFramework cubismphysics.ts](https://github.com/Live2D/CubismWebFramework/blob/198a3769c26ca3d7b600e932590433badd392edd/src/physics/cubismphysics.ts)，版本 `198a3769c26ca3d7b600e932590433badd392edd`。重点核对 `updateParticles`、`getOutputAngle` 及参数标准化：根部使用输入平移；后续节点受重力、速度和响应设置影响，再约束到与前一节点的长度；输出读取指定节的相对角度。源码具有 SDK 自己的计算约定，Delay 等字段不直接等价于通用弹簧常数。

结论：作者输出关键形与逐节权重仍是必需的。仅增加虚拟链的节数，不代表成品网格会自动出现连续弯曲。本轮没有引入 Cubism SDK，也没有制作 physics3／cmo3／moc3 导出。

## 3. Inochi2D：挂点与可理解的时间参数

选择公开稳定标签 **v0.8.7**，提交 `e2235f6f29688d4013a0eec116a37ec8af8f1fb5`，BSD-2-Clause。读取 [simplephysics.d](https://github.com/Inochi2D/inochi2d/blob/e2235f6f29688d4013a0eec116a37ec8af8f1fb5/source/inochi2d/core/nodes/drivers/simplephysics.d) 的 `Pendulum`、`SpringPendulum`、`updateInputs`、`preProcess`／`postProcess` 和 `updateOutputs`。

- 摆与弹性摆分开建模；普通摆保长，弹性摆另有长度响应。
- 弹性摆显式使用 `frequency`，其角频率为 `2πf`；角向与长度方向各有阻尼比。
- 重力下的静止长度有偏置补偿，挂点位置更新与物理动态状态分工。
- 物理输出转换到节点的局部方向空间，再写参数；不是直接把像素图当作刚体。

同时检查了 SDK 当前 main `4975d247f9b946a74d18e0ba9b3e9475eb636efb` 和 Creator 当前树 `dba60811cff224f8cc9ce367b1d9291bfa5f7640`。SDK 的 SimplePhysics 已移入 `legacy`，部分旧绑定文件注释化，因此本章不把旧接口写成当前主线推荐接口；实际物理公式依据上面的稳定标签。

适合采用挂点、局部输出和 Hz／阻尼比的设计。单摆节点不能直接解决宽裙摆和多束长发的作者空间问题。

## 4. Rive：绑定姿态、权重和共同变形空间

MIT，读取版本 `b3360ab942e4f187f6b9fb74f5ef0617745e8ce9`：

- [skin.cpp](https://github.com/rive-app/rive-runtime/blob/b3360ab942e4f187f6b9fb74f5ef0617745e8ce9/src/bones/skin.cpp)：骨骼世界变换与 inverse bind 组合，变形缓冲在相关节点更新后重建。
- [weight.cpp](https://github.com/rive-app/rive-runtime/blob/b3360ab942e4f187f6b9fb74f5ef0617745e8ce9/src/bones/weight.cpp)：在归一化权重下合成骨骼矩阵，再变换原顶点。

采用作者绑定姿态、权重和依赖更新的分工，帮助线稿／颜色／印花共享运动。读取的是骨骼蒙皮，不能据此声称 Rive 有我们需要的发束／裙摆动力学；源码树中的滚动弹性物理也不作为人物物理参考。

## 5. DragonBones：骨骼与表面形变

MIT，读取版本 `64b6c69ae35777c2404be68c9192e2c56906079e`：

- [Constraint.ts](https://github.com/DragonBones/DragonBonesJS/blob/64b6c69ae35777c2404be68c9192e2c56906079e/DragonBones/src/dragonBones/armature/Constraint.ts)：IK 和 PathConstraint 的求解及骨骼更新顺序。
- [Surface.ts](https://github.com/DragonBones/DragonBonesJS/blob/64b6c69ae35777c2404be68c9192e2c56906079e/DragonBones/src/dragonBones/armature/Surface.ts)：作者表面形变与局部变换。
- [DisplayData.ts](https://github.com/DragonBones/DragonBonesJS/blob/64b6c69ae35777c2404be68c9192e2c56906079e/DragonBones/src/dragonBones/model/DisplayData.ts)：MeshDisplayData／GeometryData 和 WeightData 所属骨骼的关系。

用于骨骼、参数和网格职责划分。本轮这些文件中的 IK／路径约束没有时间惯性，不能当作裙摆物理的替代。没有运行 DragonBones 编辑器或兼容性测试。

## 6. Synfig：骨骼形状与区域权重

GPL-3.0，读取版本 `029b45e4275c6356f1b698b5bb3bc4c323787cc9` 的 [layer_skeletondeformation.cpp](https://github.com/synfig/synfig/blob/029b45e4275c6356f1b698b5bb3bc4c323787cc9/synfig-core/src/synfig/layers/layer_skeletondeformation.cpp) 和 [bone.cpp](https://github.com/synfig/synfig/blob/029b45e4275c6356f1b698b5bb3bc4c323787cc9/synfig-core/src/synfig/bone.cpp)。重点是骨骼绑定前后空间、骨骼形状覆盖权重及归一化位置合成。

借鉴“影响区域需要作者信息”的分工。区域蒙皮本身不保证保长和自然曲率，头发的中心线和裙摆材质仍需独立求解。本轮没有运行 Synfig，也不采用其 GPL 源码实现。

## 7. Spine：公开源码的架构对照

读取 **4.3 分支快照** `9f7d44b725df0766b3995093cea8e7342faf9367` 的 [PhysicsConstraint.ts](https://github.com/EsotericSoftware/spine-runtimes/blob/9f7d44b725df0766b3995093cea8e7342faf9367/spine-ts/spine-core/src/PhysicsConstraint.ts)、[SkeletonPhysicsMovement.ts](https://github.com/EsotericSoftware/spine-runtimes/blob/9f7d44b725df0766b3995093cea8e7342faf9367/spine-ts/spine-core/src/SkeletonPhysicsMovement.ts) 和 PhysicsConstraintData。重点为骨骼姿态上的惯性、强度／阻尼、步长积累和插值，以及外部移动与 reset 的区分。

其 [LICENSE](https://github.com/EsotericSoftware/spine-runtimes/blob/9f7d44b725df0766b3995093cea8e7342faf9367/LICENSE)是 Spine Runtimes License Agreement，不是 MIT／BSD 等开源许可。列入公开源码对照，不列为可直接集成的开源物理库。没有复制代码或示例人物素材，也不把这一快照外推为其他 Spine 版本的行为。

## 8. 真实模型与本项目测量

[physics-component-measurements.json](physics-component-measurements.json)记录三份已有原始 physics3 的 SHA-256、组数、计算 FPS、节点数和选定前／侧／后发输入输出；没有从 physics3 推导 cmo3 网格、deformer 层级或贴图运动。

| 模型 | 组数 | 计算 FPS | 单组节点数（含根） |
| --- | --- | --- | --- |
| Milly | 56 | 30 | 1、2、3、4、8 |
| 莉尔 | 72 | 60 | 2、3、4、5、6 |
| 樱桃蛋糕天使 | 63 | 60 | 2、3、4、5、15 |

莉尔“侧发x”读取第 2／3／4 节，樱桃蛋糕天使“前发x”读取第 1／2／3／4 节。角色不同、参数的关键形和范围也不同，Scale 大小不能用于跨角色比较实际像素摆幅；根节点和部分非运动计算组也不能被当作实际自由节。

本项目历史代码审计基线：`6b159d26`，求解器 `astra-cloth-1`。该版本已有矩形单侧固定、逐点允许位移、二维 XPBD、防翻折和原尺寸 GPU 贴图形变；回弹与衰减仍是均匀标量。当时正式组件组、自由形权重、父动作挂点和稳定身份映射尚未实现，Krita 树带 UUID，但 surfaces 仍输出顺序型 `n…` ID。

2026-10-22 的 MR #75 已解决图层 UUID 与 schema 2 草稿持久化，见 [10 的已落地说明](../10-component-physics-authoring.md#已落地图层身份与绑定草稿)。新组件／支撑与完整自动制作管线仍待实现，最新范围和三步契约见 [11](../11-secondary-physics-workflow.md)。历史测量仍适用于所记求解器参数，不能把当时的身份缺口写成当前未修复问题。

四组自有求解器测量都使用 150×650 的矩形、末端归一化脉冲、120 Hz／8 秒；默认配置与已有慢速示例配置各测长条和宽布。这是数值研究，不是 Jianma 美术验收，也不是“慢速一定更自然”的证明。没有改动物理参数、项目源文件、浏览器绑定或运行中的工作流。

复现脚本：

```sh
node tutorial/live2d-guidance/tools/probe_component_physics.mjs /tmp/component-physics.json
# 画图需要 Python matplotlib；有 CJK 字体时自动用于中文标签
python3 tutorial/live2d-guidance/tools/plot_component_physics.py /tmp/component-physics.json /tmp/component-response.svg
```

本轮采用的是接口分工、公开数学原理和作者工作方法；不引入第三方运行时依赖。新增组件设计与现有实现状态分别记录在教程 10，避免把研究方案写成已接入功能。
