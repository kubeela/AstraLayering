from lxml import etree
from pathlib import Path

src = Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_clothing\final\character.svg')
root = etree.parse(str(src)).getroot()
idx = {x.get('id'): x for x in root.iter() if x.get('id')}

def brief(x):
    attrs = ' '.join(f'{k}={v[:70]}' for k,v in x.attrib.items() if k in ('id','transform','clip-path','mask','display','fill','opacity','filter'))
    return f'{etree.QName(x).localname} {attrs}'

for nid in ('eye_right','eye_left','brow_right','brow_left'):
    x = idx[nid]
    print('\nANCESTRY', nid)
    for p in list(x.iterancestors())[::-1]:
        print(' ',brief(p))
    print('TREE')
    def rec(n,depth=0):
        if depth>4: return
        print('  '*depth+brief(n))
        for ch in n:
            if isinstance(ch.tag,str): rec(ch,depth+1)
    rec(x)
print('\nSELECTED PATHS')
for nid in ('eye_right_upper_fold','eye_right_upper_lid_ink','eye_right_lower_lid_rim','eye_right_upper_lash_sweep','eye_right_upper_lash_outer_taper','eye_right_lower_lash_outer_root','eye_left_upper_fold'):
    print(nid, dict(idx[nid].attrib))
