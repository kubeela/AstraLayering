"""Build the author-facing source mapping and check edit boundaries, not drawing quality."""
import difflib
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
baseline = json.loads((OUT / 'before.json').read_text(encoding='utf-8'))
changes = json.loads((OUT / 'changes.json').read_text(encoding='utf-8'))
old_audit = json.loads((ROOT / 'analysis/workflow-tutorial-audit-20260927/before.json').read_text(encoding='utf-8'))
by_file = defaultdict(list)
for item in changes:
    by_file[item['path']].append(item)

def normalized(text):
    return text.replace('\r\n', '\n')

def link(path, label=None, line=None):
    absolute = (ROOT / path).as_posix()
    return f'[{label or path}](<{absolute}{":" + str(line) if line else ""}>)'

chapters = {int(p.name.split('.')[0]): p for p in (ROOT / 'live2d-tutorial-text').iterdir() if p.is_file() and re.match(r'^\d+\.', p.name)}

def source_links(spec):
    number, ranges = spec.split(':')
    source = chapters[int(number)]
    lines = source.read_text(encoding='utf-8-sig').splitlines()
    result = []
    for span in ranges.split(';'):
        first, last = map(int, span.split('-'))
        assert 1 <= first <= last <= len(lines), spec
        result.append(link(source.relative_to(ROOT), f'{source.name} L{first}–{last}', first))
    return '；'.join(result)

def label(path):
    return path.removeprefix('workflows/templates/部件专项/').removesuffix('/提示词.txt')

def first_changed_line(path):
    before = normalized(baseline[path]['text']).splitlines()
    after = normalized((ROOT / path).read_text(encoding='utf-8-sig')).splitlines()
    for op, _, _, j1, _ in difflib.SequenceMatcher(None, before, after).get_opcodes():
        if op != 'equal':
            return j1 + 1
    raise AssertionError(path)

expected_nodes = {p.replace('流程.yaml', '提示词.txt') for p in old_audit['yaml_removals']}
expected_nodes.update(p.replace('流程.yaml', '提示词.txt') for p in old_audit['prior_clothing_removals'])
assert len(expected_nodes) == 27
assert expected_nodes.issubset(by_file), sorted(expected_nodes - by_file.keys())
expected_reviewers = {p.rsplit('/', 1)[0] + '/review/提示词.txt' for p, v in old_audit['yaml_removals'].items() if v['review_forwards']}
expected_reviewers.add('workflows/templates/部件专项/hair/2.校准与完整线稿/2.3.后发与附属发束线稿/review/提示词.txt')
assert len(expected_reviewers) == 7
assert set(by_file) == expected_nodes | expected_reviewers

boundary_errors = []
actual_changed = []
for path, saved in baseline.items():
    file = ROOT / path
    if not file.exists():
        boundary_errors.append('deleted: ' + path)
        continue
    if hashlib.sha256(file.read_bytes()).hexdigest() != saved['sha256']:
        actual_changed.append(path)
        if path not in by_file:
            boundary_errors.append('unrecorded: ' + path)
assert not boundary_errors, boundary_errors
assert set(actual_changed) == set(by_file)
new_runtime_files = sorted(p.relative_to(ROOT).as_posix() for name in ['workflows', 'workflow_clothing']
                           for p in (ROOT / name).rglob('*') if p.is_file() and '__pycache__' not in p.parts
                           and p.relative_to(ROOT).as_posix() not in baseline)
assert not new_runtime_files, new_runtime_files

for path, records in by_file.items():
    text = normalized(baseline[path]['text'])
    for item in records:
        assert text.count(item['before']) == 1
        text = text.replace(item['before'], item['after'])
        for spec in item['sources']:
            source_links(spec)
    assert text == normalized((ROOT / path).read_text(encoding='utf-8-sig')), path

assets = []
external_dependencies = []
tutorial_references = []
config_count = 0
model_count = sum(p.endswith('.model') for p in baseline)
for name in ['workflows', 'workflow_clothing']:
    for p in (ROOT / name).rglob('*.yaml'):
        config_count += 1
        text = p.read_text(encoding='utf-8-sig')
        if re.search(r'(?:\b\w*tutorial\w*\b|live2d-tutorial|split_rules)', text):
            tutorial_references.append(p.relative_to(ROOT).as_posix())
        for match in re.finditer(r'^\s*asset:\s*(.+?)\s*$', text, re.M):
            value = re.split(r'\s+#', match.group(1), maxsplit=1)[0].strip().strip('"\'')
            target = (p.parent / value).resolve()
            assets.append(dict(config=p.relative_to(ROOT).as_posix(), asset=value))
            if not target.exists() or not any(target.is_relative_to((ROOT / allowed).resolve()) for allowed in ['workflows', 'workflow_clothing']):
                external_dependencies.append(str(target))
