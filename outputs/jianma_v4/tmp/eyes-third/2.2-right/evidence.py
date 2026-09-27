from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json
from lxml import etree as E
P=Path(__file__).resolve().parent;R=P.parents[2]
source=Image.open(R/'references/base-subject.png').convert('RGB').crop((393,184,437,214));candidate=Image.open(P/'candidate-eye-native.png').convert('RGB')
f=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel)
d.text((12,12),'SOURCE | (393,184)-(437,214) | nearest 20x',font=f,fill='black');d.text((904,12),'CANDIDATE | same original coordinates',font=f,fill='black')
panel.paste(source.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(candidate.resize((880,600),Image.Resampling.NEAREST),(900,45));panel.save(P/'reference-candidate-side-by-side.png')
Image.blend(source,candidate,0.5).resize((880,600),Image.Resampling.NEAREST).save(P/'same-coordinate-blend-50pct.png')
source.resize((1320,900),Image.Resampling.NEAREST).save(P/'reference-eye-nearest-30x.png')
def mask(name):return np.array(Image.open(P/('mask-'+name+'.png')).convert('L'))<128
def bounds(a):
 y,x=np.where(a);return [393+x.min()/60,184+y.min()/60,393+(x.max()+1)/60,184+(y.max()+1)/60]
def size(b):return [b[2]-b[0],b[3]-b[1]]
a=mask('aperture');i=mask('iris-visible');full=mask('iris-complete')
# x >= 407: identical observed domain for source and candidate; exclude the partly hidden corner.
roi=np.ones_like(a,dtype=bool);roi[:,:840]=False
ab=bounds(a&roi);ib=bounds(i&roi);aw,ah=size(ab);iw,ih=size(ib)
def extent(m,y):
 x=np.flatnonzero(m[round((y-184)*60)]);return [393+x.min()/60,393+(x.max()+1)/60]
scans=[]
for y in [198.5,199.5,200.5,201.5]:
 e=extent(a&roi,y);ir=extent(i&roi,y)
 scans.append({'y':y,'eye_extent':e,'iris_extent':ir,'outer_white_width':ir[0]-e[0],'inner_white_width':e[1]-ir[1]})
def col(m,x):
 y=np.flatnonzero(m[:,round((x-393)*60)]);return [184+y.min()/60,184+(y.max()+1)/60]
cf=col(full,418.2);cv=col(i,418.2)
dark=mask('pupil-visible')&~mask('highlight-visible');dy,dx=np.where(dark)
result={'measurement_coordinates':'Original canvas, 60x SVG masks at 50% threshold. Same visible domain x >= 407 excludes partly hidden outer corner.','source_estimates':{'visible_eye_width_range':[23.0,24.2],'visible_eye_height_range':[7.7,8.7],'visible_iris_width_range':[14.4,15.8],'visible_iris_height_range':[7.4,8.4],'visible_iris_bbox_center_range':[[417.7,418.6],[199.1,199.9]],'pupil_visible_dark_centroid_range':[[417.5,419.1],[197.2,198.8]],'highlight_bbox_estimate':[418.0,196.0,420.0,198.0],'width_ratio_range':[0.60,0.68],'height_ratio_range':[0.89,1.0],'y200_5_outer_white_range':[1.1,2.6],'y200_5_inner_white_range':[2.0,3.5],'highlight_count_confirmed':1},'candidate':{'visible_eye_bbox':ab,'visible_eye_size':[aw,ah],'visible_iris_bbox':ib,'visible_iris_size':[iw,ih],'iris_to_eye_width_ratio':iw/aw,'iris_to_eye_height_ratio':ih/ah,'visible_iris_bbox_center':[(ib[0]+ib[2])/2,(ib[1]+ib[3])/2],'pupil_full_center':[418.15,197.4],'pupil_visible_dark_centroid':[393+(dx.mean()+.5)/60,184+(dy.mean()+.5)/60],'pupil_visible_bbox':bounds(mask('pupil-visible')),'highlight_visible_bbox':bounds(mask('highlight-visible')),'scanlines':scans,'complete_iris_bbox':bounds(full),'center_column_full':cf,'center_column_visible':cv,'center_column_hidden_above':cv[0]-cf[0],'center_column_hidden_below':cf[1]-cv[1]},'limits':'Source estimates are visual intervals over blurred pixel boundaries; full hidden iris dimensions are not used in visible ratios. Upper eyeliner, local shading and iris edge mix within roughly 0.5 to 1 pixel.'}
(P/'visible-proportion-measurements.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
before=np.array(Image.open(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.1.轮廓部件线稿/preview.png').convert('RGB'))
after=np.array(Image.open(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.2.眼内部件线稿/preview.png').convert('RGB'))
diff=np.any(before!=after,axis=2);outside=diff.copy();outside[184:214,393:437]=False
assert not outside.any()
assert np.array_equal(before[184:214,449:493],after[184:214,449:493])
base_doc=E.parse(str(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.2.眼内部件线稿/character.svg'))
geometry_ids=['eye_right_iris_geometry','eye_right_pupil_geometry','eye_right_highlight_geometry']
gaze_doc=E.parse(str(P/'gaze-offset-test-30x.svg'));close_doc=E.parse(str(P/'aperture-close-test-30x.svg'))
for id in geometry_ids:
 b=E.tostring(base_doc.xpath('//*[@id=$id]',id=id)[0],with_tail=False)
 assert E.tostring(gaze_doc.xpath('//*[@id=$id]',id=id)[0],with_tail=False)==b
 assert E.tostring(close_doc.xpath('//*[@id=$id]',id=id)[0],with_tail=False)==b
for id in ['eye_right_sclera_geometry','eye_right_aperture_geometry','eye_right_sclera_clip','eye_right_aperture_clip','eye_right_upper_lid','eye_right_lower_lid']:
 assert E.tostring(base_doc.xpath('//*[@id=$id]',id=id)[0],with_tail=False)==E.tostring(gaze_doc.xpath('//*[@id=$id]',id=id)[0],with_tail=False)
assert close_doc.xpath('//*[@id="eye_right_aperture_geometry"]')[0].get('d')!=base_doc.xpath('//*[@id="eye_right_aperture_geometry"]')[0].get('d')
assert .60<=iw/aw<=.68
assert 1.1<=scans[2]['outer_white_width']<=2.6 and 2<=scans[2]['inner_white_width']<=3.5
report=json.loads((P/'self-check.json').read_text(encoding='utf-8'))
report.update({'rendered_eye_left_pixels_unchanged':True,'full_preview_changes_confined_to_eye_right_box':True,'gaze_test_static_clips_and_lids_unchanged':True,'gaze_and_blink_test_complete_internal_geometry_unchanged':True,'blink_test_changes_only_aperture_geometry_not_iris_shape':True,'visible_width_ratio_and_y200_5_white_widths_within_source_intervals':True})
yy,xx=np.where(diff);report['changed_pixel_bbox_vs_revised_2_1']=[int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]
(P/'self-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
