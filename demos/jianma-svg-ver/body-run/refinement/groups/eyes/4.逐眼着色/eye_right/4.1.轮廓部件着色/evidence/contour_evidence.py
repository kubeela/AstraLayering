from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
P=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.1.轮廓部件着色');Q=P/'evidence'
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def rgba(p):return Image.open(p).convert('RGBA')
def flatten(im,color='white'):
 b=Image.new('RGBA',im.size,color);b.alpha_composite(im);return b.convert('RGB')
ref=flatten(rgba('references/base-subject.png'));line=flatten(rgba(Q/'approved-rerender.png'));candidate=flatten(rgba(P/'preview.png'))
page=Image.new('RGB',(1440,920),'#eeeeef');d=ImageDraw.Draw(page)
for col,(im,label) in enumerate([(ref,'原彩图'),(line,'已审线稿'),(candidate,'4.1 轮廓部件着色'),(Image.blend(ref,candidate,.5),'50% 同坐标混合')]):
 x=col*360;d.text((x+12,12),label,font=font,fill='#292a34')
 page.paste(im.crop((382,167,502,277)).resize((360,330)),(x,44))
 d.text((x+12,387),'眼部 9x · 同一原画布坐标',font=font,fill='#292a34')
 page.paste(im.crop((397,188,437,211)).resize((360,207)),(x,419))
 d.text((x+12,639),'原尺寸 1x',font=font,fill='#292a34');page.paste(im.crop((388,175,440,214)),(x+154,673))
d.text((18,744),'本步仅着色上眼睑、下眼睑与完整眼白。中性虹膜、瞳孔、睫毛及眼皮继续留给后续任务。',font=font,fill='#292a34')
d.text((18,785),'高光隐藏，底面连续；眼裂、虹膜、眼角及下缘转折均保持已审几何，不独立移动或缩放局部。',font=font,fill='#292a34')
d.text((18,826),'灰色睫毛与新眼睑的暂时色差将在4.3接续；这不是新增毛束或修改几何。',font=font,fill='#292a34')
page.save(P/'对照.png')

page=Image.new('RGB',(1080,792),'#eeeeef');d=ImageDraw.Draw(page)
items=[('isolated-eye','当前眼部 / 仅三类轮廓已着色','white'),('complete-sclera','完整眼白 / 隐藏面补满，无虹膜洞','#d6d8df'),('upper-lid','上眼睑 / 外暖、中冷黑、内端暖色','white'),('lower-lid','下眼睑 / 下缘转折保持，颜色渐淡','white')]
for k,(name,title,bg) in enumerate(items):
 x=k%2*540;y=k//2*396;d.text((x+13,y+12),title,font=font,fill='#292a34')
 im=flatten(rgba(Q/(name+'.png')),bg).resize((540,336));page.paste(im,(x,y+46))
page.save(Q/'轮廓独显自查.png')

im=rgba(Q/'complete-sclera.png');eye=rgba(Q/'isolated-eye.png')
checks={'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'full_sclera_surface_samples':{}}
for name,(x,y) in {'visible_outer':(410,200),'hidden_under_upper_lid':(416,193),'behind_iris':(418,199),'visible_inner':(427,201)}.items():
 checks['full_sclera_surface_samples'][name]={'xy':[x,y],'rgba':im.getpixel((round((x-394)*24),round((y-185)*24)))}
checks['hidden_highlight_underlying_pupil']={'xy':[419,197],'rgba':eye.getpixel((round((419-394)*24),round((197-185)*24)))}
(Q/'surface-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(checks,ensure_ascii=False,indent=2))
