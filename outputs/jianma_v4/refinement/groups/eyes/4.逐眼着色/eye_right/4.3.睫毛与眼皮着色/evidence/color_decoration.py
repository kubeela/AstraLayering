from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.3.睫毛与眼皮着色');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.2.眼黑颜色与层次/character.svg')
EXPECTED='27c7a07f3eb84547c4c0e72c2b108e1259b9113927a06164543bd926f817894e'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
APPROVED=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/character.svg')
assert hashlib.sha256(APPROVED.read_bytes()).hexdigest()=='314a57f9bf89580e3192adf3ab64e164aecbad520802147597ee3145e07f480e'
pal=json.loads(Path('refinement/groups/eyes/3.眼部色盘/palette.json').read_text(encoding='utf-8'));c={s['id']:s['hex'] for s in pal['samples']}
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();r=deepcopy(S)
def get(id,tree=None):return (r if tree is None else tree).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**attrs):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
eye=get('eye_right');defs=eye.find('{'+NS+'}defs')

# One continuous colour field at the upper lid/lash junction.
upper=deepcopy(get('eye41_right_upper_lid_color'));upper.set('id','eye43_right_upper_lashes_color')
old_x1=float(upper.get('x1'));old_x2=float(upper.get('x2'));new_x1=401.91
for stop in upper:
 x=old_x1+float(stop.get('offset'))*(old_x2-old_x1)
 stop.set('offset',format((x-new_x1)/(old_x2-new_x1),'.12g'))
upper.set('x1',str(new_x1))
upper.insert(0,el('stop',offset='0',stop_color=c['21'],stop_opacity='.78'))
upper.insert(1,el('stop',offset=format((403.49-new_x1)/(old_x2-new_x1),'.12g'),stop_color=c['21'],stop_opacity='.90'))
defs.append(upper)
lower=deepcopy(get('eye41_right_lower_lid_color'));lower.set('id','eye43_right_lower_lashes_color');defs.append(lower)
fold=el('linearGradient',id='eye43_right_fold_color',gradientUnits='userSpaceOnUse',x1='407.24',y1='0',x2='430.68',y2='0')
for pos,color,opacity in [(0,c['25'],.14),(.12,c['25'],.75),(.24,c['25'],.94),(.49,c['25'],.78),(.70,c['35'],.60),(.88,c['35'],.27),(1,c['35'],0)]:
 fold.append(el('stop',offset=pos,stop_color=color,stop_opacity=opacity))
defs.append(fold)
for id in ['eye_right_upper_lash_sweep','eye_right_upper_lash_outer_taper']:get(id).set('fill','url(#eye43_right_upper_lashes_color)')
get('eye_right_lower_lash_outer_root').set('fill','url(#eye43_right_lower_lashes_color)')
get('eye_right_upper_fold').set('stroke','url(#eye43_right_fold_color)')
eye.set('data-stage','lashes-and-eyelid-fold-color-4.3')
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

def view(name,tree,targets=None,hide_hair=False):
 if targets:
  out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672')
  for d in tree.xpath('//*[local-name()="defs"]'):out.append(deepcopy(d))
  for id in targets:
   item=deepcopy(get(id,tree))
   for d in item.xpath('.//*[local-name()="defs"]'):d.getparent().remove(d)
   out.append(item)
 else:
  out=deepcopy(tree);out.set('viewBox','394 185 45 28');out.set('width','1080');out.set('height','672')
 if hide_hair:
  for item in out.xpath('//*[@data-kind="hair"]'):item.set('display','none')
 E.ElementTree(out).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
view('input-nohair',S,hide_hair=True);view('final-nohair',r,hide_hair=True)
view('input-normal-closeup',S);view('final-normal-closeup',r)
view('final-isolated',r,['eye_right'])
view('upper-lashes',r,['eye_right_upper_lashes']);view('lower-lashes',r,['eye_right_lower_lashes']);view('fold',r,['eye_right_eyelid_skin'])
view('lid-lash-junctions',r,['eye_right_lower_eyelid','eye_right_upper_eyelid','eye_right_upper_lashes','eye_right_lower_lashes'])
view('lids-without-lashes',r,['eye_right_lower_eyelid','eye_right_upper_eyelid'])

before={e.get('id'):e for e in S.iter() if e.get('id')};after={e.get('id'):e for e in r.iter() if e.get('id')}
keys=['d','cx','cy','rx','ry','x','y','transform','clip-path','clipPathUnits','fill-rule','stroke-width','stroke-linecap']
def geom_changes(tree):
 return [{'id':e.get('id'),'attr':k} for e in tree.iter() if e.get('id') for k in keys if e.get(k)!=after[e.get('id')].get(k)]
existing_changes=[]
for id,old in before.items():
 new=after[id]
 for k in set(old.attrib)|set(new.attrib):
  if old.get(k)!=new.get(k):existing_changes.append({'id':id,'attribute':k,'old':old.get(k),'new':new.get(k)})
allowed={('eye_right','data-stage'),('eye_right_upper_lash_sweep','fill'),('eye_right_upper_lash_outer_taper','fill'),('eye_right_lower_lash_outer_root','fill'),('eye_right_upper_fold','stroke')}
assert all((x['id'],x['attribute']) in allowed for x in existing_changes)
keep=['eye_right_sclera','eye_right_iris','eye_right_pupil','eye_right_highlights','eye_right_upper_eyelid','eye_right_lower_eyelid','eye_right_construction_guides']
ids=[e.get('id') for e in r.iter() if e.get('id')];refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
root_order=[e.get('id') for e in r if e.get('id')]
path_ids=['eye_right_upper_lash_sweep','eye_right_upper_lash_outer_taper','eye_right_lower_lash_outer_root','eye_right_upper_fold']
audit={'plan_sha256':'459f82982d648c44f4b54468c9d4a8c391f68ea16be896fb7ae9126717e87569','input_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),
 'approved_line_art_sha256':hashlib.sha256(APPROVED.read_bytes()).hexdigest(),
 'frozen_geometry_changes_against_input':geom_changes(S),'frozen_geometry_changes_against_approved_line_art':geom_changes(E.parse(str(APPROVED)).getroot()),
 'existing_attribute_changes':existing_changes,
 'retained_color_subparts_xml_unchanged':{id:E.tostring(before[id])==E.tostring(after[id]) for id in keep},
 'previous_resources_unchanged':all(E.tostring(e)==E.tostring(after[e.get('id')]) for e in before['eye_right'].find('{'+NS+'}defs') if e.get('id')),
 'non_eye_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='eye_right'),
 'eye_internal_order_unchanged':[x.get('id') for x in before['eye_right']]==[x.get('id') for x in eye],
 'hair_order':{id:root_order.index('eye_right')<root_order.index(id) for id in ['hair_front_right','hair_front_left']},
 'decorations_descend_from_eye':{id:eye in after[id].iterancestors() for id in path_ids},
 'new_geometry_nodes':len(r.xpath('//*[local-name()="path" or local-name()="use" or local-name()="ellipse"]'))-len(S.xpath('//*[local-name()="path" or local-name()="use" or local-name()="ellipse"]')),
 'new_effect_nodes':len(r.xpath('//*[@data-effect]'))-len(S.xpath('//*[@data-effect]')),
 'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),
 'guides_display':after['eye_right_construction_guides'].get('display'),'highlights_display':after['eye_right_highlights'].get('display')}
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
