# body / generic 2.2 制作交付

本分支只执行 `group_child_layers` 制作节点，worker 身份为 `group_layer_drawing`。已读取绑定的完整 dispatch、流程.yaml、提示词.txt 和 `gpt-6-astra-xhigh.model`；model 文件为 0 字节选择标记。全部命令在绑定 working_dir 执行，渲染与范围检查使用绑定 execution_environment.python。

## 产物与范围

- `groups.svg`：包含输入稿此前全部内容，新增 body/chest、body/necklace、body/left_shoulder、body/right_shoulder、body/abdomen 五个直属组件。
- `preview.png`：本输出 SVG 的白底全图。
- `轮廓检查.json`：绑定 svg_containment.py 对全部五个孩子的最终检查，scale=4，每项 outside_samples=0，status=pass。

原始父 body 和其他已有元素逐字保留；移除标记包围的新增片段后，完整文件与输入 SVG 一致。画布仍为 1024 × 1536。未写 head 分支、结构文件、总控记录或其他节点。

五个孩子分别有唯一 ID 和完整 data-group-path / data-part-path；每条子路径闭合、纯色填充、stroke="none"。孩子和父稿分别使用独立容器。胸廓划分到下肋缘，腹部从下肋缘延至父稿腰线；肩帽依据身体结构划分，没有沿连体服领口分块。

外轮廓从父稿贝塞尔曲线分割取得，内部接缝有小幅重叠。新增的纯向量父轮廓 alpha mask 复制父稿路径，只约束孩子的渲染范围；父稿本身不变。此约束同时避免曲线分割后的亚像素边缘采样越界。4 倍采样的父轮廓内部覆盖检查为 0 缺口；剩余边界差异只在最外侧抗锯齿采样带，记录在 diagnostics/validation.json。

## 已查看的预览

- diagnostics/input-body.png：输入父 body 独显形体底稿。
- diagnostics/full-blend.png：整图 50% 参考混合。
- diagnostics/chest-abdomen-isolated.png：胸廓、腹部逐一独显及放大边缘叠加。
- diagnostics/shoulders-isolated.png：左右肩逐一独显及放大边缘叠加。
- diagnostics/necklace-isolated.png：项链独显、8 倍放大及边缘叠加；已校正左链偏移。

胸肩、下肋缘与腹部相接处没有明显缝隙或断裂。已修正右肩与胸廓交点的一处亚像素缺口，最终范围与覆盖检查通过。

## 未解决项：项链上段与父 body 范围冲突

参考图画面左侧项链上段伸到不可修改的父 body 之外。绘制链条中被父范围排除的可见段包围盒为原画布 `x=502..505, y=268..274`，约 7.875 px²；当前项链只能显示父范围内部分，不能宣称整条可见项链已覆盖。

证据见 diagnostics/necklace-input-blend.png 和 diagnostics/necklace-outside-parent.png，后者用红色标出范围冲突。冲突已通知上级并转交总控。若要求这一段也成为 body/necklace 的可见色块，需要上游修正父范围并重新绑定输入；本节点未擅自修改父稿或把项链迁到其他节点。

本轮未执行独立审查、Git 提交、推送或最终汇合。五项 bounds 通过只代表容纳检查通过，不能消除上述项链完整性限制。
