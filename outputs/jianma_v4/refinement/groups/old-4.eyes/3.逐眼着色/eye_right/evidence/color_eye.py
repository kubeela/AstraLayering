from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/eyes/3.逐眼着色/eye_right')
SOURCE=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/character.svg')
expected='314a57f9bf89580e3192adf3ab64e164aecbad520802147597ee3145e07f480e'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==expected
S=E.parse(str(SOURCE)).getroot(); r=deepcopy(S)
NS='http://www.w3.org/2000/svg'
eye=r.xpath('//*[@id="eye_right"]')[0]
defs=eye.find('{'+NS+'}defs')
def get(id):return r.xpath('//*[@id="'+id+'"]')[0]
def add(xml):
 e=E.fromstring(('<'+xml.split('<',1)[1]).encode())
 defs.append(e);return e
def node(tag,**attrs):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def gradient(id,tag,attrs,stops):
 g=node(tag,id=id,**attrs)
 for t,color,op in stops:g.append(node('stop',offset=t,stop_color=color,stop_opacity=op))
 defs.append(g);return g

# Base color recovery: no cast shadows, no independent highlight, no guides.
eye.set('data-stage','clean-eye-color')
get('eye_right_sclera_fill').set('fill','#F8EDF3')
get('eye_right_iris_fill').set('fill','#86A8D0')
get('eye_right_pupil_fill').set('fill','#3A5680')
get('eye_right_upper_lid_ink').set('fill','#241A28')
get('eye_right_lower_lid_rim').set('fill','#B58D96')
get('eye_right_upper_lash_sweep').set('fill','#191522')
get('eye_right_upper_lash_outer_taper').set('fill','#191522')
get('eye_right_lower_lash_outer_root').set('fill','#91626F')
get('eye_right_upper_fold').set('stroke','#BE929A')
get('eye_right_upper_fold').set('opacity','0.66')
get('eye_right_highlights').set('display','none')
get('eye_right_highlights').set('data-effect','highlight')
get('eye_right_construction_guides').set('display','none')
base=deepcopy(r)
E.ElementTree(base).write(str(P/'基础色恢复点.svg'),encoding='utf-8',xml_declaration=True)

# The original eye uses a cool blue stroma with warmer sclera and liners.
# The bright lower blue is a continuous material color, not a white light shape.
gradient('eye3_right_sclera_color','linearGradient',{'gradientUnits':'userSpaceOnUse','x1':'406','y1':'199','x2':'432','y2':'200'},[
 ('0','#F6E7EF',1),('.22','#FCF1F7',1),('.64','#F6EDF5',1),('1','#F3E1E7',1)])
gradient('eye3_right_iris_color','linearGradient',{'gradientUnits':'userSpaceOnUse','x1':'418','y1':'189.57','x2':'418','y2':'203.93'},[
 ('0','#718FB8',1),('.24','#6B88B2',1),('.43','#7699C3',1),('.64','#88ACD3',1),('.80','#A8C8E9',1),('.91','#BED6F2',1),('1','#9FB2D1',1)])
gradient('eye3_right_iris_side_depth','linearGradient',{'gradientUnits':'userSpaceOnUse','x1':'410.56','y1':'0','x2':'425.8','y2':'0'},[
 ('0','#4F6394','.66'),('.12','#5773A0','.38'),('.32','#6384B3','0'),('.70','#6A85B0','0'),('.90','#5771A0','.32'),('1','#4A608C','.62')])
gradient('eye3_right_pupil_color','linearGradient',{'gradientUnits':'userSpaceOnUse','x1':'418','y1':'193.48','x2':'418','y2':'199.92'},[
 ('0','#273B61',1),('.35','#2D456F',1),('.72','#3D5C89',1),('1','#577BAB',1)])
gradient('eye3_right_upper_liner_color','linearGradient',{'gradientUnits':'userSpaceOnUse','x1':'404','y1':'196','x2':'432','y2':'201'},[
 ('0','#1A1522',1),('.25','#12101C',1),('.58','#1B1522',1),('.83','#583645',1),('1','#986068',1)])
