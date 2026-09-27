from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,hashlib
P=Path('refinement/groups/mouth/5.独立投影与高光');Q=P/'evidence'
def font(n):return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
def rgb(p,bg='white'):
 im=Image.open(p).convert('RGBA');out=Image.new('RGBA',im.size,bg);out.alpha_composite(im);return out.convert('RGB')
def cell(out,im,x,y,label,w=378,h=354):
 ImageDraw.Draw(out).text((x,y),label,font=font(21),fill='#302d36');out.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y+36))
ref=rgb('references/base-subject.png');clean=rgb(Q/'clean-default.png');candidate=rgb(P/'preview.png')
rc=ref.crop((414,215,476,273));cc=rgb(Q/'candidate-context.png');ic=rgb(Q/'clean-context.png');cm=rgb(Q/'candidate-closeup.png');im=rgb(Q/'clean-closeup.png')
mix=Image.blend(rc.resize(cc.size,Image.Resampling.LANCZOS),cc,.5);mix.save(Q/'reference-candidate-50percent.png')
ref.crop((421,232,468,259)).resize(cm.size,Image.Resampling.LANCZOS).save(Q/'source-closeup.png')
out=Image.new('RGB',(1700,1535),'#f7f6f4');d=ImageDraw.Draw(out)
d.text((28,20),'mouth 5｜独立下唇柔影与干净着色恢复',font=font(29),fill='#302d36')
d.text((28,65),'原画布941×1672；鼻底—下巴裁框(414,215)–(476,273)，全部使用同一坐标。',font=font(20),fill='#59515c')
for x,label,img in zip([28,450,872,1294],['原彩图','4.4 干净着色','5 效果全开候选','原图 + 候选各50%'],[rc,ic,cc,mix]):cell(out,img,x,113,label)
d.text((28,520),'仅补下唇下方可见柔暗区；下唇遮挡的成因归属为推断。唇面宽广柔亮保留自身颜色，不另加硬白反光。',font=font(19),fill='#59515c')
for x,label,img in zip([28,450,872,1294],['全部效果关闭＝4.4','效果开启','实际效果独显（灰底）','完整柔影／表面裁切前'],[rgb(Q/'all-effects-off-closeup.png'),cm,rgb(Q/'effect-only.png','#DFE3E7'),rgb(Q/'effect-full-before-surface-clip.png','#DFE3E7')]):cell(out,img,x,570,label,h=217)
d.text((28,843),'v2：模糊后按实际下唇透明度排除唇面，保留柔边后的皮肤受影；合口线与皮肤表面裁切仍有效。',font=font(20),fill='#59515c')
cell(out,rgb(Q/'effect-complete-path.png','#DFE3E7'),28,899,'保存的完整效果路径',h=217)
cell(out,rgb(Q/'target-skin-support.png','#DFE3E7'),450,899,'承影面：完整下方皮肤',h=217)
d.text((872,899),'正常尺寸面部 1×',font=font(21),fill='#302d36')
for x,label,img in [(900,'原图',ref),(1160,'4.4',clean),(1420,'5',candidate)]:
 d.text((x,944),label,font=font(20),fill='#59515c');out.paste(img.crop((389,164,501,274)),(x,980))
d.text((28,1196),'显隐验证：全效果关闭恢复4.4；关闭下唇来源和此柔影，与4.4关闭同来源的画面相同。',font=font(20),fill='#514a55')
d.text((28,1240),'保留全部11个嘴周皮肤色区、6层唇色及口内补全。没有修改几何、正式合口线或双眼。',font=font(20),fill='#514a55')
d.text((28,1284),'fx_mouth_lower_lip_on_surround_skin：来源下唇完整形；承载嘴下皮肤；跟随 mouth_lower。',font=font(20),fill='#514a55')
d.text((28,1328),'口内不可见投影与独立高光均未新增。正常默认仍闭嘴，不露牙舌，也未制作表情或变形。',font=font(20),fill='#514a55')
d.text((28,1390),'候选提交第6步成稿审查；本页为本阶段自查证据。',font=font(21),fill='#514a55')
out.save(P/'对照.png')
def arr(p):return np.array(Image.open(p).convert('RGBA')).astype(int)
def diff(pa,pb):
 a=arr(pa);b=arr(pb);z=np.abs(a-b);ys,xs=np.where(np.any(z>0,axis=2));return {'changed_pixels':len(xs),'max_channel_delta':int(z.max()),'bbox':None if not len(xs) else [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]}
checks={'all_effects_off_vs_clean_1x':diff(Q/'all-effects-off.png',Q/'clean-default.png'),'all_effects_off_vs_clean_24x':diff(Q/'all-effects-off-closeup.png',Q/'clean-closeup.png'),'source_and_effect_hidden_vs_clean_source_hidden':diff(Q/'candidate-source-and-effect-hidden.png',Q/'clean-source-hidden.png'),'mouth_hidden_before_after':diff(Q/'candidate-mouth-hidden.png',Q/'clean-mouth-hidden.png'),'default_vs_internal_hidden_24x':diff(Q/'candidate-closeup.png',Q/'internal-hidden-closeup.png'),'actual_effect_contribution_1x':diff(P/'preview.png',Q/'clean-default.png'),'actual_effect_contribution_24x':diff(Q/'candidate-closeup.png',Q/'clean-closeup.png')}
a=arr(Q/'candidate-closeup.png');b=arr(Q/'clean-closeup.png');lip=arr(Q/'protected-lip-support.png')[:,:,3];effect=arr(Q/'effect-only.png')[:,:,3];target=arr(Q/'target-skin-support.png')[:,:,3]
checks['protected_visible_lip_and_line_24x']={'changed_pixels':int((np.any(a!=b,axis=2)&(lip>0)).sum()),'changed_fully_opaque_pixels':int((np.any(a!=b,axis=2)&(lip==255)).sum()),'max_channel_delta':int(np.abs(a-b)[lip>0].max())}
checks['effect_clip_24x']={'nonzero_alpha_pixels':int((effect>0).sum()),'outside_target_surface_pixels':int(((effect>0)&(target==0)).sum()),'over_fully_opaque_lip_pixels':int(((effect>0)&(lip==255)).sum()),'full_path_nonzero_pixels':int((arr(Q/'effect-complete-path.png')[:,:,3]>0).sum()),'full_soft_effect_before_clip_pixels':int((arr(Q/'effect-full-before-surface-clip.png')[:,:,3]>0).sum())}
probes=[(437,250),(439,250),(441,250),(443,250),(445,250),(447,250),(449,250),(451,250),(443,251),(445,251),(447,251),(445,252),(445,253)]
checks['source_probe_comparison']=[{'pixel':p,'reference_rgb':ref.getpixel(p),'clean_rgb':clean.getpixel(p),'candidate_rgb':candidate.getpixel(p),'max_channel_error':int(np.max(np.abs(np.array(ref.getpixel(p))-np.array(candidate.getpixel(p)))))} for p in probes]
checks['candidate_sha256']=hashlib.sha256((P/'character.svg').read_bytes()).hexdigest()
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=False,indent=2))
