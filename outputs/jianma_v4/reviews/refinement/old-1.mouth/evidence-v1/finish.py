from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import numpy as np,json
OUT=Path('reviews/refinement/mouth/evidence-v1')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
def read(n):return Image.open(OUT/(n+'.png')).convert('RGBA')
def board(name,items,cols=2,w=650,notes=''):
 rows=(len(items)+cols-1)//cols
 height=440
 canvas=Image.new('RGB',(cols*w+40,rows*height+100),'#f4f4f4');d=ImageDraw.Draw(canvas)
 d.text((20,15),notes,fill='#252b35',font=small)
 for i,(n,title) in enumerate(items):
  im=read(n);im.thumbnail((w-28,height-70),Image.Resampling.LANCZOS)
  x=20+(i%cols)*w;y=65+(i//cols)*height
  d.text((x,y),title,fill='#252b35',font=font)
  bg=Image.new('RGBA',im.size,'#fdf4f3');bg.alpha_composite(im)
  canvas.paste(bg.convert('RGB'),(x,y+40))
 canvas.save(OUT/(name+'.png'))
for k in ['candidate','lineart','clean']:
 read(k+'-native').resize((1128,648),Image.Resampling.LANCZOS).save(OUT/(k+'-native-enlarged.png'))
board('independent-comparison',[
 ('reference-closeup','原图 · 同坐标放大'),('candidate-closeup','候选 · 冻结 SVG 直接 24×'),
 ('lineart-closeup','已审线稿 · 同坐标 24×'),('effects-off','候选关闭第5步效果 · 24×'),
 ('reference-closeup','原图 · 47×27 原像素后放大'),('candidate-native-enlarged','候选 · 47×27 渲染后同算法放大')
],notes='裁框 (421,232)–(468,259)，没有对候选移动或配准。下两格排除矢量/位图采样率差异。')
board('independent-effect-diagnostic',[
 ('reference-closeup','原图'),('candidate-closeup','候选默认：下唇边缘出现浅亮分界'),
 ('effects-off','关闭第5步：分离感明显减弱'),('diagnostic-effect-exclusion-removed','诊断副本：仅移除效果的唇面排除遮罩')
],notes='诊断只用于定位遮罩交界问题，不是建议交付版本；正式候选未改动。')
board('independent-structure',[
 ('complete-interior','解除默认口裂：完整内部组合'),('complete-inside','完整口腔'),
 ('complete-teeth','完整上牙'),('complete-tongue','完整舌头'),
 ('upper-lip-only','上唇材质独显'),('lower-lip-only','下唇材质独显'),
 ('effect-only','实际柔影独显'),('mouth-hidden-context','关闭 mouth：没有残留嘴部烙印')
],notes='从候选生成静态独显；仅切换显隐或裁切，未变形。')
def diff(a,b):
 a=np.array(read(a)).astype(int);b=np.array(read(b)).astype(int)
 dif=np.abs(a-b)
 return {'changed_pixels':int(np.any(dif,axis=2).sum()),'max_channel_delta':int(dif.max())}
ref=ImageOps.exif_transpose(Image.open('references/base-subject.png')).convert('RGB')
cand=read('candidate-native').convert('RGB')
probes=[]
for y in range(247,253):
 for x in [441,444,445,448]:probes.append({'xy':[x,y],'reference':ref.getpixel((x,y)),'candidate':cand.getpixel((x-421,y-232))})
audit=json.loads((OUT/'independent-audit.json').read_text(encoding='utf-8'))
audit['render_comparisons']={'effects_off_vs_clean_24x':diff('effects-off','clean-closeup'),'default_vs_internals_hidden_24x':diff('candidate-closeup','internals-hidden')}
audit['lower_edge_native_pixel_probes']=probes
audit['complete_shapes']={}
for name in ['complete-inside','complete-teeth','complete-tongue']:
 a=np.array(read(name))[:,:,3]
 ys,xs=np.nonzero(a)
 audit['complete_shapes'][name]={'alpha_equivalent_area_canvas_pixels':float(a.sum()/255/24**2),'fully_opaque_pixels':int((a==255).sum()),'bbox_canvas':[float(xs.min()/24+421),float(ys.min()/24+232),float((xs.max()+1)/24+421),float((ys.max()+1)/24+232)]}
(OUT/'independent-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'comparisons':audit['render_comparisons'],'probes':probes},ensure_ascii=False))
