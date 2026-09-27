from pathlib import Path
from copy import deepcopy
import json,re,hashlib,math
from lxml import etree as E
P=Path(__file__).resolve().parent
R=P.parents[2]
OUT=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.1.轮廓部件线稿'
OUT.mkdir(parents=True,exist_ok=True)
SRC=R/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.4.关联遮挡与线稿校准/character.svg'
base=SRC.read_text(encoding='utf-8')
plan=json.loads((R/'refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'))
assert plan['eyes_symmetric'] is False and plan['mirror'] is None
assert [e['id'] for e in plan['eyes']]==['eye_left','eye_right']
assert hashlib.sha256((R/'references/base-subject.png').read_bytes()).hexdigest()==plan['reference_sha256']

# Independently fitted to the screen-left eye of the original image.
# No geometry is copied or reflected from eye_left or diagnostic mirror files.
O=(406.25,197.25); I=(430.65,201.85)
upper_segments=[
 [O,(409.05,195.75),(412.45,195.45),(416.75,195.60)],
 [(416.75,195.60),(420.00,195.66),(424.45,196.55),(425.80,198.00)],
 [(425.80,198.00),(426.65,199.00),(428.45,201.20),I],
]
lower_segments=[
 [I,(429.0,201.40),(427.25,202.15),(424.50,202.95)],
 [(424.50,202.95),(420.55,204.00),(414.95,204.06),(411.65,203.02)],
 [(411.65,203.02),(410.05,202.05),(409.45,200.93),(409.10,199.55)],
 [(409.10,199.55),(408.80,198.60),(407.80,197.20),O],
]
def path_for(segments,start=True):
    s='M '+','.join(map(str,segments[0][0]))+' ' if start else ''
    return s+' '.join('C '+' '.join(','.join(map(str,pt)) for pt in seg[1:]) for seg in segments)
upper=path_for(upper_segments)
lower=path_for(lower_segments,False)+' Z'
aperture=upper+' '+lower
surface='M 406.25,197.25 C 407.45,192.65 410.9,191.0 415.45,191.1 C 422.4,191.13 428.27,194.85 430.65,201.85 '+lower
cover=upper+' L 435,186 L 400,186 Z'
upper_ink='''M 406.25,197.25
 C 407.3,194.85 409.85,193.65 413.0,193.60
 C 420.95,193.25 427.10,195.97 430.65,201.85
 C 428.45,201.20 426.65,199.00 425.80,198.00
 C 424.45,196.55 420.00,195.66 416.75,195.60
 C 412.45,195.45 409.05,195.75 406.25,197.25 Z'''
lower_ink='''M 430.65,201.85
 C 429.0,201.40 427.25,202.15 424.50,202.95
 C 420.55,204.00 414.95,204.06 411.65,203.02
 C 410.05,202.05 409.45,200.93 409.10,199.55
 C 408.80,198.60 407.80,197.20 406.25,197.25
 C 407.65,198.25 407.85,200.32 409.00,201.60
 C 409.70,202.65 410.40,203.55 411.40,203.80
 C 415.15,204.78 420.72,204.57 424.72,203.61
 C 427.40,202.75 429.00,201.76 430.65,201.85 Z'''
definitions=f'''
<!-- eye_right / eyes-third / independent source fit / stage 2.1 -->
<path id="eye_right_sclera_geometry" d="{surface}"/>
<path id="eye_right_aperture_geometry" d="{aperture}"/>
<clipPath id="eye_right_sclera_clip" clipPathUnits="userSpaceOnUse"><use href="#eye_right_sclera_geometry"/></clipPath>
<clipPath id="eye_right_aperture_clip" clipPathUnits="userSpaceOnUse"><use href="#eye_right_aperture_geometry"/></clipPath>
<clipPath id="eye_right_upper_lid_cover_clip" clipPathUnits="userSpaceOnUse"><path d="{cover}"/></clipPath>
'''
old=re.search(r'<g id="eye_right" .*?</g>',base,re.S)
assert old
archive=old.group().replace('id="eye_right"','id="eye_right_legacy_block"',1).replace(' data-part="eye_right" data-kind="eyes"','',1)
group=f'''<g id="eye_right" data-part="eye_right" data-kind="eyes" fill="none" data-stage="2.1-contour-line-art" data-source-eye="eye_right">
<title>角色右眼（画面左） · 原图独立测量的三项轮廓部件</title>
<desc>Original-coordinate independent geometry. Continuous sclera continues under the upper lid. Outer corner is partly uncertain beneath the front hair; this stage does not complete iris or decorations.</desc>
<g id="eye_right_recovery" data-role="legacy-recovery" display="none" aria-hidden="true"><title>输入占位可恢复记录；正式显示关闭</title>{archive}</g>
<g id="eye_right_sclera" data-eye-component="sclera" data-blink-role="continuous-under-lids">
 <title>完整无孔眼白；上方藏于上眼睑遮挡面之下</title>
 <use id="eye_right_sclera_surface" href="#eye_right_sclera_geometry" fill="#FFFFFF" stroke="none"/>
</g>
<g id="eye_right_upper_lid" data-eye-component="upper-lid" data-blink-role="upper-lid-occlusion">
 <title>上眼睑：中性遮挡面和正式上缘</title>
 <use id="eye_right_upper_lid_surface" href="#eye_right_sclera_geometry" clip-path="url(#eye_right_upper_lid_cover_clip)" fill="#F6F6F6" stroke="none"/>
 <path id="eye_right_upper_lid_contour" d="{upper_ink}" fill="#343434" stroke="none"/>
</g>
<g id="eye_right_lower_lid" data-eye-component="lower-lid" data-blink-role="lower-lid-occlusion">
 <title>下眼睑：外侧陡降折入下缘，内侧渐细收尖</title>
 <path id="eye_right_lower_lid_contour" d="{lower_ink}" fill="#777777" stroke="none"/>
</g>
<g id="eye_right_construction_guides" data-role="construction-guide" display="none" aria-hidden="true" fill="none" stroke="#929292" stroke-width="0.28" stroke-dasharray="0.8 0.65">
 <title>仅工作线；共用完整眼白和开合几何，正式显示关闭</title>
 <use href="#eye_right_sclera_geometry"/>
 <use href="#eye_right_aperture_geometry"/>
</g>
</g>'''
candidate=(base[:old.start()]+group+base[old.end():]).replace('</defs>',definitions+'</defs>',1)
(OUT/'character.svg').write_text(candidate,encoding='utf-8')
src=E.fromstring(base.encode()); dst=E.fromstring(candidate.encode())
ids=[x.get('id') for x in dst.iter() if x.get('id')]
assert len(ids)==len(set(ids))
for x in src.xpath('//*[@data-part]'):
    if x.get('data-part')!='eye_right':
        y=dst.xpath('//*[@id=$id]',id=x.get('id'))[0]
        assert E.tostring(x)==E.tostring(y),x.get('id')
