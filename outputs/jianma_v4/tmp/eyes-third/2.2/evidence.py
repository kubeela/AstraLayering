from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np, json
P=Path(__file__).resolve().parent; ROOT=P.parents[2]
source=Image.open(ROOT/'references/base-subject.png').convert('RGB').crop((449,184,493,214))
candidate=Image.open(P/'candidate-eye-native.png').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
panel=Image.new('RGB',(1784,650),'white'); draw=ImageDraw.Draw(panel)
draw.text((12,12),'SOURCE | same box (449,184)-(493,214)',font=font,fill='black')
draw.text((904,12),'CANDIDATE | same coordinates | nearest 20x',font=font,fill='black')
panel.paste(source.resize((880,600),Image.Resampling.NEAREST),(8,45))
panel.paste(candidate.resize((880,600),Image.Resampling.NEAREST),(900,45))
panel.save(P/'reference-candidate-side-by-side.png')
Image.blend(source,candidate,0.5).resize((880,600),Image.Resampling.NEAREST).save(P/'same-coordinate-blend-50pct.png')
source.resize((1320,900),Image.Resampling.NEAREST).save(P/'reference-eye-nearest-30x.png')

def mask(name):return np.array(Image.open(P/('mask-'+name+'.png')).convert('L'))<128
def bounds(a):
 yy,xx=np.where(a)
 return [449+xx.min()/60,184+yy.min()/60,449+(xx.max()+1)/60,184+(yy.max()+1)/60]
def size(b):return [b[2]-b[0],b[3]-b[1]]
aperture=mask('aperture'); iris=mask('iris-visible'); full=mask('iris-complete')
roi=np.ones_like(aperture,dtype=bool); roi[:,1860:]=False # x >= 480: hair uncertainty zone excluded from both source comparison and candidate measurement
eye_bbox=bounds(aperture&roi); iris_bbox=bounds(iris&roi)
iris_w,iris_h=size(iris_bbox);eye_w,eye_h=size(eye_bbox)
scan=199.5; row=round((scan-184)*60)
def extent(a):
 xs=np.flatnonzero(a[row])
 return [449+xs.min()/60,449+(xs.max()+1)/60]
e=extent(aperture&roi);i=extent(iris&roi)
def column_span(a,x):
 ys=np.flatnonzero(a[:,round((x-449)*60)])
 return [184+ys.min()/60,184+(ys.max()+1)/60]
at_center_full=column_span(full,470.15);at_center_visible=column_span(iris,470.15)
dark=mask('pupil-visible') & ~mask('highlight-visible')
dark_y,dark_x=np.where(dark)
dark_center=[449+(dark_x.mean()+0.5)/60,184+(dark_y.mean()+0.5)/60]
result={
 'measurement_coordinates':'Original canvas, black/white SVG geometry masks at 60x; bounding threshold 50%. Source estimates use identical x < 480 visible region.',
 'source_estimates':{'visible_eye_bbox':[455.5,195.3,480.0,203.8],'eye_width_range':[23.8,24.8],'eye_height_range':[7.6,8.5],'visible_iris_width_range':[15.3,16.7],'visible_iris_height_range':[7.2,8.2],'iris_visible_bbox_center_range':[[469.8,470.6],[199.0,199.8]],'pupil_dark_center_range':[[468.5,469.7],[197.6,198.6]],'scanline_y':scan,'inner_white_width_range':[3.3,5.0],'outer_white_width_range':[1.0,2.5],'width_ratio_range':[0.62,0.70],'height_ratio_range':[0.90,1.0],'highlight_count_confirmed':1},
 'candidate':{'visible_eye_bbox':eye_bbox,'visible_iris_bbox':iris_bbox,'visible_eye_size':[eye_w,eye_h],'visible_iris_size':[iris_w,iris_h],'iris_to_eye_width_ratio':iris_w/eye_w,'iris_to_eye_height_ratio':iris_h/eye_h,'visible_iris_bbox_center':[(iris_bbox[0]+iris_bbox[2])/2,(iris_bbox[1]+iris_bbox[3])/2],'pupil_full_center':[469.3,197.2],'pupil_visible_dark_centroid':dark_center,'pupil_visible_bbox':bounds(mask('pupil-visible')),'highlight_visible_bbox':bounds(mask('highlight-visible')),'scanline_y':scan,'scanline_eye_extent':e,'scanline_iris_extent':i,'inner_white_width':i[0]-e[0],'outer_white_width':e[1]-i[1],'complete_iris_bbox':bounds(full),'iris_center_column_full_extent':at_center_full,'iris_center_column_visible_extent':at_center_visible,'center_column_hidden_above':at_center_visible[0]-at_center_full[0],'center_column_hidden_below':at_center_full[1]-at_center_visible[1]},
 'interpretation':'Source range estimates are visual intervals over blurred raster edges, not automatic tracing. Hidden full-iris dimensions are not used as the source-visible comparison denominator.'
}
(P/'visible-proportion-measurements.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
