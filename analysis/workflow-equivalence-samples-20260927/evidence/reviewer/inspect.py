from pathlib import Path
import xml.etree.ElementTree as E
from PIL import Image, ImageDraw

root = Path('C:/Users/22129/AppData/Local/Temp/workflow-equivalence-20260927-9mzgs8zo')
shared = root/'shared'
evidence = Path('D:/Resources/workspace/AstraLayering/analysis/workflow-equivalence-samples-20260927/evidence')
out = root/'blind-review'
out.mkdir(exist_ok=True)
E.register_namespace('', 'http://www.w3.org/2000/svg')
def parse(p):
    r=E.parse(p).getroot()
    return r, {n.get('id'):n for n in r.iter() if n.get('id')}
def canonical(n):
    return n.tag, tuple(sorted(n.attrib.items())), (n.text or '').strip(), tuple(canonical(c) for c in n)
def own(n):
    return n.tag, tuple(sorted(n.attrib.items())), (n.text or '').strip()
sr,si=parse(shared/'structure-input.svg')
parents={c:p for p in sr.iter() for c in p}
for identity in ['earring_left','foot_chain_left','fx_hair5_left_long_on_earring','fx_hair5_left_earring_on_back','fx_lower3_foot_chain_left_on_calf','fx_lower3_foot_chain_left_on_foot']:
    n=si[identity]
    print('\nSTRUCTURE',identity,'PARENT',parents[n].get('id'))
    print(E.tostring(n,encoding='unicode'))
for identity in ['ear_left','calf_left','foot_left']:
    n=si[identity]
    print('\nATTACH',identity,n.attrib)
    for c in n:
        if c.tag.endswith('path'): print(c.attrib)
mr,mi=parse(shared/'mouth-input.svg')
print('\nINPUT MOUTH',E.tostring(mi['mouth'],encoding='unicode'))
input_mouth={n.get('id') for n in mi['mouth'].iter()}
for label in ['A','B']:
    r,ids=parse(evidence/'mouth'/label/'character.svg')
    print('\nMOUTH',label,E.tostring(ids['mouth'],encoding='unicode'))
    candidate_mouth={n.get('id') for n in ids['mouth'].iter()}
    added=[k for k in ids.keys()-mi.keys() if k not in candidate_mouth]
    removed=[k for k in mi.keys()-ids.keys() if k not in input_mouth]
    changed=[k for k in ids.keys()&mi.keys() if k not in input_mouth and own(ids[k])!=own(mi[k])]
    print('OTHER ENTITY DIFF',label, 'added',added,'removed',removed,'changed',changed)
    for tree in [r,mr]:
        for p in tree.iter():
            for n in list(p):
                if n.get('id')=='mouth': p.remove(n)
    print('WHOLE NON-MOUTH TREE EQUAL',canonical(r)==canonical(mr))
for label in ['A','B']:
    r,ids=parse(evidence/'shadow'/label/'off.svg')
    ir,ii=parse(shared/'shadow-input.svg')
    changed=[k for k in ids.keys()&ii.keys() if own(ids[k])!=own(ii[k])]
    print('SHADOW OFF INPUT ENTITY DIFF',label,changed)
im=Image.open(shared/'reference.png')
board=Image.new('RGB',(1000,1000),'white')
board.paste(im.crop((470,200,520,330)).resize((350,910)),(0,40))
board.paste(im.crop((442,1460,519,1638)).resize((385,890)),(430,40))
ImageDraw.Draw(board).text((10,10),'Reference: left earring / left foot chain',fill='black')
board.save(out/'structure-reference-crops.png')