# Stronger guard: every existing source resource stays identical, including eye_left,
# its cross-layer overlay, actual hair, and face shadow/cropping resources.
changed_existing=[]
for x in src.xpath('//*[@id]'):
    if x.get('id')=='eye_right':continue
    y=dst.xpath('//*[@id=$id]',id=x.get('id'))[0]
    if E.tostring(x,with_tail=False)!=E.tostring(y,with_tail=False):changed_existing.append(x.get('id'))
assert not changed_existing,changed_existing
for x in dst.iter():
    for k,v in x.attrib.items():
        if k in ['href','{http://www.w3.org/1999/xlink}href'] and v.startswith('#'):assert v[1:] in ids
        for target in re.findall(r'url\(#([^)]*)\)',v):assert target in ids
assert len(re.findall(r'[Mm]',surface))==1 and surface.endswith('Z')
assert len(dst.xpath('//*[@data-part="eye_right"]'))==1

def local(name,box,scale,edit=None):
    doc=E.fromstring(candidate.encode())
    doc.set('viewBox',' '.join(map(str,box)))
    doc.set('width',str(box[2]*scale));doc.set('height',str(box[3]*scale))
    if edit:edit(doc)
    (P/(name+'.svg')).write_bytes(E.tostring(doc,xml_declaration=True,encoding='utf-8'))
def isolate_eye(doc):
    for x in doc.xpath('//*[@data-part]'):
        if x.get('data-part')!='eye_right':x.set('display','none')
def guide(doc):
    isolate_eye(doc)
    doc.xpath('//*[@id="eye_right_construction_guides"]')[0].set('display','inline')
    doc.xpath('//*[@id="eye_right_upper_lid_surface"]')[0].set('opacity','0.15')
def sclera(doc):
    isolate_eye(doc)
    for i in ['eye_right_upper_lid','eye_right_lower_lid']:doc.xpath('//*[@id=$id]',id=i)[0].set('display','none')
    doc.xpath('//*[@id="eye_right_sclera_surface"]')[0].set('fill','#BEBEBE')
def nohair(doc):
    for x in doc.xpath('//*[@data-kind="hair"]'):x.set('display','none')
box=(393,184,44,30)
local('candidate-eye-direct-30x',box,30)
local('candidate-eye-native',box,1)
local('construction-direct-30x',box,30,guide)
local('sclera-uncovered-direct-30x',box,30,sclera)
local('hair-hidden-direct-30x',box,30,nohair)
local('face-context-direct-8x',(384,175,119,46),8)
local('head-native',(369,133,150,145),1)

def cubic(a,b,c,d,t):return tuple((1-t)**3*a[i]+3*(1-t)**2*t*b[i]+3*(1-t)*t*t*c[i]+t**3*d[i] for i in range(2))
us=[cubic(*s,i/2000) for s in upper_segments for i in range(2001)]
ls=[cubic(*s,i/2000) for s in lower_segments for i in range(2001)]
top=min(us,key=lambda p:p[1]);bottom=max(ls,key=lambda p:p[1])
metrics={'inner_corner':I,'outer_corner_partly_inferred':O,'upper_aperture_extreme':top,'lower_aperture_extreme':bottom,'lower_inner_turn':[424.50,202.95],'lower_outer_turn':[411.65,203.02],'outer_rise':[409.10,199.55],'eye_width':I[0]-O[0],'eye_height':bottom[1]-top[1],'outer_to_inner_chord_tilt_degrees':math.degrees(math.atan2(I[1]-O[1],I[0]-O[0])),'upper_segments':upper_segments,'lower_segments':lower_segments,'uncertainty_px':{'visible_antialiased_edge':0.65,'occluded_outer_corner':1.0},'measurement_basis':'Independent observation of the source screen-left eye; no eye geometry copied or mirrored. Contours revised after 2.2 white-distribution check; original snapshot under 2.2-right/contour-before-repair.'}
(P/'geometry-metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
report={'stage':'2.1','eye':'eye_right','eyes_symmetric':False,'canvas':[941,1672],'input_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),'unique_id_count':len(ids),'unique_part_count':len(set(x.get('data-part') for x in dst.xpath('//*[@data-part]'))),'all_existing_id_elements_except_eye_right_unchanged':True,'unchanged_other_parts':True,'unchanged_eye_left_hair_face_and_cross_layer_resources':True,'references_resolved':True,'single_closed_sclera_contour':True,'legacy_display':'none','construction_default_display':'none','evidence_box':box}
(P/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'report':report,'geometry':metrics},ensure_ascii=False,indent=2))
