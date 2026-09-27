from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
root=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/evidence')
im=Image.open('references/base-subject.png').convert('RGB')
print('reference dimensions', im.size)
im.crop((380,165,505,248)).resize((1000,664)).save(root/'reference-face-8x.png')
box=(394,185,438,213)
crop=im.crop(box).resize((1056,672),Image.Resampling.NEAREST)
d=ImageDraw.Draw(crop)
for x in range(395,439,5):
    xx=(x-box[0])*24; d.line((xx,0,xx,672),fill=(185,80,45),width=1); d.text((xx+3,1),str(x),fill=(120,20,5))
for y in range(185,214,5):
    yy=(y-box[1])*24; d.line((0,yy,1056,yy),fill=(185,80,45),width=1); d.text((1,yy+2),str(y),fill=(120,20,5))
crop.save(root/'reference-eye-grid-24x.png')
