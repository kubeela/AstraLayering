from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.2.眼黑颜色与层次');P.mkdir(parents=True,exist_ok=True);(P/'evidence').mkdir(exist_ok=True)
SOURCE=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.1.轮廓部件着色/character.svg')
EXPECTED='99f1ac47a4da4ca2268dcac6821cff8d31b9d8eef8380bdab891a2d9aea88755'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
palette=json.loads(Path('refinement/groups/eyes/3.眼部色盘/palette.json').read_text(encoding='utf-8'));c={s['id']:s['hex'] for s in palette['samples']}
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();r=deepcopy(S)
def el(tag,**attrs):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def get(id,tree=None):return (r if tree is None else tree).xpath('.//*[@id="'+id+'"]')[0]
eye=get('eye_right');defs=eye.find('{'+NS+'}defs');iris=get('eye_right_iris');pupil=get('eye_right_pupil')
get('eye_right_iris_fill').set('fill',c['13']);get('eye_right_pupil_fill').set('fill',c['11'])
eye.set('data-stage','eye-black-base-4.2')
base=deepcopy(r);E.ElementTree(base).write(str(P/'基础色恢复点.svg'),encoding='utf-8',xml_declaration=True)
eye.set('data-stage','eye-black-color-layers-4.2')

def linear(id,y1,y2,stops):
 g=el('linearGradient',id=id,gradientUnits='userSpaceOnUse',x1='0',y1=y1,x2='0',y2=y2)
 for t,color,op in stops:g.append(el('stop',offset=t,stop_color=color,stop_opacity=op))
 defs.append(g)
