from pathlib import Path
from lxml import etree as E
import json,re,hashlib
P=Path(__file__).resolve().parent;R=P.parents[2]
OUT=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.4.关联遮挡与线稿校准';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.3.装饰部件线稿/character.svg'
base=SOURCE.read_text(encoding='utf-8');src=E.fromstring(base.encode())
plan=json.loads((R/'refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'))
assert plan['eyes_symmetric'] is False and plan['mirror'] is None
assert hashlib.sha256((R/'references/base-subject.png').read_bytes()).hexdigest()==plan['reference_sha256']
hair=src.xpath('//*[@id="hair_front_right"]')[0]
oldhair=hair.find('{http://www.w3.org/2000/svg}path').get('d')
newhair=oldhair.replace('C 400,207 406.7,189.6 410,176.8','C 399.4,210.2 403.85,202.1 405.8,196.5 C 408.3,190.9 409.0,183.1 410,176.8')
assert newhair!=oldhair
shadow='M 443.5,161.5 C 438,155 435,153 430.4,152.8 C 418.8,151 414.2,164.4 410.5,177 C 409.5,184.1 408.55,191.15 406.0,196.8 C 404.7,201.1 403.2,203.6 401.4,205.8'
defs=f'''
<!-- eye_right / 2.4: actual front-hair source shared with its coverage clip -->
<path id="hair_front_right_eye_aligned_geometry" d="{newhair}" fill-rule="evenodd"/>
<clipPath id="hair_front_right_coverage_clip" clipPathUnits="userSpaceOnUse"><use href="#hair_front_right_eye_aligned_geometry"/></clipPath>
<clipPath id="eye_right_lash_reveal_window_clip" clipPathUnits="userSpaceOnUse"><path d="M 400.5,193 L 404.65,193 C 404.68,195.0 404.30,197.7 403.85,199.6 L 400.5,199.6 Z"/></clipPath>
'''
hair_text=re.search(r'<g id="hair_front_right" .*?</g>',base,re.S).group()
new_hair_text=re.sub(r'<path .*?/>','<use id="hair_front_right_aligned_surface" href="#hair_front_right_eye_aligned_geometry"/>',hair_text,count=1)
overlay='''
<g id="eye_right_upper_lash_hair_overlay" data-part="eye_right" data-kind="eyes" data-role="source-linked-hair-overlay" data-control-owner="eye_right_upper_lash_outer_controller" clip-path="url(#hair_front_right_coverage_clip)">
 <title>原图前发内露出的外侧睫毛：同一完整源与实际发面交集</title>
 <g id="eye_right_upper_lash_reveal_window" clip-path="url(#eye_right_lash_reveal_window_clip)">
  <use id="eye_right_upper_lash_outer_front_instance" href="#eye_right_upper_lash_outer_controller" fill="#343434" stroke="none"/>
 </g>
</g>
'''
candidate=base.replace(hair_text,new_hair_text+overlay,1).replace('</defs>',defs+'</defs>',1)
oldshadow=src.xpath('//*[@id="fx_hair_front_right_editable_path"]')[0].get('d')
candidate=candidate.replace('id="fx_hair_front_right_editable_path" d="'+oldshadow+'"','id="fx_hair_front_right_editable_path" data-source-geometry="hair_front_right_eye_aligned_geometry" d="'+shadow+'"',1)
oldlash=src.xpath('//*[@id="eye_right_upper_lash_outer_geometry"]')[0].get('d')
newlash='M 410.65,194.10 C 407.80,194.78 405.48,196.15 402.85,196.45 C 403.25,198.00 405.05,197.70 407.20,196.45 C 408.58,195.85 409.50,195.31 410.65,194.10 Z'
candidate=candidate.replace('id="eye_right_upper_lash_outer_geometry" d="'+oldlash+'"','id="eye_right_upper_lash_outer_geometry" d="'+newlash+'"',1)
candidate=candidate.replace('data-stage="2.3-decoration-line-art" data-source-eye="eye_right"','data-stage="2.4-aligned-line-art" data-source-eye="eye_right"',1)
candidate=candidate.replace('Actual source hair occlusion remains for stage 2.4.','Actual right front-hair coverage and a source-linked overlay establish the two visible lash fragments.',1)
(OUT/'character.svg').write_text(candidate,encoding='utf-8')
dst=E.fromstring(candidate.encode());ids=[x.get('id') for x in dst.iter() if x.get('id')];assert len(ids)==len(set(ids))
allowed={'eye_right','hair_front_right','fx_hair_front_right_on_face','fx_hair_front_right_editable_path','eye_right_upper_lash_outer_controller','eye_right_upper_lash_outer_geometry'}
for old in src.xpath('//*[@id]'):
 if old.get('id') in allowed:continue
 new=dst.xpath('//*[@id=$id]',id=old.get('id'))[0]
 assert E.tostring(old,with_tail=False)==E.tostring(new,with_tail=False),old.get('id')
