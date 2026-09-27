from pathlib import Path
import json, re, hashlib
from lxml import etree as ET

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'refinement/groups/eyes/2.逐眼线稿/eye_left/2.1.轮廓部件线稿'
TMP = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = ROOT / 'refinement/groups/face/6.投影与高光效果/character.svg'
base = SOURCE.read_text(encoding='utf-8')

# This run is rebuilt exclusively from the face-stage SVG and the source image.
# All coordinates below use the original 941 x 1672 canvas.
upper = 'M 455.75,201.6 C 458.3,198.2 463.35,195.6 468.6,195.4 C 472.85,195.35 476.15,195.85 479.5,197.1 C 480.3,197.5 481.05,197.3 482.2,196.75'
lower = 'C 481.7,197.05 481.2,197.5 480.7,198.1 C 479.55,200.08 477.6,201.7 475.35,202.85 C 471.1,203.72 465.7,203.4 461.7,202.65 C 459.9,202.31 457.8,201.55 455.75,201.6 Z'
aperture = upper + ' ' + lower
surface = 'M 455.75,201.6 C 457.9,196.1 461.95,192.45 466.7,191.4 C 472.55,189.95 479.4,191.5 482.2,196.75 ' + lower
upper_cover = upper + ' L 488,186 L 450,186 Z'
upper_ink = '''M 455.75,201.6
 C 457.3,198.5 460.85,195.95 464.5,194.65
 C 468.4,193.15 474.25,192.95 478.5,194.2
 C 479.8,194.57 481.15,195.6 482.2,196.75
 C 481.05,197.3 480.3,197.5 479.5,197.1
 C 476.15,195.85 472.85,195.35 468.6,195.4
 C 463.35,195.6 458.3,198.2 455.75,201.6 Z'''
lower_ink = '''M 455.75,201.6
 C 457.8,201.55 459.9,202.31 461.7,202.65
 C 465.7,203.4 471.1,203.72 475.35,202.85
 C 477.6,201.7 479.55,200.08 480.7,198.1
 C 481.2,197.5 481.7,197.05 482.2,196.75
 C 481.5,198.2 480.7,200.05 479.15,201.38
 C 478.0,202.5 476.5,203.34 475.6,203.62
 C 471.3,204.45 465.65,204.0 461.65,203.24
 C 459.6,202.85 457.8,201.75 455.75,201.6 Z'''

defs = f'''
<!-- eye_left / eyes-third / step 2.1: editable surface and independent clips -->
<path id="eye_left_sclera_geometry" d="{surface}"/>
<path id="eye_left_aperture_geometry" d="{aperture}"/>
<clipPath id="eye_left_sclera_clip" clipPathUnits="userSpaceOnUse"><use href="#eye_left_sclera_geometry"/></clipPath>
<clipPath id="eye_left_aperture_clip" clipPathUnits="userSpaceOnUse"><use href="#eye_left_aperture_geometry"/></clipPath>
<clipPath id="eye_left_upper_lid_cover_clip" clipPathUnits="userSpaceOnUse"><path d="{upper_cover}"/></clipPath>
'''
old = re.search(r'<g id="eye_left" .*?</g>', base, re.S)
assert old, 'eye_left source group not found'
archive = old.group(0).replace('id="eye_left"', 'id="eye_left_legacy_block"', 1).replace(' data-part="eye_left" data-kind="eyes"', '', 1)
group = f'''<g id="eye_left" data-part="eye_left" data-kind="eyes" fill="none" data-stage="2.1-contour-line-art" data-source-eye="eye_left">
<title>角色左眼（画面右） · 三项轮廓部件 · 原图坐标</title>
<desc>Neutral line art. Hidden sclera continuation is an inference; source image controls the visible aperture. No iris, lashes or eyelid-fold detail is completed at this step.</desc>
<g id="eye_left_recovery" data-role="legacy-recovery" display="none" aria-hidden="true"><title>输入占位可恢复记录；不参与本轮显示</title>{archive}</g>
<g id="eye_left_sclera" data-eye-component="sclera" data-blink-role="continuous-under-lids">
 <title>完整眼白：连续无孔底面，保留上眼睑下面的延续</title>
 <use id="eye_left_sclera_surface" href="#eye_left_sclera_geometry" fill="#FFFFFF" stroke="none"/>
</g>
<g id="eye_left_upper_lid" data-eye-component="upper-lid" data-blink-role="upper-lid-occlusion">
 <title>上眼睑：中性遮挡面与正式上眼线</title>
 <use id="eye_left_upper_lid_surface" href="#eye_left_sclera_geometry" clip-path="url(#eye_left_upper_lid_cover_clip)" fill="#F6F6F6" stroke="none"/>
 <path id="eye_left_upper_lid_contour" d="{upper_ink}" fill="#343434" stroke="none"/>
</g>
<g id="eye_left_lower_lid" data-eye-component="lower-lid" data-blink-role="lower-lid-occlusion">
 <title>下眼睑：内侧缓行、外侧上折的正式下眼缘</title>
 <path id="eye_left_lower_lid_contour" d="{lower_ink}" fill="#777777" stroke="none"/>
</g>
<g id="eye_left_construction_guides" data-role="construction-guide" display="none" aria-hidden="true" fill="none" stroke="#929292" stroke-width="0.28" stroke-dasharray="0.8 0.65">
 <title>仅工作线：完整眼白与开合边界；引用正式几何，成稿关闭</title>
 <use href="#eye_left_sclera_geometry"/>
 <use href="#eye_left_aperture_geometry"/>
</g>
</g>'''
candidate = base[:old.start()] + group + base[old.end():]
candidate = candidate.replace('</defs>', defs + '</defs>', 1)
(OUT / 'character.svg').write_text(candidate, encoding='utf-8')

