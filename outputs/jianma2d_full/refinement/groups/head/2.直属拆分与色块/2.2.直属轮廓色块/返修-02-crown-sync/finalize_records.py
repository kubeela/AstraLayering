from pathlib import Path
import json,hashlib,shutil
from datetime import datetime
from zoneinfo import ZoneInfo
R=Path('/Users/wutian/Desktop/coding/AstraLayering');ROOT=R/'outputs/jianma2d_full';SK=R/'workflow-next/live2d-layering'
O=Path(__file__).parent;N=O.parent;D=O.parents[5]
H=D/'tmp/history/head-crown-child-sync-20261006-01'
S=ROOT/'tmp/dispatch-groups.dispatch/r2/r2s5/refinement/groups/head/crown/1.父级轮廓补全/返修-01-parent-recovery/candidate.svg'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
now=datetime.now(ZoneInfo('Asia/Shanghai')).isoformat()
candidate_sha=sha(O/'candidate.svg');assert candidate_sha==sha(D/'block-layers/groups.svg')=='dc53125f3eab4c6f0e3fe016146df7bffeca8903368ea0508cc28f05691e749b'
cfg={'logical_worker':'group:head','actual_worker':'/root/group_head_ear_gap_recovery','node':'group_child_layers',
 'revision':'返修-02-crown-sync','configured_model_filename':'gpt-6-astra-xhigh.model','time':now,
 'configuration_files':[{'path':str(p),'sha256':sha(p)} for p in [ROOT/'group-route-instructions.md',
 SK/'templates/部件专项/generic/2.直属拆分与色块/2.2.直属轮廓色块/流程.yaml',
 SK/'templates/部件专项/generic/2.直属拆分与色块/2.2.直属轮廓色块/提示词.txt',
 SK/'templates/部件专项/generic/2.直属拆分与色块/2.2.直属轮廓色块/gpt-6-astra-xhigh.model']],
 'frozen_head_input_sha256':sha(O/'input/groups.svg'),
 'independent_split_retention_record':str(ROOT/'tmp/ancestor-reopens/r2/head/unchanged-structure-retention.json'),
 'structure_node_new_execution_claim':False,'original_split_author':'/root/group_split_head',
 'node_boundary':'Only 2.2 specified crown three d sync. No new child/anchor, motion, formal, checkpoint, cursor/state, agents or independent review.'}
save(O/'configuration-read.json',cfg)
jobs=json.loads((O/'render-manifest.json').read_text())['jobs'];views=[]
for row in jobs:
    p=Path(row['path']);name=p.name
    assert sha(p)==row['sha256']
    if name.startswith('arch-'):
        reason='冠梁顶部或肩部：原色外缘、内缘与窄弧带相合；两肩无原下凹折接。线稿整体较高，只用于结构核对。前后差分只见校准弧带。'
    elif name.startswith('left-bridge') or name.startswith('right-bridge'):
        reason='内桥与竖翼的旧透明竖缝已闭合；横梁厚度、走向保持，下方孔洞透明。前后差分局限原缝。'
    elif name.startswith('crown-alone'):
        reason='当前 crown 自己独显与参考：窄冠梁与双桥连续，冠梁下大背景及左右真实孔保留；其他五条路径原样。'
    elif name.startswith('ear-'):
        reason='本轮新候选实际重看正确右耳弧：向左下回转并渐尖，原色与同坐标线稿走向保持，未重新改写校准 d。'
    elif name.startswith('children-no-parent-ear'):
        reason='12 孩子去父耳侧组合：耳尾连续，两侧负形保留，与前发、后发和耳坠的现有关系保持。'
    elif name.startswith('children-no-parent-crown'):
        reason='12 孩子去父冠饰组合：冠梁和双桥连接由 crown 自身形成，不依靠 head 母底稿遮住原断缝；真实背景孔可见。'
    elif name.startswith('children-no-parent'):
        reason='当前 12 孩子去父整体及原色混合：冠饰、发髻、前发与垂带关系保持；此组合查看不冒充对所有旧孩子的逐件新审查。'
    elif name=='frozen-head-alone.png':
        reason='冻结 head 独显：耳薄补形和 3 条冠饰薄补形均保留，与输入父形原文一致。'
    else:reason='当前整图及参考混合：仅冠饰三条 d 同步，身体、头部其他孩子和右耳校准保持。'
    views.append({'path':str(p),'sha256':sha(p),'actually_opened':True,'judgment':reason})
