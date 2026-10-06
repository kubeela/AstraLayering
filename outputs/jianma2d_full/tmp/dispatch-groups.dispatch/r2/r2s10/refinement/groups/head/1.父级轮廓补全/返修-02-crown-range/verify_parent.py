from pathlib import Path
import sys, json, hashlib, re
import xml.etree.ElementTree as ET
from PIL import ImageChops

R = Path('/Users/wutian/Desktop/coding/AstraLayering')
sys.path.insert(0, str(R/'workflow-next/live2d-layering/tools'))
from svg_preview import read_svg
from svg_containment import selected_shape, alpha_image, occupied, source_box, target_children

O = Path(__file__).parent
D = O.parents[4]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name, x): (O/name).write_text(json.dumps(x, ensure_ascii=False, indent=2)+'\n')
change = json.loads((O/'geometry-change.json').read_text())
raw_before = (O/'input/groups.svg').read_text()
raw_after = (O/'candidate-parent.svg').read_text()
raw_fixture = (O/'fixture-correct-crown.svg').read_text()
removed = raw_after
for ident in change['added_parent_paths']:
    removed, n = re.subn(r'^    <path id="'+re.escape(ident)+r'"[^\n]*\n', '', removed, flags=re.M)
    assert n == 1
assert removed == raw_before
assert sha(Path(change['correct_crown_source'])) == change['correct_crown_sha256']
before, size = read_svg(O/'input/groups.svg')
after, _ = read_svg(O/'candidate-parent.svg')
fixture, _ = read_svg(O/'fixture-correct-crown.svg')
source, _ = read_svg(Path(change['correct_crown_source']))
idx = lambda r: {n.get('id'):n for n in r.iter() if n.get('id')}
bi, ai, fi, si = map(idx, (before, after, fixture, source))
assert len(ai) == sum(bool(n.get('id')) for n in after.iter())
assert set(ai)-set(bi) == set(change['added_parent_paths'])
changed_fixture = []
for ident, node in ai.items():
    f = fi[ident]
    assert node.text == f.text and node.tail == f.tail
    assert [(n.tag,n.get('id')) for n in node] == [(n.tag,n.get('id')) for n in f]
    if node.attrib != f.attrib:
        assert ident in change['fixture_only_source_d']
        assert dict(node.attrib, d=f.get('d')) == f.attrib
        assert f.get('d') == si[ident].get('d') == change['fixture_only_source_d'][ident]
        changed_fixture.append(ident)
assert set(changed_fixture) == set(change['fixture_only_source_d'])
tree = json.loads((D/'structure/groups.json').read_text())
child_records = []
for kind, path in target_children(tree, 'head'):
    attr = 'data-'+kind+'-path'
    bnodes = [n for n in before.iter() if n.get(attr)==path]
    anodes = [n for n in after.iter() if n.get(attr)==path]
    assert [ET.tostring(n) for n in bnodes] == [ET.tostring(n) for n in anodes]
    child_records.append({'path':path,'byte_preserved_by_whole_document_inverse_edit':True,
                          'serialized_container_sha256':hashlib.sha256(b''.join(ET.tostring(n) for n in bnodes)).hexdigest()})
manifest = json.loads((O/'input/manifest.json').read_text())
protected = {}
for rel, digest in manifest.items():
    if rel not in ('block-layers/groups.svg','block-layers/preview.png'):
        actual=sha(D/rel); assert actual==digest
        protected[rel]=actual
save('保护证明.json', {'status':'pass','input_sha256':sha(O/'input/groups.svg'),
    'candidate_sha256':sha(O/'candidate-parent.svg'),
    'inverse_edit_byte_identical':True,'only_added_parent_path_ids':list(change['added_parent_paths']),
    'old_head_paths_including_ear_preserved':True,'all_original_svg_text_preserved':True,
    'root_resources_other_objects_preserved':True,'all_12_direct_children':child_records,
    'calibrated_right_ear_d_unchanged': ai['head-framing-right-loop'].get('d')==bi['head-framing-right-loop'].get('d'),
    'protected_files':protected,'fixture_only_d_replacements':changed_fixture,
    'fixture_sha256':sha(O/'fixture-correct-crown.svg'),
    'standard_crown_child_unchanged':True,'correct_crown_source_sha256':sha(Path(change['correct_crown_source']))})

bp,_=selected_shape(before,'group','head')
ap,_=selected_shape(after,'group','head')
cp,_=selected_shape(fixture,'group','head/crown')
regions={'arch':(350,10,180,70),'left_bridge':(372,117,10,11),'right_bridge':(490,117,10,11)}
checks=[]
for name, box in regions.items():
    bm=occupied(alpha_image(bp,size,box,8)); am=occupied(alpha_image(ap,size,box,8)); cm=occupied(alpha_image(cp,size,box,8))
    prior=ImageChops.subtract(cm,bm); current=ImageChops.subtract(cm,am)
    count=current.histogram()[255]
    assert count==0
    checks.append({'region':name,'crop':box,'scale':8,'alpha_threshold':128,
                   'old_outside_samples':prior.histogram()[255],'new_outside_samples':count})

# A full-head comparison ensures that only the crown region gained coverage.
bm=occupied(alpha_image(bp,size,scale=4)); am=occupied(alpha_image(ap,size,scale=4))
gain=ImageChops.subtract(am,bm); loss=ImageChops.subtract(bm,am)
assert loss.getbbox() is None
gain_box=source_box(gain.getbbox(),(0,0,*size),4)
assert gain_box[0]>=370 and gain_box[1]>=16 and gain_box[0]+gain_box[2]<=504 and gain_box[1]+gain_box[3]<=124
holes=[]
for name,box in {'large_arch_background':(410,32,48,10),'left_beam_lower_hole':(379,128,3,2),'right_beam_lower_hole':(490,128,3,2)}.items():
    b=alpha_image(bp,size,box,8); a=alpha_image(ap,size,box,8)
    assert b.tobytes()==a.tobytes()
    # The selected regions are entirely transparent, not just unchanged.
    assert a.getextrema()==(0,0)
    holes.append({'name':name,'crop':box,'scale':8,'before_after_alpha_identical':True,'maximum_alpha':0})
bridges=[]
for name,start in [('left',376.1875),('right',495.0625)]:
    box=regions[name+'_bridge']; b=alpha_image(bp,size,box,8); a=alpha_image(ap,size,box,8)
    samples=[]
    for i in range(7):
        x=start+i/8; y=122.4375
        p=(int((x-box[0])*8),int((y-box[1])*8))
        vals=[b.getpixel(p),a.getpixel(p)]
        assert vals==[0,255]
        samples.append({'x':x,'y':y,'before_alpha':vals[0],'after_alpha':vals[1]})
    bridges.append({'side':name,'samples':samples})
save('局部8倍与负形检查.json',{'status':'pass','candidate_sha256':sha(O/'candidate-parent.svg'),
  'regions':checks,'full_head_4x_gain_samples':gain.histogram()[255],
  'full_head_4x_gain_area_px2':gain.histogram()[255]/16,'full_head_4x_gain_bbox':gain_box,
  'full_head_4x_lost_samples':0,'negative_space_checks':holes,'bridge_gap_samples':bridges,
  'scope':'Crown parent range only. This is not an independent review of all head children.'})
print(json.dumps({'protection':'pass','local_8x':'pass','gain_area_px2':gain.histogram()[255]/16,'gain_bbox':gain_box},ensure_ascii=False))
