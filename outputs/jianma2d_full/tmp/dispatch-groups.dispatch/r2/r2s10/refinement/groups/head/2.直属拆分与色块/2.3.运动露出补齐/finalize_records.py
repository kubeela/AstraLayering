from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET
from datetime import datetime
from zoneinfo import ZoneInfo
N=Path(__file__).parent;D=N.parents[4]
R=Path('/Users/wutian/Desktop/coding/AstraLayering');ROOT=R/'outputs/jianma2d_full';SK=R/'workflow-next/live2d-layering'
T=SK/'templates/部件专项/generic/2.直属拆分与色块/2.3.运动露出补齐'
H=D/'tmp/history/head-motion-current-20261006-01'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,x):(N/name).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
now=datetime.now(ZoneInfo('Asia/Shanghai')).isoformat()
manifest=json.loads((N/'input/manifest.json').read_text())
for rel,digest in manifest.items():assert sha(D/rel)==digest,rel
assert sha(N/'candidate.svg')==sha(N/'input/groups.svg')==sha(D/'block-layers/groups.svg')=='dc53125f3eab4c6f0e3fe016146df7bffeca8903368ea0508cc28f05691e749b'
assert sha(N/'candidate.preview.png')==sha(D/'block-layers/preview.png')
assert (N/'temporary.groups.json').read_bytes()==(D/'structure/groups.json').read_bytes()
assert json.loads((N/'children.json').read_text())=={'groups':[],'parts':[]}
bounds=json.loads((N/'轮廓检查.json').read_text());assert len(bounds['results'])==12 and all(x['status']=='pass' and x['outside_samples']==0 for x in bounds['results'])
formal=ET.parse(D/'refinement/character.svg').getroot();formal_parts=sorted({e.get('data-part-path') for e in formal.iter() if e.get('data-part-path')})
save('保护证明.json',{'status':'pass','actual_worker':'/root/group_head_ear_gap_recovery','input_output_entire_svg_byte_identical':True,
 'all_parent_shapes_and_12_children_preserved':True,'new_crown_3_d_and_right_ear_d_preserved':True,'root_resources_and_all_external_objects_preserved':True,
 'temporary_tree_equals_input':True,'protected_file_hashes':manifest,'formal_parts_preserved':formal_parts,
 'r1_motion_source_record':str(N/'R1-provenance.json'),'no_new_parts':True,'no_geometry_mutation':True})
save('check-children.json',{'status':'pass','actual_worker':'/root/group_head_ear_gap_recovery','tool':str(SK/'tools/groups.py'),
 'command':'check-children','groups':str(D/'structure/groups.json'),'group_path':'head','patch':str(N/'children.json'),
 'patch_sha256':sha(N/'children.json'),'exit_code':0,'execution_evidence':'Current tool execution returned exit_code 0 with empty stdout; not copied from R1.',
 'temporary_tree':str(N/'temporary.groups.json'),'temporary_tree_sha256':sha(N/'temporary.groups.json')})
save('configuration-read.json',{'actual_worker':'/root/group_head_ear_gap_recovery','logical_worker':'group:head','node':'part_motion_completion',
 'branch':'then','configured_model_filename':'gpt-6-astra-xhigh.model','time':now,
 'files':[{'path':str(p),'sha256':sha(p)} for p in [ROOT/'group-route-instructions.md',T/'流程.yaml',T/'提示词.txt',T/'gpt-6-astra-xhigh.model']],
 'current_direct_parts':['head/topknot_bun','head/earring_left','head/earring_right'],'child_groups_not_entered':9})
views=[]
for name,reason in [('milly-collar-wrist.png','实际查看：后领宽底形和腕带后半圈承接遮挡，补全依据是表面延续及独立叠放关系。'),('milly-sleeve-shoe.png','实际查看：袖/鞋内壁只有在前后层级不同、需要独立可见后壁时拆出。当前三部件没有这种独立内壁。')]:
    p=T/'references'/name;views.append({'path':str(p),'sha256':sha(p),'actually_opened':True,'judgment':reason})