views.append({'path':str(D/'block-layers/preview.png'),'sha256':sha(D/'block-layers/preview.png'),'actually_opened':True,
              'judgment':'发布后的标准白底全图已实际打开，冠梁新弧带、双桥和原右耳尾在当前组合中保持。'})
save(O/'实际看图记录.json',{'actual_worker':'/root/group_head_ear_gap_recovery','candidate_sha256':candidate_sha,'time':now,
 'tool':'view_image','base_guide_dimensions':[895,1758],'line_dimensions':[895,1757],
 'line_alignment':'explicit same-coordinate reference-crop; no whole-image scaling','images':views,
 'changed_crown_and_right_ear_local_inspected':True,'all_12_without_parent_combination_inspected':True,
 'independent_review_claim':False,'all_unchanged_children_individual_new_review_claim':False})
old_note=H/N.relative_to(D)/'制作说明.md'
note=f'''# head 2.2：同步正确冠梁与左右内桥

本轮指定 2.2 制作已完成，实际制作者 `/root/group_head_ear_gap_recovery`，逻辑身份 `group:head`。提交当前候选供总控安排独立审查；这里不是独立审查结论，也未 checkpoint 或推进后续节点。

输入冻结 head guide SHA `{sha(O/'input/groups.svg')}`，输出候选与标准 guide SHA `{candidate_sha}`。候选在 `{O/'candidate.svg'}`；标准白底 preview SHA `{sha(D/'block-layers/preview.png')}`。旧 a3d 右耳制作说明完整保存于 `{old_note}`；原节点 `candidate.svg`、input、图证及继承记录保持原有历史身份，本次不覆盖它们。

唯一几何变化是 `head/crown` / `group-head-crown` 下 `head-child-crown-arch`、`head-child-crown-left-scroll`、`head-child-crown-right-scroll` 的三个 d。完整 d 按 `{S}` 的原文字节复制，源 SHA `07bd7b008a8afc0c79453316638dca5e810082ada6ef465a73d5b93d89489f9d`。当前候选与上一节点1的临时正确 crown fixture 字节一致。没有引入 crown 子序列的 hidden anchors 或其五个下级孩子；当前 crown 自身仍为原 8 条路径，另外 5 条路径、颜色、其他属性和排列均保持。

新冠梁沿原色参考校准顶部窄弧及两肩，修掉旧弧肩向内下方的偏移。双内桥仅将小横梁延至左右竖翼，闭合原约 0.875 px 的透明竖缝。原色、线稿、前后差分均在顶部、左肩、右肩、左桥、右桥分别同坐标 8 倍实际查看；图内独显没有 head 父底稿。线稿冠梁整体较高，形体位置继续依原色，不据此整体上移。

已实际查看 crown 整体独显/原色/线稿、正确右耳弧的原色与线稿 8 倍、全 12 孩子去父整体、去父冠部 4 倍和耳侧 8 倍、冻结 head 独显、完整混合及最终标准 preview，共 26 张。冠梁和双桥在去父组合中连续；冠梁下的大背景孔、双桥下孔和耳弧两侧负形仍可见。右耳仍向左下回收并渐尖，冻结的 `head-framing-right-loop` 原文和整个 right group 都与本轮输入及上轮耳候选一致。生成坐标和图 SHA 见 `{O/'render-manifest.json'}`，实际判断见 `{O/'实际看图记录.json'}`。

范围检查使用本轮 `input/groups.svg` 的冻结 head，默认 scale=4、alpha=128，全 12 个直属孩子 PASS、outside_samples=0。冠梁、左右桥和右耳关键 crop 的 8 倍包含也均为 0。左右桥各 7 个明确坐标缝样本由 alpha 0 变为 255；大背景孔 [410,32,48,10] 和双桥下孔 [379,128,3,2]、[490,128,3,2] 的 8 倍 alpha 与输入相同，最大值 0。右耳 crop [490,255,50,103] 的 8 倍 alpha 前后完全相同。见 `{O/'局部8倍与负形检查.json'}`。

保护证据：把这三个 d 逆向替回输入 d，整份 SVG 与冻结输入逐字节相同。所有 head 母路径（含薄耳和新增三个冠饰范围）、11 个其他直属孩子、旧 crown 其余 5 条路径、全局 id 与次序、root/resources 和其他对象不变；D 的 tree、rendering registry、formal、options 与参考 SHA 保持。当前新候选没有新 child、资源或 hidden anchors。

对未改变的 11 个孩子，本轮明确继承已有证据，并比较其整个容器与旧 a3d 耳候选一致。8 个孩子保留 ledger005 记录；左后发沿用此前明确的资源名前缀等价证明；右耳坠沿用 `/root/group_head_motion_recovery` 在 r1 的真实 motion 产物和检查；右耳旁 group 沿用此前 e2d 校准证据，并在本轮实际重看耳弧局部。其他旧孩子未声称重新逐件审查；其出处及严格比较在 `{O/'继承证据.json'}`。本轮 crown 采用新图复查，旧 ledger crown pass 不用来覆盖此前发现的冠梁和双缝问题。

备份仅逐个复制本轮替换的 9 个标准文件到 `{H}`；没有递归复制旧 history。独立 SOL 的既有空 patch 和 12 实体结构沿用总控 retention 记录，原作者仍为 `/root/group_split_head`，本轮没有执行结构节点。当前任务内没有未处理的已知三处同步问题；冠饰子序列自身新增隐藏连接及其下级返修仍由 r2s5 负责，本轮未代做或宣布其完成。新候选整体是否通过由独立 head 审查决定。

标准范围报告：`{N/'轮廓检查.json'}`。本轮保护：`{O/'保护证明.json'}`。输出及作者 manifest：`{N/'output-sha256.json'}`。未执行运动、13 节点、formal、cursor、状态变更或新 agent。
'''
(O/'制作说明.md').write_text(note);(N/'制作说明.md').write_text(note)
for name in ['保护证明.json','configuration-read.json','实际看图记录.json']:
    shutil.copyfile(O/name,N/name)
