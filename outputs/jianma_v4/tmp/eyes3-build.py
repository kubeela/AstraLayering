from pathlib import Path
from lxml import etree as E
import json
source=Path('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/character.svg')
out=Path('refinement/groups/eyes/3.关联部件校准');e=out/'evidence'
parser=E.XMLParser(remove_blank_text=False);tree=E.parse(str(source),parser);r=tree.getroot();ns={'s':'http://www.w3.org/2000/svg'}
get=lambda i:r.xpath('.//*[@id=$i]',i=i)[0]
rpath=get('hair_front_right').find('s:path',ns)
old='C 400,207 406.7,189.6 410,176.8 C 413.8,163.4 419,150.6 430.4,152.4'
new='C 395.7,210.8 399.0,207.2 401.7,203.4 C 404.3,199.5 406.1,194.6 407.65,189.5 C 408.75,185.4 409.95,181.1 411.1,176.8 C 414.3,163.4 419,150.6 430.4,152.4'
assert old in rpath.get('d');rpath.set('d',rpath.get('d').replace(old,new))
lpath=get('hair_front_left').find('s:path',ns)
old='C 486.8,204.5 481.9,190.1 478.5,177.3'
new='C 490.5,209.8 487.2,205.3 485.0,201.0 C 483.9,198.8 483.1,196.0 482.4,193.0 C 481.4,188.9 480.6,182.5 478.5,177.3'
assert old in lpath.get('d');lpath.set('d',lpath.get('d').replace(old,new))
get('fx_hair_front_right_editable_path').set('d','M 443.5,161.5 C 438,155 435,153 430.4,152.8 C 418.8,151 414.6,164.4 411.45,177 C 410.3,182.4 409.2,187.9 407.7,192.8 C 406.1,198.0 404.2,202.4 401.9,205.4')
get('fx_hair_front_left_editable_path').set('d','M 444,161.8 C 448.1,157.7 453.6,153 459,152.8 C 469,150.7 474.7,162.2 478.7,177.6 C 480.75,182.8 481.6,189.2 482.6,193.3 C 483.5,197.3 484.5,200.4 486.0,203.0 C 488.2,206.7 490.3,208.9 492.5,210')
r.find('s:title',ns).text='剑妈 · 完整分层稿 · eyes 第3步关联部件校准'
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
# Evidence variants derive from saved SVG.
for mode in ['no-front-hair','no-front-hair-and-cast-shadows','hair-after']:
 t=E.parse(str(out/'character.svg'),parser);root=t.getroot()
 if mode.startswith('no-front'):
  for el in root.xpath('.//*[@id="hair_front_left" or @id="hair_front_right"]'):el.set('display','none')
  if mode.endswith('cast-shadows'):
   for el in root.xpath('.//*[@id="fx_hair_front_left_on_face" or @id="fx_hair_front_right_on_face"]'):el.set('display','none')
 else:
  for el in list(root):
   if el.tag not in ['{'+ns['s']+'}defs','{'+ns['s']+'}title','{'+ns['s']+'}desc'] and el.get('id') not in ['hair_front_right','hair_front_left','hair_side_right','hair_side_left']:root.remove(el)
 t.write(str(e/f'{mode}.svg'),encoding='utf-8',xml_declaration=True)
# Verify no changes outside the two hair contours and their related effect paths.
src=E.parse(str(source),parser).getroot();target=E.parse(str(out/'character.svg'),parser).getroot()
changed=[];same=[]
for a,b in zip(src,target):
 if E.tostring(a)!=E.tostring(b):changed.append(a.get('id') or a.tag.split('}')[-1])
 else:same.append(a.get('id') or a.tag.split('}')[-1])
assert changed==['title','fx_hair_front_right_on_face','fx_hair_front_left_on_face','hair_front_right','hair_front_left'],changed
assert E.tostring(src.find('s:defs',ns))==E.tostring(target.find('s:defs',ns))
for part in ['eye_left','eye_right']:
 a=src.xpath('.//*[@id=$i]',i=part)[0];b=target.xpath('.//*[@id=$i]',i=part)[0];assert E.tostring(a)==E.tostring(b)
ids=[el.get('id') for el in target.iter() if el.get('id')];assert len(ids)==len(set(ids))
summary={'changed_top_level_elements':changed,'unchanged_top_level_elements':same,'all_existing_defs_unchanged':True,'entire_eye_groups_unchanged':True,'unique_ids':len(ids),'new_ids':0,'canvas':[941,1672]}
(e/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))
