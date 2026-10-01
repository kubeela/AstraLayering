from pathlib import Path
import copy
import json
import xml.etree.ElementTree as ET

work = Path(__file__).resolve().parent
ns = 'http://www.w3.org/2000/svg'
ET.register_namespace('', ns)
def tag(name): return '{' + ns + '}' + name
root = ET.parse(work / 'input.groups.svg').getroot()
side = root.find(".//*[@id='shoe--shoe_side']")
shape = side.find(tag('path'))
d = shape.get('d')
start = 'L 251.00,410.50 '
end = 'L 363.50,282.00 '
a = d.index(start) + len(start)
b = d.index(end, a) + len(end)
# This entire seam lies behind shoe_front. Keep the exposed right/bottom edge intact.
shape.set('d', d[:a] + 'C 251.00,393.50 262.50,373.00 278.50,352.50 C 297.00,328.50 317.00,304.00 335.00,285.00 C 342.50,277.00 354.00,273.00 363.50,282.00 ' + d[b:])
ET.SubElement(side, tag('desc')).text = '鞋侧上端被 shoe_front 遮挡；踝部转动及鞋面相对错动时，上方斜接缝可能露出。沿原斜向结构向鞋面内部延伸约 10–20 px，保留右侧、鞋跟及下缘原轮廓。'
front = root.find(".//*[@id='shoe--shoe_front']")
ET.SubElement(front, tag('desc')).text = '鞋前含完整鞋舌、鞋面及鞋头，位于鞋侧前方；已有闭合范围足够，本轮沿用原色块和全部边缘。'

# Follow the existing rear opening's visible contour; close its hidden underside smoothly.
parent_d = root.find(".//*[@id='shoe-silhouette']").get('d')
import re
pts = [(float(x), float(y)) for x, y in re.findall(r'[ML] ([\d.]+),([\d.]+)', parent_d)]
left_start = pts.index((187.0,281.5))
left_end = pts.index((219.5,205.0))
left = [(x+2,y) for x,y in pts[left_start:left_end+1]]
right_start = pts.index((341.5,214.0))
right_end = pts.index((366.0,278.5))
right = [(x-2,y) for x,y in pts[right_start:right_end+1]]
back_d = 'M 189.00,281.50 ' + ' '.join('L %.2f,%.2f' % p for p in left[1:])
back_d += ' C 237.00,198.00 253.00,198.00 270.00,199.50 C 293.00,201.00 320.00,208.00 339.50,214.00 '
back_d += ' '.join('L %.2f,%.2f' % p for p in right[1:])
back_d += ' C 359.00,296.00 340.00,315.00 313.00,323.00 C 287.00,331.00 252.00,329.00 226.00,317.00 C 205.00,307.00 192.00,295.00 189.00,281.50 Z'
back = ET.Element(tag('g'), {'id':'shoe--shoe_back','data-part-path':'shoe/shoe_back'})
ET.SubElement(back, tag('desc')).text = '鞋口后内壁；位于 lower_leg/right_lower_leg、shoe_side 和 shoe_front 后。小腿侧摆或踝部转动后会露出鞋口两侧，故以完整闭合底形跨过小腿遮挡区，向下延伸至 y≈328 接住鞋面；上方沿现有鞋口弧度，父级范围不变。'
ET.SubElement(back, tag('path'), {'id':'shoe--shoe_back-silhouette','d':back_d,'fill':'#78b79a','stroke':'none'})
root.insert(list(root).index(root.find(".//*[@id='lower_leg']")), back)
ET.ElementTree(root).write(work / 'candidate.groups.svg', encoding='utf-8', xml_declaration=True)
children = {'groups': [], 'parts': [{'name':'shoe_back','note':'shoe 的鞋口后内壁，叠于小腿和鞋前/鞋侧之后；小腿侧摆及踝部转动会露出鞋口两侧，以跨过小腿遮挡区的闭合底形向下承接鞋面并留余量。'}]}
(work / 'children.draft.json').write_text(json.dumps(children, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('candidate.groups.svg + children.draft.json')
