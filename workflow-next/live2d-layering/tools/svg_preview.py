"""Render a PNG or an aligned comparison/component board without editing inputs.

Requires Python 3.8+, Pillow 9.1+, Node.js and sharp.
Crop coordinates are pixels of the original SVG viewport, not viewBox units.
"""
import argparse
import copy
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

from PIL import Image, ImageChops, ImageColor, ImageDraw, ImageFilter, ImageFont, ImageOps


SVG_NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG_NS)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
RESOURCES = {'defs', 'style', 'metadata', 'title', 'desc', 'clipPath', 'mask',
             'linearGradient', 'radialGradient', 'pattern', 'marker', 'symbol', 'filter'}
PAINT = {'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
         'text', 'image', 'use', 'foreignObject'}
MAX_PIXELS = 100000000
LABEL_HEIGHT = 28
CLIP_SHAPES = {'path', 'text', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'}
CLIP_AUXILIARY = {'title', 'desc', 'metadata', 'animate', 'animateTransform', 'set'}
LOCAL_URL = re.compile(r'''url\(\s*['"]?#([^\s)'"]+)['"]?\s*\)''')


def validate_svg_resources(root):
    """Reject broken local resources and clip geometry before a silent empty render.

    This is a structural check, not an assessment of shadow shape or visibility.
    Groups and use-to-group remain valid in ordinary artwork and masks.
    """
    ids = {}
    errors = []
    for node in root.iter():
        identity = node.get('id')
        if identity:
            if identity in ids:
                errors.append('duplicate id: ' + identity)
            ids[identity] = node
    for node in root.iter():
        label = node.get('id') or '<%s>' % local_tag(node)
        refs = set()
        for value in node.attrib.values():
            refs.update(LOCAL_URL.findall(value))
        if local_tag(node) == 'style':
            refs.update(LOCAL_URL.findall(node.text or ''))
        href = node.get('href', node.get('{http://www.w3.org/1999/xlink}href', ''))
        if href.startswith('#'):
            refs.add(href[1:])
        for ref in sorted(refs):
            if ref not in ids:
                errors.append('%s: missing local reference #%s' % (label, ref))
        if local_tag(node) != 'clipPath':
            continue
        for child in node:
            tag = local_tag(child)
            if tag == 'use':
                href = child.get('href', child.get('{http://www.w3.org/1999/xlink}href', ''))
                target = ids.get(href[1:]) if href.startswith('#') else None
                if target is None or local_tag(target) not in CLIP_SHAPES:
                    errors.append('%s: clipPath/use %s must directly reference a path, text '
                                  'or basic shape, not %s' %
                                  (label, href or '(no href)',
                                   '<%s>' % local_tag(target) if target is not None else 'an unresolved target'))
            elif tag not in CLIP_SHAPES | CLIP_AUXILIARY:
                errors.append('%s: <%s> is not valid clipPath geometry; put transformed '
                              'paths/basic shapes directly in the clipPath' % (label, tag))
    if errors:
        detail = '\n'.join(errors[:12])
        if len(errors) > 12:
            detail += '\n... %d additional resource errors' % (len(errors)-12)
        raise ValueError('SVG resource validation failed:\n' + detail)


def local_tag(node):
    return node.tag.rsplit('}', 1)[-1]


def component(root, identity):
    matches = [n for n in root.iter() if n.get('id') == identity]
    if len(matches) != 1:
        raise ValueError('Component id must match exactly once: ' + identity)
    target = matches[0]
    parents = {child: parent for parent in root.iter() for child in parent}
    node = target
    while node is not None:
        if local_tag(node) in RESOURCES:
            raise ValueError('Component id refers to an SVG resource: ' + identity)
        node = parents.get(node)
    return target


def style(node, value):
    node.set('style', node.get('style', '') + ';' + value)


def isolate(root, identities):
    """Keep selected artwork and ancestors; leave defs, clips and masks intact."""
    if isinstance(identities, str):
        identities = [identities]
    targets = {component(root, identity) for identity in identities}

    def visit(node, selected=False):
        if local_tag(node) in RESOURCES:
            return
        selected = selected or node in targets
        if local_tag(node) in PAINT and not selected:
            style(node, 'display:none!important')
        for child in node:
            visit(child, selected)

    visit(root)
    # Reveal selected hidden controls, retaining their opacity and resource effects.
    parents = {child: parent for parent in root.iter() for child in parent}
    for target in targets:
        node = target
        while node is not None:
            style(node, 'display:inline!important;visibility:visible!important')
            node = parents.get(node)


def hide(root, identities):
    for identity in identities:
        style(component(root, identity), 'display:none!important')


def read_svg(path):
    root = ET.parse(path).getroot()
    if local_tag(root) != 'svg':
        raise ValueError('Input is not SVG: ' + str(path))
    try:
        validate_svg_resources(root)
    except ValueError as exc:
        raise ValueError(str(path) + ': ' + str(exc)) from exc
    view = [float(n) for n in re.split(r'[\s,]+', root.get('viewBox', '').strip()) if n]
    if view and (len(view) != 4 or not all(math.isfinite(n) for n in view)
                 or min(view[2:]) <= 0):
        raise ValueError('Invalid SVG viewBox: ' + str(path))

    def dimension(name, index):
        value = root.get(name, '')
        if re.fullmatch(r'\d+(?:\.\d+)?(?:px)?', value):
            return float(value[:-2] if value.endswith('px') else value)
        if len(view) == 4:
            return view[index]
        raise ValueError('SVG requires pixel dimensions or viewBox: ' + str(path))

    width, height = dimension('width', 2), dimension('height', 3)
    if not all(math.isfinite(v) and v > 0 and v == int(v) for v in (width, height)):
        raise ValueError('SVG viewport must have positive integer pixel dimensions')
    return root, (int(width), int(height))


def crop_box(values, size):
    x, y, w, h = values or (0, 0, size[0], size[1])
    if min(x, y) < 0 or min(w, h) <= 0 or x+w > size[0] or y+h > size[1]:
        raise ValueError('Crop must be inside the input viewport')
    return x, y, w, h


def crop_svg(root, size, box, output_size):
    # Preserve the original viewport, including letterboxing and percentage geometry.
    root.set('width', str(size[0]))
    root.set('height', str(size[1]))
    root.set('x', '0')
    root.set('y', '0')
    wrapper = ET.Element('{%s}svg' % SVG_NS, {
        'width': str(output_size[0]), 'height': str(output_size[1]),
        'viewBox': ' '.join(map(str, box)), 'preserveAspectRatio': 'none'})
    wrapper.append(root)
    return wrapper


def node_runtime():
    if os.environ.get('REVIEW_NODE'):
        return os.environ['REVIEW_NODE']
    if shutil.which('node'):
        return shutil.which('node')
    bundled = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node'
    for p in (bundled / 'node.exe', bundled / 'bin/node.exe', bundled / 'bin/node'):
        if p.is_file():
            return str(p)
    raise ValueError('Node.js unavailable; set REVIEW_NODE to its executable')


class RenderBatch:
    """A single Node process for all SVG cells in one invocation."""
    def __init__(self, scratch, output_size):
        self.scratch = scratch
        self.output_size = output_size
        self.jobs = []
        self.cache = {}

    def add(self, root, size, box, only=(), hidden=()):
        doc = copy.deepcopy(root)
        if only:
            isolate(doc, only)
        hide(doc, hidden)
        doc = crop_svg(doc, size, box, self.output_size)
        content = ET.tostring(doc, encoding='utf-8', xml_declaration=True)
        if content in self.cache:
            return self.cache[content]
        source = self.scratch / ('%d.svg' % len(self.jobs))
        output = source.with_suffix('.png')
        source.write_bytes(content)
        self.jobs.append({'input': str(source), 'output': str(output)})
        self.cache[content] = output
        return output

    def run(self):
        manifest = self.scratch / 'renders.json'
        manifest.write_text(json.dumps(self.jobs), encoding='utf-8')
        subprocess.run([node_runtime(), str(Path(__file__).with_name('render_svg.cjs')),
                        '--batch', str(manifest)], check=True, capture_output=True, text=True)


def comparison_input(path, expected_size, box, output_size, batch, explicit_crop=None):
    if path.suffix.lower() == '.svg':
        root, size = read_svg(path)
        im = None
    else:
        with Image.open(path) as source:
            im = ImageOps.exif_transpose(source).convert('RGBA')
        size = im.size
    if explicit_crop is None and size != expected_size:
        raise ValueError('Comparison input and SVG viewport must have the same pixel dimensions: '
                         + str(path) + '; use --reference-crop for a separately aligned reference')
    source_box = crop_box(explicit_crop or box, size)
    if im is None:
        return batch.add(root, size, source_box)
    x, y, w, h = source_box
    return im.crop((x, y, x+w, y+h)).resize(output_size, Image.Resampling.LANCZOS)


def load_panel(value):
    if isinstance(value, Image.Image):
        return value
    with Image.open(value) as im:
        return im.convert('RGBA')


def background(size, value):
    if value == 'checker':
        im = Image.new('RGB', size, '#eeeeee')
        draw = ImageDraw.Draw(im)
        for y in range(0, size[1], 16):
            for x in range(0, size[0], 16):
                if (x//16 + y//16) % 2:
                    draw.rectangle((x, y, x+15, y+15), fill='#cccccc')
        return im.convert('RGBA')
    return Image.new('RGBA', size, ImageColor.getcolor(value, 'RGBA'))


def visible_edges_on_reference(reference, candidate):
    """Outline the rendered alpha shape, including clips and holes, on a reference."""
    shape = candidate.getchannel('A').point(lambda value: 255 if value >= 8 else 0)
    coverage = ImageChops.subtract(shape.filter(ImageFilter.MaxFilter(3)),
                                   shape.filter(ImageFilter.MinFilter(3)))
    coverage = coverage.point(lambda value: min(value, 220))
    ink = Image.new('RGBA', candidate.size, (220, 20, 150, 0))
    ink.putalpha(coverage)
    return Image.alpha_composite(reference.convert('RGBA'), ink).convert('RGB')


def label_font(custom=None):
    if custom:
        return ImageFont.truetype(str(custom), 16)
    candidates = [
        Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts/msyh.ttc',
        Path('/System/Library/Fonts/PingFang.ttc'),
        Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'),
        Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
    ]
    for path in candidates:
        if path.is_file():
            return ImageFont.truetype(str(path), 16)
    return ImageFont.load_default()


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('svg', type=Path)
    p.add_argument('output', type=Path)
    p.add_argument('--reference', type=Path, help='Aligned original image or SVG')
    p.add_argument('--compare', type=Path, help='Aligned previous PNG/image or SVG; stays unmodified')
    p.add_argument('--crop', type=int, nargs=4, metavar=('X', 'Y', 'W', 'H'))
    p.add_argument('--reference-crop', type=int, nargs=4, metavar=('X', 'Y', 'W', 'H'),
                   help='Known matching crop in reference pixels; explicitly resizes it to --crop')
    p.add_argument('--scale', type=int, choices=range(1, 9), default=1)
    p.add_argument('--part', action='append', default=[], help='One isolation cell per exact id')
    p.add_argument('--only', action='append', default=[], help='Show these ids together in candidate')
    p.add_argument('--hide', action='append', default=[], help='Hide id in candidate and diagnostic cells')
    p.add_argument('--toggle', action='append', default=[], help='One candidate-without-id cell per id')
    p.add_argument('--blend', type=float, default=.5, metavar='ALPHA',
                   help='Candidate weight in blends, 0..1 (default: 0.5)')
    p.add_argument('--diff', action='store_true', help='Add absolute color difference cells; no scores')
    p.add_argument('--edge-overlay', action='store_true',
                   help='Outline the rendered candidate silhouette on the aligned reference; '
                        'use --only to select SVG ids')
    p.add_argument('--background', help='checker or a Pillow color; default transparent PNG / white board')
    p.add_argument('--columns', type=int, choices=range(1, 9), default=3)
    p.add_argument('--font', type=Path, help='Optional TTF/TTC font for board labels')
    return p


def preview(a):
    if a.output.suffix.lower() != '.png':
        raise ValueError('Output must be a PNG')
    sources = [path for path in (a.svg, a.reference, a.compare, a.font) if path]
    if any(a.output.resolve() == path.resolve() or
           (a.output.exists() and path.exists() and a.output.samefile(path)) for path in sources):
        raise ValueError('Output cannot overwrite an input')
    if not math.isfinite(a.blend) or not 0 <= a.blend <= 1:
        raise ValueError('--blend must be between 0 and 1')
    if a.reference_crop and not a.reference:
        raise ValueError('--reference-crop requires --reference')
    if a.diff and not (a.reference or a.compare):
        raise ValueError('--diff requires --reference or --compare')
    if a.edge_overlay and not a.reference:
        raise ValueError('--edge-overlay requires --reference')
    if a.background and a.background != 'checker':
        if ImageColor.getcolor(a.background, 'RGBA')[3] != 255:
            raise ValueError('Background must be opaque; omit it for a transparent single preview')
    root, size = read_svg(a.svg)
    for identity in a.part + a.only + a.hide + a.toggle:
        component(root, identity)
    box = crop_box(a.crop, size)
    output_size = box[2]*a.scale, box[3]*a.scale
    count = (1 + len(a.part) + len(a.toggle)
             + (2+int(a.diff)) * (bool(a.reference) + bool(a.compare))
             + int(a.edge_overlay))
    columns = min(a.columns, count)
    rows = (count+columns-1)//columns
    if columns*rows*output_size[0]*(output_size[1]+LABEL_HEIGHT) > MAX_PIXELS:
        raise ValueError('Board too large; reduce crop, scale or panel count')
    with tempfile.TemporaryDirectory(prefix='astra-svg-preview-') as scratch:
        batch = RenderBatch(Path(scratch), output_size)
        candidate = batch.add(root, size, box, a.only, a.hide)
        comparisons = []
        if a.reference:
            comparisons.append(('reference', comparison_input(
                a.reference, size, box, output_size, batch, a.reference_crop)))
        if a.compare:
            comparisons.append(('previous', comparison_input(a.compare, size, box, output_size, batch)))
        diagnostics = [(identity, batch.add(root, size, box, [identity], a.hide)) for identity in a.part]
        diagnostics.extend(('without '+identity, batch.add(root, size, box, a.only, a.hide+[identity]))
                           for identity in a.toggle)
        batch.run()
        candidate = load_panel(candidate)
        a.output.parent.mkdir(parents=True, exist_ok=True)
        if not comparisons and not diagnostics:
            if a.background:
                candidate = Image.alpha_composite(background(output_size, a.background), candidate).convert('RGB')
            candidate.save(a.output)
            return
        backdrop = background(output_size, a.background or 'white')

        def flatten(value):
            return Image.alpha_composite(backdrop, load_panel(value)).convert('RGB')

        flat_candidate = flatten(candidate)
        for index, identity in enumerate(a.toggle, start=len(a.part)):
            # Reuse the requested render; no extra screenshots or rasterizer calls.
            toggled = flatten(diagnostics[index][1])
            if ImageChops.difference(flat_candidate, toggled).getbbox() is None:
                print('Warning: --toggle %s has no visible change in this crop; '
                      'check clipping, visibility, occlusion and crop before judging the effect. '
                      'Fully hidden effects can legitimately be unchanged.' % identity, file=sys.stderr)
        board = Image.new('RGB', (columns*output_size[0], rows*(output_size[1]+LABEL_HEIGHT)), 'white')
        font = label_font(a.font)
        index = 0

        def append(label, panel):
            nonlocal index
            x = (index % columns)*output_size[0]
            y = (index//columns)*(output_size[1]+LABEL_HEIGHT)
            # Clip long component labels to their own cell.
            header = Image.new('RGB', (output_size[0], LABEL_HEIGHT), 'white')
            try:
                ImageDraw.Draw(header).text((4, 4), label, fill='black', font=font)
            except UnicodeEncodeError:
                ImageDraw.Draw(header).text((4, 4), label.encode('ascii', 'replace').decode(), fill='black', font=font)
            board.paste(header, (x, y))
            board.paste(panel, (x, y+LABEL_HEIGHT))
            index += 1

        if comparisons:
            append(comparisons[0][0], flatten(comparisons[0][1]))
        append('candidate', flat_candidate)
        for i, (label, value) in enumerate(comparisons):
            other = flatten(value)
            if i:
                append(label, other)
            append('blend %s %g%%' % (label, a.blend*100), Image.blend(other, flat_candidate, a.blend))
            if label == 'reference' and a.edge_overlay:
                append('candidate outline on reference', visible_edges_on_reference(other, candidate))
            if a.diff:
                append('difference '+label, ImageChops.difference(other, flat_candidate))
        for label, value in diagnostics:
            append(label, flatten(value))
        board.save(a.output)


def main():
    p = parser()
    a = p.parse_args()
    try:
        preview(a)
        print(a.output)
    except (ValueError, OSError, ET.ParseError, Image.DecompressionBombError,
            subprocess.CalledProcessError) as exc:
        detail = exc.stderr.strip() if isinstance(exc, subprocess.CalledProcessError) else str(exc)
        p.exit(2, 'Error: '+detail+'\n')


if __name__ == '__main__':
    main()
