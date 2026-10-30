# Usage: python build_boards.py <rendered pieces dir> <output dir>
# Compose depth/turn hair reference boards from rendered Live2D pieces.
import sys, json, numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
P=Path(sys.argv[1]); OUT=Path(sys.argv[2]); OUT.mkdir(parents=True,exist_ok=True)
FONT='/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc'
def font(s): return ImageFont.truetype(FONT,s,index=2)  # SC face
BOARDS=[
 {'file':'04-侧发与后发按脸前后深度区分-Hiyori-Mao.png','title':'侧发与后发按脸前后深度区分',
  'name':'Hiyori / Mao · Live2D 官方样例逐部件独显 · 半透明灰为脸，保持真实前后层序',
  'heads':[('hiyori',),('mao',)],
  'use':['按发面压在脸前还是在脸轮廓之后归类，不按正面露出的宽窄。',
         'Mao 横髪是覆盖额角至脸侧的脸前宽发面；Hiyori 横髪只是脸前两缕细发，对应鬓发。',
         '脸轮廓之后的脸框长发属后发；发面完整画到脸后（半透明脸下可见），转头才有内容露出。'],
  'cards':[('hiyori','front','Hiyori 前髪','脸前 · 额前发面'),
           ('hiyori','side','Hiyori 横髪','脸前细缕 · 相当于鬓发 sidelock'),
           ('hiyori','back','Hiyori 後ろ髪','脸后 · 脸框长发、侧扎发与呆毛同属'),
           ('mao','front','Mao 前髪','脸前 · 额前发面'),
           ('mao','side','Mao 横髪','脸前宽发面 · 覆盖额角至脸侧 = side_hair'),
           ('mao','back','Mao 後ろ髪','脸后 · 外壳 + 内侧面')],
  'limit':'Hiyori 的呆毛画在後ろ髪内；本项目需单独摆动时列为 ahoge。'},
 {'file':'05-前发覆盖额角-后发外壳与呆毛-Ren-Haru-Tsumiki.png','title':'前发覆盖额角、后发外壳与呆毛',
  'name':'Ren / Haru / Tsumiki · Live2D 官方样例逐部件独显 · 半透明灰为脸，保持真实前后层序',
  'heads':[('ren',),('haru',),('tsumiki',)],
  'use':['Ren 前髪从额前盖过太阳穴到耳前，是一整片脸前发面，随脸透视。',
         '后发是脸后外壳加内侧深色面，几乎不动；与侧发相接处带延续发流的发片。',
         '头顶独立翘起的呆毛单列（Tsumiki あほ毛）；脸前细缕可单列鬓发（Haru 横髪）。'],
  'cards':[('ren','front','Ren 前髪','脸前 · 刘海与额角侧发合为一面'),
           ('ren','back','Ren 後ろ髪','脸后 · 脸框长发与内侧深色面'),
           ('haru','side','Haru 横髪','脸前细缕 · 鬓发'),
           ('haru','back','Haru 後ろ髪','脸后外壳 · 双马尾同属，几乎不动'),
           ('tsumiki','aho','Tsumiki あほ毛','头顶独立小件 · ahoge'),
           ('tsumiki','back','Tsumiki 後ろ髪','脸后外壳 · 内侧深色面无后视发丝')],
  'limit':'各样例的分组服务于其自身控制需求；当前角色按其结构与控制需要取舍，不照搬部件数量。'},
]
def see_through(d,k,a):
    # Face silhouette at half opacity: hair painted behind the face stays visible.
    c=np.array(Image.open(d/f'{k}_{a}.png')).astype(np.float32)
    p=np.array(Image.open(d/f'{k}_solo_{a}.png')).astype(np.float32)
    face=(np.abs(c[...,:3]-[226,230,238]).sum(2)<6)|(np.abs(c[...,:3]-[150,160,176]).sum(2)<6)
    pa=p[...,3:4]/255; under=p[...,:3]*pa+c[...,:3]*(1-pa)  # premultiplied solo over face
    o=c.copy(); o[...,:3]=np.where(face[...,None],c[...,:3]*0.5+under*0.5,c[...,:3])
    return Image.fromarray(o.clip(0,255).astype(np.uint8))