for row in json.loads((N/'render-manifest.json').read_text())['jobs']:
    p=Path(row['path']);assert sha(p)==row['sha256']
    if p.name.startswith('bun-occluders'):reason='仅诊断：冠饰和前发相对位移 ±4 px 后，发髻下根依然有圆顺连续底形承接，新露出的窄带不是透明断缝。'
    elif '-swing-' in p.name:reason='仅诊断：耳件绕固定挂点 ±6° 小摆，脸部置前遮挡时顶杆仍伸入遮挡区，杆与宝石连接连续；这不是成品绑定动画。'
    elif p.name.startswith('bun'):reason='当前发髻独显/参考/前后或根部：底形圆顺延至 y134，冠饰和前发下面有同表面余量；输入输出无差分。'
    elif 'left' in p.name:reason='当前左耳坠独显/参考/前后或根部：y276 顶杆埋入耳侧，杆、宝石与下链连续，保留已有范围。'
    elif 'right' in p.name:reason='当前右耳坠独显/参考/前后或根部：R1 圆帽顶杆至约 y269.4，连接原 y275 以下杆段自然；原可见轮廓保留。'
    elif p.name=='children-head-no-parent.png':reason='本轮 12 孩子去父组合：检查发髻底根和耳侧连接，母底稿未参与遮掩；未重新逐件审查九个 group。'
    else:reason='当前完整混合图：冠饰、校准右耳弧及其他对象维持已批准输入。'
    views.append({'path':str(p),'sha256':sha(p),'actually_opened':True,'judgment':reason})
views.append({'path':str(N/'candidate.preview.png'),'sha256':sha(N/'candidate.preview.png'),'actually_opened':True,
 'judgment':'本轮重新渲染白底全图已实际打开，与标准 preview 字节相同；保持批准输入。'})
save('实际看图记录.json',{'actual_worker':'/root/group_head_ear_gap_recovery','time':now,'candidate_sha256':sha(N/'candidate.svg'),
 'tool':'view_image','images':views,'example_count':2,'new_current_artifact_views':21,
 'motion_diagnostics_only':True,'line_alignment':'explicit same-coordinate reference-crop; guide/base 895x1758, line 895x1757'})
