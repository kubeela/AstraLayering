from pathlib import Path
from lxml import etree as E
import hashlib,json,re,shutil

P=Path(__file__).resolve().parent; R=P.parents[2]
OUT=R/'refinement/groups/eyes/3.双眼线稿组装与审查'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.4.关联遮挡与线稿校准/character.svg'
plan=json.loads((R/'refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'))
assert plan['eyes_symmetric'] is False and plan['mirror'] is None
assert plan['part_ids']==['eye_left','eye_right'] and plan['eyes']==[{'id':v,'part_id':v} for v in plan['part_ids']]
assert hashlib.sha256((R/'references/base-subject.png').read_bytes()).hexdigest()==plan['reference_sha256']
if (OUT/'说明.md').exists() and not (P/'previous-stage3-notes.md').exists():shutil.copyfile(OUT/'说明.md',P/'previous-stage3-notes.md')
shutil.copyfile(SOURCE,OUT/'character.svg')
base=SOURCE.read_bytes(); doc=E.fromstring(base)
ns={'s':'http://www.w3.org/2000/svg'}
ids=[x.get('id') for x in doc.iter() if x.get('id')]
assert len(ids)==len(set(ids))
manifest=(R/'structure/parts.yaml').read_text(encoding='utf-8')
parts=[{'id':i,'kind':k} for i,k in re.findall(r'^  - id: (\S+)\n(?:(?!  - id:).)*?^    kind: (\S+)',manifest,re.M|re.S)]
assert len(parts)==len(re.findall(r'^  - id:',manifest,re.M))
assert set(doc.xpath('//*[@data-part]/@data-part'))=={p['id'] for p in parts}
for part in parts:
 for el in doc.xpath('//*[@data-part=$v]',v=part['id']): assert el.get('data-kind')==part['kind']
for el in doc.iter():
 for k,v in el.attrib.items():
  if k.endswith('href') and v.startswith('#'):assert v[1:] in ids
  for ref in re.findall(r'url\(#([^)]*)\)',v):assert ref in ids
assert not doc.xpath('//*[starts-with(@id,"qa_")]')
audit={}
for eye in plan['part_ids']:
 side=eye.split('_')[-1]; other='eye_right' if side=='left' else 'eye_left'
 group=doc.xpath('//*[@id=$v]',v=eye)[0]
 children=[x.get('id') for x in group if isinstance(x.tag,str) and x.tag.endswith('g')]
 order=['eyelid_fold','sclera','interior','upper_lid','lower_lid','upper_lashes']
 assert [children.index(eye+'_'+v) for v in order]==sorted(children.index(eye+'_'+v) for v in order)
 assert len(group.xpath('.//*[@data-role="construction-guide"]'))==3
 assert all(x.get('display')=='none' for x in group.xpath('.//*[@data-role="construction-guide"]'))
 resources=[x for x in doc.xpath('//*[@id]') if x.get('id').startswith(eye+'_') or x.get('id')==eye]
 for x in resources:
  for key,value in x.attrib.items(): assert other+'_' not in value,(eye,key,value)
 normal=eye+'_upper_lash_outer_instance'; front=eye+'_upper_lash_outer_front_instance';controller=eye+'_upper_lash_outer_controller'
 assert all(doc.xpath('//*[@id=$v]',v=i)[0].get('href')=='#'+controller for i in [normal,front])
 assert doc.xpath('//*[@id=$v]',v=controller)[0].get('transform')=='translate(0 0)'
 hair='hair_front_'+side
 assert doc.xpath('//*[@id=$v]',v=hair+'_coverage_clip')[0][0].get('href')=='#'+hair+'_eye_aligned_geometry'
 assert doc.xpath('//*[@id=$v]',v=hair+'_aligned_surface')[0].get('href')=='#'+hair+'_eye_aligned_geometry'
 assert doc.xpath('//*[@id=$v]',v='fx_'+hair+'_editable_path')[0].get('data-source-geometry')==hair+'_eye_aligned_geometry'
 assert doc.xpath('//*[@id=$v]',v=eye+'_upper_lash_hair_overlay')[0].get('clip-path')=='url(#'+hair+'_coverage_clip)'
 audit[eye]={'source_eye':eye,'mirror':None,'geometry_and_resource_ids':[x.get('id') for x in resources],
 'normal_lash_instance':normal,'front_lash_instance':front,'lash_controller':controller,'full_lash_geometry':eye+'_upper_lash_outer_geometry',
 'actual_hair':hair,'hair_geometry':hair+'_eye_aligned_geometry','coverage_clip':hair+'_coverage_clip','reveal_clip':eye+'_lash_reveal_window_clip',
 'face_effect':'fx_'+hair+'_on_face','face_surface_clip':'face6_surface_face_base','cross_eye_resource_references':False,'formal_layer_order':order}

def node(d,i):return d.xpath('//*[@id=$v]',v=i)[0]
def local(path,box=(390,175,109,47),scale=12,fn=None):
 d=E.fromstring(base);d.set('viewBox',' '.join(map(str,box)));d.set('width',str(box[2]*scale));d.set('height',str(box[3]*scale))
 if fn:fn(d)
 path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(E.tostring(d,encoding='utf-8',xml_declaration=True))
def compose(*ops):
 def apply(d):
  for op in ops:op(d)
 return apply
def hidehair(d):
 for x in d.xpath('//*[@data-kind="hair" or @data-role="source-linked-hair-overlay"]'):x.set('display','none')
def faceonly(d):
 for x in d.xpath('//*[@data-part]'):
  if x.get('data-part')!='face_base':x.set('display','none')
