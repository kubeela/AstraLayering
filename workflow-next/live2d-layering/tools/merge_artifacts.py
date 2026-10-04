"""Deterministic three-way merges of JSON documents and SVGs.

Callers supply a common baseline and ordered results. Conflicts are errors;
this module does not publish files or decide workflow completion.
"""

import copy
import re
import xml.etree.ElementTree as ET
from dispatch_errors import ArtifactFault, MergeConflict


MISSING = object()
SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)


def conflict(path, sources=()):
    raise MergeConflict(path, sources)


def ordered_union(lists):
    return list(dict.fromkeys(key for keys in lists for key in keys))


def merge_order(base, versions, surviving, path, sources=()):
    """Preserve baseline order and insertion anchors; reject reorder conflicts."""
    preference = ordered_union([base, *versions])
    edges = {key: set() for key in surviving}
    indegree = {key: 0 for key in surviving}
    for order in [base, *versions]:
        order = [key for key in order if key in surviving]
        for left, right in zip(order, order[1:]):
            if right not in edges[left]:
                edges[left].add(right)
                indegree[right] += 1
    result = []
    while len(result) < len(surviving):
        key = next((key for key in preference if key in indegree and indegree[key] == 0), None)
        if key is None:
            conflict(path + '/order', sources)
        result.append(key)
        del indegree[key]
        for right in edges[key]:
            indegree[right] -= 1
    return result


def merge_json(base, versions, path='$', sources=None):
    sources = list(range(len(versions))) if sources is None else list(sources)
    changed_pairs = [(source, value) for source, value in zip(sources, versions) if value != base]
    changed_sources = [source for source, _ in changed_pairs]
    changed = [value for _, value in changed_pairs]
    if not changed:
        return base if base is MISSING else copy.deepcopy(base)
    if all(value == changed[0] for value in changed):
        return changed[0] if changed[0] is MISSING else copy.deepcopy(changed[0])
    if any(value is MISSING for value in changed):
        conflict(path, changed_sources)
    if all(isinstance(value, dict) for value in changed) and (base is MISSING or isinstance(base, dict)):
        original = {} if base is MISSING else base
        keys = ordered_union([original, *(value for value in changed)])
        result = {}
        for key in keys:
            value = merge_json(original.get(key, MISSING),
                               [item.get(key, MISSING) for item in changed], path + '/' + key, changed_sources)
            if value is not MISSING:
                result[key] = value
        return result
    if all(isinstance(value, list) for value in changed) and (base is MISSING or isinstance(base, list)):
        original = [] if base is MISSING else base
        items = [item for values in [original, *changed] for item in values]
        identity = next((name for name in ('id', 'name') if items and all(
            isinstance(item, dict) and isinstance(item.get(name), str) for item in items)), None)
        if identity:
            maps = []
            for position, values in enumerate([original, *changed]):
                index = {item[identity]: item for item in values}
                if len(index) != len(values):
                    raise ArtifactFault('json_duplicate_identity', f'duplicate {identity} at {path}', location=path,
                                        sources=[changed_sources[position - 1]] if position else (),
                                        category='artifact' if position else 'execution')
                maps.append(index)
            result = {}
            for key in ordered_union(maps):
                value = merge_json(maps[0].get(key, MISSING),
                                   [index.get(key, MISSING) for index in maps[1:]], path + '/' + key, changed_sources)
                if value is not MISSING:
                    result[key] = value
            order = merge_order(list(maps[0]), [list(index) for index in maps[1:]], set(result), path, changed_sources)
            return [result[key] for key in order]
    conflict(path, changed_sources)


def element_text(node):
    value = node.text or ''
    return value if node.tag.rsplit('}', 1)[-1] in {'text', 'tspan', 'textPath'} else value.strip()


def element_tail(node):
    value = node.tail or ''
    return value if node.tag.rsplit('}', 1)[-1] in {'tspan', 'textPath'} else value.strip()


def signature(element):
    return (element.tag, tuple(sorted(element.attrib.items())), element_text(element), element_tail(element),
            tuple(signature(child) for child in element))


def read_svg(data):
    if re.search(br'<\?xml-stylesheet\b', data, re.I):
        raise ArtifactFault('svg_external_style', 'SVG stylesheet instructions must be resolved to element-local styles', location='svg/xml-stylesheet')
    element = ET.fromstring(data)
    if element.tag != '{' + SVG_NS + '}svg':
        raise ValueError('artifact must be an SVG document')
    ids = [node.get('id') for node in element.iter() if node.get('id')]
    if len(ids) != len(set(ids)):
        raise ValueError('SVG contains duplicate ids')
    return element


