"""Validate the draft contract, references and interpolation data; not visual QA."""
import argparse
import itertools
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from jsonschema import Draft202012Validator


SCHEMA = json.loads(Path(__file__).with_name('expression.schema.json').read_text(encoding='utf-8'))
Draft202012Validator.check_schema(SCHEMA)
VALIDATOR = Draft202012Validator(SCHEMA)
TOKEN = re.compile(r'[MLCQZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?')
ARITY = {'M': 2, 'L': 2, 'C': 6, 'Q': 4, 'Z': 0}


def check(ok, message):
    if not ok:
        raise ValueError(message)


def finite(value):
    if isinstance(value, float):
        check(math.isfinite(value), 'non-finite number')
    elif isinstance(value, dict):
        for item in value.values():
            finite(item)
    elif isinstance(value, list):
        for item in value:
            finite(item)


def path_data(text):
    """Contract v0.1 uses explicit absolute M/L/C/Q/Z, normalized before export."""
    check(not re.sub(r'[\s,]', '', TOKEN.sub('', text)), 'unsupported path syntax')
    tokens = TOKEN.findall(text)
    result, i = [], 0
    while i < len(tokens):
        cmd = tokens[i]
        check(cmd in ARITY, 'path commands must be explicit')
        end = i + ARITY[cmd] + 1
        check(end <= len(tokens), 'incomplete path command')
        values = tuple(float(v) for v in tokens[i + 1:end])
        finite(list(values))
        result.append((cmd, values))
        i = end
    check(result and result[0][0] == 'M', 'path must start with M')
    return result


