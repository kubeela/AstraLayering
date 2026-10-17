"""Combine review PNGs at their existing pixel size, without resampling."""
from PIL import Image
from pathlib import Path
import sys
r=Path(sys.argv[1]);out=r.parent/(r.name+'-pages');out.mkdir(exist_ok=True)
page=Image.new('RGB',(1800,1400),'white');x=y=h=k=0
for f in sorted(r.glob('*.png')):
 im=Image.open(f)
 if im.width>1800 or im.height>1400:
  im.save(out/f'{k:02}.png');k+=1;continue
 if x+im.width>1800:x=0;y+=h+10;h=0
 if y+im.height>1400:
  page.crop((0,0,1800,y+h)).save(out/f'{k:02}.png');k+=1
  page=Image.new('RGB',(1800,1400),'white');x=y=h=0
 page.paste(im,(x,y));x+=im.width+10;h=max(h,im.height)
if x or y:page.crop((0,0,1800,y+h)).save(out/f'{k:02}.png')
print(out)
