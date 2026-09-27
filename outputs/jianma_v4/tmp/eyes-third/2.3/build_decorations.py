from pathlib import Path
from lxml import etree as ET
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[3]
TMP=Path(__file__).resolve().parent
OUT=ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.3.装饰部件线稿'
OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.2.眼内部件线稿/character.svg'
base=SOURCE.read_text(encoding='utf-8')
LASH='M 477.25,194.35 C 480.35,194.5 481.7,196.35 484.8,197.88 C 481.77,198.2 478.15,196.2 477.25,194.35 Z'
FOLD='M 457.85,196.45 C 459.3,194.43 461.76,192.72 464.13,192.47 C 464.67,192.41 465.33,192.49 465.96,192.64 C 463.1,192.56 460.1,194.05 457.85,196.45 Z'
defs=f'''
<!-- eye_left / eyes-third / 2.3: one continuous outer lash; all uses share this controller -->
<g id="eye_left_upper_lash_outer_controller" data-controller="lash-deformation" transform="translate(0 0)">
 <path id="eye_left_upper_lash_outer_geometry" d="{LASH}"/>
</g>
<path id="eye_left_eyelid_fold_geometry" d="{FOLD}"/>
'''
fold='''<g id="eye_left_eyelid_fold" data-eye-component="eyelid-fold" data-control-owner="eye_left" data-paint-order="behind-sclera">
 <title>原图内侧可辨的短眼皮褶皱</title>
 <use id="eye_left_eyelid_fold_surface" href="#eye_left_eyelid_fold_geometry" fill="#999999" stroke="none" opacity="0.7"/>
</g>
'''
lashes='''<g id="eye_left_upper_lashes" data-eye-component="upper-lashes" data-control-owner="eye_left_upper_lash_outer_controller">
 <title>一束完整外侧上睫毛；前发另一侧露出端属于同一几何源</title>
 <use id="eye_left_upper_lash_outer_instance" href="#eye_left_upper_lash_outer_controller" fill="#343434" stroke="none"/>
</g>
<g id="eye_left_decoration_construction_guides" data-role="construction-guide" display="none" aria-hidden="true" fill="none" stroke="#999999" stroke-width="0.2" stroke-dasharray="0.7 0.55">
 <use href="#eye_left_upper_lash_outer_controller"/>
 <use href="#eye_left_eyelid_fold_geometry"/>
</g>
'''
candidate=base.replace('</defs>',defs+'</defs>',1)
candidate=candidate.replace('<g id="eye_left_sclera"',fold+'<g id="eye_left_sclera"',1)
candidate=candidate.replace('<g id="eye_left_construction_guides"',lashes+'<g id="eye_left_construction_guides"',1)
candidate=candidate.replace('data-stage="2.2-interior-line-art"','data-stage="2.3-decoration-line-art"',1)
candidate=candidate.replace('角色左眼（画面右） · 轮廓与眼内部件 · 原图坐标','角色左眼（画面右） · 轮廓、眼内与装饰线稿 · 原图坐标',1)
candidate=candidate.replace('Lashes and eyelid-fold detail remain for the next step.','One continuous outer upper lash and a short source-supported eyelid fold are now included. Lower lashes and a tear mole are not discernible in the source.',1)
(OUT/'character.svg').write_text(candidate,encoding='utf-8')
src=ET.fromstring(base.encode());dst=ET.fromstring(candidate.encode())
ids=[e.get('id') for e in dst.iter() if e.get('id')]
assert len(ids)==len(set(ids))
for old in src.xpath('//*[@data-part]'):
 if old.get('data-part')!='eye_left':
  assert ET.tostring(old)==ET.tostring(dst.xpath('//*[@id=$id]',id=old.get('id'))[0])
preserved=['eye_left_sclera','eye_left_upper_lid','eye_left_lower_lid','eye_left_interior','eye_left_sclera_geometry','eye_left_aperture_geometry','eye_left_sclera_clip','eye_left_aperture_clip','eye_left_iris_geometry','eye_left_pupil_geometry','eye_left_highlight_geometry']
for id in preserved:
 a=src.xpath('//*[@id=$id]',id=id)[0];b=dst.xpath('//*[@id=$id]',id=id)[0]
 assert ET.tostring(a,with_tail=False)==ET.tostring(b,with_tail=False),id
