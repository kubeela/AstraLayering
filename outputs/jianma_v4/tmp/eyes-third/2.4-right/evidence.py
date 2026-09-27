from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from lxml import etree as E
import numpy as np,json,hashlib
P=Path(__file__).resolve().parent;R=P.parents[2]
im=Image.open(R/'references/base-subject.png').convert('RGB');source=im.crop((393,184,437,214));candidate=Image.open(P/'candidate-eye-native.png').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel)
d.text((12,12),'SOURCE | (393,184)-(437,214) | nearest 20x',font=font,fill='black');d.text((904,12),'CANDIDATE | actual hair | same coordinates',font=font,fill='black')
panel.paste(source.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(candidate.resize((880,600),Image.Resampling.NEAREST),(900,45));panel.save(P/'reference-candidate-side-by-side.png')
Image.blend(source,candidate,0.5).resize((880,600),Image.Resampling.NEAREST).save(P/'same-coordinate-blend-50pct.png')
source.resize((1320,900),Image.Resampling.NEAREST).save(P/'reference-eye-nearest-30x.png')
im.crop((374,108,523,276)).save(P/'source-head-native.png');im.crop((374,108,523,276)).resize((894,1008),Image.Resampling.NEAREST).save(P/'source-head-nearest-6x.png')
im.crop((390,175,499,222)).save(P/'source-eyes-native.png')
def mask(name):return np.array(Image.open(P/(name+'.png')).convert('L'))<128
def component_count(a):
 spans=[];parents=[];prev=[]
 def find(x):
  while parents[x]!=x:parents[x]=parents[parents[x]];x=parents[x]
  return x
 for y,row in enumerate(a):
  edge=np.flatnonzero(np.diff(np.pad(row.astype(np.int8),(1,1))));cur=[]
  for x0,x1 in zip(edge[::2],edge[1::2]):
   n=len(parents);parents.append(n);spans.append((y,int(x0),int(x1)));cur.append(n)
   for o in prev:
    py,p0,p1=spans[o]
    if p1>=x0 and p0<=x1:parents[find(n)]=find(o)
  prev=cur
 return len(set(find(x) for x in range(len(parents))))
b=mask('real-hair-before');m=mask('real-hair-moved');c=mask('real-hair-curve-edited')
far=np.arange(b.shape[1])[None,:]<(404.2-398)*60;near=np.arange(b.shape[1])[None,:]>(406.0-398)*60
formal_path=R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.4.关联遮挡与线稿校准/character.svg';formal=E.parse(str(formal_path))
report={'candidate_sha256':hashlib.sha256(formal_path.read_bytes()).hexdigest(),'test_hair':'Actual hair_front_right_aligned_surface and its shared coverage clip; only test fill changed to white. No surrogate mask or occluder.','full_source_components':component_count(mask('lash-complete-no-hair')),'actual_hair_fragment_counts':{'before':component_count(b),'moved':component_count(m),'curve_edited':component_count(c)},'controller_change':'translate(0.8 0.35)','single_source_curve_change':'First cubic second control point (405.48,196.15) to (405.48,195.65)','controller_difference_pixels':{'near_root':int(((b!=m)&near).sum()),'far_tip':int(((b!=m)&far).sum())},'curve_difference_pixels':{'near_root':int(((b!=c)&near).sum()),'far_tip':int(((b!=c)&far).sum())},'formal_restored':formal.xpath('//*[@id="eye_right_upper_lash_outer_controller"]')[0].get('transform')=='translate(0 0)' and '405.48,196.15' in formal.xpath('//*[@id="eye_right_upper_lash_outer_geometry"]')[0].get('d'),'both_formal_instances_share_controller':all(formal.xpath('//*[@id=$id]',id=i)[0].get('href')=='#eye_right_upper_lash_outer_controller' for i in ['eye_right_upper_lash_outer_instance','eye_right_upper_lash_outer_front_instance'])}
assert report['full_source_components']==1
assert all(n==2 for n in report['actual_hair_fragment_counts'].values())
assert all(n>0 for key in ['controller_difference_pixels','curve_difference_pixels'] for n in report[key].values())
assert report['formal_restored'] and report['both_formal_instances_share_controller']
(P/'real-hair-linkage-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
panel=Image.new('RGB',(2160,604),'white');d=ImageDraw.Draw(panel)
for n,(name,title) in enumerate([('real-hair-before','BEFORE | actual hair and formal uses'),('real-hair-moved','CONTROLLER | translate(0.8,0.35)'),('real-hair-curve-edited','SOURCE | one control-point edit')]):
 d.text((720*n+10,10),title,font=font,fill='black');panel.paste(Image.open(P/(name+'.png')).resize((720,560),Image.Resampling.LANCZOS),(720*n,40))
panel.save(P/'real-hair-linkage-before-after-panel.png')
a=mask('mask-aperture');h=mask('mask-actual-hair');roi=np.ones_like(a,dtype=bool);roi[:,:840]=False
assert not (a&h&roi).any()
measure=json.loads((R/'tmp/eyes-third/2.2-right/visible-proportion-measurements.json').read_text(encoding='utf-8'))
measure['stage_2_4_validation']={'contour_and_interior_geometry_identical_to_2_2':True,'actual_hair_covers_no_aperture_pixels_in_common_x_gte_407_domain':True,'existing_visible_ratio_and_scanline_measurements_remain_valid':True}
(P/'final-visible-proportion-measurements.json').write_text(json.dumps(measure,ensure_ascii=False,indent=2),encoding='utf-8')
before=np.array(Image.open(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.3.装饰部件线稿/preview.png').convert('RGB'))
after=np.array(Image.open(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.4.关联遮挡与线稿校准/preview.png').convert('RGB'))
assert np.array_equal(before[175:222,449:499],after[175:222,449:499])
check=json.loads((P/'self-check.json').read_text(encoding='utf-8'));check['eye_left_rendered_eye_context_unchanged']=True;check['visible_proportions_in_common_domain_unchanged']=True
(P/'self-check.json').write_text(json.dumps(check,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