def child_index(element):
    result = {}
    for position, child in enumerate(element):
        identity = child.get('id')
        if identity:
            key = 'id:' + identity
        elif child.tag.rsplit('}', 1)[-1] in {'defs', 'title', 'desc', 'metadata', 'style'}:
            key = 'tag:' + child.tag
        else:
            # Anonymous drawing children are atomic when more than one result
            # changes their parent; never guess their identity by position.
            key = 'anonymous:' + str(position)
        if key in result:
            raise ValueError(f'ambiguous SVG child: {key}')
        result[key] = child
    return result


def merge_element(base, versions, path='svg', sources=None):
    sources = list(range(len(versions))) if sources is None else list(sources)
    baseline = signature(base) if base is not MISSING else MISSING
    changed_pairs = [(source, node) for source, node in zip(sources, versions)
                     if (signature(node) if node is not MISSING else MISSING) != baseline]
    changed_sources = [source for source, _ in changed_pairs]
    changed = [node for _, node in changed_pairs]
    if not changed:
        return base if base is MISSING else copy.deepcopy(base)
    first = changed[0]
    if all((signature(node) if node is not MISSING else MISSING)
           == (signature(first) if first is not MISSING else MISSING) for node in changed):
        return first if first is MISSING else copy.deepcopy(first)
    if any(node is MISSING for node in changed) or any(node.tag != first.tag for node in changed):
        conflict(path, changed_sources)
    if base is MISSING:
        # Multiple newly added elements with the same identity must agree.
        conflict(path, changed_sources)
    try:
        attrs = merge_json(base.attrib, [node.attrib for node in changed], path + '/attributes', changed_sources)
        text = merge_json(element_text(base), [element_text(node) for node in changed], path + '/text', changed_sources)
        tail = merge_json(element_tail(base), [element_tail(node) for node in changed], path + '/tail', changed_sources)
    except MergeConflict as exc:
        exc.svg_id = base.get('id')
        raise
    maps = [child_index(node) for node in [base, *changed]]
    for key in ordered_union(maps):
        if key.startswith('anonymous:') and any(
                (signature(index[key]) if key in index else MISSING)
                != (signature(maps[0][key]) if key in maps[0] else MISSING) for index in maps[1:]):
            exc = MergeConflict(path + '/' + key, changed_sources)
            exc.svg_id = base.get('id')
            raise exc
    children = {}
    for key in ordered_union(maps):
        child = merge_element(maps[0].get(key, MISSING),
                              [index.get(key, MISSING) for index in maps[1:]], path + '/' + key, changed_sources)
        if child is not MISSING:
            children[key] = child
    result = ET.Element(base.tag, attrs)
    result.text = text or None
    result.tail = tail or None
    order = merge_order(list(maps[0]), [list(index) for index in maps[1:]], set(children), path, changed_sources)
    result.extend(children[key] for key in order)
    return result


def remap_ids(root, mapping):
    """Rewrite local SVG references together with their renamed ids."""
    if not mapping:
        return
    def urls(value):
        return re.sub(r'url\(\s*([\"\']?)#([^\s)\"\']+)\1\s*\)',
                      lambda match: 'url(#' + mapping.get(match[2], match[2]) + ')', value)
    for node in root.iter():
        for key, value in list(node.attrib.items()):
            if key == 'id':
                value = mapping.get(value, value)
            elif key.rsplit('}', 1)[-1] == 'href' and value.startswith('#'):
                value = '#' + mapping.get(value[1:], value[1:])
            elif key in {'data-rendering-layer', 'aria-labelledby', 'aria-describedby'}:
                value = ' '.join(mapping.get(token, token) for token in value.split())
            else:
                value = urls(value)
                if key in {'begin', 'end'}:
                    for old, new in mapping.items():
                        value = re.sub(r'(?<![\w-])' + re.escape(old) + r'(?=\.)', new, value)
            node.set(key, value)
        if node.tag.rsplit('}', 1)[-1] == 'style' and node.text:
            value = urls(node.text)
            def selectors(match):
                selector = match[1]
                for old, new in mapping.items():
                    selector = re.sub(r'#' + re.escape(old) + r'(?![\w-])', '#' + new, selector)
                return selector + '{'
            node.text = re.sub(r'([^{}]+)\{', selectors, value)
        elif node.tag.rsplit('}', 1)[-1] == 'desc' and node.text:
            for old, new in mapping.items():
                node.text = re.sub(r'(?<![\w-])' + re.escape(old) + r'(?![\w-])', new, node.text)


