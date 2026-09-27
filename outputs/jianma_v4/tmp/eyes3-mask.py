from pathlib import Path
from lxml import etree as E
r=E.parse('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/character.svg');root=r.getroot();ns='http://www.w3.org/2000/svg'
for el in list(root):
 if el.tag not in ['{'+ns+'}defs','{'+ns+'}title','{'+ns+'}desc'] and el.get('id') not in ['hair_front_right','hair_front_left','hair_side_right','hair_side_left']:root.remove(el)
r.write('refinement/groups/eyes/3.关联部件校准/evidence/hair-before.svg',encoding='utf-8',xml_declaration=True)
