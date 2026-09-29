"""Apply inherited global display levels without changing SVG shape geometry."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from svg_preview import local_tag, node_runtime, read_svg, validate_svg_resources


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def resolve(path):
    result = subprocess.run([node_runtime(), str(Path(__file__).with_name('display-model.cjs')), str(path)],
                            capture_output=True, text=True)
    if result.returncode:
        raise ValueError(result.stderr.strip())
    return json.loads(result.stdout)


def semantic_only(value):
    if isinstance(value, dict):
        return {k: semantic_only(v) for k, v in value.items() if k not in ('display_order', 'display_notes')}
    if isinstance(value, list):
        return [semantic_only(item) for item in value]
    return value


def drawing_groups(root, entries):
    by_path = {entry['path']: entry for entry in entries}
    result, seen = [], set()
    for node in root:
        if local_tag(node) in ('defs', 'metadata', 'title', 'desc'):
            continue
        part = node.get('data-part-path')
        path = part or node.get('data-group-path')
        entry = by_path.get(path)
        if (local_tag(node) != 'g' or not node.get('id') or entry is None or not entry['leaf']
                or entry['kind'] != ('part' if part else 'group')):
            raise ValueError('SVG drawing group does not match leaf group/part: ' + str(path))
        if part and node.get('data-group-path') != entry['parent']:
            raise ValueError('part ownership mismatch: ' + path)
        if any(n.get('data-group-path') or n.get('data-part-path') for n in node.iter() if n is not node):
            raise ValueError('nested drawing units must be arranged explicitly, not silently flattened')
        seen.add(path)
        result.append((node, entry))
    missing = {entry['path'] for entry in entries if entry['leaf']} - seen
    if missing:
        raise ValueError('missing drawing units: ' + ', '.join(sorted(missing)))
    return result


def synchronize(root, document, entries, apply=False):
    units = drawing_groups(root, entries)
    ordered = sorted(units, key=lambda pair: pair[1]['effective'])
    if not apply and units != ordered:
        raise ValueError('actual SVG order differs from resolved global display levels')
    for node, entry in ordered:
        expected = {'data-display-order': str(entry['effective']),
                    'data-display-source': entry['source'] or ''}
        if entry['explicit'] is not None:
            expected['data-display-explicit'] = str(entry['explicit'])
        for key in ('data-display-order', 'data-display-source', 'data-display-explicit'):
            if apply:
                node.attrib.pop(key, None)
                if key in expected:
                    node.set(key, expected[key])
            else:
                actual, wanted = node.get(key), expected.get(key)
                equal = actual == wanted
                if key != 'data-display-source' and actual is not None and wanted is not None:
                    try:
                        equal = float(actual) == float(wanted)
                    except ValueError:
                        pass
                if not equal:
                    raise ValueError('SVG display parameter mismatch: ' + node.get('id') + '/' + key)
        if apply:
            root.remove(node)
            root.append(node)
    metadata = [n for n in root if local_tag(n) == 'metadata' and n.get('id') == 'group-structure']
    if len(metadata) > 1:
        raise ValueError('duplicate group-structure metadata')
    if apply:
        if not metadata:
            metadata = [ET.Element('{http://www.w3.org/2000/svg}metadata', {'id': 'group-structure'})]
            root.insert(0, metadata[0])
        metadata[0].text = json.dumps(document, ensure_ascii=False)
    elif not metadata or json.loads(metadata[0].text or '{}') != document:
        raise ValueError('SVG embedded grouping/display configuration differs from JSON')
    validate_svg_resources(root)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('validate', 'apply', 'check'))
    parser.add_argument('--groups', required=True, type=Path)
    parser.add_argument('--semantic', type=Path)
    parser.add_argument('--svg', type=Path)
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    try:
        document = read_json(args.groups)
        entries = resolve(args.groups)
        if args.semantic and semantic_only(document) != read_json(args.semantic):
            raise ValueError('display judgment changed semantic structure')
        if args.command != 'validate':
            if not args.svg:
                parser.error('apply/check require --svg')
            root, _ = read_svg(args.svg)
            synchronize(root, document, entries, apply=args.command == 'apply')
        if args.command == 'apply':
            if not args.out:
                parser.error('apply requires --out')
            args.out.parent.mkdir(parents=True, exist_ok=True)
            ET.ElementTree(root).write(args.out, encoding='utf-8', xml_declaration=True)
        else:
            print(json.dumps({'status': 'pass', 'scope': 'display contract only', 'nodes': entries}, ensure_ascii=False))
    except (ValueError, KeyError, TypeError, OSError, ET.ParseError) as exc:
        parser.exit(1, str(exc) + '\n')


if __name__ == '__main__':
    main()
