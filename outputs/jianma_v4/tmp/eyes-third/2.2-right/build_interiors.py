from pathlib import Path
from lxml import etree as E
import json,re,hashlib
P=Path(__file__).resolve().parent;R=P.parents[2]
OUT=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.2.眼内部件线稿';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.1.轮廓部件线稿/character.svg'
base=SOURCE.read_text(encoding='utf-8')
plan=json.loads((R/'refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'))
assert plan['eyes_symmetric'] is False and plan['mirror'] is None
assert hashlib.sha256((R/'references/base-subject.png').read_bytes()).hexdigest()==plan['reference_sha256']
# Independent target-eye source observations, absolute original canvas coordinates.
iris='M 418.20,189.65 C 422.50,189.60 425.95,192.80 425.95,196.60 C 425.95,200.60 422.80,203.90 418.55,203.90 C 414.10,203.90 410.70,201.40 410.65,197.00 C 410.60,192.65 413.70,189.70 418.20,189.65 Z'
highlight='M 418.20,196.17 C 418.56,195.96 419.19,196.05 419.52,196.37 C 419.82,196.66 419.77,197.24 419.45,197.60 C 419.13,197.91 418.48,197.91 418.17,197.62 C 417.89,197.31 417.88,196.50 418.20,196.17 Z'
defs=f'''
<!-- eye_right / eyes-third / 2.2: independently placed full iris, pupil, one highlight -->
<path id="eye_right_iris_geometry" d="{iris}"/>
<ellipse id="eye_right_pupil_geometry" cx="418.15" cy="197.40" rx="1.95" ry="2.60" transform="rotate(-18 418.15 197.40)"/>
<path id="eye_right_highlight_geometry" d="{highlight}"/>
'''
interior='''<g id="eye_right_interior" data-eye-component="interior" data-clip-owner="eye_right_sclera" clip-path="url(#eye_right_sclera_clip)">
 <g id="eye_right_aperture_window" data-blink-role="fixed-aperture-clip" clip-path="url(#eye_right_aperture_clip)">
  <g id="eye_right_gaze" data-controller="gaze" data-transform-origin="418.20 196.60">
   <title>视线控制：仅眼黑、独立高光及随动工作线</title>
   <g id="eye_right_eyeball" data-eye-component="eyeball" data-gaze-owner="eye_right_gaze">
    <use id="eye_right_iris" href="#eye_right_iris_geometry" fill="#BCBCBC" stroke="none"/>
    <use id="eye_right_pupil" href="#eye_right_pupil_geometry" fill="#555555" stroke="none"/>
   </g>
   <g id="eye_right_highlight" data-eye-component="highlight" data-gaze-owner="eye_right_gaze">
    <title>原图可辨的一枚上方小高光</title>
    <use id="eye_right_highlight_surface" href="#eye_right_highlight_geometry" fill="#FFFFFF" stroke="none"/>
   </g>
   <g id="eye_right_interior_construction_guides" data-role="construction-guide" display="none" aria-hidden="true" fill="none" stroke="#808080" stroke-width="0.23" stroke-dasharray="0.65 0.45">
    <title>引用正式几何的辅助边界；正式显示关闭</title>
    <use href="#eye_right_iris_geometry"/><use href="#eye_right_pupil_geometry"/><use href="#eye_right_highlight_geometry"/>
   </g>
  </g>
 </g>
</g>
'''
needle='<g id="eye_right_upper_lid"';assert base.count(needle)==1
candidate=base.replace(needle,interior+needle,1).replace('</defs>',defs+'</defs>',1)
candidate=candidate.replace('data-stage="2.1-contour-line-art" data-source-eye="eye_right"','data-stage="2.2-interior-line-art" data-source-eye="eye_right"',1)
candidate=candidate.replace('角色右眼（画面左） · 原图独立测量的三项轮廓部件','角色右眼（画面左） · 原图独立轮廓、眼黑和高光',1)
candidate=candidate.replace('this stage does not complete iris or decorations.','iris, pupil and one highlight are established; decorations remain for later stages.',1)
# The 2.2 source-width check exposed excess white at both flanks. Parent approved
# repairing only the current eye's contours while retaining the iris and gaze position.
repair_upper='M 406.25,197.25 C 409.05,195.75 412.45,195.45 416.75,195.60 C 420.00,195.66 424.45,196.55 425.80,198.00 C 426.65,199.00 428.45,201.20 430.65,201.85'
repair_lower='C 429.00,201.40 427.25,202.15 424.50,202.95 C 420.55,204.00 414.95,204.06 411.65,203.02 C 410.05,202.05 409.45,200.93 409.10,199.55 C 408.80,198.60 407.80,197.20 406.25,197.25 Z'
repairs={
 'eye_right_sclera_geometry':'M 406.25,197.25 C 407.45,192.65 410.90,191.00 415.45,191.10 C 422.40,191.13 428.27,194.85 430.65,201.85 '+repair_lower,
 'eye_right_aperture_geometry':repair_upper+' '+repair_lower,
 'eye_right_upper_lid_contour':'M 406.25,197.25 C 407.30,194.85 409.85,193.65 413.00,193.60 C 420.95,193.25 427.10,195.97 430.65,201.85 C 428.45,201.20 426.65,199.00 425.80,198.00 C 424.45,196.55 420.00,195.66 416.75,195.60 C 412.45,195.45 409.05,195.75 406.25,197.25 Z',
 'eye_right_lower_lid_contour':'M 430.65,201.85 '+repair_lower[:-2]+' C 407.65,198.25 407.85,200.32 409.00,201.60 C 409.70,202.65 410.40,203.55 411.40,203.80 C 415.15,204.78 420.72,204.57 424.72,203.61 C 427.40,202.75 429.00,201.76 430.65,201.85 Z'
}
# These corrections are now backported into the formal 2.1 input. Do not mutate
# contours again in 2.2; retain this map only as the repair audit record.
(OUT/'character.svg').write_text(candidate,encoding='utf-8')
src=E.fromstring(base.encode());dst=E.fromstring(candidate.encode());ns={'s':'http://www.w3.org/2000/svg'}
ids=[x.get('id') for x in dst.iter() if x.get('id')];assert len(ids)==len(set(ids))
for x in src.xpath('//*[@id]'):
 if x.get('id')=='eye_right':continue
 y=dst.xpath('//*[@id=$id]',id=x.get('id'))[0]
 assert E.tostring(x,with_tail=False)==E.tostring(y,with_tail=False),x.get('id')
