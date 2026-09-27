from pathlib import Path
import xml.etree.ElementTree as E
import subprocess,sys,concurrent.futures,hashlib,json
from PIL import Image,ImageDraw,ImageFont,ImageOps
from clothing_common import ROOT,OUTFIT
svg=ROOT/'3.衣装线稿/line_ornaments/character.svg'
tool=Path(r'D:\Resources\workspace\AstraLayering\workflows\tools\svg_preview.py')
tree=E.parse(svg);root=tree.getroot();tmp=ROOT/'tmp/structure-board';tmp.mkdir(exist_ok=True)
owned=[n.get('id') for n in root if n.get('data-outfit-id')==OUTFIT]
layers={l:[n.get('id') for n in root if n.get('data-outfit-id')==OUTFIT and n.get('data-wear-layer')==l] for l in ['inner_top','shoulder_mantle','outer_coat','sleeves','waist','ornaments']}
jobs=[('default',[],None),('outfit',owned,None),('inner',layers['inner_top'],[330,240,230,385]),('coat',layers['shoulder_mantle']+layers['outer_coat'],None),('sleeves',layers['sleeves'],None),('ornaments',layers['waist']+layers['ornaments'],[350,295,190,1140]),('coat_back',['coat_back','mantle_back'],None),('inner_back',['skirt_inner_back'],None),('blue_back',['skirt_blue_back'],None),('outer_back',['skirt_outer_back'],None)]
def render(job):
 name,ids,crop=job;target=tmp/(name+'.png')
 cmd=[sys.executable,str(tool),str(svg),str(target),'--background','white']
 for i in ids:cmd+=['--only',i]
 if crop:cmd+=['--crop']+list(map(str,crop))
 subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,cwd=ROOT)
 return name,target
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=dict(pool.map(render,jobs))
default=Image.open(results['default']).convert('RGB')
reference=Image.open(ROOT/'inputs/outfit_reference.png').convert('RGB')
assert default.size==reference.size==(941,1672)
blend=Image.blend(reference,default,.5)
cells=[('原衣参考 · 941 × 1672',reference),('默认穿戴 · 累积线稿',default),('同坐标混合 · 50%',blend),('整套衣装独显 · 不含足链',Image.open(results['outfit']).convert('RGB')),('内搭 / 领前后片 · 局部放大',Image.open(results['inner']).convert('RGB')),('肩披与外衣 · 前后完整',Image.open(results['coat']).convert('RGB')),('绣袖与透明垂袖 · 前后完整',Image.open(results['sleeves']).convert('RGB')),('腰带 / 胸饰 / 长坠 · 完整',Image.open(results['ornaments']).convert('RGB')),('外衣后摆与后肩披 · 隐藏结构',Image.open(results['coat_back']).convert('RGB')),('白内裙后片 · 独立实体',Image.open(results['inner_back']).convert('RGB')),('蓝中裙后片 · 独立实体',Image.open(results['blue_back']).convert('RGB')),('白外裙后片 · 独立实体',Image.open(results['outer_back']).convert('RGB'))]
W,H=470,880;head=86;board=Image.new('RGB',(W*4,H*3+head),'#EEF1F5');draw=ImageDraw.Draw(board)
font=ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc',17);big=ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc',27);small=ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc',15)
draw.text((24,13),'衣装完整线稿 · 集中结构对照',font=big,fill='#283244')
draw.text((25,52),'原图决定可见形态；中性填色用于辨形。背面 / 隐藏余量为结构补全，材质与投影留后续上色。',font=small,fill='#586578')
for i,(label,im) in enumerate(cells):
 x=(i%4)*W;y=head+(i//4)*H
 draw.rectangle((x+7,y+7,x+W-7,y+H-7),fill='white',outline='#CDD4DE',width=1)
 draw.text((x+17,y+17),label,font=font,fill='#38465B')
 fit=ImageOps.contain(im,(W-26,H-61),Image.Resampling.LANCZOS)
 board.paste(fit,(x+(W-fit.width)//2,y+47+(H-59-fit.height)//2))
target=ROOT/'3.衣装线稿/结构对照.png';board.save(target)
# Non-ownership and preservation checks for reused ankle jewelry.
base=E.parse(r'D:\Resources\workspace\AstraLayering\outputs\jianma_v4\refinement\groups\clothing\character.svg').getroot()
for sid in ['foot_chain_right','foot_chain_left','foot_chain_right_2','foot_chain_left_2']:
 a=next(n for n in base.iter() if n.get('id')==sid);b=next(n for n in root.iter() if n.get('id')==sid)
 assert E.tostring(a)==E.tostring(b),sid+' changed'
 assert b.get('data-outfit-id') is None
structure=json.loads((ROOT/'1.衣装结构与穿戴分析/结构安排.json').read_text(encoding='utf-8'))
parts={n.get('data-part') for n in root.iter() if n.get('data-outfit-id')==OUTFIT}
expected={n['id'] for n in structure['parts'] if n['action']=='draw'}
assert expected<=parts,sorted(expected-parts)
print(target)
print('All planned draw parts:',len(expected),'all found; foot-chain originals unchanged.')
print('SVG SHA256',hashlib.sha256(svg.read_bytes()).hexdigest())