def local_references(root):
    result = set()
    for node in root.iter():
        for key, value in node.attrib.items():
            result.update(re.findall(r'url\(\s*[\"\']?#([^\s)\"\']+)', value))
            if key.rsplit('}', 1)[-1] == 'href' and value.startswith('#'):
                result.add(value[1:])
            if key in {'begin', 'end'}:
                result.update(re.findall(r'(?:^|;)\s*([\w-]+)\.', value))
        if node.tag.rsplit('}', 1)[-1] == 'style':
            result.update(re.findall(r'url\(\s*[\"\']?#([^\s)\"\']+)', node.text or ''))
    return result


def validate_references(root):
    ids = {node.get('id') for node in root.iter() if node.get('id')}
    missing = local_references(root) - ids
    if missing:
        raise ValueError('SVG has unresolved references: ' + ', '.join(sorted(missing)[:5]))


def validate_static_svg(root):
    """Only local, static SVG has isolated dependencies that can be joined."""
    for node in root.iter():
        tag = node.tag.rsplit('}', 1)[-1]
        location = 'svg/' + tag + ('#' + node.get('id') if node.get('id') else '')
        if tag == 'style':
            raise ArtifactFault('svg_global_style',
                'SVG global styles must be converted to element-local styles before merging', location=location)
        if tag in {'script', 'foreignObject', 'animate', 'animateTransform', 'animateMotion', 'set'}:
            raise ArtifactFault('svg_dynamic_content', 'merge requires static SVG content', location=location)
        for key, value in sorted(node.attrib.items()):
            name = key.rsplit('}', 1)[-1]
            if name.startswith('on'):
                raise ArtifactFault('svg_dynamic_content', 'SVG event handlers cannot be merged', location=location + '/' + key)
            if name == 'href' and not value.startswith(('#', 'data:')):
                raise ArtifactFault('svg_external_resource', 'SVG resources must be embedded or use local references', location=location + '/' + key)
            for url in re.findall(r'url\(\s*[\"\']?([^\s)\"\']+)', value):
                if not url.startswith(('#', 'data:')):
                    raise ArtifactFault('svg_external_resource', 'SVG resources must be embedded or use local references', location=location + '/' + key)
            if re.search(r'\b(?:var|env)\s*\(', value):
                raise ArtifactFault('svg_external_style', 'SVG values must be resolved element-local styles', location=location + '/' + key)


def merge_svg(base_data, versions, prefixes, sources=None):
    """Return merged bytes and each result's resource/duplicate-id remapping."""
    if not versions or len(versions) != len(prefixes) or len(set(prefixes)) != len(prefixes):
        raise ValueError('each SVG result requires a distinct sequence prefix')
    roots = [read_svg(data) for data in versions]
    for root in roots:
        validate_references(root)
    base = read_svg(base_data) if base_data is not None else ET.Element(roots[0].tag, roots[0].attrib)
    canvas = lambda node: tuple(node.get(key) for key in ('viewBox', 'width', 'height'))
    if any(canvas(root) != canvas(base) for root in roots):
        identities = list(range(len(roots))) if sources is None else list(sources)
        offenders = [identity for identity, root in zip(identities, roots) if canvas(root) != canvas(base)]
        # With no common drawing yet, every disagreeing creator must settle the canvas.
        raise ArtifactFault('svg_canvas_conflict', 'SVG canvas changed between results',
                            location='svg/canvas', sources=offenders if base_data else identities)
    original_ids = {node.get('id') for node in base.iter() if node.get('id')}
    new_ids = [{node.get('id') for node in root.iter() if node.get('id')} - original_ids for root in roots]
    duplicates = {identity for identities in new_ids for identity in identities
                  if sum(identity in values for values in new_ids) > 1}
    used = original_ids | set().union(*new_ids)
    mappings = []
    for root, added, prefix in zip(roots, new_ids, prefixes):
        resources = {node.get('id') for defs in root.iter('{' + SVG_NS + '}defs')
                     for node in defs.iter() if node.get('id')}
        mapping = {}
        for identity in sorted(added & (resources | duplicates)):
            replacement = prefix + '_' + identity
            counter = 2
            while replacement in used:
                replacement = prefix + '_' + identity + '_' + str(counter)
                counter += 1
            mapping[identity] = replacement
            used.add(replacement)
        remap_ids(root, mapping)
        mappings.append(mapping)
    # Empty defs are a common container, rather than competing additions.
    if any(root.find('{' + SVG_NS + '}defs') is not None for root in roots) and base.find('{' + SVG_NS + '}defs') is None:
        base.insert(0, ET.Element('{' + SVG_NS + '}defs'))
        for root in roots:
            if root.find('{' + SVG_NS + '}defs') is None:
                root.insert(0, ET.Element('{' + SVG_NS + '}defs'))
    merged = merge_element(base, roots, sources=sources)
    data = ET.tostring(merged, encoding='utf-8', xml_declaration=True)
    validate_references(read_svg(data))
    return data, mappings
