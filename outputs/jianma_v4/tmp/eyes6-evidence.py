from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
out=Path('refinement/groups/eyes/6.投影与高光效果');e=out/'evidence';ref=Image.open('references/base-subject.png').convert('RGB');now=Image.open(out/'preview.png').convert('RGB');old=Image.open('refinement/groups/eyes/5.眼黑与装饰部件绘制/preview.png').convert('RGB');box=(390,180,496,214);w,h=1272,408;font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
rows=[('Reference, original canvas crop',ref),('Final saved SVG, eye effects enabled',now),('Same-origin 50% overlay',Image.blend(ref,now,.5))]
canvas=Image.new('RGB',(w,(h+36)*len(rows)),'#e8e8ed');d=ImageDraw.Draw(canvas)
for i,(label,img) in enumerate(rows):d.text((8,i*(h+36)+5),label,fill='#202535',font=font);canvas.paste(img.crop(box).resize((w,h),Image.Resampling.LANCZOS),(0,i*(h+36)+36))
canvas.save(e/'final-eyes-reference-comparison.png');Image.blend(ref,now,.5).save(e/'full-canvas-overlay.png')
for name in ['no-right-effects','no-left-effects','no-eye-effects','effects-only','no-upper-lids-or-their-shadows','no-front-hair-or-their-shadows','no-eyes','no-eye-black-or-highlights','eye-black-highlights-unclipped']:
 img=Image.open(e/(name+'.png')).convert('RGB');img.crop(box).resize((w,h),Image.Resampling.LANCZOS).save(e/(name+'-crop.png'))
now.crop((350,125,538,285)).save(e/'normal-size-head.png');now.crop((350,115,540,287)).resize((760,688),Image.Resampling.LANCZOS).save(e/'final-head.png')
print('No eye effects equals step 5:',ImageChops.difference(old,Image.open(e/'no-eye-effects.png').convert('RGB')).getbbox() is None)
print('Samples:',[(p,ref.getpixel(p),now.getpixel(p)) for p in [(418,197),(419,197),(468,196),(469,196),(412,196),(473,197),(476,196)]])
