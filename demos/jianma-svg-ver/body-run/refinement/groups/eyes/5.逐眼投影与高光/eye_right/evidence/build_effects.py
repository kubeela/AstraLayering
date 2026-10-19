from pathlib import Path
from lxml import etree as E
from copy import deepcopy
import hashlib,json,re

P=Path('refinement/groups/eyes/5.逐眼投影与高光/eye_right');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.4.眼周皮肤明暗/character.svg')
EXPECTED='204149deb52a238e54af321258ca3059aa9a534cd2e9868b981f4418e01b71eb'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
APPROVED=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/character.svg');assert hashlib.sha256(APPROVED.read_bytes()).hexdigest()=='314a57f9bf89580e3192adf3ab64e164aecbad520802147597ee3145e07f480e'
pal=json.loads(Path('refinement/groups/eyes/3.眼部色盘/palette.json').read_text(encoding='utf-8'));c={s['id']:s['hex'] for s in pal['samples']}
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();r=deepcopy(S)
def get(id,tree=None):return (r if tree is None else tree).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**attrs):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
eye=get('eye_right');defs=eye.find('{'+NS+'}defs');opening=get('eye_right_opening')
iris_layers=json.loads(Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.2.眼黑颜色与层次/evidence/audit.json').read_text(encoding='utf-8'))['new_material_layers']
skin_layers=json.loads(Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.4.眼周皮肤明暗/evidence/audit.json').read_text(encoding='utf-8'))['skin_layer_ids']
assert len(iris_layers)==8 and len(skin_layers)==11
assert all(get(id) is not None for id in iris_layers+skin_layers)

for target in ['sclera','iris']:
 cl=el('clipPath',id='eye5_right_'+target+'_surface_clip',clipPathUnits='userSpaceOnUse');cl.append(el('use',href='#eye_right_'+target+'_complete_shape'));defs.append(cl)
for id,std in [('eye5_right_cast_soft','.28'),('eye5_right_lower_cast_soft','.24'),('eye5_right_reflection_soft','.10')]:
 f=el('filter',id=id,x='-12%',y='-18%',width='124%',height='136%',color_interpolation_filters='sRGB');f.append(el('feGaussianBlur',stdDeviation=std));defs.append(f)

upper_d='M 401,185 L 437,185 L 437,205.2 C 434.4,205.1 432.5,203.2 431.48,202.50 C 428.41,199.30 423.59,196.69 417.48,196.37 C 413.18,195.88 408.25,195.85 405.75,198.02 C 404.70,199.8 402.3,199.9 401,197.5 Z'
lower_d='M 401,197.7 C 403.8,197.5 404.8,198.5 406.45,199.25 C 408.30,201.75 410.65,202.95 413.35,203.29 C 417.00,203.69 421.25,203.54 425.10,202.79 C 428.00,202.14 430.22,201.27 432.25,201.44 L 437,206.8 L 435,212 L 400,212 Z'
for id,d in [('eye5_right_upper_cast_complete',upper_d),('eye5_right_lower_cast_complete',lower_d)]:defs.append(el('path',id=id,d=d))
grad=el('linearGradient',id='eye5_right_main_reflection_color',gradientUnits='userSpaceOnUse',x1='418.8',y1='195.87',x2='418.8',y2='197.78')
for t,color in [(0,'#526079'),(.48,c['36']),(1,'#E8F1FC')]:grad.append(el('stop',offset=t,stop_color=color))
defs.append(grad)
effects=[]
def effect(id,kind,source,target,shape,color,opacity,soft,parent,insert=None):
 attrs={'id':id,'data_part':'eye_right','data_kind':'eyes','data_effect':kind,'data_target_part':'eye_right','data_target_id':'eye_right_'+target+'_complete_shape','data_complete_path':shape,'clip_path':'url(#eye_right_aperture_clip)'}
 if source:attrs.update(data_source_part='eye_right',data_source_id='eye_right_'+source+'_eyelid',data_driven_by='eye_right_'+source+'_eyelid')
 else:attrs.update(data_role='independent-intraocular-reflection',data_follows_part='eye_right',data_follows_id='eye_right_gaze',data_follow_relation='corneal-reflection-relative-to-gaze')
 g=el('g',**attrs);surface=el('g',id=id+'_surface_clip',clip_path='url(#eye5_right_'+target+'_surface_clip)')
 surface.append(el('use',id=id+'_paint',href='#'+shape,fill=color,opacity=opacity,filter='url(#'+soft+')'));g.append(surface)
 if insert is None:parent.append(g)
 else:parent.insert(insert,g)
 effects.append({'id':id,'type':kind,'source_id':'eye_right_'+source+'_eyelid' if source else None,'target_id':'eye_right_'+target+'_complete_shape','full_path':shape,'surface_clip':'eye5_right_'+target+'_surface_clip','aperture_clip':'eye_right_aperture_clip','filter':soft,'control_id':id,'relative_motion':'source-driven, outside gaze' if source else 'intraocular; relative to eye_right_gaze; static relationship only'})
 return g

# Scleral cast fragments are behind the opaque iris, never a second cast on it.
idx=opening.index(get('eye_right_gaze'))
effect('fx_eye_right_upper_lid_on_sclera','cast-shadow','upper','sclera','eye5_right_upper_cast_complete',c['22'],'.30','eye5_right_cast_soft',opening,idx)
idx=opening.index(get('eye_right_gaze'))
effect('fx_eye_right_lower_lid_on_sclera','cast-shadow','lower','sclera','eye5_right_lower_cast_complete',c['38'],'.40','eye5_right_lower_cast_soft',opening,idx)
# Eyelid shadows are siblings of gaze, so they stay with the lids in a future rig.
effect('fx_eye_right_upper_lid_on_iris','cast-shadow','upper','iris','eye5_right_upper_cast_complete','#2C2F48','.40','eye5_right_cast_soft',opening)
effect('fx_eye_right_lower_lid_on_iris','cast-shadow','lower','iris','eye5_right_lower_cast_complete','#76758D','.16','eye5_right_lower_cast_soft',opening)
# The complete, approved high-light shape is reused; the earlier neutral placeholder stays hidden.
effect('fx_eye_right_iris_main_reflection','highlight',None,'iris','eye_right_highlight_main_shape','url(#eye5_right_main_reflection_color)','1','eye5_right_reflection_soft',opening)
eye.set('data-stage','independent-eye-shadows-and-reflection-5')
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)

def save(name,tree):E.ElementTree(tree).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
def view(name,tree,target=None,hide=(),full=False,unclipped=False):
 if target:
  out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 182 49 34',width='1176',height='816')
  for dd in tree.xpath('//*[local-name()="defs"]'):out.append(deepcopy(dd))
  obj=deepcopy(get(target,tree))
  if unclipped:
   for item in obj.iter():item.attrib.pop('clip-path',None)
  for dd in obj.xpath('.//*[local-name()="defs"]'):dd.getparent().remove(dd)
  out.append(obj)
 else:
  out=deepcopy(tree)
  if not full:out.set('viewBox','394 182 49 34');out.set('width','1176');out.set('height','816')
 for id in hide:
  get(id,out).set('display','none')
 save(name,out)
effect_ids=[x['id'] for x in effects]
view('all-effects-off',r,hide=effect_ids,full=True)
view('clean-closeup',S);view('final-closeup',r);view('all-effects-off-closeup',r,hide=effect_ids)
view('final-isolated-eye',r,'eye_right')
for e in effects:
 view(e['id'],r,e['id']);view(e['id']+'-complete',r,e['id'],unclipped=True)
for source in ['upper','lower']:
 related=[e['id'] for e in effects if e['source_id']=='eye_right_'+source+'_eyelid']
 source_nodes=['eye_right_'+source+'_eyelid','eye_right_'+source+'_lashes']
 view(source+'-source-and-casts-off',r,hide=related+source_nodes)
 view(source+'-source-and-all-effects-off',r,hide=effect_ids+source_nodes)
 view('clean-'+source+'-source-off',S,hide=source_nodes)
for surface in ['sclera','iris']:
 mask=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 182 49 34',width='1176',height='816')
 for dd in r.xpath('//*[local-name()="defs"]'):mask.append(deepcopy(dd))
 g=el('g',clip_path='url(#eye_right_aperture_clip)');g.append(el('use',href='#eye_right_'+surface+'_complete_shape',fill='white'));mask.append(g);save(surface+'-intersection-mask',mask)

before={e.get('id'):e for e in S.iter() if e.get('id')};after={e.get('id'):e for e in r.iter() if e.get('id')}
keys=['d','cx','cy','rx','ry','x','y','transform','clip-path','clipPathUnits','fill-rule','stroke-width','stroke-linecap']
def changes(tree):return [{'id':e.get('id'),'attr':k} for e in tree.iter() if e.get('id') for k in keys if e.get(k)!=after[e.get('id')].get(k)]
allids=[e.get('id') for e in r.iter() if e.get('id')];refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
keep=['eye_right_surround_skin','eye_right_sclera','eye_right_gaze','eye_right_upper_eyelid','eye_right_lower_eyelid','eye_right_upper_lashes','eye_right_lower_lashes','eye_right_eyelid_skin']
audit={'input_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'plan_sha256':'459f82982d648c44f4b54468c9d4a8c391f68ea16be896fb7ae9126717e87569',
 'verified_intrinsic_layer_count':len(iris_layers),'verified_eye_skin_layer_count':len(skin_layers),
 'frozen_geometry_changes_against_input':changes(S),'frozen_geometry_changes_against_approved_line_art':changes(E.parse(str(APPROVED)).getroot()),
 'completed_subparts_xml_unchanged':{id:E.tostring(before[id])==E.tostring(after[id]) for id in keep},
 'old_resources_xml_unchanged':all(E.tostring(e)==E.tostring(after[e.get('id')]) for e in before['eye_right'].find('{'+NS+'}defs') if e.get('id')),
 'non_eye_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='eye_right'),
 'new_effects':effects,
 'shadows_outside_gaze':all(get('eye_right_gaze') not in get(e['id']).iterancestors() for e in effects if e['type']=='cast-shadow'),
 'effect_relation_refs_valid':all(e['target_id'] in after and (e['source_id'] is None or e['source_id'] in after) and e['full_path'] in after for e in effects),
 'duplicate_ids':sorted({i for i in allids if allids.count(i)>1}),'broken_refs':sorted(set(refs)-set(allids)),
 'original_highlight_placeholder_display':get('eye_right_highlights').get('display')}
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
