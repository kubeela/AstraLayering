from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,numpy as np
P=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.4.眼周皮肤明暗');Q=P/'evidence';font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def rgba(p):return Image.open(p).convert('RGBA')
def white(p,color='white'):
 im=rgba(p);b=Image.new('RGBA',im.size,color);b.alpha_composite(im);return b.convert('RGB')
ref=white('references/base-subject.png');before=white(Q/'input-rerender.png');final=white(P/'preview.png')
page=Image.new('RGB',(1600,990),'#eeeeef');d=ImageDraw.Draw(page)
for k,(im,title) in enumerate([(ref,'原彩图'),(before,'4.3 输入 / 本步关闭'),(final,'4.4 眼周层开启'),(Image.blend(ref,final,.5),'50% 同坐标混合')]):
 x=k*400;d.text((x+12,12),title,font=font,fill='#292b34');page.paste(im.crop((382,167,502,277)).resize((400,367)),(x,45))
 d.text((x+12,430),'眼窝至眼下 10x · 同坐标',font=font,fill='#292b34');page.paste(im.crop((397,183,437,215)).resize((400,320)),(x,466))
 d.text((x+12,804),'原尺寸 1x',font=font,fill='#292b34');page.paste(im.crop((382,167,502,230)),(x+140,837))
d.text((18,927),'保留上眼皮外深内浅、下眼缘外暗内亮的区别；眼周颜色全部属于 eye_right，可整体或逐层关闭。',font=font,fill='#292b34');page.save(P/'对照.png')
page=Image.new('RGB',(1440,1100),'#eeeeef');d=ImageDraw.Draw(page)
for k,(n,title,bg) in enumerate([('input-closeup','眼周关闭：精确恢复 4.3 输入','white'),('final-closeup','眼周开启：11 个独立皮肤材料层','white'),('skin-isolated','只显示本步新增层 / 眼球、眼线处排除','#d9dadd'),('final-nohair','仅证据隐藏头发：检查完整眼周范围','white')]):
 x=k%2*720;y=k//2*535;d.text((x+16,y+12),title,font=font,fill='#292b34');page.paste(white(Q/(n+'.png'),bg).resize((686,476)),(x+17,y+49))
page.save(Q/'眼周开启关闭与独显.png')
layers=json.loads((Q/'audit.json').read_text(encoding='utf-8'))['skin_layer_ids']
labels=['上眼窝暖肤面','上眼皮体积暗部','外侧粉棕可见色区','上眼皮内侧暖过渡','上眼皮柔亮面','外眼角暖粉皮肤','外下方粉肤过渡','下眼缘外围体积','眼下连续柔亮面','内眼角柔亮皮肤','内侧脸底衔接']
page=Image.new('RGB',(1440,930),'#eeeeef');d=ImageDraw.Draw(page)
for k,(id,label) in enumerate(zip(layers,labels)):
 x=k%4*360;y=k//4*308;d.text((x+12,y+12),label,font=font,fill='#292b34');page.paste(white(Q/(id+'.png'),'#e4dbd9').resize((350,243)),(x+5,y+47))
page.save(Q/'眼周颜色层独显.png')
pre=np.array(rgba(Q/'input-rerender.png')).astype(int);off=np.array(rgba(Q/'all-skin-off.png')).astype(int);post=np.array(rgba(P/'preview.png')).astype(int)
delta=np.abs(post-pre);ys,xs=np.nonzero(delta.max(axis=2));skin=np.array(rgba(Q/'skin-isolated.png'))[:,:,3];protected=np.array(rgba(Q/'protected-eye-mask.png'))[:,:,3]
checks={'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),
 'all_skin_off_vs_input_changed_pixels':int(np.count_nonzero(np.abs(off-pre).max(axis=2))),
 'all_skin_off_vs_input_max_channel_difference':int(np.abs(off-pre).max()),
 'normal_render_changed_pixels':int(len(xs)),'normal_render_changed_bbox':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],
 'skin_pixels_inside_fully_protected_eye_and_ink':int(np.count_nonzero((skin>0)&(protected==255))),
 'skin_max_alpha_inside_fully_protected_eye_and_ink':int(skin[protected==255].max()),
 'layer_nontransparent_pixel_counts':{id:int(np.count_nonzero(np.array(rgba(Q/(id+'.png')))[:,:,3])) for id in layers},
 'same_coordinate_skin_samples':{}}
for name,xy in [('upper_outer',(410,192)),('upper_volume',(416,192)),('upper_light',(416,189)),('upper_inner',(425,189)),('upper_inner_pink',(423,191)),('outer_corner',(406,205)),('lower_outer',(412,206)),('lower_plane',(420,208)),('inner_bridge',(435,204)),('lower_edge_volume',(411,204)),('lower_mid',(414,205)),('lower_center',(418,205)),('lower_inner',(422,205)),('inner_canthus',(432,201))]:
 checks['same_coordinate_skin_samples'][name]={'xy':xy,'reference':ref.getpixel(xy),'input':before.getpixel(xy),'final':final.getpixel(xy)}
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=False,indent=2))
