#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Local orchestrator convenience wrapper; source workflow tools remain read-only."""
import json
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import runpy
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
SKILL = Path('/Users/wutian/Desktop/coding/AstraLayering/workflow-next/live2d-layering')
BASE = [sys.executable, '-B', str(SKILL / '4.专项细化/tools/group_cursor.py'),
        '--file', str(ROOT / 'structure/groups.json'),
        '--state', str(ROOT / 'structure/groups.dispatch.json')]

def invoke(args):
    p = subprocess.run(BASE + args, cwd=ROOT, text=True, capture_output=True)
    try:
        data = json.loads(p.stdout)
    except ValueError:
        print(p.stdout)
        print(p.stderr, file=sys.stderr)
        raise SystemExit(p.returncode or 2)
    if p.returncode:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        print(p.stderr, file=sys.stderr)
        raise SystemExit(p.returncode)
    if args[0] != 'next':
        with (ROOT / '运行记录.md').open('a', encoding='utf-8') as log:
            log.write('\n- 调度：`' + args[0] + '` → ' +
                      json.dumps(data, ensure_ascii=False) + '\n')
    if '--worker' in args and '--worker-id' in args:
        identity = args[args.index('--worker') + 1]
        runtime_id = args[args.index('--worker-id') + 1]
        path = ROOT / 'workers.json'
        workers = json.loads(path.read_text(encoding='utf-8'))
        binding = dict(workers.get(identity, {}))
        binding.update(worker_id=runtime_id,
                       model='gpt-6-sol' if identity.startswith('group_split:') else 'gpt-6-astra',
                       reasoning='xhigh')
        node_flag = '--pointer' if '--pointer' in args else '--node' if '--node' in args else None
        if node_flag:
            node = args[args.index(node_flag) + 1]
            binding.setdefault('node_workers', {})[node] = runtime_id
        workers[identity] = binding
        path.write_text(json.dumps(workers, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return data

def plan():
    data = invoke(['next'])
    (ROOT / 'structure/dispatch-plan.json').write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return data

def locate(target):
    data = json.loads((ROOT / 'structure/dispatch-plan.json').read_text(encoding='utf-8'))
    for seq in data.get('sequences', []):
        for item in seq['items']:
            if item['id'] == target or item['path'] == target:
                return seq, item
    raise ValueError('target absent from saved plan: ' + target)

def outputs_file(seq, pointer, values):
    p = Path(seq['working_dir']) / 'checkpoints' / (pointer + '.json')
    p.parent.mkdir(parents=True, exist_ok=True)
    bound = {k: str(Path(seq['working_dir']) / v) for k, v in values.items()}
    p.write_text(json.dumps(bound, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return p

args = sys.argv[1:]
verb = args.pop(0)
if verb == 'init':
    cmd = ['init', '--working-dir', str(ROOT), '--root-key', 'groups',
           '--child-edge', 'groups:group', '--child-edge', 'parts:part',
           '--terminal-type', 'part', '--dispatch-type', 'group',
           '--carry', 'guide_svg=block-layers/groups.svg',
           '--carry', 'artwork_svg=null', '--carry', 'rendering=null',
           '--binding', 'reference=references/base-subject.png',
           '--binding', 'line_reference=references/line-reference.png',
           '--binding', 'groups=structure/groups.json',
           '--binding', 'guide_svg=block-layers/groups.svg',
           '--binding', 'preview_tool=' + str(SKILL / 'tools/svg_preview.py')]
    print(json.dumps(invoke(cmd), ensure_ascii=False))
elif verb == 'next':
    data = plan()
    print(json.dumps(data, ensure_ascii=False, indent=2))
elif verb == 'checkpoint':
    target, pointer, worker, worker_id, raw = args
    seq, item = locate(target)
    if pointer == 'group_child_layers':
        ledger = json.loads((ROOT / 'structure/review-ledger.json').read_text(encoding='utf-8'))
        latest = ledger['groups'][item['path']][-1]
        candidate = Path(seq['working_dir']) / json.loads(raw)['guide_svg']
        if latest['status'] != 'pass' or latest['candidate_sha256'] != hashlib.sha256(candidate.read_bytes()).hexdigest():
            raise ValueError('current child layers have not passed independent review')
    output = outputs_file(seq, pointer, json.loads(raw))
    print(json.dumps(invoke(['checkpoint', '--target', item['id'], '--pointer', pointer,
                            '--worker', worker, '--worker-id', worker_id,
                            '--outputs', str(output)]), ensure_ascii=False))
elif verb == 'record-review':
    target, reviewer_id, status, report_path, candidate_path = args
    if status not in ('pass', 'revise', 'blocked'):
        raise ValueError('invalid review status')
    seq, item = locate(target)
    directory = Path(seq['working_dir'])
    report = directory / report_path
    candidate = directory / candidate_path
    if not report.is_file() or not candidate.is_file():
        raise FileNotFoundError('review report or candidate is missing')
    ledger_path = ROOT / 'structure/review-ledger.json'
    ledger = json.loads(ledger_path.read_text(encoding='utf-8')) if ledger_path.exists() else {'groups': {}}
    history = ledger['groups'].setdefault(item['path'], [])
    proof = ROOT / 'reviews/review-ledger' / item['path'] / ('%03d' % (len(history) + 1))
    proof.mkdir(parents=True, exist_ok=False)
    shutil.copy2(report, proof / 'report.md')
    shutil.copy2(candidate, proof / 'candidate.svg')
    entry = {'status': status, 'worker': 'group_child_layers:' + item['path'] + ':review',
             'worker_id': reviewer_id, 'sequence': seq['id'],
             'report': str(report), 'candidate': str(candidate),
             'report_sha256': hashlib.sha256(report.read_bytes()).hexdigest(),
             'candidate_sha256': hashlib.sha256(candidate.read_bytes()).hexdigest(),
             'frozen_report': str(proof / 'report.md'), 'frozen_candidate': str(proof / 'candidate.svg')}
    history.append(entry)
    ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    with (ROOT / '运行记录.md').open('a', encoding='utf-8') as log:
        log.write('\n- 独立审查登记：' + json.dumps(entry, ensure_ascii=False) + '\n')
    print(json.dumps({'action': 'review_recorded', 'group': item['path'], **entry}, ensure_ascii=False))
elif verb == 'handoff-unresponsive-worker':
    target, node, worker, old_id, new_id, reason = args
    if not reason.strip() or old_id == new_id:
        raise ValueError('a distinct recovery session and failure reason are required')
    seq, item = locate(target)
    cursor = runpy.run_path(str(SKILL / '4.专项细化/tools/group_cursor.py'))
    state_path = ROOT / 'structure/groups.dispatch.json'
    with cursor['state_lock'](state_path):
        state = json.loads(state_path.read_text(encoding='utf-8'))
        if state.get('publishing') or state.get('rejection'):
            raise ValueError('handoff cannot change a publishing or rejected transaction')
        active_seq, identity, path = cursor['current_item'](state, item['id'])
        frame = active_seq['frames'].get(identity, {})
        replay = active_seq.get('replay_workers', {}).get(identity, {})
        recorded = {**replay, **frame.get('workers', {})}
        selected = ([key for key, actor in recorded.items()
                     if actor.get('worker') == worker and actor.get('worker_id') == old_id
                     and key not in frame.get('nodes', {})]
                    if node == '*' else [node])
        if not selected:
            raise ValueError('no recorded original bindings for the unavailable worker')
        expected_bindings = {}
        for selected_node in selected:
            expected = {'node': selected_node, 'worker': worker, 'worker_id': old_id}
            if recorded.get(selected_node) != expected:
                raise ValueError('original expected node binding differs')
            for table in (replay, frame.get('workers', {})):
                if selected_node in table and table[selected_node] != expected:
                    raise ValueError('original frame/replay node binding differs')
            expected_bindings[selected_node] = expected
        proof_root = ROOT / 'tmp/worker-handoffs' / path / node
        proof_root.mkdir(parents=True, exist_ok=True)
        proof = proof_root / ('%03d' % (len(list(proof_root.iterdir())) + 1))
        proof.mkdir()
        shutil.copy2(state_path, proof / 'state.before.json')
        shutil.copy2(ROOT / 'workers.json', proof / 'workers.before.json')
        guide = Path(seq['working_dir']) / 'block-layers/groups.svg'
        shutil.copy2(guide, proof / 'guide.before.svg')
        replacements = {key: {'node': key, 'worker': worker, 'worker_id': new_id}
                        for key in selected}
        event = {'time': datetime.now(timezone.utc).isoformat(), 'target': path,
                 'node': node, 'old_bindings': expected_bindings, 'new_bindings': replacements,
                 'reason': reason, 'proof': str(proof),
                 'guide_sha256': hashlib.sha256(guide.read_bytes()).hexdigest(),
                 'scope': 'replace unavailable expected session only; historical producers, artifacts and completion status retained'}
        active_seq.setdefault('operational_worker_handoffs', []).append(event)
        for key, replacement in replacements.items():
            if key in replay:
                replay[key] = replacement
            if key in frame.get('workers', {}):
                frame['workers'][key] = replacement
        cursor['save_json'](state_path, state)
        (proof / 'handoff.json').write_text(json.dumps(event, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        workers_path = ROOT / 'workers.json'
        workers = json.loads(workers_path.read_text(encoding='utf-8'))
        binding = workers.setdefault(worker, {})
        binding.setdefault('handoffs', []).append(event)
        binding.update(worker_id=new_id,
                       model='gpt-6-sol' if worker.startswith('group_split:') else 'gpt-6-astra',
                       reasoning='xhigh')
        binding.setdefault('node_workers', {}).update({key: new_id for key in selected})
        workers_path.write_text(json.dumps(workers, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        with (ROOT / '运行记录.md').open('a', encoding='utf-8') as log:
            log.write('\n- 无响应会话恢复交接：' + json.dumps(event, ensure_ascii=False) + '\n')
        print(json.dumps({'action': 'expected_worker_handed_off', **event}, ensure_ascii=False))
elif verb == 'expand':
    target, worker, worker_id, node, patch = args
    seq, item = locate(target)
    print(json.dumps(invoke(['expand', '--parent', item['id'], '--worker', worker,
                            '--worker-id', worker_id, '--node', node,
                            '--patch', str(Path(seq['working_dir']) / patch)]), ensure_ascii=False))
elif verb == 'complete':
    target, worker, worker_id, node = args
    seq, item = locate(target)
    print(json.dumps(invoke(['complete', '--target', item['id'], '--worker', worker,
                            '--worker-id', worker_id, '--node', node]), ensure_ascii=False))
elif verb == 'batch-post-motion':
    target, worker, worker_id = args
    seq, item = locate(target)
    directory = Path(seq['working_dir'])
    manifest_path = directory / 'refinement/groups' / item['path'] / 'post-motion-manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    expected = [
        'part_contours', 'part_structure', 'part_tone_boundaries',
        'part_detail_lines', 'part_brush_lines', 'part_base_colors',
        'part_volume', 'part_color_transitions', 'part_local_shading',
        'cast_shadow_relations', 'cast_shadow_artwork', 'part_highlights',
        'part_rendered',
    ]
    nodes = manifest['nodes']
    if [node['id'] for node in nodes] != expected:
        raise ValueError('manifest does not contain the selected serial nodes in order')
    for node in nodes:
        if node['status'] not in ('pass', 'complete', 'completed', 'done'):
            raise ValueError('node is not successful: ' + node['id'])
        if not node.get('snapshots') or not node.get('evidence'):
            raise ValueError('missing stage history or evidence: ' + node['id'])
        snapshots = node['snapshots']
        paths = list(snapshots.values()) if isinstance(snapshots, dict) else snapshots
        for entry in [*paths, *node['evidence']]:
            relative_path = entry['path'] if isinstance(entry, dict) else entry
            resolved = (directory / relative_path).resolve()
            if directory.resolve() not in resolved.parents or not resolved.is_file():
                raise ValueError('missing or outside stage evidence: ' + relative_path)
            if isinstance(entry, dict) and entry.get('sha256'):
                if hashlib.sha256(resolved.read_bytes()).hexdigest() != entry['sha256']:
                    raise ValueError('stage history checksum differs: ' + relative_path)
        if node.get('unresolved'):
            raise ValueError('unresolved stage issues: ' + node['id'])
        values = {'artwork_svg': 'refinement/character.svg'}
        if node['id'] == 'part_brush_lines':
            values['preview'] = 'refinement/preview.png'
        if expected.index(node['id']) >= expected.index('part_base_colors'):
            values['rendering'] = 'structure/rendering.json'
        if node['id'] == 'part_rendered':
            values['preview'] = 'refinement/preview.png'
        if node['outputs'] != values:
            raise ValueError('declared outputs differ for ' + node['id'])
    for node in nodes:
        output = outputs_file(seq, node['id'], node['outputs'])
        invoke(['checkpoint', '--target', item['id'], '--pointer', node['id'],
                '--worker', worker, '--worker-id', worker_id, '--outputs', str(output)])
    print(json.dumps({'action': 'batch_checkpointed', 'target': item['path'],
                      'nodes': expected, 'history': str(manifest_path)}, ensure_ascii=False))
elif verb in ('aggregate', 'repair', 'reopen'):
    print(json.dumps(invoke([verb] + args), ensure_ascii=False, indent=2))
else:
    raise ValueError('unknown command: ' + verb)
