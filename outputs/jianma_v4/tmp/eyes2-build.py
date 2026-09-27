from pathlib import Path
from lxml import etree as ET
import json
rootdir=Path.cwd()
source=rootdir/'refinement/groups/face/6.投影与高光效果/character.svg'
out=rootdir/'refinement/groups/eyes/2.眼型校准与轮廓部件绘制'
ns='http://www.w3.org/2000/svg'
q=lambda name:'{'+ns+'}'+name
parser=ET.XMLParser(remove_blank_text=False)
tree=ET.parse(str(source),parser);root=tree.getroot();defs=root.find(q('defs'))
E=lambda tag,**kw:ET.Element(q(tag),{k.replace('_','-'):str(v) for k,v in kw.items()})
shapes={
'eye_right':{
 'title':'角色右眼（画面左） · 校准轮廓',
 'white':'M 403.65,198.05 C 404.25,194.55 407.45,193.35 412.3,193.5 C 420.0,193.3 426.7,196.75 431.25,201.7 C 427.0,201.0 424.6,203.7 419.5,204.2 C 412.5,204.95 406.9,202.7 404.1,199.6 C 403.85,199.0 403.7,198.5 403.65,198.05 Z',
 'upper':'M 403.6,198.95 C 403.85,194.85 406.5,192.7 411.7,192.7 C 419.9,192.25 427.4,196.05 431.4,201.75 C 428.6,199.7 426.35,198.4 423.85,197.5 C 419.75,195.95 415.2,195.25 411.0,195.45 C 407.2,195.25 404.7,196.65 403.6,198.95 Z',
 'lower':'M 404.0,198.2 C 405.45,201.5 408.55,203.75 413.6,204.35 C 419.55,205.2 424.55,203.15 428.65,202.0 C 423.95,202.8 419.95,204.0 414.9,203.65 C 409.8,203.5 406.15,201.25 404.95,198.15 Z',
 'lowerColor':'#957680','sclera':'#F7F5FB','upperColor':'#090815',
 'iris':'M 409.95,197.8 C 409.9,192.65 412.95,190.85 417.15,190.85 C 421.45,190.85 424.15,193.3 424.2,197.65 C 424.25,202.25 421.4,204.45 417.25,204.45 C 413.15,204.45 410.05,202.15 409.95,197.8 Z',
 'irisColor':'#5C7EA8'},
'eye_left':{
 'title':'角色左眼（画面右） · 校准轮廓',
 'white':'M 455.3,201.7 C 459.55,196.8 465.5,193.95 472.2,193.5 C 477.95,193.15 482.9,194.25 485.0,197.3 C 484.45,200.3 480.45,202.95 476.4,204.0 C 471.05,205.2 466.3,204.0 462.7,202.25 C 460.3,201.45 457.9,201.15 455.3,201.7 Z',
 'upper':'M 455.2,201.8 C 459.5,196.1 465.55,192.9 472.75,192.6 C 478.8,192.05 483.3,193.45 485.25,196.9 L 484.15,198.35 C 481.75,195.9 478.15,195.25 474.0,195.4 C 468.0,195.25 462.65,197.0 458.5,199.55 C 457.3,200.3 456.25,201.05 455.2,201.8 Z',
 'lower':'M 460.65,202.3 C 465.65,203.8 470.1,204.85 475.05,204.6 C 480.0,204.15 483.95,201.35 485.0,198.1 L 483.7,197.95 C 482.35,200.85 478.9,202.95 474.5,203.6 C 469.95,204.3 465.55,203.15 460.65,202.3 Z',
 'lowerColor':'#9F7783','sclera':'#FCF5F5','upperColor':'#201F2B',
 'iris':'M 463.5,197.55 C 463.5,193.1 466.15,190.55 470.55,190.55 C 474.55,190.55 477.35,193.0 477.35,197.5 C 477.35,202.15 474.35,204.65 470.6,204.65 C 466.3,204.65 463.5,202.1 463.5,197.55 Z',
 'irisColor':'#A2C5E6'}
}
for part,s in shapes.items():
 old=root.xpath('.//s:g[@id=$i]',namespaces={'s':ns},i=part)[0]
 eye=E('g',id=part,data_part=part,data_kind='eyes')
 title=E('title');title.text=s['title'];eye.append(title)
 def group(name,role,category):
  g=E('g',id=part+'_'+name,data_part=part,data_kind='eyes',data_role=role,data_category=category);eye.append(g);return g
 sclera=group('sclera','sclera','contour')
 sclera.append(E('path',id=part+'_sclera_shape',d=s['white'],fill=s['sclera']))
 cp=E('clipPath',id=part+'_sclera_clip',clipPathUnits='userSpaceOnUse')
 cp.append(E('use',href='#'+part+'_sclera_shape'));defs.append(cp)
 interior=group('interior','clipped-eye-interior','interior');interior.set('clip-path','url(#'+part+'_sclera_clip)')
 black=E('g',id=part+'_eye_black',data_part=part,data_kind='eyes',data_role='eye-black-base',data_status='awaiting-step-3')
 black.append(E('path',id=part+'_eye_black_shape',d=s['iris'],fill=s['irisColor']));interior.append(black)
 lower=group('lower_eyelid','lower-eyelid','contour');lower.append(E('path',id=part+'_lower_eyelid_shape',d=s['lower'],fill=s['lowerColor']))
 upper=group('upper_eyelid','upper-eyelid','contour');upper.append(E('path',id=part+'_upper_eyelid_shape',d=s['upper'],fill=s['upperColor']))
 eye.tail=old.tail;old.getparent().replace(old,eye)
