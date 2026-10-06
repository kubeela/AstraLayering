from pathlib import Path
import sys, json, hashlib, re
import xml.etree.ElementTree as ET
from PIL import ImageChops
R=Path('/Users/wutian/Desktop/coding/AstraLayering')
sys.path.insert(0,str(R/'workflow-next/live2d-layering/tools'))
from svg_preview import read_svg
from svg_containment import selected_shape, alpha_image, occupied, target_children, source_box
O=Path(__file__).parent;N=O.parent;D=O.parents[5]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,obj):(O/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
change=json.loads((O/'geometry-change.json').read_text())
raw_before=(O/'input/groups.svg').read_text();raw_after=(O/'candidate.svg').read_text()
inverse=raw_after
for row in change['changed_attributes']:
    ident=row['id'];pattern=r'(<path\b[^>]*\bid="'+re.escape(ident)+r'"[^>]*\bd=")[^"]*(")'
    inverse,n=re.subn(pattern,lambda m:m.group(1)+row['old_d']+m.group(2),inverse)
    assert n==1
assert inverse==raw_before
b,size=read_svg(O/'input/groups.svg');a,_=read_svg(O/'candidate.svg');s,_=read_svg(Path(change['source']))
prior,_=read_svg(N/'candidate.svg')
idx=lambda root:{n.get('id'):n for n in root.iter() if n.get('id')}
bi,ai,si,pi=map(idx,(b,a,s,prior))
assert list(bi)==list(ai) and len(ai)==sum(bool(n.get('id')) for n in a.iter())
assert len(ai['group-head-crown'])==8
actual=[]
for ident,node in ai.items():
    orig=bi[ident]
    assert node.text==orig.text and node.tail==orig.tail
    if node.attrib!=orig.attrib:
        assert dict(orig.attrib,d=node.get('d'))==node.attrib
        assert node.get('d')==si[ident].get('d')
        actual.append(ident)
assert set(actual)==set(r['id'] for r in change['changed_attributes'])
assert ET.tostring(ai['group-head'])==ET.tostring(bi['group-head'])
protected={}
for rel,digest in json.loads((O/'input/manifest.json').read_text()).items():
    if rel not in ['block-layers/groups.svg','block-layers/preview.png']:
        assert sha(D/rel)==digest;protected[rel]=digest
tree=json.loads((D/'structure/groups.json').read_text());unchanged=[]
for kind,path in target_children(tree,'head'):
    if path=='head/crown':continue
    bn=next(n for n in b.iter() if n.get('data-'+kind+'-path')==path)
    an=ai[bn.get('id')];pn=pi[bn.get('id')]
    assert ET.tostring(bn)==ET.tostring(an)==ET.tostring(pn)
    unchanged.append({'path':path,'id':bn.get('id'),'input_output_and_previous_2_2_equal':True,
        'container_sha256':hashlib.sha256(ET.tostring(an)).hexdigest(),'current_right_ear_crop_rechecked':path=='head/face_framing_hair_right','full_individual_re_review_claim':False})
save('保护证明.json',{'status':'pass','input_sha256':sha(O/'input/groups.svg'),'candidate_sha256':sha(O/'candidate.svg'),
 'inverse_d_edit_full_document_byte_identical':True,'only_changed_d_attributes':actual,
 'ids_and_order_unchanged':True,'crown_path_count_before_after':[8,8],
 'other_five_crown_paths_preserved':[n.get('id') for n in ai['group-head-crown'] if n.get('id') not in actual],
 'frozen_entire_head_parent_including_ear_and_three_crown_continuations_unchanged':True,
 'right_ear_d_and_other_11_children_unchanged':True,'other_11_children':unchanged,
 'root_resources_all_other_objects_byte_preserved_by_inverse_edit':True,'protected_external_files':protected,
 'source_sha256':sha(Path(change['source'])),'source_hidden_anchors_copied':False})

ap,_=selected_shape(a,'group','head');bc,_=selected_shape(b,'group','head/crown');ac,_=selected_shape(a,'group','head/crown')
regions={'arch':(350,10,180,70),'left_bridge':(372,117,10,11),'right_bridge':(490,117,10,11),'right_ear':(490,255,50,103)}
local=[]
for name,box in regions.items():
    child=ac if name!='right_ear' else selected_shape(a,'group','head/face_framing_hair_right')[0]
    parent_mask=occupied(alpha_image(ap,size,box,8));child_mask=occupied(alpha_image(child,size,box,8))
    outside=ImageChops.subtract(child_mask,parent_mask);assert outside.getbbox() is None
    local.append({'name':name,'crop':box,'scale':8,'alpha_threshold':128,'outside_samples':0})
holes=[]
for name,box in {'large_arch_background':(410,32,48,10),'left_bridge_lower_hole':(379,128,3,2),'right_bridge_lower_hole':(490,128,3,2)}.items():
    bm=alpha_image(bc,size,box,8);am=alpha_image(ac,size,box,8)
    assert bm.tobytes()==am.tobytes() and am.getextrema()==(0,0)
    holes.append({'name':name,'crop':box,'scale':8,'before_after_alpha_identical':True,'max_alpha':0})
bridges=[]
for side,x in [('left',376.1875),('right',495.0625)]:
    box=regions[side+'_bridge'];bm=alpha_image(bc,size,box,8);am=alpha_image(ac,size,box,8)
    samples=[]
    for i in range(7):
        px=x+i/8;y=122.4375;p=(int((px-box[0])*8),int((y-box[1])*8))
        v=[bm.getpixel(p),am.getpixel(p)];assert v==[0,255]
        samples.append({'x':px,'y':y,'before':v[0],'after':v[1]})
    bridges.append({'side':side,'samples':samples})
ear_before=selected_shape(b,'group','head/face_framing_hair_right')[0];ear_after=selected_shape(a,'group','head/face_framing_hair_right')[0]
eb=alpha_image(ear_before,size,regions['right_ear'],8);ea=alpha_image(ear_after,size,regions['right_ear'],8)
assert eb.tobytes()==ea.tobytes()
save('局部8倍与负形检查.json',{'status':'pass','candidate_sha256':sha(O/'candidate.svg'),'local_containment':local,
 'negative_spaces':holes,'bridge_gap_samples':bridges,'right_ear_8x_before_after_alpha_identical':True})
save('继承证据.json',{'candidate_sha256':sha(O/'candidate.svg'),'previous_2_2_candidate':str(N/'candidate.svg'),
 'previous_candidate_sha256':sha(N/'candidate.svg'),'previous_inheritance_record':str(N/'inheritance-check.json'),
 'previous_inheritance_sha256':sha(N/'inheritance-check.json'),
 'prior_ear_actualviews':str(D/'tmp/history/head-crown-child-sync-20261006-01'/N.relative_to(D)/'实际看图记录.json'),
 'unchanged_children':unchanged,'newly_inspected_changed_object':'head/crown',
 'ear_current_crop_rechecked':True,'current_all_12_no_parent_combination_rechecked':True,
 'other_ten_individuals_new_inspection_claim':False,
 'inherited_evidence_description':'Eight unchanged children retain ledger005 evidence; rear_hair_left retains the documented resource-prefix equivalence; earring_right retains the actual r1 motion evidence; face_framing_hair_right retains prior e2d calibrated-ear evidence and has current local recheck. Crown gets a new local check; prior crown pass does not override newer evidence.'})
print(json.dumps({'protection':'pass','changed_d_count':len(actual),'other_children_preserved':len(unchanged),'crown_paths':len(ai['group-head-crown']),'local_8x':'pass'},ensure_ascii=False))
