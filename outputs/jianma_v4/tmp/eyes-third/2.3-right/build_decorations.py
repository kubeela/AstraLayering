from pathlib import Path
from lxml import etree as E
import json,re,hashlib
P=Path(__file__).resolve().parent;R=P.parents[2]
OUT=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.3.装饰部件线稿';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.2.眼内部件线稿/character.svg'
base=SOURCE.read_text(encoding='utf-8')
plan=json.loads((R/'refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'))
assert plan['eyes_symmetric'] is False and plan['mirror'] is None
assert hashlib.sha256((R/'references/base-subject.png').read_bytes()).hexdigest()==plan['reference_sha256']
LASH='M 410.65,194.10 C 407.80,194.78 405.48,196.50 401.70,196.32 C 402.35,197.64 405.05,197.44 407.20,196.45 C 408.58,195.85 409.50,195.31 410.65,194.10 Z'
FOLD='M 420.60,192.15 C 424.15,192.90 427.16,195.12 428.95,197.50 C 426.30,194.70 423.65,193.12 420.60,192.15 Z'
defs=f'''
<!-- eye_right / eyes-third / 2.3: independent continuous outer lash with shared controller -->
<g id="eye_right_upper_lash_outer_controller" data-controller="lash-deformation" transform="translate(0 0)">
 <path id="eye_right_upper_lash_outer_geometry" d="{LASH}"/>
</g>
<path id="eye_right_eyelid_fold_geometry" d="{FOLD}"/>
'''
fold='''<g id="eye_right_eyelid_fold" data-eye-component="eyelid-fold" data-control-owner="eye_right" data-paint-order="behind-sclera">
 <title>原图内侧可辨的短眼皮褶皱；外侧不扩展为长线</title>
 <use id="eye_right_eyelid_fold_surface" href="#eye_right_eyelid_fold_geometry" fill="#999999" stroke="none" opacity="0.65"/>
</g>
'''
lashes='''<g id="eye_right_upper_lashes" data-eye-component="upper-lashes" data-control-owner="eye_right_upper_lash_outer_controller">
 <title>单束完整外侧上睫毛；发后延续与另一侧尖端同源</title>
 <use id="eye_right_upper_lash_outer_instance" href="#eye_right_upper_lash_outer_controller" fill="#343434" stroke="none"/>
</g>
<g id="eye_right_decoration_construction_guides" data-role="construction-guide" display="none" aria-hidden="true" fill="none" stroke="#999999" stroke-width="0.2" stroke-dasharray="0.7 0.55">
 <use href="#eye_right_upper_lash_outer_controller"/><use href="#eye_right_eyelid_fold_geometry"/>
</g>
'''
candidate=base.replace('</defs>',defs+'</defs>',1).replace('<g id="eye_right_sclera"',fold+'<g id="eye_right_sclera"',1).replace('<g id="eye_right_construction_guides"',lashes+'<g id="eye_right_construction_guides"',1)
candidate=candidate.replace('data-stage="2.2-interior-line-art" data-source-eye="eye_right"','data-stage="2.3-decoration-line-art" data-source-eye="eye_right"',1)
candidate=candidate.replace('角色右眼（画面左） · 原图独立轮廓、眼黑和高光','角色右眼（画面左） · 独立轮廓、眼内及装饰线稿',1)
candidate=candidate.replace('decorations remain for later stages.','one complete outer upper lash and a short inner eyelid fold are included. Actual source hair occlusion remains for stage 2.4.',1)
(OUT/'character.svg').write_text(candidate,encoding='utf-8')
src=E.fromstring(base.encode());dst=E.fromstring(candidate.encode())
ids=[x.get('id') for x in dst.iter() if x.get('id')];assert len(ids)==len(set(ids))
for x in src.xpath('//*[@id]'):
 if x.get('id')=='eye_right':continue
 y=dst.xpath('//*[@id=$id]',id=x.get('id'))[0]
 assert E.tostring(x,with_tail=False)==E.tostring(y,with_tail=False),x.get('id')
for x in dst.iter():
 for k,v in x.attrib.items():
  if k=='href' and v.startswith('#'):assert v[1:] in ids
  for target in re.findall(r'url\(#([^)]*)\)',v):assert target in ids
