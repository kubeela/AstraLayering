from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib
P=Path('refinement/groups/mouth/6.组装与成稿审查');Q=P/'evidence'
def f(n):return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
def rgb(p,bg='white'):
 im=Image.open(p).convert('RGBA');out=Image.new('RGBA',im.size,bg);out.alpha_composite(im);return out.convert('RGB')
def cell(out,im,x,y,label,w=378,h=354):
 ImageDraw.Draw(out).text((x,y),label,font=f(21),fill='#302d36');out.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y+36))
ref=rgb('references/base-subject.png');candidate=rgb(P/'preview.png');clean=rgb(Q/'clean-default.png');rc=ref.crop((414,215,476,273));cc=rgb(Q/'candidate-context.png');cm=rgb(Q/'candidate-closeup.png');off=rgb(Q/'effects-off-closeup.png')
mix=Image.blend(rc.resize(cc.size,Image.Resampling.LANCZOS),cc,.5);mix.save(Q/'reference-candidate-50percent.png');ref.crop((421,232,468,259)).resize(cm.size,Image.Resampling.LANCZOS).save(Q/'source-closeup.png')
out=Image.new('RGB',(1700,1420),'#f7f6f4');d=ImageDraw.Draw(out)
d.text((28,20),'mouth 6｜完整静态候选与同坐标成稿对照',font=f(29),fill='#302d36');d.text((28,65),'原画布941×1672；上下文(414,215)–(476,273)。仅整理交接元数据，全部绘制内容保持第5步版本。',font=f(20),fill='#59515c')
for x,label,im in zip([28,450,872,1294],['原彩图','完整静态候选','原图 + 候选各50%','干净着色／效果关闭'],[rc,cc,mix,rgb(Q/'clean-context.png')]):cell(out,im,x,113,label)
d.text((28,520),'直接局部渲染裁框(421,232)–(468,259)；嘴角未移动、上下嘴未拉开。原图约二十余像素的唇部柔边不作新几何解释。',font=f(18),fill='#59515c')
for x,label,im in zip([28,450,872,1294],['原图嘴部','候选嘴部','关闭独立柔影','本步柔影独显'],[rgb(Q/'source-closeup.png'),cm,off,rgb(Q/'independent-effect.png','#DFE3E7')]):cell(out,im,x,570,label,h=217)
d.text((28,846),'效果关闭仍保留6层唇色与11个嘴周皮肤色区；口腔、上牙、舌头为完整隐藏补全。',font=f(20),fill='#59515c')
d.text((28,902),'正常尺寸面部 1×',font=f(23),fill='#302d36')
for x,label,im in [(80,'原图',ref),(470,'第4.4干净着色',clean),(900,'第6步候选',candidate)]:d.text((x,950),label,font=f(20),fill='#59515c');out.paste(im.crop((389,164,501,274)),(x,990))
d.text((28,1146),'默认保持闭嘴，辅助线关闭，下正式线按已审闭嘴重叠策略关闭；未新增牙舌外露或双重合口线。',font=f(20),fill='#514a55')
d.text((28,1190),'结构独显仅显示完整素材、检查遮盖与裁切，不是表情预览。后续绑定需要另建网格、关键点及动画关系。',font=f(20),fill='#514a55')
d.text((28,1250),'固定候选提交独立review，审查通过前不发布最终carry。',font=f(23),fill='#514a55')
out.save(P/'对照.png')
board=Image.new('RGB',(1700,1370),'#f7f6f4');dd=ImageDraw.Draw(board);dd.text((28,20),'mouth 6｜同版本完整静态结构独显',font=f(29),fill='#302d36');dd.text((28,65),'各格使用同一嘴部裁框与原坐标；仅临时切换显隐/取消口裂裁切，无移动、拉开或变形。',font=f(20),fill='#59515c')
items=[('candidate-closeup','默认闭嘴'),('complete-interior','完整内部／取消口裂裁切'),('complete-inside','嘴内完整底形 · 补全'),('complete-upper-teeth','上牙完整底形 · 补全'),('complete-tongue','舌头完整底形 · 补全'),('upper-control','嘴上控制／颜色与线'),('lower-control','嘴下控制／临时显示下线'),('upper-skin-cover','嘴上肤色遮盖面'),('lower-skin-cover','嘴下肤色遮盖面'),('upper-lip','上唇自身颜色'),('lower-lip','下唇自身颜色'),('skin-own-colors','11个嘴周自身肤色区'),('upper-formal-line','上正式线（可独立编辑）'),('lower-formal-line','下正式线（独显临时开启）'),('independent-effect','独立下唇柔影'),('effects-off-closeup','全部效果关闭＝4.4')]
for i,(name,label) in enumerate(items):cell(board,rgb(Q/(name+'.png'),'white' if name in ['candidate-closeup','effects-off-closeup'] else '#DFE3E7'),28+(i%4)*422,120+(i//4)*290,label,h=217)
dd.text((28,1301),'灰底用于检查完整素材和透明边缘；独显中的牙舌及下嘴线默认均被遮盖或关闭，不作为新表情。',font=f(19),fill='#514a55');board.save(P/'结构独显.png')
def arr(p):return np.array(Image.open(p).convert('RGBA')).astype(int)
def diff(a,b):
 z=np.abs(arr(a)-arr(b));ys,xs=np.where(np.any(z>0,axis=2));return {'changed_pixels':len(xs),'max_channel_delta':int(z.max()),'bbox':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]}
checks={'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'candidate_vs_stage5':diff(P/'preview.png',Q/'stage5-default.png'),'effects_off_vs_clean_1x':diff(Q/'effects-off.png',Q/'clean-default.png'),'effects_off_vs_clean_24x':diff(Q/'effects-off-closeup.png',Q/'clean-closeup.png'),'default_vs_internal_hidden_1x':diff(P/'preview.png',Q/'default-internal-hidden.png'),'default_vs_internal_hidden_24x':diff(Q/'candidate-closeup.png',Q/'internal-hidden-closeup.png'),'covers_alone_vs_internal_hidden_24x':diff(Q/'covers-only-closeup.png',Q/'internal-hidden-closeup.png'),'guides_removed':diff(P/'preview.png',Q/'guides-removed.png'),'lower_line_removed':diff(P/'preview.png',Q/'lower-line-removed.png'),'mouth_hidden_preservation':diff(Q/'mouth-hidden.png',Q/'stage5-mouth-hidden.png')}
areas={}
for name in ['complete-inside','complete-upper-teeth','complete-tongue','upper-skin-cover','lower-skin-cover','upper-lip','lower-lip','independent-effect']:
 alpha=arr(Q/(name+'.png'))[:,:,3];ys,xs=np.where(alpha>0);areas[name]={'alpha_area_original_square_pixels':round(float(alpha.sum()/255/24**2),3),'opaque_pixels_24x':int((alpha==255).sum()),'bbox_original':None if not len(xs) else [round(421+xs.min()/24,3),round(232+ys.min()/24,3),round(421+(xs.max()+1)/24,3),round(232+(ys.max()+1)/24,3)]}
checks['complete_structure_areas']=areas;(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=False,indent=2))
