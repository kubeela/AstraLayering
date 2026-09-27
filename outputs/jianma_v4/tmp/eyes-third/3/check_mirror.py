from pathlib import Path
from copy import deepcopy
from lxml import etree as ET
import re,json,hashlib
ROOT=Path(__file__).resolve().parents[3];P=Path(__file__).resolve().parent
SRC=ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.4.关联遮挡与线稿校准/character.svg'
doc=ET.parse(str(SRC));root=doc.getroot();ns={'s':'http://www.w3.org/2000/svg'}
plan=json.loads((ROOT/'refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'))
assert plan['eyes_symmetric'] is True and plan['mirror']['axis']==[[443,180],[443,220]]
assert hashlib.sha256((ROOT/'references/base-subject.png').read_bytes()).hexdigest()==plan['reference_sha256']
def rename(el):
 for e in el.iter():
  for k,v in list(e.attrib.items()):e.set(k,v.replace('eye_left','eye_right'))
  if e.text:e.text=e.text.replace('角色左眼（画面右）','角色右眼（画面左）')
 return el
defs=root.find('s:defs',ns)
for child in list(defs):
 if (child.get('id') or '').startswith('eye_left'):
  defs.append(rename(deepcopy(child)))
left=root.xpath('//*[@id="eye_left"]')[0];right=root.xpath('//*[@id="eye_right"]')[0]
mirrored=rename(deepcopy(left));mirrored.set('transform','matrix(-1 0 0 1 886 0)');mirrored.set('data-diagnostic','strict-plan-mirror-before-assembly')
right.getparent().replace(right,mirrored)
# This diagnostic checks only the complete eye body against reference before committing an assembly.
# Actual target hair is kept; the target cross-layer lash setup will be resolved only after plan consistency.
def save(name,box,size):
 r=deepcopy(root);r.set('viewBox',' '.join(map(str,box)));r.set('width',str(size[0]));r.set('height',str(size[1]));(P/(name+'.svg')).write_bytes(ET.tostring(r,xml_declaration=True,encoding='utf-8'))
save('strict-mirror-right-native',(393,184,44,30),(44,30))
save('strict-mirror-right-direct-30x',(393,184,44,30),(1320,900))
save('strict-mirror-eyes-native',(390,175,109,47),(109,47))
save('strict-mirror-eyes-direct-12x',(390,175,109,47),(1308,564))
print('Saved strict plan mirror diagnostics only; no output candidate committed.')