assert len(re.findall(r'[Mm]',LASH))==1 and len(re.findall(r'[Zz]',LASH))==1
assert not dst.xpath('//*[@id="eye_right_gaze"]//*[@data-eye-component="upper-lashes" or @data-eye-component="eyelid-fold"]')
eye=dst.xpath('//*[@id="eye_right"]')[0]
order=[x.get('id') for x in eye if isinstance(x.tag,str) and x.tag.endswith('g')]
assert order.index('eye_right_eyelid_fold')<order.index('eye_right_sclera')
assert order.index('eye_right_upper_lashes')>order.index('eye_right_upper_lid')
def local(name,edit=None,box=(393,184,44,30),scale=30):
 doc=E.fromstring(candidate.encode());doc.set('viewBox',' '.join(map(str,box)));doc.set('width',str(box[2]*scale));doc.set('height',str(box[3]*scale))
 if edit:edit(doc)
 (P/(name+'.svg')).write_bytes(E.tostring(doc,xml_declaration=True,encoding='utf-8'))
def isolate(doc):
 for x in doc.xpath('//*[@data-part]'):
  if x.get('data-part')!='eye_right':x.set('display','none')
 for x in doc.xpath('//*[@id="eye_right"]')[0]:
  if isinstance(x.tag,str) and x.tag.endswith('g') and x.get('id')!='eye_right_upper_lashes':x.set('display','none')
def moved(doc):doc.xpath('//*[@id="eye_right_upper_lash_outer_controller"]')[0].set('transform','translate(0.8 0.35)')
def edited(doc):
 x=doc.xpath('//*[@id="eye_right_upper_lash_outer_geometry"]')[0]
 x.set('d',x.get('d').replace('405.48,196.50','405.48,196.00'))
def split(doc):
 # QA only: observed narrow source strand, not a replacement for the actual hair part.
 isolate(doc)
 ns='http://www.w3.org/2000/svg';defs=doc.find('{'+ns+'}defs')
 mask=E.SubElement(defs,'{'+ns+'}mask',id='qa_right_observed_hair_gap',maskUnits='userSpaceOnUse',x='398',y='190',width='18',height='14')
 E.SubElement(mask,'{'+ns+'}rect',x='398',y='190',width='18',height='14',fill='white')
 E.SubElement(mask,'{'+ns+'}path',d='M 405.0,191 L 406.1,191 C 405.8,195.0 405.2,198.3 404.3,201 L 403.4,201 C 404.3,197.5 404.7,194.5 405.0,191 Z',fill='black')
 doc.xpath('//*[@id="eye_right_upper_lashes"]')[0].set('mask','url(#qa_right_observed_hair_gap)')
def compose(*ops):
 def fn(doc):
  for op in ops:op(doc)
 return fn
def nohair(doc):
 for x in doc.xpath('//*[@data-kind="hair"]'):x.set('display','none')
local('candidate-eye-direct-30x');local('candidate-eye-native',scale=1)
local('hair-hidden-direct-30x',nohair)
local('native-hair-controller-moved',moved);local('native-hair-source-curve-edited',edited)
local('face-context-direct-8x',box=(384,175,119,46),scale=8)
for name,fn in [('lash-complete-before',isolate),('lash-complete-moved',compose(isolate,moved)),('lash-complete-curve-edited',compose(isolate,edited)),('diagnostic-hair-before',split),('diagnostic-hair-moved',compose(split,moved)),('diagnostic-hair-curve-edited',compose(split,edited))]:local(name,fn,box=(398,190,18,14),scale=60)
report={'stage':'2.3','eye':'eye_right','eyes_symmetric':False,'input_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),'unique_id_count':len(ids),'unique_part_count':len(set(dst.xpath('//*[@data-part]/@data-part'))),'all_existing_id_elements_except_eye_right_unchanged':True,'approved_contours_and_interior_unchanged':True,'eye_left_and_its_hair_face_links_unchanged':True,'references_resolved':True,'lash_complete_source':'eye_right_upper_lash_outer_geometry','lash_shared_controller':'eye_right_upper_lash_outer_controller','formal_lash_instance':'eye_right_upper_lash_outer_instance','complete_lash_source_count':1,'closed_subpath_count':1,'independent_front_tip_geometry':False,'formal_front_overlay_instances':0,'hair_occlusion_status':'Current real hair used unchanged. Narrow source strand and its two-sided reveal still require real hair/face calibration in stage 2.4. QA-only source-position split proves linkage, not final occlusion.','absent_by_source':['lower_lashes','tear_mole','dense_upper_lash_fan'],'test_mutations_restored':True,'new_gradients':0}
(P/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
