from pathlib import Path
from lxml import etree as ET
import re, json, hashlib
ROOT=Path(__file__).resolve().parents[3]
TMP=Path(__file__).resolve().parent
OUT=ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.2.眼内部件线稿'
OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.1.轮廓部件线稿/character.svg'
base=SOURCE.read_text(encoding='utf-8')
iris='M 470.15,188.95 C 474.8,188.7 478.5,191.9 478.45,196.25 C 478.4,200.6 474.8,203.55 470.15,203.5 C 465.7,203.5 462.05,200.55 462.0,196.25 C 461.95,192.0 465.7,189.15 470.15,188.95 Z'
highlight='M 468.0,195.91 C 468.3,195.71 468.93,195.79 469.24,196.08 C 469.55,196.39 469.49,197.0 469.13,197.35 C 468.88,197.65 468.3,197.64 468.0,197.34 C 467.71,197.03 467.7,196.25 468.0,195.91 Z'
defs=f'''
<!-- eye_left / eyes-third / step 2.2: full unoutlined iris, pupil and one source-supported highlight -->
<path id="eye_left_iris_geometry" d="{iris}"/>
<ellipse id="eye_left_pupil_geometry" cx="469.3" cy="197.2" rx="2.1" ry="2.6"/>
<path id="eye_left_highlight_geometry" d="{highlight}"/>
'''
interior='''<g id="eye_left_interior" data-eye-component="interior" data-clip-owner="eye_left_sclera" clip-path="url(#eye_left_sclera_clip)">
 <g id="eye_left_aperture_window" data-blink-role="fixed-aperture-clip" clip-path="url(#eye_left_aperture_clip)">
  <g id="eye_left_gaze" data-controller="gaze" data-transform-origin="470.15 196.25">
   <title>视线控制组：只含眼黑、高光及随动辅助显示</title>
   <g id="eye_left_eyeball" data-eye-component="eyeball" data-gaze-owner="eye_left_gaze">
    <use id="eye_left_iris" href="#eye_left_iris_geometry" fill="#BCBCBC" stroke="none"/>
    <use id="eye_left_pupil" href="#eye_left_pupil_geometry" fill="#555555" stroke="none"/>
   </g>
   <g id="eye_left_highlight" data-eye-component="highlight" data-gaze-owner="eye_left_gaze">
    <title>原图可确认的一枚小高光</title>
    <use id="eye_left_highlight_surface" href="#eye_left_highlight_geometry" fill="#FFFFFF" stroke="none"/>
   </g>
   <g id="eye_left_interior_construction_guides" data-role="construction-guide" display="none" aria-hidden="true" fill="none" stroke="#808080" stroke-width="0.23" stroke-dasharray="0.65 0.45">
    <title>工作边界，引用正式几何；默认关闭，随视线组移动</title>
    <use href="#eye_left_iris_geometry"/>
    <use href="#eye_left_pupil_geometry"/>
    <use href="#eye_left_highlight_geometry"/>
   </g>
  </g>
 </g>
</g>
'''
needle='<g id="eye_left_upper_lid"'
assert base.count(needle)==1
candidate=base.replace(needle,interior+needle,1).replace('</defs>',defs+'</defs>',1)
candidate=candidate.replace('data-stage="2.1-contour-line-art"','data-stage="2.2-interior-line-art"',1)
candidate=candidate.replace('角色左眼（画面右） · 三项轮廓部件 · 原图坐标','角色左眼（画面右） · 轮廓与眼内部件 · 原图坐标',1)
candidate=candidate.replace('No iris, lashes or eyelid-fold detail is completed at this step.','Iris, pupil and one highlight are now established. Lashes and eyelid-fold detail remain for the next step.',1)
(OUT/'character.svg').write_text(candidate,encoding='utf-8')
src=ET.fromstring(base.encode()); dst=ET.fromstring(candidate.encode())
ns={'s':'http://www.w3.org/2000/svg'}
ids=[x.get('id') for x in dst.iter() if x.get('id')]
assert len(ids)==len(set(ids))
for old in src.xpath('//*[@data-part]'):
 if old.get('data-part')!='eye_left':
  new=dst.xpath('//*[@id=$id]',id=old.get('id'))[0]
  assert ET.tostring(old)==ET.tostring(new), old.get('id')
contour_ids=['eye_left_sclera','eye_left_upper_lid','eye_left_lower_lid','eye_left_sclera_geometry','eye_left_aperture_geometry','eye_left_sclera_clip','eye_left_aperture_clip','eye_left_upper_lid_cover_clip','eye_left_construction_guides','eye_left_recovery']
for id in contour_ids:
 a=src.xpath('//*[@id=$id]',id=id)[0]; b=dst.xpath('//*[@id=$id]',id=id)[0]
 assert ET.tostring(a,with_tail=False)==ET.tostring(b,with_tail=False),f'changed approved contour {id}'
