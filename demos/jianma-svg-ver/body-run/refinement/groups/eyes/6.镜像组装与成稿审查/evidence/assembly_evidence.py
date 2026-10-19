from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,hashlib,numpy as np
P=Path('refinement/groups/eyes/6.镜像组装与成稿审查');Q=P/'evidence';font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def rgba(p):return Image.open(p).convert('RGBA')
def white(p,color='white'):
 im=rgba(p);b=Image.new('RGBA',im.size,color);b.alpha_composite(im);return b.convert('RGB')
ref=white('references/base-subject.png');before=white(Q/'input-rerender.png');final=white(P/'preview.png')
page=Image.new('RGB',(1600,980),'#eeeeef');d=ImageDraw.Draw(page)
for k,(im,title) in enumerate([(ref,'原彩图'),(before,'第5步主眼 / 组装前'),(final,'第6步双眼镜像候选'),(Image.blend(ref,final,.5),'50% 同坐标混合')]):
 x=k*400;d.text((x+12,12),title,font=font,fill='#292b34');page.paste(im.crop((382,167,502,277)).resize((400,367)),(x,45))
 d.text((x+12,430),'双眼同坐标 · 4x',font=font,fill='#292b34');page.paste(im.crop((394,180,494,217)).resize((400,148)),(x,466))
 d.text((x+12,636),'原尺寸 1x',font=font,fill='#292b34');page.paste(im.crop((382,167,502,230)),(x+140,671))
d.text((18,791),'锁定轴 x=444；只把 eye_right 完整镜像为 eye_left，未单侧位移、缩放、调眼裂或改头发。',font=font,fill='#292b34')
d.text((18,831),'两眼均有8层眼黑固有色、11层眼周皮肤、4项独立投影与1项高光，正式线条统一位于前发后。',font=font,fill='#292b34')
d.text((18,881),'本稿为待独立最终审查的候选，尚未发布最终 carry。',font=font,fill='#292b34');page.save(Q/'双眼同坐标对照.png')
page=Image.new('RGB',(1440,1110),'#eeeeef');d=ImageDraw.Draw(page)
items=[('both-eyes-closeup','双眼正常前发遮挡'),('both-eyes-isolated','双眼独显 / 完整眼组'),('right-eye-off','关闭 eye_right / eye_left 独立保留'),('left-eye-off','关闭 eye_left / eye_right 独立保留'),('all-effects-off-closeup','关闭双眼10项效果 / 保留固有色与眼周'),('before-assembly-closeup','镜像前输入 / 主眼未改')]
for k,(n,label) in enumerate(items):
 x=k%2*720;y=k//2*365;d.text((x+12,y+12),label,font=font,fill='#292b34');page.paste(white(Q/(n+'.png')).resize((700,238)),(x+10,y+57))
page.save(Q/'双眼独立显隐与效果关闭.png')
page=Image.new('RGB',(1440,1280),'#eeeeef');d=ImageDraw.Draw(page)
items=[('source-before-isolated','镜像前主眼'),('source-after-isolated','组装后主眼'),('target-isolated','完整镜像目标眼'),('source-gaze-isolated','主眼完整眼黑 / 8层材料'),('target-gaze-isolated','目标完整眼黑 / 8层材料'),('source-skin-isolated','主眼眼周 / 11层材料'),('target-skin-isolated','目标眼周 / 11层材料')]
for k,(n,label) in enumerate(items):
 x=k%3*480;y=k//3*415;d.text((x+12,y+12),label,font=font,fill='#292b34');page.paste(white(Q/(n+'.png'),'#e6dfdd' if 'skin-' in n else 'white').resize((470,326)),(x+5,y+49))
page.save(Q/'镜像源目标与独立材料.png')
audit=json.loads((Q/'audit.json').read_text(encoding='utf-8'));page=Image.new('RGB',(1440,825),'#eeeeef');d=ImageDraw.Draw(page)
labels=['目标上睑 → 眼白','目标下睑 → 眼白','目标上睑 → 虹膜','目标下睑 → 虹膜','目标独立眼内反光']
for k,(e,label) in enumerate(zip(audit['target_effects'],labels)):
 x=k%3*480;y=k//3*410;d.text((x+12,y+12),label,font=font,fill='#292b34');page.paste(white(Q/(e['id']+'.png'),'#b8bbc6' if e['data-effect']=='highlight' else 'white').resize((470,326)),(x+5,y+49))
page.save(Q/'目标眼五项效果独显.png')
def check(a,b):
 ar=np.array(a).astype(int);br=np.array(b).astype(int);diff=np.abs(ar-br);return {'changed_pixels':int(np.count_nonzero(diff.max(axis=2))),'max_channel_difference':int(diff.max())}
checks={'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),
 'source_before_vs_after':check(rgba(Q/'source-before-isolated.png'),rgba(Q/'source-after-isolated.png')),
 'target_vs_source_svg_mirrored_before_render':check(rgba(Q/'target-isolated.png'),rgba(Q/'expected-target-from-source.png')),
 'all_effects_off_vs_expected_mirrored_clean':check(rgba(Q/'all-effects-off.png'),rgba(Q/'expected-mirrored-clean.png')),
 'source_full_composite_eye_roi_394_182_443_216':check(rgba(Q/'input-rerender.png').crop((394,182,443,216)),rgba(P/'preview.png').crop((394,182,443,216)))}
checks['bitmap_flip_diagnostic']={'note':'Flipping an already rasterized PNG differs slightly from rendering mirrored SVG curves/filters; the SVG-before-render check above tests the actual required operation.'}
for name,a,b in [('entire_eye','source-after-isolated','target-isolated'),('gaze','source-gaze-isolated','target-gaze-isolated'),('skin','source-skin-isolated','target-skin-isolated')]:
 aa=ImageOps.mirror(white(Q/(a+'.png')));bb=white(Q/(b+'.png'));df=np.abs(np.array(aa).astype(int)-np.array(bb).astype(int));checks['bitmap_flip_diagnostic'][name]={'mean_rgb_difference_on_white':float(df.mean()),'max_channel_difference_on_white':int(df.max())}
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=False,indent=2))
