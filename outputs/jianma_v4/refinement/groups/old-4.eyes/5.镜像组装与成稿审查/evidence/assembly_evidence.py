from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import numpy as np,json
P=Path('refinement/groups/eyes/5.镜像组装与成稿审查');Q=P/'evidence';font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def rgba(p):return Image.open(p).convert('RGBA')
def white(p):
 im=rgba(p) if isinstance(p,(str,Path)) else p.convert('RGBA');bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);return bg.convert('RGB')
def compare(a,b):
 x=np.array(a).astype(int);y=np.array(b).astype(int);d=np.abs(x-y)
 return {'different_pixels':int(np.count_nonzero(d.max(axis=2))),'max_channel_difference':int(d.max())}
inp=rgba(Q/'input-rerender.png');final=rgba(P/'preview.png');ref=rgba('references/base-subject.png')
checks={'source_eye_crop_before_after':compare(inp.crop((394,185,439,213)),final.crop((394,185,439,213))),
 'effects_on_target_vs_mirror_source':compare(rgba(Q/'eye_left-on.png'),ImageOps.mirror(rgba(Q/'eye_right-on.png'))),
 'effects_off_target_vs_mirror_source':compare(rgba(Q/'eye_left-off.png'),ImageOps.mirror(rgba(Q/'eye_right-off.png'))),
 'source_effects_off_vs_clean_reference':compare(rgba(Q/'eye_right-off.png'),rgba(Q/'source-clean-reference.png'))}
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')

page=Image.new('RGB',(1440,960),'#eeeef0');d=ImageDraw.Draw(page)
for k,(im,title) in enumerate([(ref,'原彩图'),(inp,'镜像前最新整图'),(final,'双眼镜像组装'),(Image.blend(ref,final,.5),'50% 同坐标混合')]):
 x=k*360;im=white(im);d.text((x+12,12),title,font=font,fill='#292b34')
 page.paste(im.crop((382,167,502,277)).resize((360,330)),(x,45))
 d.text((x+12,390),'双眼 3x · 原画布配准',font=font,fill='#292b34')
 page.paste(im.crop((390,184,498,213)).resize((324,87)),(x+18,425))
 d.text((x+12,538),'原尺寸 1x',font=font,fill='#292b34')
 page.paste(im.crop((370,110,520,285)),(x+105,574))
d.text((18,802),'固定轴 x=444：eye_right → eye_left；目标眼拥有独立完整几何、颜色资源、裁切与效果节点。',font=font,fill='#292b34')
d.text((18,843),'主眼保持原版本；前发、眉、鼻、脸和其余部件保持输入。正常尺寸及同坐标混合用于检查双眼神态。',font=font,fill='#292b34')
d.text((18,884),'目标仅镜像一次，不依据原图微小不对称额外调校眼球或头发。',font=font,fill='#292b34')
page.save(Q/'同坐标双眼对照.png')

page=Image.new('RGB',(1440,795),'#eeeeef');d=ImageDraw.Draw(page)
for row,mode in enumerate(['on','off']):
 ims=[rgba(Q/('eye_right-'+mode+'.png')),rgba(Q/('eye_left-'+mode+'.png')),ImageOps.mirror(rgba(Q/('eye_left-'+mode+'.png')))]
 for col,(im,title) in enumerate(zip(ims,['主眼局部','目标眼局部','目标反向镜像，仅用于核对'])):
  x=col*480;y=row*390;d.text((x+12,y+12),title+(' / 效果开' if mode=='on' else ' / 效果关'),font=font,fill='#292b34')
  page.paste(white(im).resize((480,299)),(x,y+48))
page.save(Q/'镜像与效果关闭对照.png')
print(json.dumps(checks,ensure_ascii=False,indent=2))
