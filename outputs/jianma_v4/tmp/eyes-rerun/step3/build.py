from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import json,re,hashlib
src=Path('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/character.svg')
out=Path('refinement/groups/eyes/3.关联部件校准');out.mkdir(parents=True,exist_ok=True)
tmp=Path('tmp/eyes-rerun/step3')
tree=E.parse(str(src));r=tree.getroot();ns=r.nsmap[None]
def byid(id): return r.xpath('//*[@id=$id]',id=id)[0]
right=byid('hair_front_right')[1]
right.set('d',right.get('d').replace('C 400,207 406.7,189.6 410,176.8','C 402,214 405.65,202 407.6,193.1 C 408.6,187.4 409.2,181.8 410,176.8'))
left=byid('hair_front_left')[1]
left.set('d',left.get('d').replace('C 486.8,204.5 481.9,190.1 478.5,177.3','C 486.4,209.5 482.65,203 481,193 C 480,186.9 479.4,181.6 478.5,177.3'))
byid('fx_hair_front_right_editable_path').set('d','M 443.5,161.5 C 438,155 435,153 430.4,152.8 C 418.8,151 414.2,164.4 410.5,177 C 409.8,182.5 409.5,188 408.1,193.5 C 406.6,201 404.7,207.5 400.5,211.9')
byid('fx_hair_front_left_editable_path').set('d','M 444,161.8 C 448.1,157.7 453.6,153 459,152.8 C 469,150.7 474.7,162.2 478.7,177.6 C 479.5,182.2 480.15,187.8 481.2,193.6 C 482.65,201.9 486.9,209.7 492.9,212.3')
r.find('{'+ns+'}title').text='剑妈 · 完整分层稿 · eyes 第3步关联部件校准'
r.set('data-refinement-step','3')
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
h=deepcopy(r)
for id in ['hair_front_right','hair_front_left','fx_hair_front_right_on_face','fx_hair_front_left_on_face']:
 h.xpath('//*[@id=$id]',id=id)[0].set('display','none')
E.ElementTree(h).write(str(tmp/'front-hair-off.svg'),encoding='utf-8',xml_declaration=True)
ids=[n.get('id') for n in r.iter() if n.get('id')];assert len(ids)==len(set(ids))
refs=[]
for n in r.iter():
 for a,v in n.attrib.items():
  refs+=re.findall(r'url\(#([^)]*)\)',v)
  if a.endswith('href') and v.startswith('#'):refs.append(v[1:])
assert set(refs)<=set(ids)
s=E.parse(str(src)).getroot()
changed=[]
for n in s:
 if E.QName(n).localname!='g':continue
 newer=byid(n.get('id'))
 if E.tostring(n)!=E.tostring(newer):changed.append(n.get('id'))
assert set(changed)=={'hair_front_right','hair_front_left','fx_hair_front_right_on_face','fx_hair_front_left_on_face'},changed
for part in ['eye_left','eye_right','brow_left','brow_right','nose','face_base']:
 assert E.tostring(s.xpath('//*[@id=$id]',id=part)[0])==E.tostring(byid(part))
for part in ['hair_front_left','hair_front_right']:
 assert byid(part).get('data-part')==part and byid(part).get('data-kind')=='hair'
report={'source':str(src),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256((out/'character.svg').read_bytes()).hexdigest(),'changed_top_level_ids':changed,'eye_groups_unchanged':True,'brows_nose_face_base_unchanged':True,'definitions_unchanged':E.tostring(s.find('{'+ns+'}defs'))==E.tostring(r.find('{'+ns+'}defs')),'ids_unique':True,'references_resolve':True,'all_other_groups_unchanged':True,'eye_crop':[390,178,110,41],'eye_direct_svg_scale':12,'head_crop':[300,0,290,295],'head_direct_svg_scale':2}
(tmp/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