local(P/'candidate-eyes-direct-12x.svg');local(P/'candidate-eyes-native.svg',scale=1)
local(P/'candidate-head-direct-6x.svg',box=(374,108,149,168),scale=6);local(P/'candidate-head-native.svg',box=(374,108,149,168),scale=1)
local(P/'face-with-features-hidden.svg',box=(390,175,110,100),scale=8,fn=faceonly)
settings={}
defs_xml=E.tostring(doc.find('s:defs',ns),encoding='unicode')
for eye in plan['part_ids']:
 side=eye.split('_')[-1];hair='hair_front_'+side;folder=P/eye;folder.mkdir(exist_ok=True)
 box=(449,184,44,30) if side=='left' else (393,184,44,30)
 lashbox=(472,189,18,15) if side=='left' else (398,190,18,14)
 old,new=('481.77,198.2','481.77,198.75') if side=='left' else ('405.48,196.15','405.48,195.65')
 def moved(d,e=eye):node(d,e+'_upper_lash_outer_controller').set('transform','translate(0.8 0.35)')
 def edited(d,e=eye,o=old,n=new):
  x=node(d,e+'_upper_lash_outer_geometry');assert o in x.get('d');x.set('d',x.get('d').replace(o,n))
 def guides(d,e=eye):
  for x in node(d,e).xpath('.//*[@data-role="construction-guide"]'):x.set('display','inline')
 def isolate(d,with_hair=True,e=eye,h=hair):
  for x in d.xpath('//*[@data-part]'):
   if not(x.get('data-part')==e or (with_hair and x.get('id')==h)):x.set('display','none')
  for x in node(d,e):
   if isinstance(x.tag,str) and x.tag.endswith('g') and x.get('id')!=e+'_upper_lashes':x.set('display','none')
  if with_hair:node(d,h).set('fill','white')
  else:node(d,e+'_upper_lash_hair_overlay').set('display','none')
 def component(d,c,e=eye):
  for x in d.xpath('//*[@data-part]'):
   if x.get('id')!=e:x.set('display','none')
  for x in node(d,e):
   if isinstance(x.tag,str) and x.tag.endswith('g') and x.get('id')!=e+'_'+c:x.set('display','none')
  if c=='sclera':node(d,e+'_sclera_surface').set('fill','#BEBEBE')
 def full(d,e=eye):
  component(d,'interior',e)
  for v in ['interior','aperture_window']:node(d,e+'_'+v).attrib.pop('clip-path',None)
 def highlight(d,e=eye):
  component(d,'interior',e);node(d,e+'_eyeball').set('display','none');node(d,e+'_highlight_surface').set('fill','#777777')
 local(folder/'candidate-eye-native.svg',box,1);local(folder/'candidate-eye-direct-30x.svg',box,30)
 local(folder/'front-hair-off-direct-30x.svg',box,30,hidehair);local(folder/'guides-on-direct-30x.svg',box,30,guides)
 for mode,fn in [('moved',moved),('curve-edited',edited),('guides-on',guides)]:local(folder/('both-eyes-'+mode+'.svg'),fn=fn)
 for mode,fn in [('before',isolate),('moved',compose(isolate,moved)),('curve-edited',compose(isolate,edited)),('complete-no-hair',lambda d:isolate(d,False))]:local(folder/('real-hair-'+mode+'.svg'),lashbox,60,fn)
 for c in ['upper_lid','lower_lid','sclera','interior','upper_lashes','eyelid_fold']:local(folder/('component-'+c+'.svg'),box,30,lambda d,c=c:component(d,c))
 local(folder/'component-full-interior-unclipped.svg',box,30,full);local(folder/'component-highlight-only.svg',box,30,highlight)
 geometries=[('aperture',eye+'_aperture_geometry',False),('iris-visible',eye+'_iris_geometry',True),('iris-complete',eye+'_iris_geometry',False),('pupil-visible',eye+'_pupil_geometry',True),('highlight-visible',eye+'_highlight_geometry',True),('sclera-complete',eye+'_sclera_geometry',False),('actual-hair',hair+'_eye_aligned_geometry',False),('upper-ink',eye+'_upper_lid_contour',False),('lash-complete',eye+'_upper_lash_outer_controller',False)]
 for name,geometry,clipped in geometries:
  element=f'<use href="#{geometry}" fill="black"/>'
  if name=='upper-ink':
   ink=E.fromstring(E.tostring(node(doc,geometry)));ink.set('fill','black');element=E.tostring(ink,encoding='unicode')
  if clipped:element=f'<g clip-path="url(#{eye}_sclera_clip)"><g clip-path="url(#{eye}_aperture_clip)">{element}</g></g>'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="2640" height="1800" viewBox="{box[0]} {box[1]} 44 30">{defs_xml}<rect x="{box[0]}" y="{box[1]}" width="44" height="30" fill="white"/>{element}</svg>'
  (folder/('mask-'+name+'.svg')).write_text(svg,encoding='utf-8')
 settings[eye]={'box':box,'lash_box':lashbox,'curve_change':[old,new]}

report={'stage':'3-final','eyes_symmetric':False,'mirror':None,'plan':plan,'reference_sha256':plan['reference_sha256'],
 'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),'candidate_byte_identical_to_approved_right_2_4':(OUT/'character.svg').read_bytes()==base,
 'unique_ids':len(ids),'manifest_parts':len(parts),'references_resolved':True,'all_part_and_kind_pairs_preserved':True,
 'both_eye_resources_independent':True,'construction_guides_hidden_and_independent':True,'no_qa_occluder':True,
 'no_new_geometry_color_or_neighbor_changes':True,'review_status':'Pending independent review','per_eye_resources':audit}
(P/'assembly-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(P/'settings.json').write_text(json.dumps(settings,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['plan','per_eye_resources']},ensure_ascii=False,indent=2))
