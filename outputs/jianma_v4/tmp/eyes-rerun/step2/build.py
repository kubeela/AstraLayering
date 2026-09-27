from pathlib import Path
from lxml import etree as E
import json
root=Path('.')
source=root/'refinement/groups/face/6.投影与高光效果/character.svg'
out=root/'refinement/groups/eyes/2.眼型校准与轮廓部件绘制'
out.mkdir(parents=True,exist_ok=True)
tree=E.parse(str(source)); svg=tree.getroot(); NS='http://www.w3.org/2000/svg'
def el(tag,**attrs): return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def sub(parent,tag,**attrs):
 n=el(tag,**attrs); parent.append(n); return n
def title(parent,text): sub(parent,'title').text=text
svg.find('{'+NS+'}title').text='剑妈 · 完整分层稿 · eyes 第2步眼型与轮廓校准'
defs=svg.find('{'+NS+'}defs')
# Colors are from the newly sampled palette only.
palette=json.loads((root/'refinement/groups/eyes/1.眼部色盘/palette.json').read_text(encoding='utf-8'))
colors={s['id']:s['hex'] for s in palette['samples']}
def gradient(id,x1,y1,x2,y2,stops):
 g=sub(defs,'linearGradient',id=id,gradientUnits='userSpaceOnUse',x1=x1,y1=y1,x2=x2,y2=y2)
 for offset,color,opacity in stops: sub(g,'stop',offset=offset,stop_color=color,stop_opacity=opacity)
 return g
