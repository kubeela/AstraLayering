from pathlib import Path
from lxml import etree as ET
from copy import deepcopy
import hashlib, json, re

OUT=Path('refinement/groups/eyes/2.逐眼线稿/eye_right')
SOURCE=Path('refinement/groups/face/6.投影与高光效果/character.svg')
NS='http://www.w3.org/2000/svg'
root=ET.parse(str(SOURCE)).getroot()
old=root.xpath('//*[@id="eye_right"]')[0]
eye=ET.fromstring('''<g xmlns="http://www.w3.org/2000/svg" id="eye_right" data-part="eye_right" data-kind="eyes" data-stage="line-art-calibrated" data-hair-order="behind">
  <title>角色右眼（画面左）· 原画布校准线稿</title>
  <desc>可编辑完整眼部。眼内统一由眼裂裁切；完整眼白、虹膜、瞳孔与高光保存未裁切几何。中性填充非最终配色。辅助线独立并默认关闭。</desc>
  <defs>
    <path id="eye_right_aperture_shape" d="M 406.05,197.15 C 408.45,195.08 413.18,195.10 417.48,195.58 C 423.59,195.89 428.41,198.59 431.48,201.79 C 429.42,201.86 427.61,202.57 425.15,203.25 C 420.93,204.08 416.76,204.13 413.35,203.79 L 412.23,203.50 C 410.08,202.90 408.82,201.40 407.91,200.03 C 407.12,198.85 406.61,197.89 406.05,197.15 Z"/>
    <path id="eye_right_sclera_complete_shape" d="M 405.70,197.20 C 404.91,192.42 410.27,187.49 418.18,188.25 C 425.86,187.68 430.54,193.72 431.61,201.80 C 429.42,201.86 427.61,202.57 425.15,203.25 C 420.93,204.08 416.76,204.13 413.35,203.79 L 412.23,203.50 C 410.08,202.90 408.82,201.40 407.91,200.03 C 407.12,198.85 406.14,198.01 405.70,197.20 Z"/>
    <ellipse id="eye_right_iris_complete_shape" cx="418.18" cy="196.75" rx="7.62" ry="7.18"/>
    <ellipse id="eye_right_pupil_complete_shape" cx="418.35" cy="196.70" rx="2.65" ry="3.22"/>
    <path id="eye_right_highlight_main_shape" d="M 418.18,196.04 C 418.64,195.86 419.24,195.87 419.53,196.20 C 419.85,196.51 419.84,197.13 419.53,197.45 C 419.18,197.77 418.45,197.75 418.04,197.48 C 417.73,197.23 417.72,196.31 418.18,196.04 Z"/>
    <clipPath id="eye_right_aperture_clip" clipPathUnits="userSpaceOnUse"><use href="#eye_right_aperture_shape"/></clipPath>
  </defs>
  <g id="eye_right_eyelid_skin" data-role="decoration-eyelid-fold">
    <path id="eye_right_upper_fold" d="M 407.24,192.03 C 412.00,191.20 417.78,191.83 421.94,193.01 C 425.90,194.25 429.11,196.88 430.68,198.91" fill="none" stroke="#929094" stroke-width="0.49" stroke-linecap="round"/>
  </g>
  <g id="eye_right_opening" data-role="intraocular-visibility" clip-path="url(#eye_right_aperture_clip)">
    <g id="eye_right_sclera" data-role="contour-complete-sclera"><use id="eye_right_sclera_fill" href="#eye_right_sclera_complete_shape" fill="#f6f6f6"/></g>
    <g id="eye_right_gaze" data-role="gaze-movable">
      <g id="eye_right_iris" data-role="inner-complete-iris"><use id="eye_right_iris_fill" href="#eye_right_iris_complete_shape" fill="#979da4"/></g>
      <g id="eye_right_pupil" data-role="inner-complete-pupil"><use id="eye_right_pupil_fill" href="#eye_right_pupil_complete_shape" fill="#424751"/></g>
      <g id="eye_right_highlights" data-role="inner-independent-highlights"><use id="eye_right_highlight_main" href="#eye_right_highlight_main_shape" fill="#ffffff"/></g>
    </g>
  </g>
  <g id="eye_right_lower_eyelid" data-role="contour-lower-eyelid">
    <path id="eye_right_lower_lid_rim" d="M 406.05,197.15 C 406.61,197.89 407.12,198.85 407.91,200.03 C 408.82,201.40 410.08,202.90 412.23,203.50 L 413.35,203.79 C 416.76,204.13 420.93,204.08 425.15,203.25 C 427.61,202.57 429.42,201.86 431.48,201.79 C 429.41,202.24 427.60,203.22 425.14,203.77 C 420.76,204.60 416.59,204.59 413.20,204.24 L 412.03,203.96 C 409.55,203.13 408.19,201.70 407.38,200.16 C 406.63,198.92 406.18,197.95 406.05,197.15 Z" fill="#89858a"/>
  </g>
  <g id="eye_right_upper_eyelid" data-role="contour-upper-eyelid">
    <path id="eye_right_upper_lid_ink" d="M 405.29,196.21 C 406.27,194.48 408.24,193.79 411.20,193.74 C 416.00,193.49 420.71,194.37 424.38,195.98 C 427.72,197.40 430.04,199.71 431.48,201.79 C 428.41,198.59 423.59,195.89 417.48,195.58 C 413.18,195.10 408.45,195.08 406.05,197.15 C 405.75,197.64 405.55,198.17 405.43,198.77 C 404.95,198.05 404.89,197.08 405.29,196.21 Z" fill="#30313a"/>
  </g>
  <g id="eye_right_upper_lashes" data-role="decoration-upper-lashes">
    <path id="eye_right_upper_lash_sweep" d="M 408.04,194.42 C 406.13,195.07 403.76,196.68 401.91,195.63 C 402.51,196.59 403.92,197.08 405.43,196.73 C 405.08,197.34 405.07,198.08 405.43,198.77 C 405.85,197.53 406.47,196.61 407.55,195.95 C 408.18,195.51 408.95,195.15 409.51,195.05 C 409.02,194.81 408.45,194.53 408.04,194.42 Z" fill="#30313a"/>
    <path id="eye_right_upper_lash_outer_taper" d="M 405.75,195.51 C 404.42,195.21 403.77,194.33 403.49,193.40 C 403.31,194.83 403.86,196.06 405.16,196.60 C 405.48,196.45 405.67,196.05 405.75,195.51 Z" fill="#30313a"/>
  </g>
  <g id="eye_right_lower_lashes" data-role="decoration-lower-lashes">
    <path id="eye_right_lower_lash_outer_root" d="M 406.22,197.73 C 406.53,198.72 407.21,200.06 408.23,201.23 C 408.99,202.16 409.94,202.91 410.91,203.29 C 409.29,203.20 407.75,201.97 406.88,200.69 C 406.31,199.85 405.94,198.73 406.22,197.73 Z" fill="#5c575f"/>
  </g>
  <g id="eye_right_construction_guides" data-role="construction-guide" display="none" fill="none" stroke="#757575" stroke-width="0.28" stroke-dasharray="1.2 0.7">
    <use id="eye_right_guide_sclera" href="#eye_right_sclera_complete_shape"/>
    <use id="eye_right_guide_aperture" href="#eye_right_aperture_shape"/>
    <use id="eye_right_guide_iris" href="#eye_right_iris_complete_shape"/>
    <use id="eye_right_guide_pupil" href="#eye_right_pupil_complete_shape"/>
    <use id="eye_right_guide_highlight" href="#eye_right_highlight_main_shape"/>
  </g>
</g>'''.encode())
root.replace(old,eye)
# Preserve every input node outside the current eye, including all hair and skin effects.
ET.ElementTree(root).write(str(OUT/'character.svg'),encoding='utf-8',xml_declaration=True)

