from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
out=Path('refinement/groups/eyes/2.眼型校准与轮廓部件绘制')
e=out/'evidence';box=(390,178,496,214)
ref=Image.open('references/base-subject.png').convert('RGB')
result=Image.open(out/'preview.png').convert('RGB')
# Same origin, dimensions, and crop, with no image alignment or transform.
Image.blend(ref,result,0.5).save(e/'full-canvas-overlay.png')
Image.blend(ref,result,0.5).crop(box).resize((1272,432),Image.Resampling.LANCZOS).save(e/'eyes-overlay.png')
for src,name in [(out/'preview.png','result-eyes'),(e/'no-eye-black.png','complete-sclera'),(e/'no-eyes.png','clean-face'),(e/'contours-only.png','contours-only-crop')]:
 im=Image.open(src).convert('RGBA'); bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im)
 bg.convert('RGB').crop(box).resize((1272,432),Image.Resampling.LANCZOS).save(e/(name+'.png'))
ref.crop((378,165,508,240)).resize((780,450),Image.Resampling.LANCZOS).save(e/'reference-face.png')
result.crop((378,165,508,240)).resize((780,450),Image.Resampling.LANCZOS).save(e/'result-face.png')
# Normal scale context evidence.
ref.crop((340,120,540,295)).save(e/'reference-normal-size.png')
result.crop((340,120,540,295)).save(e/'result-normal-size.png')
# Labelled reference/result/overlay stacked together at the same coordinates and magnification.
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
items=[('Reference (390,178)-(496,214)',ref.crop(box).resize((1272,432),Image.Resampling.LANCZOS)),('Saved SVG render, same crop',Image.open(e/'result-eyes.png')),('50% overlay, same canvas origin',Image.open(e/'eyes-overlay.png'))]
canvas=Image.new('RGB',(1272,1404),'#E8E8EC');d=ImageDraw.Draw(canvas)
for i,(title,img) in enumerate(items):d.text((12,i*468+6),title,font=font,fill='#202535');canvas.paste(img,(0,i*468+36))
canvas.save(e/'reference-result-overlay.png')