assert not external_dependencies, external_dependencies
assert not tutorial_references, tutorial_references

checks = dict(scope='authoring and dependency checks only; no model drawing run',
              migrated_nodes=len(expected_nodes), synchronized_existing_reviewers=len(expected_reviewers),
              changed_prompt_files=len(by_file), unchanged_yaml_files=config_count, unchanged_model_markers=model_count,
              checked_asset_bindings=len(assets), new_runtime_files=new_runtime_files,
              external_or_missing_assets=external_dependencies, tutorial_runtime_references=tutorial_references,
              replay_matches_saved_prompts=True, checked_prompt_files=sorted(by_file))
(OUT / 'checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

patches = []
for path in by_file:
    patches.extend(difflib.unified_diff(normalized(baseline[path]['text']).splitlines(True),
                   normalized((ROOT / path).read_text(encoding='utf-8-sig')).splitlines(True),
                   fromfile='before/' + path, tofile='after/' + path))
(OUT / '提示词改动.diff').write_text(''.join(patches), encoding='utf-8')

index = []
for heading, paths in [
    ('旧流程：23 个节点', sorted(p for p in expected_nodes if p.startswith('workflows/'))),
    ('新衣装：4 个节点', sorted(p for p in expected_nodes if p.startswith('workflow_clothing/'))),
    ('同步原有审查：7 份提示词', sorted(expected_reviewers)),
]:
    index.extend([f'### {heading}', '', '| 节点 | 本次补充/澄清 |', '| --- | --- |'])
    for path in paths:
        reasons = ' '.join(dict.fromkeys(item['reason'] for item in by_file[path]))
        index.append(f'| {link(path, label(path), first_changed_line(path))} | {reasons} |')
    index.append('')

coverage = [
    ('1:18-76;77-98', 'X/Y 表现通过各面的宽度、位置和遮挡变化，包围件前后夹住真实对象；运动归属与绘制层序分别表达。',
     'physics_details/special_parts/generic 的分析与线稿原有这些规则，本轮补入颈环/手脚环、连披风兜帽、各层裙摆等具体落点；generic 静止对象不再被后文强制要求左右转向。',
     '不自动补六面或固定角度；腰带只补实际需要的后段；Cubism 绘制顺序 UI 操作不交给绘制 worker。'),
    ('4:13-47;59-87', '轮廓/嘴内/装饰三类；先拆后补；上下嘴肤色遮盖；嘴内裁切牙舌；唇彩和实际口内对象有各自依附。',
     'mouth/1 原已要求六件、圆润嘴角、完整口腔裁切；新增上下唇后具体补形，以及虎牙/花纹/口内物件跟随对象；原 review 同步。',
     '简化为只有轮廓的可选做法不采用；网格、元音嘴型、下巴动作和表情参数留绑定。'),
    ('6:16-42;47-119;120-133', '发束先大后小、相邻隐藏搭接；侧发根部按需延伸；后发补全；完整头盖；跨前后同束共同运动；每束发影独立完整。',
     'hair/2.1 补短后发可兼头盖、马尾不可代替；2.2 补根部尺度与绕耳角帽；2.3 补中央同动后发与独立侧束的颗粒度；5 补完整影形、混合取舍和叠黑处理；已有唯一 review 同步。',
     '头绳发饰保持原 physics_details 身份；不照搬固定左右中数量，不以降低细节换少拆层。'),
    ('7:17-27;48-88;89-137;138-154', '躯干衔接邻件、干净底形、自然腰线、长颈与锁骨不同变形、胸部独立后补躯干、控制件按真实需求。',
     'body/1 保留原胸部和肩腰接口，新增底层重复轮廓清理、颈/锁骨分工、腰线条件和原姿势约束；手臂和掌指完整性继续由 arms 实施。',
     '服装皮肤接口分别归对应组；不因教程人体列表越界画 arms/lower_body，不强制 A 姿势或新增呼吸动作。'),
    ('8:19-73', '骨盆/腿连接、裙下完整大腿、左右裤腿、圆顺膝踝、膝通常随大腿、鞋口前后、腿影及允许整腿。',
     'lower_body/2 补腿根承接条件；3 保留整腿选择并补衣下腿与鞋口的实际规则；衣装裤裆、裙层和鞋口要求写进 clothing 分析/线稿/review。',
     '素体骨盆不沿服装形状画；外组鞋饰不代画；不增加屈膝踮脚、重心或动态测试。'),
    ('9:19-75;79-134;135-141', '固定跟随与自身摇摆；固定结/软连接/硬坠；包围前后；耳后根；衣襟/硬领；露肩衣/披肩多处牵动；反光与线稿层序。',
     'physics_details 分析解释为何拆/可否合，线稿落实接头与后段，着色补反光是否照亮轮廓；clothing 按实际衣型补多处牵动和完整衣片，review 同步。',
     '不逐链节派发，不给每条褶皱加控制；衣上附件先复用，衣物本体不移交 physics_details。'),
    ('10:10-36;37-75;76-112', '帽顶/檐/内面，连披风兜帽头/身体各前后；兽耳三面、折耳两段、角、尾、翼的按需颗粒度；眼镜、硬质材质、手持和容器。',
     'special_parts 分析/线稿/review 补具体兜帽与折耳/尾端条件；generic 分析/线稿/review 补实际掌指夹持和杯前后/水面水体/内容物；着色区分透明叠层与拼接伪影。',
     '不新增穿脱/收翅状态，不逐羽毛拆；已定 kind 保持，不把教程里全部类型塞入任一 group。'),
    ('11:18-34;43-78;70-84;95-125', '眼内高光独立、积泪与落泪不同跟随、条状泪流范围、红晕与脸底分离、汗珠显示范围、符号按控制拆。',
     'eyes 原有高光独立、完整泪液与镜像排除；2 补三种泪液跟随职责；face/5 保留红晕/汗珠完整性并补汗珠上下渐隐；generic 保留实际独立符号。',
     '不设计新增爱心/星星眼、替换嘴型、流动帧；eyes 和 face 不重复画泪滴；不恢复 expressions 组。'),
    ('12:5-6;18-45;48-69;70-98', '肩口小重合，肘腕圆顺，前臂常在前，掌五指，短长袖接法、透明袖底层完整、替换姿态的边界。',
     'body/1、arms/2 原肩肘规则保留；arms/4 补大透视换手形可能需替换素材的边界并同步 review；clothing 保留袖根/圆顺肘/透明平接口/底层手臂完整。',
     '不默认额外三角肌/肘部/指节；当前不生成替换手臂或全套新姿势；固定饰品是否拆仍看实际控制。'),
    ('13:13-50;58-92;93-121', '独立不限于移动，还包括形变、层序、显隐、颜色及裁切；环饰即使同动仍需不同层位；软硬、光效和发束影独立控制。',
     '各分析和线稿保留五类拆分理由；本轮在实际饰件与衣型中写出具体控制差异，并限定简单同动部分可以合、固定纹样无需拆。',
     '不照抄低规格可烙影的选项；不将每条线都升级为动画部件，construction-guide 仍需关闭。'),
    ('14:4-20;23-58;59-68;69-136', '不透明纹理接缝可短柔边配圆顺搭接；透明接口较平；影形要完整；三类阴影有不同叠加问题；半透明光效混合有差异。',
     'arms/2、三个扩展组和衣装承担各自接口；hair/body/lower_body/arms 和三个扩展组效果节点补完整范围、混合选择、重复覆盖处理；clothing 保留实际alpha合成规则；锁定的眼部镜像策略保留。',
     '不把线性alpha相加当成一次覆盖，不抹掉真实叠层/多源影，不引入旧SDK数量限制和Photoshop录制动作步骤。'),
]
coverage_lines = ['| 教程定位 | 需要迁移的绘制逻辑 | 实际去向：原有保留 + 本次补充 | 条件与排除 |', '| --- | --- | --- | --- |']
for spec, logic, location, limits in coverage:
    coverage_lines.append(f'| {source_links(spec)} | {logic} | {location} | {limits} |')

cases = [
    ('mouth/1.嘴型校准与完整线稿/提示词.txt', '原图闭嘴且只看到唇线', '六件仍须完整，牙舌藏到唇后，以上下嘴遮盖控制显示；不裁残牙舌。'),
    ('eyes/2.逐眼线稿/提示词.txt', '只有一侧泪滴且眼本体采用镜像', '本体按锁定计划；真实泪液按所在侧制作并排除镜像，积泪和落泪不归虹膜。'),
    ('face/5.脸部部件绘制/提示词.txt', '汗珠沿脸移动、原图边缘柔和', '保留完整滴体，显示范围可上下渐隐，下方皮肤完整；不新增流动帧。'),
    ('hair/2.校准与完整线稿/2.1.顶发与发髻线稿/提示词.txt', '只有双马尾、头顶被帽子挡住', '仍有完整头盖，不能以两条马尾或帽子代替；短后发可兼任。'),
    ('hair/2.校准与完整线稿/2.2.前发与侧发线稿/提示词.txt', '长前束绕兽耳并延至肩前', '追踪真实全长，前后片共享发束身份，耳后/头顶根部按需要补。'),
    ('hair/2.校准与完整线稿/2.3.后发与附属发束线稿/提示词.txt', '后发中央隐藏、两侧需独立摇摆', '中央完整同动底形可保持一件，两侧按需拆；仍保留主次发流和后续纹理。'),
    ('hair/5.关联投影与成稿/提示词.txt', '两束发影叠在脸上', '完整源形独立、裁切到脸；根据底色选择混合方式，处理重复覆盖，不涂肤色补丁。'),
    ('body/1.身体构型与衔接线稿/提示词.txt', '脖子转向与锁骨跟随方向不同', '长颈与肩胸接口可分控，连接连续，锁骨不被一并拉进整条颈。'),
    ('body/5.身体承影与成稿/提示词.txt', '下巴影跨颈与躯干搭接', '只完成body承影，完整影形分配覆盖一次，皮肤自身体积不随影关闭。'),
    ('lower_body/2.骨盆构型与着色/提示词.txt', '裙子挡住腿根，旧色块沿衣边分割', '按真实髋部重建承接面和干净肤色，不把裙摆当人体边界。'),
    ('lower_body/3.双腿与足部成稿/提示词.txt', '已有左右整腿或已有大腿小腿分层', '两种结构都沿用；已分层的膝踝有完整搭接，整腿不为流程强拆。'),
    ('arms/2.双臂构型与着色/提示词.txt', '复杂阴影跨肘，底色需要无缝', '完整皮肤覆盖，纹理/色层短过渡；半透明本体另用较平受控接口。'),
    ('arms/4.双手结构线稿与隐藏补全/提示词.txt', '几根手指被掌或道具挡住', '掌五指六件各自补到根部，通常每指一件；不把未做替换姿势视为缺件。'),
    ('arms/5.双手着色与承影成稿/提示词.txt', '一个手指在掌和另一指上投影', '不同真实内部source/target，完整影形分别裁切，不能只剩指缝黑三角。'),
    ('physics_details/1.结构分析/提示词.txt', '固定耳钉、软链、硬坠及多个摆动分支', '写清固定、弯曲、保形和时序差异，不按每个链环拆层。'),
    ('physics_details/3.完整线稿与关联投影/提示词.txt', '脚链前段可见、后段被脚踝挡住', '后段完整接回两侧，前后能夹住脚踝，不能只有一条侧边。'),
    ('physics_details/5.着色与效果成稿/提示词.txt', '金属反光不该洗白黑色外轮廓', '按底色→反光→正式线的顺序绘制，反光仅裁到对应本体。'),
    ('special_parts/1.结构分析/提示词.txt', '兜帽连披风', '计划包头前后、包身体前后及颈肩连接，明确头和身体不同跟随。'),
    ('special_parts/3.完整线稿与关联投影/提示词.txt', '计划要求兜帽四片或折耳两段', '实际交付完整实体；一对总片、注释或空组不算完成。'),
    ('special_parts/5.着色与效果成稿/提示词.txt', '玻璃前后壁及人工透明接缝都较深', '保留真实壁厚/叠层染色，消除人工重复alpha；高光与固有图案分开。'),
    ('generic/1.结构分析/提示词.txt', '独立平面符号或静止背景', '不强加头部X/Y、不虚造六面，只按独立控制拆分。'),
    ('generic/3.完整线稿与关联投影/提示词.txt', '手持装液体的杯子', '掌指夹持；杯前后、水面水体及实际独立内容物有完整实体，手仍归arms。'),
    ('generic/5.着色与效果成稿/提示词.txt', '硬道具带固定花纹与随角度变化的亮暗', '花纹随本体，需移动的材质亮暗独立；保留真实多源影而消除重复覆盖。'),
    ('workflow_clothing/1.衣装结构与穿戴分析/提示词.txt', '两层裙摆、衣附饰品已在素体中', '每层自己的前后与身份，附件按实际id复用；分析不把归档当衣物全集。'),
    ('workflow_clothing/3.衣装线稿/3.1.分批完整线稿/提示词.txt', '露肩衣/披肩同时连接身体和手臂', '完整两处连接和隐藏余量，避免只挂一端；按本批实际对象制作。'),
    ('workflow_clothing/3.衣装线稿/3.2.集中结构审查/提示词.txt', '计划漏了一层后摆或兜帽身体后片', '依据原衣图和具体衣型判据查真实实体，不仅验证计划自洽；一次集中review。'),
    ('workflow_clothing/5.分批着色与成稿/提示词.txt', '透明布接缝、裙影与衣层开关', '接缝控制实际覆盖、影形完整且归承影面、关闭衣层同时处理依赖效果；末批直接交稿。'),
]
case_lines = ['| 情况 | 改后提示词给出的处置 | 负责节点 |', '| --- | --- | --- |']
for path, scenario, expected in cases:
    if not path.startswith('workflow'):
        path = 'workflows/templates/部件专项/' + path
    assert path in expected_nodes
    case_lines.append(f'| {scenario} | {expected} | {link(path, label(path), first_changed_line(path))} |')

details = []
for number, (path, records) in enumerate(by_file.items(), 1):
    details.extend([f'### {number}. {label(path)}', '', f'文件：{link(path, "提示词", first_changed_line(path))}', ''])
    specs = list(dict.fromkeys(spec for record in records for spec in record['sources']))
    details.append('**教程依据：** ' + '；'.join(source_links(spec) for spec in specs))
    details.extend(['', '**原有规则保留：** ' + ' '.join(dict.fromkeys(record['retained'] for record in records)), '',
                    '**本次补入/澄清：** ' + ' '.join(dict.fromkeys(record['reason'] for record in records)), '', '**实际修改段落：**', ''])
    before = normalized(baseline[path]['text']).splitlines()
    after = normalized((ROOT / path).read_text(encoding='utf-8-sig')).splitlines()
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, before, after).get_opcodes():
        if op == 'equal':
            continue
        for line in after[j1:j2]:
            if line.strip():
                details.append('> ' + line)
        details.append('')

