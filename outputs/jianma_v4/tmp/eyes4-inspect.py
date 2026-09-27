import json
from lxml import etree as E
p=json.load(open('refinement/groups/eyes/1.眼部色盘/palette.json',encoding='utf-8'))
print(json.dumps([s for s in p['samples'] if s['role'] in ('skin','comparison')],ensure_ascii=False,indent=2))
r=E.parse('refinement/groups/eyes/3.关联部件校准/character.svg')
for id in ['face_clean_skin_clip','face6_surface_face_base','blush_right','blush_left']:
 print(E.tostring(r.xpath('.//*[@id=$id]',id=id)[0],encoding='unicode'))