def radial(id,cx,cy,rx,ry,stops):
 g=el('radialGradient',id=id,gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for t,color,op in stops:g.append(el('stop',offset=t,stop_color=color,stop_opacity=op))
 defs.append(g)
for name,shape in [('iris','eye_right_iris_complete_shape')]:
 cl=el('clipPath',id='eye42_right_'+name+'_material_clip',clipPathUnits='userSpaceOnUse');cl.append(el('use',href='#'+shape));defs.append(cl)
for id,std in [('eye42_right_local_soft','0.38'),('eye42_right_edge_soft','0.32')]:
 f=el('filter',id=id,x='-35%',y='-35%',width='170%',height='170%',color_interpolation_filters='sRGB');f.append(el('feGaussianBlur',stdDeviation=std));defs.append(f)

linear('eye42_right_vertical_color',189.57,203.93,[
 (0,c['05'],1),(.34,c['05'],1),(.44,c['05'],1),(.55,c['10'],1),(.657,c['09'],1),(.795,c['16'],1),(.866,c['18'],1),(1,'#9FB4D6',1)])
radial('eye42_right_center_color',418.08,197.4,4.8,3.8,[
 (0,c['12'],.86),(.42,c['12'],.72),(.72,c['10'],.35),(1,c['10'],0)])
linear('eye42_right_left_band_color',198.25,202.9,[
 (0,c['09'],.36),(.33,c['15'],.76),(.64,c['15'],.92),(1,c['18'],.16)])
linear('eye42_right_right_band_color',198.10,203.0,[
 (0,c['14'],.30),(.25,c['14'],.92),(.60,c['17'],.88),(1,c['17'],.10)])
linear('eye42_right_left_edge_color',193.8,203.6,[
 (0,c['05'],.92),(.43,c['08'],.92),(.72,c['08'],.57),(1,c['13'],.14)])
linear('eye42_right_right_edge_color',194.4,203.6,[
 (0,c['07'],.97),(.51,c['13'],.96),(.76,c['13'],.67),(1,c['13'],.12)])
linear('eye42_right_pupil_vertical_color',193.48,199.92,[
 (0,c['06'],1),(.52,c['11'],1),(.80,c['12'],1),(1,c['10'],1)])
radial('eye42_right_pupil_periphery_color',417.45,196.70,3.38,3.35,[
 (0,c['12'],0),(.43,c['12'],0),(.71,c['12'],.18),(1,c['10'],.72)])

layers=[]
def full_layer(parent,id,surface,gradient,role):
 g=el('g',id=id,data_role=role,data_kind='eyes',data_part='eye_right');g.append(el('use',id=id+'_field',href='#'+surface,fill='url(#'+gradient+')'));parent.append(g);layers.append(id);return g
def local_layer(id,path,gradient,role,soft='eye42_right_local_soft'):
 g=el('g',id=id,data_role=role,data_kind='eyes',data_part='eye_right',clip_path='url(#eye42_right_iris_material_clip)')
 g.append(el('path',id=id+'_shape',d=path,fill='url(#'+gradient+')',filter='url(#'+soft+')'));iris.append(g);layers.append(id);return g
full_layer(iris,'eye_right_iris_vertical_tones','eye_right_iris_complete_shape','eye42_right_vertical_color','iris-material-vertical-tones')
local_layer('eye_right_iris_center_transition','M 414.08,192.90 C 416.77,191.55 420.59,192.20 422.18,194.40 C 423.78,196.49 423.34,199.02 420.95,200.36 C 418.98,201.42 415.89,200.88 414.39,198.71 C 413.13,196.79 413.05,194.42 414.08,192.90 Z','eye42_right_center_color','iris-material-pupil-surround')
local_layer('eye_right_iris_left_lower_band','M 411.87,198.42 C 412.12,199.79 413.16,201.26 414.52,202.07 C 415.10,202.42 415.92,202.57 416.68,202.65 C 415.82,201.86 415.42,201.21 415.03,200.22 C 414.45,199.07 413.72,198.58 412.86,198.22 Z','eye42_right_left_band_color','iris-material-left-lower-blue-band')
local_layer('eye_right_iris_right_local_band','M 420.41,198.19 C 421.21,198.80 422.04,198.73 422.80,198.28 C 423.16,199.62 422.65,200.91 421.61,201.81 C 420.63,202.36 419.75,202.64 418.90,202.53 C 419.98,201.55 420.44,200.31 420.41,198.19 Z','eye42_right_right_band_color','iris-material-right-blue-lobe')
local_layer('eye_right_iris_left_peripheral_depth','M 414.12,190.37 C 409.07,192.61 409.57,200.12 414.02,203.46 L 414.91,202.44 C 412.69,200.85 411.74,197.42 412.76,194.17 C 413.15,192.67 413.83,191.42 414.12,190.37 Z','eye42_right_left_edge_color','iris-material-left-peripheral-depth','eye42_right_edge_soft')
local_layer('eye_right_iris_right_peripheral_depth','M 421.79,190.62 C 427.81,193.02 427.44,200.86 422.03,203.60 L 421.67,202.11 C 422.62,200.43 423.50,198.17 423.23,195.41 C 423.05,193.62 422.63,191.63 421.79,190.62 Z','eye42_right_right_edge_color','iris-material-right-peripheral-depth','eye42_right_edge_soft')
full_layer(pupil,'eye_right_pupil_vertical_depth','eye_right_pupil_complete_shape','eye42_right_pupil_vertical_color','pupil-material-core-depth')
full_layer(pupil,'eye_right_pupil_peripheral_transition','eye_right_pupil_complete_shape','eye42_right_pupil_periphery_color','pupil-material-peripheral-transition')
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

def makeview(name,tree,target=None,hide=()):
 if target:
  t=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672')
  for d in tree.xpath('//*[local-name()="defs"]'):t.append(deepcopy(d))
  g=deepcopy(get(target,tree))
  # A copied eye already carries its own defs; only the earlier resource copies are needed.
  for d in g.xpath('.//*[local-name()="defs"]'):d.getparent().remove(d)
  t.append(g)
 else:
  t=deepcopy(tree);t.set('viewBox','394 185 45 28');t.set('width','1080');t.set('height','672')
  for el0 in t.xpath('//*[@data-kind="hair"]'):el0.set('display','none')
 for id in hide:
  for ee in t.xpath('.//*[@id="'+id+'"]'):ee.set('display','none')
 E.ElementTree(t).write(str(P/'evidence'/(name+'.svg')),encoding='utf-8',xml_declaration=True)
makeview('final-nohair',r);makeview('final-isolated',r,'eye_right');makeview('base-isolated',base,'eye_right');makeview('complete-gaze',r,'eye_right_gaze')
makeview('vertical-only',r,'eye_right',layers[1:])
makeview('without-local-bands',r,'eye_right',['eye_right_iris_left_lower_band','eye_right_iris_right_local_band'])
for id in layers:makeview(id,r,id)
mask=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672')
mask.append(deepcopy(defs));mask.append(el('use',href='#eye_right_iris_complete_shape',fill='white'))
E.ElementTree(mask).write(str(P/'evidence/iris-surface-mask.svg'),encoding='utf-8',xml_declaration=True)

before={e.get('id'):e for e in S.iter() if e.get('id')};after={e.get('id'):e for e in r.iter() if e.get('id')};keys=['d','cx','cy','rx','ry','x','y','transform','clip-path','clipPathUnits','fill-rule','stroke-width']
frozen=[]
for id,e in before.items():
 for k in keys:
  if e.get(k)!=after[id].get(k):frozen.append({'id':id,'attr':k,'before':e.get(k),'after':after[id].get(k)})
ids=[e.get('id') for e in r.iter() if e.get('id')];refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
untouched=['eye_right_sclera','eye_right_upper_eyelid','eye_right_lower_eyelid','eye_right_upper_lashes','eye_right_lower_lashes','eye_right_eyelid_skin','eye_right_highlights']
audit={'input_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'base_color_sha256':hashlib.sha256((P/'基础色恢复点.svg').read_bytes()).hexdigest(),
 'frozen_geometry_changes':frozen,'new_material_layers':layers,
 'non_eye_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='eye_right'),
 'other_eye_subparts_xml_unchanged':{id:E.tostring(before[id])==E.tostring(after[id]) for id in untouched},
 'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),
 'guides_display':after['eye_right_construction_guides'].get('display'),'highlights_display':after['eye_right_highlights'].get('display'),
 'new_masks':len(r.xpath('//*[local-name()="mask"]'))-len(S.xpath('//*[local-name()="mask"]')),
 'new_effect_nodes':len(r.xpath('//*[@data-effect]'))-len(S.xpath('//*[@data-effect]'))}
(P/'evidence/audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