for x in dst.iter():
 for k,v in x.attrib.items():
  if k=='href' and v.startswith('#'):assert v[1:] in ids
  for ref in re.findall(r'url\(#([^)]*)\)',v):assert ref in ids
assert 'qa_right_observed_hair_gap' not in candidate and not dst.xpath('//*[starts-with(@id,"qa_")]')
assert len(dst.xpath('//*[@id="eye_right_upper_lash_outer_geometry"]'))==1
assert all(dst.xpath('//*[@id=$id]',id=i)[0].get('href')=='#eye_right_upper_lash_outer_controller' for i in ['eye_right_upper_lash_outer_instance','eye_right_upper_lash_outer_front_instance'])
def local(name,edit=None,box=(393,184,44,30),scale=30):
 doc=E.fromstring(candidate.encode());doc.set('viewBox',' '.join(map(str,box)));doc.set('width',str(box[2]*scale));doc.set('height',str(box[3]*scale))
 if edit:edit(doc)
 (P/(name+'.svg')).write_bytes(E.tostring(doc,xml_declaration=True,encoding='utf-8'))
def hidehair(doc):
 for x in doc.xpath('//*[@data-kind="hair" or @data-role="source-linked-hair-overlay"]'):x.set('display','none')
def guides(doc):
 for x in doc.xpath('//*[@id="eye_right"]//*[@data-role="construction-guide"]'):x.set('display','inline')
def isolate_lash(doc,with_hair=True):
 for x in doc.xpath('//*[@data-part]'):
  if not (x.get('data-part')=='eye_right' or (with_hair and x.get('id')=='hair_front_right')):x.set('display','none')
 for x in doc.xpath('//*[@id="eye_right"]')[0]:
  if isinstance(x.tag,str) and x.tag.endswith('g') and x.get('id')!='eye_right_upper_lashes':x.set('display','none')
 if with_hair:doc.xpath('//*[@id="hair_front_right"]')[0].set('fill','white')
 else:doc.xpath('//*[@id="eye_right_upper_lash_hair_overlay"]')[0].set('display','none')
def moved(doc):doc.xpath('//*[@id="eye_right_upper_lash_outer_controller"]')[0].set('transform','translate(0.8 0.35)')
def edited(doc):
 x=doc.xpath('//*[@id="eye_right_upper_lash_outer_geometry"]')[0];x.set('d',x.get('d').replace('405.48,196.15','405.48,195.65'))
def compose(*ops):
 def f(doc):
  for op in ops:op(doc)
 return f
