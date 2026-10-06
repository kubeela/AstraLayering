# 本次专项节点交接

技能根：`/Users/wutian/Desktop/coding/AstraLayering/workflow-next/live2d-layering`。总工作根：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full`。当前 group_path、序列工作目录、当前节点和真实会话身份由总控消息单独指定；本文件不授权越过该节点。

每次开始或续做先读当前节点的 `流程.yaml`、选中分支、提示词和 model 文件名。技能及输入只读；产物和临时文件只写本次序列工作目录。Python 使用总工作根的 `.runtime/svg-preview/python/bin/python -B`。不修改主树或 dispatch 状态，不调用 group_cursor，不创建其他会话。不能凭工具 pass 声称视觉 pass；生成的关键图必须实际查看。

先立即回复已接收的节点和范围，随后完成制作；交付简短说明真实产物路径、SHA、改动对象、图证、检查结果和未解决项。读取 SVG 时优先提取相关容器、元素属性和差异摘要，避免向会话打印整份 SVG；大型压力采样 JSON 只输出必要字段与统计，不打印全部点表。不要为减少阅读量省略要求的实际查看。

## 1.父级轮廓补全

身份 `group:{group_path}`，gpt-6-astra / xhigh。只补当前父形体预计动作显露的同一表面和连接，保留其他组、所有已有孩子、树、根属性与已有资源。保留输入快照、实际 before/after、父独显、参考、混合、关键接界放大和判断。若当前父也受上一级父范围约束，先验证不出上一级；真实隐藏范围不足则交回坐标与依据。标准输出为 `block-layers/groups.svg`、`block-layers/preview.png`、`refinement/groups/{group_path}/1.父级轮廓补全/补全说明.md`。

## 2.1.直属结构拆分

独立身份 `group_split:{group_path}`，gpt-6-sol / xhigh。只拆当前一级，遵照提示词判断 group 与 part；已有直属节点沿用，patch 只列新增节点。镜像关联写同级完整路径，结构更完整的一侧在前。实际独显父、对照参考；连体服区域推断身体，不建立衣装节点。只交 children.json，经 groups.py check-children；树与 SVG 保持只读。总控 expand 后才进入绘制。

## 2.2.直属轮廓色块

身份沿用当前 `group:{group_path}`。父几何保持原文并冻结；只绘当前直属孩子，每个容器以全路径 `data-group-path` 或 `data-part-path` 绑定，闭合填色、全局唯一 id、真实负形留透明孔洞。核对父范围、完整归属、间隙、细尖、连接、饰物和左右实际差异。使用 svg_containment 按冻结父检查所有直属孩子；范围失败应交回父补全，不能通过裁碎真实形体掩盖失败。实际查看全孩子组合、混合以及每个孩子独显/参考/关键4×或8×边界。交标准 guide、preview、轮廓检查.json 和图证，等待总控独立审查；revise 只修改审查指出内容，保存历史及保护证明。

## 2.2.独立审查

独立身份 `group_child_layers:{group_path}:review`，gpt-6-astra / xhigh，候选稿只读。读取当前候选、范围报告、结构与参考，按照 review 提示词实际逐孩子核对，逐项紧邻写完整路径、容器 id、实际查看图和明确 pass/revise；同时查看孩子组合，防止父色块掩盖真正缺口。修改前后复验保留既有报告和作者。严格几何/字节相同的已审对象可明确引用既有证据，只重查发生变化的对象及受影响组合；不得把继承结论写成自己重新看过所有对象。最终结论必须对应实际冻结候选 SHA。

无变更证明不能覆盖当前新图发现的具体问题。孩子组合必须排除父底稿，分别检查相邻孩子的连接与真正背景孔；父范围成功、加入父后看似连续都不能代替孩子自身连续。本次头部发髻平底曾出现由父底稿填住的两条白缝，须在2.2孩子轮廓节点修复后再进入2.3。

## 2.3.运动露出补齐

只有直属 part 才选 then，身份沿用当前 group 制作。读取并实际看提示词的两张示例，对各直属 part 判断同一表面的隐藏延伸，或必须新增的内壁/后片；不能以当前正面可见范围代替动作范围。空 patch 也保存、check-children。冻结父，以临时扩展树检查全部直属孩子；保存判断、保护证明和实际图证。真实父缺口交回，禁止先发布失败 draft。总控 expand/checkpoint 后才做 geometry/rendering。

## 3.geometry 与 4.rendering stack

总控确认2.3成功后，遵循总工作根 `post-motion-instructions.md` 的13个串行节点，使用同一制作身份，只做当前直属 part。当前无直属 part 时跳过这些条件节点，等待总控 complete 当前 group_child_layers。不得进入子 group 抢跑。已有正式稿和其他 part 全部保留，资源用当前完整路径前缀；首次正式稿根匿名 defs 为空，资源放当前 part 的内部 defs，避免并行新增共用资源容器发生合并冲突。

所有节点交付后等待总控 checkpoint、complete 和 aggregate。动态待办由下一次 source next 返回，不能沿用初始六组清单作为完成条件。


## 参考图尺寸核对

base-subject.png 与 SVG 为 895×1758；line-reference.png 为895×1757。保持参考只读。局部线参考对照使用明确的同坐标 --reference-crop X Y W H（裁切范围不超图），避免整张自动缩放引入纵向位置差。几何以当前批准guide的画布坐标为准，线参考用于内部结构判断。


## 历史存档目录

保留旧报告、候选和图证，不把当前节点整目录递归复制到它自己的子目录。返修备份放序列的 tmp/history 下，或只复制本次要替换的原文件；已有不可变历史可以用清单与 SHA 明确引用，避免多轮复制嵌套 input/previous/history 形成倍增。先完成备份再创建位于源目录中的新返修目录，复制时明确排除该新目录与旧历史备份。
