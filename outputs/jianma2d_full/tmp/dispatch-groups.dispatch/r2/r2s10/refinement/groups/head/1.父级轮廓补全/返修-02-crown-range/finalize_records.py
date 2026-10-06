from pathlib import Path
import json, hashlib, shutil
from datetime import datetime
from zoneinfo import ZoneInfo

R=Path('/Users/wutian/Desktop/coding/AstraLayering')
ROOT=R/'outputs/jianma2d_full'
SK=R/'workflow-next/live2d-layering'
O=Path(__file__).parent
N=O.parent
D=O.parents[4]
S=ROOT/'tmp/dispatch-groups.dispatch/r2/r2s5/refinement/groups/head/crown/1.父级轮廓补全/返修-01-parent-recovery'
V=ROOT/'tmp/dispatch-groups.dispatch/r2/r2s5/reviews/group_child_layers/head/crown'
H=D/'tmp/history/head-crown-parent-recovery-20261006-01'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
now=datetime.now(ZoneInfo('Asia/Shanghai')).isoformat()
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
assert sha(D/'block-layers/groups.svg')==sha(O/'candidate-parent.svg')=='f4a95e38339af8b7b374d414a2a33b6b007937f6c4bf43028e248b2ee00e8b1d'
cfg={'logical_worker':'group:head','actual_worker':'/root/group_head_ear_gap_recovery','node':'group_completion',
  'revision':'返修-02-crown-range','configured_model_filename':'gpt-6-astra-xhigh.model','time':now,
  'configuration_files':[{'path':str(p),'sha256':sha(p)} for p in [ROOT/'group-route-instructions.md',SK/'SKILL.md',
    SK/'templates/部件专项/generic/1.父级轮廓补全/流程.yaml',SK/'templates/部件专项/generic/1.父级轮廓补全/提示词.txt',
    SK/'templates/部件专项/generic/1.父级轮廓补全/gpt-6-astra-xhigh.model']],
  'source_reference_dimensions':{'guide':[895,1758],'base':[895,1758],'line':[895,1757]},
  'node_boundary':'Only head parent completion. No child edits, splitting, motion, formal drawing, cursor/state commands or agents.'}
write(O/'configuration-read.json',cfg)
records=[]
def seen(p,reason): records.append({'path':str(p),'sha256':sha(p),'actually_opened':True,'judgment':reason})
for name in ['arch-left-joint-color.png','arch-left-joint-line.png','arch-right-joint-color.png','arch-right-joint-line.png',
             'left-root-color.png','left-root-line.png','right-root-color.png','right-root-line.png']:
    seen(V/'evidence'/name,'独立审查原始证据：核对冠梁肩部偏移及左右内小横梁真实透明竖缝；未将其宣称为旧审查已解决。')
for name in ['arch-top-after-color.png','arch-left-after-color.png','arch-right-after-color.png','after-parent-checker.png',
             'left-root-after-color.png','left-root-after-line.png','right-root-after-color.png','right-root-after-line.png']:
    seen(S/'evidence'/name,'正确 crown 07bd 候选：细冠梁依原色校准，双小横梁连向竖翼，内部孔洞清楚。')
seen(S/'evidence/containment-head-images/07-outside.png','原 head 范围不足：红区为上拱外缘、内缘顶段及两内桥；据真实薄轮廓补形，不按包围盒填块。')
for region in ['arch-top','arch-left','arch-right','left-bridge','right-bridge']:
    for mode in ['base','line','before-after']:
        if mode=='base':why='同坐标 8 倍原色对照：新增薄范围沿正确冠梁或内桥方向连续，端部接入原形。'
        elif mode=='line':why='同坐标 explicit reference-crop 8 倍线稿：用于核对结构和连接；冠梁位置以原色为准，未随线稿整体上移。'
        else:why='同坐标 8 倍父形前后差分：仅新增局部细带或竖缝桥，原形不减少，周围真实负形保留。'
        seen(O/'evidence'/f'{region}-{mode}-8x.png',why)
for name,why in {
    'head-alone-full.png':'新 head 独显：长发、耳尾、垂带和非冠饰范围保持，冠下大孔仍透明。',
    'head-crown-overview.png':'父冠饰整体对照：新增薄弧与旧父形并存，保持所有旧路径；冠梁下大背景和侧孔未填。',
    'head-with-correct-crown.png':'仅临时 fixture：正确 crown 被新 head 容纳，冠梁及双桥连接连续。',
    'correct-crown-alone.png':'仅临时 fixture 去父独显：正确 crown 轮廓未缩窄以求包含通过。',
    'full-context.png':'当前标准稿整图混合：其余身体与头部结构保持。标准 crown 孩子仍为输入形，等待后续明确派发同步。'
}.items():seen(O/'evidence'/name,why)
seen(D/'block-layers/preview.png','发布后的标准白底预览已打开：全图结构保持，本节点只发布 head 父范围。')
views={'actual_worker':'/root/group_head_ear_gap_recovery','candidate_sha256':sha(O/'candidate-parent.svg'),
       'time':now,'tool':'view_image','line_reference_alignment':'Explicit identical-coordinate reference-crop; no whole-image scaling.',
       'images':records,'independent_review_claim':False,'all_head_children_re_reviewed_claim':False}
write(O/'实际看图记录.json',views)