NS = {'s':'http://www.w3.org/2000/svg'}
src = ET.fromstring(base.encode()); dst = ET.fromstring(candidate.encode())
ids = [x.get('id') for x in dst.iter() if x.get('id')]
assert len(ids) == len(set(ids)), 'duplicate ID'
for x in src.xpath('//*[@data-part]'):
    if x.get('data-part') != 'eye_left':
        y = dst.xpath('//*[@id=$id]', id=x.get('id'))[0]
        assert ET.tostring(x) == ET.tostring(y), f'changed unrelated part {x.get("id")}'
for e in dst.iter():
    href=e.get('href')
    if href and href.startswith('#'): assert href[1:] in ids, href
    for v in e.attrib.values():
        for target in re.findall(r'url\(#([^)]*)\)',v): assert target in ids, target
assert len(dst.xpath('//*[@data-part="eye_left"]')) == 1
assert not re.search(r'[Mm].*[Mm]', surface), 'sclera must be single contour'

def local(name, box, size, edit=None):
    doc = ET.fromstring(candidate.encode())
    doc.set('viewBox', ' '.join(map(str,box)))
    doc.set('width',str(size[0])); doc.set('height',str(size[1]))
    if edit: edit(doc)
    (TMP / (name+'.svg')).write_bytes(ET.tostring(doc,xml_declaration=True,encoding='utf-8'))

def guide_mode(doc):
    doc.xpath('//*[@id="eye_left_construction_guides"]')[0].set('display','inline')
    doc.xpath('//*[@id="eye_left_upper_lid_surface"]')[0].set('opacity','0.15')
    for el in doc.xpath('//*[@data-part]'):
        if el.get('data-part') != 'eye_left': el.set('display','none')

def white_only(doc):
    for el in doc.xpath('//*[@data-part]'):
        if el.get('data-part') != 'eye_left': el.set('display','none')
    for i in ['eye_left_upper_lid','eye_left_lower_lid']: doc.xpath('//*[@id=$id]',id=i)[0].set('display','none')
    doc.xpath('//*[@id="eye_left_sclera_surface"]')[0].set('fill','#BEBEBE')

box=(449,184,44,30)
local('candidate-eye-direct-30x',box,(1320,900))
local('candidate-eye-native',box,(44,30))
local('construction-direct-30x',box,(1320,900),guide_mode)
local('sclera-uncovered-direct-30x',box,(1320,900),white_only)
local('face-context-direct-8x',(384,175,119,46),(952,368))
report={
 'stage':'2.1', 'eye':'eye_left', 'canvas':[941,1672], 'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
 'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),
 'unchanged_other_parts':True, 'unique_ids':True, 'resolved_references':True,
 'sclera_single_closed_subpath':True,'legacy_block_display':'none','construction_default_display':'none',
 'evidence_box':box,'keypoints':{'inner_corner':[455.75,201.6],'outer_corner_inferred':[482.2,196.75],'upper_opening_peak':[469.168,195.397],'lower_plateau':[469.532,203.373],'lower_outer_turn':[475.35,202.85],'outer_rise':[480.7,198.1]},
 'limits':'Original image has subpixel antialiasing and outer hair occlusion; point locations are contour estimates, not new detail evidence.'
}
(TMP/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