for x in dst.iter():
 for k,v in x.attrib.items():
  if k=='href' and v.startswith('#'):assert v[1:] in ids
  for ref in re.findall(r'url\(#([^)]*)\)',v):assert ref in ids
eye=dst.xpath('//*[@id="eye_right"]')[0];order=[x.get('id') for x in eye if isinstance(x.tag,str) and x.tag.endswith('g')]
assert order.index('eye_right_sclera')<order.index('eye_right_interior')<order.index('eye_right_upper_lid')<order.index('eye_right_lower_lid')
gaze=dst.xpath('//*[@id="eye_right_gaze"]')[0]
assert not gaze.xpath('.//*[@data-blink-role]')
assert all(x.get('data-eye-component') not in ['upper-lid','lower-lid'] for x in gaze.iter())
def isolate(doc):
 for x in doc.xpath('//*[@data-part]'):
  if x.get('data-part')!='eye_right':x.set('display','none')
def unclipped(doc):
 isolate(doc)
 for i in ['eye_right_sclera','eye_right_upper_lid','eye_right_lower_lid']:doc.xpath('//*[@id=$id]',id=i)[0].set('display','none')
 for i in ['eye_right_interior','eye_right_aperture_window']:doc.xpath('//*[@id=$id]',id=i)[0].attrib.pop('clip-path',None)
 doc.xpath('//*[@id="eye_right_interior_construction_guides"]')[0].set('display','inline')
def offset(doc):doc.xpath('//*[@id="eye_right_gaze"]')[0].set('transform','translate(2 0)')
def closing(doc):doc.xpath('//*[@id="eye_right_aperture_geometry"]')[0].set('d','M 406.25,197.25 C 413,197.6 424,199.3 430.65,201.85 C 424,200.1 413,198.4 406.25,197.25 Z')
def guide(doc):doc.xpath('//*[@id="eye_right_interior_construction_guides"]')[0].set('display','inline')
def local(name,box=(393,184,44,30),scale=30,edit=None):
 doc=E.fromstring(candidate.encode());doc.set('viewBox',' '.join(map(str,box)));doc.set('width',str(box[2]*scale));doc.set('height',str(box[3]*scale))
 if edit:edit(doc)
 (P/(name+'.svg')).write_bytes(E.tostring(doc,xml_declaration=True,encoding='utf-8'))
local('candidate-eye-direct-30x');local('candidate-eye-native',scale=1)
local('complete-interior-unclipped-30x',edit=unclipped)
local('gaze-offset-test-30x',edit=offset);local('aperture-close-test-30x',edit=closing)
local('construction-direct-30x',edit=guide)
local('face-context-direct-8x',box=(384,175,119,46),scale=8)
for name,geometry,clip in [('aperture','eye_right_aperture_geometry',False),('iris-visible','eye_right_iris_geometry',True),('iris-complete','eye_right_iris_geometry',False),('pupil-visible','eye_right_pupil_geometry',True),('highlight-visible','eye_right_highlight_geometry',True)]:
 defs_xml=E.tostring(dst.find('s:defs',ns),encoding='unicode')
 element=f'<use href="#{geometry}" fill="black"/>'
 if clip:element=f'<g clip-path="url(#eye_right_sclera_clip)"><g clip-path="url(#eye_right_aperture_clip)">{element}</g></g>'
 mask=f'<svg xmlns="http://www.w3.org/2000/svg" width="2640" height="1800" viewBox="393 184 44 30">{defs_xml}<rect x="393" y="184" width="44" height="30" fill="white"/>{element}</svg>'
 (P/('mask-'+name+'.svg')).write_text(mask,encoding='utf-8')
report={'stage':'2.2','eye':'eye_right','eyes_symmetric':False,'input_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),'unique_id_count':len(ids),'unique_part_count':len(set(dst.xpath('//*[@data-part]/@data-part'))),'all_unrelated_existing_elements_unchanged':True,'parent_authorized_contour_repair':True,'contour_repair_backported_to_formal_2_1':True,'contours_identical_to_revised_2_1_input':True,'repaired_geometry_ids':list(repairs)+['eye_right_upper_lid_cover_clip'],'iris_pupil_highlight_geometry_unchanged_during_contour_repair':True,'other_eye_and_hair_face_links_unchanged':True,'references_resolved':True,'formal_iris_pupil_highlight_strokes':'none','static_clip_owners':['eye_right_sclera_clip','eye_right_aperture_clip'],'gaze_group':'eye_right_gaze','eyelids_after_interior':True,'formal_highlight_count':1,'new_gradients':0,'iris_hidden_completion':'Independent slightly asymmetric oval, not a mirrored circle.'}
(P/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
