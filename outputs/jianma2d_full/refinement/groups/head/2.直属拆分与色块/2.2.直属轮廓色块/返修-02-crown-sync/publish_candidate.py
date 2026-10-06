from pathlib import Path
import sys,hashlib,shutil,json
R=Path('/Users/wutian/Desktop/coding/AstraLayering')
sys.path.insert(0,str(R/'workflow-next/live2d-layering/tools'))
from svg_preview import parser,preview
O=Path(__file__).parent;N=O.parent;D=O.parents[5]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(D/'block-layers/groups.svg')==sha(O/'input/groups.svg')=='f4a95e38339af8b7b374d414a2a33b6b007937f6c4bf43028e248b2ee00e8b1d'
assert sha(O/'candidate.svg')=='dc53125f3eab4c6f0e3fe016146df7bffeca8903368ea0508cc28f05691e749b'
report=json.loads((O/'轮廓检查.json').read_text())
assert len(report['results'])==12 and all(r['status']=='pass' and r['outside_samples']==0 for r in report['results'])
shutil.copyfile(O/'candidate.svg',D/'block-layers/groups.svg')
shutil.copyfile(O/'轮廓检查.json',N/'轮廓检查.json')
preview(parser().parse_args([str(D/'block-layers/groups.svg'),str(D/'block-layers/preview.png'),'--background','white']))
print('guide',sha(D/'block-layers/groups.svg'))
print('preview',sha(D/'block-layers/preview.png'))