def alpha(im): return np.array(im)[...,3]>8
def bbox(masks,m=24):
    u=np.zeros_like(masks[0])
    for a in masks: u|=a
    ys,xs=np.where(u); return (xs.min()-m,ys.min()-m,xs.max()+m,ys.max()+m)
manifest=[]
for b in BOARDS:
    width,header,cw,ch,footer=1560,305,520,540,120
    board=Image.new('RGB',(width,header+2*ch+footer),'#f7f9fc'); d=ImageDraw.Draw(board)
    d.text((30,20),b['title'],font=font(36),fill='#183453')
    d.text((32,77),b['name'],font=font(19),fill='#546a85')
    for i,t in enumerate(b['use']): d.text((34,126+i*40),'• '+t,font=font(19),fill='#2a405b')
    # Per-model crop shared by all of that model's cards and both angles.
    crops={}; models=sorted({c[0] for c in b['cards']})
    for m in models:
        ims=[Image.open(P/m/f'{k}_{a}.png') for (mm,k,_,_) in b['cards'] if mm==m for a in (0,30)]
        crops[m]=bbox([alpha(i) for i in ims])
    # Head thumbnails: 0° and 30° full renders, top right.
    x0=width-20
    for (m,) in reversed(b['heads']):
        l,t,r,bt=crops[m]; s=min(1.0,0)
        for a in (30,0):
            im=Image.open(P/m/f'full_{a}.png').crop((l,t,r,bt)); im.thumbnail((92,150))
            x0-=im.width+6; tile=Image.new('RGBA',im.size,'#e8edf4'); tile.alpha_composite(im); board.paste(tile.convert('RGB'),(x0,24))
        x0-=10
    d.text((width-200,180),'整头 0° / 30° 仅作定位',font=font(15),fill='#667991')
    # One scale per character, shared by its cards and both angles.
    imgW=(cw-60)//2; imgH=ch-150
    scales={m:min(imgW/(r-l),imgH/(bt-t)) for m,(l,t,r,bt) in crops.items()}
    for i,(m,k,label,note) in enumerate(b['cards']):
        x,y=(i%3)*cw,header+(i//3)*ch
        d.rounded_rectangle((x+12,y+8,x+cw-12,y+ch-8),radius=12,fill='#e9eef5')
        d.text((x+28,y+18),f'{i+1:02}  {label}',font=font(23),fill='#1f3b59')
        l,t,r,bt=crops[m]
        for j,a in enumerate((0,30)):
            im=see_through(P/m,k,a).crop(crops[m]); factor=scales[m]
            im=im.resize((round(im.width*factor),round(im.height*factor)),Image.Resampling.LANCZOS)
            tile=Image.new('RGBA',(imgW,imgH),'#c5d1df'); tile.alpha_composite(im,((imgW-im.width)//2,(imgH-im.height)//2))
            tx=x+24+j*(imgW+12); board.paste(tile.convert('RGB'),(tx,y+62))
            d.text((tx+8,y+66),f'{a}°',font=font(17),fill='#30475f')
        d.text((x+28,y+ch-80),note,font=font(18),fill='#2a405b')
        d.text((x+28,y+ch-44),'左 0° · 右 ParamAngleX 30°；同一角色同一缩放',font=font(14),fill='#637890')
    d.text((28,header+2*ch+18),'适用边界：'+b['limit'],font=font(17),fill='#4d627b')
    d.text((28,header+2*ch+54),'官方样例的部件名只说明其自身分组；本项目名称与是否分开，仍按当前角色结构和控制需要决定。',font=font(17),fill='#4d627b')
    board.save(OUT/b['file']); print(b['file'])
    manifest.append({'file':b['file'],'title':b['title'],'use':b['use'],'limit':b['limit'],'scale':scales,
      'cards':[{'model':m,'piece':k,'label':l,'note':n} for m,k,l,n in b['cards']],
      'sources':{m:json.load(open(P/m/'source.json')) for m in models}})
json.dump(manifest,open(OUT/'boards.json','w'),ensure_ascii=False,indent=2)