def semantic_rig(rig, svg_path):
    params = rig['parameters']
    root = ET.parse(svg_path).getroot()
    elements = list(root.iter())
    id_list = [e.attrib['id'] for e in elements if 'id' in e.attrib]
    check(len(id_list) == len(set(id_list)), 'duplicate SVG id')
    nodes = {e.attrib['id']: e for e in elements if 'id' in e.attrib}
    parents = {c: p for p in elements for c in p}

    def node(key):
        check(key in nodes, f'unknown SVG id: {key}')
        return nodes[key]

    def parameter(key, kind=None):
        check(key in params, f'unknown parameter: {key}')
        p = params[key]
        check(kind is None or p['type'] == kind, f'wrong parameter type: {key}')
        return p

    def value(key, val, public=False):
        p = parameter(key)
        check(not public or p['access'] == 'public', f'private animation parameter: {key}')
        if p['type'] == 'number':
            check(type(val) in (int, float) and p['min'] <= val <= p['max'], f'out of range: {key}')
        else:
            check(val in p['choices'], f'unknown choice: {key}')

    for key, p in params.items():
        if p['type'] == 'number':
            check(p['min'] < p['max'], f'invalid range: {key}')
            if p['role'] == 'phase':
                check(p['min'] == 0 and p['max'] == 1 and p['access'] == 'animation', f'phase contract: {key}')
        value(key, p['default'])

    owners = set()
    def claim(svg_id, prop):
        node(svg_id)
        check((svg_id, prop) not in owners, f'duplicate property writer: {svg_id}.{prop}')
        owners.add((svg_id, prop))

    for key, b in rig['bindings'].items():
        if b['type'] == 'path_morph':
            target = node(b['svg_id'])
            check(target.tag.rsplit('}', 1)[-1] == 'path', f'morph target is not a path: {key}')
            claim(b['svg_id'], 'd')
            axes = [parameter(p, 'number') for p in b['parameters']]
            dims = len(axes)
            check(b['interpolation'] == ('linear' if dims == 1 else 'bilinear'), f'interpolation: {key}')
            coords = [tuple(k['at']) for k in b['keys']]
            check(all(len(c) == dims for c in coords), f'axis dimensions: {key}')
            check(len(coords) == len(set(coords)), f'duplicate morph key: {key}')
            levels = [sorted({c[i] for c in coords}) for i in range(dims)]
            check(set(coords) == set(itertools.product(*levels)), f'incomplete morph grid: {key}')
            for axis, levels_i in zip(axes, levels):
                check(levels_i[0] == axis['min'] and levels_i[-1] == axis['max'], f'axis coverage: {key}')
            paths = [path_data(k['d']) for k in b['keys']]
            signatures = [[c for c, _ in p] for p in paths]
            check(all(s == signatures[0] for s in signatures), f'morph topology: {key}')
            default = tuple(a['default'] for a in axes)
            check(default in coords, f'missing default morph key: {key}')
            check(paths[coords.index(default)] == path_data(target.attrib.get('d', '')), f'default geometry drift: {key}')
        elif b['type'] == 'scalar_map':
            p = parameter(b['parameter'], 'number')
            claim(b['svg_id'], b['property'])
            xs = [k[0] for k in b['keys']]
            check(all(a < z for a, z in zip(xs, xs[1:])), f'unordered scalar keys: {key}')
            check(xs[0] == p['min'] and xs[-1] == p['max'], f'scalar coverage: {key}')
            if b['property'] == 'opacity':
                check(all(0 <= y <= 1 for _, y in b['keys']), f'opacity range: {key}')
        else:
            p = parameter(b['parameter'], 'enum')
            check(set(b['cases']) == set(p['choices']), f'incomplete variants: {key}')
            for ids in b['cases'].values():
                for svg_id in ids:
                    claim(svg_id, 'opacity')

    for key, a in rig['anchors'].items():
        e = node(a['svg_id'])
        if a['type'] == 'path_vertex':
            commands = path_data(e.attrib.get('d', ''))
            check(a['command_index'] < len(commands), f'anchor index: {key}')
            check(commands[a['command_index']][0] != 'Z', f'anchor requires endpoint: {key}')

    attachment_nodes = {}
    for key, a in rig['attachments'].items():
        check(a['anchor'] in rig['anchors'], f'unknown anchor: {key}')
        e = node(a['svg_id'])
        check(a['svg_id'] not in attachment_nodes, f'duplicate attachment: {key}')
        attachment_nodes[a['svg_id']] = a
        check(not any((a['svg_id'], p) in owners for p in ['translate_x', 'translate_y', 'scale_x', 'scale_y', 'rotate']), f'attachment transform conflict: {key}')
        source = node(rig['anchors'][a['anchor']]['svg_id'])
        check(source not in set(e.iter()), f'self-dependent attachment: {key}')
        if a['sample'] == 'cycle_start':
            clock = rig['animations'].get(a['clock'])
            check(clock is not None and clock['loop'], f'attachment requires loop clock: {key}')

    # Include source ancestors so mutually dependent attachment wrappers are rejected.
    graph = {}
    for key, a in attachment_nodes.items():
        source = node(rig['anchors'][a['anchor']]['svg_id'])
        deps = set()
        while source is not None:
            if source.attrib.get('id') in attachment_nodes:
                deps.add(source.attrib['id'])
            source = parents.get(source)
        graph[key] = deps
    visited, pending = set(), set()
    def visit(key):
        check(key not in pending, 'attachment dependency cycle')
        if key in visited:
            return
        pending.add(key)
        for dep in graph[key]:
            visit(dep)
        pending.remove(key)
        visited.add(key)
    for key in graph:
        visit(key)

    for key, a in rig['animations'].items():
        check(a['seam'] != 'not_applicable' if a['loop'] else a['seam'] == 'not_applicable', f'loop seam mode: {key}')
        check(a['fade_in_s'] <= a['duration_s'] and a['fade_out_s'] <= a['duration_s'], f'fade duration: {key}')
        track_params = [t['parameter'] for t in a['tracks']]
        check(len(track_params) == len(set(track_params)), f'duplicate animation track: {key}')
        for t in a['tracks']:
            p = parameter(t['parameter'], 'number')
            if p['role'] == 'phase':
                check(t['blend'] == 'replace', f'phase requires replace track: {key}')
            ts = [k['time_s'] for k in t['keys']]
            check(ts[0] == 0 and ts[-1] == a['duration_s'], f'track duration: {key}')
            check(all(x < y for x, y in zip(ts, ts[1:])), f'unordered animation keys: {key}')
            if t['blend'] == 'replace':
                for k in t['keys']:
                    value(t['parameter'], k['value'])
            if a['seam'] == 'continuous':
                check(t['keys'][0]['value'] == t['keys'][-1]['value'], f'discontinuous loop: {key}')

    for key, e in rig['expressions'].items():
        for p, v in e['parameters'].items():
            value(p, v, public=True)
        for play in e['animations']:
            check(play['animation'] in rig['animations'], f'unknown animation: {key}')
    for c in rig['constraints']:
        for cond in c['when'] + c['require']:
            p = parameter(cond['parameter'])
            if cond['op'] != 'eq':
                check(p['type'] == 'number', 'ordered comparison of enum')
            value(cond['parameter'], cond['value'])
    return value


def validate(rig_path, command_path=None):
    rig_path = Path(rig_path)
    rig = json.loads(rig_path.read_text(encoding='utf-8'))
    validate_data(rig, rig_path.parent / rig['svg'],
                  json.loads(Path(command_path).read_text(encoding='utf-8')) if command_path else None)


def validate_data(rig, svg_path, command=None):
    finite(rig)
    VALIDATOR.validate(rig)
    check(rig['document_type'] == 'rig', 'expected rig definition')
    value = semantic_rig(rig, svg_path)
    if command is None:
        return
    finite(command)
    VALIDATOR.validate(command)
    check(command['document_type'] == 'command', 'expected command')
    check(command['character_id'] == rig['character_id'], 'wrong character')
    for a in command['actions']:
        if a['op'] == 'set_parameters':
            for p, v in a['values'].items():
                value(p, v, public=True)
        elif a['op'] == 'apply_expression':
            check(a['expression'] in rig['expressions'], 'unknown expression')
        elif a['op'] == 'play_animation':
            check(a['animation'] in rig['animations'], 'unknown animation')
    # Instance existence, resolved constraints, hidden-reset visibility and final
    # appearance require the runtime; this validator deliberately does not claim those.


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('rig')
    parser.add_argument('--command')
    args = parser.parse_args()
    validate(args.rig, args.command)
    print('PASS: schema + implemented reference/range/topology checks (not animation acceptance)')
