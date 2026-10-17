"""Render read-only reference / isolated / lower-stack crops for visual review."""
from pathlib import Path
import argparse,json
from PIL import Image,ImageDraw
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parent/'gray-control-krita'
ap=argparse.ArgumentParser()
ap.add_argument('--levels',required=True)
ap.add_argument('--name',required=True)
ap.add_argument('--scale',type=int,default=3)
ap.add_argument('--source',default='current')
args=ap.parse_args()
levels=set()
for chunk in args.levels.split(','):
    ends=chunk.split('-')
    levels.update(range(int(ends[0]),int(ends[-1])+1))
parts=json.loads((ROOT/'manifest.json').read_text())['parts']
ref=Image.open(BASE/'reference.png').convert('RGBA')
stack=Image.new('RGBA',(1024,1536))
page=Image.new('RGB',(1800,1700),'#fafafa');draw=ImageDraw.Draw(page)
x=y=rh=page_no=0;contained=[]
dest=ROOT/'runtime'/args.name;dest.mkdir(parents=True,exist_ok=True)
def flush():
    global page,draw,x,y,rh,page_no,contained
    if not contained:return
    name=f'{page_no:02}.png';page.crop((0,0,1800,y+rh)).save(dest/name)
    print(name,contained)
    page_no+=1;x=y=rh=0;contained=[]
    page=Image.new('RGB',(1800,1700),'#fafafa');draw=ImageDraw.Draw(page)

for p in parts:
    pid=p['id'];im=Image.open((BASE if args.source=='baseline' else ROOT)/'parts'/pid/'full.png').convert('RGBA')
    stack.alpha_composite(im)
    if p['level'] not in levels:continue
    bb=im.getbbox();box=(max(0,bb[0]-4),max(0,bb[1]-4),min(1024,bb[2]+4),min(1536,bb[3]+4))
    scale=args.scale;w,h=(box[2]-box[0])*scale,(box[3]-box[1])*scale
    if w*3+20>1800 or h+55>1650:
        raise ValueError(f"{pid} too big for page; use a smaller scale")
    cw=max(360,w*3+20);ch=h+55
    if x+cw>1800:x=0;y+=rh;rh=0
    if y+ch>1700:flush()
    draw.text((x+3,y+2),f"{p['level']:02} {pid} ({box[0]},{box[1]}) {scale*100}%",fill='black')
    for j,(label,img) in enumerate([('reference',ref),('isolated',im),('upper layers hidden',stack)]):
        yy,xx=np.indices((h,w));g=np.where((xx//16+yy//16)%2,218,240).astype('uint8')
        bg=Image.fromarray(np.dstack([g,g,g,np.full_like(g,255)]))
        # Nearest-neighbour display magnification reveals the actual alpha pixels.
        bg.alpha_composite(img.crop(box).resize((w,h),Image.Resampling.NEAREST))
        draw.text((x+j*w,y+17),label,fill='#555');page.paste(bg,(x+j*w,y+34))
    contained.append(p['level']);x+=cw;rh=max(rh,ch)
flush()
