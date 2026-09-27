from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image,ImageOps
import copy,hashlib,json,re
ROOT=Path.cwd();OUT=ROOT/'reviews/refinement/mouth/evidence-v2';OUT.mkdir(parents=True,exist_ok=True)
NS='http://www.w3.org/2000/svg';ET.register_namespace('',NS)
FILES={
 'v1':'reviews/refinement/mouth/candidates/character-v1.svg',
 'v2':'reviews/refinement/mouth/candidates/character-v2.svg',
 'clean':'refinement/groups/mouth/4.分部件着色/4.4.嘴周皮肤明暗/character.svg',
 'lip':'refinement/groups/mouth/4.分部件着色/4.3.唇部颜色与层次/character.svg',
 'stage5':'refinement/groups/mouth/5.独立投影与高光/character.svg',
 'stage6':'refinement/groups/mouth/6.组装与成稿审查/character.svg',
 'lineart':'refinement/groups/mouth/2.嘴型校准与部件线稿/character.svg',
 'plan':'refinement/groups/mouth/1.制作计划/plan.json',
 'reference':'references/base-subject.png'
}
roots={k:ET.parse(ROOT/v).getroot() for k,v in FILES.items() if v.endswith('.svg')}
def ids(r):return {e.get('id'):e for e in r.iter() if e.get('id')}
def variant(r,hidden=(),isolate=()):
 r=copy.deepcopy(r);idx=ids(r)
 for n in hidden:idx[n].set('display','none')
 if isolate:
  result=ET.Element(r.tag,dict(r.attrib));defs=ET.SubElement(result,'{'+NS+'}defs')
  for e in r.iter():
   if e.tag.endswith('}defs'):
    for ch in e:defs.append(copy.deepcopy(ch))
  for n in isolate:result.append(copy.deepcopy(idx[n]))
  r=result
 return r
def save(n,r,box=None):
 r=copy.deepcopy(r)
 if box:
  x,y,w,h,s=box;r.set('viewBox',f'{x} {y} {w} {h}');r.set('width',str(w*s));r.set('height',str(h*s))
 ET.ElementTree(r).write(OUT/(n+'.svg'),encoding='utf-8',xml_declaration=True)
fx='fx_mouth_lower_lip_on_surround_skin'
views={k:roots[k] for k in ['v1','v2','clean']}
views['effects-off']=variant(roots['v2'],hidden=[fx])
views['internals-off']=variant(roots['v2'],hidden=['mouth_internal_visibility'])
for name,r in views.items():
 save(name+'-full',r)
 save(name+'-24x',r,(421,232,47,27,24))
save('v2-context',roots['v2'],(414,215,62,58,12))
save('lower-lip-only',variant(roots['v2'],isolate=['mouth_lip_lower']),(421,232,47,27,24))
save('effect-only',variant(roots['v2'],isolate=[fx]),(421,232,47,27,24))
save('mouth-hidden',variant(roots['v2'],hidden=['mouth']),(414,215,62,58,12))
source=ImageOps.exif_transpose(Image.open(ROOT/FILES['reference'])).convert('RGB')
source.crop((421,232,468,259)).resize((1128,648),Image.Resampling.LANCZOS).save(OUT/'reference-enlarged.png')
source.crop((385,165,507,276)).save(OUT/'reference-face-1x.png')
source.crop((385,165,507,276)).resize((488,444),Image.Resampling.LANCZOS).save(OUT/'reference-face-4x.png')
ci,pi,li=ids(roots['v2']),ids(roots['v1']),ids(roots['lineart'])
geom=['d','points','x','y','x1','x2','y1','y2','cx','cy','rx','ry','width','height','transform']
changes=[]
for name,e in li.items():
 if name.startswith('mouth') and name in ci:
  diff={a:[e.get(a),ci[name].get(a)] for a in geom if e.get(a)!=ci[name].get(a)}
  if diff:changes.append({'id':name,'changes':diff})
def children(r):return {e.get('id'):ET.tostring(e) for e in r if e.get('id') and e.get('id')!='mouth'}
new=children(roots['v2']);old=children(roots['v1']);line=children(roots['lineart'])
allids=[e.get('id') for e in roots['v2'].iter() if e.get('id')];missing=[]
for e in roots['v2'].iter():
 for a,v in e.attrib.items():
  refs=re.findall(r'url\(#([^)]*)\)',v)
  if a.endswith('href') and v.startswith('#'):refs.append(v[1:])
  if a in ['data-source-id','data-target-id','data-driven-by','data-follows-id','data-complete-path']:refs.append(v)
  for ref in refs:
   if ref not in ci:missing.append([e.get('id'),a,ref])
audit={'inputs':{k:{'path':str(ROOT/v),'sha256':hashlib.sha256((ROOT/v).read_bytes()).hexdigest()} for k,v in FILES.items()},
 'crop':[421,232,468,259],'geometry_changes_vs_lineart':changes,
 'nonmouth_top_level':{'count':len(new),'changed_vs_v1':[n for n in new if new[n]!=old.get(n)],'changed_vs_lineart':[n for n in new if new[n]!=line.get(n)]},
 'stable_structure_preserved':{n:ET.tostring(ci[n])==ET.tostring(pi[n]) for n in ['mouth_internal_visibility','mouth_upper','mouth_lower_skin_cover','mouth_lower_skin_volume','mouth_lower_formal_line']},
 'v2_changed_ids':[n for n in ci if n in pi and ET.tostring(ci[n])!=ET.tostring(pi[n])],
 'v2_added_ids':sorted(set(ci)-set(pi)),
 'duplicate_ids':sorted({n for n in allids if allids.count(n)>1}),'missing_references':missing,
 'fx_attributes':dict(ci[fx].attrib)}
(OUT/'independent-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:audit[k] for k in ['geometry_changes_vs_lineart','nonmouth_top_level','stable_structure_preserved','v2_changed_ids','v2_added_ids','duplicate_ids','missing_references']},ensure_ascii=False))
