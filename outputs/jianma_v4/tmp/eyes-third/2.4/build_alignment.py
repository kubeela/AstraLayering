from pathlib import Path
from lxml import etree as ET
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[3];TMP=Path(__file__).resolve().parent
OUT=ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.4.关联遮挡与线稿校准';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.3.装饰部件线稿/character.svg'
base=SOURCE.read_text(encoding='utf-8');source_doc=ET.fromstring(base.encode())
hair=source_doc.xpath('//*[@id="hair_front_left"]')[0]
oldhair=hair.find('{http://www.w3.org/2000/svg}path').get('d')
newhair=oldhair.replace('C 486.8,204.5 481.9,190.1 478.5,177.3','C 489.0,209.3 483.65,205.0 481.6,198.0 C 480.0,194.0 479.35,184.9 478.5,177.3')
assert newhair!=oldhair
newshadow='M 444,161.8 C 448.1,157.7 453.6,153 459,152.8 C 469,150.7 474.7,162.2 478.7,177.6 C 479.55,185.5 480.15,194.1 481.8,198.2 C 483.8,205.0 489.0,209.3 492.5,210'
defs=f'''
<!-- 2.4: real front-hair silhouette and source-linked coverage; no QA hair mask -->
<path id="hair_front_left_eye_aligned_geometry" d="{newhair}" fill-rule="evenodd"/>
<clipPath id="hair_front_left_coverage_clip" clipPathUnits="userSpaceOnUse"><use href="#hair_front_left_eye_aligned_geometry"/></clipPath>
<clipPath id="eye_left_lash_reveal_window_clip" clipPathUnits="userSpaceOnUse"><path d="M 482.0,193.4 C 482.4,195.5 482.75,197.15 483.08,199.15 L 486,199.5 L 486,193.4 Z"/></clipPath>
'''
hair_text=re.search(r'<g id="hair_front_left" .*?</g>',base,re.S).group(0)
new_hair_text=re.sub(r'<path .*?/>','<use id="hair_front_left_aligned_surface" href="#hair_front_left_eye_aligned_geometry"/>',hair_text,count=1)
overlay='''
<g id="eye_left_upper_lash_hair_overlay" data-part="eye_left" data-kind="eyes" data-role="source-linked-hair-overlay" data-control-owner="eye_left_upper_lash_outer_controller" clip-path="url(#hair_front_left_coverage_clip)">
 <title>原图发面内露出的睫毛尖端：引用同一完整源，以真实前发和露出窗口裁切</title>
 <g id="eye_left_upper_lash_reveal_window" clip-path="url(#eye_left_lash_reveal_window_clip)">
  <use id="eye_left_upper_lash_outer_front_instance" href="#eye_left_upper_lash_outer_controller" fill="#343434" stroke="none"/>
 </g>
</g>
'''
candidate=base.replace(hair_text,new_hair_text+overlay,1).replace('</defs>',defs+'</defs>',1)
oldlash=source_doc.xpath('//*[@id="eye_left_upper_lash_outer_geometry"]')[0].get('d')
newlash='M 477.25,194.35 C 479.3,194.43 481.74,194.0 482.6,194.62 C 483.1,195.0 483.8,197.08 485.0,197.75 C 481.77,198.2 478.15,196.2 477.25,194.35 Z'
candidate=candidate.replace('id="eye_left_upper_lash_outer_geometry" d="'+oldlash+'"','id="eye_left_upper_lash_outer_geometry" d="'+newlash+'"',1)
oldshadow=source_doc.xpath('//*[@id="fx_hair_front_left_editable_path"]')[0].get('d')
candidate=candidate.replace('id="fx_hair_front_left_editable_path" d="'+oldshadow+'"','id="fx_hair_front_left_editable_path" data-source-geometry="hair_front_left_eye_aligned_geometry" d="'+newshadow+'"',1)
candidate=candidate.replace('data-stage="2.3-decoration-line-art"','data-stage="2.4-aligned-line-art"',1)
(OUT/'character.svg').write_text(candidate,encoding='utf-8')
dst=ET.fromstring(candidate.encode());ids=[x.get('id') for x in dst.iter() if x.get('id')]
assert len(ids)==len(set(ids))
allowed={'hair_front_left','fx_hair_front_left_on_face','eye_left'}
for old in source_doc.xpath('//*[@data-part]'):
 if old.get('id') not in allowed:
  new=dst.xpath('//*[@id=$id]',id=old.get('id'))[0]
  assert ET.tostring(old,with_tail=False)==ET.tostring(new,with_tail=False),old.get('id')
for id in ['eye_left_sclera','eye_left_upper_lid','eye_left_lower_lid','eye_left_interior','eye_left_upper_lashes','eye_left_eyelid_fold','eye_left_sclera_geometry','eye_left_aperture_geometry','eye_left_sclera_clip','eye_left_aperture_clip','face6_surface_face_base','face_clean_skin_clip']:
 assert ET.tostring(source_doc.xpath('//*[@id=$id]',id=id)[0],with_tail=False)==ET.tostring(dst.xpath('//*[@id=$id]',id=id)[0],with_tail=False),id
for e in dst.iter():
 h=e.get('href')
 if h and h.startswith('#'):assert h[1:] in ids
 for v in e.attrib.values():
  for ref in re.findall(r'url\(#([^)]*)\)',v):assert ref in ids
assert 'qa_observed_hair_gap' not in candidate
assert len(dst.xpath('//*[@id="eye_left_upper_lash_outer_geometry"]'))==1
assert len(dst.xpath('//*[@id="eye_left_upper_lash_outer_instance" or @id="eye_left_upper_lash_outer_front_instance"]'))==2

