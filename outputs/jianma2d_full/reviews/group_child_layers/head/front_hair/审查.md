# head/front_hair 直属轮廓色块独立审查

节点：`group_child_layers:head/front_hair:review`；目标 n8。审查身份 `/root/review_front_hair_children`。

候选：`/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s2/block-layers/groups.svg`。SHA-256：`ffafca59ebecf9ea35d64405ca355315d9c62a968fc22e6eef874d94d3dc28f0`。输入、参考、树、候选和技能保持只读；本审查只写本序列 review 目录。审查已完成；整体结论 **PASS**（额外8×三处共边阈值FAIL原样保留，详见下文）。

读取依据：总根 group-route-instructions.md；当前 2.2 流程.yaml、制作提示词、review/提示词.txt；当前制作与审查 model 文件均为 `gpt-6-astra-xhigh.model`。

## 整图混合先检

已先实际查看作者 `refinement/groups/head/front_hair/2.直属拆分与色块/2.2.直属轮廓色块/evidence/final-full-mix.png`：当前发冠、左右刘海与两鬓的总体位置对准参考，左右实际形态有区别；头顶有冠饰遮挡。该整图不能排除内部接缝，继续逐孩子和去父组合核对。审查者另从冻结候选重新生成 `evidence-review-n8/00-full-mix.png`。

## 1. head/front_hair/fringe_left — PASS

容器 id：`group-head-front-hair-fringe-left`。刚实际查看审查者重渲染 `evidence-review-n8/01-fringe-left-4x.png`（crop 355,140,90,151；独显、参考、50%混合与边缘叠加）。宽刘海从中分根弧经额角、眼外侧至左颊上方的尖端完整，宽片及前缘细束的总体可见包络没有明显漏描；根弧未误缩到内部灰色阴影，中央直边位于冠饰遮挡处。向下的长弧、窄尾与参考方向一致；下端 (370,282) 闭合无断裂。这里未见实际外缘偏移问题。父范围的默认4×结果为0越界样本；额外8×共边样本另在范围小节独立验证。

## 2. head/front_hair/fringe_right — PASS

容器 id：`group-head-front-hair-fringe-right`。刚实际查看审查者 `evidence-review-n8/02-fringe-right-4x.png`（crop 426,140,95,150；独显、参考、50%混合与边缘叠加）。根部较左侧高、偏右的宽弧与不同的下行走势保留；额前内弧、中分冠饰后的接口、眼外侧细束和下部收束均连成闭合范围。下端 (499,279) 不断裂，宽片外侧与 temple_sweeps_right 的遮叠延续待组合图核对；此层是宽片与细束的组包络，细束分离及最终显影不在本节点。未见本层相对冻结父的实际偏移。默认4×范围0越界；额外8×中央共边样本另行确认。

## 3. head/front_hair/temple_sweeps_left — PASS

容器 id：`group-head-front-hair-temple-sweeps-left`。刚实际查看审查者 `evidence-review-n8/03-temple-left-4x.png`（crop 338,119,103,170；独显、参考、混合、边缘叠加）。头侧由冠翼后方沿外侧弧线下扫，完整容纳参考中的层叠发片；组包络内的发片层次交下一级。外侧弧线、耳上收紧和下部细尖方向与参考一致。左耳旁两处真实透明负形均显出棋盘格并落在参考对应狭小露肤区域：(约368.4–372.3,242.9–251.0)、(约360.8–365.0,253.1–262.4)；并非涂白模拟。内部向刘海延续的范围有遮叠余量。标准4×与额外8×均0越界。组合后的孔洞及尖端另看8×图确认。

## 4. head/front_hair/temple_sweeps_right — PASS

容器 id：`group-head-front-hair-temple-sweeps-right`。刚实际查看审查者 `evidence-review-n8/04-temple-right-4x.png`（crop 430,120,104,167；独显、参考、混合、边缘叠加）。右冠翼后、头侧至耳上的外包络与参考主要弧度相合，下部收束方向与右侧刘海相接；内部宽弧处于前刘海的遮叠范围，允许延续。没有机械复制左侧的透明孔；左右厚度及下端走势各自保留。外侧窄转折与下部尖端无断点。标准4×与额外8×均0越界，未见需返修的可见轮廓缺失。

## 5. head/front_hair/scalp_cap — PASS

容器 id：`part-head-front-hair-scalp-cap`。刚实际查看审查者 `evidence-review-n8/05-scalp-cap-4x.png`（crop 339,111,193,129；独显、参考、混合、边缘叠加）。冠饰下的头顶弧面是连成一片的发根底层，顶缘和两侧轮廓对准父的完整弧面；中央额前弧与父同界。两侧下缘在刘海和层叠发片后方，作为本轮隐藏衔接可存在宽重叠，不能误认作参考可见断口。独显没有碎片、孔洞误挖或断面；当前可见轮廓通过。默认4×范围0越界；额外8×中分共边样本另行确认。

## 去父组合与关键接界（独立实看）

