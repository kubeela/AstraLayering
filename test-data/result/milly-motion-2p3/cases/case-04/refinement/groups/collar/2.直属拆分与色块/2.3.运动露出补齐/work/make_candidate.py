from pathlib import Path
import json, re, xml.etree.ElementTree as ET

work=Path(__file__).resolve().parent
original=(work/'input.groups.svg').read_text()
root=ET.fromstring(original)
parent=next(e for e in root.iter() if e.get('id')=='collar-silhouette')
outer=parent.get('d').split('M ')[1]
points=[(float(x),float(y)) for x,y in re.findall(r'([0-9.]+),([0-9.]+)',outer)]
# Keep the bound guide's shoulder/side contour, including its original conversion margin.
# Only the arch behind the neck and the bottom hidden by the upper body are simplified.
start=points.index((107.5,398.0))
left=points.index((307.5,254.0))
right=next(i for i in range(350,len(points)) if points[i][0]>=454.5)
end=points.index((652.5,398.0))
xy=lambda p:f'{p[0]:g},{p[1]:g}'
commands=['M '+xy(points[start])]+['L '+xy(p) for p in points[start+1:left+1]]
commands+=['C 332,243 356,238 380,238',f'C 404,238 430,245 {xy(points[right])}']
commands+=['L '+xy(p) for p in points[right+1:end+1]]
commands+=['L 107.5,398 Z']
d=' '.join(commands)
back_desc='后领位于颈部、肩部与上身后方；保留两肩可见外缘，以平滑宽拱跨过颈后，底边延至 y=398，为颈部转动及肩部相对位移后的领口露出留余量。'
back=f'<g id="collar--collar_back" data-part-path="collar/collar_back"><desc>{back_desc}</desc><path id="collar--collar_back-silhouette" d="{d}" fill="#769ead" stroke="none" /></g>'
body_tag='<g id="upper_body" data-group-path="upper_body">'
assert original.count(body_tag)==1
candidate=original.replace(body_tag,back+body_tag,1)
front_tag='<g id="collar--collar_front" data-part-path="collar/collar_front">'
assert candidate.count(front_tag)==1
candidate=candidate.replace(front_tag,front_tag+'<desc>前领既有闭合底形覆盖完整，外缘及 V 形开口保持原样；颈后和肩后露出由同级 collar_back 独立承接。</desc>',1)
(work/'candidate.svg').write_text(candidate)
patch={'groups':[],'parts':[{'name':'collar_back','note':'衣领后片，独立置于颈部、肩部和上身后方；宽拱跨过颈后并延至肩后，承接转颈和相对摆动的露出，沿用父稿两肩外缘。'}]}
(work/'children.json').write_text(json.dumps(patch,ensure_ascii=False,indent=2)+'\n')
print('candidate:',work/'candidate.svg')
print('hidden arch joins:',points[left],points[right])