for e in dst.iter():
 h=e.get('href')
 if h and h.startswith('#'):assert h[1:] in ids
 for v in e.attrib.values():
  for id in re.findall(r'url\(#([^)]*)\)',v):assert id in ids
assert len(re.findall(r'[Mm]',LASH))==1
assert len(re.findall(r'[Zz]',LASH))==1
assert not dst.xpath('//*[@id="eye_left_gaze"]//*[@data-eye-component="upper-lashes" or @data-eye-component="eyelid-fold"]')

def local(name,modifier=None,box=(449,184,44,30),scale=30):
 doc=ET.fromstring(candidate.encode())
 doc.set('viewBox',' '.join(map(str,box)));doc.set('width',str(box[2]*scale));doc.set('height',str(box[3]*scale))
 if modifier:modifier(doc)
 (TMP/(name+'.svg')).write_bytes(ET.tostring(doc,encoding='utf-8',xml_declaration=True))
local('candidate-eye-direct-30x')
local('candidate-eye-native',scale=1)

def isolate(doc):
 for e in doc.xpath('//*[@data-part]'):
  if e.get('data-part')!='eye_left':e.set('display','none')
 eye=doc.xpath('//*[@id="eye_left"]')[0]
 for e in eye:
  if e.tag.endswith('g') and e.get('id')!='eye_left_upper_lashes':e.set('display','none')

def moved(doc):doc.xpath('//*[@id="eye_left_upper_lash_outer_controller"]')[0].set('transform','translate(0.8 0.35)')
def curve_changed(doc):
 e=doc.xpath('//*[@id="eye_left_upper_lash_outer_geometry"]')[0]
 e.set('d',e.get('d').replace('481.7,196.35','481.7,195.8'))

def diagnostic_split(doc):
 # QA ONLY: observed source hair position; the current input hair stage has no corresponding thin strand.
 # This mask is deliberately excluded from the formal candidate. Step 2.4 owns associated hair correction.
 isolate(doc)
 ns='http://www.w3.org/2000/svg';defs=doc.find('{'+ns+'}defs')
 mask=ET.SubElement(defs,'{'+ns+'}mask',id='qa_observed_hair_gap',maskUnits='userSpaceOnUse',x='472',y='189',width='18',height='15')
 ET.SubElement(mask,'{'+ns+'}rect',x='472',y='189',width='18',height='15',fill='white')
 ET.SubElement(mask,'{'+ns+'}path',d='M 479.75,190 L 481.1,190 C 481.7,194.8 482.65,198.3 483.1,202.7 L 481.55,202.9 C 481.2,198.4 480.35,194.5 479.75,190 Z',fill='black')
 doc.xpath('//*[@id="eye_left_upper_lashes"]')[0].set('mask','url(#qa_observed_hair_gap)')

def combine(*ops):
 def f(doc):
  for op in ops:op(doc)
 return f
zoom=(472,189,18,15)
for name,fn in [('lash-complete-before',isolate),('lash-complete-moved',combine(isolate,moved)),('lash-complete-curve-edited',combine(isolate,curve_changed)),('diagnostic-hair-before',diagnostic_split),('diagnostic-hair-moved',combine(diagnostic_split,moved)),('diagnostic-hair-curve-edited',combine(diagnostic_split,curve_changed))]:
 local(name,fn,zoom,60)
local('native-hair-controller-moved',moved)
local('native-hair-source-curve-edited',curve_changed)

report={'stage':'2.3','source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),'unique_ids':len(ids),'unique_part_ids':len(set(dst.xpath('//*[@data-part]/@data-part'))),'other_parts_unchanged':True,'approved_contours_and_interior_unchanged':True,'lash_complete_source':'eye_left_upper_lash_outer_geometry','lash_shared_controller':'eye_left_upper_lash_outer_controller','formal_lash_use':'eye_left_upper_lash_outer_instance','formal_lash_source_count':1,'formal_lash_closed_subpaths':1,'additional_hair_side_tip_geometry':False,'formal_front_overlay_instances':0,'hair_occlusion_mode':'Normal input hair paint order. Source thin strand is absent in the current hair stage and remains for step 2.4; source-position split test uses a clearly identified QA-only mask.','absent_by_source':['lower_lashes','tear_mole','dense_upper_lash_fan'],'new_gradients':0,'test_mutations_restored':True}
(TMP/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
