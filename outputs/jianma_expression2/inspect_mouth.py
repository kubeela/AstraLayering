from lxml import etree
from pathlib import Path

src=Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_expression2\1.素材与关键形制作\1.3.眉眼制作\character.svg')
root=etree.parse(str(src)).getroot()
idx={e.get('id'):e for e in root.iter() if e.get('id')}

def brief(e):
    keys=('id','transform','clip-path','mask','display','fill','stroke','opacity','filter','href')
    return etree.QName(e).localname+' '+' '.join(f'{k}={v[:95]}' for k,v in e.attrib.items() if k in keys)

mouth=idx['mouth']
print('ANCESTORS')
for e in list(mouth.iterancestors())[::-1]: print(brief(e))
print('MOUTH TREE')
def rec(e,n=0):
    if n>5:return
    print('  '*n+brief(e))
    for x in e:
        if isinstance(x.tag,str):rec(x,n+1)
rec(mouth)
print('GEOMETRY')
for name,e in idx.items():
    if name.startswith('mouth') and etree.QName(e).localname in ('path','ellipse','rect'):
        print(name,dict(e.attrib))
print('GRADIENTS AND CLIPS')
for name in ('mouth3_upper_lip_color','mouth3_lower_lip_color','mouth3_upper_right_volume','mouth3_lower_left_volume','mouth3_lower_cast_color','mouth3_lower_light_color','mouth3_cavity_color','mouth3_tongue_color','mouth3_upper_teeth_color','mouth3_lower_teeth_color','mouth3_upper_skin_surface','mouth3_lower_skin_surface','mouth3_upper_lip_surface','mouth3_lower_lip_surface'):
    e=idx[name]
    print(name,dict(e.attrib))
    for ch in e:
        if isinstance(ch.tag,str):print(' ',etree.QName(ch).localname,dict(ch.attrib))
print('FX')
for name,e in idx.items():
    if name.startswith('fx_mouth'):
        print(name,dict(e.attrib))
