from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math, json
P=Path(__file__).resolve().parent
ROOT=P.parents[2]
source=Image.open(ROOT/'references/base-subject.png').convert('RGB').crop((449,184,493,214))
candidate=Image.open(P/'candidate-eye-native.png').convert('RGB')
scale=20
source.resize((880,600),Image.Resampling.NEAREST).save(P/'reference-eye-nearest-20x.png')
candidate.resize((880,600),Image.Resampling.NEAREST).save(P/'candidate-eye-nearest-20x.png')
blend=Image.blend(source,candidate,0.5)
blend.resize((880,600),Image.Resampling.NEAREST).save(P/'same-coordinate-blend-50pct.png')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
panel=Image.new('RGB',(1784,650),'#ffffff')
d=ImageDraw.Draw(panel)
d.text((12,12),'SOURCE | (449,184)-(493,214) | nearest 20x',font=font,fill='black')
d.text((904,12),'CANDIDATE | same box and scale | nearest 20x',font=font,fill='black')
panel.paste(source.resize((880,600),Image.Resampling.NEAREST),(8,45))
panel.paste(candidate.resize((880,600),Image.Resampling.NEAREST),(900,45))
panel.save(P/'reference-candidate-side-by-side.png')

pts={
 'I':(455.75,201.6), 'O?':(482.2,196.75),
 'U':(469.18,195.397), 'L':(469.53,203.39),
 'T1':(461.7,202.65), 'T2':(475.35,202.85), 'R':(480.7,198.1),
}
annotated=source.resize((1320,900),Image.Resampling.NEAREST)
draw=ImageDraw.Draw(annotated)
font2=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',24)
offsets={'I':(-52,22),'O?':(12,-52),'U':(-15,-66),'L':(-15,28),'T1':(-45,44),'T2':(6,38),'R':(28,28)}
for name,(x,y) in pts.items():
    px=(x-449)*30; py=(y-184)*30
    draw.ellipse((px-6,py-6,px+6,py+6),outline='#e93954',width=3)
    ox,oy=offsets[name]
    draw.text((px+ox,py+oy),name,font=font2,fill='#e93954',stroke_width=1,stroke_fill='white')
annotated.save(P/'reference-keypoints.png')

def cubic(a,b,c,d,t):
    return tuple((1-t)**3*a[i]+3*(1-t)**2*t*b[i]+3*(1-t)*t*t*c[i]+t**3*d[i] for i in range(2))
upper_segments=[[(455.75,201.6),(458.3,198.2),(463.35,195.6),(468.6,195.4)],[(468.6,195.4),(472.85,195.35),(476.15,195.85),(479.5,197.1)],[(479.5,197.1),(480.3,197.5),(481.05,197.3),(482.2,196.75)]]
lower_segments=[[(482.2,196.75),(481.7,197.05),(481.2,197.5),(480.7,198.1)],[(480.7,198.1),(479.55,200.08),(477.6,201.7),(475.35,202.85)],[(475.35,202.85),(471.1,203.72),(465.7,203.4),(461.7,202.65)],[(461.7,202.65),(459.9,202.31),(457.8,201.55),(455.75,201.6)]]
samples=lambda seq:[cubic(*seg,i/1000) for seg in seq for i in range(1001)]
us=samples(upper_segments); ls=samples(lower_segments)
top=min(us,key=lambda p:p[1]); bottom=max(ls,key=lambda p:p[1])
metrics={'eye_width':26.45,'upper_aperture_extreme':top,'lower_aperture_extreme':bottom,'eye_height':bottom[1]-top[1],'corner_chord_tilt_degrees':math.degrees(math.atan2(-4.85,26.45)),'uncertainty_px':{'visible_edges':0.6,'occluded_outer_corner':1.5},'pixel_matching':'All comparisons use the exact same source crop, without translating or scaling the eye relative to its canvas.'}
(P/'geometry-metrics.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8')
print(json.dumps(metrics,indent=2))
