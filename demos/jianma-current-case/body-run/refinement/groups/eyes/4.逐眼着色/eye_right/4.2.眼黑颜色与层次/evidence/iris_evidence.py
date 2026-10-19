from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,numpy as np
P=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.2.眼黑颜色与层次');Q=P/'evidence';font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
def rgba(p):return Image.open(p).convert('RGBA')
def white(p,color='white'):
 im=rgba(p);b=Image.new('RGBA',im.size,color);b.alpha_composite(im);return b.convert('RGB')
ref=white('references/base-subject.png');base=white(P/'基础色恢复点.png');final=white(P/'preview.png')
page=Image.new('RGB',(1440,900),'#eeeeef');d=ImageDraw.Draw(page)
for k,(im,title) in enumerate([(ref,'原彩图'),(base,'基础色恢复点'),(final,'眼黑颜色与自身层次'),(Image.blend(ref,final,.5),'50% 同坐标混合')]):
 x=k*360;d.text((x+12,12),title,font=font,fill='#292b34');page.paste(im.crop((382,167,502,277)).resize((360,330)),(x,44))
 d.text((x+12,388),'眼部 9x · 同坐标',font=font,fill='#292b34');page.paste(im.crop((397,188,437,211)).resize((360,207)),(x,420))
 d.text((x+12,641),'原尺寸 1x',font=font,fill='#292b34');page.paste(im.crop((382,167,502,230)),(x+120,673))
d.text((16,784),'分离纵向、中心过渡、左右边缘、左右局部蓝色色带及瞳孔过渡；独立白色高光与外来投影仍未制作。',font=font,fill='#292b34')
d.text((16,824),'已审眼裂、虹膜和瞳孔几何保持；仅在完整承载面内增加颜色，眼白、眼睑与待办装饰不改。',font=font,fill='#292b34');page.save(P/'对照.png')

layers=json.loads((Q/'audit.json').read_text())['new_material_layers']
labels=['虹膜纵向深→中→浅','中心与瞳孔周围过渡','左下浅蓝色带','右中、右下冰蓝局部','外侧边缘深蓝','内侧边缘蓝灰','瞳孔核心纵向层次','瞳孔外围蓝灰过渡']
page=Image.new('RGB',(1440,1280),'#eeeeef');d=ImageDraw.Draw(page)
for k,(id,label) in enumerate(zip(layers,labels)):
 x=k%3*480;y=k//3*416;d.text((x+12,y+12),label,font=font,fill='#292b34')
 page.paste(white(Q/(id+'.png'),'#d5d7de').resize((480,299)),(x,y+47))
 d.text((x+12,y+359),'独立材料层 / 可单独关闭',font=font,fill='#292b34')
page.save(Q/'颜色层独显.png')
page=Image.new('RGB',(1440,808),'#eeeeef');d=ImageDraw.Draw(page)
items=[('base-isolated','基础色'),('vertical-only','仅纵向色阶'),('final-isolated','全部颜色层'),('without-local-bands','关闭左右局部色带'),('final-isolated','打开左右局部色带'),('complete-gaze','完整隐藏眼黑 / 无白洞')]
for k,(n,title) in enumerate(items):
 x=k%3*480;y=k//3*400;d.text((x+12,y+12),title,font=font,fill='#292b34');page.paste(white(Q/(n+'.png')).resize((480,299)),(x,y+49))
page.save(Q/'层次前后与完整眼黑.png')
checks={'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'all_layers_vs_vertical_only':{},'local_band_toggle':{}}
for key,a,b in [('all_layers_vs_vertical_only','final-isolated','vertical-only'),('local_band_toggle','final-isolated','without-local-bands')]:
 aa=np.array(white(Q/(a+'.png'))).astype(int);bb=np.array(white(Q/(b+'.png'))).astype(int);diff=np.abs(aa-bb)
 checks[key]={'changed_pixels':int(np.count_nonzero(diff.max(axis=2))),'max_channel_difference':int(diff.max())}
g=rgba(Q/'complete-gaze.png')
checks['highlight_underlying_color']={'xy':[419,197],'rgba':g.getpixel(((419-394)*24,(197-185)*24))}
mask=np.array(rgba(Q/'iris-surface-mask.png'))[:,:,3]
checks['material_layer_pixels_outside_complete_iris']={}
for id in layers[:6]:
 alpha=np.array(rgba(Q/(id+'.png')))[:,:,3]
 checks['material_layer_pixels_outside_complete_iris'][id]=int(np.count_nonzero((alpha>0)&(mask==0)))
(Q/'layer-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(checks,ensure_ascii=False,indent=2))
