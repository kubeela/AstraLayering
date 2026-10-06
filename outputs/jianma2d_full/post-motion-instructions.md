# 总控选择的后续串行节点

此文件是本次运行的交接说明，技能原文件不变。具体 group_path、工作目录和身份由总控消息绑定。本文件仅用于已经通过 group_child_layers 独立审查并完成 part_motion_completion、经总控 expand/checkpoint 的 group。

总控选择以下串行节点，执行身份均为 `group:{group_path}`，模型为 gpt-6-astra / xhigh。只处理当前 group 的既有直属 part，不进入子 group，不修改树或 guide，不创建或调度其他 worker。当前树无直属 part 时应交回，不执行以下分支。

1. part_contours — `3.geometry/3.1.外轮廓与接界`
2. part_structure — `3.geometry/3.2.内部结构线`
3. part_tone_boundaries — `3.geometry/3.3.明暗范围线`
4. part_detail_lines — `3.geometry/3.4.细节与纹理线`
5. part_brush_lines — `3.geometry/3.5.画笔重绘`
6. part_base_colors — `4.rendering stack/4.1.基色与材质分区`
7. part_volume — `4.rendering stack/4.2.大明暗与体积`
8. part_color_transitions — `4.rendering stack/4.3.过渡色与局部色`
9. part_local_shading — `4.rendering stack/4.4.局部暗部细化`
10. cast_shadow_relations — `4.rendering stack/4.5.投影处理/4.5.1.投影识别与关系定义`
11. cast_shadow_artwork — `4.rendering stack/4.5.投影处理/4.5.2.独立投影绘制`
12. part_highlights — `4.rendering stack/4.6.高光与反光`
13. part_rendered — `4.rendering stack/4.7.线色融合与材质细化`

以上相对目录均在技能根 `templates/部件专项/generic` 内。执行每个节点前读取对应流程.yaml、提示词及选择的 then 分支，严格依其输入和输出串行传递。reference/line_reference/groups/guide_svg/preview_tool 采用当前序列绑定；初次 artwork/rendering 若为空才创建，其后保留已存在全部内容。

所有 SVG 使用静态元素和直接元素样式，禁止位图嵌入；每个 part 独立容器，以完整 data-part-path 对齐，曲线和资源都有全图唯一 id。资源 id 用当前完整路径的 snake_case 前缀，避免并行分支冲突。首次 formal SVG 的根统一为 `<svg xmlns="http://www.w3.org/2000/svg" width="895" height="1758" viewBox="0 0 895 1758" version="1.1">`，不添加分支特有的全局 title/desc/style；描述保存在所属 part 和曲线内。已有正式稿时根、全局描述及他人内容原样保留。

几何完整包含预计动作会露出的同一表面。曲线 desc 按节点记录所属、连接位置、显影用途、压力/粗细、软硬、留白和填色闭合关系。3.5 必须实际使用 perfect_freehand==1.2.0，密集曲线采样 (x,y,pressure)，get_stroke 的 simulate_pressure=False、streamline=0，生成闭合填色笔触；保存源曲线和说明，按 part 轮廓裁切。采用根工作目录已装依赖的 .runtime/svg-preview/python/bin/python，始终带 -B。

渲染按参考确认基色、体积、色彩、局部暗部、投影与高光；临时连体服覆盖区域渲染对应身体。效果登记用技能 rendering.py，owner 当前直属 part，follow/clip_to 是树中确实存在的完整路径；具体 part 尚未创建时可绑定 group 并注明。独立效果使用登记 id 的单独 g，原始几何留足余量，receiver 蒙版由最终组合统一处理。投影不能作为物理树节点。无需某种细节或效果时保留输入，并明确实际判断依据，不强行添加。

每个节点必须完成提示词要求的实际图像自检。证据留在当前工作目录：独显 part、参考裁切、混合及需要的放大检查；不能仅生成图片而不查看。保留 `refinement/groups/{group_path}/checkpoints/{node}/` 中对应节点的 SVG、JSON（如有）及自检记录。正式输出始终为 YAML 指定的 refinement/character.svg、structure/rendering.json、refinement/preview.png。逐节点将以下记录追加到 `refinement/groups/{group_path}/post-motion-manifest.json` 的 nodes 数组：id、status、outputs（声明的相对输出路径）、snapshots（历史副本路径）、evidence、判断依据或未解决项。遇真实阻塞立即交回坐标和原因，不将未核对内容记为 pass。

几何完成和最终渲染完成时向总控发送简短进度；全部完成后交回最终文件、manifest、自检证据、rendering check 结果。总控保存 checkpoint、complete 和 aggregate，worker 不调用 group_cursor，不派发后续。

首次创建正式SVG时，根层共用 `<defs>` 容器不要设置 id；其内部渐变、mask、clipPath 等资源使用当前完整路径前缀的唯一 id。源合并工具会创建匿名共用defs基线，有id与匿名defs混用会触发合并冲突。新增全局title/desc禁止，描述放在当前part内部。已有输入根defs保持原结构，在其内只加入当前资源。

若首次正式稿carry为空，根匿名defs可保持空容器，各part的专属资源defs放在该part独立g内（SVG允许嵌套defs，资源ID仍全图唯一）；这样共享根defs不成为不同首次创建分支之间的原子新增冲突。已有正式稿时继续保留其根defs与全部输入资源，仅添加当前所属资源。

## 本次正式稿物理绑定与边缘诊断

每个真实 part 仅最外独立 `<g id="..." data-part-path="完整路径">` 使用一次物理绑定属性。内部源曲线、笔触、明暗、纹理等子 g 保留 id 与说明，不重复 data-part-path；隐藏源曲线仍保持 display="none"。重复绑定会使独显检查额外选中隐藏源线，也使最终物理树与容器对应含混。

若最终多层填色在同一外缘叠加，造成栅格 alpha 累积而超出冻结父范围，先保留真实失败报告并定位可见边界。只有确认完整表面 d 与批准轮廓严格相同、问题来自显示 alpha 后，可给最外 part 加使用该同一 d 的自身 alpha mask；保留全部原曲线与资源，不收缩几何。mask-type="alpha"，userSpaceOnUse，范围包住完整表面，白色无描边轮廓。实际重新查看独显/参考/关键接界，并重新检查全部直属 part。该自身显示蒙版与跨部件 receiver 蒙版是不同对象，独立 raw 渲染层仍保留原始形体。

保留各阶段真实作者与历史来源，读取大 SVG/pressure JSON 时只输出相关元素或统计，不把整份路径和点表打印到会话。图证必须按节点实际查看，生成图片不能替代查看。


## 参考图尺寸核对

base-subject.png 与 SVG 为 895×1758；line-reference.png 为895×1757。保持参考只读。局部线参考对照使用明确的同坐标 --reference-crop X Y W H（裁切范围不超图），避免整张自动缩放引入纵向位置差。几何以当前批准guide的画布坐标为准，线参考用于内部结构判断。
