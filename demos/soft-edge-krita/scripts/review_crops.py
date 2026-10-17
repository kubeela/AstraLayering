"""Read-only comparison crops; does not modify artwork."""
import json,sys
from pathlib import Path
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1]
parts=json.loads((R/'manifest.json').read_text())['parts']
ref=Image.open(R.parent/'gray-control-krita/reference.png').convert('RGBA')
args=json.loads(sys.argv[1]); dest=R/'runtime'/args.get('name','crops');dest.mkdir(parents=True,exist_ok=True)
stack=Image.new('RGBA',ref.size);stacks={}
for p in parts:
 f=R/'final-parts'/p['id']/'full.png'
 stack.alpha_composite(Image.open(f).convert('RGBA'));stacks[p['level']]=stack.copy()
for k,item in enumerate(args['items']):
 level=item[0];im=Image.open(R/'final-parts'/parts[level]['id']/'full.png').convert('RGBA')
 box=item[1] if len(item)>1 else tuple([im.getbbox()[0]-4,im.getbbox()[1]-4,im.getbbox()[2]+4,im.getbbox()[3]+4])
 scale=args.get('scale',3);w=(box[2]-box[0])*scale;h=(box[3]-box[1])*scale
 page=Image.new('RGB',(w*3,h+42),'#fafafa');d=ImageDraw.Draw(page)
 d.text((4,2),f'{level:02} {parts[level]["id"]} {box} {scale*100}%',fill='black')
 below=R/'runtime/native-below'/f'{level:02}.png'
 imgs=[ref,im,Image.open(below).convert('RGBA') if below.exists() else stacks[level]]
 for j,img in enumerate(imgs):
  bg=Image.new('RGBA',(w,h),(230,230,230,255));bd=ImageDraw.Draw(bg)
  for y in range(0,h,24):
   for x in range(0,w,24):
    if (x//24+y//24)%2:bd.rectangle((x,y,x+23,y+23),fill=(210,210,210,255))
  bg.alpha_composite(img.crop(box).resize((w,h),Image.Resampling.NEAREST));page.paste(bg,(j*w,40))
  d.text((j*w+4,22),['reference','isolated','higher layers hidden'][j],fill='black')
 page.save(dest/f'{k:02}-L{level:02}.png')
 print(dest/f'{k:02}-L{level:02}.png')
