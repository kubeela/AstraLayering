from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import numpy as np,json
OUT=Path('reviews/refinement/mouth/evidence-v2')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',23);small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def im(n):return Image.open(OUT/(n+'.png')).convert('RGBA')
for name in ['v1','v2','clean','effects-off','internals-off']:
 r=im(name+'-full');r.crop((421,232,468,259)).resize((1128,648),Image.Resampling.LANCZOS).save(OUT/(name+'-native-enlarged.png'))
 r.crop((385,165,507,276)).save(OUT/(name+'-face-1x.png'))
 r.crop((385,165,507,276)).resize((488,444),Image.Resampling.LANCZOS).save(OUT/(name+'-face-4x.png'))
def board(name,items,cols=3,w=475,h=345,note=''):
 rows=(len(items)+cols-1)//cols;canvas=Image.new('RGB',(cols*w+40,rows*h+100),'#f4f4f4');d=ImageDraw.Draw(canvas)
 d.text((20,15),note,fill='#28303b',font=small)
 for i,(n,label) in enumerate(items):
  r=im(n);r.thumbnail((w-24,h-66),Image.Resampling.LANCZOS)
  x=20+(i%cols)*w;y=65+(i//cols)*h
  d.text((x,y),label,fill='#28303b',font=font)
  bg=Image.new('RGBA',r.size,'#fdf4f3');bg.alpha_composite(r);canvas.paste(bg.convert('RGB'),(x,y+40))
 canvas.save(OUT/(name+'.png'))
board('independent-F1-F2-comparison',[
 ('reference-enlarged','原图 · 原尺寸裁图后放大'),('v1-native-enlarged','v1 · 完整画布1×后同算法放大'),('v2-native-enlarged','v2 · 完整画布1×后同算法放大'),
 ('reference-enlarged','原图 · 相同坐标'),('v1-24x','v1 · 直接24×'),('v2-24x','v2 · 直接24×'),
 ('clean-24x','新版4.4 · 干净着色'),('effects-off-24x','v2 · 关闭第5步效果'),('effect-only','v2 · 实际柔影独显'),
 ('reference-face-4x','原图 · 面部4×'),('v1-face-4x','v1 · 面部4×'),('v2-face-4x','v2 · 面部4×')
],note='独立从冻结候选重渲染；嘴部统一裁框 (421,232)–(468,259)，未移动或配准。')
board('normal-size-faces',[(n+'-face-1x',label) for n,label in [('reference','原图 1×'),('v1','v1 1×'),('v2','v2 1×')]],h=190,note='以下三张面部保持原图像素尺寸，未放大。')
def diff(a,b):
 a=np.array(im(a)).astype(int);b=np.array(im(b)).astype(int);d=np.abs(a-b)
 ys,xs=np.nonzero(np.any(d,axis=2))
 return {'changed_pixels':int(len(xs)),'max_channel_delta':int(d.max()),'bbox':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)] if len(xs) else None}
audit=json.loads((OUT/'independent-audit.json').read_text(encoding='utf-8'))
audit['render_checks']={'effects_off_vs_clean_full_1x':diff('effects-off-full','clean-full'),'effects_off_vs_clean_24x':diff('effects-off-24x','clean-24x'),'default_vs_internals_off_1x':diff('v2-full','internals-off-full'),'default_vs_internals_off_24x':diff('v2-24x','internals-off-24x'),'v2_vs_v1_1x':diff('v2-full','v1-full')}
ref=ImageOps.exif_transpose(Image.open('references/base-subject.png')).convert('RGB');a=im('v1-full');b=im('v2-full')
audit['F1_F2_native_probes']=[{'xy':[x,y],'reference':ref.getpixel((x,y)),'v1':a.getpixel((x,y))[:3],'v2':b.getpixel((x,y))[:3]} for x,y in [(440,248),(442,248),(444,248),(445,248),(446,248),(448,248),(444,249),(445,249),(445,250)]]
(OUT/'independent-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'render_checks':audit['render_checks'],'probes':audit['F1_F2_native_probes']},ensure_ascii=False))
