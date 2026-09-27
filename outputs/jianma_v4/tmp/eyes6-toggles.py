from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
out=Path('refinement/groups/eyes/6.投影与高光效果');e=out/'evidence';box=(390,180,496,214);w,h=1272,408;font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
rows=[('Final: all eye effects enabled',out/'preview.png'),('Right eye effects off (screen left)',e/'no-right-effects.png'),('Left eye effects off (screen right)',e/'no-left-effects.png'),('All eye effects off: same as step 5',e/'no-eye-effects.png'),('Entire eyes and all effect fragments off',e/'no-eyes.png')]
canvas=Image.new('RGB',(w,(h+36)*len(rows)),'#e8e8ed');d=ImageDraw.Draw(canvas)
for i,(label,p) in enumerate(rows):d.text((8,i*(h+36)+5),label,fill='#202535',font=font);canvas.paste(Image.open(p).convert('RGB').crop(box).resize((w,h),Image.Resampling.LANCZOS),(0,i*(h+36)+36))
canvas.save(e/'effects-toggle-comparison.png')
