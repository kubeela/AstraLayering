"""Validate drawing handoffs or render path keyforms into a temporary pose SVG.

Uses the existing expression schema definitions; never changes the input SVG.
This drawing handoff is not a runtime rig or proof of animation completeness.
"""
import argparse
from copy import deepcopy
import itertools
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_contract import SCHEMA, check, finite, path_data, semantic_rig
from jsonschema import Draft202012Validator

FIELDS = {'schema_version', 'character_id', 'parameters', 'bindings', 'anchors', 'components'}
COMPONENT_FIELDS = {'id', 'owner_node', 'svg_ids', 'parameter_ids', 'role', 'motion', 'style_notes'}
OWNER_IDS = {'expression_eyes', 'expression_mouth', 'expression_face_effects', 'expression_symbols'}
IDENTITY = re.compile(r'^[a-z][a-z0-9_.-]*$')
SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def validate_materials(data, svg_path):
    finite(data)
    check(isinstance(data, dict) and set(data) == FIELDS, 'materials fields: ' + ', '.join(sorted(FIELDS)))
    check(data['schema_version'] == '0.1.0', 'unsupported materials version')
    check(isinstance(data['character_id'], str) and IDENTITY.fullmatch(data['character_id']), 'invalid character_id')
    for field, definition in [('parameters', 'parameter'), ('bindings', 'binding'), ('anchors', 'anchor')]:
        check(isinstance(data[field], dict), field + ' must be an object')
        validator = Draft202012Validator({'$ref': '#/$defs/' + definition, '$defs': SCHEMA['$defs']})
        for identity, value in data[field].items():
            check(IDENTITY.fullmatch(identity), 'invalid id: ' + identity)
            validator.validate(value)
            if field == 'bindings':
                check(value['type'] == 'path_morph', 'materials bindings contain path_morph only; runtime maps belong in rig')
    # Reuse the actual geometry/reference validator without manufacturing clocks
    # or claiming that a partial drawing handoff passes the complete rig schema.
    semantic_input = {**data, 'attachments': {}, 'animations': {}, 'expressions': {}, 'constraints': []}
    semantic_rig(semantic_input, svg_path)
    svg_ids = {node.get('id') for node in ET.parse(svg_path).iter() if node.get('id')}
    component_ids, owned_svg_ids, owned_parameters = set(), set(), set()
    check(isinstance(data['components'], list), 'components must be a list')
    for component in data['components']:
        check(isinstance(component, dict) and set(component) == COMPONENT_FIELDS, 'invalid component fields')
        identity = component['id']
        check(isinstance(identity, str) and IDENTITY.fullmatch(identity), 'invalid component id')
        check(identity not in component_ids, 'duplicate component: ' + identity)
        component_ids.add(identity)
        check(component['owner_node'] in OWNER_IDS, 'unknown component owner: ' + identity)
        for key in ['role', 'motion', 'style_notes']:
            check(isinstance(component[key], str) and component[key].strip(), 'missing ' + key + ': ' + identity)
        for key, allowed in [('svg_ids', svg_ids), ('parameter_ids', set(data['parameters']))]:
            values = component[key]
            check(isinstance(values, list) and all(isinstance(v, str) for v in values), key + ' must be string ids')
            check(len(values) == len(set(values)), 'duplicate ' + key + ': ' + identity)
            check(all(v in allowed for v in values), 'missing ' + key + ': ' + identity)
        check(component['svg_ids'], 'component requires real SVG nodes: ' + identity)
        for svg_id in component['svg_ids']:
            check(svg_id not in owned_svg_ids, 'duplicate SVG ownership: ' + svg_id)
            owned_svg_ids.add(svg_id)
        owned_parameters.update(component['parameter_ids'])
    check(all(b['svg_id'] in owned_svg_ids for b in data['bindings'].values()), 'morph target has no component owner')
    check(set(data['parameters']) <= owned_parameters, 'parameter has no component responsibility')
    return data


def interpolate(binding, values):
    levels = [sorted({key['at'][axis] for key in binding['keys']}) for axis in range(len(binding['parameters']))]
    intervals = []
    for parameter, xs in zip(binding['parameters'], levels):
        value = values[parameter]
        index = next((i for i in range(len(xs)-1) if xs[i] <= value <= xs[i+1]), None)
        check(index is not None, 'pose out of grid: ' + parameter)
        intervals.append((xs[index], xs[index+1], (value-xs[index]) / (xs[index+1]-xs[index])))
    paths = {tuple(k['at']): path_data(k['d']) for k in binding['keys']}
    shape = deepcopy(next(iter(paths.values())))
    numbers = [[0.0 for _ in coords] for _, coords in shape]
    for corner in itertools.product([0, 1], repeat=len(intervals)):
        at, weight = [], 1
        for bit, (low, high, amount) in zip(corner, intervals):
            at.append(high if bit else low)
            weight *= amount if bit else 1-amount
        for index, (_, coords) in enumerate(paths[tuple(at)]):
            for col, value in enumerate(coords):
                numbers[index][col] += value * weight
    return ' '.join(command + (' ' + ' '.join(format(n, '.12g') for n in numbers[i]) if numbers[i] else '')
                    for i, (command, _) in enumerate(shape))


def pose(svg_path, data, values, output, show=(), hide=()):
    validate_materials(data, svg_path)
    finite(values)
    check(isinstance(values, dict), 'pose values must be an object')
    resolved = {key: p['default'] for key, p in data['parameters'].items()}
    for key, value in values.items():
        check(key in data['parameters'], 'unknown pose parameter: ' + key)
        p = data['parameters'][key]
        check(p['type'] == 'number' and type(value) in (int, float) and p['min'] <= value <= p['max'], 'invalid pose value: ' + key)
        resolved[key] = value
    source, destination = Path(svg_path).resolve(), Path(output).resolve()
    check(source != destination, 'pose output must not overwrite source SVG')
    tree = ET.parse(source)
    nodes = {n.get('id'): n for n in tree.iter() if n.get('id')}
    for binding in data['bindings'].values():
        nodes[binding['svg_id']].set('d', interpolate(binding, resolved))
    for ids, visible in [(show, True), (hide, False)]:
        for identity in ids:
            check(identity in nodes, 'unknown visibility id: ' + identity)
            node = nodes[identity]
            css = ';display:inline!important;visibility:visible!important;opacity:1!important' if visible else ';display:none!important'
            node.set('style', node.get('style', '') + css)
    destination.parent.mkdir(parents=True, exist_ok=True)
    tree.write(destination, encoding='utf-8', xml_declaration=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['check', 'pose'])
    parser.add_argument('--svg', type=Path, required=True)
    parser.add_argument('--materials', type=Path, required=True)
    parser.add_argument('--values', type=Path, help='JSON object of numeric parameter values for a preview pose')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--show', action='append', default=[])
    parser.add_argument('--hide', action='append', default=[])
    args = parser.parse_args()
    data = validate_materials(read_json(args.materials), args.svg)
    if args.action == 'pose':
        check(args.values and args.output, 'pose requires --values and --output')
        check(args.output.resolve() not in {args.materials.resolve(), args.values.resolve()}, 'pose output must not overwrite input data')
        pose(args.svg, data, read_json(args.values), args.output, args.show, args.hide)
    print('PASS: drawing keyform data and SVG references; not style or animation acceptance')


if __name__ == '__main__':
    main()
