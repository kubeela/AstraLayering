from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from lxml import etree as ET
import numpy as np,json
P=Path(__file__).resolve().parent; ROOT=P.parents[2]
source=Image.open(ROOT/'references/base-subject.png').convert('RGB').crop((449,184,493,214))
candidate=Image.open(P/'candidate-eye-native.png').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel)
d.text((12,12),'SOURCE | same box (449,184)-(493,214)',font=font,fill='black')
d.text((904,12),'CANDIDATE | same coordinates | nearest 20x',font=font,fill='black')
panel.paste(source.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(candidate.resize((880,600),Image.Resampling.NEAREST),(900,45))
panel.save(P/'reference-candidate-side-by-side.png')
Image.blend(source,candidate,0.5).resize((880,600),Image.Resampling.NEAREST).save(P/'same-coordinate-blend-50pct.png')
source.resize((1320,900),Image.Resampling.NEAREST).save(P/'reference-eye-nearest-30x.png')

def mask(name):return np.array(Image.open(P/(name+'.png')).convert('L'))<128
def components(a):
 # Eight-neighbour run connectivity; exact binary count without assuming optional image-analysis packages.
 spans=[];parents=[];previous=[]
 def find(x):
  while parents[x]!=x:parents[x]=parents[parents[x]];x=parents[x]
  return x
 for y,row in enumerate(a):
  edge=np.flatnonzero(np.diff(np.pad(row.astype(np.int8),(1,1))))
  cur=[]
  for x0,x1 in zip(edge[0::2],edge[1::2]):
   idx=len(parents);parents.append(idx);spans.append((y,int(x0),int(x1)));cur.append(idx)
   for prev in previous:
    py,px0,px1=spans[prev]
    if px1>=x0 and px0<=x1:parents[find(idx)]=find(prev)
  previous=cur
 groups={}
 for idx,(y,x0,x1) in enumerate(spans):groups.setdefault(find(idx),[]).append((y,x0,x1))
 return [{'pixels':sum(x1-x0 for y,x0,x1 in g),'bbox':[min(x0 for y,x0,x1 in g),min(y for y,x0,x1 in g),max(x1 for y,x0,x1 in g),max(y for y,x0,x1 in g)+1]} for g in groups.values()]

before=mask('diagnostic-hair-before');moved=mask('diagnostic-hair-moved');changed=mask('diagnostic-hair-curve-edited')
left=(np.arange(before.shape[1])[None,:]<(480-472)*60)
right=(np.arange(before.shape[1])[None,:]>(482.8-472)*60)
report={'diagnostic_hair_mask_status':'QA-only source-position silhouette, not the existing formal hair geometry. Formal occlusion calibration is reserved for step 2.4.','full_lash_components':components(mask('lash-complete-before')),'source_hair_split_components':components(before),'moved_split_components':components(moved),'curve_edited_split_components':components(changed),'controller_change':'eye_left_upper_lash_outer_controller translate(0.8 0.35)','source_curve_change':'Only the second control point of the first cubic, (481.7,196.35), changed to (481.7,195.8)','moved_fragment_pixel_differences':{'near_root':int(((before!=moved)&left).sum()),'far_tip':int(((before!=moved)&right).sum())},'curve_change_fragment_pixel_differences':{'near_root':int(((before!=changed)&left).sum()),'far_tip':int(((before!=changed)&right).sum())}}
assert len(report['full_lash_components'])==1
assert len(report['source_hair_split_components'])==2
assert len(report['moved_split_components'])==2
assert len(report['curve_edited_split_components'])==2
assert all(v>0 for field in ['moved_fragment_pixel_differences','curve_change_fragment_pixel_differences'] for v in report[field].values())
formal=ET.parse(str(ROOT/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.3.装饰部件线稿/character.svg'))
assert formal.xpath('//*[@id="eye_left_upper_lash_outer_controller"]')[0].get('transform')=='translate(0 0)'
assert '481.7,196.35' in formal.xpath('//*[@id="eye_left_upper_lash_outer_geometry"]')[0].get('d')
assert not formal.xpath('//*[@id="qa_observed_hair_gap"]')
report['formal_candidate_restored_and_contains_no_qa_mask']=True
(P/'lash-linkage-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')

panel=Image.new('RGB',(2160,644),'white');draw=ImageDraw.Draw(panel)
for n,(name,title) in enumerate([('diagnostic-hair-before','BEFORE | source-position hair QA mask'),('diagnostic-hair-moved','CONTROLLER | translate(0.8, 0.35)'),('diagnostic-hair-curve-edited','SOURCE | one cubic control-point edit')]):
 draw.text((720*n+10,10),title,font=font,fill='black')
 im=Image.open(P/(name+'.png')).resize((720,600),Image.Resampling.LANCZOS)
 panel.paste(im,(720*n,40))
panel.save(P/'lash-linkage-before-after-panel.png')
print(json.dumps(report,ensure_ascii=False,indent=2))
