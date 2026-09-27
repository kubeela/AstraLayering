from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
out=Path('refinement/groups/eyes/3.关联部件校准/evidence')
im=Image.open('references/base-subject.png').convert('RGB');f=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
for box,label in [((392,172,416,222),'right'),((474,172,498,222),'left')]:
 img=im.crop(box).resize((480,1000),Image.Resampling.NEAREST);d=ImageDraw.Draw(img)
 for x in range(box[0],box[2]+1,2):
  xx=(x-box[0])*20;d.line((xx,0,xx,1000),fill='#74A5AB',width=1);d.text((xx+1,2),str(x),fill='#006866',font=f)
 for y in range(box[1],box[3]+1,4):
  yy=(y-box[1])*20;d.line((0,yy,480,yy),fill='#74A5AB',width=1);d.text((1,yy+1),str(y),fill='#006866',font=f)
 img.save(out/f'{label}-hair-grid.png')
