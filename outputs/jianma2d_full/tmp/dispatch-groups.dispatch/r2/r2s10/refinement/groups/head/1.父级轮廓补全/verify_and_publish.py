from pathlib import Path
import copy
import datetime
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from PIL import ImageChops

REPO = Path('/Users/wutian/Desktop/coding/AstraLayering')
SKILL = REPO / 'workflow-next/live2d-layering'
sys.path.insert(0, str(SKILL / 'tools'))
from svg_preview import read_svg, parser, preview
from svg_containment import check, selected_shape, alpha_image, occupied, source_box

O = Path(__file__).parent
D = O.parents[3]
ROOT = REPO / 'outputs/jianma2d_full'
R = ROOT / 'tmp/dispatch-groups.dispatch/r2/r2s3/refinement/groups/head/face_framing_hair_right/1.父级轮廓补全/返修-01/candidate-parent.svg'
B = O / 'input/groups.svg'
P = O / 'candidate-parent.svg'
F = O / 'fixture-correct-right.svg'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name, obj): (O / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')

before = B.read_text()
after = P.read_text()
patch_rx = r'    <path id="head-ear-tail-turn-continuation"[^\n]*\n'
patches = re.findall(patch_rx, after)
assert len(patches) == 1
assert re.sub(patch_rx, '', after) == before
assert 'head-ear-tail-turn-continuation' not in before
manifest = json.loads((O / 'input/manifest.json').read_text())
assert sha(D / 'block-layers/groups.svg') == manifest['block-layers/groups.svg']
protected = {}
for rel, old_hash in manifest.items():
    if rel != 'block-layers/groups.svg':
        new_hash = sha(D / rel)
        assert old_hash == new_hash
        protected[rel] = {'before_sha256': old_hash, 'after_sha256': new_hash, 'byte_identical': True}
assert sha(R) == 'e2d8966bb6e8ebca25fd4ed4ce291ce7a0b76bee26b5b944b81c1218a0073bc3'
loop_rx = r'(<path id="head-framing-right-loop" d=")[^"]*(")'
assert re.sub(loop_rx, r'\1<omitted>\2', after) == re.sub(loop_rx, r'\1<omitted>\2', F.read_text())
assert re.search(loop_rx, after).group(0) == re.search(loop_rx, before).group(0)
assert re.search(loop_rx, F.read_text()).group(0) == re.search(loop_rx, R.read_text()).group(0)
rt, size = read_svg(P)
ids = [n.get('id') for n in rt.iter() if n.get('id')]
assert len(ids) == len(set(ids))
head = next(n for n in rt.iter() if n.get('data-group-path') == 'head')
assert any(n.get('id') == 'head-ear-tail-turn-continuation' for n in head)

standard_check = check(P, B, D / 'structure/groups.json', 'head', O / 'standard-包含检查.json')
assert standard_check['status'] == 'pass' and len(standard_check['results']) == 12
fixture_check = json.loads((O / 'fixture-包含检查.json').read_text())
assert fixture_check['status'] == 'pass' and len(fixture_check['results']) == 12
assert fixture_check['scale'] == 4 and fixture_check['alpha_threshold'] == 128
assert sum(v['outside_samples'] for v in fixture_check['results']) == 0

br, _ = read_svg(B)
fr, _ = read_svg(F)
bh, _ = selected_shape(br, 'group', 'head')
ah, _ = selected_shape(rt, 'group', 'head')
right, _ = selected_shape(fr, 'group', 'head/face_framing_hair_right')
box = (506, 300, 34, 58)
scale = 8
ba = alpha_image(bh, size, box, scale)
aa = alpha_image(ah, size, box, scale)
ra = alpha_image(right, size, box, scale)
bm, am, rm = map(occupied, (ba, aa, ra))
added = ImageChops.subtract(am, bm)
lost = ImageChops.subtract(bm, am)
outside_before = ImageChops.subtract(rm, bm)
outside_after = ImageChops.subtract(rm, am)
sample_points = [(533,320),(532,325),(530,332),(529,334),(528,336),(526,338),(525,340),(521,344),(518,346),(514,348)]
samples = []
for x, y in sample_points:
    crop = ((x-box[0])*scale, (y-box[1])*scale, (x-box[0]+1)*scale, (y-box[1]+1)*scale)
    samples.append({'point':[x,y], 'before_alpha_range':ba.crop(crop).getextrema(), 'after_alpha_range':aa.crop(crop).getextrema(), 'correct_right_alpha_range':ra.crop(crop).getextrema(), 'outside_before_of_64':outside_before.crop(crop).histogram()[255], 'outside_after_of_64':outside_after.crop(crop).histogram()[255]})
assert lost.getbbox() is None and outside_after.getbbox() is None
full_before = alpha_image(bh, size, scale=4)
full_after = alpha_image(ah, size, scale=4)
full_diff = ImageChops.difference(full_before, full_after)
full_bbox = source_box(full_diff.getbbox(), (0,0,*size), 4)
assert full_bbox[0] >= 524 and full_bbox[1] >= 313 and full_bbox[0]+full_bbox[2] <= 536 and full_bbox[1]+full_bbox[3] <= 341
sampling = {'scale':8,'alpha_threshold':128,'crop':box,'added_area_px2':added.histogram()[255]/64,'added_bbox':source_box(added.getbbox(),box,8),'lost_samples':0,'correct_right_outside_before_samples':outside_before.histogram()[255],'correct_right_outside_after_samples':0,'full_head_rgba_note':'Whole-head alpha is unchanged outside the stated difference bbox; fill color and all original bytes are unchanged.','full_head_alpha_4x_difference_bbox':full_bbox,'coordinate_samples':samples}
save('head-gap-closure-samples.json', sampling)

configuration_files = [ROOT / 'group-route-instructions.md', SKILL / 'SKILL.md', SKILL / 'templates/部件专项/generic/1.父级轮廓补全/流程.yaml', SKILL / 'templates/部件专项/generic/1.父级轮廓补全/提示词.txt', SKILL / 'templates/部件专项/generic/1.父级轮廓补全/gpt-6-astra-xhigh.model']
save('configuration-read.json', {'logical_worker':'group:head','actual_worker':'/root/group_head_ear_gap_recovery','node':'group_completion','configured_model_filename':'gpt-6-astra-xhigh.model','time':datetime.datetime.now().astimezone().isoformat(),'configuration_files':[{'path':str(p),'sha256':sha(p)} for p in configuration_files],'source_reference_dimensions':{'guide':[895,1758],'base':[895,1758],'line':[895,1757]},'node_boundary':'Node 1 only; no state/cursor changes, splitting, child drawing, motion, formal drawing, or agents.'})

# Publish only after passing geometry and the author has opened final evidence.
(D / 'block-layers/groups.svg').write_bytes(P.read_bytes())
preview(parser().parse_args([str(D / 'block-layers/groups.svg'),str(D / 'block-layers/preview.png'),'--background','white']))
assert sha(P) == sha(D / 'block-layers/groups.svg')
save('保护证明.json', {'status':'pass','input_guide_sha256':sha(B),'output_guide_sha256':sha(P),'actual_worker':'/root/group_head_ear_gap_recovery','only_added_id':'head-ear-tail-turn-continuation','all_original_svg_bytes_after_removing_single_added_path_equal_input':True,'all_original_head_paths_unchanged':True,'all_12_head_direct_children_unchanged':True,'standard_right_ear_d_unchanged':True,'all_other_objects_resources_root_attributes_preserved':True,'unique_ids':True,'protected_files':protected,'fixture_only_changes_right_ear_d_against_published_candidate':True,'correct_right_source_sha256':sha(R),'full_head_alpha_4x_difference_bbox':full_bbox,'no_global_state_or_formal_writes':True})
save('output-sha256.json', {str(p.relative_to(D)):sha(p) for p in [D/'block-layers/groups.svg', D/'block-layers/preview.png', P, F, O/'fixture-包含检查.json',O/'standard-包含检查.json',O/'保护证明.json',O/'head-gap-closure-samples.json']})
print(json.dumps({'published_guide_sha256':sha(P),'standard_children':standard_check['status'],'fixture_children':fixture_check['status'],'fixture_outside_samples':0,'local_added_area_px2_8x':sampling['added_area_px2'],'full_head_change_bbox_4x':full_bbox},ensure_ascii=False))
