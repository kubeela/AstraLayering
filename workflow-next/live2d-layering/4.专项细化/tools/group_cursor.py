"""Dispatch selected node types in a configurable JSON n-ary tree.

The sibling state file marks only dispatched nodes. Terminal components remain
in the source tree, but do not receive workflow status. The orchestrator owns
workers, outputs, and reviews.
"""

import argparse
from contextlib import contextmanager
import fcntl
import hashlib
import shutil
import copy
import json
import os
import re
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
from groups import validate_mirror_pairs
from merge_artifacts import merge_json, merge_svg, read_svg, signature, element_text, element_tail, local_references, validate_references, validate_static_svg, MISSING
from dispatch_errors import ArtifactFault, MergeConflict


NAME = re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$")
STATES = {"pending", "active", "ready", "done"}


def pair(value, label):
    if ":" not in value:
        raise ValueError(f"{label} must use key:value")
    key, item = value.split(":", 1)
    if not NAME.fullmatch(key) or not NAME.fullmatch(item):
        raise ValueError(f"invalid {label}: {value}")
    return key, item


def read_json(path):
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return value


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=path.parent,
            prefix=f".{path.name}.", delete=False,
        ) as stream:
            temporary = Path(stream.name)
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def validate_spec(tree, routes):
    if not isinstance(tree, dict) or not isinstance(routes, dict):
        raise ValueError("tree specification and routes must be objects")
    root = tree.get("root_key")
    edges = tree.get("child_edges")
    terminals = tree.get("terminal_types")
    dispatched = tree.get("dispatch_types")
    if (not isinstance(root, str) or not NAME.fullmatch(root)
            or not isinstance(edges, dict) or root not in edges
            or not edges or any(not NAME.fullmatch(k) or not isinstance(v, str)
                                 or not NAME.fullmatch(v) for k, v in edges.items())
            or not isinstance(terminals, list)
            or any(not isinstance(v, str) for v in terminals)
            or len(terminals) != len(set(terminals))
            or not set(terminals) <= set(edges.values())
            or not isinstance(dispatched, list) or not dispatched
            or len(dispatched) != len(set(dispatched))
            or not set(dispatched) <= set(edges.values()) - set(terminals)):
        raise ValueError("invalid tree root, child edges, or terminal types")
    if set(routes) != set(dispatched):
        raise ValueError("routes must contain every dispatched node type")
    for kind, names in routes.items():
        if (not isinstance(names, list) or len(names) != len(set(names))
                or any(not isinstance(name, str) or not NAME.fullmatch(name)
                       for name in names)):
            raise ValueError(f"invalid routes for {kind}")


def enumerate_tree(document, tree):
    """Use only YAML-declared edges; return current nodes in depth-first order."""
    root = tree["root_key"]
    edges = tree["child_edges"]
    terminals = set(tree["terminal_types"])
    if not isinstance(document.get(root), list):
        raise ValueError(f"tree root {root} must be an array")
    entries = []

    def siblings(arrays, parent_path, parent):
        names = set()
        for kind, nodes in arrays:
            if not isinstance(nodes, list):
                raise ValueError(f"children of {parent_path or '<root>'} must be arrays")
            for node in nodes:
                if not isinstance(node, dict):
                    raise ValueError(f"invalid {kind} below {parent_path or '<root>'}")
                name = node.get("name")
                if not isinstance(name, str) or not NAME.fullmatch(name) or name in names:
                    raise ValueError(f"invalid or repeated sibling name: {name}")
                names.add(name)
                path = f"{parent_path}/{name}" if parent_path else name
                entry = {
                    "kind": kind, "name": name, "path": path,
                    "parent_path": parent_path or None, "node": node,
                }
                entries.append(entry)
                if kind in terminals:
                    if any(edge in node for edge in edges):
                        raise ValueError(f"terminal node has child edges: {path}")
                else:
                    siblings([(child_kind, node.get(edge, []))
                              for edge, child_kind in edges.items()], path, entry)

    siblings([(edges[root], document[root])], "", None)
    return entries


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def relative(path, root):
    path = Path(path)
    resolved = (root / path).resolve() if not path.is_absolute() else path.resolve()
    try:
        return str(resolved.relative_to(root))
    except ValueError:
        raise ValueError(f'output path must remain in working_dir: {path}') from None


def parse_values(values):
    result = {}
    for value in values:
        if '=' not in value:
            raise ValueError('bindings use name=path or name=null')
        name, path = value.split('=', 1)
        if not NAME.fullmatch(name) or name in result or not path:
            raise ValueError(f'invalid or repeated binding: {name}')
        result[name] = None if path == 'null' else path
    return result


def make_state(tree, routes, root, document, carry, bindings):
    normalized = {name: relative(path, root) if path is not None else None
                  for name, path in carry.items()}
    paths = [path for path in normalized.values() if path is not None]
    if len(paths) != len(set(paths)) or document in paths:
        raise ValueError('tree and carry artifacts must have distinct paths')
    if any(not (root / path).is_file() for path in paths):
        raise ValueError('initial carry artifact is missing')
    return {
        'version': 6, 'tree': tree, 'routes': routes, 'working_dir': str(root),
        'document': document, 'bindings': bindings, 'carry': normalized,
        'next_id': 1, 'next_round': 1, 'nodes': {}, 'active': None,
        'publishing': None, 'last_aggregate': None, 'rejection': None,
    }


def associations(document, entries, state):
    index = {entry['path']: 'group' for entry in entries
             if entry['kind'] in state['tree']['dispatch_types']}
    validate_mirror_pairs(document, index)
    return document.get('mirror_pairs', [])


def reconcile(document, state):
    if not isinstance(state, dict) or state.get('version') != 6:
        raise ValueError('dispatch state requires version 6; use init to migrate an idle old state')
    if (not isinstance(state.get('nodes'), dict)
            or not isinstance(state.get('next_id'), int) or state['next_id'] < 1
            or not isinstance(state.get('next_round'), int) or state['next_round'] < 1
            or not isinstance(state.get('carry'), dict)):
        raise ValueError('invalid dispatch state')
    validate_spec(state['tree'], state['routes'])
    entries = enumerate_tree(document, state['tree'])
    associations(document, entries, state)
    dispatched = set(state['tree']['dispatch_types'])
    current = {entry['path'] for entry in entries if entry['kind'] in dispatched}
    missing = set(state['nodes']) - current
    if missing:
        raise ValueError(f'previous nodes were removed or renamed: {sorted(missing)[:3]}')
    ids = set()
    for entry in entries:
        if entry['kind'] not in dispatched:
            continue
        path = entry['path']
        if path not in state['nodes']:
            state['nodes'][path] = {'id': f"n{state['next_id']}", 'kind': entry['kind'], 'status': 'pending'}
            state['next_id'] += 1
        record = state['nodes'][path]
        if (not isinstance(record, dict) or record.get('kind') != entry['kind']
                or record.get('status') not in STATES or not isinstance(record.get('id'), str)
                or not re.fullmatch(r'n[1-9]\d*', record['id']) or record['id'] in ids):
            raise ValueError(f'invalid node state at {path}')
        ids.add(record['id'])
        entry.update(id=record['id'], status=record['status'])
        if record['status'] == 'done':
            actual = sorted(child['path'] for child in entries if child['parent_path'] == path)
            if record.get('completed_children') != actual:
                raise ValueError(f'completed node changed direct children: {path}')
    if ids and state['next_id'] <= max(int(identity[1:]) for identity in ids):
        raise ValueError('next_id collides with an existing node')
    by_id = {entry['id']: entry for entry in entries if 'id' in entry}
    active = state['active']
    scheduled = set()
    if active is not None:
        for sequence in active['sequences']:
            item_ids = sequence['items']
            position = sequence['index']
            if not isinstance(position, int) or not 0 <= position <= len(item_ids):
                raise ValueError('invalid serial pointer')
            for index, identity in enumerate(item_ids):
                if identity in scheduled or identity not in by_id:
                    raise ValueError('invalid or repeated scheduled item')
                scheduled.add(identity)
                expected = 'ready' if index < position else 'active' if index == position else 'pending'
                if by_id[identity]['status'] != expected:
                    raise ValueError('sequence pointer and node status disagree')
    if any(entry.get('status') in {'active', 'ready'} and entry['id'] not in scheduled for entry in entries):
        raise ValueError('active node has no sequence')
    return entries, by_id


