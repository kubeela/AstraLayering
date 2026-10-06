#!/usr/bin/env python3
"""Audited runtime extension for a real ancestor gap during a parallel round.

Only creates an isolated pending-work sequence. All production, review,
checkpoints, completion and aggregation still use the immutable source cursor.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import runpy
import shutil
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
SOURCE = Path('/Users/wutian/Desktop/coding/AstraLayering/workflow-next/live2d-layering/4.专项细化/tools/group_cursor.py')
C = runpy.run_path(str(SOURCE))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--ancestor', required=True)
    p.add_argument('--blocked', required=True)
    p.add_argument('--bounds-report', required=True, type=Path)
    p.add_argument('--candidate', required=True, type=Path)
    p.add_argument('--commit', action='store_true')
    a = p.parse_args()
    state_path = ROOT / 'structure/groups.dispatch.json'
    with C['state_lock'](state_path):
        s = C['read_json'](state_path)
        tree = C['read_json'](ROOT / s['document'])
        entries, ids = C['reconcile'](tree, s)
        if not s.get('active') or s.get('publishing') or s.get('rejection'):
            raise ValueError('requires an active healthy round')
        record = s['nodes'].get(a.ancestor)
        if not record or record['status'] != 'done':
            raise ValueError('ancestor must be genuinely completed')
        old_seq, blocked_id, blocked_path = C['current_item'](s, a.blocked)
        if not blocked_path.startswith(a.ancestor + '/'):
            raise ValueError('target is not a descendant of the completed ancestor')
        if any(record['id'] in seq['items'] for seq in s['active']['sequences']):
            raise ValueError('ancestor already has a sequence')
        d = C['workspace'](s, old_seq).resolve()
        for f in (a.bounds_report, a.candidate):
            if d not in f.resolve().parents or not f.is_file():
                raise ValueError('failure evidence must be inside blocked branch')
        report = C['read_json'](a.bounds_report)
        failed = [x for x in report.get('results', []) if x.get('path') == blocked_path and x.get('status') == 'fail' and x.get('outside_samples', 0) > 0]
        if report.get('group_path') != a.ancestor or report.get('status') != 'fail' or len(failed) != 1:
            raise ValueError('requires an actual ancestor containment failure for this target')
        reported = Path(report['candidate_svg'])
        possible_reported_paths = [reported.resolve(), (ROOT.parent.parent / reported).resolve()]
        if a.candidate.resolve() not in possible_reported_paths:
            raise ValueError('candidate does not match the reported failure')
        active = s['active']
        baseline = ROOT / active['baseline']
        for rel, expected in active['hashes'].items():
            if sha(ROOT / rel) != expected or sha(baseline / rel) != expected:
                raise ValueError('main or frozen baseline changed: ' + rel)
        sid = active['id'] + 's' + str(len(active['sequences']) + 1)
        directory = baseline.parent / sid
        audit = ROOT / 'tmp/ancestor-reopens' / active['id'] / a.ancestor
        if directory.exists() or audit.exists():
            raise ValueError('recovery destination already exists')
        event = {'time': datetime.now(timezone.utc).isoformat(), 'action': 'active_ancestor_reopen',
                 'ancestor': a.ancestor, 'blocked_descendant': blocked_path,
                 'source_cursor': str(SOURCE), 'source_sha256': sha(SOURCE),
                 'source_limitation': 'reopen requires no active round',
                 'scope': 'append isolated ancestor route; preserve existing sequence states, workers, frozen baseline, and successful artifacts',
                 'bounds_report': str(a.bounds_report), 'bounds_sha256': sha(a.bounds_report),
                 'candidate': str(a.candidate), 'candidate_sha256': sha(a.candidate),
                 'actual_failure': failed[0], 'sequence': sid, 'directory': str(directory),
                 'historical_ancestor_record': copy.deepcopy(record)}
        if not a.commit:
            print(json.dumps({**event, 'action': 'validated_dry_run'}, ensure_ascii=False, indent=2))
            return
        audit.mkdir(parents=True)
        shutil.copy2(state_path, audit / 'state.before.json')
        shutil.copy2(ROOT / 'workers.json', audit / 'workers.before.json')
        shutil.copy2(a.bounds_report, audit / 'actual-failure.json')
        shutil.copy2(a.candidate, audit / 'blocked-candidate.svg')
        shutil.copytree(baseline, directory)
        seq = {'id': sid, 'items': [record['id']], 'index': 0,
               'working_dir': str(directory.relative_to(ROOT)),
               'carry': copy.deepcopy(s['carry']), 'frames': {},
               'start': {'directory': active['baseline'], 'files': dict(active['hashes']),
                         'carry': copy.deepcopy(s['carry'])},
               'ancestor_reopen': event}
        old_sequences = copy.deepcopy(active['sequences'])
        active['sequences'].append(seq)
        active.setdefault('ancestor_reopens', []).append(event)
        record['status'] = 'active'
        if active['sequences'][:-1] != old_sequences:
            raise ValueError('existing sequence mutation')
        C['save_json'](audit / 'reopen.json', event)
        C['save_json'](state_path, s)
        with (ROOT / '运行记录.md').open('a', encoding='utf-8') as log:
            log.write('\n- 当前批次内上级返修（运行目录工具扩展，源skill只读）：' + json.dumps(event, ensure_ascii=False) + '\n')
        print(json.dumps(event, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
