from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
out=Path('refinement/groups/eyes/5.眼黑与装饰部件绘制');e=out/'evidence';ref=Image.open('references/base-subject.png').convert('RGB');now=Image.open(out/'preview.png').convert('RGB');box=(390,180,496,213);w,h=1272,396;font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
rows=[('Reference: highlights still reserved for step 6',ref),('Saved SVG: iris, pupil and decorations',now),('Same-coordinate 50% overlay',Image.blend(ref,now,.5))]
canvas=Image.new('RGB',(w,(h+36)*len(rows)),'#e8e8ed');d=ImageDraw.Draw(canvas)
for i,(label,img) in enumerate(rows):d.text((8,i*(h+36)+5),label,fill='#202535',font=font);canvas.paste(img.crop(box).resize((w,h),Image.Resampling.LANCZOS),(0,i*(h+36)+36))
canvas.save(e/'eyes-reference-comparison.png')
for name in ['eye-black-only-unclipped','eyes-unclipped','decoration-only','no-decoration','no-eyes']:
 img=Image.open(e/(name+'.png')).convert('RGB');img.crop(box).resize((w,h),Image.Resampling.LANCZOS).save(e/(name+'-crop.png'))
now.crop((350,125,538,285)).save(e/'normal-size-head.png')
now.crop((350,115,540,287)).resize((760,688),Image.Resampling.LANCZOS).save(e/'head-preview.png')
ref.crop((350,115,540,287)).resize((760,688),Image.Resampling.LANCZOS).save(e/'reference-head.png')
