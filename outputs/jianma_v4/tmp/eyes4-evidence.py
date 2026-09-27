from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
out=Path('refinement/groups/eyes/4.眼周肤色与局部层次');e=out/'evidence';ref=Image.open('references/base-subject.png').convert('RGB');now=Image.open(out/'preview.png').convert('RGB');old=Image.open('refinement/groups/eyes/3.关联部件校准/preview.png').convert('RGB');box=(390,182,496,213);w,h=1272,372
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
rows=[('Reference, same canvas crop',ref),('Before step 4',old),('Final saved SVG, eye skin enabled',now),('50% reference / final overlay',Image.blend(ref,now,.5))]
img=Image.new('RGB',(w,(h+36)*len(rows)),'#e8e8ed');d=ImageDraw.Draw(img)
for i,(label,source) in enumerate(rows):
 d.text((8,i*(h+36)+5),label,fill='#202535',font=font);img.paste(source.crop(box).resize((w,h),Image.Resampling.LANCZOS),(0,i*(h+36)+36))
img.save(e/'skin-reference-comparison.png')
for name in ['no-right-skin','no-left-skin','no-skin','no-right-eye','no-left-eye','no-eyes']:
 source=Image.open(e/(name+'.png')).convert('RGB');source.crop(box).resize((w,h),Image.Resampling.LANCZOS).save(e/(name+'-crop.png'))
now.crop((350,140,535,280)).save(e/'normal-size-head.png')
now.crop((375,168,510,240)).resize((810,432),Image.Resampling.LANCZOS).save(e/'final-face.png')
print('no-skin matches prior:',ImageChops.difference(Image.open(e/'no-skin.png').convert('RGB'),old).getbbox() is None)
