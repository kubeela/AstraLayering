from pathlib import Path
import sys, hashlib, shutil
R=Path('/Users/wutian/Desktop/coding/AstraLayering')
sys.path.insert(0,str(R/'workflow-next/live2d-layering/tools'))
from svg_preview import parser, preview
O=Path(__file__).parent
D=O.parents[4]
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(D/'block-layers/groups.svg')=='a3d9513e5fae1bf11d1aee0705211ae4dacea555da9d72d78e7accc2fa821d94'
assert sha(O/'candidate-parent.svg')=='f4a95e38339af8b7b374d414a2a33b6b007937f6c4bf43028e248b2ee00e8b1d'
shutil.copyfile(O/'candidate-parent.svg',D/'block-layers/groups.svg')
preview(parser().parse_args([str(D/'block-layers/groups.svg'),str(D/'block-layers/preview.png'),'--background','white']))
print('guide',sha(D/'block-layers/groups.svg'))
print('preview',sha(D/'block-layers/preview.png'))
