from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from lxml import etree as E
from copy import deepcopy
import json

P=Path('refinement/groups/eyes/3.逐眼着色/eye_right')
L=Path('refinement/groups/eyes/2.逐眼线稿/eye_right')
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
def white(p):
 im=Image.open(p).convert('RGBA');b=Image.new('RGBA',im.size,'white');b.alpha_composite(im);return b.convert('RGB')
ref=white('references/base-subject.png');line=white(L/'preview.png');base=white(P/'基础色恢复点.png');color=white(P/'preview.png')
ims=[ref,line,base,color,Image.blend(ref,color,.5)]
labels=['原彩图','已审线稿','基础色恢复点','干净着色稿','50% 同坐标混合']
page=Image.new('RGB',(1400,800),'#eeeef0');d=ImageDraw.Draw(page)
for k,(im,label) in enumerate(zip(ims,labels)):
 x=k*280;d.text((x+12,12),label,font=font,fill='#262732')
 page.paste(im.crop((382,167,502,277)).resize((276,253)),(x+2,43))
 d.text((x+12,308),'眼部 7x · 同一坐标',font=font,fill='#262732')
 page.paste(im.crop((397,188,437,211)).resize((280,161)),(x,340))
 d.text((x+12,522),'原尺寸 1x',font=font,fill='#262732')
 page.paste(im.crop((370,110,520,285)),(x+65,550))
d.text((18,755),'本步独立高光关闭、投影待第4步；眼白与蓝色虹膜边界沿用已审眼型，未重配准。',font=font,fill='#262732')
page.save(P/'着色对照.png')

# Samples are original pixels; explanations separate material from shadow/reflection.
samples=[('眼白外侧',(410,200),'底色参考'),('眼白内侧',(427,200),'含遮挡混色'),('虹膜左中',(413,199),'自身蓝色'),('虹膜下中',(418,201),'自身浅蓝'),('虹膜下部',(418,202),'浅蓝层次'),('虹膜侧缘',(412,198),'边缘蓝紫'),('瞳孔下部',(418,199),'深蓝过渡'),('眼睑上墨',(414,194),'正式眼线'),('下眼缘',(416,204),'暖灰玫瑰'),('眼皮折线',(418,192),'眼皮颜色'),('上缘近黑',(419,195),'遮挡暗带留后'),('高光区域',(419,197),'反光留后')]
palette=Image.new('RGB',(1200,396),'#f4f4f5');pd=ImageDraw.Draw(palette);records=[]
for k,(name,pt,use) in enumerate(samples):
 c=ref.getpixel(pt);hx='#%02X%02X%02X'%c;x=(k%6)*200;y=(k//6)*198
 pd.rectangle((x+14,y+14,x+186,y+76),fill=c)
 pd.text((x+14,y+88),name,font=font,fill='#28282c');pd.text((x+14,y+113),hx+' '+str(pt),font=font,fill='#28282c');pd.text((x+14,y+141),use,font=font,fill='#585860')
 records.append({'role':name,'xy':pt,'hex':hx,'interpretation':use})
palette.save(P/'evidence/原图色样.png');(P/'evidence/color-samples.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')

# Unclipped surfaces prove the highlight is disabled over fully colored material.
S=E.parse(str(P/'character.svg')).getroot();NS='http://www.w3.org/2000/svg'
for name,target in [('sclera-complete','eye_right_sclera'),('gaze-complete','eye_right_gaze')]:
 r=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 185 45 28',width='1080',height='672')
 for defs in S.xpath('//*[local-name()="defs"]'):r.append(deepcopy(defs))
 r.append(deepcopy(S.xpath('//*[@id="'+target+'"]')[0]))
 E.ElementTree(r).write(str(P/'evidence'/(name+'.svg')),encoding='utf-8',xml_declaration=True)
print('comparison, palette, complete surface evidence prepared')
