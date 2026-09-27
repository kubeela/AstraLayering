from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
P=Path(__file__).resolve().parent
R=P.parents[2]
im=Image.open(R/'references/base-subject.png').convert('RGB')
crop=im.crop((393,184,437,214))
crop.save(P/'reference-eye-native.png')
crop.resize((1320,900),Image.Resampling.NEAREST).save(P/'reference-eye-nearest-30x.png')
box=(398,189,436,209); scale=34
detail=im.crop(box).resize(((box[2]-box[0])*scale,(box[3]-box[1])*scale),Image.Resampling.NEAREST)
canvas=Image.new('RGB',(detail.width+70,detail.height+70),'white');canvas.paste(detail,(55,40))
d=ImageDraw.Draw(canvas);f=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',15)
for x in range(box[0],box[2]+1):
    px=55+(x-box[0])*scale
    d.line((px,40,px,40+detail.height),fill=(255,255,255),width=1)
    d.text((px+1,14),str(x),font=f,fill='black')
for y in range(box[1],box[3]+1):
    py=40+(y-box[1])*scale
    d.line((55,py,55+detail.width,py),fill=(255,255,255),width=1)
    d.text((8,py+2),str(y),font=f,fill='black')
canvas.save(P/'reference-coordinate-grid.png')
print('source crops saved')
