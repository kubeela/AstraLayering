from pathlib import Path
from lxml import etree as E
out=Path('refinement/groups/eyes/4.眼周肤色与局部层次');e=out/'evidence';ns='http://www.w3.org/2000/svg';q=lambda x:'{'+ns+'}'+x
r=E.parse('refinement/groups/eyes/3.关联部件校准/character.svg')
for el in r.xpath('.//*[@id="eye_right" or @id="eye_left"]'):el.set('display','none')
r.write(str(e/'baseline-no-eyes.svg'),encoding='utf-8',xml_declaration=True)
r=E.parse(str(out/'character.svg'));root=r.getroot()
for el in list(root):
 if el.tag not in [q('defs'),q('title'),q('desc')] and el.get('id') not in ['eye_right','eye_left']:root.remove(el)
for part in ['eye_right','eye_left']:
 eye=root.xpath('.//*[@id=$i]',i=part)[0]
 for el in list(eye):
  if el.get('data-role')!='periocular-skin':eye.remove(el)
r.write(str(e/'skin-only.svg'),encoding='utf-8',xml_declaration=True)