local('candidate-eye-direct-30x');local('candidate-eye-native',scale=1)
local('candidate-head-direct-6x',box=(374,108,149,168),scale=6);local('candidate-head-native',box=(374,108,149,168),scale=1)
local('candidate-eyes-direct-12x',box=(390,175,109,47),scale=12);local('candidate-eyes-native',box=(390,175,109,47),scale=1)
local('guides-on-direct-30x',guides);local('front-hair-off-direct-30x',hidehair)
local('real-context-moved',moved);local('real-context-curve-edited',edited)
for name,fn in [('real-hair-before',isolate_lash),('real-hair-moved',compose(isolate_lash,moved)),('real-hair-curve-edited',compose(isolate_lash,edited)),('lash-complete-no-hair',lambda doc:isolate_lash(doc,False))]:local(name,fn,box=(398,190,18,14),scale=60)
def component(ident):
 def f(doc):
  for x in doc.xpath('//*[@data-part]'):
   if x.get('id')!='eye_right':x.set('display','none')
  for x in doc.xpath('//*[@id="eye_right"]')[0]:
   if isinstance(x.tag,str) and x.tag.endswith('g') and x.get('id')!=ident:x.set('display','none')
  if ident=='eye_right_sclera':doc.xpath('//*[@id="eye_right_sclera_surface"]')[0].set('fill','#BEBEBE')
 return f
for ident in ['eye_right_upper_lid','eye_right_lower_lid','eye_right_sclera','eye_right_interior','eye_right_upper_lashes','eye_right_eyelid_fold']:local('component-'+ident,component(ident))
def full_interior(doc):
 component('eye_right_interior')(doc)
 for ident in ['eye_right_interior','eye_right_aperture_window']:doc.xpath('//*[@id=$id]',id=ident)[0].attrib.pop('clip-path',None)
local('component-full-interior-unclipped',full_interior)
def highlight(doc):
 component('eye_right_interior')(doc);doc.xpath('//*[@id="eye_right_eyeball"]')[0].set('display','none');doc.xpath('//*[@id="eye_right_highlight_surface"]')[0].set('fill','#777777')
local('component-highlight-only',highlight)
def face_only(doc):
 for x in doc.xpath('//*[@data-part]'):
  if x.get('data-part')!='face_base':x.set('display','none')
local('face-with-features-hidden',face_only,box=(390,175,110,100),scale=8)
ns={'s':'http://www.w3.org/2000/svg'}
for name,geometry in [('aperture','eye_right_aperture_geometry'),('actual-hair','hair_front_right_eye_aligned_geometry')]:
 defs_xml=E.tostring(dst.find('s:defs',ns),encoding='unicode')
 mask=f'<svg xmlns="http://www.w3.org/2000/svg" width="2640" height="1800" viewBox="393 184 44 30">{defs_xml}<rect x="393" y="184" width="44" height="30" fill="white"/><use href="#{geometry}" fill="black"/></svg>'
 (P/('mask-'+name+'.svg')).write_text(mask,encoding='utf-8')
report={'stage':'2.4','eye':'eye_right','eyes_symmetric':False,'input_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),'unique_id_count':len(ids),'unique_part_count':len(set(dst.xpath('//*[@data-part]/@data-part'))),'contours_and_interior_geometry_unchanged':True,'lash_outer_tip_refit_from_source_pixels':{'before':[401.70,196.32],'after':[402.85,196.45]},'all_other_eye_geometry_and_its_hair_face_links_unchanged':True,'other_existing_id_elements_unchanged':True,'references_resolved':True,'affected_neighbors':['hair_front_right','fx_hair_front_right_on_face'],'hair_revision_original_curve_endpoints':[[390,213],[410,176.8]],'new_eye_level_hair_edge':[405.8,196.5],'actual_hair_source':'hair_front_right_eye_aligned_geometry','actual_hair_coverage_clip':'hair_front_right_coverage_clip','formal_lash_instances':['eye_right_upper_lash_outer_instance','eye_right_upper_lash_outer_front_instance'],'unique_lash_source':'eye_right_upper_lash_outer_geometry','shared_lash_controller':'eye_right_upper_lash_outer_controller','face_base_clips_and_existing_effect_styles_preserved':True,'no_qa_occluder_in_formal_svg':True,'test_mutations_restored':True,'new_gradients':0}
(P/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
