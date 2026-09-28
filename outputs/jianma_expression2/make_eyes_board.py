from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import subprocess

ROOT=Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_expression2')
NODE=ROOT/'1.素材与关键形制作'/'1.3.眉眼制作'
KEY=ROOT/'1.素材与关键形制作'/'关键姿态'/'expression_eyes'
REF=ROOT/'1.素材与关键形制作'/'1.2.表情风格参考'/'表情风格参考.png'
PY=Path(r'C:\Users\22129\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe')
TOOL=Path(r'D:\Resources\workspace\AstraLayering\agent-tools\svg_preview.py')
TMP=NODE/'_board_renders'
TMP.mkdir(parents=True,exist_ok=True)

def render(svg,out,crop,scale=5):
    subprocess.run([str(PY),str(TOOL),str(svg),str(out),'--crop',*map(str,crop),'--scale',str(scale)],cwd=ROOT,check=True,capture_output=True)

local_crop=(397,185,94,36)
face_crop=(380,164,130,96)
render(NODE/'character.svg',TMP/'default_local.png',local_crop)
rows=[
    ('ordinary_closed','普通闭眼',(311,162,267,102)),
    ('smiling_closed','闭眼笑',(602,162,267,102)),
    ('half_lidded','半闭眼',(887,162,267,102)),
]
for pose,_,_ in rows:
    render(KEY/pose/'character.svg',TMP/f'{pose}_local.png',local_crop)
    render(KEY/pose/'character.svg',TMP/f'{pose}_face.png',face_crop)

W=1960; H=1120
board=Image.new('RGB',(W,H),'#f3f6fb')
d=ImageDraw.Draw(board)
font_path=r'C:\Windows\Fonts\msyh.ttc'
font=ImageFont.truetype(font_path,29)
small=ImageFont.truetype(font_path,19)
title=ImageFont.truetype(font_path,38)
d.text((35,22),'剑麻 · 眉眼关键形对照',font=title,fill='#344969')
d.text((37,75),'参考板局部 / 默认原眼 / 候选局部：相近眼距与观看尺寸；最右为候选正常面部视图',font=small,fill='#61738d')
headers=['对应风格参考局部','默认局部','候选关键形局部','候选正常面部']
for j,head in enumerate(headers):
    d.text((36+j*475,122),head,font=font,fill='#3a587d')
ref=Image.open(REF).convert('RGB')
def place(im,box):
    x,y,w,h=box
    im=im.resize((w,h),Image.Resampling.LANCZOS)
    board.paste(im,(x,y))
    d.rounded_rectangle((x-2,y-2,x+w+1,y+h+1),radius=5,outline='#a6bdd9',width=2)

default=Image.open(TMP/'default_local.png').convert('RGB')
for i,(pose,label,refcrop) in enumerate(rows):
    y=206+i*288
    d.text((36,y-29),label,font=font,fill='#385273')
    bx=36
    rx,ry,rw,rh=refcrop
    place(ref.crop((rx,ry,rx+rw,ry+rh)),(bx,y,450,172))
    place(default,(bx+475,y,450,172))
    local=Image.open(TMP/f'{pose}_local.png').convert('RGB')
    place(local,(bx+950,y,450,172))
    face=Image.open(TMP/f'{pose}_face.png').convert('RGB')
    place(face,(bx+1425,y-22,450,242))

d.text((36,H-33),'风格参考为本轮依据 SVG 生成的示意板，非另行提供的原画；候选保留原角色发饰、脸型与衣装。',font=small,fill='#6b7890')
board.save(NODE/'关键形对照.png')
print(NODE/'关键形对照.png')
