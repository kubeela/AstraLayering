from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from lxml import etree as E
import numpy as np,json
P=Path(__file__).resolve().parent;R=P.parents[2]
source=Image.open(R/'references/base-subject.png').convert('RGB').crop((393,184,437,214));candidate=Image.open(P/'candidate-eye-native.png').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel)
d.text((12,12),'SOURCE | (393,184)-(437,214) | nearest 20x',font=font,fill='black');d.text((904,12),'CANDIDATE | same original coordinates',font=font,fill='black')
panel.paste(source.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(candidate.resize((880,600),Image.Resampling.NEAREST),(900,45));panel.save(P/'reference-candidate-side-by-side.png')
Image.blend(source,candidate,0.5).resize((880,600),Image.Resampling.NEAREST).save(P/'same-coordinate-blend-50pct.png')
source.resize((1320,900),Image.Resampling.NEAREST).save(P/'reference-eye-nearest-30x.png')
def mask(name):return np.array(Image.open(P/(name+'.png')).convert('L'))<128
def components(a):
 spans=[];parents=[];previous=[]
 def find(x):
  while parents[x]!=x:parents[x]=parents[parents[x]];x=parents[x]
  return x
 for y,row in enumerate(a):
  edges=np.flatnonzero(np.diff(np.pad(row.astype(np.int8),(1,1))));cur=[]
  for x0,x1 in zip(edges[::2],edges[1::2]):
   idx=len(parents);parents.append(idx);spans.append((y,int(x0),int(x1)));cur.append(idx)
   for prev in previous:
    py,px0,px1=spans[prev]
    if px1>=x0 and px0<=x1:parents[find(idx)]=find(prev)
  previous=cur
 groups={}
 for idx,(y,x0,x1) in enumerate(spans):groups.setdefault(find(idx),[]).append((y,x0,x1))
 return [{'pixels':sum(x1-x0 for y,x0,x1 in g),'bbox':[min(x0 for y,x0,x1 in g),min(y for y,x0,x1 in g),max(x1 for y,x0,x1 in g),max(y for y,x0,x1 in g)+1]} for g in groups.values()]
b=mask('diagnostic-hair-before');m=mask('diagnostic-hair-moved');c=mask('diagnostic-hair-curve-edited')
far=np.arange(b.shape[1])[None,:]<(404.2-398)*60;near=np.arange(b.shape[1])[None,:]>(406.0-398)*60
report={'diagnostic_mask_status':'QA only; source-position strand, not the formal actual hair. Formal real-hair calibration remains for 2.4.','full_lash_components':components(mask('lash-complete-before')),'split_before_components':components(b),'split_moved_components':components(m),'split_curve_edited_components':components(c),'controller_change':'translate(0.8 0.35)','source_curve_change':'Only first cubic second control point (405.48,196.50) to (405.48,196.00)','move_differences':{'near_root':int(((b!=m)&near).sum()),'far_tip':int(((b!=m)&far).sum())},'curve_differences':{'near_root':int(((b!=c)&near).sum()),'far_tip':int(((b!=c)&far).sum())}}
assert len(report['full_lash_components'])==1
assert all(len(report[k])==2 for k in ['split_before_components','split_moved_components','split_curve_edited_components'])
assert all(v>0 for key in ['move_differences','curve_differences'] for v in report[key].values())
formal=E.parse(str(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.3.装饰部件线稿/character.svg'))
assert formal.xpath('//*[@id="eye_right_upper_lash_outer_controller"]')[0].get('transform')=='translate(0 0)'
assert '405.48,196.50' in formal.xpath('//*[@id="eye_right_upper_lash_outer_geometry"]')[0].get('d')
assert not formal.xpath('//*[@id="qa_right_observed_hair_gap"]')
report['formal_restored_and_no_qa_mask']=True
(P/'lash-linkage-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
panel=Image.new('RGB',(2160,604),'white');d=ImageDraw.Draw(panel)
for n,(name,title) in enumerate([('diagnostic-hair-before','BEFORE | source-position QA strand'),('diagnostic-hair-moved','CONTROLLER | translate(0.8,0.35)'),('diagnostic-hair-curve-edited','SOURCE | single control-point edit')]):
 d.text((n*720+10,10),title,font=font,fill='black');panel.paste(Image.open(P/(name+'.png')).resize((720,560),Image.Resampling.LANCZOS),(n*720,40))
panel.save(P/'lash-linkage-before-after-panel.png')
before=np.array(Image.open(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.2.眼内部件线稿/preview.png').convert('RGB'))
after=np.array(Image.open(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.3.装饰部件线稿/preview.png').convert('RGB'))
diff=np.any(before!=after,axis=2);outside=diff.copy();outside[184:214,393:437]=False
assert not outside.any();assert np.array_equal(before[184:214,449:493],after[184:214,449:493])
check=json.loads((P/'self-check.json').read_text(encoding='utf-8'));check['eye_left_rendered_pixels_unchanged']=True;check['all_pixel_changes_within_current_eye_box']=True
y,x=np.where(diff);check['changed_pixel_bbox']=[int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
(P/'self-check.json').write_text(json.dumps(check,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