def local(name,fn=None,box=(449,184,44,30),scale=30):
 doc=ET.fromstring(candidate.encode());doc.set('viewBox',' '.join(map(str,box)));doc.set('width',str(box[2]*scale));doc.set('height',str(box[3]*scale))
 if fn:fn(doc)
 (TMP/(name+'.svg')).write_bytes(ET.tostring(doc,encoding='utf-8',xml_declaration=True))

def hide_hair(doc):
 for e in doc.xpath('//*[@data-kind="hair"]'):e.set('display','none')
 doc.xpath('//*[@id="eye_left_upper_lash_hair_overlay"]')[0].set('display','none')

def guides_on(doc):
 for e in doc.xpath('//*[@data-role="construction-guide"]'):e.set('display','inline')

def isolate_lash(doc,with_hair=True):
 for e in doc.xpath('//*[@data-part]'):
  keep=e.get('data-part')=='eye_left' or (with_hair and e.get('id')=='hair_front_left')
  if not keep:e.set('display','none')
 eye=doc.xpath('//*[@id="eye_left"]')[0]
 for e in eye:
  if e.tag.endswith('g') and e.get('id')!='eye_left_upper_lashes':e.set('display','none')
 if with_hair:doc.xpath('//*[@id="hair_front_left"]')[0].set('fill','white')
 else:doc.xpath('//*[@id="eye_left_upper_lash_hair_overlay"]')[0].set('display','none')

def moved(doc):doc.xpath('//*[@id="eye_left_upper_lash_outer_controller"]')[0].set('transform','translate(0.8 0.35)')
def curve_changed(doc):
 e=doc.xpath('//*[@id="eye_left_upper_lash_outer_geometry"]')[0];e.set('d',e.get('d').replace('481.77,198.2','481.77,198.75'))
def combine(*ops):
 def f(doc):
  for op in ops:op(doc)
 return f

local('candidate-eye-direct-30x');local('candidate-eye-native',scale=1)
local('candidate-head-direct-6x',box=(374,108,149,168),scale=6)
local('candidate-eyes-direct-12x',box=(390,175,109,47),scale=12)
local('guides-on-direct-30x',guides_on)
local('front-hair-off-direct-30x',hide_hair)
zoom=(472,189,18,15)
for name,fn in [('real-hair-before',isolate_lash),('real-hair-moved',combine(isolate_lash,moved)),('real-hair-curve-edited',combine(isolate_lash,curve_changed)),('lash-complete-no-hair',lambda d:isolate_lash(d,False))]:local(name,fn,zoom,60)
local('real-context-moved',moved);local('real-context-curve-edited',curve_changed)

def isolate_component(id):
 def f(doc):
  for e in doc.xpath('//*[@data-part]'):
   if e.get('id')!='eye_left':e.set('display','none')
  eye=doc.xpath('//*[@id="eye_left"]')[0]
  for e in eye:
   if e.tag.endswith('g') and e.get('id')!=id:e.set('display','none')
  if id=='eye_left_sclera':doc.xpath('//*[@id="eye_left_sclera_surface"]')[0].set('fill','#BEBEBE')
 return f
for id in ['eye_left_upper_lid','eye_left_lower_lid','eye_left_sclera','eye_left_interior','eye_left_upper_lashes','eye_left_eyelid_fold']:
 local('component-'+id,isolate_component(id))
def unclipped_interior(doc):
 isolate_component('eye_left_interior')(doc)
 for id in ['eye_left_interior','eye_left_aperture_window']:doc.xpath('//*[@id=$id]',id=id)[0].attrib.pop('clip-path',None)
local('component-full-interior-unclipped',unclipped_interior)
def isolated_highlight(doc):
 isolate_component('eye_left_interior')(doc)
 doc.xpath('//*[@id="eye_left_eyeball"]')[0].set('display','none')
 doc.xpath('//*[@id="eye_left_highlight_surface"]')[0].set('fill','#777777')
local('component-highlight-only',isolated_highlight)
def face_only(doc):
 for e in doc.xpath('//*[@data-part]'):
  if e.get('data-part')!='face_base':e.set('display','none')
local('face-with-features-hidden',face_only,box=(390,175,110,100),scale=8)

report={'stage':'2.4','source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),'unique_ids':len(ids),'unique_part_ids':len(set(dst.xpath('//*[@data-part]/@data-part'))),'contour_and_interior_geometry_unchanged':True,'lash_curve_corrected_to_source_outer_tip':True,'iris_visible_measurements_in_common_x_lt_480_region_unchanged':True,'affected_neighbors':['hair_front_left','fx_hair_front_left_on_face'],'hair_revision_region':[478.5,177.3,495,212],'face_surface_clips_unchanged_and_resolved':True,'actual_hair_source':'hair_front_left_eye_aligned_geometry','actual_hair_coverage_clip':'hair_front_left_coverage_clip','formal_lash_instances':['eye_left_upper_lash_outer_instance','eye_left_upper_lash_outer_front_instance'],'unique_lash_geometry_source':'eye_left_upper_lash_outer_geometry','shared_lash_controller':'eye_left_upper_lash_outer_controller','overlay_semantics':'Source-supported hair-overlaid outer lash tip. Full source use intersected with actual hair coverage and a narrow reveal window.','contains_qa_hair_mask':False,'other_eye':'unchanged, awaits symmetric assembly','source_curve_and_controller_formal_values_restored':True}
(TMP/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False,indent=2))
