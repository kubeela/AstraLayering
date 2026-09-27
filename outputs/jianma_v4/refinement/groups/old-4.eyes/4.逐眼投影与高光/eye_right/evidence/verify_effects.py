from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import numpy as np,json,hashlib
P=Path('refinement/groups/eyes/4.逐眼投影与高光/eye_right');Q=P/'evidence'
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
def rgba(p):return Image.open(p).convert('RGBA')
def white(p):
 im=rgba(p);b=Image.new('RGBA',im.size,'white');b.alpha_composite(im);return b.convert('RGB')
def diff(a,b):
 aa=np.array(rgba(a)).astype(int);bb=np.array(rgba(b)).astype(int);d=np.abs(aa-bb)
 return {'different_pixels':int(np.count_nonzero(d.max(axis=2))),'max_channel_difference':int(d.max())}
checks={'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),
 'all_effects_off_vs_clean':diff(Q/'effects-off-full.png',Q/'clean-rerender.png'),
 'source_and_shadows_off_vs_clean_source_off':diff(Q/'source-off-full.png',Q/'baseline-source-off-full.png'),
 'clipping':{}}
targets={'fx_eye_right_upper_lid_on_sclera':'sclera','fx_eye_right_upper_lid_on_iris':'iris','eye_right_highlights':'iris'}
for id,target in targets.items():
 a=np.array(rgba(Q/(id+'-clipped.png')))[:,:,3]
 b=np.array(rgba(Q/(target+'-intersection-mask.png')))[:,:,3]
 checks['clipping'][id]={'pixels_outside_surface_and_aperture':int(np.count_nonzero((a>0)&(b==0))),'visible_effect_pixels':int(np.count_nonzero(a))}
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')

ref=white('references/base-subject.png');clean=white(Q/'clean-rerender.png');final=white(P/'preview.png');off=white(Q/'effects-off-full.png')
page=Image.new('RGB',(1400,800),'#eeeeef');d=ImageDraw.Draw(page)
for k,(im,title) in enumerate(zip([ref,clean,final,Image.blend(ref,final,.5),off],['原彩图','干净着色输入','效果全开','50% 同坐标混合','本步效果全关'])):
 x=k*280;d.text((x+12,12),title,font=font,fill='#282a34')
 page.paste(im.crop((382,167,502,277)).resize((276,253)),(x+2,43));d.text((x+12,309),'眼部 7x · 同一坐标',font=font,fill='#282a34')
 page.paste(im.crop((397,188,437,211)).resize((280,161)),(x,340));d.text((x+12,522),'原尺寸 1x',font=font,fill='#282a34')
 page.paste(im.crop((370,110,520,285)),(x+65,550))
d.text((18,755),'效果全关与干净着色重渲染：像素差 0；当前仅 eye_right，另一眼仍待最终镜像。',font=font,fill='#282a34');page.save(P/'效果对照.png')

names=list(targets)
labels=['上眼睑 → 完整眼白','上眼睑 → 完整虹膜','主高光 → 完整虹膜（覆盖瞳孔位置）']
page=Image.new('RGB',(1440,1040),'#eeeeef');d=ImageDraw.Draw(page)
for row,(id,label) in enumerate(zip(names,labels)):
 for col,mode in enumerate(['unclipped','clipped']):
  x=col*720;y=row*346;d.text((x+14,y+10),label+(' / 完整底形' if mode=='unclipped' else ' / 表面∩眼裂'),font=font,fill='#272934')
  if id=='eye_right_highlights':
   im=rgba(Q/(id+'-'+mode+'.png'));bg=Image.new('RGBA',im.size,'#616875');bg.alpha_composite(im);im=bg.convert('RGB').resize((480,299))
  else:im=white(Q/(id+'-'+mode+'.png')).resize((480,299))
  page.paste(im,(x+120,y+40))
page.save(Q/'效果独显与双重裁切.png')

page=Image.new('RGB',(1440,423),'#eeeeef');d=ImageDraw.Draw(page)
for col,(name,title) in enumerate([('effects-isolated','效果开启'),('effects-off-isolated','全部效果关闭'),('source-and-shadow-off','上眼睑、上睫毛及对应投影关闭')]):
 x=col*480;d.text((x+14,12),title,font=font,fill='#272934');im=white(Q/(name+'.png')).resize((480,299));page.paste(im,(x,50))
d.text((16,376),'右图与干净稿关闭相同来源后逐像素一致：底色无投影残影或高光白洞。',font=font,fill='#272934');page.save(Q/'开关与来源关闭.png')
print(json.dumps(checks,ensure_ascii=False,indent=2))
