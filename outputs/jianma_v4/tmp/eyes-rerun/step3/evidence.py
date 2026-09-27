from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
p=Path('tmp/eyes-rerun/step3')
ref=Image.open('references/base-subject.png').convert('RGB');font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
refhead=ref.crop((300,0,590,295)).resize((580,590));refhead.save(p/'reference-full-head-2x.png')
def sheet_rows(name,images,labels):
 w=max(x.width for x in images);h=sum(x.height+30 for x in images)
 o=Image.new('RGB',(w,h),'white');d=ImageDraw.Draw(o);y=0
 for im,label in zip(images,labels):
  d.text((8,y+5),label,font=font,fill='#253441');o.paste(im,(0,y+30));y+=im.height+30
 o.save(p/name)
def sheet_cols(name,images,labels):
 w=sum(x.width for x in images);h=max(x.height for x in images)+30
 o=Image.new('RGB',(w,h),'white');d=ImageDraw.Draw(o);x=0
 for im,label in zip(images,labels):
  d.text((x+8,5),label,font=font,fill='#253441');o.paste(im,(x,30));x+=im.width
 o.save(p/name)
sheet_rows('same-coordinates-eyes-12x.png',[Image.open(p/'reference-eyes-12x.png'),Image.open(p/'input-eyes-12x.png'),Image.open(p/'candidate-eyes-12x.png')],['Reference | original x=390..500, y=178..219','Step 2 input | direct SVG render 12x','Step 3 saved SVG | direct SVG render 12x'])
sheet_cols('same-coordinates-head-2x.png',[refhead,Image.open(p/'input-head-2x.png'),Image.open(p/'candidate-head-2x.png')],['Reference | 2x','Step 2 input | direct SVG 2x','Step 3 saved SVG | direct SVG 2x'])
inputim=Image.open('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/preview.png').convert('RGB')
outim=Image.open('refinement/groups/eyes/3.关联部件校准/preview.png').convert('RGB')
sheet_cols('normal-head-1x.png',[ref.crop((300,0,590,295)),inputim.crop((300,0,590,295)),outim.crop((300,0,590,295))],['Reference | 1:1','Step 2 input | 1:1','Step 3 saved SVG | 1:1'])
Image.blend(Image.open(p/'reference-eyes-12x.png').convert('RGB'),Image.open(p/'candidate-eyes-12x.png').convert('RGB'),.5).save(p/'overlay-eyes-50-percent-12x.png')
Image.blend(refhead,Image.open(p/'candidate-head-2x.png').convert('RGB'),.5).save(p/'overlay-head-50-percent-2x.png')
print('preview',outim.size,Image.open('refinement/groups/eyes/3.关联部件校准/preview.png').mode)
