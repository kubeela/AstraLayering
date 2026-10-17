"""Render read-only reference/native-isolated/native-lower-stack comparisons."""
from PIL import Image,ImageDraw
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1];D=R/'review-final';D.mkdir(exist_ok=True)
rows=json.load(open(R/'manifest.json'))['parts'];spec=json.load(open(R/'final-review-spec.json'))
ref=Image.open(R.parent/'gray-control-krita/reference.png').convert('RGBA');index=[]
for item in spec:
 level=item['level'];pid=rows[level]['id'];iso=Image.open(R/'runtime/native-isolated'/f'{level:02}.png').convert('RGBA')
 below=Image.open(R/'runtime/native-below'/f'{level:02}.png').convert('RGBA');bb=iso.getbbox()
 box=item['box'] or [max(0,bb[0]-4),max(0,bb[1]-4),min(1024,bb[2]+4),min(1536,bb[3]+4)]
 scale=item['scale'];w=(box[2]-box[0])*scale;h=(box[3]-box[1])*scale
 page=Image.new('RGB',(max(w*3,360),h+42),'white');dr=ImageDraw.Draw(page)
 dr.text((4,2),f'{level:02} {pid} {box} {scale*100}%',fill='black')
 for j,im in enumerate([ref,iso,below]):
  bg=Image.new('RGBA',(w,h),(230,230,230,255));b=ImageDraw.Draw(bg)
  for y in range(0,h,24):
   for x in range(0,w,24):
    if (x//24+y//24)%2:b.rectangle((x,y,x+23,y+23),fill=(210,210,210,255))
  bg.alpha_composite(im.crop(box).resize((w,h),Image.Resampling.NEAREST));page.paste(bg,(w*j,40))
  dr.text((w*j+3,22),['reference','Krita isolated','Krita higher layers hidden'][j],fill='black')
 suffix=sum(x['level']==level for x in index);name=f'{level:02}-{suffix}.png';page.save(D/name)
 index.append(dict(level=level,id=pid,file=name,box=box,scale=scale))
(D/'index.json').write_text(json.dumps(index,indent=2,ensure_ascii=False)+'\n')
print('Saved',len(index),'review panels for',len(set(i['level'] for i in index)),'layers')
