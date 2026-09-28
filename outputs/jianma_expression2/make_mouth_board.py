from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess

ROOT=Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_expression2')
NODE=ROOT/'1.素材与关键形制作'/'1.4.嘴部制作'
KEYS=ROOT/'1.素材与关键形制作'/'关键姿态'/'expression_mouth'
GUIDE=ROOT/'1.素材与关键形制作'/'1.2.表情风格参考'/'表情风格参考.png'
PY=Path(r'C:\Users\22129\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe')
PREVIEW=Path(r'D:\Resources\workspace\AstraLayering\agent-tools\svg_preview.py')
TMP=NODE/'_board_renders';TMP.mkdir(parents=True,exist_ok=True)

def render(svg,out,crop,scale):
    subprocess.run([str(PY),str(PREVIEW),str(svg),str(out),'--crop',*map(str,crop),'--scale',str(scale)],cwd=ROOT,check=True,capture_output=True)

local=(424,231,40,30); face=(380,165,130,95)
render(NODE/'character.svg',TMP/'default_local.png',local,8)
rows=[
    ('neutral_half_open','中性半张',None),
    ('neutral_open','中性张口',None),
    ('smiling_open','笑口张开',(20,480,275,210)),
    ('sad_open','悲口张开',(310,480,275,210)),
    ('pout','轻微嘟嘴',(605,480,275,210)),
]
for pose,_,_ in rows:
    render(KEYS/pose/'character.svg',TMP/f'{pose}_local.png',local,8)
    render(KEYS/pose/'character.svg',TMP/f'{pose}_face.png',face,5)

W,H=1620,1780
board=Image.new('RGB',(W,H),'#f4f6fb');d=ImageDraw.Draw(board)
fontpath=r'C:\Windows\Fonts\msyh.ttc'
title=ImageFont.truetype(fontpath,35)
heading=ImageFont.truetype(fontpath,24)
body=ImageFont.truetype(fontpath,18)
d.text((30,20),'剑麻 · 嘴部关键形对照',font=title,fill='#395172')
d.text((30,68),'对应风格参考 / 默认软珊瑚唇 / 候选局部：相近观看尺寸；最右为候选正常面部视图',font=body,fill='#657895')
for x,label in [(30,'对应参考局部'),(420,'默认局部'),(810,'候选关键形局部'),(1200,'候选正常面部')]:
    d.text((x,105),label,font=heading,fill='#425f84')

style=Image.open(GUIDE).convert('RGB')
default=Image.open(TMP/'default_local.png').convert('RGB')
def cell(im,x,y,w=340,h=250):
    board.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y))
    d.rounded_rectangle((x-1,y-1,x+w,y+h),radius=4,outline='#a9bdd8',width=2)

for i,(pose,label,crop) in enumerate(rows):
    y=174+i*315
    d.text((30,y-31),label,font=heading,fill='#425a7a')
    if crop is None:
        d.rounded_rectangle((30,y,370,y+250),radius=4,fill='#e8eef6',outline='#a9bdd8',width=2)
        d.text((58,y+79),'无对应中性张口局部',font=body,fill='#576d8e')
        d.text((58,y+111),'按默认唇体与笑/悲张口',font=body,fill='#576d8e')
        d.text((58,y+143),'参考的材质语言设计',font=body,fill='#576d8e')
    else:
        x0,y0,w,h=crop;cell(style.crop((x0,y0,x0+w,y0+h)),30,y)
    cell(default,420,y)
    cell(Image.open(TMP/f'{pose}_local.png').convert('RGB'),810,y)
    cell(Image.open(TMP/f'{pose}_face.png').convert('RGB'),1200,y,360,263)

d.text((30,H-30),'风格板依据输入 SVG 绘制，并非另行提供的原画。嘟嘴为静态替换；本轮未制作外伸吐舌。',font=body,fill='#6d7c94')
board.save(NODE/'关键形对照.png')
print(NODE/'关键形对照.png')
