from pathlib import Path
import re,hashlib
p=Path('reviews/group_layers/审查.md')
old=p.read_text()
rows=re.findall(r'^\| `([^`/]+/[^`]+)` \| (pass|revise) \| (.*?) \|$',old,re.M)
assert len(rows)==45
notes={
'hair/crown_hair':'R2 已关闭：独显底形完整，双侧耳形孔洞消失。[当前完整发组](../../block-layers/evidence/revision-r2-bases/complete-hair-bases.png)',
'hair/right_bangs':'R2 已关闭：固定裁切已删除，独显无封闭三角孔。[当前完整发组](../../block-layers/evidence/revision-r2-bases/complete-hair-bases.png)',
'hair/left_bangs':'R2 已关闭：固定裁切和耳形边缘缺口已删除，底形连续。[当前完整发组](../../block-layers/evidence/revision-r2-bases/complete-hair-bases.png)',
'face/right_ear':'R2 已关闭：完整底形与前置耳廓按同一路径聚合显隐，无残留绘制段。[当前聚合对照](../../block-layers/evidence/revision-r2-bases/ear-leaf-aggregation.png)',
'face/left_ear':'R2 已关闭：完整底形与前置耳廓按同一路径聚合显隐，无残留绘制段。[当前聚合对照](../../block-layers/evidence/revision-r2-bases/ear-leaf-aggregation.png)',
'hair/right_side_lock':'本轮相邻遮挡复验通过；耳廓、耳垂和主发束关系保持。[当前局部对照](evidence/recheck-final/ears/comparison.png)',
'hair/left_side_lock':'本轮相邻遮挡复验通过；耳廓、耳垂和主发束关系保持。[当前局部对照](evidence/recheck-final/ears/comparison.png)',
}
header='''# 第 3 步独立审查

最终结论：**pass**。当前候选 SHA-256：`38bab0527ec626c10fbc531c5551a64b780a4955335870a5ef25b75859dce9e3`。

审查身份：`group_layers:review`。**R1、R2、R3 均已关闭，无剩余返修项。** 结论仅覆盖第 3 步纯色向量分组稿；未执行后续精修、着色、衣装或动画步骤。

输入：[当前 SVG](../../block-layers/character.svg)、[参考](../../references/base-subject.png)、[groups.json](../../structure/groups.json)。画布为 1024 × 1536；左右名称按角色自身方向。

## 问题关闭记录

| 首轮问题 | 最终结论 | 修复与复验 |
|---|---|---|
| R1 双肩透明楔缝 | pass | 躯干与上臂底形连续，肩部原缝已闭合；上一轮已独立通过，本轮相关像素保持一致。[肩部对照](../../block-layers/evidence/revision-r1-r3/shoulder-check.png) |
| R2 双耳遮挡及发组隐藏底形 | pass | 外耳廓和窄耳垂露出正确。中间版本的固定耳形裁切已删除；头顶发块、双侧刘海独显均恢复完整底形，无封闭穿孔。双耳采用完整底形与前置耳廓分段叠放，按同一叶路径聚合显隐，两段一起消失。[完整发组](../../block-layers/evidence/revision-r2-bases/complete-hair-bases.png)、[双耳聚合显隐](../../block-layers/evidence/revision-r2-bases/ear-leaf-aggregation.png) |
| R3 耳坠上段剪影 | pass | 细连接颈、菱坠和下环关系恢复，连接处无 evenodd 相消裂口；上一轮已独立通过，本轮相关像素保持一致。[耳坠对照](../../block-layers/evidence/revision-r1-r3/earring-check.png) |

![最终耳部局部：参考／候选／可见边界叠加](evidence/recheck-final/ears/comparison.png)

## 验证范围与版本

首轮 `e2cbc656…` 已审查整图、六大类和全部 45 叶路径，发现 R1–R3。中间版 `a8720cca…` 已通过 R1、R3 和可见耳部，剩余发组穿孔在本轮关闭。临时连体服排除、身体遮挡补全和其余未改内容沿用此前通过结论；旧叶组页仅作对应未改内容的历史证据。

本轮使用绑定 `svg_preview.py` 独立重渲染，并用绑定 `compare.py` 核对局部外观。确认 45 个逻辑叶路径与清单完全一致、47 个绘制段 ID 全部唯一，无 clipPath 或 mask；双耳各两个绘制段共享所属完整路径。7 个相关叶路径均按全部 ID 聚合独显／隐藏：7/7 独显非空，7/7 隐藏后实际改变整图，双耳无前置段残留。头顶发块和双侧刘海的 4 倍直接渲染均无封闭孔洞，目视完整底形及耳区叠放通过。

独立当前渲染与作者当前渲染 RGBA 像素一致；相对上一版仅 66 个像素变化，全部位于耳区 `x=446–587, y=272–282`，R1/R3 对应区域完全不变。[最终检查记录](evidence/recheck-final/checks.json)、[复验脚本](recheck_final.py)。本轮只检查剩余 R2 与必要邻接，没有重读全部历史图片或扩展到后续步骤。

## 全部叶路径最终状态

| group 路径 | 最终结论 | 说明与证据 |
|---|---|---|
'''
s=header+'\n'.join(f'| `{path}` | pass | {notes.get(path,note)} |' for path,_,note in rows)+'\n\n本次仅更新审查报告及复验证据，未修改 SVG、参考、groups 或运行记录。\n'
p.write_text(s)
for target in re.findall(r'\]\(([^)]+)\)',s):assert (p.parent/target).exists(),target
assert hashlib.sha256(Path('block-layers/character.svg').read_bytes()).hexdigest()=='38bab0527ec626c10fbc531c5551a64b780a4955335870a5ef25b75859dce9e3'
print('final report: pass; 45/45 leaf paths pass; R1/R2/R3 closed; links_ok; candidate_unchanged')
