"""Prepare PNG alpha without resizing; publish hashes for versioned lighting recipes."""
import argparse,hashlib,json,pathlib,subprocess,sys,shutil
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--chroma-cli',type=pathlib.Path,required=True);p.add_argument('--sample',action='append');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[2];base=root/'demos/lighting-lab'
names={'front':('正面 · 长发与衣褶','平涂生成样例：检查脸部大面、发梢与衣褶的明暗分界。'),'hand-face':('侧脸 · 手与脸的遮挡','平涂生成样例：检查手指、前发、脸与颈部的深度关系。'),'turn':('转身 · 抬臂与宽袖','平涂生成样例：检查非对称姿态、大衣褶与交叠投影。')}
for sample in a.sample or names:
 d=base/sample
 if not all((d/f).exists() for f in ['generated-color.png','normal-generated.png','depth-generated.png']):continue
 subprocess.run([sys.executable,str(a.chroma_cli),'--input',str(d/'generated-color.png'),'--out',str(d/'color.png'),'--key-color','#00ff00','--soft-matte','--transparent-threshold','40','--opaque-threshold','130','--despill','--force'],check=True)
 color=Image.open(d/'color.png').convert('RGBA')
 files={k:f'{sample}/{k}.png' for k in ['color','normal','depth']}
 for k in ['normal','depth']:
  raw=d/(k+'-generated.png')
  im=Image.open(raw).convert('RGBA')
  if im.size!=color.size:raise ValueError(f'{sample}/{k}: size mismatch; not rescaled')
  im.putalpha(color.getchannel('A'));im.save(d/(k+'.png'))
 sha={k:hashlib.sha256((base/f).read_bytes()).hexdigest() for k,f in files.items()}
 meta={'id':sample,'name':names[sample][0],'description':names[sample][1],'width':color.width,'height':color.height,'source':'gpt-image-2 / high / original test character / 2026-10-20','files':files,'sha256':sha,'normalConvention':'+X right, +Y up, +Z viewer','depthConvention':'white near, black far','generation':{'model':'gpt-image-2','quality':'high','requestedSize':'1536x2048','reference':'generated-color.png','rawColorSHA256':hashlib.sha256((d/'generated-color.png').read_bytes()).hexdigest(),'prompts':{k:k+'-prompt.txt' for k in ['color','normal','depth']},'rawMapSHA256':{k:hashlib.sha256((d/(k+'-generated.png')).read_bytes()).hexdigest() for k in ['normal','depth']},'processing':'chroma-key alpha; copy color alpha to maps; no resize'}}
 (d/'sample.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print(sample,color.size,sha)
samples=[json.loads((d/'sample.json').read_text()) for d in base.iterdir() if d.is_dir() and (d/'sample.json').is_file()]
samples.sort(key=lambda s:['front','hand-face','turn','jianma'].index(s['id']))
(base/'catalog.json').write_text(json.dumps(samples,ensure_ascii=False,indent=2)+'\n')