delivery={'node':'group_child_layers','revision':'返修-02-crown-sync','status':'candidate_ready_for_independent_review',
 'actual_worker':'/root/group_head_ear_gap_recovery','logical_worker':'group:head','time':now,
 'candidate':str(O/'candidate.svg'),'candidate_sha256':candidate_sha,'input_sha256':sha(O/'input/groups.svg'),
 'source':str(S),'source_sha256':sha(S),'bounds':str(N/'轮廓检查.json'),'all_12_pass_outside_0':True,
 'only_changed_d_ids':['head-child-crown-arch','head-child-crown-left-scroll','head-child-crown-right-scroll'],
 'node_1_parent_frozen':True,'history_manifest':str(H/'manifest.json'),'independent_review_performed':False,
 'checkpoint_performed':False,'continued_to_motion_or_formal':False}
save(O/'交付记录.json',delivery);save(N/'交付记录.json',delivery)
paths=[D/'block-layers/groups.svg',D/'block-layers/preview.png',N/'轮廓检查.json',N/'制作说明.md',
 N/'保护证明.json',N/'configuration-read.json',N/'实际看图记录.json',N/'交付记录.json',
 O/'candidate.svg',O/'input/manifest.json',O/'geometry-change.json',O/'局部8倍与负形检查.json',
 O/'继承证据.json',O/'render-manifest.json',H/'manifest.json',old_note]
manifest={'actual_worker':'/root/group_head_ear_gap_recovery','logical_worker':'group:head','node':'group_child_layers',
 'revision':'返修-02-crown-sync','status':'candidate_ready_for_independent_review','time':now,
 'input_sha256':sha(O/'input/groups.svg'),'candidate_sha256':candidate_sha,
 'source_geometry_author':'/root/group_crown_parent_recovery','source_geometry_sha256':sha(S),
 'files':[{'path':str(p),'sha256':sha(p)} for p in paths],
 'scope':'Only 3 crown d copied; mother and 11 other children unchanged; no hidden anchors imported.',
 'review_or_checkpoint_claim':False}
save(O/'output-sha256.json',manifest);save(N/'output-sha256.json',manifest)
for row in manifest['files']:assert sha(Path(row['path']))==row['sha256']
for p in [D/'block-layers/groups.svg',D/'block-layers/preview.png',N/'轮廓检查.json',N/'制作说明.md',N/'output-sha256.json']:
    print(str(p),sha(p))
print('actually_viewed_images',len(views),'manifest_files_verified',len(paths))
