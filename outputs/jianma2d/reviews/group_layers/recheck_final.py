from pathlib import Path
import importlib.util,tempfile,json,hashlib,shutil,xml.etree.ElementTree as ET
from PIL import Image,ImageChops
TOOL=Path('../../.agents/skills/live2d-layering/tools/svg_preview.py')
spec=importlib.util.spec_from_file_location('bound_svg_preview',TOOL)
pv=importlib.util.module_from_spec(spec);spec.loader.exec_module(pv)
r,size=pv.read_svg(Path('block-layers/character.svg'))
selected=['hair/crown_hair','hair/right_bangs','hair/left_bangs','face/right_ear','face/left_ear','hair/right_side_lock','hair/left_side_lock']
segments={}
for g in r.iter():
 if g.get('data-group-path'):segments.setdefault(g.get('data-group-path'),[]).append(g.get('id'))
ids=[g.get('id') for g in r.iter() if g.get('id')]
expected=[]
def walk(nodes,base=''):
 for n in nodes:
  p=base+n['name']
  if n['groups']:walk(n['groups'],p+'/')
  else:expected.append(p)
walk(json.loads(Path('structure/groups.json').read_text())['groups'])
out=Path('reviews/group_layers/evidence/recheck-final')
(out/'leaves').mkdir(parents=True,exist_ok=True)
def flat(im):return Image.alpha_composite(Image.new('RGBA',size,'white'),im.convert('RGBA')).convert('RGB')
def difference_mask(a,b):
 bands=ImageChops.difference(a.convert('RGBA'),b.convert('RGBA')).split()
 mask=bands[0]
 for band in bands[1:]:mask=ImageChops.lighter(mask,band)
 return mask

def enclosed_holes(im):
 a=im.convert('RGBA').getchannel('A');p=a.load();w,h=im.size
 remain={(x,y) for y in range(h) for x in range(w) if p[x,y]<128}
 holes=[]
 while remain:
  todo=[remain.pop()];count=0;border=False
  while todo:
   x,y=todo.pop();count+=1;border|=x in (0,w-1) or y in (0,h-1)
   for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:
    q=x+dx,y+dy
    if q in remain:remain.remove(q);todo.append(q)
  if not border:holes.append(count)
 return holes
result={'svg_sha256':hashlib.sha256(Path('block-layers/character.svg').read_bytes()).hexdigest(),'logical_leaf_count':len(segments),'segment_count':sum(len(x) for x in segments.values()),'ids_unique':len(ids)==len(set(ids)),'paths_match_groups':set(segments)==set(expected),'clip_or_mask_resources':[n.tag for n in r.iter() if n.tag.split('}')[-1] in ['clipPath','mask']],'groups':[]}
with tempfile.TemporaryDirectory(prefix='bound-final-',dir=out) as td:
 batch=pv.RenderBatch(Path(td),size)
 full=batch.add(r,size,(0,0,*size))
 jobs={path:(batch.add(r,size,(0,0,*size),only=segments[path]),batch.add(r,size,(0,0,*size),hidden=segments[path])) for path in selected}
 batch.run();whole=Image.open(full).convert('RGBA')
 shutil.copyfile(full,out/'rendered-transparent.png')
 result['matches_author_current_render']=whole.tobytes()==Image.open('block-layers/evidence/rendered-transparent.png').convert('RGBA').tobytes()
 previous=Image.open('reviews/group_layers/evidence/recheck-r1-r3/rendered-transparent.png').convert('RGBA')
 dm=difference_mask(whole,previous)
 result['change_bbox_from_previous']=dm.getbbox()
 result['changed_rgba_pixels_from_previous']=sum(count for index,count in enumerate(dm.histogram()) if index!=0)
 for path,(solo,hidden) in jobs.items():
  isolated=Image.open(solo).convert('RGBA');hidden_im=Image.open(hidden).convert('RGBA')
  name=path.rsplit('/',1)[-1]
  shutil.copyfile(solo,out/'leaves'/(name+'.png'))
  item={'path':path,'ids':segments[path],'isolation_nonempty':bool(isolated.getchannel('A').getbbox()),'hide_changes_render':bool(difference_mask(whole,hidden_im).getbbox())}
  result['groups'].append(item)
with tempfile.TemporaryDirectory(prefix='bound-hair-4x-',dir=out) as td:
 box=(440,156,152,134);batch=pv.RenderBatch(Path(td),(608,536))
 jobs={path:batch.add(r,size,box,only=segments[path]) for path in selected[:3]}
 batch.run();result['hair_holes_at_4x']={}
 for path,rendered in jobs.items():
  im=Image.open(rendered).convert('RGBA')
  result['hair_holes_at_4x'][path]=enclosed_holes(im)
  shutil.copyfile(rendered,out/(path.rsplit('/',1)[-1]+'-4x.png'))
(out/'checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
