from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib
P=Path('refinement/groups/mouth/2.嘴型校准与部件线稿');Q=P/'evidence'
FONT='C:/Windows/Fonts/msyh.ttc'
def font(n):return ImageFont.truetype(FONT,n)
def openrgb(p):
 im=Image.open(p).convert('RGBA');bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);return bg.convert('RGB')
def panel(im,size):return im.resize(size,Image.Resampling.LANCZOS)
def paste_cell(out,im,xy,label,size):
 x,y=xy;d=ImageDraw.Draw(out);d.text((x,y),label,font=font(22),fill='#302d36');out.paste(panel(im,size),(x,y+38))
reference=openrgb('references/base-subject.png');candidate=openrgb(P/'preview.png');source=openrgb(Q/'input-rerender.png')
context=(414,215,476,273);mouth=(421,232,468,257)
rc=reference.crop(context);ic=openrgb(Q/'input-context.png');cc=openrgb(Q/'candidate-context.png')
rm=reference.crop(mouth);im=openrgb(Q/'input-closeup.png');cm=openrgb(Q/'candidate-closeup.png')
mixed=Image.blend(panel(rm,cm.size),cm,.5);mixed.save(Q/'reference-candidate-50percent.png')
mix_context=Image.blend(panel(rc,cc.size),cc,.5)
out=Image.new('RGB',(1700,1400),'#f7f6f4');d=ImageDraw.Draw(out)
d.text((28,18),'嘴部线稿校准｜原画布 941 × 1672，裁图均按同一坐标',font=font(30),fill='#302d36')
d.text((28,64),'中性填充用于结构审核；原图唇缘柔软，最终配色与过渡留后续着色阶段。',font=font(20),fill='#59515c')
for x,l,v in zip([28,450,872,1294],['原彩图','输入占位色形','候选中性线稿','原图 + 候选各 50%'],[rc,ic,cc,mix_context]):paste_cell(out,v,(x,112),l,(378,354))
d.text((28,518),'鼻底—下巴上下文：x=414–476，y=215–273；没有单独平移或缩放嘴型。',font=font(19),fill='#59515c')
for x,l,v in zip([28,450,872,1294],['原图嘴部','输入嘴部','候选嘴部','同坐标 50% 混合'],[rm,im,cm,mixed]):paste_cell(out,v,(x,565),l,(378,201))
d.text((28,821),'局部：x=421–468，y=232–257。候选局部从 SVG 直接放大渲染；原图仅等比放大。',font=font(19),fill='#59515c')
d.text((28,867),'校准记录',font=font(24),fill='#302d36')
for y,t in enumerate(['• 嘴角约 (431.15, 243.40) / (456.90, 243.25)，宽约 25.75 px，保持浅起伏闭嘴。','• 上唇浅双峰与中央小凹口；下唇更丰满，唇下阴影没有并入口唇轮廓。','• 合口线是一套连续实形，收尾渐细；上嘴遮盖止于合口线内，没有浅白开口缝。','• 完整口腔、上牙和舌头位于后方，默认不读成张嘴。非 mouth 与已审双眼保持不变。']):d.text((28,911+y*34),t,font=font(20),fill='#514a55')
d.text((28,1080),'正常尺寸面部检查（1× 原画布像素，灰色格为留白）',font=font(22),fill='#302d36')
face=(389,164,501,274)
for x,l,v in zip([80,480,880],['原图 1×','输入 1×','候选 1×'],[reference,source,candidate]):
 d.text((x,1125),l,font=font(19),fill='#59515c');out.paste(v.crop(face),(x,1163))
d.text((1260,1150),'候选：待独立审查',font=font(22),fill='#514a55')
out.save(P/'对照.png')

sheet=Image.new('RGB',(1700,1240),'#f7f6f4');d=ImageDraw.Draw(sheet)
d.text((28,18),'嘴部结构独显｜只改变临时显隐 / 裁切，不修改默认几何',font=font(30),fill='#302d36')
d.text((28,64),'这些视图用于验证隐藏底形与遮盖余量，不是新表情。口腔、上牙、舌头无永久透明填充。',font=font(20),fill='#59515c')
cells=[('候选默认闭嘴','candidate-closeup'),('完整内部组合（解除口裂）','only-interior-complete'),('完整口腔','inside-complete'),('上牙完整底形（未裁切）','teeth-complete'),('舌头完整底形','tongue-complete'),('嘴上：遮盖 + 上唇 + 正式线','mouth-upper-complete'),('嘴下：独显时开启下正式线','mouth-lower-complete'),('上下肤色遮盖面','skin-covers'),('引用正式几何的辅助线（临时开启）','guides-on')]
for i,(label,name) in enumerate(cells):
 x=28+(i%3)*560;y=114+(i//3)*320
 paste_cell(sheet,openrgb(Q/(name+'.png')),(x,y),label,(526,280))
d.text((28,1098),'默认：口裂裁切 → 完整口腔 / 内部件裁切 → 下嘴遮盖与唇色 → 上嘴遮盖与唇色 / 合口线。',font=font(19),fill='#59515c')
d.text((28,1133),'上牙、舌头由 mouth_inside_clip 裁切；嘴上 / 嘴下及各自肤色面、唇色、线条分别可编辑。',font=font(19),fill='#59515c')
d.text((28,1168),'默认辅助线关闭；下正式线保留独立底形，在闭合重叠状态关闭，避免重复描深。',font=font(19),fill='#59515c')
sheet.save(P/'结构独显.png')

def diff(pa,pb):
 a=np.array(Image.open(pa).convert('RGBA')).astype(int);b=np.array(Image.open(pb).convert('RGBA')).astype(int);z=np.abs(a-b);ys,xs=np.where(np.any(z>0,axis=2))
 return {'changed_pixels':int(len(xs)),'max_channel_delta':int(z.max()),'bbox':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]}
checks={
 'default_vs_interior_hidden_1x':diff(P/'preview.png',Q/'without-interior.png'),
 'default_vs_interior_hidden_24x':diff(Q/'candidate-closeup.png',Q/'without-interior-closeup.png'),
 'default_vs_lower_line_hidden_1x':diff(P/'preview.png',Q/'without-lower-line.png'),
 'default_vs_lower_line_hidden_24x':diff(Q/'candidate-closeup.png',Q/'without-lower-line-closeup.png'),
 'covers_only_vs_interior_hidden_24x':diff(Q/'covers-without-aperture-closeup.png',Q/'without-interior-closeup.png'),
 'complete_parts_alpha':{},
 'coordinate_policy':{'canvas':[941,1672],'mouth_crop':list(mouth),'nose_chin_crop':list(context),'independent_registration':False},
 'interior_toggle_interpretation':'At native resolution any max=1 changes are compositing rounding under the closed seam; the directly rendered 24x geometry has zero visible interior pixels.',
 'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest()
}
for name in ['inside-complete','teeth-complete','tongue-complete','mouth-upper-complete','mouth-lower-complete']:
 a=np.array(Image.open(Q/(name+'.png')).convert('RGBA'))[:,:,3];ys,xs=np.where(a>0)
 checks['complete_parts_alpha'][name]={'nonzero_alpha_pixels':int(len(xs)),'canvas_area_px2':float(a.sum()/255/24**2),'canvas_bbox':[421+float(xs.min())/24,232+float(ys.min())/24,421+float(xs.max()+1)/24,232+float(ys.max()+1)/24]}
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(checks,ensure_ascii=False,indent=2))
