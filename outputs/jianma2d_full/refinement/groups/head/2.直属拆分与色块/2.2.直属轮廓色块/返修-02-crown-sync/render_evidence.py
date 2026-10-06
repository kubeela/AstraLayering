from pathlib import Path
import sys, json, hashlib
import xml.etree.ElementTree as ET
R=Path('/Users/wutian/Desktop/coding/AstraLayering')
sys.path.insert(0,str(R/'workflow-next/live2d-layering/tools'))
from svg_preview import read_svg,isolate,parser,preview
from svg_containment import target_children
O=Path(__file__).parent
D=O.parents[5]
E=O/'evidence'
P=O/'candidate.svg'
base=D/'references/base-subject.png';line=D/'references/line-reference.png'
root,_=read_svg(O/'input/groups.svg');isolate(root,['group-head-crown'])
ET.ElementTree(root).write(O/'input/before-crown-only.svg',encoding='utf-8',xml_declaration=True)
tree=json.loads((D/'structure/groups.json').read_text());cur,_=read_svg(P)
children=[]
for kind,path in target_children(tree,'head'):
    children.extend(n.get('id') for n in cur.iter() if n.get('data-'+kind+'-path')==path)
assert len(children)==12 and 'group-head' not in children
child_opts=[v for ident in children for v in ['--only',ident]]
jobs=[]
def run(name,opts):
    preview(parser().parse_args([str(P),str(E/name)]+opts))
    jobs.append({'path':str(E/name),'args':opts,'sha256':hashlib.sha256((E/name).read_bytes()).hexdigest()})
regions={'arch-top':(384,10,103,30),'arch-left':(350,25,55,50),'arch-right':(475,20,55,60),'left-bridge':(357,102,50,45),'right-bridge':(468,102,50,45)}
for name,crop in regions.items():
    loc=['--only','group-head-crown','--crop',*map(str,crop),'--scale','8','--columns','2','--background','checker']
    for suffix,ref in [('base',base),('line',line)]:
        run(name+'-'+suffix+'-8x.png',loc+['--reference',str(ref),'--reference-crop',*map(str,crop),'--edge-overlay'])
    run(name+'-before-after-8x.png',loc+['--compare',str(O/'input/before-crown-only.svg'),'--diff'])
for suffix,ref in [('base',base),('line',line)]:
    run('crown-alone-'+suffix+'.png',['--only','group-head-crown','--crop','275','10','325','220','--scale','2','--columns','2','--background','checker','--reference',str(ref),'--reference-crop','275','10','325','220','--edge-overlay'])
    run('ear-'+suffix+'-8x.png',['--only','head-framing-right-loop','--crop','490','255','50','103','--scale','8','--columns','2','--background','checker','--reference',str(ref),'--reference-crop','490','255','50','103','--edge-overlay'])
run('children-no-parent-head.png',child_opts+['--crop','275','10','325','390','--scale','2','--columns','2','--background','checker','--reference',str(base),'--reference-crop','275','10','325','390','--edge-overlay'])
run('children-no-parent-full.png',child_opts+['--background','checker'])
run('children-no-parent-crown-line-4x.png',child_opts+['--crop','345','10','190','150','--scale','4','--columns','2','--background','checker','--reference',str(line),'--reference-crop','345','10','190','150','--edge-overlay'])
run('children-no-parent-ear-line-8x.png',child_opts+['--crop','490','255','50','103','--scale','8','--columns','2','--background','checker','--reference',str(line),'--reference-crop','490','255','50','103','--edge-overlay'])
run('frozen-head-alone.png',['--only','group-head','--background','white'])
run('full-context.png',['--reference',str(base),'--reference-crop','0','0','895','1758','--columns','3'])
(O/'render-manifest.json').write_text(json.dumps({'candidate_sha256':hashlib.sha256(P.read_bytes()).hexdigest(),'children_no_parent_ids':children,'regions':regions,'jobs':jobs},ensure_ascii=False,indent=2)+'\n')
print('Rendered',len(jobs),'images.')
