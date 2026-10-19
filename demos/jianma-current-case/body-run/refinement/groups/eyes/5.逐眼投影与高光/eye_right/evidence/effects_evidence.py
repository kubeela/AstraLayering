from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,numpy as np
P=Path('refinement/groups/eyes/5.逐眼投影与高光/eye_right');Q=P/'evidence';font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def rgba(p):return Image.open(p).convert('RGBA')
def white(p,color='white'):
 im=rgba(p);b=Image.new('RGBA',im.size,color);b.alpha_composite(im);return b.convert('RGB')
ref=white('references/base-subject.png');clean=white(Q/'clean-rerender.png');final=white(P/'preview.png')
page=Image.new('RGB',(1600,990),'#eeeeef');d=ImageDraw.Draw(page)
for k,(im,title) in enumerate([(ref,'原彩图'),(clean,'4.4 干净稿 / 效果全关'),(final,'第5步 · 效果全开'),(Image.blend(ref,final,.5),'50% 同坐标混合')]):
 x=k*400;d.text((x+12,12),title,font=font,fill='#292b34');page.paste(im.crop((382,167,502,277)).resize((400,367)),(x,45))
 d.text((x+12,430),'完整眼周 10x · 同坐标',font=font,fill='#292b34');page.paste(im.crop((397,183,437,215)).resize((400,320)),(x,466))
 d.text((x+12,804),'原尺寸 1x',font=font,fill='#292b34');page.paste(im.crop((382,167,502,230)),(x+140,837))
d.text((18,927),'效果关闭保留8层眼黑固有色及11层眼周体积；投影按来源与目标拆开，高光保留已审完整形体。',font=font,fill='#292b34');page.save(P/'效果对照.png')
effects=json.loads((Q/'audit.json').read_text(encoding='utf-8'))['new_effects']
labels=['上睑 → 完整眼白','下睑 → 完整眼白','上睑 → 完整虹膜','下睑 → 完整虹膜','独立眼内反光 → 虹膜表面']
page=Image.new('RGB',(1440,2000),'#eeeeef');d=ImageDraw.Draw(page)
for k,(e,label) in enumerate(zip(effects,labels)):
 y=k*398;d.text((14,y+10),label,font=font,fill='#292b34')
 d.text((18,y+43),'完整路径 / 解除两层裁切',font=font,fill='#292b34');d.text((738,y+43),'承载表面 ∩ 眼裂 / 正式效果',font=font,fill='#292b34')
 for j,suffix in enumerate(['-complete','']):page.paste(white(Q/(e['id']+suffix+'.png'),'#b9bdc9' if e['type']=='highlight' else 'white').resize((470,326)),(j*720+120,y+72))
page.save(Q/'逐项完整路径与双重裁切.png')
page=Image.new('RGB',(1440,1640),'#eeeeef');d=ImageDraw.Draw(page)
items=[('all-effects-off-closeup','全部效果关闭 / 眼周自身层次继续存在'),('final-closeup','全部效果开启 / 只增加独立效果'),('upper-source-and-casts-off','上睑、上睫毛与上睑两片投影同时关闭'),('lower-source-and-casts-off','下睑、下睫毛与下睑两片投影同时关闭'),('upper-source-and-all-effects-off','上睑来源及本步全部效果关闭 / 干净承影面'),('lower-source-and-all-effects-off','下睑来源及本步全部效果关闭 / 干净承影面')]
for k,(n,label) in enumerate(items):
 x=k%2*720;y=k//2*540;d.text((x+12,y+12),label,font=font,fill='#292b34');page.paste(white(Q/(n+'.png')).resize((686,476)),(x+17,y+50))
page.save(Q/'效果开关与来源关闭.png')
off=np.array(rgba(Q/'all-effects-off.png')).astype(int);before=np.array(rgba(Q/'clean-rerender.png')).astype(int);after=np.array(rgba(P/'preview.png')).astype(int)
delta=np.abs(after-before);ys,xs=np.nonzero(delta.max(axis=2));checks={'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'all_effects_off_vs_clean_changed_pixels':int(np.count_nonzero(np.abs(off-before).max(axis=2))),'all_effects_off_vs_clean_max_channel_difference':int(np.abs(off-before).max()),'normal_render_changed_pixels':int(len(xs)),'normal_render_changed_bbox':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],'per_effect_clip_checks':{},'highlight_samples':{}}
for e in effects:
 alpha=np.array(rgba(Q/(e['id']+'.png')))[:,:,3];complete=np.array(rgba(Q/(e['id']+'-complete.png')))[:,:,3];target='sclera' if 'sclera' in e['target_id'] else 'iris';mask=np.array(rgba(Q/(target+'-intersection-mask.png')))[:,:,3]
 checks['per_effect_clip_checks'][e['id']]={'rendered_pixels':int(np.count_nonzero(alpha)),'complete_path_pixels':int(np.count_nonzero(complete)),'pixels_outside_surface_and_aperture':int(np.count_nonzero((alpha>0)&(mask==0))),'max_alpha':int(alpha.max())}
for xy in [(418,196),(418,197),(419,197),(419,198)]:checks['highlight_samples'][str(xy)]={'reference':ref.getpixel(xy),'clean':clean.getpixel(xy),'final':final.getpixel(xy)}
checks['source_and_effects_off_vs_clean_source_off']={}
for source in ['upper','lower']:
 a=np.array(rgba(Q/(source+'-source-and-all-effects-off.png'))).astype(int);b=np.array(rgba(Q/('clean-'+source+'-source-off.png'))).astype(int);df=np.abs(a-b)
 checks['source_and_effects_off_vs_clean_source_off'][source]={'changed_pixels':int(np.count_nonzero(df.max(axis=2))),'max_channel_difference':int(df.max())}
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=False,indent=2))
