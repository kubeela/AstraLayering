"""Build local, traceable hair reference boards from three existing atlases."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import hashlib
import json
import html
import math

ROOT=Path(__file__).resolve().parents[3]
ASSETS=ROOT/'tutorial/live2d-guidance/model-originals'
OUT=ROOT/'tutorial/live2d-guidance/local-assets/hair-reference-templates'
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'pieces').mkdir(exist_ok=True)
FONT='C:/Windows/Fonts/msyh.ttc'
def font(size): return ImageFont.truetype(FONT,size)
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def find(model,filename):
    files=list((ASSETS/model).rglob(filename))
    assert len(files)==1,(model,filename,files)
    return files[0]

models=[
 {'id':'milly','title':'发区组织与前侧发拆分','name':'Milly',
  'filename':'01-发区组织与前侧发拆分-Milly.png',
  'atlas':find('milly','texture_00.png'),'portrait':ASSETS/'milly/Milly原画.png',
  'portraitCrop':(1000,250,2200,1450),
  'use':['观察完整后发底形、后侧发、侧发与前侧发的大束区别。',
         '理解前侧发不等于耳前一小段细发；额前刘海另有完整发片。',
         '名称由同一角色的 PSD 独显辅助核对，不照搬其节点数量。'],
  'limit':'发区名称参考 Milly 自身 PSD；当前角色是否分开，仍取决于结构与独立控制需求。',
  'description':'发区组织与前侧发拆分：Milly 同时保留完整后发底形、后侧发、侧发大束、前侧发主束和刘海发片；用于理解完整发区与大束的区别，不照搬命名数量或树深。',
  'pieces':[
    ('完整后发底形',(628,15,838,293)),
    ('后侧发整体片',(17,428,281,705)),
    ('侧发大束',(1033,15,1183,278)),
    ('前侧发主束',(756,832,899,1095)),
    ('额前刘海 · 中束',(1375,210,1477,373)),
    ('额前刘海 · 侧束',(1117,730,1240,894)),
  ]},
 {'id':'lier','title':'长发主束与细束的粒度对照','name':'莉尔',
  'filename':'02-长发主束与细束的粒度对照-莉尔.png',
  'atlas':find('lier','texture_00.png'),'portrait':ASSETS/'lier/icon.png',
  'use':['观察完整长发片、较细长束和细小发丝之间的粒度差别。',
         '分离的是完整图集发片，不能只截取角色当前露出的一小段。',
         '细束可以存在，但不因此用它替代整个侧发或强制独立控制。'],
  'limit':'只有 PNG 图集可核对形体；这里不据此确定前后发归属、原 PSD 分组或真实运动关系。',
  'description':'长发主束与细束的粒度对照：莉尔的 PNG 图集中同时存在完整长发片与较细发片；用于比较主束和细节颗粒度，避免用小碎发代表整个侧发。图集不能证明原 PSD 层级或运动职责。',
  'pieces':[
    ('完整长发片 A',(976,8,1100,430)),
    ('完整长发片 B',(1340,8,1415,430)),
    ('较细长发片',(1408,8,1488,365)),
    ('横置完整长片',(0,906,425,1030)),
    ('细小弧形发片',(1230,210,1336,380)),
    ('细长弯曲发片',(0,1020,418,1190)),
  ]},
 {'id':'cherry-cake-angel','title':'长卷发整束与多尖发面','name':'樱桃蛋糕天使',
  'filename':'03-长卷发整束与多尖发面-樱桃蛋糕天使.png',
  'atlas':find('cherry-cake-angel','texture_00.png'),
  'atlas1':find('cherry-cake-angel','texture_01.png'),
  'portrait':ASSETS/'cherry-cake-angel/icon.png',
  'use':['观察长卷发片由端部到端部的连续形体，不按弯曲次数截成小节。',
         '多条内部纹理、多个卷尖或分叉可以保留在同一个完整发面中。',
         '是否继续拆为 group，仍看内部独立控制需求，不按尖端数量决定。'],
  'limit':'仅确认图集内的连续发片；独立的纹理岛不自动等于独立运动实体，也不代表原树深。',
  'description':'长卷发整束与多尖发面：樱桃蛋糕天使的 PNG 展示连续长卷发、带多条纹理及多个尖端的完整发面。用于避免按长度、弯折或发梢数量机械细分；不能由图集推断真实绑定和层序。',
  'pieces':[
    ('连续长卷发 A',(8,4,142,520),'atlas1'),
    ('连续长卷发 B',(142,3,260,590),'atlas1'),
    ('连续长卷发 C',(262,4,371,620),'atlas1'),
    ('宽发面与多尖末端',(905,6,1130,644)),
    ('横置多尖发面',(3,941,635,1117)),
    ('纹理丰富的完整长束',(1149,399,1308,1035)),
  ]},
]

def fit(image,size,bg='#d3dce8'):
    tile=Image.new('RGBA',size,bg)
    image=image.copy(); image.thumbnail(size,Image.Resampling.LANCZOS)
    tile.alpha_composite(image,((size[0]-image.width)//2,(size[1]-image.height)//2))
    return tile.convert('RGB')

def check_crop_boundary(atlas,crop):
    """Reject a rectangle that cuts through an opaque source component."""
    l,t,r,b=crop; w,h=atlas.size; alpha=atlas.getchannel('A')
    pairs=[]
    if l>0:pairs.append(((l,t,l+1,b),(l-1,t,l,b)))
    if r<w:pairs.append(((r-1,t,r,b),(r,t,r+1,b)))
    if t>0:pairs.append(((l,t,r,t+1),(l,t-1,r,t)))
    if b<h:pairs.append(((l,b-1,r,b),(l,b,r,b+1)))
    for inside,outside in pairs:
        a=alpha.crop(inside).point(lambda value:255 if value>=64 else 0)
        z=alpha.crop(outside).point(lambda value:255 if value>=64 else 0)
        assert ImageChops.multiply(a,z).getbbox() is None,('Selection truncates source pixels',crop,inside)

manifest={'purpose':'头发拆分图片先验；由已有三个人物模型贴图提取，只用于本地参考',
 'coordinates':'crop1600 是原图等比缩到 1600×1600 时的选区，sourceCrop 是原始像素坐标；不旋转发片',
 'priority':'当前角色原图与实际控制需求优先。示例不规定发区数量、树深、group/part 或绘制顺序。',
 'sourcePolicy':'模型原件与派生像素留在已忽略的 local-assets 内；不改变生产 SVG 或提示词。',
 'templates':[]}

for m in models:
    source_paths={key:m[key] for key in ['atlas','atlas1','portrait'] if key in m}
    sources={key:{'path':str(path),'sha256':sha(path)} for key,path in source_paths.items()}
    atlases={key:Image.open(path).convert('RGBA') for key,path in source_paths.items() if key.startswith('atlas')}
    pieces=[]
    for i,item in enumerate(m['pieces']):
        title,roi=item[:2];key=item[2] if len(item)>2 else 'atlas'
        atlas=atlases[key]
        crop=tuple(round(v*atlas.width/1600) for v in roi)
        check_crop_boundary(atlas,crop)
        im=atlas.crop(crop)
        alpha=im.getchannel('A').getbbox()
        assert alpha,(m['id'],title)
        im=im.crop(alpha)
        exact=(crop[0]+alpha[0],crop[1]+alpha[1],crop[0]+alpha[2],crop[1]+alpha[3])
        path=OUT/'pieces'/f'{m["id"]}-{i+1:02}.png'
        im.save(path)
        pieces.append({'title':title,'image':im,'path':path.relative_to(OUT).as_posix(),'sourceKey':key,
                       'crop1600':list(roi),'sourceCrop':list(exact),'size':list(im.size),
                       'sourceBoundaryCheck':'no crossing at alpha >= 64','sha256':sha(path)})
    width,header,cw,ch,footer=1560,305,520,540,120
    board=Image.new('RGB',(width,header+2*ch+footer),'#f7f9fc')
    draw=ImageDraw.Draw(board)
    draw.text((30,20),m['title'],font=font(36),fill='#183453')
    draw.text((32,77),m['name']+' · 原贴图发片提取 · 格内保持完整形状',font=font(21),fill='#546a85')
    for i,text in enumerate(m['use']):draw.text((34,126+i*40),'• '+text,font=font(20),fill='#2a405b')
    portrait=Image.open(m['portrait']).convert('RGBA')
    if 'portraitCrop' in m:portrait=portrait.crop(m['portraitCrop'])
    board.paste(fit(portrait,(230,230),'#e8edf4'),(1298,14))
    draw.text((1300,252),'角色外观仅作定位',font=font(16),fill='#667991')
    # Every piece within one board uses one common scale; a thin strand remains
    # visibly thin rather than being enlarged to the same apparent width.
    factor=min((cw-52)/max(p['image'].width for p in pieces),(ch-110)/max(p['image'].height for p in pieces))
    for i,p in enumerate(pieces):
        x,y=(i%3)*cw,header+(i//3)*ch
        draw.rounded_rectangle((x+12,y+8,x+cw-12,y+ch-8),radius=12,fill='#e9eef5')
        draw.text((x+28,y+20),f'{i+1:02}  {p["title"]}',font=font(23),fill='#1f3b59')
        tile=Image.new('RGBA',(cw-48,ch-104),'#c5d1df')
        im=p['image'].resize((max(1,round(p['image'].width*factor)),max(1,round(p['image'].height*factor))),Image.Resampling.LANCZOS)
        tile.alpha_composite(im,((tile.width-im.width)//2,(tile.height-im.height)//2))
        board.paste(tile.convert('RGB'),(x+24,y+65))
        draw.text((x+28,y+ch-31),'同板各片同一缩放比例；方向沿用图集',font=font(15),fill='#637890')
    draw.text((28,header+2*ch+18),'适用边界：'+m['limit'],font=font(17),fill='#4d627b')
    draw.text((28,header+2*ch+54),'图集排布不代表角色原位置或遮挡顺序；不以发片数量作为拆分目标。',font=font(17),fill='#4d627b')
    board.save(OUT/m['filename'])
    entry={k:m[k] for k in ['id','title','name','filename','use','limit','description']}
    entry['sources']=sources
    entry['pieces']=[{k:v for k,v in p.items() if k!='image'} for p in pieces]
    entry['sameScaleWithinBoard']=factor
    for key,p in source_paths.items():assert sha(p)==sources[key]['sha256']
    manifest['templates'].append(entry)
    print(m['filename'])

(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
# Ready-to-use entries, without activating any unsupported/current workflow hook.
reference_list=[{'path':m['filename'],'description':m['description']} for m in models]
(OUT/'reference-images.json').write_text(json.dumps(reference_list,ensure_ascii=False,indent=2),encoding='utf8')

esc=html.escape
page='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>头发拆分参考板 · 三套实际模型</title><style>body{max-width:1500px;margin:30px auto;padding:0 22px;background:#f1f4f8;color:#20374f;font:16px/1.7 system-ui}section{background:white;padding:22px;margin:26px 0;border:1px solid #dce4ee;border-radius:14px}img.board{width:100%;height:auto}a{color:#176eaa}li{margin:6px 0}code{font-size:13px}summary{cursor:pointer}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.piece{width:100%;height:300px;object-fit:contain;background:#c5d1df}figure{margin:0}figcaption{font-size:13px;color:#5c718a}@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}}</style></head><body><h1>头发拆分参考板</h1><p>从现有 Milly、莉尔、樱桃蛋糕天使三套模型贴图提取。名称直接说明每套参考的用途。原图不改变；同一板内发片使用相同比例，图集方向保留。</p><p><strong>当前角色原图与控制需求优先。</strong>示例不规定发区数量、树深、group / part 或绘制顺序；图集中的独立发片不自动等于独立运动实体。</p>'''
for m in manifest['templates']:
    page+=f'<section><h2>{esc(m["title"])} · {esc(m["name"])}</h2><ul>'+''.join(f'<li>{esc(x)}</li>' for x in m['use'])+'</ul>'
    page+=f'<p><a href="{esc(m["filename"])}">打开完整参考板</a></p><img class="board" src="{esc(m["filename"])}"><p>{esc(m["limit"])}</p><details><summary>查看原尺寸裁片与来源坐标</summary><div class="grid">'
    for p in m['pieces']:
        page+=f'<figure><a href="{p["path"]}"><img loading="lazy" class="piece" src="{p["path"]}"></a><figcaption>{esc(p["title"])}<br>{esc(str(p["sourceCrop"]))}</figcaption></figure>'
    page+='</div></details></section>'
page+='<p><a href="manifest.json">来源、原图哈希与全部裁片坐标</a> · <a href="reference-images.json">参考图片清单与用途说明</a></p></body></html>'
(OUT/'index.html').write_text(page,encoding='utf8')
print(json.dumps({'out':str(OUT),'templates':len(models),'pieces':sum(len(m['pieces']) for m in models),'sourceFilesUnchanged':True},ensure_ascii=False))
