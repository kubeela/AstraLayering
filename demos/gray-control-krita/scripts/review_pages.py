"""Tile native-size isolated part crops for visual review; never resize artwork."""
import json,sys
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
R=Path(__file__).resolve().parents[1]
rows=json.loads((R/'manifest.json').read_text())['parts']
out=R/'runtime/review-native';out.mkdir(exist_ok=True)
ids=set(map(int,sys.argv[1:])) if sys.argv[1:] else set(range(90))
pages=[];page=Image.new('RGB',(1900,1780),'white');draw=ImageDraw.Draw(page);x=y=rh=0;contained=[]
def flush():
 global page,draw,x,y,rh,contained
 if not contained:return
 path=out/('page-'+'-'.join(f'{n:02}' for n in contained)+'.png');page.crop((0,0,1900,y+rh)).save(path);print(path.name)
 pages.append(dict(file=path.name,levels=contained));page=Image.new('RGB',(1900,1780),'white');draw=ImageDraw.Draw(page);x=y=rh=0;contained=[]
for p in rows:
 if p['level'] not in ids:continue
 f=R/'parts'/p['id']
 if not (f/'full.png').exists():continue
 b=Image.open(f/'shape.png').getbbox();b=(max(0,b[0]-4),max(0,b[1]-4),min(1024,b[2]+4),min(1536,b[3]+4));w,h=b[2]-b[0],b[3]-b[1];cw=max(360,w*3+16);ch=h+46
 if x+cw>1900:x=0;y+=rh;rh=0
 if y+ch>1780:flush()
 draw.text((x+3,y+2),f"{p['level']:02} {p['id']}",fill='black')
 draw.text((x+3,y+17),f"({b[0]},{b[1]})  control | model | current   1:1",fill='black')
 for i,name in enumerate(['control.png','model.png','full.png']):
  im=Image.open(f/name).convert('RGBA').crop(b);yy,xx=np.indices((h,w));g=np.where((xx//8+yy//8)%2,212,232).astype('uint8');back=Image.fromarray(np.dstack([g,g,g,np.full_like(g,255)]));back.alpha_composite(im);page.paste(back,(x+i*w,y+36))
 contained.append(p['level']);x+=cw;rh=max(rh,ch)
flush();(out/'index.json').write_text(json.dumps(pages,indent=2))
