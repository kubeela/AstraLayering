from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
out=Path('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/evidence')
box=(390,178,496,214)
for src,name in [('references/base-subject.png','reference-eyes'),('references/line-art.png','line-art-eyes'),(str(out/'input-render.png'),'input-eyes')]:
 im=Image.open(src).convert('RGB'); im.crop(box).resize((1060,360),Image.Resampling.LANCZOS).save(out/(name+'.png'))
ref=Image.open('references/base-subject.png').convert('RGB')
im=ref.crop((396,189,491,208)).resize((1140,228),Image.Resampling.NEAREST)
for x in range(400,491,5):
 d=ImageDraw.Draw(im); xx=(x-396)*12; d.line((xx,0,xx,228), fill='#00AA9988', width=1); d.text((xx+1,0),str(x),fill='#00BB66')
for y in range(190,209,5):
 yy=(y-189)*12; d.line((0,yy,1140,yy),fill='#00AA99',width=1);d.text((1,yy+1),str(y),fill='#00BB66')
im.save(out/'reference-coordinate-grid.png')
