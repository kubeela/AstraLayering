"""Guided source-edge sampling and native-coordinate face/whole-eye checks.

Not face segmentation: a person/worker must verify the source-only edge marks.
Distances are horizontal scanline distances, not full normal contour distances.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import sys
import tempfile

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from svg_preview import RenderBatch, isolate, read_svg


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def save(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def reference_image(path):
    with Image.open(path) as image:
        image = image.convert('RGBA')
    return Image.alpha_composite(Image.new('RGBA', image.size, 'white'), image)


def trace(reference, guide, output):
    image = reference_image(reference)
    provenance = {'reference_sha256': sha(reference), 'canvas': list(image.size)}
    if guide.get('status') == 'not_applicable':
        if not guide.get('reason', '').strip():
            raise ValueError('not_applicable requires a visual reason')
        save(output, {**provenance, 'status': 'not_applicable', 'reason': guide['reason']})
        return
    roi, tolerance = guide.get('roi', []), guide.get('tolerance_px')
    if (len(roi) != 4 or any(type(v) is not int for v in roi) or min(roi[:2]) < 0 or min(roi[2:]) <= 0
            or roi[0]+roi[2] > image.width or roi[1]+roi[3] > image.height):
        raise ValueError('roi must be inside the native reference canvas')
    if type(tolerance) not in (int, float) or not math.isfinite(tolerance) or tolerance <= 0:
        raise ValueError('predeclare positive native-pixel tolerance from source clarity')
    if not guide.get('group_path') or not isinstance(guide.get('rows'), list) or len(guide['rows']) < 3:
        raise ValueError('need face group_path and at least three visible source rows')
    gray, rows, seen = image.convert('L'), [], set()
    for row in sorted(guide['rows'], key=lambda item: item['y']):
        y = row['y']
        if type(y) is not int or y in seen or not roi[1] <= y < roi[1]+roi[3]:
            raise ValueError('invalid/duplicate source row')
        seen.add(y)
        measured = {'y': y}
        for side in ('left', 'right'):
            if side not in row:
                continue
            band = row[side]
            if (len(band) != 2 or any(type(v) is not int for v in band)
                    or not max(1, roi[0]) <= band[0] < band[1] < min(image.width-1, roi[0]+roi[2])):
                raise ValueError('invalid source-only edge corridor')
            low, high = band
            gradient = {x: abs(gray.getpixel((x+1, y))-gray.getpixel((x-1, y))) for x in range(low, high+1)}
            peak = max(gradient.values())
            choices = [x for x, value in gradient.items() if value == peak]
            if peak < 8 or low in choices or high in choices or choices[-1]-choices[0] > 2:
                raise ValueError(f'uncertain/truncated source edge at {side}, y={y}; inspect source')
            measured[side] = sum(choices)/len(choices)
        if len(measured) == 1 or ('left' in measured and 'right' in measured and measured['left'] >= measured['right']):
            raise ValueError('empty/crossed source edges')
        rows.append(measured)
    target = {**provenance, 'status': 'measured', 'guide': guide, 'rows': rows}
    save(output, target)
    marked = image.copy()
    draw = ImageDraw.Draw(marked)
    for row in rows:
        for side in ('left', 'right'):
            if side in row:
                x, y = row[side], row['y']
                draw.ellipse((x-1, y-1, x+1, y+1), fill='#00aa55')
    x, y, w, h = roi
    marked.crop((x, y, x+w, y+h)).resize((w*4, h*4)).save(Path(output).with_suffix('.source.png'))


def full_group(root, path):
    result = copy.deepcopy(root)
    def belongs(node):
        identity = node.get('data-part-path') or node.get('data-group-path') or ''
        return identity == path or identity.startswith(path + '/')
    selected = [node for node in result if belongs(node)]
    if not selected or any(not node.get('id') for node in selected):
        raise ValueError('missing target drawing group: ' + path)
    # Diagnostic view of the full author geometry before explicit display effects.
    # CSS effects would be ambiguous here, so require explicit SVG attributes.
    for node in selected:
        for child in node.iter():
            if any(word in child.get('style', '') for word in ('mask:', 'clip-path:', 'opacity:', 'display:', 'visibility:')):
                raise ValueError('use explicit display attributes to inspect unmasked geometry: ' + path)
            for key in ('mask', 'clip-path', 'opacity', 'fill-opacity', 'stroke-opacity'):
                child.attrib.pop(key, None)
    isolate(result, [node.get('id') for node in selected])
    return result


def component_areas(image):
    alpha = image.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    box = alpha.getbbox()
    if box is None:
        return []
    alpha = alpha.crop(box)
    width, height = alpha.size
    pixels, areas = bytearray(alpha.tobytes()), []
    for index in range(len(pixels)):
        if not pixels[index]:
            continue
        pixels[index] = 0
        pending, area = [index], 0
        while pending:
            current = pending.pop()
            x, y = current % width, current // width
            area += 1
            for ny in range(max(0, y-1), min(height, y+2)):
                for nx in range(max(0, x-1), min(width, x+2)):
                    neighbor = ny*width+nx
                    if pixels[neighbor]:
                        pixels[neighbor] = 0
                        pending.append(neighbor)
        areas.append(area)
    return sorted(areas, reverse=True)


def measure(alpha, target):
    rows, errors, widths, centers, missing = [], [], [], [], []
    for source in target['rows']:
        y = source['y']
        xs = [x for x in range(alpha.width) if alpha.getpixel((x, y)) >= 128]
        if not xs:
            missing.append(y)
            continue
        row = {'y': y, 'candidate_left': xs[0], 'candidate_right': xs[-1]}
        for side, value in [('left', xs[0]), ('right', xs[-1])]:
            if side in source:
                row['reference_'+side] = source[side]
                row[side+'_error_px'] = value-source[side]
                errors.append(value-source[side])
        if 'left' in source and 'right' in source:
            row['width_error_px'] = xs[-1]-xs[0]-(source['right']-source['left'])
            row['center_shift_px'] = (xs[-1]+xs[0]-source['right']-source['left'])/2
            widths.append(row['width_error_px'])
            centers.append(row['center_shift_px'])
        rows.append(row)
    maximum = lambda values: max(map(abs, values)) if values else None
    metrics = {'edge_max_px': maximum(errors), 'width_max_px': maximum(widths), 'center_max_px': maximum(centers)}
    tolerance = target['guide']['tolerance_px']
    limits = {'edge_max_px': tolerance, 'width_max_px': tolerance*2, 'center_max_px': tolerance}
    failed = [key for key, value in metrics.items() if value is not None and value > limits[key]]
    return {'status': 'revise' if failed or missing or not errors else 'pass', 'metrics': metrics,
            'limits': limits, 'failed': failed, 'missing_rows': missing, 'rows': rows,
            'unmeasured': [key for key, value in metrics.items() if value is None]}


def check(reference, target_path, svg, out):
    source, target = reference_image(reference), load(target_path)
    root, size = read_svg(svg)
    provenance = {'reference_sha256': sha(reference), 'target_sha256': sha(target_path), 'svg_sha256': sha(svg),
                  'scope': 'sampled visible face edges and specified whole-eye connectivity; visual review still required'}
    if target.get('reference_sha256') != sha(reference) or target.get('canvas') != list(source.size) or size != source.size:
        raise ValueError('reference, target and SVG must match the same native canvas and source hash')
    out = Path(out)
    if target.get('status') == 'not_applicable':
        save(out/'report.json', {**provenance, 'status': 'not_applicable', 'reason': target['reason']})
        return 0
    guide = target['guide']
    paths = list(dict.fromkeys([guide['group_path'], *guide.get('eyes', [])]))
    with tempfile.TemporaryDirectory() as scratch:
        batch = RenderBatch(Path(scratch), size)
        jobs = {path: batch.add(full_group(root, path), size, (0, 0, *size)) for path in paths}
        batch.run()
        images = {}
        for path, filename in jobs.items():
            with Image.open(filename) as image:
                images[path] = image.convert('RGBA')
    face = images[guide['group_path']]
    report = measure(face.getchannel('A'), target)
    eyes = {path: component_areas(images[path]) for path in guide.get('eyes', [])}
    if any(len(areas) != 1 for areas in eyes.values()):
        report['status'] = 'revise'
    save(out/'report.json', {**provenance, **report, 'eye_components_px': eyes})
    overlay = source.copy()
    draw = ImageDraw.Draw(overlay)
    for row in report['rows']:
        for side in ('left', 'right'):
            if 'reference_'+side in row:
                for prefix, color in [('reference_', '#00aa55'), ('candidate_', '#ee2299')]:
                    x, y = row[prefix+side], row['y']
                    draw.line((x, y-1, x, y+1), fill=color)
    x, y, w, h = guide['roi']
    box = (x, y, x+w, y+h)
    white_face = Image.alpha_composite(Image.new('RGBA', size, 'white'), face)
    board = Image.new('RGB', (w*3, h))
    for index, panel in enumerate((source, overlay, Image.blend(source, white_face, .4))):
        board.paste(panel.crop(box).convert('RGB'), (index*w, 0))
    board.resize((w*9, h*3)).save(out/'comparison.png')
    return 0 if report['status'] == 'pass' else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('trace', 'check'))
    parser.add_argument('--reference', required=True, type=Path)
    parser.add_argument('--guide', type=Path)
    parser.add_argument('--target', type=Path)
    parser.add_argument('--svg', type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.command == 'trace':
            if not args.guide:
                parser.error('trace requires --guide')
            trace(args.reference, load(args.guide), args.out)
            return 0
        if not args.target or not args.svg:
            parser.error('check requires --target and --svg')
        return check(args.reference, args.target, args.svg, args.out)
    except (ValueError, KeyError, TypeError, OSError) as exc:
        parser.exit(2, str(exc) + '\n')


if __name__ == '__main__':
    raise SystemExit(main())