gradient('eye3_right_lower_liner_color','linearGradient',{'gradientUnits':'userSpaceOnUse','x1':'406','y1':'0','x2':'432','y2':'0'},[
 ('0','#895865',1),('.27','#B28791',1),('.63','#C5A3AE',1),('1','#DAB9BA',1)])
gradient('eye3_right_lower_lash_color','linearGradient',{'gradientUnits':'userSpaceOnUse','x1':'406','y1':'198','x2':'411','y2':'203'},[
 ('0','#795063',1),('.6','#95616E',1),('1','#B88992',1)])
get('eye_right_sclera_fill').set('fill','url(#eye3_right_sclera_color)')
get('eye_right_iris_fill').set('fill','url(#eye3_right_iris_color)')
iris_layer=node('use',id='eye_right_iris_intrinsic_side_depth',href='#eye_right_iris_complete_shape',fill='url(#eye3_right_iris_side_depth)',data_role='intrinsic-iris-color')
get('eye_right_iris').append(iris_layer)
get('eye_right_pupil_fill').set('fill','url(#eye3_right_pupil_color)')
get('eye_right_upper_lid_ink').set('fill','url(#eye3_right_upper_liner_color)')
get('eye_right_upper_lash_sweep').set('fill','url(#eye3_right_upper_liner_color)')
get('eye_right_upper_lash_outer_taper').set('fill','url(#eye3_right_upper_liner_color)')
get('eye_right_lower_lid_rim').set('fill','url(#eye3_right_lower_liner_color)')
get('eye_right_lower_lash_outer_root').set('fill','url(#eye3_right_lower_lash_color)')
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

for name,t,mode in [('color-nohair',r,'nohair'),('color-isolated',r,'isolated'),('base-isolated',base,'isolated')]:
 t=deepcopy(t)
 if mode=='nohair':
  for e in t.xpath('//*[@data-kind="hair"]'):e.set('display','none')
 else:
  for e in list(t):
   if E.QName(e).localname not in ('defs','title','desc') and e.get('id')!='eye_right':t.remove(e)
 t.set('viewBox','394 185 45 28');t.set('width','1080');t.set('height','672')
 E.ElementTree(t).write(str(P/'evidence'/(name+'.svg')),encoding='utf-8',xml_declaration=True)

saved=E.parse(str(P/'character.svg')).getroot()
before={e.get('id'):e for e in S.iter() if e.get('id')}
after={e.get('id'):e for e in saved.iter() if e.get('id')}
geokeys=['d','cx','cy','rx','ry','x','y','x1','x2','y1','y2','width','height','transform','clip-path','clipPathUnits','fill-rule','stroke-width']
geometry_changes=[]
for id,e in before.items():
 if id not in after:geometry_changes.append({'id':id,'missing':True});continue
 for k in geokeys:
  if e.get(k)!=after[id].get(k):geometry_changes.append({'id':id,'attr':k,'before':e.get(k),'after':after[id].get(k)})
ids=[e.get('id') for e in saved.iter() if e.get('id')]
refs=[]
for e in saved.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
audit={'approved_line_art_sha256':expected,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),
 'base_recovery_sha256':hashlib.sha256((P/'基础色恢复点.svg').read_bytes()).hexdigest(),
 'frozen_geometry_attribute_changes':geometry_changes,
 'all_non_eye_top_level_nodes_unchanged':all(E.tostring(e)==E.tostring(f) for e,f in zip(S,saved) if e.get('id')!='eye_right'),
 'duplicate_ids':sorted({x for x in ids if ids.count(x)>1}),'broken_refs':sorted(set(refs)-set(ids)),
 'highlight_display':after['eye_right_highlights'].get('display'),'guides_display':after['eye_right_construction_guides'].get('display'),
 'new_masks':len(saved.xpath('//*[local-name()="mask"]'))-len(S.xpath('//*[local-name()="mask"]')),
 'eye_layer_index':list(saved).index(after['eye_right']),
 'hair_front_layer_indexes':[list(saved).index(after['hair_front_right']),list(saved).index(after['hair_front_left'])]}
(P/'evidence/audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
