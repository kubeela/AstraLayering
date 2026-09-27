from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib
P=Path('refinement/groups/mouth/4.分部件着色/4.4.嘴周皮肤明暗');Q=P/'evidence'
def f(n):return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
def rgb(p):
 im=Image.open(p).convert('RGBA');bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);return bg.convert('RGB')
def isolated(p):
 im=Image.open(p).convert('RGBA');bg=Image.new('RGBA',im.size,'#DFE3E7');bg.alpha_composite(im);return bg.convert('RGB')
def cell(out,im,x,y,label,w=378,h=354):ImageDraw.Draw(out).text((x,y),label,font=f(21),fill='#302d36');out.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y+36))
reference=rgb('references/base-subject.png');candidate=rgb(P/'preview.png');source=rgb(Q/'input-default.png');rc=reference.crop((414,215,476,273));cc=rgb(Q/'candidate-context.png');ic=rgb(Q/'input-context.png');cm=rgb(Q/'candidate-closeup.png');im=rgb(Q/'input-closeup.png');off=rgb(Q/'stage44-off-closeup.png')
mixed=Image.blend(rc.resize(cc.size,Image.Resampling.LANCZOS),cc,.5);mixed.save(Q/'reference-candidate-50percent.png')
z=np.max(np.abs(np.array(cm).astype(int)-np.array(im).astype(int)),axis=2);heat=Image.fromarray(np.uint8(255-np.minimum(255,z*12))).convert('RGB');heat.save(Q/'difference-amplified-12x.png')
out=Image.new('RGB',(1700,1470),'#f7f6f4');d=ImageDraw.Draw(out)
d.text((28,20),'mouth 4.4｜嘴周皮肤自身明暗与上下遮盖衔接',font=f(29),fill='#302d36')
d.text((28,65),'原画布941×1672；鼻底—下巴裁框(414,215)–(476,273)，所有图使用同一坐标。',font=f(20),fill='#59515c')
for x,l,v in zip([28,450,872,1294],['原彩图','4.3 输入','4.4 干净着色候选','原图 + 候选各 50%'],[rc,ic,cc,mixed]):cell(out,v,x,113,l)
d.text((28,520),'按实际色区补小范围暖色与亮面，不画人中沟、法令纹或围绕嘴唇的色环。唇正下方较深的31号观察色留第5步判断。',font=f(18),fill='#59515c')
for x,l,v in zip([28,450,872,1294],['关闭4.4（与4.3一致）','开启4.4','差异增强×12（仅定位）','新增皮肤层（灰底独显）'],[off,cm,heat,isolated(Q/'skin-only.png')]):cell(out,v,x,570,l,h=217)
d.text((28,838),'补色：人中下端暖色及两侧浅肤色、左上唇外过渡、嘴角外平面、下唇两侧与上方下巴的轻微暖色。',font=f(20),fill='#59515c')
cell(out,isolated(Q/'upper-skin-only.png'),28,889,'嘴上皮肤：6个独立区域',h=217)
cell(out,isolated(Q/'lower-skin-only.png'),450,889,'嘴下皮肤：5个独立区域',h=217)
d.text((872,889),'正常尺寸面部 1×',font=f(21),fill='#302d36')
for x,l,v in [(900,'原图',reference),(1160,'4.3',source),(1420,'4.4',candidate)]:d.text((x,934),l,font=f(20),fill='#59515c');out.paste(v.crop((389,164,501,274)),(x,970))
d.text((28,1194),'恢复检查：关闭 mouth_upper_skin_volume 与 mouth_lower_skin_volume，可回到4.3完整画面。',font=f(20),fill='#514a55')
d.text((28,1237),'保护检查：原有几何、唇色、正式线、口腔/牙舌、肤色遮盖、双眼及全部非mouth节点保留。',font=f(20),fill='#514a55')
d.text((28,1280),'4.1–4.4均保留可编辑自身颜色；本文件是第5步独立效果的干净着色基准。',font=f(20),fill='#514a55')
d.text((28,1340),'差异增强图仅放大既有变化以定位区域，不代表默认强度。',font=f(19),fill='#6a626d')
out.save(P/'对照.png')
def diff(pa,pb):
 a=np.array(Image.open(pa).convert('RGBA')).astype(int);b=np.array(Image.open(pb).convert('RGBA')).astype(int);z=np.abs(a-b);ys,xs=np.where(np.any(z>0,axis=2));return {'changed_pixels':int(len(xs)),'max_channel_delta':int(z.max()),'bbox':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]}
checks={'stage_off_vs_input_1x':diff(Q/'stage44-off.png',Q/'input-default.png'),'stage_off_vs_input_24x':diff(Q/'stage44-off-closeup.png',Q/'input-closeup.png'),'actual_stage_contribution_1x':diff(P/'preview.png',Q/'input-default.png'),'actual_stage_contribution_24x':diff(Q/'candidate-closeup.png',Q/'input-closeup.png'),'default_vs_internal_hidden_24x':diff(Q/'candidate-closeup.png',Q/'internal-hidden-closeup.png'),'covers_only_vs_internal_hidden_24x':diff(Q/'covers-only-closeup.png',Q/'internal-hidden-closeup.png'),'mouth_hidden_before_after':diff(Q/'input-mouth-hidden.png',Q/'candidate-mouth-hidden.png')}
a=np.array(Image.open(Q/'candidate-closeup.png').convert('RGBA')).astype(int);b=np.array(Image.open(Q/'input-closeup.png').convert('RGBA')).astype(int);m=np.array(Image.open(Q/'protected-lip-support.png').convert('RGBA'))[:,:,3]>0
checks['protected_lips_and_formal_line_24x']={'changed_pixels':int((np.any(a!=b,axis=2)&m).sum()),'max_channel_delta':int(np.abs(a-b)[m].max())}
probes=json.loads((Q/'source-skin-probes.json').read_text(encoding='utf-8'))['probes'];checks['source_probe_comparison']=[{**p,'input_rgb':source.getpixel(tuple(p['pixel'])),'candidate_rgb':candidate.getpixel(tuple(p['pixel'])),'candidate_max_channel_error':int(np.max(np.abs(np.array(candidate.getpixel(tuple(p['pixel'])))-np.array(p['rgb']))))} for p in probes]
checks['sample31_at_445_250_not_added']={'reference':reference.getpixel((445,250)),'input':source.getpixel((445,250)),'candidate':candidate.getpixel((445,250))}
checks['candidate_sha256']=hashlib.sha256((P/'character.svg').read_bytes()).hexdigest();checks['scope']='local skin intrinsic color on existing skin support; no independent cast shadow or highlight'
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in checks.items() if k!='source_probe_comparison'},ensure_ascii=False,indent=2))
