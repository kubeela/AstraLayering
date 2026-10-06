from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import hashlib
import json

REPO = Path('/Users/wutian/Desktop/coding/AstraLayering')
sys.path.insert(0, str(REPO / 'workflow-next/live2d-layering/tools'))
from svg_preview import read_svg, isolate, parser, preview
O = Path(__file__).parent
D = O.parents[4]
E = O / 'evidence'
C = O / 'candidate.svg'
R = D / 'references/base-subject.png'
L = D / 'references/line-reference.png'
root, size = read_svg(C)
children = [n.get('id') for n in root if ((n.get('data-group-path') or n.get('data-part-path') or '').startswith('head/') and (n.get('data-group-path') or n.get('data-part-path')).count('/') == 1)]
assert len(children) == 12
only_children = [x for name in children for x in ['--only', name]]
before, _ = read_svg(O / 'input/groups.svg')
isolate(before, ['head-framing-right-loop'])
ET.ElementTree(before).write(O / 'input/before-ear-only.svg', encoding='utf-8', xml_declaration=True)
jobs = []
def run(src, name, opts):
    preview(parser().parse_args([str(src), str(E / name)] + opts))
    jobs.append({'path':str(E/name),'arguments':opts,'sha256':hashlib.sha256((E/name).read_bytes()).hexdigest()})

ear = ['--only','head-framing-right-loop','--crop','490','255','50','103','--scale','8','--columns','4']
for name, ref in [('ear-base-8x.png',R),('ear-line-8x.png',L)]:
    run(C,name,ear+['--reference',str(ref),'--reference-crop','490','255','50','103','--edge-overlay'])
run(C,'ear-before-after-8x.png',ear+['--compare',str(O/'input/before-ear-only.svg'),'--diff'])
run(C,'right-group-overview-2x.png',['--only','group-head-face-framing-hair-right','--reference',str(R),'--crop','470','230','110','370','--reference-crop','470','230','110','370','--scale','2','--edge-overlay','--columns','4'])
run(C,'right-with-frozen-head-8x.png',['--only','group-head','--only','group-head-face-framing-hair-right','--reference',str(R),'--crop','506','300','34','58','--reference-crop','506','300','34','58','--scale','8','--edge-overlay','--columns','4'])
run(C,'children-no-parent-head.png',only_children+['--reference',str(R),'--crop','280','0','325','620','--reference-crop','280','0','325','620','--scale','1','--edge-overlay','--columns','4'])
run(C,'children-no-parent-ear-8x.png',only_children+['--reference',str(L),'--crop','506','300','34','58','--reference-crop','506','300','34','58','--scale','8','--edge-overlay','--columns','4','--background','checker'])
run(C,'children-face-front-neck-4x.png',only_children+['--only','part-neck-neck-skin','--reference',str(R),'--crop','475','240','70','130','--reference-crop','475','240','70','130','--scale','4','--edge-overlay','--columns','4'])
run(C,'children-no-parent-full.png',only_children+['--background','white'])
run(C,'full-context.png',['--reference',str(R),'--reference-crop','0','0','895','1758','--columns','3'])
run(C,'frozen-head-alone.png',['--only','group-head','--background','white'])
(O/'render-manifest.json').write_text(json.dumps({'candidate_sha256':hashlib.sha256(C.read_bytes()).hexdigest(),'children_without_parent_ids':children,'jobs':jobs},ensure_ascii=False,indent=2)+'\n')
print('Rendered',len(jobs),'evidence images.')