specs={
 'eye_right':{
 'name':'角色右眼（画面左）',
 'sclera':'M 406.1,197.6 C 407.4,194.6 411.2,193.75 416.5,194.1 C 422.5,194.35 428.15,197.35 431.3,201.5 C 427.85,201.5 424.7,203.65 418.3,203.9 C 412.6,204.05 408.6,201.7 407.05,199.65 C 406.55,198.95 406.2,198.25 406.1,197.6 Z',
 'upper':'M 405.6,199.65 C 405.9,196.8 407.1,194.3 409.45,193.65 C 412.5,192.95 417.1,193.4 421.5,194.4 C 426.05,195.45 429,198.05 431.55,201.8 C 428.2,200.4 426.1,197.4 422.1,196.2 C 417.6,194.9 412.4,194.65 409.3,196.1 C 407.95,196.75 407.25,198.25 407.15,199.75 C 406.6,199.95 406.15,199.9 405.6,199.65 Z',
 'lower':'M 407.05,198.85 C 409.1,201.55 412.65,203.15 417.95,203.35 C 423.45,203.4 426.9,202.05 430.65,201.65 C 427.45,203.1 423.8,204.15 418.25,204.28 C 412.1,204.2 408.5,202.3 406.1,200.05 Z',
 'iris':'M 425.55,196.35 C 425.55,200.52 422.57,203.9 418.9,203.9 C 415.23,203.9 412.25,200.52 412.25,196.35 C 412.25,192.18 415.23,188.8 418.9,188.8 C 422.57,188.8 425.55,192.18 425.55,196.35 Z',
 'x':(405,431), 'white':('01','02'), 'iris_color':'06', 'ink':'11', 'edge':'12', 'warm':'21'},
 'eye_left':{
 'name':'角色左眼（画面右）',
 'sclera':'M 455.9,201.45 C 460.45,196.5 465.4,194.05 471.55,193.65 C 477,193.3 480.65,194.1 481.8,197.45 C 481.6,198.9 480.4,200.7 478.85,201.6 C 475.8,203.65 471.85,204.05 467.7,203.6 C 462.9,203.15 460.2,201.4 455.9,201.45 Z',
 'upper':'M 455.55,201.8 C 459.85,196.35 465.1,193.3 471.5,193 C 476.9,192.75 480.1,193.6 481.1,195 C 481.8,196.25 482,197.45 482.1,198.75 L 480.65,199.45 C 480.15,197.6 478.6,196.15 475.95,195.4 C 472.4,194.45 466.9,195 463.65,196.55 C 460.15,198.15 458.7,200.6 455.55,201.8 Z',
 'lower':'M 457.1,201.55 C 461.1,202.05 463.4,203.05 467.55,203.1 C 473.75,203.65 477.85,201.85 480.65,199.05 L 482.05,198.35 C 481.7,200 480.35,201.65 478.4,202.8 C 474.9,204.55 470.85,204.7 467.1,204.05 C 462.8,203.75 460.55,202.7 457.1,201.55 Z',
 'iris':'M 476.65,196.15 C 476.65,200.42 473.58,203.88 469.8,203.88 C 466.02,203.88 462.95,200.42 462.95,196.15 C 462.95,191.88 466.02,188.42 469.8,188.42 C 473.58,188.42 476.65,191.88 476.65,196.15 Z',
 'x':(456,484), 'white':('03','04'), 'iris_color':'09', 'ink':'13', 'edge':'14', 'warm':'22'}
}
for part,s in specs.items():
 x1,x2=s['x']
 gradient(part+'_sclera_color',x1,200,x2,200,[(0,colors[s['white'][0]],1),(1,colors[s['white'][1]],1)])
 if part=='eye_right':
  upper_stops=[(0,colors[s['ink']],1),(.6,colors[s['ink']],1),(1,colors[s['edge']],1)]
  lower_stops=[(0,colors[s['edge']],1),(.35,colors[s['edge']],.8),(.6,colors[s['warm']],.76),(1,colors[s['warm']],.38)]
 else:
  upper_stops=[(0,colors[s['edge']],1),(.42,colors[s['ink']],1),(1,colors[s['ink']],1)]
  lower_stops=[(0,colors[s['warm']],.35),(.35,colors[s['warm']],.65),(.75,colors[s['edge']],.88),(1,colors[s['edge']],1)]
 gradient(part+'_upper_lid_color',x1,196,x2,196,upper_stops)
 gradient(part+'_lower_lid_color',x1,203,x2,203,lower_stops)
 clip=sub(defs,'clipPath',id=part+'_sclera_clip',clipPathUnits='userSpaceOnUse')
 sub(clip,'use',href='#'+part+'_sclera_shape')
 eye=svg.xpath('//*[@id=$id]',id=part)[0]
 eye.attrib.pop('fill',None)
 for child in list(eye): eye.remove(child)
 title(eye,s['name']+' · 独立眼白与上下眼睑')
 sclera=sub(eye,'g',id=part+'_sclera',data_part=part,data_kind='eyes',data_category='contour',data_role='sclera')
 title(sclera,'完整连续眼白；上缘和外侧在眼睑与发束下补全')
 sub(sclera,'path',id=part+'_sclera_shape',d=s['sclera'],fill='url(#'+part+'_sclera_color)')
 inside=sub(eye,'g',id=part+'_contents',data_part=part,data_kind='eyes',data_category='interior',clip_path='url(#'+part+'_sclera_clip)')
 iris=sub(inside,'g',id=part+'_eye_black',data_part=part,data_kind='eyes',data_role='eye-black',data_stage='base-only')
 title(iris,'替换原整眼蓝色占位的完整虹膜底形；眼黑细化留待下一步')
 sub(iris,'path',id=part+'_iris_base',d=s['iris'],fill=colors[s['iris_color']])
 lower=sub(eye,'g',id=part+'_lower_lid',data_part=part,data_kind='eyes',data_category='contour',data_role='lower-eyelid')
 title(lower,'外侧较实、向内眼角淡出的暖色下眼睑边界')
 sub(lower,'path',id=part+'_lower_lid_shape',d=s['lower'],fill='url(#'+part+'_lower_lid_color)')
 upper=sub(eye,'g',id=part+'_upper_lid',data_part=part,data_kind='eyes',data_category='contour',data_role='upper-eyelid')
 title(upper,'上眼睑开合边界；外侧厚、内眼角收尖')
 sub(upper,'path',id=part+'_upper_lid_shape',d=s['upper'],fill='url(#'+part+'_upper_lid_color)')
svg.set('data-refinement-group','eyes'); svg.set('data-refinement-step','2')
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
print(out/'character.svg')
