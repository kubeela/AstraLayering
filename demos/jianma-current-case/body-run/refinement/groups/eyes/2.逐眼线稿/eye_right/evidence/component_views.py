from pathlib import Path
from lxml import etree as ET
from copy import deepcopy
P=Path('refinement/groups/eyes/2.逐眼线稿/eye_right')
S=ET.parse(str(P/'character.svg')).getroot()
NS='http://www.w3.org/2000/svg'
for name, target in [('sclera','eye_right_sclera'),('gaze','eye_right_gaze'),('upper_lashes','eye_right_upper_lashes'),('lower_lashes','eye_right_lower_lashes'),('eye_clean','eye_right')]:
 r=ET.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672')
 for defs in S.xpath('//*[local-name()="defs"]'):
  r.append(deepcopy(defs))
 r.append(deepcopy(S.xpath('//*[@id="'+target+'"]')[0]))
 if name=='eye_clean':
  for defs in r[-1].xpath('.//*[local-name()="defs"]'):
   defs.getparent().remove(defs)
 ET.ElementTree(r).write(str(P/'evidence'/(name+'.svg')),encoding='utf-8',xml_declaration=True)
print('component SVGs created')