def public(entry):
    return {key: entry[key] for key in ('id', 'kind', 'name', 'path', 'parent_path')}


def current_item(state, target):
    active = state['active']
    if active is None:
        raise ValueError('no round is active')
    target_id = state['nodes'].get(target, {}).get('id', target)
    for sequence in active['sequences']:
        if target_id in sequence['items']:
            if sequence['index'] == len(sequence['items']) or sequence['items'][sequence['index']] != target_id:
                raise ValueError('target is not the current serial item')
            path = next(path for path, node in state['nodes'].items() if node['id'] == target_id)
            return sequence, target_id, path
    raise ValueError('target is not in the current round')


def workspace(state, sequence):
    root = Path(state['working_dir'])
    return root / relative(sequence['working_dir'], root)


def route(state, entry):
    return f"{entry['kind']}:{entry['name']}" if entry['name'] in state['routes'][entry['kind']] else 'generic'


def result(state, entries, by_id, action):
    if state['active'] is None:
        return {'action': 'done', 'carry': {name: str(Path(state['working_dir']) / path) if path else None
                                          for name, path in state['carry'].items()}}
    sequences = []
    for sequence in state['active']['sequences']:
        directory = workspace(state, sequence)
        bindings = dict(state['bindings'])
        for name, value in bindings.items():
            if value is not None:
                original = Path(value)
                if not original.is_absolute():
                    original = Path(state['working_dir']) / original
                try:
                    local = original.resolve().relative_to(Path(state['working_dir']))
                except ValueError:
                    bindings[name] = str(original.resolve())
                else:
                    bindings[name] = str(directory / local)
        bindings['groups'] = str(directory / state['document'])
        item = sequence['items'][sequence['index']] if sequence['index'] < len(sequence['items']) else None
        current = None
        if item:
            frame = sequence['frames'].get(item, {})
            current = {'target': public(by_id[item]), 'route': route(state, by_id[item]),
                       'pointer': frame.get('pointer'), 'outputs': frame.get('outputs', {}),
                       'nodes': frame.get('nodes', {}),
                       'workers': sequence.get('replay_workers', {}).get(item, frame.get('workers', {})),
                       'repair': sequence.get('repair_context', {}).get(item)}
        sequences.append({'id': sequence['id'], 'items': [public(by_id[identity]) for identity in sequence['items']],
                          'working_dir': str(directory), 'inputs': bindings,
                          'carry': {name: str(directory / path) if path else None
                                    for name, path in sequence['carry'].items()},
                          'current': current, 'ready': item is None})
    return {'action': action, 'round': state['active']['id'], 'depth': state['active']['depth'],
            'sequences': sequences, 'aggregate_ready': all(item['ready'] for item in sequences),
            'rejection': state.get('rejection')}


def select_next(document, state, entries, by_id, state_path):
    if state['active'] is not None:
        return result(state, entries, by_id, 'active')
    pending = [entry for entry in entries if entry.get('status') == 'pending']
    if not pending:
        return result(state, entries, by_id, 'done')
    depth = min(entry['path'].count('/') for entry in pending)
    layer = [entry for entry in pending if entry['path'].count('/') == depth]
    lookup = {entry['path']: entry for entry in layer}
    linked = {path: pair['members'] for pair in associations(document, entries, state) for path in pair['members']}
    plans, used = [], set()
    for entry in layer:
        if entry['path'] in used:
            continue
        members = [lookup[path] for path in linked.get(entry['path'], [entry['path']]) if path in lookup]
        used.update(member['path'] for member in members)
        plans.append(members)
    root = Path(state['working_dir'])
    round_id = f"r{state['next_round']}"
    cache = Path('tmp') / ('dispatch-' + state_path.stem) / round_id
    baseline = root / cache / 'base'
    carry_paths = [path for path in state['carry'].values() if path]
    paths = list(dict.fromkeys([state['document'], *carry_paths]))
    for value in state['bindings'].values():
        if value:
            path = Path(value)
            path = path if path.is_absolute() else root / path
            try:
                local = str(path.resolve().relative_to(root))
            except ValueError:
                continue
            if path.is_file() and local not in paths:
                paths.append(local)
    if (root / 'options.json').is_file() and 'options.json' not in paths:
        paths.append('options.json')
    hashes = {}
    for path in paths:
        source = root / path
        if not source.is_file():
            raise ValueError(f'baseline artifact is missing: {path}')
        if path.endswith('.svg'):
            validate_static_svg(read_svg(source.read_bytes()))
            validate_references(read_svg(source.read_bytes()))
        destination = baseline / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        hashes[path] = digest(source)
    sequences = []
    for index, members in enumerate(plans, 1):
        identity = f'{round_id}s{index}'
        directory = root / cache / identity
        shutil.copytree(baseline, directory, dirs_exist_ok=True)
        item_ids = [entry['id'] for entry in members]
        state['nodes'][members[0]['path']]['status'] = 'active'
        sequences.append({'id': identity, 'items': item_ids, 'index': 0,
                          'working_dir': str(directory.relative_to(root)),
                          'carry': copy.deepcopy(state['carry']), 'frames': {},
                          'start': {'directory': str(baseline.relative_to(root)), 'files': dict(hashes),
                                    'carry': copy.deepcopy(state['carry'])}})
    state['active'] = {'id': round_id, 'depth': depth, 'baseline': str(baseline.relative_to(root)),
                       'hashes': hashes, 'sequences': sequences}
    state['next_round'] += 1
    state['rejection'] = None
    return result(state, entries, by_id, 'run')


def owned(path, allowed):
    return any(path == prefix or path.startswith(prefix + '/') for prefix in allowed)