note=f'''# head 父级轮廓补全：冠梁与左右内桥范围返修

本次仅完成节点 1。标准 guide 已更新，等待总控 checkpoint；未推进 2.2、2.3、运动、正式绘制或游标。实际制作者为 `/root/group_head_ear_gap_recovery`，逻辑身份仍为 `group:head`。

输入 guide：`a3d9513e5fae1bf11d1aee0705211ae4dacea555da9d72d78e7accc2fa821d94`。输出 guide：`{sha(D/'block-layers/groups.svg')}`；白底 preview：`{sha(D/'block-layers/preview.png')}`。

正确 crown 来自 `{S/'candidate.svg'}`，SHA `07bd7b008a8afc0c79453316638dca5e810082ada6ef465a73d5b93d89489f9d`。其独立审查 `{V/'审查.md'}` 已指出双内横梁 0.875 px 竖缝和冠梁肩部范围偏差。本次实际打开该审查的肩部、双缝原色及线稿证据、正确 crown 校准图和旧 head 不包含的诊断图，未使用旧审查结论覆盖新发现。

本次只在 `group-head` 自己新增 3 条路径，旧自身路径（含耳尾薄补形）全部保留。冠梁补形 `head-crown-arch-reference-continuation` 采用正确 crown 的窄弧带轮廓：外、内两条弧共同限定范围，并在两肩接入原形。它不是包围盒填块，拱下的大背景孔保持透明。左右内桥分别增加 `head-crown-left-inner-beam-continuation`、`head-crown-right-inner-beam-continuation`，在 y=120–124 延续 4 px 厚横梁；小圆曲端埋入原有竖翼和横梁，闭合竖缝而保留下方孔洞。

原色是冠梁位置的校准依据；线稿在这里整体较高，仅用于结构和连接核对，没有据此移动整冠。五个区域的原色、线稿和父形前后对照均采用相同明确坐标、8 倍放大，见 `{O/'render-manifest.json'}` 和 `{O/'实际看图记录.json'}`。已实际查看新 head 独显、冠饰整体、正确 crown 去父、正确 crown 加父组合、整图混合和发布后的白底预览。旧父弧的下沿保留为父范围，不把它冒充为正确 crown 孩子已发布。

默认检查使用候选冻结 head 与临时 fixture，全 12 个直属部件在 4 倍、alpha=128 下 PASS，outside=0。fixture 仅把 `head/crown` 自己对应的 3 个 path d 换成正确来源原文；其他属性和对象保持，source 的下级孩子及额外路径没有引入 D。标准 guide 中 crown 孩子仍逐字保持输入，后续必须由总控明确派发 2.2 才同步。

关键 8 倍局部包含检查：冠梁原越界 34160 samples、左桥 247、右桥 247，均降为 0。左右缝各 7 个明确坐标样本从 alpha 0 变为 255。整 head 4 倍增量为 8671 samples（541.9375 px²），bbox=[372,16.75,130.75,107.25]，减少覆盖为 0。冠梁下大孔 [410,32,48,10] 与左右桥下孔 [379,128,3,2]、[490,128,3,2] 的 8 倍 alpha 原文相同且最大值 0。证据见 `{O/'局部8倍与负形检查.json'}`。

保护验证通过：从候选删除这 3 条新增完整行后，与输入 guide 逐字相同。全 12 直属孩子、已校准 right 耳尾 d、所有旧 head 自己路径、其他对象、root 和 resources 因此原文保留；tree、rendering registry、formal、options 及 base/line refs SHA 均与冻结输入相同。旧 2.2 证据没有改写，也未声称重新审查其余孩子或完成冠饰下级返修。保护详情见 `{O/'保护证明.json'}`。

输入快照见 `{O/'input'}`。本次会替换的 7 个标准文件已逐个备份到 `{H}`，manifest 记录 SHA；没有自递归复制旧 history。原耳尾节点 1 的候选与证据仍保留，本次候选和所有新证据单独放在 `{O}`。本次仅交付父范围，不代表整 head 独立审查通过。

包含报告：`{O/'fixture-包含检查.json'}`。当前候选：`{O/'candidate-parent.svg'}`。输出 manifest：`{N/'output-sha256.json'}`。
'''
(O/'补全说明.md').write_text(note)
(N/'补全说明.md').write_text(note)
for name in ['保护证明.json','configuration-read.json','实际看图记录.json']:
    shutil.copyfile(O/name,N/name)
paths=[D/'block-layers/groups.svg',D/'block-layers/preview.png',N/'补全说明.md',N/'保护证明.json',
       N/'configuration-read.json',N/'实际看图记录.json',O/'candidate-parent.svg',O/'fixture-correct-crown.svg',
       O/'fixture-包含检查.json',O/'局部8倍与负形检查.json',O/'geometry-change.json',O/'render-manifest.json',
       O/'input/manifest.json',H/'manifest.json']
manifest={'status':'completed_node_1_waiting_root_checkpoint','actual_worker':'/root/group_head_ear_gap_recovery',
    'node':'group_completion','time':now,'files':[{'path':str(p),'sha256':sha(p)} for p in paths],
    'standard_guide_is_parent_candidate':True,'correct_crown_geometry_is_fixture_only':True,
    'all_12_containment':'pass; default scale 4; alpha threshold 128; outside 0',
    'historical_node_2_2_status':'Prior ear candidate preserved. Crown child sync awaits explicit dispatch.'}
write(O/'output-sha256.json',manifest)
write(N/'output-sha256.json',manifest)
for p in [D/'block-layers/groups.svg',D/'block-layers/preview.png',N/'补全说明.md',N/'output-sha256.json']:
    print(str(p),sha(p))
print('actually_viewed_images',len(records))
