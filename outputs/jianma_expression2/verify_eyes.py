import json
from collections import Counter
from pathlib import Path
from lxml import etree
from jsonschema import Draft202012Validator

ROOT=Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_expression2')
SRC=Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_clothing\final\character.svg')
NODE=ROOT/'1.素材与关键形制作'/'1.3.眉眼制作'
KEY=ROOT/'1.素材与关键形制作'/'关键姿态'/'expression_eyes'
SCHEMA=json.loads(Path(r'D:\Resources\workspace\AstraLayering\agent-tools\expressions\expression.schema.json').read_text(encoding='utf-8'))
MATS=json.loads((NODE/'materials.json').read_text(encoding='utf-8'))
source=etree.parse(str(SRC)).getroot()
base=etree.parse(str(NODE/'character.svg')).getroot()

def ids(root):
    vals=[x.get('id') for x in root.iter() if x.get('id')]
    repeats=[x for x,n in Counter(vals).items() if n>1]
    assert not repeats,repeats
    return set(vals)

src_ids=ids(source)
base_ids=ids(base)
assert src_ids<=base_ids,src_ids-base_ids
def top_other(root):
    result=[]
    for x in root:
        ident=x.get('id','')
        if ident not in ('eye_right','eye_left','brow_right','brow_left'):
            result.append(etree.tostring(x))
    return result
assert top_other(source)==top_other(base),'unrelated root nodes changed'
validator=Draft202012Validator(SCHEMA)
for folder in sorted(x for x in KEY.iterdir() if x.is_dir()):
    svg=etree.parse(str(folder/'character.svg')).getroot()
    assert base_ids<=ids(svg),folder
    assert top_other(base)==top_other(svg),folder
    cmd=json.loads((folder/'command.json').read_text(encoding='utf-8'))
    validator.validate(cmd)
    assert cmd['actions'][0]=={'op':'reset'}
    assert cmd['actions'][1]['op']=='set_parameters'
    for p,value in cmd['actions'][1]['values'].items():
        spec=MATS['parameters'][p]
        if spec['type']=='number': assert spec['min']<=value<=spec['max']
        else: assert value in spec['choices']
print('PASS:',len(list(KEY.iterdir())),'keyforms, command schema, unique IDs, unrelated source nodes preserved')
