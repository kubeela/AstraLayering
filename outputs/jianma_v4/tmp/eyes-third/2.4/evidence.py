from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from lxml import etree as ET
import numpy as np,json,hashlib
P=Path(__file__).resolve().parent;ROOT=P.parents[2]
im=Image.open(ROOT/'references/base-subject.png').convert('RGB')
source=im.crop((449,184,493,214));candidate=Image.open(P/'candidate-eye-native.png').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel)
d.text((12,12),'SOURCE | same box (449,184)-(493,214)',font=font,fill='black');d.text((904,12),'CANDIDATE | actual front hair | nearest 20x',font=font,fill='black')
panel.paste(source.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(candidate.resize((880,600),Image.Resampling.NEAREST),(900,45));panel.save(P/'reference-candidate-side-by-side.png')
Image.blend(source,candidate,.5).resize((880,600),Image.Resampling.NEAREST).save(P/'same-coordinate-blend-50pct.png')
source.resize((1320,900),Image.Resampling.NEAREST).save(P/'reference-eye-nearest-30x.png')
im.crop((374,108,523,276)).resize((894,1008),Image.Resampling.NEAREST).save(P/'source-head-nearest-6x.png')

def mask(name):return np.array(Image.open(P/(name+'.png')).convert('L'))<128
def component_count(a):
 spans=[];parents=[];previous=[]
 def find(x):
  while parents[x]!=x:parents[x]=parents[parents[x]];x=parents[x]
  return x
 for y,row in enumerate(a):
  edge=np.flatnonzero(np.diff(np.pad(row.astype(np.int8),(1,1))));cur=[]
  for x0,x1 in zip(edge[0::2],edge[1::2]):
   idx=len(parents);parents.append(idx);spans.append((y,int(x0),int(x1)));cur.append(idx)
   for prev in previous:
    py,px0,px1=spans[prev]
    if px1>=x0 and px0<=x1:parents[find(idx)]=find(prev)
  previous=cur
 return len(set(find(i) for i in range(len(parents))))
before=mask('real-hair-before');moved=mask('real-hair-moved');changed=mask('real-hair-curve-edited')
left=np.arange(before.shape[1])[None,:]<(480-472)*60;right=np.arange(before.shape[1])[None,:]>(483-472)*60
formal_path=ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.4.关联遮挡与线稿校准/character.svg'
formal=ET.parse(str(formal_path))
report={'candidate_sha256':hashlib.sha256(formal_path.read_bytes()).hexdigest(),'test_hair':'Actual hair_front_left_aligned_surface; tests only recolor it white to count the ink components. No replacement occluder or QA hair mask.','full_source_components':component_count(mask('lash-complete-no-hair')),'real_hair_fragment_counts':{'before':component_count(before),'moved':component_count(moved),'curve_edited':component_count(changed)},'controller_delta':[.8,.35],'single_source_curve_change':'Bottom cubic first control point (481.77,198.2) -> (481.77,198.75)','controller_difference_pixels':{'near_root':int(((before!=moved)&left).sum()),'far_tip':int(((before!=moved)&right).sum())},'curve_difference_pixels':{'near_root':int(((before!=changed)&left).sum()),'far_tip':int(((before!=changed)&right).sum())},'formal_restored':formal.xpath('//*[@id="eye_left_upper_lash_outer_controller"]')[0].get('transform')=='translate(0 0)' and '481.77,198.2' in formal.xpath('//*[@id="eye_left_upper_lash_outer_geometry"]')[0].get('d'),'source_geometry_count':len(formal.xpath('//*[@id="eye_left_upper_lash_outer_geometry"]')),'formal_instances_share_controller':all(formal.xpath('//*[@id=$id]',id=i)[0].get('href')=='#eye_left_upper_lash_outer_controller' for i in ['eye_left_upper_lash_outer_instance','eye_left_upper_lash_outer_front_instance'])}
assert report['full_source_components']==1
assert all(v==2 for v in report['real_hair_fragment_counts'].values())
assert all(v>0 for field in ['controller_difference_pixels','curve_difference_pixels'] for v in report[field].values())
assert report['formal_restored'] and report['formal_instances_share_controller']
(P/'real-hair-linkage-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
panel=Image.new('RGB',(2160,644),'white');d=ImageDraw.Draw(panel)
for n,(name,label) in enumerate([('real-hair-before','BEFORE | actual hair, two formal uses'),('real-hair-moved','CONTROLLER | translate(0.8, 0.35)'),('real-hair-curve-edited','SOURCE | one control-point edit')]):
 d.text((720*n+10,10),label,font=font,fill='black');panel.paste(Image.open(P/(name+'.png')).resize((720,600),Image.Resampling.LANCZOS),(720*n,40))
panel.save(P/'real-hair-linkage-before-after-panel.png')
print(json.dumps(report,ensure_ascii=False,indent=2))
for id in ['brow_left','nose']:
 e=formal.xpath('//*[@id=$id]',id=id)[0]
 print(id,[(x.get('id'),x.get('d')) for x in e.iter() if x.get('d')])
