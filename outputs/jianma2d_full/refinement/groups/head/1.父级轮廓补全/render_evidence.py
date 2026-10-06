from pathlib import Path
import sys
import xml.etree.ElementTree as ET

REPO = Path('/Users/wutian/Desktop/coding/AstraLayering')
sys.path.insert(0, str(REPO / 'workflow-next/live2d-layering/tools'))
from svg_preview import read_svg, isolate, parser, preview

O = Path(__file__).parent
D = O.parents[3]
E = O / 'evidence'
P = O / 'candidate-parent.svg'
F = O / 'fixture-correct-right.svg'
R = D / 'references/base-subject.png'
L = D / 'references/line-reference.png'
b, _ = read_svg(O / 'input/groups.svg')
isolate(b, ['group-head'])
ET.ElementTree(b).write(O / 'input/before-head-only.svg', encoding='utf-8', xml_declaration=True)

def run(src, name, opts):
    preview(parser().parse_args([str(src), str(E / name)] + opts))

local = ['--only', 'group-head', '--crop', '506', '300', '34', '58', '--scale', '8', '--columns', '4']
for name, ref in [('head-ear-base-8x.png', R), ('head-ear-line-8x.png', L)]:
    run(P, name, local + ['--reference', str(ref), '--reference-crop', '506', '300', '34', '58', '--edge-overlay'])
run(P, 'head-before-after-8x.png', local + ['--compare', str(O / 'input/before-head-only.svg'), '--diff'])
run(P, 'head-alone-full.png', ['--only', 'group-head', '--background', 'white'])
run(P, 'head-overview-base.png', ['--only', 'group-head', '--reference', str(R), '--crop', '280', '0', '325', '600', '--reference-crop', '280', '0', '325', '600', '--scale', '1', '--edge-overlay', '--columns', '4'])
run(P, 'full-context.png', ['--reference', str(R), '--reference-crop', '0', '0', '895', '1758', '--columns', '3'])
run(F, 'head-and-correct-right-8x.png', ['--only', 'group-head', '--only', 'group-head-face-framing-hair-right', '--reference', str(R), '--crop', '506', '300', '34', '58', '--reference-crop', '506', '300', '34', '58', '--scale', '8', '--edge-overlay', '--columns', '4'])
run(F, 'correct-right-alone-8x.png', ['--only', 'group-head-face-framing-hair-right', '--reference', str(L), '--crop', '490', '255', '50', '103', '--reference-crop', '490', '255', '50', '103', '--scale', '8', '--edge-overlay', '--columns', '4'])
print('Rendered 8 final evidence images.')
