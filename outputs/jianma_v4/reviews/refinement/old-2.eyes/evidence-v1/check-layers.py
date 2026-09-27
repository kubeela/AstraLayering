from pathlib import Path
import xml.etree.ElementTree as ET
import re, json, hashlib, copy
ET.register_namespace('', 'http://www.w3.org/2000/svg')
out=Path(__file__).resolve().parent
root=out.parents[3]
candidate=root/'reviews/refinement/eyes/candidates/character-v1.svg'
data=candidate.read_bytes()
svg=ET.fromstring(data)
ids={}
duplicates=[]
for e in svg.iter():
    id=e.get('id')
    if id:
        if id in ids: duplicates.append(id)
        ids[id]=e
refs=[]
for e in svg.iter():
    for k,v in e.attrib.items():
        for rid in re.findall(r'url\(#([^)]*)\)',v): refs.append((e.get('id'),k,rid))
        if (k.endswith('href') and v.startswith('#')): refs.append((e.get('id'),k,v[1:]))
        if k in ['data-source-id','data-target-id','data-follows-id','data-carrier-id','data-source-part','data-target-part']: refs.append((e.get('id'),k,v))
parts=re.findall(r'^  - id: (.+)$',(root/'structure/parts.yaml').read_text('utf-8'),re.M)
parents={c:p for p in svg.iter() for c in p}
fx=[]
for e in svg.iter():
    if e.get('data-part') in ['eye_left','eye_right'] and e.get('data-effect'):
        p=parents.get(e)
        ancestry=[]
        while p is not None:
            ancestry.append(p.get('id') or p.tag.split('}')[-1]);p=parents.get(p)
        fx.append({'attributes':e.attrib,'ancestors':ancestry})
manifest={'sha256':hashlib.sha256(data).hexdigest().upper(),'id_count':len(ids),'duplicate_ids':duplicates,'missing_reference_targets':[r for r in refs if r[2] not in ids],'missing_part_ids':[p for p in parts if p not in ids],'part_count':len(parts),'image_nodes':[e.attrib for e in svg.iter() if e.tag.endswith('}image')],'effects':fx}
def hide(e):e.set('display','none')
def variant(name,predicate):
    r=copy.deepcopy(svg)
    for e in r.iter():
        if predicate(e):hide(e)
    ET.ElementTree(r).write(out/(name+'.svg'),encoding='utf-8',xml_declaration=True)
def eye(e):return e.get('data-part') in ['eye_left','eye_right']
for side in ['right','left']:
    part='eye_'+side
    variant(side+'-eye-off', lambda e,p=part:e.get('data-part')==p or e.get('data-source-part')==p or e.get('data-target-part')==p)
variant('both-eyes-off',eye)
variant('front-hair-and-shadows-off',lambda e:e.get('id') in ['hair_front_right','hair_front_left'] or e.get('data-source-part') in ['hair_front_right','hair_front_left'])
variant('upper-lids-and-shadows-off',lambda e:e.get('id') in ['eye_right_upper_lid','eye_left_upper_lid'] or e.get('data-source-id') in ['eye_right_upper_lid','eye_left_upper_lid'])
variant('eye-shadows-off',lambda e:eye(e) and e.get('data-effect')=='cast-shadow')
variant('eye-highlights-off',lambda e:eye(e) and e.get('data-effect')=='highlight')
for name,selected in [('isolated-sclera',['eye_right_sclera','eye_left_sclera']),('isolated-complete-eye-black',['eye_right_eye_black','eye_left_eye_black'])]:
    r=ET.Element(svg.tag,svg.attrib)
    r.append(copy.deepcopy(svg.find('{http://www.w3.org/2000/svg}defs')))
    ET.SubElement(r,'{http://www.w3.org/2000/svg}rect',{'x':'0','y':'0','width':'941','height':'1672','fill':'#d9d9d9'})
    for id in selected:r.append(copy.deepcopy(ids[id]))
    ET.ElementTree(r).write(out/(name+'.svg'),encoding='utf-8',xml_declaration=True)
variant('eye-contents-unclipped',lambda e:False)
p=out/'eye-contents-unclipped.svg'
r=ET.parse(p).getroot()
for e in r.iter():
    if e.get('id') in ['eye_right_contents','eye_left_contents']: e.attrib.pop('clip-path',None)
    if e.get('id') in ['hair_front_right','hair_front_left'] or e.get('data-source-part') in ['hair_front_right','hair_front_left']: hide(e)
ET.ElementTree(r).write(p,encoding='utf-8',xml_declaration=True)
(out/'structure-verification.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps({k:v for k,v in manifest.items() if k!='effects'},ensure_ascii=False))