def check_tree_scope(base, current, state, allowed):
    edges = state['tree']['child_edges']
    root_key = state['tree']['root_key']
    def stripped(document):
        def visit(nodes, parent=''):
            result = []
            for node in nodes:
                path = parent + '/' + node['name'] if parent else node['name']
                if owned(path, allowed):
                    result.append({'name': node['name']})
                else:
                    result.append({key: visit(value, path) if key in edges else copy.deepcopy(value)
                                   for key, value in node.items()})
            return result
        return {key: visit(value) if key == root_key else copy.deepcopy(value)
                for key, value in document.items() if key != 'mirror_pairs'}
    if stripped(base) != stripped(current):
        raise ValueError('tree change is outside the sequence targets')
    original = base.get('mirror_pairs', [])
    if current.get('mirror_pairs', [])[:len(original)] != original:
        raise ValueError('existing mirror pairs must be preserved')
    for pair in current.get('mirror_pairs', [])[len(original):]:
        if not any(path.rpartition('/')[0] in allowed for path in pair['members']):
            raise ValueError('new mirror pair must include a direct child of a sequence target')


def check_svg_scope(base_data, data, allowed, effect_ids=()):
    root = read_svg(data)
    def bindings(node, inherited=False, definitions=False):
        definitions = definitions or node.tag.rsplit('}', 1)[-1] == 'defs'
        path = node.get('data-group-path') or node.get('data-part-path')
        own = bool(path and owned(path, allowed) or node.get('id') in effect_ids)
        if path and not owned(path, allowed) and (base_data is None or inherited) and not definitions:
            raise ValueError(f'SVG contains an unrelated component inside this target: {path}')
        if base_data is None and not definitions and not (own or inherited) and node.tag.rsplit('}', 1)[-1] in {
                'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'image', 'use'}:
            raise ValueError('new SVG drawing requires a target path or a registered rendering layer')
        for child in node:
            bindings(child, inherited or own, definitions)
    bindings(root)
    if base_data is None:
        return
    def is_owned(node):
        path = node.get('data-group-path') or node.get('data-part-path')
        return bool(path and owned(path, allowed) or node.get('id') in effect_ids)
    def stripped(node):
        tag = node.tag.rsplit('}', 1)[-1]
        if tag == 'defs' or is_owned(node):
            return None
        return (node.tag, tuple(sorted(node.attrib.items())), element_text(node), element_tail(node),
                tuple(value for child in node if (value := stripped(child)) is not None))
    base = read_svg(base_data)
    if stripped(base) != stripped(root):
        raise ValueError('SVG change is outside the sequence targets')
    # Shared definitions referenced by foreign drawing must stay intact.
    protected = set()
    def foreign_references(node):
        if is_owned(node) or node.tag.rsplit('}', 1)[-1] == 'defs':
            return
        shell = copy.copy(node)
        shell[:] = []
        protected.update(local_references(shell))
        for child in node:
            foreign_references(child)
    foreign_references(base)
    definitions = {node.get('id'): node for node in base.iter() if node.get('id')}
    current = {node.get('id'): node for node in root.iter() if node.get('id')}
    pending = sorted(protected, reverse=True)
    while pending:
        identity = pending.pop()
        original = definitions.get(identity)
        if original is None:
            continue
        if identity not in current or signature(original) != signature(current[identity]):
            raise ValueError(f'SVG shared resource changed outside the sequence targets: {identity}')
        for linked in sorted(local_references(original) - protected, reverse=True):
            protected.add(linked)
            pending.append(linked)
    # Styles in shared defs can affect any component, even without url references.
    styles = lambda document: [signature(node) for defs in document.iter('{http://www.w3.org/2000/svg}defs')
                               for node in defs.iter('{http://www.w3.org/2000/svg}style')]
    if styles(base) != styles(root):
        raise ValueError('SVG shared styles changed outside the sequence targets')


def check_registry_scope(base, current, allowed, paths):
    if not isinstance(current, dict) or set(current) != {'layers'} or not isinstance(current['layers'], list):
        raise ValueError('render registry requires a layers array')
    layers = {}
    for layer in current['layers']:
        required = {'id', 'type', 'owner', 'follow', 'clip_to'}
        if not isinstance(layer, dict) or not required <= set(layer) or set(layer) - required - {'note'}:
            raise ValueError('render layer requires id, type, owner, follow, clip_to')
        for key in ('id', 'type'):
            if not isinstance(layer[key], str) or not NAME.fullmatch(layer[key]):
                raise ValueError(f'invalid render layer {key}')
        identity = layer['id']
        if identity in layers:
            raise ValueError('duplicate render layer id')
        if not isinstance(layer['clip_to'], list) or any(not isinstance(path, str) for path in layer['clip_to']):
            raise ValueError('clip_to requires structure paths')
        if len(set(layer['clip_to'])) != len(layer['clip_to']):
            raise ValueError('clip_to paths must be unique')
        references = [layer['owner'], *layer['clip_to']] + ([layer['follow']] if layer['follow'] is not None else [])
        if any(not isinstance(path, str) or path not in paths for path in references):
            raise ValueError('render layer references an unknown structure path')
        if 'note' in layer and (not isinstance(layer['note'], str) or not layer['note'].strip()):
            raise ValueError('render layer note must be nonempty text')
        layers[identity] = layer
    originals = {layer['id']: layer for layer in base.get('layers', [])} if base else {}
    for identity in sorted(set(originals) | set(layers)):
        before, after = originals.get(identity), layers.get(identity)
        if before != after and any(not owned(layer['owner'], allowed) for layer in (before, after) if layer):
            raise ValueError('render layer change is outside the sequence targets')
    return {identity for identity, layer in {**originals, **layers}.items() if owned(layer['owner'], allowed)}


def sequence_document(state, sequence):
    document = read_json(workspace(state, sequence) / state['document'])
    entries = enumerate_tree(document, state['tree'])
    associations(document, entries, state)
    baseline = read_json(Path(state['working_dir']) / state['active']['baseline'] / state['document'])
    allowed = [path for path, record in state['nodes'].items() if record['id'] in sequence['items']]
    check_tree_scope(baseline, document, state, allowed)
    return document, entries


def expand(state, target, patch):
    sequence, identity, path = current_item(state, target)
    document, entries = sequence_document(state, sequence)
    parent = next(entry['node'] for entry in entries if entry['path'] == path)
    edges = state['tree']['child_edges']
    metadata = {'mirror_pairs'} - set(edges)
    if (not isinstance(patch, dict) or set(patch) - set(edges) - metadata
            or any(not isinstance(value, list) for value in patch.values())):
        raise ValueError('patch must use declared child edges and mirror_pairs')
    if not any(patch.values()):
        return {'action': 'expanded', 'parent': identity, 'added': 0, 'nodes': []}
    before = {entry['path'] for entry in entries}
    for edge in edges:
        for node in patch.get(edge, []):
            if not isinstance(node, dict) or any(node.get(child) not in (None, []) for child in edges):
                raise ValueError('expand only appends direct children')
        if edge in patch:
            parent.setdefault(edge, []).extend(copy.deepcopy(patch[edge]))
    document.setdefault('mirror_pairs', []).extend(copy.deepcopy(patch.get('mirror_pairs', [])))
    entries = enumerate_tree(document, state['tree'])
    associations(document, entries, state)
    if any(not any(member.rpartition('/')[0] == path for member in pair['members'])
           for pair in patch.get('mirror_pairs', [])):
        raise ValueError('new mirror pair must include a direct child of the current target')
    save_json(workspace(state, sequence) / state['document'], document)
    added = [{key: entry[key] for key in ('kind', 'name', 'path', 'parent_path')}
             for entry in entries if entry['path'] not in before]
    return {'action': 'expanded', 'parent': identity, 'added': len(added), 'nodes': added}


def record_outputs(state, sequence, identity, outputs):
    if not isinstance(outputs, dict):
        raise ValueError('outputs must be a name-to-path object')
    directory = workspace(state, sequence)
    frame = sequence['frames'].setdefault(identity, {'pointer': None, 'outputs': {}})
    normalized = {}
    for name, value in outputs.items():
        if not isinstance(name, str) or not NAME.fullmatch(name):
            raise ValueError(f'invalid output name: {name}')
        if value is None:
            if name in sequence['carry'] and sequence['carry'][name] is not None:
                raise ValueError('a successful carry artifact cannot be reset to null')
            normalized[name] = None
            continue
        if not isinstance(value, str):
            raise ValueError('outputs must contain paths or null')
        path = relative(value, directory)
        if not (directory / path).is_file():
            raise ValueError(f'output is missing: {path}')
        if path == state['document'] or path in state['active']['hashes'] and path not in sequence['carry'].values():
            raise ValueError('output overwrites a tree or read-only input')
        frame['outputs'][name] = path
        normalized[name] = path
        if name in sequence['carry']:
            sequence['carry'][name] = path
    return normalized


def finish_group(state, target, outputs):
    sequence, identity, path = current_item(state, target)
    document, entries = sequence_document(state, sequence)
    direct = sorted(entry['path'] for entry in entries if entry['parent_path'] == path)
    if not direct:
        raise ValueError(f'group must contain a direct group or part before completion: {path}')
    record_outputs(state, sequence, identity, outputs)
    frame = sequence['frames'].setdefault(identity, {'pointer': None, 'outputs': {}})
    frame['completed_children'] = direct
    frame['snapshot'] = snapshot_item(state, sequence, identity)
    state['nodes'][path]['status'] = 'ready'
    sequence['index'] += 1
    if sequence['index'] < len(sequence['items']):
        next_id = sequence['items'][sequence['index']]
        next_path = next(path for path, node in state['nodes'].items() if node['id'] == next_id)
        state['nodes'][next_path]['status'] = 'active'
    return {'action': 'ready', 'target': identity, 'sequence': sequence['id'],
            'sequence_ready': sequence['index'] == len(sequence['items'])}


def bind_worker(state, target, node, worker, worker_id=None):
    sequence, identity, _ = current_item(state, target)
    if not isinstance(worker, str) or not worker.strip() or not isinstance(node, str) or not node.strip():
        raise ValueError('a node and its declared worker identity are required')
    frame = sequence['frames'].setdefault(identity, {'pointer': None, 'outputs': {}})
    actor = {'node': node, 'worker': worker, 'worker_id': worker_id}
    replay = sequence.get('replay_workers', {}).get(identity, {}).get(node)
    if replay and replay != actor:
        raise ValueError('repair must return to the recorded original worker')
    previous = frame.setdefault('workers', {}).get(node)
    if previous and previous != actor:
        raise ValueError('node worker binding changed during the group')
    frame['workers'][node] = actor
    frame['actor'] = actor
    return actor


def claim_outputs(state, sequence, identity, actor, names):
    frame = sequence['frames'][identity]
    for name in names:
        frame.setdefault('producers', {})[name] = dict(actor)


def snapshot_item(state, sequence, identity):
    """A transaction checkpoint, discarded after the round is published."""
    root = Path(state['working_dir'])
    directory = workspace(state, sequence)
    destination = Path(state['active']['baseline']).parent / 'snapshots' / sequence['id'] / identity
    paths = {state['document'], *state['active']['hashes'], *[value for value in sequence['carry'].values() if value]}
    for frame in sequence['frames'].values():
        paths.update(frame.get('outputs', {}).values())
    if (directory / 'options.json').is_file():
        paths.add('options.json')
    hashes = {}
    for path in sorted(paths):
        source = directory / relative(path, directory)
        if not source.is_file():
            raise ValueError('delivered output is missing: ' + path)
        atomic_bytes(root / destination / path, source.read_bytes())
        hashes[path] = digest(source)
    return {'directory': str(destination), 'files': hashes, 'carry': copy.deepcopy(sequence['carry'])}


def artifact_call(function, *args, source, artifact, target=None, **kwargs):
    """Attach attribution while the input's sequence is still known."""
    try:
        return function(*args, **kwargs)
    except ArtifactFault as exc:
        raise exc.context(sources=[source], artifact=artifact, target=target)
    except (ValueError, ET.ParseError, OSError) as exc:
        raise ArtifactFault('artifact_invalid', str(exc), sources=[source], artifact=artifact, target=target) from exc


def validate_sequence_items(state, sequence):
    root = Path(state['working_dir'])
    before = sequence['start']
    for index, identity in enumerate(sequence['items']):
        frame = sequence['frames'][identity]
        target = next(path for path, record in state['nodes'].items() if record['id'] == identity)
        after = frame['snapshot']
        previous_dir = root / before['directory']
        # The last delivered item owns the currently returned workspace.
        directory = workspace(state, sequence) if index == len(sequence['items']) - 1 else root / after['directory']
        for path, expected in after['files'].items():
            if index != len(sequence['items']) - 1 and digest(directory / path) != expected:
                raise ArtifactFault('checkpoint_changed', 'transaction checkpoint is missing or changed', category='execution')
        for path, expected in state['active']['hashes'].items():
            if path not in {state['document'], 'options.json', *before['carry'].values(), *after['carry'].values()} and digest(directory / path) != expected:
                raise ArtifactFault('read_only_input_changed', f'read-only input changed: {path}',
                                    sources=[sequence['id']], artifact=path, target=identity)
        def check():
            current = read_json(directory / state['document'])
            entries = enumerate_tree(current, state['tree'])
            associations(current, entries, state)
            check_tree_scope(read_json(previous_dir / state['document']), current, state, [target])
            return {entry['path'] for entry in entries}
        paths = artifact_call(check, source=sequence['id'], artifact='groups', target=identity)
        effects = set()
        for name, path in after['carry'].items():
            if path is None or not path.endswith('.json'):
                continue
            old = before['carry'].get(name)
            previous = read_json(previous_dir / old) if old else None
            current = artifact_call(read_json, directory / path, source=sequence['id'], artifact=name, target=identity)
            if 'layers' in current or previous and 'layers' in previous:
                effects.update(artifact_call(check_registry_scope, previous, current, [target], paths,
                                             source=sequence['id'], artifact=name, target=identity))
        for name, path in after['carry'].items():
            if path is None or not path.endswith('.svg'):
                continue
            old = before['carry'].get(name)
            def check_svg():
                content = (directory / path).read_bytes()
                document = read_svg(content)
                validate_static_svg(document)
                validate_references(document)
                check_svg_scope((previous_dir / old).read_bytes() if old else None, content, [target], effects)
            artifact_call(check_svg, source=sequence['id'], artifact=name, target=identity)
        before = after


def merge_round(state, entries, by_id):
    active = state['active']
    if active is None:
        if state['last_aggregate']:
            return None, {'action': 'already_aggregated', **state['last_aggregate']}
        raise ValueError('no round to aggregate')
    if any(sequence['index'] != len(sequence['items']) for sequence in active['sequences']):
        raise ValueError('aggregate requires every serial item to finish')
    root = Path(state['working_dir'])
    baseline = root / active['baseline']
    for path, expected in active['hashes'].items():
        if digest(root / path) != expected:
            raise ArtifactFault('main_artifact_changed', f'main artifact changed during the round: {path}',
                                artifact=path, category='execution')
        if digest(baseline / path) != expected:
            raise ArtifactFault('baseline_changed', f'transaction baseline changed: {path}',
                                artifact=path, category='execution')
    documents, allowed_sets, local_paths = [], [], []
    for sequence in active['sequences']:
        artifact_call(validate_sequence_items, state, sequence, source=sequence['id'], artifact='groups')
        document, local_entries = artifact_call(sequence_document, state, sequence,
                                               source=sequence['id'], artifact='groups')
        documents.append(document)
        local_paths.append({entry['path'] for entry in local_entries})
        allowed_sets.append([by_id[identity]['path'] for identity in sequence['items']])
        for identity in sequence['items']:
            direct = sorted(entry['path'] for entry in local_entries if entry['parent_path'] == by_id[identity]['path'])
            if sequence['frames'][identity]['completed_children'] != direct:
                raise ArtifactFault('delivered_children_changed', 'a delivered group changed direct children',
                                    sources=[sequence['id']], artifact='groups', target=identity)
        mutable = {state['document'], 'options.json', *[path for path in sequence['carry'].values() if path]}
        for path, expected in active['hashes'].items():
            if path not in mutable and digest(workspace(state, sequence) / path) != expected:
                raise ArtifactFault('read_only_input_changed', f'read-only input changed in {sequence["id"]}: {path}',
                                    sources=[sequence['id']], artifact=path, target=sequence['items'][-1])
    try:
        merged_tree = merge_json(read_json(baseline / state['document']), documents,
                                 sources=[sequence['id'] for sequence in active['sequences']])
    except ArtifactFault as exc:
        raise exc.context(artifact='groups')
    payloads = {state['document']: (json.dumps(merged_tree, ensure_ascii=False, indent=2) + '\n').encode()}
    carry = {}
    id_maps = [dict() for _ in active['sequences']]
    effect_ids = [set() for _ in active['sequences']]
    registries = set()
    for name, original in state['carry'].items():
        if not any((sequence['carry'][name] or '').endswith('.json') for sequence in active['sequences']):
            continue
        base_registry = read_json(baseline / original) if original else None
        for index, sequence in enumerate(active['sequences']):
            path = sequence['carry'][name]
            if path is None:
                continue
            value = artifact_call(read_json, workspace(state, sequence) / path, source=sequence['id'], artifact=name)
            if 'layers' in value or base_registry and 'layers' in base_registry:
                effect_ids[index].update(artifact_call(check_registry_scope, base_registry, value, allowed_sets[index], local_paths[index],
                                                      source=sequence['id'], artifact=name))
                registries.add(name)
    # SVG ids must be resolved before the corresponding JSON effect registries.
    names = sorted(state['carry'], key=lambda name: (not any(
        (sequence['carry'].get(name) or '').endswith('.svg') for sequence in active['sequences']), name))
    for name in names:
        original = state['carry'][name]
        values = [sequence['carry'][name] for sequence in active['sequences']]
        destinations = {value for value in values if value is not None}
        if not destinations:
            carry[name] = None
            continue
        if len(destinations) != 1 or original is not None and original not in destinations:
            raise ArtifactFault('output_path_conflict', f'carry output paths disagree: {name}',
                                sources=[sequence['id'] for sequence in active['sequences']], artifact=name)
        destination = next(iter(destinations))
        carry[name] = destination
        base_data = (baseline / original).read_bytes() if original else None
        participants = [(index, sequence, value) for index, (sequence, value)
                        in enumerate(zip(active['sequences'], values)) if value]
        data = [artifact_call(Path.read_bytes, workspace(state, sequence) / value,
                              source=sequence['id'], artifact=name) for _, sequence, value in participants]
        if destination.endswith('.svg'):
            for (index, sequence, _), content in zip(participants, data):
                artifact_call(check_svg_scope, base_data, content, allowed_sets[index], effect_ids[index],
                              source=sequence['id'], artifact=name)
            try:
                merged, remappings = merge_svg(base_data, data, [sequence['id'] for _, sequence, _ in participants],
                                              sources=[sequence['id'] for _, sequence, _ in participants])
            except ArtifactFault as exc:
                raise exc.context(artifact=name)
            except ValueError as exc:
                raise ArtifactFault('svg_merge_unsupported', str(exc), artifact=name, category='tool') from exc
            for (index, _, _), content, mapping in zip(participants, data, remappings):
                layer_ids = {node.get('id') for node in read_svg(content).iter('{http://www.w3.org/2000/svg}g')
                             if not node.get('data-group-path') and not node.get('data-part-path')}
                for identity in sorted(layer_ids & mapping.keys()):
                    if identity in id_maps[index] and id_maps[index][identity] != mapping[identity]:
                        raise ArtifactFault('render_layer_ambiguous', 'render layer id is ambiguous across SVG artifacts',
                                            sources=[active['sequences'][index]['id']], artifact=name, location=identity)
                    id_maps[index][identity] = mapping[identity]
        elif destination.endswith('.json'):
            parsed = [artifact_call(json.loads, value, source=sequence['id'], artifact=name)
                      for (_, sequence, _), value in zip(participants, data)]
            for (index, _, _), value in zip(participants, parsed):
                if isinstance(value, dict) and isinstance(value.get('layers'), list):
                    for layer in value['layers']:
                        if isinstance(layer, dict) and 'id' in layer:
                            layer['id'] = id_maps[index].get(layer['id'], layer['id'])
            try:
                document = merge_json(json.loads(base_data) if base_data else MISSING, parsed,
                                      sources=[sequence['id'] for _, sequence, _ in participants])
            except ArtifactFault as exc:
                raise exc.context(artifact=name)
            merged = (json.dumps(document, ensure_ascii=False, indent=2) + '\n').encode()
        else:
            changed = [value for value in data if value != base_data]
            if changed and any(value != changed[0] for value in changed):
                raise ArtifactFault('binary_conflict', f'cannot merge binary artifact: {destination}', artifact=name,
                                    sources=[sequence['id'] for _, sequence, _ in participants])
            merged = changed[0] if changed else base_data
        if destination in payloads:
            raise ArtifactFault('output_destination_conflict', 'carry artifacts share a destination', artifact=name,
                                sources=[sequence['id'] for _, sequence, _ in participants])
        payloads[destination] = merged
    merged_ids = {node.get('id') for path, data in payloads.items() if path.endswith('.svg')
                  for node in read_svg(data).iter('{http://www.w3.org/2000/svg}g')
                  if not node.get('data-group-path') and not node.get('data-part-path')}
    for name in sorted(registries):
        registry = json.loads(payloads[carry[name]])
        if any(layer['id'] not in merged_ids for layer in registry['layers']):
            sources = [sequence['id'] for sequence in active['sequences'] if sequence['carry'][name]]
            raise ArtifactFault('render_layer_missing', 'render registry layer is missing from merged SVG artifacts',
                                sources=sources, artifact=name)
    next_state = copy.deepcopy(state)
    for sequence in active['sequences']:
        for identity in sequence['items']:
            path = by_id[identity]['path']
            record = next_state['nodes'][path]
            record.update(status='done', completed_by=route(state, by_id[identity]),
                          completed_children=sequence['frames'][identity]['completed_children'])
    next_state['carry'] = carry
    next_state['active'] = None
    next_state['rejection'] = None
    reconcile(merged_tree, next_state)
    info = {'round': active['id'], 'covered_ids': [identity for sequence in active['sequences'] for identity in sequence['items']],
            'carry': {name: str(root / path) if path else None for name, path in carry.items()}}
    next_state['last_aggregate'] = info
    return (payloads, next_state), {'action': 'aggregated', **info}


def atomic_bytes(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile('wb', dir=path.parent, prefix='.' + path.name, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def artifact_path(state, checkpoint, name):
    return state['document'] if name == 'groups' else checkpoint['carry'].get(name, name)


def conflict_value(content, fault):
    """Compare the conflicting field, rather than blame every serial writer."""
    if content is None:
        return MISSING
    if fault.location.startswith('svg'):
        root = read_svg(content)
        identity = fault.svg_id
        if not identity:
            identities = re.findall(r'/id:([^/]+)', fault.location)
            identity = identities[-1] if identities else None
        node = next((node for node in root.iter() if node.get('id') == identity), None) if identity else root
        if node is None:
            return MISSING
        return signature(node)
    if fault.location.startswith('$'):
        value = json.loads(content)
        for key in fault.location.split('/')[1:]:
            if key == 'order' and isinstance(value, list):
                return [item.get('id', item.get('name')) for item in value]
            if isinstance(value, dict):
                value = value.get(key, MISSING)
            elif isinstance(value, list):
                value = next((item for item in value if isinstance(item, dict) and
                              (item.get('id') == key or item.get('name') == key)), MISSING)
            else:
                return MISSING
        return value
    return content


def contributors(state, sequence, fault):
    if fault.target:
        return [fault.target]
    before, matches = sequence['start'], []
    root = Path(state['working_dir'])
    for index, identity in enumerate(sequence['items']):
        after = sequence['frames'][identity]['snapshot']
        directory = workspace(state, sequence) if index == len(sequence['items']) - 1 else root / after['directory']
        previous = artifact_path(state, before, fault.artifact)
        current = artifact_path(state, after, fault.artifact)
        old = (root / before['directory'] / previous).read_bytes() if previous and (root / before['directory'] / previous).is_file() else None
        new = (directory / current).read_bytes() if current and (directory / current).is_file() else None
        if previous != current or conflict_value(old, fault) != conflict_value(new, fault):
            matches.append(identity)
        before = after
    return matches


def failure_report(exc, state=None):
    """Stable JSON is the interface for both a model and a program coordinator."""
    fault = exc if isinstance(exc, ArtifactFault) else None
    category = fault.category if fault else 'execution' if isinstance(exc, (ValueError, OSError)) else 'tool'
    report = {'action': 'rejected' if category == 'artifact' else 'blocked' if category == 'execution' else 'tool_error',
              'resolution': 'repair' if category == 'artifact' else 'input' if category == 'execution' else 'tool',
              'code': fault.code if fault else 'invalid_operation' if category == 'execution' else 'internal_error',
              'message': str(exc), 'artifact': fault.artifact if fault else None,
              'location': fault.location if fault else '', 'repairs': []}
    active = state.get('active') if state else None
    fingerprints = {}
    if category == 'artifact' and active and fault.sources:
        paths = {record['id']: path for path, record in state['nodes'].items()}
        for sequence in active['sequences']:
            if sequence['id'] not in fault.sources:
                continue
            affected = contributors(state, sequence, fault)
            if not affected:
                continue
            first = min(sequence['items'].index(identity) for identity in affected)
            identity = sequence['items'][first]
            frame = sequence['frames'][identity]
            actor = frame.get('producers', {}).get(fault.artifact, frame.get('actor'))
            if not actor:
                report.update(action='blocked', resolution='input', code='worker_binding_missing',
                              message='repair requires the actual producer worker binding')
                report['repairs'] = []
                break
            current_path = artifact_path(state, frame['snapshot'], fault.artifact)
            repair = {'sequence_id': sequence['id'], 'target': {'id': identity, 'path': paths[identity]},
                      **actor, 'working_dir': str(workspace(state, sequence)),
                      'file': str(workspace(state, sequence) / current_path) if current_path else None,
                      'restart': 'group', 'contributors': [], 'invalidated': []}
            for item in affected:
                source_frame = sequence['frames'][item]
                source_actor = source_frame.get('producers', {}).get(fault.artifact, source_frame.get('actor'))
                if not source_actor:
                    raise ValueError('repair contributor has no producer binding')
                repair['contributors'].append({'target': {'id': item, 'path': paths[item]}, **source_actor})
            for item in sequence['items'][first + 1:]:
                repair['invalidated'].append({'target': {'id': item, 'path': paths[item]},
                                             'workers': sequence['frames'][item].get('workers', {})})
            report['repairs'].append(repair)
        if not report['repairs'] and report['action'] == 'rejected':
            report.update(action='blocked', resolution='input', code='producer_unresolved', message='cannot determine a producing worker: ' + str(exc))
        if report['repairs']:
            root = Path(state['working_dir'])
            for sequence in active['sequences']:
                if sequence['id'] not in {repair['sequence_id'] for repair in report['repairs']}:
                    continue
                tracked = {state['document'], *active['hashes'], *[path for path in sequence['carry'].values() if path]}
                for frame in sequence['frames'].values():
                    tracked.update(frame.get('outputs', {}).values())
                    snapshot = frame.get('snapshot')
                    if snapshot:
                        for path in snapshot['files']:
                            full = root / snapshot['directory'] / path
                            fingerprints[str(full)] = digest(full)
                for path in sorted(tracked):
                    full = workspace(state, sequence) / path
                    fingerprints[str(full)] = digest(full)
            for path in sorted(active['hashes']):
                fingerprints[str(root / path)] = digest(root / path)
                fingerprints[str(root / active['baseline'] / path)] = digest(root / active['baseline'] / path)
            report['fingerprints'] = dict(sorted(fingerprints.items()))
            token = hashlib.sha256(json.dumps(report, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
            report['rejection_id'] = token
            report['retry'] = {'command': 'repair', 'rejection': token}
    if report['action'] == 'rejected' and not report['repairs']:
        report.update(action='blocked', resolution='input')
    return report


def prepare_repair(state, rejection_id):
    rejection = state.get('rejection')
    if not rejection or rejection.get('action') != 'rejected' or rejection.get('rejection_id') != rejection_id:
        raise ValueError('repair requires the current rejection_id')
    for path, expected in rejection['fingerprints'].items():
        if digest(Path(path)) != expected:
            raise ValueError('rejected artifacts changed; restore the reported files before repair: ' + path)
    root = Path(state['working_dir'])
    final = copy.deepcopy(state)
    payloads, tasks = {}, []
    cache = Path(state['active']['baseline']).parent / 'repairs' / rejection_id
    for repair in rejection['repairs']:
        sequence = next(item for item in final['active']['sequences'] if item['id'] == repair['sequence_id'])
        first = sequence['items'].index(repair['target']['id'])
        before = sequence['start'] if first == 0 else sequence['frames'][sequence['items'][first - 1]]['snapshot']
        for path, expected in before['files'].items():
            if digest(root / before['directory'] / path) != expected:
                raise ValueError('repair input checkpoint is missing or changed: ' + path)
        tracked = set(before['files']) | set(state['active']['hashes'])
        for frame in sequence['frames'].values():
            tracked.update(frame.get('outputs', {}).values())
            tracked.update(frame.get('snapshot', {}).get('files', {}))
        directory = workspace(state, sequence)
        for path in sorted(tracked):
            destination = relative(directory / path, root)
            source = root / before['directory'] / path
            payloads[destination] = source.read_bytes() if path in before['files'] else None
        sequence['index'] = first
        sequence['carry'] = copy.deepcopy(before['carry'])
        for index, identity in enumerate(sequence['items'][first:], first):
            frame = sequence['frames'].pop(identity)
            sequence.setdefault('replay_workers', {})[identity] = frame['workers']
            saved = frame['snapshot']
            rejected = {}
            for name in ['groups', *sequence['carry']]:
                path = artifact_path(state, saved, name)
                source = root / saved['directory'] / path if path else None
                # The last worker may have changed the returned file after completion.
                if index == len(sequence['items']) - 1 and path:
                    source = directory / path
                if source and source.is_file():
                    destination = cache / sequence['id'] / identity / path
                    payloads[str(destination)] = source.read_bytes()
                    rejected[name] = str(root / destination)
            context = {'role': 'repair' if index == first else 'dependent_replay',
                       'rejection_id': rejection_id, 'reason': rejection['message'],
                       'artifact': rejection['artifact'], 'location': rejection['location'],
                       'rejected_outputs': rejected}
            sequence.setdefault('repair_context', {})[identity] = context
            path = next(path for path, record in final['nodes'].items() if record['id'] == identity)
            final['nodes'][path]['status'] = 'active' if index == first else 'pending'
            tasks.append({'sequence_id': sequence['id'], 'target': {'id': identity, 'path': path},
                          'workers': frame['workers'], 'repair': context})
    final['rejection'] = None
    return (payloads, final), {'action': 'repair_ready', 'rejection_id': rejection_id, 'tasks': tasks}


def recover_publish(state, state_path):
    journal = state.get('publishing')
    if not journal:
        return
    root = Path(state['working_dir'])
    # Preflight every destination before writing any remaining file.
    for write in journal['writes']:
        if digest(root / write['path']) not in {write['before'], write['after']}:
            raise ValueError(f'publication conflict: {write["path"]}')
        if write['after'] is not None and digest(root / write['staged']) != write['after']:
            raise ValueError('staged aggregate is missing or changed')
    if journal.get('state_hash') and digest(root / journal['state']) != journal['state_hash']:
        raise ValueError('staged dispatch state is missing or changed')
    for write in journal['writes']:
        if digest(root / write['path']) != write['after']:
            if write['after'] is None:
                (root / write['path']).unlink(missing_ok=True)
            else:
                atomic_bytes(root / write['path'], (root / write['staged']).read_bytes())
    final = read_json(root / journal['state'])
    save_json(state_path, final)
    if journal.get('kind', 'aggregate') == 'aggregate':
        shutil.rmtree(root / state['active']['baseline'], ignore_errors=True)
        shutil.rmtree((root / journal['state']).parent.parent / 'snapshots', ignore_errors=True)
        shutil.rmtree((root / journal['state']).parent.parent / 'repairs', ignore_errors=True)
    shutil.rmtree((root / journal['state']).parent, ignore_errors=True)


def publish(state, merged, info, state_path, kind='aggregate'):
    payloads, final = merged
    root = Path(state['working_dir'])
    staging = Path(state['active']['baseline']).parent / ('publish' if kind == 'aggregate' else 'repair-publish')
    writes = []
    for index, (path, content) in enumerate(payloads.items()):
        path = relative(path, root)
        if root / path == state_path:
            raise ValueError('artifact output would overwrite dispatch state')
        staged = staging / f'{index}.data'
        if content is not None:
            atomic_bytes(root / staged, content)
        writes.append({'path': path, 'staged': str(staged) if content is not None else None,
                       'before': digest(root / path),
                       'after': hashlib.sha256(content).hexdigest() if content is not None else None})
    state_file = staging / 'state.json'
    save_json(root / state_file, final)
    state['publishing'] = {'kind': kind, 'writes': writes, 'state': str(state_file),
                           'state_hash': digest(root / state_file)}
    save_json(state_path, state)
    recover_publish(state, state_path)


@contextmanager
def state_lock(state_path):
    state_path.parent.mkdir(parents=True, exist_ok=True)
    with state_path.with_suffix(state_path.suffix + '.lock').open('a') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX)
        yield


def execute_command(args, file, state_path):
    if file == state_path or file.parent != state_path.parent:
        raise ValueError('tree and state must be distinct files in the same directory')
    if state_path.exists():
        saved = read_json(state_path)
        if saved.get('publishing'):
            recover_publish(saved, state_path)
    document = read_json(file)
    if args.command == 'init':
        root = args.working_dir.resolve()
        edges = dict(pair(value, 'child edge') for value in args.child_edge)
        if len(edges) != len(args.child_edge):
            raise ValueError('child edge keys must be unique')
        routes = {kind: [] for kind in args.dispatch_type}
        for value in args.route_name:
            kind, name = pair(value, 'route name')
            if kind not in routes:
                raise ValueError('route type is not declared')
            routes[kind].append(name)
        tree = {'root_key': args.root_key, 'child_edges': edges,
                'terminal_types': args.terminal_type, 'dispatch_types': args.dispatch_type}
        validate_spec(tree, routes)
        fresh = make_state(tree, routes, root, relative(file, root),
                           parse_values(args.carry), parse_values(args.binding))
        if relative(state_path, root) in fresh['carry'].values():
            raise ValueError('carry artifact must not overwrite dispatch state')
        if state_path.exists():
            state = read_json(state_path)
            if state.get('version') in {4, 5}:
                if state.get('active') is not None or state.get('publishing'):
                    raise ValueError('active old state needs its original cursor to finish before migration; existing work was preserved')
                if state.get('tree') != tree or state.get('routes') != routes:
                    raise ValueError('saved state uses another tree or routes')
                if state.get('version') == 5:
                    for key in ('working_dir', 'document', 'bindings'):
                        if state.get(key) != fresh[key]:
                            raise ValueError('saved state uses different dispatch bindings')
                    if set(state.get('carry', {})) != set(fresh['carry']):
                        raise ValueError('saved state uses different carry names')
                    fresh.update(carry=state['carry'], next_round=state['next_round'], last_aggregate=state['last_aggregate'])
                fresh.update(nodes=state['nodes'], next_id=state['next_id'])
                state, action = fresh, 'migrated'
            else:
                if any(state.get(key) != fresh[key] for key in ('tree', 'routes', 'working_dir', 'document', 'bindings')):
                    raise ValueError('saved state uses different dispatch bindings')
                if set(state.get('carry', {})) != set(fresh['carry']):
                    raise ValueError('saved state uses different carry names')
                action = 'already_initialized'
        else:
            state, action = fresh, 'initialized'
        entries, by_id = reconcile(document, state)
        info = {'action': action, 'groups': len(by_id)}
    else:
        state = read_json(state_path)
        if relative(file, Path(state['working_dir'])) != state['document']:
            raise ValueError('use the main document with this state')
        entries, by_id = reconcile(document, state)
        if state.get('rejection') and args.command in {'expand', 'checkpoint', 'complete'}:
            raise ValueError('apply repair with the current rejection_id before executing rejected work')
        if args.command == 'next':
            info = select_next(document, state, entries, by_id, state_path)
        elif args.command == 'expand':
            actor = bind_worker(state, args.parent, args.node, args.worker, args.worker_id)
            info = expand(state, args.parent, read_json(args.patch))
            sequence, identity, _ = current_item(state, args.parent)
            if info['added']:
                claim_outputs(state, sequence, identity, actor, ['groups'])
        elif args.command == 'checkpoint':
            actor = bind_worker(state, args.target, args.pointer, args.worker, args.worker_id)
            sequence, identity, _ = current_item(state, args.target)
            outputs = record_outputs(state, sequence, identity, read_json(args.outputs) if args.outputs else {})
            claim_outputs(state, sequence, identity, actor, outputs)
            sequence['frames'][identity]['pointer'] = args.pointer
            sequence['frames'][identity].setdefault('nodes', {})[args.pointer] = outputs
            info = {'action': 'checkpointed', 'target': identity, 'pointer': args.pointer}
        elif args.command == 'complete':
            actor = bind_worker(state, args.target, args.node, args.worker, args.worker_id)
            sequence, identity, _ = current_item(state, args.target)
            outputs = read_json(args.outputs) if args.outputs else {}
            frame = sequence['frames'][identity]
            names = [name for name, path in sequence['carry'].items() if path and name not in frame.get('producers', {})]
            claim_outputs(state, sequence, identity, actor, [*names, *outputs])
            info = finish_group(state, args.target, outputs)
        elif args.command == 'aggregate':
            if state.get('rejection'):
                for path, expected in state['rejection']['fingerprints'].items():
                    if digest(Path(path)) != expected:
                        raise ValueError('rejected artifacts changed; apply repair before worker edits: ' + path)
            merged, info = merge_round(state, entries, by_id)
            if merged:
                publish(state, merged, info, state_path)
                return info
        elif args.command == 'repair':
            merged, info = prepare_repair(state, args.rejection)
            publish(state, merged, info, state_path, kind='repair')
            return info
        elif args.command == 'reopen':
            if state['active'] is not None:
                raise ValueError('reopen requires no active round')
            target_id = state['nodes'].get(args.target, {}).get('id', args.target)
            entry = by_id.get(target_id)
            if entry is None or entry['status'] != 'done':
                raise ValueError('reopen requires a completed dispatched node')
            record = state['nodes'][entry['path']]
            record['status'] = 'pending'
            record.pop('completed_by', None)
            record.pop('completed_children', None)
            info = {'action': 'reopened', 'target': public(entry)}
    save_json(state_path, state)
    return info


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file', required=True, type=Path)
    parser.add_argument('--state', required=True, type=Path)
    commands = parser.add_subparsers(dest='command', required=True)
    init = commands.add_parser('init')
    init.add_argument('--working-dir', type=Path, required=True)
    init.add_argument('--root-key', required=True)
    init.add_argument('--child-edge', action='append', required=True)
    init.add_argument('--terminal-type', action='append', default=[])
    init.add_argument('--dispatch-type', action='append', required=True)
    init.add_argument('--route-name', action='append', default=[])
    init.add_argument('--carry', action='append', default=[])
    init.add_argument('--binding', action='append', default=[])
    commands.add_parser('next')
    growth = commands.add_parser('expand')
    growth.add_argument('--parent', required=True)
    growth.add_argument('--patch', required=True, type=Path)
    checkpoint = commands.add_parser('checkpoint')
    checkpoint.add_argument('--target', required=True)
    checkpoint.add_argument('--pointer', required=True)
    checkpoint.add_argument('--outputs', type=Path)
    complete = commands.add_parser('complete')
    complete.add_argument('--target', required=True)
    complete.add_argument('--outputs', type=Path)
    for command in (growth, checkpoint, complete):
        command.add_argument('--worker', required=True, help='actual worker identity selected from the node YAML')
        command.add_argument('--worker-id', help='actual runtime worker/session id, if available')
        if command is not checkpoint:
            command.add_argument('--node', required=True, help='actual producing workflow node id')
    commands.add_parser('aggregate')
    repair = commands.add_parser('repair', help='restore rejected groups to their inputs and replay serial dependents')
    repair.add_argument('--rejection', required=True, help='rejection_id returned by aggregate')
    reopen = commands.add_parser('reopen')
    reopen.add_argument('--target', required=True)
    args = parser.parse_args()
    state_path, file = args.state.resolve(), args.file.resolve()
    exit_code = 0
    try:
        with state_lock(state_path):
            try:
                info = execute_command(args, file, state_path)
            except Exception as exc:
                saved = None
                try:
                    saved = read_json(state_path) if state_path.is_file() else None
                    info = failure_report(exc, saved)
                    if args.command == 'aggregate' and saved and not saved.get('publishing') and info['action'] == 'rejected':
                        saved['rejection'] = info
                        save_json(state_path, saved)
                except Exception as reporting_error:
                    info = {'action': 'tool_error', 'code': 'failure_reporting_error',
                            'message': str(exc) + '; report failed: ' + str(reporting_error), 'repairs': []}
                if info['action'] == 'rejected' and not info['repairs']:
                    info['action'] = 'blocked'
                exit_code = {'rejected': 3, 'blocked': 4, 'tool_error': 5}[info['action']]
                print(info['message'], file=sys.stderr)
            print(json.dumps(info, ensure_ascii=False))
    except Exception as exc:
        info = failure_report(exc)
        if info['action'] == 'rejected':
            info.update(action='blocked', resolution='input')
        exit_code = 5 if info['action'] == 'tool_error' else 4
        print(info['message'], file=sys.stderr)
        print(json.dumps(info, ensure_ascii=False))
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
