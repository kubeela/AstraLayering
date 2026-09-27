from PIL import Image,ImageDraw,ImageFont,ImageChops
from pathlib import Path
out=Path('refinement/groups/eyes/4.眼周肤色与局部层次');e=out/'evidence';box=(390,182,496,213)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20);w,h=1272,372
rows=[('Enabled, final SVG',out/'preview.png'),('Character right eye skin off (screen left)',e/'no-right-skin.png'),('Character left eye skin off (screen right)',e/'no-left-skin.png'),('All new eye skin off; matches step 3',e/'no-skin.png'),('Entire eyes off; clean face remains',e/'no-eyes.png')]
canvas=Image.new('RGB',(w,(h+36)*len(rows)),'#e8e8ed');d=ImageDraw.Draw(canvas)
for i,(label,p) in enumerate(rows):
 d.text((8,i*(h+36)+5),label,fill='#202535',font=font);canvas.paste(Image.open(p).convert('RGB').crop(box).resize((w,h),Image.Resampling.LANCZOS),(0,i*(h+36)+36))
canvas.save(e/'skin-toggle-comparison.png')
img=Image.open(e/'skin-only.png').convert('RGBA');bg=Image.new('RGBA',img.size,'white');bg.alpha_composite(img);bg.convert('RGB').crop(box).resize((w,h),Image.Resampling.LANCZOS).save(e/'skin-only-crop.png')
print('no eyes equal baseline:',ImageChops.difference(Image.open(e/'no-eyes.png'),Image.open(e/'baseline-no-eyes.png')).getbbox() is None)
