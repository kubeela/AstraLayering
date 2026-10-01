from pathlib import Path
import re
import json
import xml.etree.ElementTree as ET

work = Path(__file__).resolve().parent
original = (work / 'input.groups.svg').read_text(encoding='utf-8')
root = ET.fromstring(original)
ns = {'s':'http://www.w3.org/2000/svg'}
back = root.find("s:g[@id='skirt_back']",ns)
old_path = back.find('s:path',ns).get('d')
# Only the lower edge changes. Retain the upper arch and its side connections.
right_join = 'L 1099.50,745.00'
left_join = 'L 94.50,744.00'
assert old_path.count(right_join) == old_path.count(left_join) == 1
prefix = old_path.split(right_join,1)[0] + right_join
retained = old_path.split(left_join,1)[1]
new_path = (prefix + ' C 995,771 795,792 600,792 '
            'C 410,792 208,771 94.50,744.00' + retained)
assert original.count(old_path) == 1
candidate = original.replace(old_path,new_path)
back_desc = ('后片由前裙片与双腿遮挡。前裙摆相对上提约40px、双腿横移约30px时，'
             '中央及腿侧会露出后侧裙口；沿原后片下缘向遮挡内续接平滑弧底，'
             '中央由y≈734延伸至792，留出约15px的露出覆盖。'
             '沿用原拱顶、侧缘与叠放，前裙片可见轮廓不变。')
front_desc = ('前片腰口、侧边和褶裥裙摆已有完整闭合外形；'
              '本轮预期摆动未发现需要延长的同表面遮挡缺口，沿用原色块。')
for identity, desc in [('skirt_back',back_desc),('skirt_front',front_desc)]:
    pattern = r'(<g\b[^>]*\bid="'+identity+r'"[^>]*>)'
    candidate, count = re.subn(pattern,lambda m:m.group(1)+'<desc>'+desc+'</desc>',candidate,count=1)
    assert count==1
(work/'candidate.svg').write_text(candidate,encoding='utf-8')
patch={'groups':[],'parts':[]}
(work.parent/'children.json').write_text(json.dumps(patch,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# The controller owns the real tree. This is a validation-only copy.
tree=json.loads((work/'input.groups.json').read_text())
target=next(g for g in tree['groups'] if g['name']=='skirt')
target['groups'].extend(patch['groups'])
target['parts'].extend(patch['parts'])
(work/'temporary.groups.json').write_text(json.dumps(tree,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Matched hypothetical poses for visual checking only.
for version,source in [('before',original),('after',candidate)]:
    for name,front,right,left in [
        ('lift','translate(0 -40)','translate(-30 0)','translate(30 0)'),
        ('sway','translate(0 -25) rotate(2 600 100)','translate(25 0)','translate(-25 0)'),
    ]:
        pose=source
        for guide in ['skirt','legs']:
            pose=re.sub(r'(<g\b[^>]*\bid="'+guide+r'")',lambda m:m.group(1)+' style="display:none"',pose,count=1)
        for identity,transform in [('skirt_front',front),('right_thigh',right),('left_thigh',left)]:
            pose,count=re.subn(r'(<g\b[^>]*\bid="'+identity+r'")',
                lambda m:m.group(1)+' transform="'+transform+'"',pose,count=1)
            assert count==1
        (work/(version+'-'+name+'.svg')).write_text(pose,encoding='utf-8')
print('Draft, empty children patch, temporary tree and motion inspection poses created.')
