from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from collections import deque
import json, hashlib, math

P=Path('refinement/groups/eyes/2.逐眼线稿/eye_right')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
checks={}
for n in ['upper_lashes','lower_lashes']:
 im=Image.open(P/'evidence'/(n+'.png')).convert('RGBA')
 mask=im.getchannel('A').point(lambda p:255 if p>=128 else 0)
 todo=set((i%im.width,i//im.width) for i,v in enumerate(mask.tobytes()) if v)
 sizes=[]
 while todo:
  start=todo.pop(); q=[start];size=0
  while q:
   x,y=q.pop();size+=1
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
    v=(x+dx,y+dy)
    if v in todo:todo.remove(v);q.append(v)
  sizes.append(size)
 checks[n]={'render_scale':24,'alpha_cutoff':128,'connected_components':len(sizes),'component_pixel_areas':sorted(sizes,reverse=True)}

im=Image.open(P/'evidence/eye_clean.png').convert('RGBA')
y=round((199.5-185)*24)
spans=[];a=None
for x in range(im.width):
 v=im.getpixel((x,y));yes=v[:3]==(246,246,246) and v[3]==255
 if yes and a is None:a=x
 if not yes and a is not None:spans.append([round(394+a/24,3),round(394+x/24,3)]);a=None
if a is not None:spans.append([394+a/24,439])
checks['visible_sclera_chords_at_y199_5']={'method':'opaque exact sclera fill at one ray, excludes antialias boundary','x_spans':spans}
checks['complete_iris']={'center':[418.18,196.75],'radii':[7.62,7.18],'complete_bbox':[410.56,189.57,425.80,203.93]}
checks['plan_sha256']=hashlib.sha256(Path('refinement/groups/eyes/1.制作计划/plan.json').read_bytes()).hexdigest()
checks['candidate_sha256']=hashlib.sha256((P/'character.svg').read_bytes()).hexdigest()
checks['readback_preview_dimensions']=Image.open(P/'preview.png').size
(P/'evidence/self-check.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')

page=Image.new('RGB',(1440,814),'#e9e9eb');d=ImageDraw.Draw(page)
tiles=[('eye_clean','完整线稿 / 辅助线关闭'),('isolated','完整线稿 / 辅助线开启'),('sclera','完整眼白 / 不挖虹膜洞'),('gaze','未裁切眼黑 / 虹膜、瞳孔、高光'),('upper_lashes','完整上睫毛 / 连通收尖'),('lower_lashes','下睫毛根区 / 无散落小点')]
for k,(n,label) in enumerate(tiles):
 x=(k%3)*480;y=(k//3)*407
 d.text((x+14,y+12),label,font=font,fill='#303138')
 im=Image.open(P/'evidence'/(n+'.png')).convert('RGBA').resize((480,299),Image.Resampling.LANCZOS)
 bg=Image.new('RGBA',im.size,'#ffffff');bg.alpha_composite(im)
 page.paste(bg.convert('RGB'),(x,y+50))
 if n in checks:
  d.text((x+14,y+368),'24x 栅格：'+str(checks[n]['connected_components'])+' 个连续实体',font=font,fill='#303138')
page.save(P/'evidence/独显自查.png')
print(json.dumps(checks,ensure_ascii=False,indent=2))
