from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,numpy as np
P=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.3.睫毛与眼皮着色');Q=P/'evidence';font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def rgba(p):return Image.open(p).convert('RGBA')
def white(p,color='white'):
 im=rgba(p);b=Image.new('RGBA',im.size,color);b.alpha_composite(im);return b.convert('RGB')
ref=white('references/base-subject.png');before=white(Q/'input-rerender.png');final=white(P/'preview.png')
page=Image.new('RGB',(1440,885),'#eeeeef');d=ImageDraw.Draw(page)
for k,(im,title) in enumerate([(ref,'原彩图'),(before,'4.2 输入'),(final,'4.3 睫毛、褶线着色'),(Image.blend(ref,final,.5),'50% 同坐标混合')]):
 x=k*360;d.text((x+12,12),title,font=font,fill='#292b34');page.paste(im.crop((382,167,502,277)).resize((360,330)),(x,44))
 d.text((x+12,388),'眼部 9x · 同坐标',font=font,fill='#292b34');page.paste(im.crop((397,188,437,211)).resize((360,207)),(x,420))
 d.text((x+12,641),'原尺寸 1x',font=font,fill='#292b34');page.paste(im.crop((382,167,502,230)),(x+120,673))
d.text((16,780),'上、下睫毛根部与眼睑使用同一坐标颜色；暖粉褶线向内端消退。未增加泪痣或新毛束。',font=font,fill='#292b34')
d.text((16,821),'眼白、眼黑与眼睑颜色不变。眼周宽面肤色待4.4，外来投影与独立高光待第5步。',font=font,fill='#292b34');page.save(P/'对照.png')
page=Image.new('RGB',(1440,820),'#eeeeef');d=ImageDraw.Draw(page)
items=[('upper-lashes','上睫毛完整源形','white'),('lower-lashes','下睫毛完整源形','white'),('fold','眼皮褶线 / 暖粉、端部消退','white'),('lids-without-lashes','眼睑 / 4.1 颜色保持','white'),('lid-lash-junctions','眼睑＋睫毛 / 根部连接','white'),('final-isolated','全眼独显 / 几何保持','white')]
for k,(n,title,bg) in enumerate(items):
 x=k%3*480;y=k//3*405;d.text((x+12,y+12),title,font=font,fill='#292b34');page.paste(white(Q/(n+'.png'),bg).resize((480,299)),(x,y+49))
page.save(Q/'装饰独显与连接.png')
page=Image.new('RGB',(1440,830),'#eeeeef');d=ImageDraw.Draw(page)
for k,(n,title) in enumerate([('input-normal-closeup','4.2 正常前发遮挡'),('final-normal-closeup','4.3 正常前发遮挡'),('input-nohair','4.2 仅证据隐藏头发'),('final-nohair','4.3 仅证据隐藏头发')]):
 x=k%2*720;y=k//2*409;d.text((x+12,y+12),title,font=font,fill='#292b34');page.paste(white(Q/(n+'.png')).resize((600,373)),(x+60,y+42))
page.save(Q/'前发层序与根部对照.png')
a=np.array(before).astype(int);b=np.array(final).astype(int);diff=np.abs(a-b);ys,xs=np.nonzero(diff.max(axis=2))
checks={'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'normal_render_changed_pixels':int(len(xs)),'normal_render_changed_bbox':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)],'changes_outside_eye_roi_397_188_437_211':int(np.count_nonzero((xs<397)|(xs>=437)|(ys<188)|(ys>=211)))}
# Compare the two gradient fields mathematically throughout actual overlap coordinates.
from lxml import etree as E
r=E.parse(str(P/'character.svg'))
def gradient(id,x):
 g=r.xpath('//*[@id="'+id+'"]')[0];t=(x-float(g.get('x1')))/(float(g.get('x2'))-float(g.get('x1')))
 stops=[]
 for e in g:
  h=e.get('stop-color').lstrip('#');stops.append((float(e.get('offset')),np.array([int(h[i:i+2],16) for i in (0,2,4)]+[255*float(e.get('stop-opacity','1'))])))
 if t<=stops[0][0]:return stops[0][1]
 if t>=stops[-1][0]:return stops[-1][1]
 for (x0,c0),(x1,c1) in zip(stops,stops[1:]):
  if x0<=t<=x1:return c0+(c1-c0)*(t-x0)/(x1-x0)
checks['upper_lid_lash_overlap_max_rgba_difference']=float(max(np.abs(gradient('eye41_right_upper_lid_color',x)-gradient('eye43_right_upper_lashes_color',x)).max() for x in np.linspace(405.4,409.51,100)))
checks['lower_lid_lash_overlap_max_rgba_difference']=float(max(np.abs(gradient('eye41_right_lower_lid_color',x)-gradient('eye43_right_lower_lashes_color',x)).max() for x in np.linspace(406.05,410.91,100)))
(Q/'render-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(checks,ensure_ascii=False,indent=2))
