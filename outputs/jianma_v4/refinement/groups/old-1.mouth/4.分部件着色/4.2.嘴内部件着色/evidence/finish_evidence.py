from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib
P=Path('refinement/groups/mouth/4.分部件着色/4.2.嘴内部件着色');Q=P/'evidence'
def f(n):return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
def rgb(p):
 im=Image.open(p).convert('RGBA');bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);return bg.convert('RGB')
def cell(out,im,x,y,label):ImageDraw.Draw(out).text((x,y),label,font=f(21),fill='#302d36');out.paste(im.resize((378,201),Image.Resampling.LANCZOS),(x,y+36))
reference=rgb('references/base-subject.png');candidate=rgb(P/'preview.png');source=rgb(Q/'input-default.png');rm=reference.crop((421,232,468,257));cm=rgb(Q/'candidate-closeup.png');im=rgb(Q/'input-closeup.png');mixed=Image.blend(rm.resize(cm.size,Image.Resampling.LANCZOS),cm,.5)
out=Image.new('RGB',(1700,1310),'#f7f6f4');d=ImageDraw.Draw(out)
d.text((28,20),'mouth 4.2｜隐藏上牙与舌头着色',font=f(30),fill='#302d36')
d.text((28,66),'默认闭嘴不露出牙舌；独显仅临时解除遮挡，不改变嘴型，也不是新表情。',font=f(20),fill='#59515c')
for x,l,v in zip([28,450,872,1294],['原彩图','4.1 输入默认','4.2 候选默认','原图 + 候选各 50%'],[rm,im,cm,mixed]):cell(out,v,x,112,l)
d.text((28,361),'同坐标裁框：(421,232)–(468,257)，原画布941×1672。输入与候选的1×和24×默认渲染均0差异像素。',font=f(19),fill='#59515c')
for x,l,n in zip([28,450,872,1294],['上牙：4.1中性显示','上牙：4.2完整暖白弧面','舌头：4.1中性显示','舌头：4.2根部与隆起层次'],['input-teeth-complete','candidate-teeth-complete','input-tongue-complete','candidate-tongue-complete']):cell(out,rgb(Q/(n+'.png')),x,416,l)
d.text((28,663),'上牙推断建议色 #F8EEEC；舌头推断建议色 #BB7280。色阶为隐藏补全推断，无原图牙舌像素可实测。',font=f(19),fill='#59515c')
cell(out,rgb(Q/'input-interior-complete.png'),28,714,'4.1 完整内部组合')
cell(out,rgb(Q/'candidate-interior-complete.png'),450,714,'4.2 完整内部组合')
cell(out,rgb(Q/'candidate-inside-complete.png'),872,714,'4.1 口腔自身底色保留')
d.text((1294,714),'正常尺寸面部 1×',font=f(21),fill='#302d36');out.paste(candidate.crop((389,164,501,274)),(1310,760))
d.text((28,978),'上牙保持整体，无逐颗硬分缝；舌头保留完整实色底面、根部暗色和连续体积，未增加舌纹。',font=f(20),fill='#59515c')
d.text((28,1020),'牙舌均受完整嘴内裁切，并继续由上下遮盖和独立口裂隐藏；下牙、唇彩按计划省略。',font=f(20),fill='#59515c')
d.text((28,1078),'结构自查',font=f(24),fill='#302d36')
for i,t in enumerate(['已审几何、默认口裂、遮盖、层序不变；非mouth与双眼XML不变。','完整上牙、舌头有实填底形，各2层可编辑自身颜色；新增投影0项，独立高光0项。','口腔组及4.1颜色资源逐项一致；上下唇仍为中性填充，留4.3处理。']):d.text((28,1120+i*36),t,font=f(20),fill='#514a55')
out.save(P/'对照.png')
def diff(pa,pb):
 a=np.array(Image.open(pa).convert('RGBA')).astype(int);b=np.array(Image.open(pb).convert('RGBA')).astype(int);z=np.abs(a-b);ys,xs=np.where(np.any(z>0,axis=2));return {'changed_pixels':int(len(xs)),'max_channel_delta':int(z.max()),'bbox':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]}
checks={'default_vs_4_1_1x':diff(P/'preview.png',Q/'input-default.png'),'default_vs_4_1_24x':diff(Q/'candidate-closeup.png',Q/'input-closeup.png'),'default_vs_hidden_teeth_tongue_1x':diff(P/'preview.png',Q/'internal-colors-hidden.png'),'default_vs_hidden_teeth_tongue_24x':diff(Q/'candidate-closeup.png',Q/'internal-colors-hidden-closeup.png'),'covers_only_vs_all_interior_hidden_24x':diff(Q/'covers-only-closeup.png',Q/'all-interior-hidden-closeup.png'),'cavity_color_before_after':diff(Q/'input-inside-complete.png',Q/'candidate-inside-complete.png'),'complete_colored_parts':{}}
for name in ['teeth','tongue']:
 im=np.array(Image.open(Q/('candidate-'+name+'-complete.png')).convert('RGBA'));a=im[:,:,3];ys,xs=np.where(a>0);colors=im[:,:,:3][a==255]
 checks['complete_colored_parts'][name]={'nonzero_alpha_pixels':int((a>0).sum()),'fully_opaque_pixels':int((a==255).sum()),'opaque_equivalent_canvas_area':float(a.sum()/255/24**2),'rgb_min':colors.min(axis=0).tolist(),'rgb_max':colors.max(axis=0).tolist(),'color_changed_vs_4_1':diff(Q/('input-'+name+'-complete.png'),Q/('candidate-'+name+'-complete.png'))}
checks['candidate_sha256']=hashlib.sha256((P/'character.svg').read_bytes()).hexdigest();checks['scope']='4.2 inferred upper-teeth and tongue intrinsic color only'
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=False,indent=2))
