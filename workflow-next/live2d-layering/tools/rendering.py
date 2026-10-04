"""Register independent render layers and bind their receiver masks after painting.

Relationships live in rendering.json; source geometry stays in character.svg.
Checks cover names, references and mask structure, not artistic correctness.
"""
import argparse
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import xml.etree.ElementTree as ET

from groups import NAME, validate_header, validate_mirror_pairs
from svg_preview import (SVG_NS, LOCAL_URL, PAINT, RESOURCES, component, isolate,
                         local_tag, read_svg, validate_svg_resources)
from svg_containment import alpha_image

TAG = lambda name: '{%s}%s' % (SVG_NS, name)
MANAGED = 'data-rendering-managed'
IDENTITY = (1., 0., 0., 1., 0., 0.)


def tree_index(document):
    validate_header(document)
    index = {}

    def visit(groups, parts, prefix=''):
        if not isinstance(groups, list) or not isinstance(parts, list):
            raise ValueError('groups and parts must be arrays')
        names = set()
        for kind, nodes in (('group', groups), ('part', parts)):
            for node in nodes:
                required = {'name', 'groups'} if kind == 'group' else {'name'}
                allowed = required | {'note'} | ({'parts'} if kind == 'group' else set())
                if not isinstance(node, dict) or not required <= set(node) or set(node) - allowed:
                    raise ValueError('Invalid %s node' % kind)
                name = node['name']
                if not isinstance(name, str) or not NAME.fullmatch(name) or name in names:
                    raise ValueError('Invalid or duplicate sibling name: %r' % name)
                names.add(name)
                path = prefix + '/' + name if prefix else name
                index[path] = kind
                if kind == 'group':
                    visit(node['groups'], node.get('parts', []), path)
    visit(document['groups'], [])
    validate_mirror_pairs(document, index)
    return index


def validate(document, index):
    if not isinstance(document, dict) or set(document) != {'layers'} or not isinstance(document['layers'], list):
        raise ValueError('rendering.json requires a layers array')
    seen = set()
    for layer in document['layers']:
        required = {'id', 'type', 'owner', 'follow', 'clip_to'}
        if not isinstance(layer, dict) or not required <= set(layer) or set(layer) - required - {'note'}:
            raise ValueError('Each layer requires id, type, owner, follow, clip_to; note is optional')
        for field in ('id', 'type'):
            if not isinstance(layer[field], str) or not NAME.fullmatch(layer[field]):
                raise ValueError('Invalid layer %s: %r' % (field, layer[field]))
        if layer['id'] in seen:
            raise ValueError('Duplicate layer id: ' + layer['id'])
        seen.add(layer['id'])
        if not isinstance(layer['clip_to'], list) or len(set(layer['clip_to'])) != len(layer['clip_to']):
            raise ValueError('clip_to must be an array of unique paths')
        paths = [layer['owner']] + layer['clip_to']
        if layer['follow'] is not None:
            paths.append(layer['follow'])
        for path in paths:
            if not isinstance(path, str) or path not in index:
                raise ValueError('%s: unknown structure path %r' % (layer['id'], path))
        if 'note' in layer and (not isinstance(layer['note'], str) or not layer['note'].strip()):
            raise ValueError('note must be a nonempty string')
    return document


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def atomic_write(path, content):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    name = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
            name = stream.name
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)


