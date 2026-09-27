from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
p=Path('refinement/groups/eyes/3.逐眼着色/eye_right/evidence')
page=Image.new('RGB',(1080,780),'#eeeeef');d=ImageDraw.Draw(page);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
for i,(name,title) in enumerate([('base-isolated','基础色恢复点'),('color-isolated','干净着色 / 高光关闭'),('sclera-complete','完整眼白承载面'),('gaze-complete','完整眼黑承载面 / 无高光白洞')]):
 x=(i%2)*540;y=(i//2)*390;d.text((x+14,y+12),title,font=font,fill='#292933')
 im=Image.open(p/(name+'.png')).convert('RGBA').resize((540,336));bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);page.paste(bg.convert('RGB'),(x,y+46))
page.save(p/'材料自查.png')
im=Image.open(p/'color-isolated.png').convert('RGBA')
colors={}
for name,(x,y) in {'left_white':(410,199.5),'left_blue_edge':(411.65,199.5),'right_blue_edge':(424.7,199.5),'right_white':(426.2,199.5),'lower_blue':(418,203),'disabled_highlight_undercolor':(419,197)}.items():
 colors[name]={'xy':[x,y],'rgba':im.getpixel((round((x-394)*24),round((y-185)*24)))}
(p/'surface-color-check.json').write_text(json.dumps(colors,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(colors,ensure_ascii=False,indent=2))
