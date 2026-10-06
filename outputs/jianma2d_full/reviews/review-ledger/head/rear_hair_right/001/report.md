# 直属轮廓色块独立审查：head/rear_hair_right

- 审查身份：group_child_layers:head/rear_hair_right:review；按当前 review/gpt-6-astra-xhigh.model 节点执行。
- 当前冻结候选：/Users/wutian/Desktop/coding/AstraLayering/outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s4/block-layers/groups.svg
- 当前候选 SHA256：ac59e4a88bd70921d49b1df8633c89071bae1106bb54d887362712b1d882a97f
- 结构与两参考只读；候选未改写。以下证据均由本审查重新生成并逐图实际查看，除明确标注的原始诊断。
- 原始 DEFAULT4 范围：整体 FAIL；outer_back_curtain PASS、occipital_root PASS；inner_back_curtain FAIL，1 sample / 0.0625 px²，bbox [522,1280.75,0.25,0.25]。保持原始报告不变。

## 1. head/rear_hair_right/inner_back_curtain

- 容器 id：`group-head-rear-hair-right-inner-back-curtain`；形体 id：`head-rear-right-inner-main`、`head-rear-right-inner-neck`、`head-rear-right-inner-hidden`。
- 已实际查看本目录 `00-full-blend.png`、`01-inner-base.png`、`02-inner-root-line-4x.png`、`03-inner-tip-line-8x.png`、`04-inner-tip-base-8x.png`。两参考局部均使用显式同坐标 crop；线参考未整图缩放。
- 参考轮廓结论：**PASS**。内侧发幕从耳后贯通至 x519,y1423 的尖梢；内侧沿身体后方的宽面属于冻结父的隐藏延续，不误作可见皮肤。可见下段左凹边与右凸边在 8×图中转向连续，末端收尖与参考一致，没有截平或断点。根颈三角连接的窄孔保留透明，外缘沿参考发根回转；被头颈/前发遮住的接头允许重叠。
- 范围原始判定：**RAW FAIL**，1 sample / 0.0625 px²，bbox [522,1280.75,0.25,0.25]；并非工具 PASS。该点严格几何审查另列，当前不以制作员的 AA 解释直接豁免。

## 2. head/rear_hair_right/outer_back_curtain

- 容器 id：`group-head-rear-hair-right-outer-back-curtain`；路径 id：`head-rear-right-outer-main`。
- 已实际查看本目录 `05-outer-base.png`、`06-upper-hole-line-4x.png`、`07-lower-hole-line-8x.png`、`08-long-flying-tip-line-8x.png`、`09-lowest-fork-line-8x.png`、`10-outer-hook-line-8x.png`、`11-outer-root-line-4x.png`、`12-long-flying-tip-base-8x.png`、`13-lowest-fork-base-8x.png`、`14-upper-hole-base-4x.png`、`15-lower-hole-base-8x.png`。
- 两处长负形孔（约 x616–717,y616–875 与 x690–733,y951–1102）均为透明闭合内孔，孔的尖头、回弯、与主体连接连续，参考孔形基本吻合。根部窄孔、右下回钩末端及多叉梢均存在，未见漏画或截平。
- 范围结论：**RAW PASS**（0 outside samples）。
- 参考轮廓结论：**REVISE**。右侧斜飞长尖上/右外缘 x约795–834、y约1220–1290 明显向背景鼓出，图 `08` 与 `12` 分别对照线参考、彩色参考均确认；因此不能解释为线参考与彩参不一致。尖端 x839,y1313 本身及下/左内缘基本对齐，偏差集中在外侧凸弧，造成长尖过宽。基准彩参 y1240 的最后显著发色像素在 x802、y1250 在 x809、y1260 在 x815，候选外弧位于其右方；具体曲线测量续列。该外缘虽继承冻结父，当前新图发现的具体参考问题仍须保留。
- 返修目标：仅对 `head-rear-right-outer-main` 中斜飞长束上/右可见边（至 x839,y1313 的外侧弧）按彩参收回，保持尖端、下/左边、两长孔、其余发梢和父几何不变。修后复验该长尖、与相邻长束连接和直属范围。

## 3. head/rear_hair_right/occipital_root

- 容器 id：`part-head-rear-hair-right-occipital-root`；形体 id：`head-rear-right-occipital-base`、`head-rear-right-occipital-neck`。
- 已实际查看本目录 `16-root-base-4x.png`、`17-root-line-4x.png`，完整独显覆盖 x425–565,y190–395，两参考均使用相同坐标 crop。
- 参考轮廓结论：**PASS**。上部后脑附着面沿冻结父补全范围延续，被前发/脸遮住的轮廓没有被误裁成当前可见细条。耳后至肩上方的颈后发根完整；小窄孔真实透明，回弯不断裂；右下接头至 x551,y381，可与两发幕同表面衔接。下边与肩/颈接界按参考连续，不缺颈后扇面。
- 范围结论：**RAW PASS**（0 outside samples）。组合连接在后续去父图中复核。

## 4. 去父组合与覆盖

