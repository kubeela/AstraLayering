from pathlib import Path
import re,hashlib,json
p=Path('reviews/group_layers/审查.md')
old=p.read_text()
rows=re.findall(r'^\| `([^`/]+/[^`]+)` \| (pass|revise) \| (.*?) \|$',old,re.M)
assert len(rows)==45
new_notes={
'body/torso':'R1 已修：双肩底形连续。[当前肩部对照](../../block-layers/evidence/revision-r1-r3/shoulder-check.png)',
'body/arms/right_arm/right_upper_arm':'R1 已修：与躯干重叠衔接，独显完整。[当前底形](evidence/recheck-r1-r3/complete-bases.png)',
'body/arms/left_arm/left_upper_arm':'R1 已修：与躯干重叠衔接，独显完整。[当前底形](evidence/recheck-r1-r3/complete-bases.png)',
'face/right_ear':'R2 可见耳部已修：外耳廓和内耳垂同时露出，独显底形连续。[当前对照](../../block-layers/evidence/revision-r1-r3/right-ear-check.png)',
'face/left_ear':'R2 可见耳部已修：外耳廓和内耳垂同时露出，局部透明楔口已消除。[当前对照](../../block-layers/evidence/revision-r1-r3/left-ear-check.png)',
'hair/crown_hair':'R2 未修完：独显时双侧各有一个耳形三角孔。[当前证据](evidence/recheck-r1-r3/hair-base-holes.png)',
'hair/right_bangs':'R2 未修完：固定窗口在独显发束内形成封闭三角孔。[8 倍绑定渲染](evidence/recheck-r1-r3/right-bangs-detail.png)',
'hair/left_bangs':'R2 同一固定窗口裁切需协同复验；本组呈边缘缺口，不单独声称存在封闭孔。[当前底形](evidence/recheck-r1-r3/complete-bases.png)',
'hair/right_side_lock':'本轮已复验耳区覆盖、独显与隐藏；主发束和回收细梢通过。[当前底形](evidence/recheck-r1-r3/complete-bases.png)',
'hair/left_side_lock':'本轮修改后的耳区覆盖、独显与隐藏通过；主发束和回收细梢保留。[当前底形](evidence/recheck-r1-r3/complete-bases.png)',
'earrings/right_earring':'R3 已修：细颈、菱坠和下环轮廓恢复，重叠处无相消裂口。[当前对照](../../block-layers/evidence/revision-r1-r3/earring-check.png)',
'earrings/left_earring':'R3 已修：细颈、菱坠和下环轮廓恢复，重叠处无相消裂口。[当前对照](../../block-layers/evidence/revision-r1-r3/earring-check.png)',
}
failed={'hair/crown_hair','hair/right_bangs','hair/left_bangs'}
header='''# 第 3 步独立复验

当前结论：**revise**。当前候选 SHA-256：`a8720ccafcac13cc71042c40b00d973d239ee87c9865fca1a131c48750a5dda3`。

审查身份：`group_layers:review`。本轮仅复验 R1–R3、相邻遮挡和隐藏底形；不进入后续精修、着色、衣装或动画。坐标采用 1024 × 1536 原画布，左右按角色自身方向。

输入：[当前 SVG](../../block-layers/character.svg)、[参考](../../references/base-subject.png)、[groups.json](../../structure/groups.json)。首轮版本 `e2cbc656722895d36bd977fe22b10d2e0e14f5bd5d39f75003e4cb7be9888cbc` 已审查整图、六大类与全部 45 叶组，结论为 R1–R3 局部返修。

## 本轮结果与首轮问题状态

| 项目 | 当前结论 | 已修／剩余情况及证据 |
|---|---|---|
| R1 双肩透明楔缝 | pass | 画面左 `x=440–443, y=374–379`、右 `x=590–593, y=375–380` 的肩部连接已闭合；身体独显连续，原缝内采样 alpha 均为 255。[当前肩部对照](../../block-layers/evidence/revision-r1-r3/shoulder-check.png) |
| R2 双耳与发遮挡 | revise | 外侧耳廓、内侧窄耳垂及耳区透明楔口已修；但发组采用固定窗口裁切，独显底形产生穿孔，详见下文。[当前右耳](../../block-layers/evidence/revision-r1-r3/right-ear-check.png)、[当前左耳](../../block-layers/evidence/revision-r1-r3/left-ear-check.png) |
| R3 耳坠上段剪影 | pass | 约 `y=291–314` 的细连接颈、菱坠侧向膨出及下尖已恢复；实心片重叠处无 evenodd 相消裂口，下环孔洞保留。[当前耳坠对照](../../block-layers/evidence/revision-r1-r3/earring-check.png) |

剩余返修仅为 **R2 发组隐藏底形**。`ear_visibility_windows` 在 `hair/crown_hair` 中造成两个封闭三角孔，位于画面左约 `x=454–462, y=273–283`、画面右约 `x=575–583, y=274–283`；`hair/right_bangs` 在同一画面左区域也有封闭孔。右刘海原尺寸下的薄边容易被抗锯齿掩盖，绑定工具 8 倍渲染可明确看到封闭孔，范围约 `x=453.75–461.88, y=272.50–283.00`。`hair/left_bangs` 使用同一窗口并形成边缘缺口，需随共享遮挡处理一起复验。

这些窗口让整图露出耳朵，但独显发组仍保留耳形穿孔，不满足本节点“被遮挡底形须连续”。请调整耳朵与发组的叠放／遮挡，使独显发组恢复连续底形，同时保留当前已通过的耳部可见轮廓。可以在不同叠放位置使用多个唯一 ID 的绘制段，共享同一个完整 `data-group-path`；复验按路径聚合，不要求一个叶路径只能对应一个 `<g>`。

![当前发组独显的耳区孔洞／缺口](evidence/recheck-r1-r3/hair-base-holes.png)

[完整底形汇总](evidence/recheck-r1-r3/complete-bases.png) · [右刘海 8 倍绑定渲染](evidence/recheck-r1-r3/right-bangs-detail.png) · [当前局部整图对照](evidence/recheck-r1-r3/affected/comparison.png)

## 验证范围

使用绑定 `svg_preview.py` 独立重渲染，RGBA 像素与作者最新版渲染一致；使用绑定 `compare.py` 生成当前局部对照。重新隔离／隐藏了 9 个修改组及 3 个相邻组：12/12 独显非空，12/12 隐藏后实际改变整图。双耳完整底形、双耳坠均各为一个连通部分；非空和连通性不能代替发组无穿孔检查。[本轮记录](evidence/recheck-r1-r3/checks.json)、[孔洞记录](evidence/recheck-r1-r3/hair-hole-check.json)、[复验脚本](recheck.py)。

其余 33 组沿用首轮检查；这 33 组加上本轮复验的 3 个相邻组，共 36 个叶组内容未变。旧九张叶组页明确属于首轮版本，以下仅用于未修改组；修改组引用当前证据。首轮唯一 ID、完整路径和全部 45 叶组独显检查保持为历史记录，没有把旧页当成最新版重新验收。

## 全部叶路径当前状态

| group 路径 | 当前结论 | 说明与证据 |
|---|---|---|
'''
s=header+'\n'.join(f'| `{path}` | {"revise" if path in failed else "pass"} | {new_notes.get(path,note)} |' for path,_,note in rows)+'\n\n本次未修改 SVG、参考、groups 或运行记录。R1、R3 与可见耳部已通过；后续只需复验上述 R2 发组底形及其受影响遮挡。\n'
p.write_text(s)
for target in re.findall(r'\]\(([^)]+)\)',s):
 assert (p.parent/target).exists(),target
assert hashlib.sha256(Path('block-layers/character.svg').read_bytes()).hexdigest()=='a8720ccafcac13cc71042c40b00d973d239ee87c9865fca1a131c48750a5dda3'
print('report_updated; 45 paths: 42 pass, 3 revise; links_ok; candidate_unchanged')
