from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
p=Path('tmp/eyes-rerun/step2')
ref=Image.open('references/base-subject.png').convert('RGB')
can=Image.open('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/preview.png').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
def sheet(name,images,labels):
 w=max(im.width for im in images)
 h=sum(im.height+30 for im in images)
 o=Image.new('RGB',(w,h),'white'); d=ImageDraw.Draw(o); y=0
 for im,label in zip(images,labels):
  d.text((8,y+5),label,fill='#253441',font=font);o.paste(im,(0,y+30));y+=im.height+30
 o.save(p/name)
sheet('same-coordinates-12x.png',[Image.open(p/'reference-eyes-12x.png'),Image.open(p/'candidate-eyes-12x.png')],['Reference | x=390..500, y=178..219 | 12x','Saved SVG | same coordinates | direct SVG render at 12x'])
Image.blend(Image.open(p/'reference-eyes-12x.png').convert('RGB'),Image.open(p/'candidate-eyes-12x.png').convert('RGB'),.5).save(p/'overlay-50-percent-12x.png')
o=Image.new('RGB',(380,200),'#ffffff');d=ImageDraw.Draw(o)
d.text((12,5),'Reference 1:1',fill='#253441',font=font);d.text((200,5),'Saved SVG 1:1',fill='#253441',font=font)
o.paste(ref.crop((370,135,520,280)),(12,35));o.paste(can.crop((370,135,520,280)),(200,35));o.save(p/'normal-face-1x.png')
o=Image.new('RGB',(1882,1702),'#ffffff');d=ImageDraw.Draw(o);d.text((12,5),'Reference 1:1',fill='#253441',font=font);d.text((953,5),'Saved SVG 1:1',fill='#253441',font=font);o.paste(ref,(0,30));o.paste(can,(941,30));o.save(p/'normal-full-1x.png')
sheet('contour-checks-12x.png',[Image.open(p/'contours-only-12x.png'),Image.open(p/'no-iris-12x.png'),Image.open(p/'white-only-12x.png'),Image.open(p/'eyes-off-12x.png')],['Contour parts only','Eye-black hidden | complete sclera below the lids','Sclera shapes only | tinted backing for inspection','Entire eyes hidden | clean underlying face'])
print('preview',can.size,Image.open('refinement/groups/eyes/2.眼型校准与轮廓部件绘制/preview.png').mode)
