from pathlib import Path
import xml.etree.ElementTree as ET
import copy, json, hashlib, re
from PIL import Image, ImageOps

ROOT=Path.cwd()
OUT=ROOT/'reviews/refinement/mouth/evidence-v1'
OUT.mkdir(parents=True,exist_ok=True)
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
FILES={
 'candidate':'reviews/refinement/mouth/candidates/character-v1.svg',
 'lineart':'refinement/groups/mouth/2.嘴型校准与部件线稿/character.svg',
 'clean':'refinement/groups/mouth/4.分部件着色/4.4.嘴周皮肤明暗/character.svg',
 'reference':'references/base-subject.png',
 'plan':'refinement/groups/mouth/1.制作计划/plan.json',
 'palette':'refinement/groups/mouth/3.嘴部色盘/palette.json'
}
def ids(r): return {e.get('id'):e for e in r.iter() if e.get('id')}
roots={k:ET.parse(ROOT/v).getroot() for k,v in FILES.items() if v.endswith('.svg')}
def variant(root, hidden=(), isolate=(), remove_clip=()):
 r=copy.deepcopy(root); index=ids(r)
 for name in hidden: index[name].set('display','none')
 for name in remove_clip: index[name].attrib.pop('clip-path',None)
 if isolate:
  defs=ET.Element('{'+NS+'}defs')
  for e in r.iter():
   if e.tag.endswith('}defs'):
    for child in e: defs.append(copy.deepcopy(child))
  result=ET.Element(r.tag,dict(r.attrib));result.append(defs)
  for name in isolate: result.append(copy.deepcopy(index[name]))
  r=result
 return r
boxes={'closeup':(421,232,47,27,24),'context':(414,215,62,58,12),'face1x':(385,165,122,111,1),'face4x':(385,165,122,111,4)}
def save(name,r,box='closeup'):
 x,y,w,h,scale=boxes[box];r=copy.deepcopy(r)
 r.set('viewBox',f'{x} {y} {w} {h}');r.set('width',str(w*scale));r.set('height',str(h*scale))
 ET.ElementTree(r).write(OUT/(name+'.svg'),encoding='utf-8',xml_declaration=True)
for k,r in roots.items():
 for b in boxes: save(k+'-'+b,r,b)
 r=copy.deepcopy(r);r.set('viewBox','421 232 47 27');r.set('width','47');r.set('height','27')
 ET.ElementTree(r).write(OUT/(k+'-native.svg'),encoding='utf-8',xml_declaration=True)
c=roots['candidate']
fx='fx_mouth_lower_lip_on_surround_skin'
save('effects-off',variant(c,hidden=[fx]))
save('internals-hidden',variant(c,hidden=['mouth_internal_visibility']))
save('mouth-hidden-context',variant(c,hidden=['mouth']),'context')
save('skin-volume-off',variant(c,hidden=['mouth_upper_skin_volume','mouth_lower_skin_volume']))
save('lower-lip-only',variant(c,isolate=['mouth_lip_lower']))
save('upper-lip-only',variant(c,isolate=['mouth_lip_upper']))
save('effect-only',variant(c,isolate=[fx]))
tmp=variant(c);ids(tmp)['fx_mouth_lower_lip_on_surround_skin_visible_skin'].attrib.pop('mask',None)
save('diagnostic-effect-exclusion-removed',tmp)
for name,target in [('complete-inside','mouth_inside'),('complete-teeth','mouth_teeth_upper'),('complete-tongue','mouth_tongue')]:save(name,variant(c,isolate=[target]))
save('complete-interior',variant(c,isolate=['mouth_internal_visibility'],remove_clip=['mouth_internal_visibility']))
source=ImageOps.exif_transpose(Image.open(ROOT/FILES['reference'])).convert('RGB')
for b,(x,y,w,h,s) in boxes.items():
 crop=source.crop((x,y,x+w,y+h));crop.resize((w*s,h*s),Image.Resampling.LANCZOS).save(OUT/('reference-'+b+'.png'))
 if b=='closeup':crop.resize((w*s,h*s),Image.Resampling.NEAREST).save(OUT/'reference-nearest.png')
palette=json.loads((ROOT/FILES['palette']).read_text(encoding='utf-8'))
bad=[]
for sample in palette['samples']:
 xy=sample['actual_pixel']; actual=source.getpixel(tuple(xy))
 if tuple(sample['rgb'])!=actual:bad.append({'id':sample['id'],'stored':sample['rgb'],'actual':actual})
ci,li=ids(c),ids(roots['lineart'])
geom=['d','points','x','y','x1','x2','y1','y2','cx','cy','rx','ry','width','height','transform']
changes=[]
for id,e in li.items():
 if id.startswith('mouth') and id in ci:
  diff={a:[e.get(a),ci[id].get(a)] for a in geom if e.get(a)!=ci[id].get(a)}
  if diff:changes.append({'id':id,'changes':diff})
allids=[e.get('id') for e in c.iter() if e.get('id')]
missing=[]
for e in c.iter():
 for k,v in e.attrib.items():
  refs=re.findall(r'url\(#([^)]*)\)',v)
  if k.endswith('href') and v.startswith('#'):refs.append(v[1:])
  if k in ['data-source-id','data-target-id','data-follows-id','data-driven-by','data-complete-path']:refs.append(v)
  for ref in refs:
   if ref not in ci:missing.append({'id':e.get('id'),'attr':k,'target':ref})
audit={'files':{k:{'path':str(ROOT/v),'sha256':hashlib.sha256((ROOT/v).read_bytes()).hexdigest()} for k,v in FILES.items()},'boxes':boxes,'palette_sample_count':len(palette['samples']),'palette_mismatches':bad,'lineart_geometry_changes':changes,'duplicate_ids':sorted({x for x in allids if allids.count(x)>1}),'missing_references':missing,'mouth_group_nonmouth_parts':[{'id':e.get('id'),'part':e.get('data-part')} for e in ci['mouth'].iter() if e.get('data-part') and e.get('data-part')!='mouth']}
(OUT/'independent-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:audit[k] for k in ['palette_sample_count','palette_mismatches','lineart_geometry_changes','duplicate_ids','missing_references','mouth_group_nonmouth_parts']},ensure_ascii=False))
