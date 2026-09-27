from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
out=Path('refinement/groups/eyes/3.关联部件校准');e=out/'evidence';ref=Image.open('references/base-subject.png').convert('RGB');cur=Image.open(out/'preview.png').convert('RGB');before=Image.open('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/preview.png').convert('RGB');font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
Image.blend(ref,cur,.5).save(e/'full-canvas-overlay.png')
for box,label,scale in [((300,0,590,305),'head',3),((390,174,496,217),'eyes',12)]:
 w,h=(box[2]-box[0])*scale,(box[3]-box[1])*scale
 canvas=Image.new('RGB',(w,h*3+108),'#e8e8ee');d=ImageDraw.Draw(canvas)
 for i,(title,im) in enumerate([('Reference, original canvas crop',ref),('Final saved SVG, same crop',cur),('50% overlay, no alignment transform',Image.blend(ref,cur,.5))]):
  canvas.paste(im.crop(box).resize((w,h),Image.Resampling.LANCZOS),(0,i*(h+36)+36));d.text((8,i*(h+36)+6),title,font=font,fill='#202535')
 canvas.save(e/(label+'-comparison.png'))
for filename,label in [('no-front-hair.png','no-front-hair-head'),('no-front-hair-and-cast-shadows.png','no-front-hair-clean-head')]:
 im=Image.open(e/filename).convert('RGB');im.crop((370,140,516,277)).resize((876,822),Image.Resampling.LANCZOS).save(e/(label+'.png'))
cur.crop((350,130,535,285)).save(e/'normal-size-head.png')
# Original source boundary estimates recorded from the source pixel grid (±1px due soft source edge).
expected_r=[410,409,407.5,406,404.5,402.5,401,399,397,395]
expected_l=[479,480,481,482,483,484,486,487.5,489,490]
rows=[]
for fn,stage in [('hair-before.png','before'),('hair-after.png','after')]:
 im=Image.open(e/fn).convert('RGBA')
 vals=[(y,max([x for x in range(380,418) if im.getpixel((x,y))[3]>127],default=-1),min([x for x in range(472,515) if im.getpixel((x,y))[3]>127],default=-1)) for y in range(180,217,4)]
 rows.append({'stage':stage,'rows_y_right_left':vals})
print(json.dumps(rows));(e/'occlusion-boundaries.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
