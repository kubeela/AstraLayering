from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.1.轮廓部件着色');P.mkdir(parents=True,exist_ok=True);(P/'evidence').mkdir(exist_ok=True)
SOURCE=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/character.svg')
PALETTE=Path('refinement/groups/eyes/3.眼部色盘/palette.json')
EXPECTED='314a57f9bf89580e3192adf3ab64e164aecbad520802147597ee3145e07f480e'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
samples=json.loads(PALETTE.read_text(encoding='utf-8'))
assert samples['source_sha256']==hashlib.sha256(Path('references/base-subject.png').read_bytes()).hexdigest()
colors={s['id']:s['hex'] for s in samples['samples']}
NS='http://www.w3.org/2000/svg'
S=E.parse(str(SOURCE)).getroot();r=deepcopy(S)
def get(id,tree=None):return (r if tree is None else tree).xpath('.//*[@id="'+id+'"]')[0]
eye=get('eye_right');defs=eye.find('{'+NS+'}defs')
def gradient(id,x1,x2,stops):
 g=E.SubElement(defs,'{'+NS+'}linearGradient',{'id':id,'gradientUnits':'userSpaceOnUse','x1':str(x1),'y1':'0','x2':str(x2),'y2':'0'})
 for offset,color,opacity in stops:
  E.SubElement(g,'{'+NS+'}stop',{'offset':str(offset),'stop-color':color,'stop-opacity':str(opacity)})

# Only the three requested contour surfaces are painted. No iris/lash/skin colors.
# 03 is mixed 25% into 02 because the observed cold gray may contain cast shadow.
cool=tuple(round(.75*a+.25*b) for a,b in zip(tuple(int(colors['02'][i:i+2],16) for i in (1,3,5)),tuple(int(colors['03'][i:i+2],16) for i in (1,3,5))))
cool_hex='#%02X%02X%02X'%cool
gradient('eye41_right_sclera_surface_color',405.70,431.61,[
 (0,colors['01'],1),(.175,colors['01'],1),(.23,colors['02'],1),(.66,colors['02'],1),(.75,cool_hex,1),(.815,colors['04'],1),(1,colors['04'],1)])
gradient('eye41_right_upper_lid_color',405.40,431.48,[
 (0,colors['21'],1),(.14,colors['20'],1),(.40,colors['19'],1),(.61,colors['19'],1),(.91,colors['24'],1),(1,colors['24'],.78)])
gradient('eye41_right_lower_lid_color',406.05,431.48,[
 (0,colors['22'],1),(.29,colors['23'],1),(.60,colors['23'],.86),(.79,colors['23'],.74),(.93,colors['24'],.62),(1,colors['24'],.48)])
get('eye_right_sclera_fill').set('fill','url(#eye41_right_sclera_surface_color)')
get('eye_right_upper_lid_ink').set('fill','url(#eye41_right_upper_lid_color)')
get('eye_right_lower_lid_rim').set('fill','url(#eye41_right_lower_lid_color)')
get('eye_right_highlights').set('display','none')
get('eye_right_construction_guides').set('display','none')
eye.set('data-stage','contour-coloring-4.1')
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

def variant(name,which=None,nohair=False):
 if which is not None:
  t=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672')
  if which=='eye_right':t.append(deepcopy(get(which)))
  else:
   t.append(deepcopy(defs));t.append(deepcopy(get(which)))
 else:
  t=deepcopy(r);t.set('viewBox','394 185 45 28');t.set('width','1080');t.set('height','672')
  if nohair:
   for el in t.xpath('//*[@data-kind="hair"]'):el.set('display','none')
 E.ElementTree(t).write(str(P/'evidence'/(name+'.svg')),encoding='utf-8',xml_declaration=True)
variant('nohair',nohair=True);variant('isolated-eye','eye_right');variant('complete-sclera','eye_right_sclera')
variant('upper-lid','eye_right_upper_eyelid');variant('lower-lid','eye_right_lower_eyelid')

saved=E.parse(str(P/'character.svg')).getroot();before={e.get('id'):e for e in S.iter() if e.get('id')};after={e.get('id'):e for e in saved.iter() if e.get('id')}
geometry=['d','cx','cy','rx','ry','x','y','x1','x2','y1','y2','transform','clip-path','clipPathUnits','fill-rule','stroke-width']
changes=[];changed_attributes=[]
for id,e in before.items():
 for key in set(e.attrib)|set(after[id].attrib):
  if e.get(key)!=after[id].get(key):
   info={'id':id,'attribute':key,'before':e.get(key),'after':after[id].get(key)}
   changed_attributes.append(info)
   if key in geometry:changes.append(info)
ids=[e.get('id') for e in saved.iter() if e.get('id')];refs=[]
for e in saved.iter():
 for key,val in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',val)
  if key=='href' and val.startswith('#'):refs.append(val[1:])
untouched=['eye_right_iris','eye_right_pupil','eye_right_upper_lashes','eye_right_lower_lashes','eye_right_eyelid_skin']
audit={
 'input_svg':str(SOURCE),'input_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),
 'palette_json_sha256':hashlib.sha256(PALETTE.read_bytes()).hexdigest(),
 'plan_sha256':hashlib.sha256(Path('refinement/groups/eyes/1.制作计划/plan.json').read_bytes()).hexdigest(),
 'frozen_geometry_changes':changes,'existing_node_attribute_changes':changed_attributes,
 'non_eye_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,saved) if a.get('id')!='eye_right'),
 'deferred_parts_xml_unchanged':{id:E.tostring(before[id])==E.tostring(after[id]) for id in untouched},
 'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'unresolved_references':sorted(set(refs)-set(ids)),
 'guides_display':after['eye_right_construction_guides'].get('display'),'highlight_display':after['eye_right_highlights'].get('display'),
 'new_mask_count':len(saved.xpath('//*[local-name()="mask"]'))-len(S.xpath('//*[local-name()="mask"]')),
 'new_effect_count':len(saved.xpath('//*[@data-effect]'))-len(S.xpath('//*[@data-effect]')),
 'eye_layer_index':list(saved).index(after['eye_right']),'hair_front_indexes':[list(saved).index(after['hair_front_right']),list(saved).index(after['hair_front_left'])],
 'sclera_cool_mix':{'02':colors['02'],'03':colors['03'],'weight_03':.25,'result':cool_hex}}
(P/'evidence/audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
