from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
out=Path('refinement/groups/eyes/2.逐眼线稿/eye_right')
def white(p):
 im=Image.open(p).convert('RGBA');bg=Image.new('RGBA', im.size,'white');bg.alpha_composite(im);return bg.convert('RGB')
ref=white('references/base-subject.png');before=white(out/'evidence/input.png');after=white(out/'preview.png')
ims=[ref,before,after,Image.blend(ref,after,.5)]
labels=['原彩图 | original','输入底稿 | input','校准后线稿 | calibrated','50% 同坐标混合 | blend']
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
page=Image.new('RGB',(1440,990),'#eeeeef');d=ImageDraw.Draw(page)
for i,(im,label) in enumerate(zip(ims,labels)):
 x=i*360
 d.text((x+12,12),label,font=font,fill='#20232a')
 # Same exact face box in all columns, no candidate-only registration.
 page.paste(im.crop((382,167,502,277)).resize((360,330)),(x,47))
 page.paste(im.crop((397,188,437,211)).resize((360,207)),(x,417))
 page.paste(im.crop((370,110,520,285)),(x+105,680))
 d.text((x+12,383),'眼部放大 9x',font=font,fill='#20232a')
 d.text((x+12,641),'原尺寸 1x / 不独立配准',font=font,fill='#20232a')
d.text((18,910),'同一 941×1672 画布；上：眉眼鼻位置；中：眼裂、下缘转折及眼白；下：正常尺寸神态。',font=font,fill='#20232a')
d.text((18,947),'当前仅制作 eye_right；eye_left 保留输入占位，待最终镜像；前发、脸底及投影均沿用输入。',font=font,fill='#20232a')
page.save(out/'校准对照.png')
box=(400,190,435,208)
zoom=Image.new('RGB',(1260,348),'white');dz=ImageDraw.Draw(zoom)
for i,im in enumerate([ref,after,Image.blend(ref,after,.5)]):
 zoom.paste(im.crop(box).resize((420,216)),(i*420,34));dz.text((i*420+12,6),['Original','Candidate','50% blend'][i],fill='black')
zoom.save(out/'evidence/current-comparison.png')
