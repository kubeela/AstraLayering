from pathlib import Path
import importlib.util,tempfile,json,hashlib,shutil
from collections import deque
from PIL import Image,ImageChops
TOOL=Path('../../.agents/skills/live2d-layering/tools/svg_preview.py')
spec=importlib.util.spec_from_file_location('bound_svg_preview',TOOL)
pv=importlib.util.module_from_spec(spec)
spec.loader.exec_module(pv)
r,size=pv.read_svg(Path('block-layers/character.svg'))
selected=['torso','right_upper_arm','left_upper_arm','right_ear','left_ear','crown_hair','right_bangs','left_bangs','right_side_lock','left_side_lock','right_earring','left_earring']
out=Path('reviews/group_layers/evidence/recheck-r1-r3')
(out/'leaves').mkdir(parents=True,exist_ok=True)
def flat(im):
 return Image.alpha_composite(Image.new('RGBA',size,'white'),im.convert('RGBA')).convert('RGB')
def components(im):
 a=im.convert('RGBA').getchannel('A')
 box=a.getbbox()
 data=a.load()
 remain={(x,y) for y in range(box[1],box[3]) for x in range(box[0],box[2]) if data[x,y]>=128}
 sizes=[]
 while remain:
  todo=[remain.pop()];n=0
  while todo:
   x,y=todo.pop();n+=1
   for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]:
    p=(x+dx,y+dy)
    if p in remain:remain.remove(p);todo.append(p)
  sizes.append(n)
 return sorted(sizes,reverse=True)
result={'svg_sha256':hashlib.sha256(Path('block-layers/character.svg').read_bytes()).hexdigest(),'scope':'R1–R3 and affected neighbours only','groups':[]}
with tempfile.TemporaryDirectory(prefix='bound-recheck-',dir=out) as td:
 batch=pv.RenderBatch(Path(td),size)
 full=batch.add(r,size,(0,0,*size))
 jobs={i:(batch.add(r,size,(0,0,*size),only=[i]),batch.add(r,size,(0,0,*size),hidden=[i])) for i in selected}
 body_ids=[g.get('id') for g in r if g.get('data-group-path','').startswith('body/')]
 body=batch.add(r,size,(0,0,*size),only=body_ids)
 batch.run()
 whole=Image.open(full).convert('RGBA')
 original=Image.open('block-layers/evidence/rendered-transparent.png').convert('RGBA')
 result['matches_author_current_render']=whole.tobytes()==original.tobytes()
 for i,(solo,hidden) in jobs.items():
  isolated=Image.open(solo).convert('RGBA')
  hidden_diff=ImageChops.difference(flat(whole),flat(Image.open(hidden))).getbbox()
  dest=out/'leaves'/(i+'.png')
  shutil.copyfile(solo,dest)
  item={'id':i,'isolation_nonempty':bool(isolated.getchannel('A').getbbox()),'hide_changes_full_render':bool(hidden_diff),'isolated_file':str(dest)}
  if i in ['left_ear','right_ear','left_earring','right_earring']:item['alpha_128_four_connected_components']=components(isolated)
  result['groups'].append(item)
 body_im=Image.open(body).convert('RGBA')
 result['shoulder_min_alpha']={side:body_im.getchannel('A').crop(box).getextrema()[0] for side,box in {'screen_left':(440,376,443,380),'screen_right':(591,377,594,381)}.items()}
 shutil.copyfile(body,out/'body-isolated.png')
(out/'checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
