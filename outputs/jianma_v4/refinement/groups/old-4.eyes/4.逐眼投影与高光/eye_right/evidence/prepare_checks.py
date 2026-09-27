from pathlib import Path
from lxml import etree as E
from copy import deepcopy
P=Path('refinement/groups/eyes/4.逐眼投影与高光/eye_right/evidence');NS='http://www.w3.org/2000/svg'
baseline=E.parse('refinement/groups/eyes/3.逐眼着色/eye_right/character.svg').getroot()
for id in ['eye_right_upper_eyelid','eye_right_upper_lashes']:
 baseline.xpath('//*[@id="'+id+'"]')[0].set('display','none')
E.ElementTree(baseline).write(str(P/'baseline-source-off-full.svg'),encoding='utf-8',xml_declaration=True)
candidate=E.parse(str(P.parent/'character.svg')).getroot()
for target in ['sclera','iris']:
 r=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672')
 for defs in candidate.xpath('//*[local-name()="defs"]'):r.append(deepcopy(defs))
 g=E.SubElement(r,'{'+NS+'}g',{'clip-path':'url(#eye_right_aperture_clip)'})
 E.SubElement(g,'{'+NS+'}use',{'href':'#eye_right_'+target+'_complete_shape','fill':'white'})
 E.ElementTree(r).write(str(P/(target+'-intersection-mask.svg')),encoding='utf-8',xml_declaration=True)
print('readback source-off baseline and surface intersection masks prepared')
