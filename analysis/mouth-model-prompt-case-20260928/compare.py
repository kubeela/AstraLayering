from pathlib import Path
import subprocess,json,hashlib
from PIL import Image,ImageDraw,ImageFont,ImageChops
from lxml import etree
R=Path(__file__).parent
PY=r"C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe"
PREVIEW=r"D:/Resources/workspace/AstraLayering/agent-tools/svg_preview.py"
OUT=R/'comparison';OUT.mkdir(exist_ok=True)
ORDER=['b','d','a','c']
FONT=r"C:/Windows/Fonts/msyh.ttc"
f=ImageFont.truetype(FONT,22);sm=ImageFont.truetype(FONT,17)
def render(src,dst,crop,scale):
 subprocess.run([PY,PREVIEW,str(src),str(dst),'--crop',*map(str,crop),'--scale',str(scale)],check=True,capture_output=True)
render(R/'base.svg',OUT/'default_mouth.png',(424,231,40,30),8)
render(R/'base.svg',OUT/'default_face.png',(380,165,130,95),4)
base=etree.parse(str(R/'base.svg'));baseids={e.get('id'):e for e in base.iter() if e.get('id')}
checks={}
for i,arm in enumerate(ORDER,1):
 src=R/arm/'character.svg'
 if not src.exists(): raise RuntimeError(f'Missing final arm {arm}')
 render(src,OUT/f'{i}_mouth.png',(424,231,40,30),8)
 render(src,OUT/f'{i}_face.png',(380,165,130,95),4)
 tree=etree.parse(str(src));ids={e.get('id'):e for e in tree.iter() if e.get('id')}
 changed=[];outside=[]
 for ident,old in baseids.items():
  if ident not in ids:changed.append(ident+' [removed]');continue
  new=ids[ident]
  if dict(old.attrib)!=dict(new.attrib) or (old.text or '').strip()!=(new.text or '').strip():
   changed.append(ident)
   if not any('mouth' in (a.get('id') or '').lower() for a in [old,*old.iterancestors()]):outside.append(ident)
 before=Image.open(OUT/'default_face.png').convert('RGBA');after=Image.open(OUT/f'{i}_face.png').convert('RGBA')
 diff=ImageChops.difference(before,after).convert('RGB');diff.paste((0,0,0),(160,248,352,380))
 checks[str(i)]={'arm':arm,'svg_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'changed_id_count':len(changed),'changed_ids':changed,'changed_outside_mouth_ids':outside,'outside_mouth_face_diff_bbox':diff.getbbox()}
# Uniform scale; original and result images never stretched.
W=940;H=560+4*460
board=Image.new('RGB',(W,H),'#f4f5f7');d=ImageDraw.Draw(board)
d.text((28,20),'单案例盲对照：默认闭嘴 → 中性半张',font=f,fill='#203047')
d.text((28,60),'同一素材、同一工具、同一制作预算；编号不表示优劣',font=sm,fill='#596879')
d.text((28,110),'默认局部（8倍）',font=f,fill='#203047');d.text((380,110),'默认面部（4倍）',font=f,fill='#203047')
board.paste(Image.open(OUT/'default_mouth.png').convert('RGB'),(28,155));board.paste(Image.open(OUT/'default_face.png').convert('RGB'),(380,155))
for i in range(1,5):
 y=560+(i-1)*460
 d.text((28,y),f'候选 {i}',font=f,fill='#203047')
 board.paste(Image.open(OUT/f'{i}_mouth.png').convert('RGB'),(28,y+44));board.paste(Image.open(OUT/f'{i}_face.png').convert('RGB'),(380,y+44))
board.save(OUT/'blind_comparison.png')
(R/'technical_checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(OUT/'blind_comparison.png')
