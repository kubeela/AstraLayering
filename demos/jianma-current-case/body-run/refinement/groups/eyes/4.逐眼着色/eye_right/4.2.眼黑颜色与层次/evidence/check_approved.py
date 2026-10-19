from pathlib import Path
from lxml import etree as E
import hashlib,json
p=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.2.眼黑颜色与层次')
a=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/character.svg')
assert hashlib.sha256(a.read_bytes()).hexdigest()=='314a57f9bf89580e3192adf3ab64e164aecbad520802147597ee3145e07f480e'
approved=E.parse(str(a)).getroot();candidate=E.parse(str(p/'character.svg')).getroot();lookup={e.get('id'):e for e in candidate.iter() if e.get('id')}
keys=['d','cx','cy','rx','ry','x','y','transform','clip-path','clipPathUnits','fill-rule','stroke-width'];changes=[]
for e in approved.iter():
 if not e.get('id'):continue
 for k in keys:
  if e.get(k)!=lookup[e.get('id')].get(k):changes.append({'id':e.get('id'),'attr':k})
report=json.loads((p/'evidence/audit.json').read_text(encoding='utf-8'));report['approved_line_art_sha256']=hashlib.sha256(a.read_bytes()).hexdigest();report['frozen_geometry_changes_against_approved_line_art']=changes
(p/'evidence/audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print({'direct_approved_geometry_changes':changes,'candidate_sha256':hashlib.sha256((p/'character.svg').read_bytes()).hexdigest()})
