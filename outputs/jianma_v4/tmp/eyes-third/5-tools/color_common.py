from pathlib import Path
from lxml import etree as E
import json,hashlib,re
R=Path(__file__).resolve().parents[3]
APPROVED=R/'refinement/groups/eyes/3.双眼线稿组装与审查/character.svg'
STEPS=['5.1.基础色与线色','5.2.眼黑自身层次','5.3.眼周层次与妆色','5.4.投影与高光']
SVG='http://www.w3.org/2000/svg'
def node(doc,i):return doc.xpath('//*[@id=$v]',v=i)[0]
def el(tag,**attrs):return E.Element('{'+SVG+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
def parse(path):return E.parse(str(path)).getroot()
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def start(eye,n):
 if n>1:source=R/'refinement/groups/eyes/5.逐眼着色'/eye/STEPS[n-2]/'character.svg'
 elif eye=='eye_left':source=APPROVED
 else:source=R/'refinement/groups/eyes/5.逐眼着色/eye_left'/STEPS[3]/'character.svg'
 out=R/'refinement/groups/eyes/5.逐眼着色'/eye/STEPS[n-1];out.mkdir(parents=True,exist_ok=True)
 tmp=R/'tmp/eyes-third'/f'5.{n}-{eye.split("_")[-1]}';tmp.mkdir(parents=True,exist_ok=True)
 plan=json.loads((R/'refinement/groups/eyes/1.制作计划/plan.json').read_text(encoding='utf-8'))
 assert plan['eyes_symmetric'] is False and plan['mirror'] is None
 assert sha(R/'references/base-subject.png')==plan['reference_sha256']
 assert sha(APPROVED)=='91f84805f3766030c2f9290b1d266d6d2c5f4f569fbf895a13a3c672626a11ad'
 return parse(source),source,out,tmp
def adddef(doc,x):doc.find('{'+SVG+'}defs').append(x)
def gradient(doc,i,stops,**attrs):
 g=el('linearGradient',id=i,gradientUnits='userSpaceOnUse',**attrs)
 for offset,color,opacity in stops:g.append(el('stop',offset=offset,stop_color=color,stop_opacity=opacity))
 adddef(doc,g);return 'url(#'+i+')'
def radial(doc,i,stops,cx,cy,rx,ry):
 g=el('radialGradient',id=i,gradientUnits='userSpaceOnUse',cx=0,cy=0,r=1,gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for off,color,alpha in stops:g.append(el('stop',offset=off,stop_color=color,stop_opacity=alpha))
 adddef(doc,g);return 'url(#'+i+')'
def local(doc,path,box,scale=1,edit=None):
 d=E.fromstring(E.tostring(doc));d.set('viewBox',' '.join(map(str,box)));d.set('width',str(box[2]*scale));d.set('height',str(box[3]*scale))
 if edit:edit(d)
 path.write_bytes(E.tostring(d,encoding='utf-8',xml_declaration=True))
def finish(doc,source,out,tmp,eye,n,details):
 approved=parse(APPROVED);previous=parse(source);other='eye_right' if eye=='eye_left' else 'eye_left'
 ids=doc.xpath('//*[@id]/@id');assert len(ids)==len(set(ids))
 geom=['d','cx','cy','rx','ry','x','y','width','height','transform','points','clip-path','href']
 for old in approved.xpath('//*[@id]'):
  cur=node(doc,old.get('id'))
  for a in geom:assert old.get(a)==cur.get(a),(old.get('id'),a)
 # Existing approved geometry/relationships above are immutable. Any color/effect is current-eye owned.
 for old in previous.xpath('//*[@id]'):
  ident=old.get('id')
  if not (ident==eye or ident.startswith(eye+'_')):
   assert E.tostring(old,with_tail=False)==E.tostring(node(doc,ident),with_tail=False),ident
 for x in doc.iter():
  for k,v in x.attrib.items():
   if k.endswith('href') and v.startswith('#'):assert v[1:] in ids
   for ref in re.findall(r'url\(#([^)]*)\)',v):assert ref in ids
 assert len(set(doc.xpath('//*[@data-part]/@data-part')))==46
 assert all(x.get('display')=='none' for x in doc.xpath('//*[@data-role="construction-guide"]'))
 node(doc,eye).set('data-stage',STEPS[n-1])
 (out/'character.svg').write_bytes(E.tostring(doc,encoding='utf-8',xml_declaration=True))
 box=(449,184,44,30) if eye=='eye_left' else (393,184,44,30)
 local(doc,tmp/'candidate-eye-native.svg',box);local(doc,tmp/'candidate-eye-direct-30x.svg',box,30)
 local(doc,tmp/'candidate-eyes-native.svg',(390,175,109,47));local(doc,tmp/'candidate-eyes-direct-12x.svg',(390,175,109,47),12)
 local(doc,tmp/'candidate-head-native.svg',(374,108,149,168));local(doc,tmp/'candidate-head-direct-6x.svg',(374,108,149,168),6)
 local(previous,tmp/'before-eyes-direct-12x.svg',(390,175,109,47),12)
 def hair_off(d):
  for x in d.xpath('//*[@data-kind="hair" or @data-role="source-linked-hair-overlay"]'):x.set('display','none')
 local(doc,tmp/'hair-off-direct-30x.svg',box,30,hair_off)
 report={'eye':eye,'step':STEPS[n-1],'source':str(source.relative_to(R)),'input_sha256':sha(source),'candidate_sha256':sha(out/'character.svg'),'approved_line_art_sha256':sha(APPROVED),'unique_ids':len(ids),'unique_parts':46,'approved_geometry_and_relationships_unchanged':True,'all_other_eye_and_adjacent_existing_nodes_unchanged':True,'references_resolved':True,'guides_default_hidden':True,'full_lash_sources_and_controller_links_preserved':True,'details':details,'output':str(out),'evidence':str(tmp),'box':box}
 (tmp/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 return report