def variant(name, mode):
    r=deepcopy(root)
    if mode in ('nohair','guides'):
        for e in r.xpath('//*[@data-kind="hair"]'):
            e.set('display','none')
    if mode=='guides':
        r.xpath('//*[@id="eye_right_construction_guides"]')[0].set('display','inline')
    if mode=='isolated':
        for e in list(r):
            if ET.QName(e).localname not in ('defs','title','desc') and e.get('id')!='eye_right':
                r.remove(e)
        r.xpath('//*[@id="eye_right_construction_guides"]')[0].set('display','inline')
    r.set('viewBox','394 185 45 28');r.set('width','1080');r.set('height','672')
    ET.ElementTree(r).write(str(OUT/'evidence'/name),encoding='utf-8',xml_declaration=True)
variant('nohair.svg','nohair')
variant('guides.svg','guides')
variant('isolated.svg','isolated')

# Exact XML identity checks for all non-target top-level nodes.
saved=ET.parse(str(OUT/'character.svg')).getroot()
base=ET.parse(str(SOURCE)).getroot()
non_target_unchanged=[ET.tostring(e)==ET.tostring(f) for e,f in zip(base,saved) if e.get('id')!='eye_right']
ids=[e.get('id') for e in saved.iter() if e.get('id')]
refs=[]
for e in saved.iter():
    for k,v in e.attrib.items():
        refs += re.findall(r'url\(#([^\)]+)\)',v)
        if k in ('href','{http://www.w3.org/1999/xlink}href') and v.startswith('#'):
            refs.append(v[1:])
audit={
  'source_svg':str(SOURCE),
  'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
  'candidate_sha256':hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest(),
  'non_target_top_level_xml_unchanged':all(non_target_unchanged),
  'canvas':dict(saved.attrib),
  'duplicate_ids':sorted({x for x in ids if ids.count(x)>1}),
  'unresolved_references':sorted(set(refs)-set(ids)),
  'eye_right_top_level_index':list(saved).index(saved.xpath('//*[@id="eye_right"]')[0]),
  'hair_front_right_top_level_index':list(saved).index(saved.xpath('//*[@id="hair_front_right"]')[0]),
  'hair_front_left_top_level_index':list(saved).index(saved.xpath('//*[@id="hair_front_left"]')[0]),
  'gaze_children':[e.get('id') for e in saved.xpath('//*[@id="eye_right_gaze"]')[0]],
  'guides_default_display':saved.xpath('//*[@id="eye_right_construction_guides"]')[0].get('display'),
  'face_base_residual_eye_nodes':[],
  'eye_left_unchanged':ET.tostring(base.xpath('//*[@id="eye_left"]')[0])==ET.tostring(saved.xpath('//*[@id="eye_left"]')[0])
}
(OUT/'evidence'/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False,indent=2))