root.find(q('title')).text='剑妈 · 完整分层稿 · eyes 第2步眼型与轮廓'
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True,pretty_print=False)
# Derive QA variants from the SAVED output, without touching the deliverable.
for mode in ['no-eye-black','no-eyes','contours-only']:
 qa=ET.parse(str(out/'character.svg'),parser);qr=qa.getroot()
 if mode=='no-eye-black':
  for el in qr.xpath('.//s:g[@data-role="eye-black-base"]',namespaces={'s':ns}):el.set('display','none')
 elif mode=='no-eyes':
  for el in qr.xpath('.//s:g[@data-kind="eyes"]',namespaces={'s':ns}):el.set('display','none')
 else:
  for el in list(qr):
   if el.tag not in [q('defs'),q('title')] and el.get('data-kind')!='eyes':qr.remove(el)
  for el in qr.xpath('.//s:g[@data-category="interior"]',namespaces={'s':ns}):el.set('display','none')
 qa.write(str(out/'evidence'/f'{mode}.svg'),encoding='utf-8',xml_declaration=True)
# Exact element-level preservation of all non-eye top-level layers and pre-existing resources.
src=ET.parse(str(source),parser).getroot()
new=ET.parse(str(out/'character.svg'),parser).getroot()
unchanged=[]
for index,old in enumerate(src):
 if old.tag in [q('defs'),q('title')] or old.get('data-kind')=='eyes':continue
 target=new.xpath('./*[@id=$i]',i=old.get('id')) if old.get('id') else [new[index]]
 assert len(target)==1 and ET.tostring(old)==ET.tostring(target[0]),old.get('id')
 unchanged.append(old.get('id'))
for old in src.find(q('defs')):
 target=new.xpath('./s:defs/*[@id=$i]',namespaces={'s':ns},i=old.get('id'))
 assert len(target)==1 and ET.tostring(old)==ET.tostring(target[0]),old.get('id')
ids=[e.get('id') for e in new.iter() if e.get('id')]
assert len(ids)==len(set(ids))
for part in shapes:
 assert len(new.xpath('.//*[@id=$i]',i=part+'_sclera_shape'))==1
 use=new.xpath('.//*[@id=$i]/*',i=part+'_sclera_clip')[0]
 assert use.get('href')=='#'+part+'_sclera_shape'
 shape=new.xpath('.//*[@id=$i]',i=part+'_sclera_shape')[0]
 assert shape.get('d').upper().count('M')==1 and shape.get('d').endswith('Z')
 assert len(new.xpath('.//*[@id=$i]/*',i=part+'_eye_black'))==1
summary={'non_eye_layers_preserved':len(unchanged),'non_eye_layer_ids':unchanged,'original_defs_preserved':len(src.find(q('defs'))),'ids':len(ids),'unique_ids':len(set(ids)),'independent_sclera_clips_valid':True,'one_closed_sclera_surface_per_eye':True,'reference_canvas':[941,1672],'comparison_crop':[390,178,496,214]}
(out/'evidence'/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False))


