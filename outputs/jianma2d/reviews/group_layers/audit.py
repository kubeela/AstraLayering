from pathlib import Path
import importlib.util, tempfile, json, shutil
from PIL import Image, ImageChops

ROOT=Path('.')
TOOL=Path('../../.agents/skills/live2d-layering/tools/svg_preview.py')
spec=importlib.util.spec_from_file_location('bound_svg_preview',TOOL)
preview=importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)
source=Path('block-layers/character.svg')
r,size=preview.read_svg(source)
leaves=[g for g in r if g.get('data-group-path')]
out=Path('reviews/group_layers/evidence')
(out/'leaves').mkdir(parents=True,exist_ok=True)
(out/'categories').mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='audit-',dir=out) as td:
 batch=preview.RenderBatch(Path(td),size)
 full=batch.add(r,size,(0,0,*size))
 jobs=[]
 for g in leaves:
  identity=g.get('id')
  jobs.append((g,batch.add(r,size,(0,0,*size),only=[identity]),batch.add(r,size,(0,0,*size),hidden=[identity])))
 categories={}
 for category in ['face','hair','body','headdress','earrings','sandals']:
  ids=[g.get('id') for g in leaves if g.get('data-group-path').split('/')[0]==category]
  categories[category]=batch.add(r,size,(0,0,*size),only=ids)
 batch.run()
 def flat(im):
  bg=Image.new('RGBA',size,'white')
  return Image.alpha_composite(bg,im.convert('RGBA')).convert('RGB')
 whole=flat(Image.open(full))
 summary=[]
 for g,solo,hidden in jobs:
  isolated=Image.open(solo).convert('RGBA')
  alpha=isolated.getchannel('A')
  bbox=alpha.getbbox()
  diff=ImageChops.difference(whole,flat(Image.open(hidden)))
  db=diff.getbbox()
  dest=out/'leaves'/(g.get('id')+'.png')
  shutil.copyfile(solo,dest)
  summary.append({'id':g.get('id'),'group_path':g.get('data-group-path'),'isolated_bbox':bbox,'isolation_nonempty':bool(bbox),'hide_changes_full_render':bool(db),'hide_diff_bbox':db,'isolated_file':str(dest)})
 for category,path in categories.items():
  shutil.copyfile(path,out/'categories'/(category+'.png'))
(out/'isolation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'independent_rendered':len(summary),'nonempty':sum(x['isolation_nonempty'] for x in summary),'hide_changes_full_render':sum(x['hide_changes_full_render'] for x in summary),'failures':[x for x in summary if not x['isolation_nonempty'] or not x['hide_changes_full_render']]},ensure_ascii=False,indent=2))
