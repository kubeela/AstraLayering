from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib
P=Path('refinement/groups/mouth/4.分部件着色/4.3.唇部颜色与层次');Q=P/'evidence'
def f(n):return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
def rgb(p):
 im=Image.open(p).convert('RGBA');bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);return bg.convert('RGB')
def cell(out,im,x,y,label,w=378,h=201):ImageDraw.Draw(out).text((x,y),label,font=f(21),fill='#302d36');out.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y+36))
reference=rgb('references/base-subject.png');candidate=rgb(P/'preview.png');source=rgb(Q/'input-default.png');rm=reference.crop((421,232,468,257));cm=rgb(Q/'candidate-closeup.png');im=rgb(Q/'input-closeup.png');mixed=Image.blend(rm.resize(cm.size,Image.Resampling.LANCZOS),cm,.5);mixed.save(Q/'reference-candidate-50percent.png')
out=Image.new('RGB',(1700,1430),'#f7f6f4');d=ImageDraw.Draw(out)
d.text((28,20),'mouth 4.3｜上下唇自身颜色、区域层次与柔和消退',font=f(28),fill='#302d36')
d.text((28,65),'原图决定颜色范围；原画布941×1672，所有裁图共用坐标，未移动或缩放候选嘴型。',font=f(20),fill='#59515c')
for x,l,v in zip([28,450,872,1294],['原彩图','4.2 输入：中性唇面','4.3 候选','原图 + 候选各 50%'],[rm,im,cm,mixed]):cell(out,v,x,114,l)
d.text((28,363),'嘴部裁框：(421,232)–(468,257)。合口线、嘴角和唇峰路径不变；唇色只在已审完整唇形内绘制。',font=f(19),fill='#59515c')
cell(out,reference.crop((414,215,476,273)),28,414,'原图：鼻底—下巴',h=354)
cell(out,rgb(Q/'candidate-context.png'),450,414,'4.3：鼻底—下巴',h=354)
cell(out,rgb(Q/'base-colors-only-closeup.png'),872,414,'仅基础纵向色层')
cell(out,cm,1294,414,'加入中央与右侧区域差异')
cell(out,rgb(Q/'upper-lip-complete.png'),872,679,'上唇自身材料独显')
cell(out,rgb(Q/'lower-lip-complete.png'),1294,679,'下唇自身材料独显')
d.text((28,846),'实际区域对应',font=f(24),fill='#302d36')
for i,t in enumerate(['上唇：06–14。浅粉上沿 → 肉粉中段 → 近缝玫瑰暗色；中央较浅，右侧较饱和。','下唇：15–25。近缝暗粉 → 丰满主体 → 中央柔亮 → 下缘渐淡；左右保留差异。','边缘柔化仅作用于颜色遮罩；正式线保持清晰，颜色不会越出已审唇面。','下唇宽广柔亮属于自身材料；没有白色镜面反光、独立唇彩或外来投影。']):d.text((28,891+i*33),t,font=f(19),fill='#59515c')
d.text((28,1050),'正常尺寸面部 1×',font=f(23),fill='#302d36')
for x,l,v in zip([80,480,880],['原图','4.2 输入','4.3 候选'],[reference,source,candidate]):d.text((x,1094),l,font=f(20),fill='#59515c');out.paste(v.crop((389,164,501,274)),(x,1130))
d.text((28,1295),'保留：4.1正式线与口腔、4.2牙舌、上下遮盖、全部非mouth和已审双眼。',font=f(20),fill='#514a55')
d.text((28,1337),'着色前恢复点.svg 与4.2输入字节一致；完整分层独显见 evidence/唇色分层独显.png。',font=f(20),fill='#514a55')
out.save(P/'对照.png')

layers=Image.new('RGB',(1700,900),'#f7f6f4');d=ImageDraw.Draw(layers);d.text((28,20),'六项唇面颜色层独显（未叠加总外缘 / 嘴角淡出遮罩）',font=f(27),fill='#302d36')
d.text((28,65),'各组引用同一已审完整唇形；本页只定位颜色贡献，默认效果见主对照。',font=f(20),fill='#59515c')
for row,side in enumerate(['upper','lower']):
 for col,(region,label) in enumerate([('base','基础纵向体积'),('center','中央色阶'),('right','右侧色相 / 明暗')]):
  n='mouth_lip_'+side+'_'+region+'_material';cell(layers,rgb(Q/(n+'.png')),28+col*558,118+row*355,('上唇' if side=='upper' else '下唇')+' · '+label,w=526,h=280)
layers.save(Q/'唇色分层独显.png')
def diff(pa,pb):
 a=np.array(Image.open(pa).convert('RGBA')).astype(int);b=np.array(Image.open(pb).convert('RGBA')).astype(int);z=np.abs(a-b);ys,xs=np.where(np.any(z>0,axis=2));return {'changed_pixels':int(len(xs)),'max_channel_delta':int(z.max()),'bbox':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]}
checks={'default_vs_internal_hidden_1x':diff(P/'preview.png',Q/'internal-hidden.png'),'default_vs_internal_hidden_24x':diff(Q/'candidate-closeup.png',Q/'internal-hidden-closeup.png'),'covers_only_vs_internal_hidden_24x':diff(Q/'covers-only-closeup.png',Q/'internal-hidden-closeup.png'),'mouth_hidden_before_after':diff(Q/'input-mouth-hidden.png',Q/'candidate-mouth-hidden.png'),'local_fields_contribution':diff(Q/'candidate-closeup.png',Q/'base-colors-only-closeup.png'),'lip_paint_support':{}}
for side in ['upper','lower']:
 a=np.array(Image.open(Q/(side+'-lip-complete.png')).convert('RGBA'))[:,:,3];support=np.array(Image.open(Q/(side+'-support.png')).convert('RGBA'))[:,:,3];checks['lip_paint_support'][side]={'colored_pixels_outside_approved_shape':int(((a>0)&(support==0)).sum()),'approved_shape_nonzero_alpha_pixels':int((support>0).sum()),'actual_color_nonzero_alpha_pixels':int((a>0).sum()),'color_equivalent_canvas_area':float(a.sum()/255/24**2)}
palette=json.loads(Path('refinement/groups/mouth/3.嘴部色盘/palette.json').read_text(encoding='utf-8'));checks['observed_samples_vs_final_native_render']=[{'id':s['id'],'actual_pixel':s['actual_pixel'],'reference_rgb':s['rgb'],'candidate_rgb':candidate.getpixel(tuple(s['actual_pixel']))} for s in palette['samples'] if 6<=int(s['id'])<=25]
checks['sample_interpretation']='Palette describes observed mixed raster pixels; paint color stops use pixel centers. Near the frozen outer boundary some pixels include different coverage and skin, so this is not an exact per-pixel reproduction claim.'
checks['candidate_sha256']=hashlib.sha256((P/'character.svg').read_bytes()).hexdigest();checks['restore_sha256']=hashlib.sha256((P/'着色前恢复点.svg').read_bytes()).hexdigest()
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in checks.items() if k!='observed_samples_vs_final_native_render'},ensure_ascii=False,indent=2))
