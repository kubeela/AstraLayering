from pathlib import Path
from PIL import Image,ImageDraw
from lxml import etree as E
p=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/evidence')
ref=Image.open('references/base-subject.png').convert('RGB')
im=Image.open(p/'input.png').convert('RGBA'); bg=Image.new('RGBA', im.size,'white');bg.alpha_composite(im);im=bg.convert('RGB')
box=(390,177,445,219)
a=ref.crop(box); b=im.crop(box); mix=Image.blend(a,b,.5)
out=Image.new('RGB',(1320,360),'#f7f7f7');d=ImageDraw.Draw(out)
for x,v,label in [(0,a,'REFERENCE'),(440,b,'INPUT'),(880,mix,'50% SAME-COORDINATE')]:
 out.paste(v.resize((440,336)),(x,24));d.text((x+10,8),label,fill='black')
out.save(p/'input-calibration.png')
svg=E.parse('refinement/groups/face/6.投影与高光效果/character.svg')
for id in ['face_base','eye_right']:
 e=svg.xpath('//*[@id="'+id+'"]')[0]
 print(id,E.tostring(e,encoding='unicode')[:13000])