note=f'''# head 2.3：当前三部件运动露出复核

本轮执行 `part_motion_completion` 的 then 分支，实际制作者 `/root/group_head_ear_gap_recovery`，逻辑身份 `group:head`。冻结输入为已独审批准的 dc53125 候选。本轮重新查看 Milly 两例、三个当前直属 part、参考和局部运动诊断后，确认已有同表面余量可沿用，提交空新增清单。没有把 R1 的旧文件直接当作本轮自动通过。

当前整份 candidate、标准 guide 和输入字节相同，SHA `{sha(N/'candidate.svg')}`；preview 重新渲染并实际打开，和标准稿字节相同，SHA `{sha(N/'candidate.preview.png')}`。没有新增任何 path、desc、part 或 group。三个 part 的完整容器与 R1 实际 motion 候选 97e26f6f…一致；历史真实作者仍是 `/root/group_head_motion_recovery`，详见 `{N/'R1-provenance.json'}`，不把旧几何重新认领为本轮新绘制。

Milly 后领/腕带示例说明遮挡下应有连续底形；袖口/鞋口示例说明需要独立层级的内壁才另建 part。本轮三部件都没有需要前后单独叠放的内壁或后片，因此沿用原节点，而不是机械复制示例的拆分。

| 完整路径 / 容器 | 遮挡、预计动作、可能露出 | 本轮实际判断 |
| --- | --- | --- |
| head/topknot_bun / part-head-topknot-bun | 冠饰和前发遮住下根；正常轻微俯仰产生约 3–5 px 相对变化。 | 当前圆顺完整底形到 y134。独显及下根 8 倍可见冠带以下的隐藏余量；另外用冠饰/前发相对发髻 (-4,-4) 和 (+4,+4) px 临时诊断，露出的底根带连续。保留原表面，不新建后片。 |
| head/earring_left / part-head-earring-left | 耳侧遮住顶杆；约 (383,278) 为小摆挂点，耳遮挡线可相对变化 1–2 px。 | 原顶杆从 y276 起，原杆与宝石/下链连接连续。实际查看 ±6° 临时小摆，顶端持续埋入耳侧遮挡。8 倍帽端中心采样同时考虑遮挡件 y 偏移 ±2 px，均仍被覆盖。沿用。 |
| head/earring_right / part-head-earring-right | 耳垂遮住顶杆；约 (492,275) 为小摆挂点，约 2–3 px 相对变化可能露出原平截头。 | R1 已补圆帽顶杆到约 y269.4，保留约 5.6 px 向耳内的延续。当前原色、线稿、根部 8 倍与 ±6° 临时小摆均实际查看，杆面连续；帽端中心在遮挡件 y 偏移 ±3 px 时仍覆盖。沿用已有真实补形。 |

临时动作文件仅用于判断当前隐藏余量，不是新 rig、正式图或交付几何，也不改变母形。耳件诊断将脸部置前表示实际遮挡层，并非更改正式 rendering registry。挂点采样是局部证据，不声称覆盖任意大幅摆动；见 `{N/'挂点余量采样.json'}`。本节点依据正常小幅相对运动判断。前后图均为当前输入与保留输出同坐标对照，零差分是这次沿用决策的结果。

已真实执行 groups.py check-children，退出码 0，空清单为 `{{"groups": [], "parts": []}}`。临时树为原树加空增量，与原树逐字相同。新执行默认 4 倍、alpha=128 的全部 12 直属范围检查，12 PASS / outside 0；当前无需要交回的父范围缺口。九个子 group 的内部不进入，正确 crown 三 d、右耳弧、head 的耳薄补形和三冠薄补形全部冻结。

当前 formal 和 registry 未修改，仍为输入 SHA；其已有 6 个正式 part 保留。guide、tree、formal、registry、options、refs、root/resources 与全部外部对象的保护详见 `{N/'保护证明.json'}`。R1 旧记录只引用；D 的本轮历史仅逐个备份标准 guide、preview 到 `{H}`，没有递归复制旧 history。

实际查看清单为两张 Milly、20 张当前诊断和一张白底 preview，共 23 张；见 `{N/'实际看图记录.json'}`。候选、临时树、children、范围报告和作者 manifest 都在本 2.3 目录。标准 guide 和 preview 已与本轮产物核对相同，故保持原字节。等待总控 expand/checkpoint；本 worker 未执行 cursor/state/tree 写入、13 个后续节点、正式绘制或新 agent。
'''
(N/'判断记录.md').write_text(note)
receipt={'actual_worker':'/root/group_head_ear_gap_recovery','logical_worker':'group:head','node':'part_motion_completion','branch':'then',
 'time':now,'status':'self_check_pass_awaiting_root_expand_checkpoint','input_sha256':sha(N/'input/groups.svg'),
 'candidate_sha256':sha(N/'candidate.svg'),'new_parts':0,'geometry_changes':0,'direct_parts_checked':cfgparts if False else ['head/topknot_bun','head/earring_left','head/earring_right'],
 'all_12_bounds_pass_outside_0':True,'milly_examples_actually_viewed':True,'new_current_images_actually_viewed':21,
 'old_geometry_author':'/root/group_head_motion_recovery','new_current_check_author':'/root/group_head_ear_gap_recovery',
 'unresolved_parent_gaps':[],'advanced_to_13':False,'state_or_tree_written':False}
save('交付记录.json',receipt)
paths=[D/'block-layers/groups.svg',D/'block-layers/preview.png',N/'children.json',N/'轮廓检查.json',N/'判断记录.md',N/'保护证明.json',N/'check-children.json',N/'交付记录.json',N/'实际看图记录.json',N/'configuration-read.json',N/'candidate.svg',N/'candidate.preview.png',N/'temporary.groups.json',N/'R1-provenance.json',N/'挂点余量采样.json',N/'render-manifest.json',N/'input/manifest.json',H/'manifest.json']
output={'actual_worker':'/root/group_head_ear_gap_recovery','logical_worker':'group:head','node':'part_motion_completion','branch':'then','time':now,
 'status':'self_check_pass_awaiting_root_expand_checkpoint','candidate_sha256':sha(N/'candidate.svg'),
 'files':[{'path':str(p),'sha256':sha(p)} for p in paths],'geometry_changes':0,'new_parts':0}
save('output-sha256.json',output)
for row in output['files']:assert sha(Path(row['path']))==row['sha256']
for p in [D/'block-layers/groups.svg',D/'block-layers/preview.png',N/'children.json',N/'轮廓检查.json',N/'判断记录.md',N/'output-sha256.json',N/'交付记录.json']:
 print(str(p),sha(p))
print('views',len(views),'formal_parts',len(formal_parts),'verified_manifest_files',len(paths))