已实际查看 `evidence-review-n8/06-children-only-4x.png`；渲染仅选取上述5个孩子 id，不包含 `group-head-front-hair`、上级 head、脸或冠饰。整个头顶、左右宽刘海与两鬓连续，中央额前开口及两个左耳透明孔保持真实背景，未发现由父底稿填住的内部白缝。

已实际查看 `evidence-review-n8/07-roots-8x.png`（381,119,113,86）。scalp_cap 与左右 temple_sweeps、左右 fringe 在根部均相接/重叠；中央 (436,174–194) 拼接、左右根弧与顶缘接界没有细长三角孔或断裂。已实际查看 `evidence-review-n8/08-left-hole-tip-8x.png`（342,230,45,57），两个左耳负形在加入所有孩子后仍露出棋盘格，未被 fringe_left/scalp_cap 补死；(370,282) 收束相连无裂隙，外缘无孤立细条漏画。以上组合检查 PASS。

已实际查看 `evidence-review-n8/09-right-junction-8x.png`（477,225,53,61）与 `evidence-review-n8/10-scalp-sides-8x.png`（339,184,194,51）。右侧 fringe_right / temple_sweeps_right 在下端相接，无细缝或独立碎片；本层下端承接后续游离发束的遮挡根部，右侧没有左侧两处特有的透明孔。scalp_cap 左右下缘为前发片后的连续底层，其边缘未越出冻结父外弧；组合已覆盖这些隐藏接界。对应检查 PASS。

## 范围与三处额外8×样本的独立确认

审查者从冻结输入 `refinement/groups/head/front_hair/2.直属拆分与色块/2.2.直属轮廓色块/input/groups.before.svg` 和当前最终候选重跑官方工具；结果写入本审查目录，不覆盖作者报告。

- `evidence-review-n8/containment-independent-4x.json`：**PASS**，5个直属孩子均为0越界样本、0面积。
- `evidence-review-n8/containment-independent-8x.json`：**FAIL**，完全重现作者三处各1个采样格，其余两项通过。此报告和作者的 `containment.final-8x.json` 均保留 FAIL。

| 完整路径 | 8×格左上坐标 | 独立重渲染父/孩子alpha | 每格面积 | 判读 |
| --- | --- | --- | --- | --- |
| head/front_hair/fringe_left | (418.375,190.5) | 116 / 128 | 0.015625 px² | 与父左中央共边严格反序复用，无几何位移 |
| head/front_hair/fringe_right | (436.5,193.625) | 121 / 128 | 0.015625 px² | 与父右中央共边严格正序复用，无几何位移 |
| head/front_hair/scalp_cap | (434.5,193.125) | 119 / 130 | 0.015625 px² | 与父左中央共边严格正序复用，无几何位移 |

独立解析当前SVG实际 `d`，左三次贝塞尔为 `(416,192)→(423,187)→(429,190)→(436,194)`，刘海左按四个点完全反序，头皮底层正序相同；右为 `(436,194)→(443,190)→(450,187)→(455,193)`，刘海右相同。证明和独立alpha值写入 `evidence-review-n8/independent-geometry-proof.json`，不是复述作者布尔值。实际查看了审查者重跑产生的 `containment-independent-8x-images/01-outside.png`、`02-outside.png`、`05-outside.png`，并看了其最近邻放大合图 `11-three-samples-enlarged.png`。每幅诊断图确有且仅有1个红色样本；它们在同一条曲线的抗锯齿边界。结合严格相同的控制点和8×根部图，确认是相同曲线在不同闭合路径上下文中的栅格化阈值差异；**不是可要求返修的实际偏移，也没有把额外8×结果改为通过。**

`evidence-review-n8/independent-coverage.json` 从5个孩子的实际去父组合8×渲染再次取样：向内1px的父区域缺失样本为0；仅2个外边缘阈值样本缺失，面积合计0.03125px²。左负形内取样 `(370,247)`、`(363,258)` 的组合alpha均为0；这与已实看的透明孔相符。该数值用于支持图像判读，不替代逐孩子视觉审查。

## 冻结、完整性与最终结论

独立核对：候选只相对冻结输入插入一个20行区段，其中恰为5个直属孩子容器；移除该插入区段后原文逐字节相同。冻结父容器和所有既有顶层节点的序列化内容不变，根属性相同，id全局唯一；新增容器全部完整路径绑定、每项闭合纯色填充、stroke none，无新增裁剪资源。当前候选与作者出图所用 `evidence/groups.candidate.svg` 字节相同。当前结构、rendering、正式SVG、两张参考SHA与作者输入保护记录逐项相同。

**整体结论：PASS。** 5个直属孩子均已独立实看且逐项PASS；去父组合连续；左耳两个真实负形与两侧尖端保留；标准4×父范围检查通过；额外8×三处单样本FAIL已独立确认是严格共边的栅格化阈值差异，其真实报告完整保留。结论仅绑定候选SHA `ffafca59ebecf9ea35d64405ca355315d9c62a968fc22e6eef874d94d3dc28f0`。

未解决制作问题：无。保留的诊断事实：额外8×报告仍为FAIL，不应在下游摘要中改写为全倍率0越界。未进入2.3、子group、geometry或rendering；未改树、状态或cursor。
