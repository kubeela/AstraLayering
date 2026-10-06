#!/usr/bin/env python3
"""Read current source branches and record a controller selection; no cursor writes."""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKILL = Path('/Users/wutian/Desktop/coding/AstraLayering/workflow-next/live2d-layering')
STEPS = [
    ('part_contours', '3.geometry/3.1.外轮廓与接界'),
    ('part_structure', '3.geometry/3.2.内部结构线'),
    ('part_tone_boundaries', '3.geometry/3.3.明暗范围线'),
    ('part_detail_lines', '3.geometry/3.4.细节与纹理线'),
    ('part_brush_lines', '3.geometry/3.5.画笔重绘'),
    ('part_base_colors', '4.rendering stack/4.1.基色与材质分区'),
    ('part_volume', '4.rendering stack/4.2.大明暗与体积'),
    ('part_color_transitions', '4.rendering stack/4.3.过渡色与局部色'),
    ('part_local_shading', '4.rendering stack/4.4.局部暗部细化'),
    ('cast_shadow_relations', '4.rendering stack/4.5.投影处理/4.5.1.投影识别与关系定义'),
    ('cast_shadow_artwork', '4.rendering stack/4.5.投影处理/4.5.2.独立投影绘制'),
    ('part_highlights', '4.rendering stack/4.6.高光与反光'),
    ('part_rendered', '4.rendering stack/4.7.线色融合与材质细化'),
]

target, actual_worker = sys.argv[1:]
plan = json.loads((ROOT / 'structure/dispatch-plan.json').read_text())
sequence = next(s for s in plan['sequences'] if any(i['path'] == target for i in s['items']))
directory = Path(sequence['working_dir'])
tree = json.loads((directory / 'structure/groups.json').read_text())

def find(nodes, prefix=''):
    for node in nodes:
        path = f'{prefix}/{node["name"]}' if prefix else node['name']
        if path == target:
            return node
        nested = find(node.get('groups', []), path)
        if nested is not None:
            return nested
    return None

group = find(tree['groups'])
if group is None:
    raise ValueError('current group absent from current sequence tree')
parts = [p['name'] for p in group.get('parts', [])]
if not parts:
    raise ValueError('no direct parts: no then branch to dispatch')
records = []
for node_id, relative in STEPS:
    folder = SKILL / 'templates/部件专项/generic' / relative
    source = folder / '流程.yaml'
    raw = source.read_text()
    if not raw.startswith('id: ' + node_id + '\n'):
        raise ValueError('source node id differs: ' + str(source))
    if '  direct_parts_of: dispatch.item.path\n  in: dispatch.inputs.groups\n' not in raw:
        raise ValueError('source conditional changed: ' + str(source))
    selected = raw.split('\nthen:\n', 1)[1].split('\nelse:\n', 1)[0]
    if not re.search(r'^  worker: [\"\']group:\{group_path\}[\"\']$', selected, re.M):
        raise ValueError('selected worker differs: ' + str(source))
    models = list(folder.glob('*.model'))
    if len(models) != 1 or models[0].name != 'gpt-6-astra-xhigh.model':
        raise ValueError('source model changed: ' + str(folder))
    records.append({'id': node_id, 'yaml': str(source),
                    'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                    'selected_branch': 'then', 'selected_branch_yaml': selected,
                    'model': models[0].name})
record = {'time': datetime.now(timezone.utc).isoformat(), 'target': target,
          'worker': 'group:' + target, 'actual_worker_id': actual_worker,
          'selected_branch': 'then', 'direct_parts': parts, 'nodes': records}
out = directory / 'checkpoints/post-motion-config-selection.json'
out.parent.mkdir(parents=True, exist_ok=True)
if out.exists():
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f')
    out.with_name('post-motion-config-selection.' + stamp + '.previous.json').write_bytes(out.read_bytes())
out.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(record, ensure_ascii=False, indent=2))
