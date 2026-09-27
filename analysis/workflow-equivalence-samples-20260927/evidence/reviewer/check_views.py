from pathlib import Path
import xml.etree.ElementTree as E
import json, subprocess
from PIL import Image, ImageChops, ImageDraw
root=Path('C:/Users/22129/AppData/Local/Temp/workflow-equivalence-20260927-9mzgs8zo')
shared=root/'shared'; out=root/'blind-review'
ev=Path('D:/Resources/workspace/AstraLayering/analysis/workflow-equivalence-samples-20260927/evidence')
E.register_namespace('', 'http://www.w3.org/2000/svg')
jobs=[]
for label in ['A','B']:
    tree=E.parse(ev/'mouth'/label/'character.svg'); r=tree.getroot(); ids={n.get('id'):n for n in r.iter() if n.get('id')}
    if label=='A': print('A CLIP',E.tostring(ids['mouth_full_cavity_clip'],encoding='unicode'))
    ids['mouth_upper'].set('transform','translate(0 -3)')
    ids['mouth_lower'].set('transform','translate(0 3)')
    r.set('viewBox','418 227 56 36'); r.set('width','560'); r.set('height','360')
    dest=out/f'mouth-{label}-open-test.svg'; tree.write(dest,encoding='utf-8')
    jobs.append({'input':str(dest),'output':str(dest.with_suffix('.png'))})
    jobs.append({'input':str(ev/'shadow'/label/'off.svg'),'output':str(out/f'shadow-{label}-off-check.png')})
    tree=E.parse(ev/'shadow'/label/'character.svg'); r=tree.getroot()
    for n in r.iter():
        if n.get('id')=='hair_front_right': n.set('display','none')
    r.set('width','900');r.set('height','660')
    dest=out/f'shadow-{label}-receivers.svg';tree.write(dest,encoding='utf-8')
    jobs.append({'input':str(dest),'output':str(dest.with_suffix('.png'))})
jobs.append({'input':str(shared/'shadow-input.svg'),'output':str(out/'shadow-input-check.png')})
(out/'jobs.json').write_text(json.dumps(jobs),encoding='utf-8')
node=Path('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
subprocess.run([str(node),str(shared/'tools/render_svg.cjs'),'--batch',str(out/'jobs.json')],check=True)
baseline=Image.open(out/'shadow-input-check.png').convert('RGBA')
for label in ['A','B']:
    im=Image.open(out/f'shadow-{label}-off-check.png').convert('RGBA')
    print('SHADOW',label,'OFF RESTORES INPUT PIXELS',ImageChops.difference(im,baseline).getbbox() is None)
board=Image.new('RGB',(1120,400),'white');draw=ImageDraw.Draw(board)
for i,label in enumerate(['A','B']):
    draw.text((i*560+8,8),label+': upper -3 / lower +3',fill='black')
    board.paste(Image.open(out/f'mouth-{label}-open-test.png'),(i*560,40))
board.save(out/'mouth-open-counterfactual.png')
board=Image.new('RGB',(1800,700),'white');draw=ImageDraw.Draw(board)
for i,label in enumerate(['A','B']):
    draw.text((i*900+8,8),label+': source hair hidden / receivers visible',fill='black')
    board.paste(Image.open(out/f'shadow-{label}-receivers.png'),(i*900,40))
board.save(out/'shadow-receivers-counterfactual.png')