- 新生成并实际查看：`18-children-only-base.png`、`19-children-root-neck-8x.png`、`20-children-join-8x.png`、`21-children-aa-region-8x.png`。仅以 `--only` 选择上述三个直属容器，冻结父底稿与其他绘画均不参与，不能用父底稿填缝。
- 根/颈扇面交叠处颜色连续，未见由父遮住的白缝；两长发幕中间连接顺畅，x564,y1266 以下是参考中两束分开的背景开口，未误判为缺口。原始失败点附近也未见实际突出或缝隙。
- 本审查重新计算的 `independent-children-coverage.json`：DEFAULT4、threshold128，对冻结父的孩子实际合成缺失 0 samples。重叠边界 alpha 累积新增 95 occupied samples（5.9375 px²），并不等于真实几何越界，也不能替代直属范围报告。
- 上长孔另新生成并实际查看 `23-upper-hole-top-line-8x.png` 与 `24-upper-hole-bottom-line-8x.png`，覆盖上尖、长边、底部回弯及连接。下长孔已由 `07`/`15` 的 8×图核对；两孔拓扑与连接 PASS。
- 连接/覆盖结论：**PASS**。参考轮廓仍保留第2项长尖外弧 **REVISE**，覆盖父色块不能豁免参考偏差。

## 5. 单点范围 FAIL 的独立核验

实际新跑 `svg_containment.py` 的 DEFAULT4 等价 check，输出本目录 `independent-raw-default4.json`。结果与原报告相同：整体 **RAW FAIL**，inner 1 sample / 0.0625 px²；outer、root 各 PASS。未修改原始 `轮廓检查.json`，绝不记作工具 3 PASS。

实际查看原 `轮廓检查-images/01-outside.png`、本次 `independent-raw-default4-images/01-outside.png` 和新图 `22-independent-aa-coordinate.png`。独立读取冻结输入 SVG 与当前 SVG 原文、继承属性，计算保存在 `independent-geometry-and-aa.json`；没有依据制作员文字直接采信结论。

1. 冻结父容器与当前父容器 XML 原文序列化相同。父路径 `head-rear-right-main`、孩子路径 `head-rear-right-inner-main` 均含完整原文 `C 537 1412 545 1395 541 1374 C 537 1344 523 1310 522 1278 C 522 1244 517 1222 516 1190`。失败点对应的整段为 P0=(541,1374)、P1=(537,1344)、P2=(523,1310)、P3=(522,1278)，两个路径均保留完整 t∈[0,1]、方向相同、未细分或挪点。
2. 同一参数曲线的多项式：x(t)=23t³−30t²−12t+541；y(t)=6t³−12t²−90t+1374。控制点 y 严格递减，y 在该完整参数范围内单调下降。
3. 路径自身都 `stroke=none`、`fill-rule=evenodd`；父容器分别只继承实体色 #B5A34A 与 #69A6CA、stroke=none；SVG根为 895×1758、viewBox 0 0 895 1758。相关祖先链无 transform、clip-path、mask、opacity、display 等改变几何或覆盖的属性；整份候选无 stylesheet。没有裁剪孩子。
4. 独立使用工具实际 region [435,197,405,1315] 和 4× alpha，在 bbox [522,1280.75,0.25,0.25] 中心 P=(522.125,1280.875) 复得父 alpha=127、孩子 alpha=128。3×3 alpha 除中心一档之外一致。128 阈值因此将父判空、孩子判占据。
5. 以高精度十进制对完整三次曲线求解 y=1280.875，t≈0.9701062659108727622672188922922455761，边界 x≈522.12391855620655472697736034054629。P.x−边界x≈+0.001081443793445273>0。
6. 不是只凭点靠近共边推断内外：对两条完整 evenodd 路径在该 y 求全部交点，父有6交点、孩子2交点；该点向右射线分别5次、1次穿越，均在填充内部。边界左右 ±0.001 的探点结果也独立一致：左侧均空，右侧均填充。父的其他相邻路径不会移除此填充区域。

**严格几何范围结论：PASS，单个 RAW FAIL 为 AA/阈值误报。** 完全相同的整段曲线、相同填充侧与内部中心点排除了此处真实几何越界。结论仅解释当前冻结 SHA 的这一失败点，不改写 RAW FAIL、不以总面积容差放行，也不豁免第2项真实参考偏差。初次自写射线求根调试曾重复计入二分终点，已修正后完整重算；旧调试输出单独保留为 `numerical-draft-duplicate-root-debug.json`，不作为判定依据。

## 6. 长尖参考偏差的坐标证据

`independent-geometry-and-aa.json` 同时从孩子的完整路径求每行最右几何交点，并读取彩参同坐标的显著发色边缘（min RGB<230，白底）：

| y | 候选最右边界 x | 彩参最后显著发色像素 x | 候选向右偏出约 px |
|---:|---:|---:|---:|
|1230|801.027|794|7.03|
|1240|808.413|802|6.41|
|1250|815.275|809|6.28|
|1260|821.343|815|6.34|
|1270|826.492|822|4.49|
|1280|830.705|827|3.71|
|1290|834.045|832|2.05|

这只是辅助定位，返修依据是已实际查看的两张 8×同坐标图 `08-long-flying-tip-line-8x.png` 与 `12-long-flying-tip-base-8x.png`。偏差比参考软边/一像素量化明显更大，影响束宽；需收回连续外侧弧，不能仅挪末端。

## 总判定

**REVISE**。

- head/rear_hair_right/inner_back_curtain：参考 PASS；严格几何范围 PASS，保留 RAW FAIL 1 sample 的明确 AA 豁免依据。
- head/rear_hair_right/outer_back_curtain：RAW 范围 PASS；两长孔、根接界和发梢完整性 PASS；右侧斜飞长尖外弧参考贴合 REVISE。
- head/rear_hair_right/occipital_root：参考与 RAW 范围 PASS。
- 去父组合连接与覆盖 PASS。
- 仅返修外层发幕斜飞长尖外弧；本审查没有改候选、结构、参考、父轮廓或状态。原制作身份完成后按新 SHA 复验变化对象和受影响组合。

最终报告对应候选 SHA256：**ac59e4a88bd70921d49b1df8633c89071bae1106bb54d887362712b1d882a97f**。