check_text = f'''| 核对内容 | 本轮结果 | 证明范围 |
| --- | --- | --- |
| 此前删除教程输入的节点 | 27/27 均有对应修改和来源说明 | 没有只改新衣装而漏掉旧流程。 |
| 既有 review 同步 | 7 份；另有 clothing/3.2 属于上述 27 节点 | 制作者与已有审查者掌握同一批具体判据，没有增加检查轮次。 |
| 保存后的实际修改 | 34 份提示词；逐项按本轮前快照重放，内容与当前文件一致 | 改动记录对应真实文件，不只是报告声称修改。 |
| YAML 与模型标记 | {config_count} 份 YAML、{model_count} 份 model 与本轮开始时一致 | 模型、节点顺序、inputs/outputs、carry、循环/条件和审查接线未改。 |
| 运行目录文件边界 | 未增删运行文件，本轮变化仅限上述提示词 | 没有添加新的通用知识输入或额外调度节点。 |
| asset 依赖 | {len(assets)} 处均存在且在 workflows/workflow_clothing 内 | 没有重新挂回外部教程或引入目录外运行素材。 |
| 教程字段/路径 | YAML 未发现教程绑定或残留转交 | 运行模型无需再读取整篇教程。 |
| 来源定位 | 本报告所有教程行号均在实际文件范围内 | 能逐项追溯作者使用的来源，不代表模型行为已验证。 |
| 绘制与生图试跑 | 本轮未执行 | 不声称实际新成稿质量、耗时或token消耗已经验证。 |

可核对的本轮证据：{link('analysis/workflow-tutorial-migration-20260927/提示词改动.diff', '完整提示词差异')}、{link('analysis/workflow-tutorial-migration-20260927/changes.json', '逐项修改与来源记录')}、{link('analysis/workflow-tutorial-migration-20260927/checks.json', '文件边界与依赖核对结果')}。
'''

report = (OUT / 'report_intro.md').read_text(encoding='utf-8')
for marker, content in [('NODE_INDEX', '\n'.join(index)), ('SOURCE_COVERAGE', '\n'.join(coverage_lines)),
                        ('CASES', '\n'.join(case_lines)), ('CHECKS', check_text), ('DETAILS', '\n'.join(details))]:
    report = report.replace('<!-- ' + marker + ' -->', content)
(OUT / '教程融合报告.md').write_text(report, encoding='utf-8')
print(json.dumps({k:v for k,v in checks.items() if k != 'checked_prompt_files'}, ensure_ascii=False, indent=2))
print('Report:', (OUT / '教程融合报告.md').as_posix())
