# pelvis 直属轮廓色块独立审查

- 节点：`group_child_layers:pelvis:review`。
- 角色：独立审查，非制作身份；本轮只写审查图证和本报告。
- 工作根：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s5`。
- 依据：只读技能 `workflow-next/live2d-layering/SKILL.md`、本节点 `流程.yaml`、`review/提示词.txt` 及 `review/gpt-6-astra-xhigh.model` 声明。
- 参考：`references/base-subject.png`；树：`structure/groups.json`。
- 冻结候选：`reviews/group_child_layers/pelvis/candidate-01.svg`。
- 候选 SHA-256：`466cd9b2bd6c534ab39de7c072c12b5a307eb3a7fb0c324a031f34688095052a`，已核对与交接一致。
- 坐标：候选原始视口 895 × 1758 像素；以下位置均为原图坐标。

## 实际查看顺序与图证

先生成并实际打开整图参考／候选／50% 混合叠加，再逐段打开直属组件独显、参考和轮廓叠加；所有局部裁切均用指定 `svg_preview.py` 与 `--scale 4` 生成。下列图片均已实际查看，并非只生成文件。

1. `reviews/group_child_layers/pelvis/evidence-01-full-blend.png`：整图参考、完整候选和 50% 叠加。确认胯部整体位置、宽度、与腰及腿的关系。
2. `reviews/group_child_layers/pelvis/evidence-02-pelvis-only-edge-4x.png`：`--only part-pelvis-pelvis-body --reference references/base-subject.png --edge-overlay --crop 292 594 298 260 --scale 4`。查看组件全形、上下边界、两侧隐藏补全、中央收口。
3. `reviews/group_child_layers/pelvis/evidence-03-left-rim-4x.png`：同一直属组件独显与 edge-overlay，裁切 `(307,606,82,188)`，4 倍。核对画面左腰胯至股根外缘。
4. `reviews/group_child_layers/pelvis/evidence-04-right-rim-4x.png`：同一直属组件独显与 edge-overlay，裁切 `(500,606,80,188)`，4 倍。核对画面右腰胯至股根外缘。
5. `reviews/group_child_layers/pelvis/evidence-05-central-junction-4x.png`：完整候选与参考叠加，裁切 `(405,785,74,86)`，4 倍。核对腿根、会阴下方开口及开口内可见后发。
6. `reviews/group_child_layers/pelvis/evidence-06-body-legs-junction-4x.png`：共同独显 `group-body`、`part-pelvis-pelvis-body`、`group-legs`，与参考及 edge-overlay 对照；裁切 `(300,599,287,260)`，4 倍。排除后发遮色后核对身体组合接缝与中心开口。
7. `reviews/group_child_layers/pelvis/evidence-07-central-only-edge-4x.png`：`part-pelvis-pelvis-body` 独显与 edge-overlay，裁切 `(405,789,74,61)`，4 倍。单独核对中央小弧、两侧转折与下缘。

所有图证均在本报告同目录下，可由以上相对路径定位；绝对目录为 `/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r1/r1s5/reviews/group_child_layers/pelvis/`。

## 直属组件逐项记录

### pelvis/pelvis_body — pass

- 完整树路径：`pelvis/pelvis_body`。
- 色块容器 id：`part-pelvis-pelvis-body`。
- 几何 path id：`pelvis-body-silhouette`。
- 树核对：`pelvis.groups` 为空，`pelvis.parts` 只有 `pelvis_body`；本项为本轮全部直属组件。`guide-pelvis-base` 是父级底稿，并非额外直属组件。
- 实际查看图：上列 `evidence-01` 至 `evidence-07` 全部。

具体视觉对照：

1. **整体位置与宽度**：整图混合叠加中胯部位于腰下至双侧股根、中央会阴的正确范围。左右宽度及向外展开的幅度与参考保持一致，没有整体偏移或一侧比例变形。
2. **腰接界**：上缘约 `(370,626)`—`(440,620)`—`(511,627)` 属于与 body 的重叠分区，不是独立外露衣边。组合图显示 body 与 pelvis 连续相接，上缘内部没有露底缝；两端至 `(357,643)`、`(523,643)` 的转接平顺，未出现分离碎片或尖刺。
3. **画面左可见胯缘**：约 `(357,643)` 向 `(329,705)` 展开的斜弧贴随参考身体的外缘方向，宽度与转向正确；在股根交接附近轮廓连续。独显中的 `(318,755)` 及其下方圆弧位于腿部覆盖范围，属于隐藏延续，不能当成需描临时连体衣开腿边的可见边界。组合图确认该填形未在腿外凸出。
4. **画面右可见胯缘**：约 `(523,643)` 至 `(553,707)` 与参考右侧腰胯外缘相随；弧度及向外展开幅度稳定。下方至 `(564,757)` 再收回的圆弧由右腿覆盖，组合轮廓没有台阶、裂口或越出身体的突块。
5. **左右股根与隐藏补全**：候选独显较宽的下方填形在双腿下方延续，左右都保持连通。组合图中的胯部与两腿相接完整，在约 `(329,706)`、`(553,706)` 的外侧起点及向中央收合的接界未见漏填形成的细条或孔。临时连体衣只作为衣下身体体积的参考，未把衣服裁口误列为必须独立描出的身体孔洞。
6. **中央腿缝、尖端与孔**：独显和组合的 4 倍图共同核对了约 `x=424–457, y=810–826`。左侧 `(424.546875,815.8125)` 的转折接向 `(430,822)`，再经中央小弧到右侧 `(457,814)`，连续且无针状尖端。下缘位置与参考中央收口贴近，未见显著错位。组合图下方 `x≈429–454, y>823` 为两腿之间向下延续的开口，完整候选中显露后发；去掉后发后仍是合理的腿间负空间，不是 pelvis 内部漏填孔。左、右腿根和会阴相接处均没有额外孤立小孔或断裂。
7. **零散区域与内部细节**：该直属 part 是连续闭合填形；未见被漏掉的外露窄条、独立小块或需要保留却被填死的身体孔洞。当前审查不要求内部线条、临时衣装纹理或最终材质显影。

**视觉结论：pass。** 隐藏补全作为与 body、legs 的覆盖搭接单独理解；结论来自上述逐段图像检查，不以父范围检查替代。

## 父范围检查

- 读取报告：`refinement/groups/pelvis/2.直属拆分与色块/2.2.直属轮廓色块/轮廓检查.json`。
- 对应项：`kind=part`、`path=pelvis/pelvis_body`、`ids=[part-pelvis-pelvis-body]`。
- 报告结果：`status=pass`，`outside_samples=0`，`outside_area_px2=0.0`，`outside_bbox=null`。
- 范围结论：pass。该结果仅表示孩子被父色块容纳；可见边界已另行按图证核对。

## 整体结论

**overall: pass**

直属组件 1/1 已逐项检查；范围与视觉均通过。可见腰胯外缘、与 body／legs 的连接及中央开口连续，没有需要返修的明显偏移、变形或漏描。本轮未修改候选、树、参考或范围检查输入，未调度后续制作。
