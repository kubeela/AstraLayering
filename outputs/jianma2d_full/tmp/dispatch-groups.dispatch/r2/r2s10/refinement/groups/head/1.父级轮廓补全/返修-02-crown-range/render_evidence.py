from pathlib import Path
import sys
import json
import hashlib
import xml.etree.ElementTree as ET

REPO=Path('/Users/wutian/Desktop/coding/AstraLayering')
sys.path.insert(0,str(REPO/'workflow-next/live2d-layering/tools'))
from svg_preview import read_svg,isolate,parser,preview
O=Path(__file__).parent
D=O.parents[4]
E=O/'evidence'
P=O/'candidate-parent.svg'
F=O/'fixture-correct-crown.svg'
base=D/'references/base-subject.png'
line=D/'references/line-reference.png'
root,_=read_svg(O/'input/groups.svg');isolate(root,['group-head'])
ET.ElementTree(root).write(O/'input/before-head-only.svg',encoding='utf-8',xml_declaration=True)
jobs=[]
def run(src,name,opts):
    preview(parser().parse_args([str(src),str(E/name)]+opts))
    jobs.append({'path':str(E/name),'args':opts,'sha256':hashlib.sha256((E/name).read_bytes()).hexdigest()})

regions={'arch-top':(384,10,103,30),'arch-left':(350,25,55,50),'arch-right':(475,20,55,60),'left-bridge':(357,102,50,45),'right-bridge':(468,102,50,45)}
for name,crop in regions.items():
    loc=['--only','group-head','--crop',*map(str,crop),'--scale','8','--columns','2','--background','checker']
    for suffix,ref in [('base',base),('line',line)]:
        run(P,name+'-'+suffix+'-8x.png',loc+['--reference',str(ref),'--reference-crop',*map(str,crop),'--edge-overlay'])
    run(P,name+'-before-after-8x.png',loc+['--compare',str(O/'input/before-head-only.svg'),'--diff'])
run(P,'head-alone-full.png',['--only','group-head','--background','white'])
run(P,'head-crown-overview.png',['--only','group-head','--reference',str(base),'--crop','275','10','325','150','--reference-crop','275','10','325','150','--scale','2','--columns','2','--edge-overlay','--background','checker'])
run(F,'head-with-correct-crown.png',['--only','group-head','--only','group-head-crown','--reference',str(base),'--crop','275','10','325','150','--reference-crop','275','10','325','150','--scale','2','--columns','2','--edge-overlay','--background','checker'])
run(F,'correct-crown-alone.png',['--only','group-head-crown','--reference',str(base),'--crop','275','10','325','220','--reference-crop','275','10','325','220','--scale','2','--columns','2','--edge-overlay','--background','checker'])
run(P,'full-context.png',['--reference',str(base),'--reference-crop','0','0','895','1758','--columns','3'])
(O/'render-manifest.json').write_text(json.dumps({'candidate_sha256':hashlib.sha256(P.read_bytes()).hexdigest(),'regions':regions,'jobs':jobs},ensure_ascii=False,indent=2)+'\n')
print('Rendered',len(jobs),'images.')
