import sys,json
from color_common import *
eye=sys.argv[1];left=eye=='eye_left';doc,source,out,tmp=start(eye,2)
cx,cy=(470.15,196.25) if left else (418.2,196.6)
colors=['#789BB9','#9EC3E2','#C4DDF4','#ACC5E3'] if left else ['#7397B6','#7FA8D0','#A7BEE1','#9BB5D6']
fill=gradient(doc,eye+'_iris_intrinsic_gradient',[(0,colors[0],1),(.4,colors[1],1),(.73,colors[2],1),(1,colors[3],1)],x1=0,y1=196,x2=0,y2=203.5)
node(doc,eye+'_iris').set('fill',fill)
pc='#2A3C63' if left else '#13244B';pe='#6483A9' if left else '#5573A1'
pf=radial(doc,eye+'_pupil_intrinsic_gradient',[(0,pc,1),(.68,pc,1),(.88,pc,.88),(1,pe,.65)],469.3 if left else 418.15,197.2 if left else 197.4,2.1 if left else 1.95,2.6)
node(doc,eye+'_pupil').set('fill',pf)
light=radial(doc,eye+'_iris_lower_color_diffusion',[(0,colors[2],.38),(.45,colors[2],.22),(1,colors[2],0)],466.4 if left else 414.7,201.0,5,3.2)
g=el('g',id=eye+'_iris_intrinsic_tone',data_role='intrinsic-iris-color',data_gaze_owner=eye+'_gaze')
g.append(el('use',id=eye+'_iris_lower_tone_surface',href='#'+eye+'_iris_geometry',fill=light,stroke='none'))
eb=node(doc,eye+'_eyeball');eb.insert(list(eb).index(node(doc,eye+'_pupil')),g)
notes=f'''原图明确呈现蓝色虹膜的连续深浅变化，没有可以稳定辨认的放射花纹、星形或刻线。本步使用 `{eye}_iris_intrinsic_gradient`（纵向连续渐变）和 `{eye}_iris_lower_color_diffusion`（下部局部色差）覆盖同一完整虹膜源，没有描出新色环或外围亮圈。基础源和尺寸不变。

自身颜色从 `{colors[0]}` 经色盘中部 `{colors[1]}`、下部 `{colors[2]}` 到边缘过渡 `{colors[3]}`；端点中间色为原图色盘蓝色的柔和混合，并非生成板取色。上方这里仅保留虹膜本色的中深蓝，不烘焙贴着上眼睑的近黑横向暗带。约 y195–197 的外来遮挡投影留给 5.4，届时位于固定眼裂坐标而不跟随 gaze。

瞳孔 `{eye}_pupil_intrinsic_gradient` 保持已审瞳孔轮廓、中心和变换，只让外围颜色/透明度向虹膜缓和；深色核心为色盘 `{pc}`。`{eye}_iris_intrinsic_tone` 和瞳孔均归本眼 gaze，已有眼白/眼裂双重裁切保持。下部色差是连续色面，不是新增独立反光。

额外证据 `iris-full-color.png` 展示完整隐藏底形，`iris-gaze-offset.png` 在副本将本眼 gaze 平移 (2,0)，检查自身颜色随眼珠移动；正式控制未改。眼周皮肤、睫毛、独立高光、外来投影均未在本步制作。
'''
report=finish(doc,source,out,tmp,eye,2,{'intrinsic_nodes':[eye+'_iris_intrinsic_gradient',eye+'_iris_lower_color_diffusion',eye+'_pupil_intrinsic_gradient',eye+'_iris_intrinsic_tone'],'notes':notes})
def full(d):
 for x in d.xpath('//*[@data-part]'):
  if x.get('id')!=eye:x.set('display','none')
 for x in node(d,eye):
  if isinstance(x.tag,str) and x.tag.endswith('g') and x.get('id')!=eye+'_interior':x.set('display','none')
 for s in ['interior','aperture_window']:node(d,eye+'_'+s).attrib.pop('clip-path',None)
 node(d,eye+'_highlight').set('display','none')
local(doc,tmp/'iris-full-color.svg',tuple(report['box']),30,full)
local(doc,tmp/'iris-gaze-offset.svg',tuple(report['box']),30,lambda d:node(d,eye+'_gaze').set('transform','translate(2 0)'))
print(json.dumps({k:v for k,v in report.items() if k!='details'},ensure_ascii=False,indent=2))
