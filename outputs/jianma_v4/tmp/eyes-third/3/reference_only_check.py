from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import numpy as np,json
P=Path(__file__).resolve().parent;ROOT=P.parents[2]
img=Image.open(ROOT/'references/base-subject.png').convert('RGB')
right=img.crop((393,184,437,214))
left_mirrored=ImageOps.mirror(img.crop((449,184,493,214)))
panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel);font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
d.text((12,12),'SOURCE eye_right | x393-437',font=font,fill='black');d.text((904,12),'SOURCE eye_left mirrored at x443 | same box',font=font,fill='black')
panel.paste(right.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(left_mirrored.resize((880,600),Image.Resampling.NEAREST),(900,45));panel.save(P/'reference-only-mirror-comparison.png')
Image.blend(right,left_mirrored,.5).resize((880,600),Image.Resampling.NEAREST).save(P/'reference-only-mirror-blend-50pct.png')
def center(im,t):
 a=np.asarray(im,dtype=float);w=np.maximum(0,a[:,:,2]-a[:,:,0]);ok=(w>t)
 # Lower visible iris region, identical original coordinate rectangle for both images.
 roi=np.zeros_like(ok);roi[13:20,14:36]=True;w=w*ok*roi
 yy,xx=np.indices(w.shape);return [393+float((w*(xx+.5)).sum()/w.sum()),184+float((w*(yy+.5)).sum()/w.sum())]
rows=[]
for threshold in [12,20,35,50]:
 r=center(right,threshold);m=center(left_mirrored,threshold)
 rows.append({'blue_minus_red_threshold':threshold,'source_right_weighted_visible_blue_center':r,'source_left_exact_mirror_center':m,'delta_source_right_minus_mirror':[r[0]-m[0],r[1]-m[1]]})
report={'status':'return_to_plan_for_axis_or_symmetry_reassessment','axis_used':443,'source_only_comparison':True,'no_candidate_geometry_used_in_color_centroid_check':True,'same_measurement_roi_original_coordinates':[407,197,429,204],'measurement_limits':'Blue chroma centroid is a repeatable location proxy, not a traced iris center. Several thresholds are shown; fixed ROI excludes hair and most eyeliner.','centroid_threshold_sensitivity':rows,'approved_candidate_visible_iris_center':[470.2333,199.3833],'strict_mirror_candidate_visible_iris_center':[415.7667,199.3833],'action':'Do not independently translate or redraw eye_right while keeping the current symmetric plan. Revisit the plan before completing target hair/cross-layer assembly.'}
(P/'mirror-plan-discrepancy.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
