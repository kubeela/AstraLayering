from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib
P=Path('refinement/groups/mouth/4.分部件着色/4.1.轮廓部件着色');Q=P/'evidence';A=Path('refinement/groups/mouth/2.嘴型校准与部件线稿')
def f(n):return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
def rgb(p):
 im=Image.open(p).convert('RGBA');bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);return bg.convert('RGB')
def cell(out,im,x,y,label,w=378,h=201):
 ImageDraw.Draw(out).text((x,y),label,font=f(21),fill='#302d36');out.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y+36))
reference=rgb('references/base-subject.png');source=rgb(A/'preview.png');candidate=rgb(P/'preview.png');rm=reference.crop((421,232,468,257));rc=reference.crop((414,215,476,273));am=rgb(Q/'approved-closeup.png');cm=rgb(Q/'candidate-closeup.png');cc=rgb(Q/'candidate-context.png')
mixed=Image.blend(rm.resize(cm.size,Image.Resampling.LANCZOS),cm,.5);mixed.save(Q/'reference-candidate-50percent.png')
approved_mix=Image.blend(am,cm,.5);approved_mix.save(Q/'approved-candidate-50percent.png')
out=Image.new('RGB',(1700,1430),'#f7f6f4');d=ImageDraw.Draw(out)
d.text((28,20),'mouth 4.1｜正式线、上下遮盖基础衔接与完整口腔底色',font=f(28),fill='#302d36')
d.text((28,65),'原画布 941×1672；同坐标裁切。上下唇和牙舌仍为已审线稿的中性填充，留各自着色步骤。',font=f(20),fill='#59515c')
for x,l,v in zip([28,450,872,1294],['原彩图','已审线稿','4.1 候选','原图 + 候选各 50%'],[rm,am,cm,mixed]):cell(out,v,x,110,l)
d.text((28,359),'嘴部裁框：(421,232)–(468,257)。候选从保存后的 SVG 直接放大渲染，位置与已审线稿完全一致。',font=f(19),fill='#59515c')
cell(out,rc,28,407,'原图：鼻底—下巴',w=378,h=354)
cell(out,cc,450,407,'4.1：鼻底—下巴',w=378,h=354)
cell(out,approved_mix,872,407,'已审线稿 + 候选各 50%')
cell(out,rgb(Q/'inside-complete.png'),1294,407,'完整口腔：推断配色，默认隐藏')
cell(out,rgb(Q/'skin-covers.png'),872,671,'原有上下遮盖色场与裁切保留')
cell(out,rgb(Q/'lower-line-complete.png'),1294,671,'下正式线独显：默认仍关闭重叠')
d.text((28,827),'色样与范围',font=f(23),fill='#302d36')
for i,t in enumerate(['正式线：01–05 实测灰褐 / 玫瑰色，中央较浅，两端渐淡。','口腔：#673B49 为隐藏补全建议色；上下深浅及中心亮度均明确为推断。','肤色遮盖：保留邻近脸底连续色场及暖冷匹配，4.4 再处理局部体积。','已审路径、口裂、层序和默认闭合全部保留；没有加投影或高光。']):d.text((28,868+i*31),t,font=f(19),fill='#59515c')
d.text((28,1040),'正常尺寸面部（1×）',font=f(23),fill='#302d36')
for x,l,v in zip([80,480,880],['原图','已审线稿','4.1 候选'],[reference,source,candidate]):d.text((x,1083),l,font=f(20),fill='#59515c');out.paste(v.crop((389,164,501,274)),(x,1120))
d.text((28,1290),'自查：几何改动 0；非 mouth 与双眼不变；内部仍由完整遮盖和独立口裂控制。',font=f(20),fill='#514a55')
d.text((28,1330),'本图仅交付4.1阶段结果，不把灰色唇面认作最终唇色。',font=f(20),fill='#514a55')
out.save(P/'对照.png')
def diff(pa,pb):
 a=np.array(Image.open(pa).convert('RGBA')).astype(int);b=np.array(Image.open(pb).convert('RGBA')).astype(int);z=np.abs(a-b);ys,xs=np.where(np.any(z>0,axis=2));return {'changed_pixels':int(len(xs)),'max_channel_delta':int(z.max()),'bbox':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]}
checks={'default_vs_interior_hidden_1x':diff(P/'preview.png',Q/'interior-hidden.png'),'default_vs_interior_hidden_24x':diff(Q/'candidate-closeup.png',Q/'interior-hidden-closeup.png'),'covers_only_vs_interior_hidden_24x':diff(Q/'covers-only-closeup.png',Q/'interior-hidden-closeup.png'),'mouth_hidden_before_after':diff(Q/'approved-mouth-hidden.png',Q/'candidate-mouth-hidden.png')}
im=np.array(Image.open(Q/'inside-complete.png').convert('RGBA'));checks['complete_inside_alpha']={'fully_opaque_pixels':int((im[:,:,3]==255).sum()),'nonzero_alpha_pixels':int((im[:,:,3]>0).sum()),'opaque_equivalent_canvas_area':float(im[:,:,3].sum()/255/24**2)}
checks['skin_comparison_at_source_samples']={str(p):{'reference':reference.getpixel(p),'candidate':candidate.getpixel(p)} for p in [(426,241),(462,241),(443,236),(435,252),(454,252)]}
checks['candidate_sha256']=hashlib.sha256((P/'character.svg').read_bytes()).hexdigest();checks['scope']='4.1 contour line and cavity intrinsic color; retained working skin base; no 4.2/4.3/4.4/5 content'
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=False,indent=2))