for e in dst.iter():
 h=e.get('href')
 if h and h.startswith('#'): assert h[1:] in ids
 for v in e.attrib.values():
  for ref in re.findall(r'url\(#([^)]*)\)',v): assert ref in ids
eye=dst.xpath('//*[@id="eye_left"]')[0]
children=[x.get('id') for x in eye if x.tag.endswith('g')]
assert children.index('eye_left_sclera')<children.index('eye_left_interior')<children.index('eye_left_upper_lid')<children.index('eye_left_lower_lid')
gaze=dst.xpath('//*[@id="eye_left_gaze"]')[0]
assert not gaze.xpath('.//*[@data-blink-role]')
assert not gaze.xpath('.//*[@data-eye-component="upper-lid" or @data-eye-component="lower-lid"]')

def edit_unclipped(doc):
 for e in doc.xpath('//*[@data-part]'):
  if e.get('data-part')!='eye_left':e.set('display','none')
 for id in ['eye_left_sclera','eye_left_upper_lid','eye_left_lower_lid']:
  doc.xpath('//*[@id=$id]',id=id)[0].set('display','none')
 for id in ['eye_left_interior','eye_left_aperture_window']:
  doc.xpath('//*[@id=$id]',id=id)[0].attrib.pop('clip-path',None)
 doc.xpath('//*[@id="eye_left_interior_construction_guides"]')[0].set('display','inline')

def edit_gaze(doc):doc.xpath('//*[@id="eye_left_gaze"]')[0].set('transform','translate(2 0)')
def edit_blink(doc):
 # Closing acts on the fixed aperture; every iris/pupil/highlight geometry remains untouched.
 doc.xpath('//*[@id="eye_left_aperture_geometry"]')[0].set('d','M 455.75,201.6 C 463,200.1 474,198.5 482.2,196.75 C 474,199.25 463,200.85 455.75,201.6 Z')

box=(449,184,44,30)
def local(name,modifier=None):
 doc=ET.fromstring(candidate.encode())
 doc.set('viewBox',' '.join(map(str,box)));doc.set('width','1320');doc.set('height','900')
 if modifier:modifier(doc)
 (TMP/(name+'.svg')).write_bytes(ET.tostring(doc,xml_declaration=True,encoding='utf-8'))
local('candidate-eye-direct-30x')
local('complete-interior-unclipped-30x',edit_unclipped)
local('gaze-offset-test-30x',edit_gaze)
local('aperture-close-test-30x',edit_blink)
native=ET.fromstring(candidate.encode()); native.set('viewBox','449 184 44 30');native.set('width','44');native.set('height','30')
(TMP/'candidate-eye-native.svg').write_bytes(ET.tostring(native,xml_declaration=True,encoding='utf-8'))

# Render masks from actual shared geometry to quantify only the visible intersection.
for name,geometry,clipped in [('aperture','eye_left_aperture_geometry',False),('iris-visible','eye_left_iris_geometry',True),('iris-complete','eye_left_iris_geometry',False),('pupil-visible','eye_left_pupil_geometry',True),('highlight-visible','eye_left_highlight_geometry',True)]:
 defs_xml=ET.tostring(dst.find('s:defs',ns),encoding='unicode')
 element=f'<use href="#{geometry}" fill="black"/>'
 if clipped:element=f'<g clip-path="url(#eye_left_sclera_clip)"><g clip-path="url(#eye_left_aperture_clip)">{element}</g></g>'
 mask=f'<svg xmlns="http://www.w3.org/2000/svg" width="2640" height="1800" viewBox="449 184 44 30">{defs_xml}<rect x="449" y="184" width="44" height="30" fill="white"/>{element}</svg>'
 (TMP/('mask-'+name+'.svg')).write_text(mask,encoding='utf-8')

report={'stage':'2.2','source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),'unique_ids':len(ids),'unique_part_ids':len(set(dst.xpath('//*[@data-part]/@data-part'))),'part_elements':len(dst.xpath('//*[@data-part]')),'approved_contour_geometry_unchanged':True,'other_parts_unchanged':True,'references_resolved':True,'iris_pupil_highlight_formal_stroke':'none','gaze_group':'eye_left_gaze','static_clips':['eye_left_sclera_clip','eye_left_aperture_clip'],'lid_paint_order_after_interior':True,'formal_highlight_count':1,'full_iris_shape':'slightly asymmetric oval, not assumed circular','new_gradients':0}
(TMP/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
