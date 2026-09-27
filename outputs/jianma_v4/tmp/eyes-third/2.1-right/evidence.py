from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
import numpy as np
P=Path(__file__).resolve().parent;R=P.parents[2]
source=Image.open(R/'references/base-subject.png').convert('RGB').crop((393,184,437,214))
candidate=Image.open(P/'candidate-eye-native.png').convert('RGB')
size=(880,600);f=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel)
d.text((12,12),'SOURCE | (393,184)-(437,214) | nearest 20x',font=f,fill='black')
d.text((904,12),'CANDIDATE | same original coordinates',font=f,fill='black')
panel.paste(source.resize(size,Image.Resampling.NEAREST),(8,45));panel.paste(candidate.resize(size,Image.Resampling.NEAREST),(900,45))
panel.save(P/'reference-candidate-side-by-side.png')
Image.blend(source,candidate,0.5).resize(size,Image.Resampling.NEAREST).save(P/'same-coordinate-blend-50pct.png')
m=json.loads((P/'geometry-metrics.json').read_text(encoding='utf-8'))
points={'I':m['inner_corner'],'O?':m['outer_corner_partly_inferred'],'U':m['upper_aperture_extreme'],'L':m['lower_aperture_extreme'],'T1':m['lower_outer_turn'],'T2':m['lower_inner_turn'],'R':m['outer_rise']}
labels={'I':(16,10),'O?':(-70,-55),'U':(-15,-65),'L':(-5,22),'T1':(-55,35),'T2':(10,32),'R':(-80,-10)}
annotated=source.resize((1320,900),Image.Resampling.NEAREST);d=ImageDraw.Draw(annotated)
f=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',24)
for k,(x,y) in points.items():
 px=(x-393)*30;py=(y-184)*30
 d.ellipse((px-6,py-6,px+6,py+6),outline='#e93954',width=3)
 dx,dy=labels[k];d.text((px+dx,py+dy),k,font=f,fill='#e93954',stroke_width=1,stroke_fill='white')
annotated.save(P/'reference-keypoints.png')
before=np.array(Image.open(R/'refinement/groups/eyes/2.逐眼线稿/eye_left/2.4.关联遮挡与线稿校准/preview.png').convert('RGB'))
after=np.array(Image.open(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.1.轮廓部件线稿/preview.png').convert('RGB'))
diff=np.any(before!=after,axis=2)
ys,xs=np.where(diff)
assert np.array_equal(before[184:214,449:493],after[184:214,449:493])
outside=diff.copy();outside[184:214,393:437]=False
assert not outside.any()
report=json.loads((P/'self-check.json').read_text(encoding='utf-8'))
report['rendered_eye_left_pixels_unchanged']=True
report['full_preview_changes_confined_to_eye_right_box']=True
report['changed_pixel_bbox']=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
report['changed_pixel_count']=int(diff.sum())
(P/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Same-coordinate comparisons, blend, and source keypoints saved.')
