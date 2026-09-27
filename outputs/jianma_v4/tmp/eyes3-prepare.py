from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from lxml import etree as E
out=Path('refinement/groups/eyes/3.关联部件校准');e=out/'evidence'
source=Path('refinement/groups/eyes/2.眼型校准与轮廓部件绘制')
ref=Image.open('references/base-subject.png').convert('RGB');cur=Image.open(source/'preview.png').convert('RGB')
for box,label,scale in [((300,0,590,305),'head',3),((390,174,496,217),'eyes',12),((394,180,412,215),'right-occlusion',20),((476,180,494,215),'left-occlusion',20)]:
 w,h=(box[2]-box[0])*scale,(box[3]-box[1])*scale
 font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
 canvas=Image.new('RGB',(w*3,h+28),'#e8e8ee');d=ImageDraw.Draw(canvas)
 for i,(title,im) in enumerate([('Reference',ref),('Input SVG',cur),('Same-origin 50% overlay',Image.blend(ref,cur,.5))]):
  canvas.paste(im.crop(box).resize((w,h),Image.Resampling.LANCZOS),(i*w,28));d.text((i*w+6,3),title,font=font,fill='#222233')
 canvas.save(e/(label+'-before.png'))
# Top-level front hair closure displayed without the front pieces.
r=E.parse(str(source/'character.svg'));root=r.getroot()
for el in root.xpath('.//*[@id="hair_front_left" or @id="hair_front_right"]'):el.set('display','none')
r.write(str(e/'before-no-front-hair.svg'),encoding='utf-8',xml_declaration=True)
# source current elements for scoped inspection
for id in ['hair_front_right','hair_front_left','hair_side_right','hair_side_left','fx_hair_front_right_on_face','fx_hair_front_left_on_face']:
 el=root.xpath('.//*[@id=$i]',i=id)[0];print(E.tostring(el,encoding='unicode'))