def write_json(path, data):
    atomic_write(path, (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


def merge(groups, existing, patch, out, scope=None):
    index = tree_index(load(groups))
    current = validate(load(existing), index) if existing else {'layers': []}
    addition = validate(load(patch), index)
    if scope is not None and index.get(scope) != 'group':
        raise ValueError('scope must be an existing group path')
    merged = {layer['id']: layer for layer in current['layers']}
    for layer in addition['layers']:
        if scope:
            for owner in (layer['owner'], merged.get(layer['id'], layer)['owner']):
                if owner != scope and not owner.startswith(scope + '/'):
                    raise ValueError('Layer belongs to another group: ' + layer['id'])
        merged[layer['id']] = layer
    if Path(out).resolve() in {Path(groups).resolve(), Path(patch).resolve()}:
        raise ValueError('Output would overwrite an input tree or patch')
    result = {'layers': list(merged.values())}
    write_json(out, result)
    return result


def multiply(a, b):
    return (a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
            a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
            a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5])


def inverse(a):
    det = a[0]*a[3]-a[1]*a[2]
    if abs(det) < 1e-12:
        raise ValueError('Cannot bind a mask under a singular transform')
    return (a[3]/det, -a[1]/det, -a[2]/det, a[0]/det,
            (a[2]*a[5]-a[3]*a[4])/det, (a[1]*a[4]-a[0]*a[5])/det)


def transform(value):
    matrix = IDENTITY
    remainder = re.sub(r'([a-zA-Z]+)\s*\(([^)]*)\)', '', value).strip(' ,\t\n')
    if remainder:
        raise ValueError('Unsupported SVG transform: ' + value)
    for name, args in re.findall(r'([a-zA-Z]+)\s*\(([^)]*)\)', value):
        values = [float(n) for n in re.findall(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?', args)]
        if not all(math.isfinite(v) for v in values):
            raise ValueError('Invalid transform')
        if name == 'matrix' and len(values) == 6:
            step = tuple(values)
        elif name == 'translate' and len(values) in (1, 2):
            step = (1, 0, 0, 1, values[0], values[1] if len(values) == 2 else 0)
        elif name == 'scale' and len(values) in (1, 2):
            step = (values[0], 0, 0, values[-1], 0, 0)
        elif name == 'rotate' and len(values) in (1, 3):
            rad = math.radians(values[0]); c, s = math.cos(rad), math.sin(rad)
            step = (c, s, -s, c, 0, 0)
            if len(values) == 3:
                x, y = values[1:]
                step = multiply(multiply((1, 0, 0, 1, x, y), step), (1, 0, 0, 1, -x, -y))
        elif name in ('skewX', 'skewY') and len(values) == 1:
            t = math.tan(math.radians(values[0]))
            step = (1, 0, t, 1, 0, 0) if name == 'skewX' else (1, t, 0, 1, 0, 0)
        else:
            raise ValueError('Unsupported SVG transform: ' + name)
        matrix = multiply(matrix, step)
    return matrix


def matrix_text(matrix):
    return 'matrix(' + ' '.join('%.12g' % n for n in matrix) + ')'


def clean_managed(root):
    for parent in list(root.iter()):
        for node in list(parent):
            if node.get(MANAGED) == 'wrapper':
                offset = list(parent).index(node)
                parent.remove(node)
                for child in list(node):
                    parent.insert(offset, child); offset += 1
            elif node.get(MANAGED) == 'resources':
                parent.remove(node)


def outside_resources(root):
    def visit(node):
        if local_tag(node) in RESOURCES:
            return
        yield node
        for child in node:
            yield from visit(child)
    return list(visit(root))


def layer_nodes(root, document):
    result = {}
    for layer in document['layers']:
        node = component(root, layer['id'])
        if local_tag(node) != 'g' or node.get('data-part-path') or node.get('data-group-path'):
            raise ValueError('Render layer must be a separate unbound <g>: ' + layer['id'])
        if any(n.get('data-part-path') or n.get('data-group-path') for n in node.iter()):
            raise ValueError('A render layer cannot contain physical tree bindings: ' + layer['id'])
        if not any(local_tag(n) in PAINT for n in node.iter()):
            raise ValueError('Render layer has no drawing elements: ' + layer['id'])
        result[layer['id']] = node
    for first in result.values():
        if any(child is not first and child in result.values() for child in first.iter()):
            raise ValueError('Independent render layers cannot contain each other')
    return result


def receiver_ids(root, paths, index):
    wanted = set()
    for path in paths:
        if index[path] == 'part':
            wanted.add(path)
        else:
            wanted.update(p for p, kind in index.items() if kind == 'part' and p.startswith(path + '/'))
            if not any(p.startswith(path + '/') for p in wanted):
                raise ValueError('Receiver group has no painted parts: ' + path)
    nodes = outside_resources(root)
    found = {path: [n.get('id') for n in nodes if n.get('data-part-path') == path] for path in wanted}
    missing = [path for path, ids in found.items() if not ids or not all(ids)]
    if missing:
        raise ValueError('Missing receiver part containers: ' + ', '.join(sorted(missing)))
    return [identity for path in sorted(found) for identity in found[path]]


def namespace(root, prefix):
    ids = {n.get('id'): prefix + n.get('id') for n in root.iter() if n.get('id')}
    for node in root.iter():
        for key, value in list(node.attrib.items()):
            if key == 'id':
                node.set(key, ids[value])
            elif key.rsplit('}', 1)[-1] == 'href' and value.startswith('#'):
                node.set(key, '#' + ids[value[1:]])
            else:
                node.set(key, LOCAL_URL.sub(lambda m: 'url(#' + ids[m.group(1)] + ')', value))
        if local_tag(node) == 'style':
            content = LOCAL_URL.sub(lambda m: 'url(#' + ids[m.group(1)] + ')', node.text or '')
            for old, new in sorted(ids.items(), key=lambda pair: -len(pair[0])):
                content = re.sub(r'#' + re.escape(old) + r'(?![\w-])', '#' + new, content)
            # Scope selectors to this copied SVG; its CSS must not hide source artwork.
            if '@' in content:
                raise ValueError('Receiver stylesheet at-rules require conversion to inline styles')
            node.text = re.sub(r'([^{}]+)\{', lambda m: ','.join('#' + prefix + 'root ' + s.strip()
                                                                  for s in m.group(1).split(',')) + '{', content)
        node.attrib.pop('data-part-path', None)
        node.attrib.pop('data-group-path', None)
    root.set('id', prefix + 'root')


def apply(groups, registry, svg, out):
    if Path(out).resolve() in {Path(groups).resolve(), Path(registry).resolve(), Path(svg).resolve()}:
        raise ValueError('Apply writes a separate candidate SVG; inputs stay read-only')
    index = tree_index(load(groups)); document = validate(load(registry), index)
    root, size = read_svg(svg)
    clean_managed(root)
    layers = layer_nodes(root, document)
    source = copy.deepcopy(root)
    source_parents = {child: parent for parent in source.iter() for child in parent}
    for layer in document['layers']:
        node = component(source, layer['id']); source_parents[node].remove(node)
    defs = ET.Element(TAG('defs'), {MANAGED: 'resources'})
    root.insert(0, defs)
    existing = {n.get('id') for n in root.iter() if n.get('id')}
    stem = 'render_binding_'
    while any(i.startswith(stem) for i in existing):
        stem += '_'
    masks = {}
    for layer in document['layers']:
        if not layer['clip_to']:
            continue
        key = tuple(sorted(layer['clip_to']))
        if key not in masks:
            receiver = copy.deepcopy(source)
            # The outer artwork already applies its root transform to the mask.
            receiver.attrib.pop('transform', None)
            identities = receiver_ids(receiver, key, index)
            isolate(receiver, identities)
            # Remove only paint hidden by isolation; resources remain available.
            for parent in list(receiver.iter()):
                if local_tag(parent) in RESOURCES:
                    continue
                for child in list(parent):
                    if local_tag(child) in PAINT and 'display:none!important' in child.get('style', ''):
                        parent.remove(child)
            if alpha_image(receiver, size).getbbox() is None:
                raise ValueError('Receiver is empty: ' + ', '.join(key))
            resource_id = stem + hashlib.sha256('\0'.join(key).encode()).hexdigest()[:12]
            namespace(receiver, resource_id + '_')
            view = root.get('viewBox', '0 0 %s %s' % size)
            bounds = [float(v) for v in re.split(r'[\s,]+', view)]
            receiver.set('x', str(bounds[0])); receiver.set('y', str(bounds[1]))
            receiver.set('width', str(bounds[2])); receiver.set('height', str(bounds[3]))
            # Same viewBox/preserveAspectRatio as the artwork, in root user coordinates.
            holder = ET.SubElement(defs, TAG('g'), {'id': resource_id})
            holder.append(receiver)
            masks[key] = resource_id
        node = layers[layer['id']]
        if re.search(r'\btransform\s*:', root.get('style', '')):
            raise ValueError('Use an SVG transform attribute on the artwork root')
        parents = {child: parent for parent in root.iter() for child in parent}
        parent = parents[node]
        chain = []; ancestor = parent
        while ancestor is not root:
            if local_tag(ancestor) == 'svg':
                raise ValueError('Render layers in nested SVG viewports require moving to an ordinary group')
            if re.search(r'\btransform\s*:', ancestor.get('style', '')):
                raise ValueError('Use SVG transform attributes on render-layer ancestors')
            chain.append(ancestor); ancestor = parents[ancestor]
        matrix = IDENTITY
        for ancestor in reversed(chain):
            matrix = multiply(matrix, transform(ancestor.get('transform', '')))
        inv = inverse(matrix)
        x, y, w, h = [float(v) for v in re.split(r'[\s,]+', root.get('viewBox', '0 0 %s %s' % size))]
        corners = [(inv[0]*px+inv[2]*py+inv[4], inv[1]*px+inv[3]*py+inv[5])
                   for px, py in ((x,y), (x+w,y), (x,y+h), (x+w,y+h))]
        left = min(p[0] for p in corners); top = min(p[1] for p in corners)
        mask_id = stem + layer['id']
        mask = ET.SubElement(defs, TAG('mask'), {
            'id': mask_id, 'maskUnits': 'userSpaceOnUse', 'maskContentUnits': 'userSpaceOnUse',
            'mask-type': 'alpha', 'style': 'mask-type:alpha', 'x': str(left), 'y': str(top),
            'width': str(max(p[0] for p in corners)-left),
            'height': str(max(p[1] for p in corners)-top)})
        ET.SubElement(mask, TAG('use'), {'href': '#' + masks[key], 'transform': matrix_text(inv)})
        wrapper = ET.Element(TAG('g'), {MANAGED: 'wrapper', 'data-rendering-layer': layer['id'],
                                       'data-rendering-receivers': json.dumps(key),
                                       'mask': 'url(#%s)' % mask_id})
        offset = list(parent).index(node); parent.remove(node); parent.insert(offset, wrapper)
        wrapper.append(node)
    validate_svg_resources(root)
    atomic_write(out, ET.tostring(root, encoding='utf-8', xml_declaration=True))
    return {'layers': len(layers), 'masked': sum(bool(l['clip_to']) for l in document['layers'])}


def check(groups, registry, svg, complete=False):
    index = tree_index(load(groups)); document = validate(load(registry), index)
    root, _ = read_svg(svg); layers = layer_nodes(root, document)
    parents = {child: parent for parent in root.iter() for child in parent}
    for layer in document['layers']:
        if complete and layer['clip_to']:
            receiver_ids(root, layer['clip_to'], index)
            wrapper = parents[layers[layer['id']]]
            if wrapper.get(MANAGED) != 'wrapper' or wrapper.get('data-rendering-layer') != layer['id']:
                raise ValueError('Missing receiver mask: ' + layer['id'])
            if wrapper.get('data-rendering-receivers') != json.dumps(tuple(sorted(layer['clip_to']))):
                raise ValueError('Receiver paths changed; reapply masks: ' + layer['id'])
            masks = {n.get('id'): n for n in root.iter() if local_tag(n) == 'mask'}
            refs = LOCAL_URL.findall(wrapper.get('mask', ''))
            if len(refs) != 1 or refs[0] not in masks or masks[refs[0]].get('mask-type') != 'alpha':
                raise ValueError('Invalid receiver mask: ' + layer['id'])
    return {'status': 'pass', 'layers': len(layers), 'complete': complete,
            'scope': 'Names, tree paths, SVG references and receiver mask structure only'}


def extract(svg, identity, out, raw=False):
    if Path(svg).resolve() == Path(out).resolve():
        raise ValueError('Extraction must not overwrite the artwork')
    root, _ = read_svg(svg)
    if raw:
        clean_managed(root)
    isolate(root, identity)
    atomic_write(out, ET.tostring(root, encoding='utf-8', xml_declaration=True))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    init = commands.add_parser('init'); init.add_argument('--out', type=Path, required=True)
    update = commands.add_parser('merge')
    update.add_argument('--patch', type=Path, required=True)
    update.add_argument('--scope')
    update.add_argument('--rendering', type=Path)
    update.add_argument('--groups', type=Path, required=True)
    update.add_argument('--out', type=Path, required=True)
    for command in ('apply', 'check'):
        sub = commands.add_parser(command)
        sub.add_argument('--groups', type=Path, required=True)
        sub.add_argument('--rendering', type=Path, required=True)
        sub.add_argument('--svg', type=Path, required=True)
        if command == 'apply':
            sub.add_argument('--out', type=Path, required=True)
        else:
            sub.add_argument('--complete', action='store_true')
    export = commands.add_parser('extract')
    export.add_argument('--svg', type=Path, required=True)
    export.add_argument('--layer', required=True)
    export.add_argument('--out', type=Path, required=True)
    export.add_argument('--raw', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.command == 'init':
            if args.out.exists():
                raise ValueError('Registry already exists; use merge to preserve it')
            write_json(args.out, {'layers': []}); result = {'layers': 0}
        elif args.command == 'merge':
            result = merge(args.groups, args.rendering, args.patch, args.out, args.scope)
            result = {'layers': len(result['layers'])}
        elif args.command == 'apply':
            result = apply(args.groups, args.rendering, args.svg, args.out)
        elif args.command == 'check':
            result = check(args.groups, args.rendering, args.svg, args.complete)
        else:
            extract(args.svg, args.layer, args.out, args.raw); result = {'out': str(args.out)}
    except (OSError, ValueError, TypeError, KeyError) as exc:
        print(exc, file=sys.stderr); return 2
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
