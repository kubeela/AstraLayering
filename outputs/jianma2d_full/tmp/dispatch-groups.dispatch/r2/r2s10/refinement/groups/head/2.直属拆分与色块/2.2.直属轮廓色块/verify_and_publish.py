from pathlib import Path
import sys
import hashlib
import json
import re
import datetime
import xml.etree.ElementTree as ET
from PIL import ImageChops

REPO = Path('/Users/wutian/Desktop/coding/AstraLayering')
SKILL = REPO / 'workflow-next/live2d-layering'
ROOT = REPO / 'outputs/jianma2d_full'
sys.path.insert(0,str(SKILL / 'tools'))
from svg_preview import read_svg, isolate, parser, preview
from svg_containment import alpha_image, occupied

O = Path(__file__).parent
D = O.parents[4]
B = O / 'input/groups.svg'
C = O / 'candidate.svg'
R = ROOT / 'tmp/dispatch-groups.dispatch/r2/r2s3/refinement/groups/head/face_framing_hair_right/1.父级轮廓补全/返修-01/candidate-parent.svg'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,value): (O/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def raw_group(s,id):
    return re.search(r'<g\b[^>]*\bid="'+re.escape(id)+r'"[^>]*>[\s\S]*?</g>',s).group(0)

bs,cs,rs = B.read_text(),C.read_text(),R.read_text()
assert sha(B) == '5e0b95940c5c8dcd306a72ccb49cf7e396f3154afc8959bdfb6632052c2c240f'
assert sha(C) == 'a3d9513e5fae1bf11d1aee0705211ae4dacea555da9d72d78e7accc2fa821d94'
assert sha(R) == 'e2d8966bb6e8ebca25fd4ed4ce291ce7a0b76bee26b5b944b81c1218a0073bc3'
rx = r'(<path id="head-framing-right-loop" d=")([^"]*)(")'
assert re.search(rx,cs).group(2) == re.search(rx,rs).group(2)
assert re.sub(rx,r'\1<omitted>\3',bs) == re.sub(rx,r'\1<omitted>\3',cs)
assert raw_group(bs,'group-head') == raw_group(cs,'group-head')
br,size = read_svg(B)
cr,_ = read_svg(C)
bid = {n.get('id'):n for n in br.iter() if n.get('id')}
cid = {n.get('id'):n for n in cr.iter() if n.get('id')}
assert len(cid) == len([n for n in cr.iter() if n.get('id')])
assert bid.keys() == cid.keys()
changes = [{'id':k,'attributes':[key for key in set(bid[k].attrib)|set(cid[k].attrib) if bid[k].get(key)!=cid[k].get(key)]} for k in bid if bid[k].attrib != cid[k].attrib]
assert changes == [{'id':'head-framing-right-loop','attributes':['d']}]
for id in ['head-framing-right-main','head-framing-right-chest-loop']:
    assert ET.tostring(bid[id]) == ET.tostring(cid[id])
manifest = json.loads((O/'input/manifest.json').read_text())
assert sha(D/'block-layers/groups.svg') == manifest['block-layers/groups.svg']
protected = {}
for rel,old in manifest.items():
    if rel not in ['block-layers/groups.svg','block-layers/preview.png']:
        actual=sha(D/rel);assert old==actual
        protected[rel]={'before_sha256':old,'after_sha256':actual,'byte_identical':True}
report=json.loads((O/'轮廓检查.json').read_text())
assert report['status']=='pass' and len(report['results'])==12 and report['scale']==4 and report['alpha_threshold']==128
assert sum(v['outside_samples'] for v in report['results'])==0
inherit=json.loads((O/'inheritance-check.json').read_text())
ledger=Path(inherit['ledger_path']);ls=ledger.read_text()
name_map={'r1s1_head-rear-left-ear-opening-clip':'head-rear-left-ear-opening-clip','r1s1_head-rear-left-ear-opening-geometry':'head-rear-left-ear-opening-geometry'}
left_raw=raw_group(bs,'group-head-rear-hair-left')
for old,new in name_map.items(): left_raw=left_raw.replace(old,new)
assert left_raw==raw_group(ls,'group-head-rear-hair-left')
inherit['rear_hair_left_resource_prefix_equivalence']={'only_renames':name_map,'normalized_raw_group_equals_ledger_005':True,'geometry_style_and_clip_shape_unchanged':True}
inherit['crown_new_evidence']={'source':'Current root coordinator message; parallel crown child review is still being completed.','coordinates':[376,120,1,4],'reported_issue':'Inner horizontal beam to vertical wing has a 0.6–0.9px transparent vertical gap; crown parent also has the gap.','current_status':'Preserved without modification; historical pass does not settle this new evidence. Await crown parent repair/aggregation and independent review.','independently_inspected_here':False}
save('inheritance-check.json',inherit)

# The unchanged upper ear is checked against the same frozen input.
rb,_=read_svg(B);rc,_=read_svg(C)
isolate(rb,['head-framing-right-loop']);isolate(rc,['head-framing-right-loop'])
upper=(470,230,85,80)
ab=alpha_image(rb,size,upper,8);ac=alpha_image(rc,size,upper,8)
assert ImageChops.difference(ab,ac).getbbox() is None
loop,_=read_svg(C);main,_=read_svg(C)
isolate(loop,['head-framing-right-loop']);isolate(main,['head-framing-right-main'])
box=(490,255,50,103)
la,ma=[occupied(alpha_image(r,size,box,8)) for r in [loop,main]]
overlap=ImageChops.multiply(la,ma)
save('局部几何检查.json',{'scale':8,'alpha_threshold':128,'upper_crop':upper,'upper_before_after_alpha_identical':True,'ear_main_overlap_area_px2':overlap.histogram()[255]/64,'note':'The ear curve remains an individually filled thin strand; no solid bridge to the main lock was added. The retained main and chest paths are byte-identical to input.'})
save('保护证明.json',{'status':'pass','actual_worker':'/root/group_head_ear_gap_recovery','input_guide_sha256':sha(B),'candidate_sha256':sha(C),'source_right_parent_sha256':sha(R),'whole_svg_equal_after_omitting_only_target_d':True,'exact_calibrated_d_sha256':hashlib.sha256(re.search(rx,cs).group(2).encode()).hexdigest(),'d_exactly_equals_calibrated_source':True,'changed_attributes':changes,'frozen_head_raw_subtree_unchanged':True,'frozen_head_raw_sha256':hashlib.sha256(raw_group(cs,'group-head').encode()).hexdigest(),'other_11_direct_children_unchanged':True,'right_main_and_chest_paths_unchanged':True,'same_global_ids_and_unique_ids':True,'tree_binding_unchanged_no_new_children':True,'root_resources_other_objects_and_all_attrs_except_target_d_unchanged':True,'protected_files':protected})
config=SKILL/'templates/部件专项/generic/2.直属拆分与色块/2.2.直属轮廓色块'
files=[ROOT/'group-route-instructions.md',config/'流程.yaml',config/'提示词.txt',config/'gpt-6-astra-xhigh.model']
save('configuration-read.json',{'logical_worker':'group:head','actual_worker':'/root/group_head_ear_gap_recovery','node':'group_child_layers','model_filename':'gpt-6-astra-xhigh.model','time':datetime.datetime.now().astimezone().isoformat(),'files':[{'path':str(p),'sha256':sha(p)} for p in files],'boundary':'Current 2.2 only; waiting for independent review. No 2.3, formal, cursor, state or agent operations.'})
(D/'block-layers/groups.svg').write_bytes(C.read_bytes())
preview(parser().parse_args([str(D/'block-layers/groups.svg'),str(D/'block-layers/preview.png'),'--background','white']))
save('output-sha256.json',{str(p.relative_to(D)):sha(p) for p in [D/'block-layers/groups.svg',D/'block-layers/preview.png',C,O/'轮廓检查.json',O/'保护证明.json',O/'inheritance-check.json',O/'局部几何检查.json',O/'configuration-read.json',O/'render-manifest.json']})
print(json.dumps({'guide_sha256':sha(C),'preview_sha256':sha(D/'block-layers/preview.png'),'containment':'12/12 pass, outside 0','changed_attribute':'head-framing-right-loop d only','ear_main_overlap_px2':overlap.histogram()[255]/64,'crown':'new reported gap pending separate repair/review'},ensure_ascii=False))
