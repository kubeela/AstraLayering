from PIL import Image,ImageDraw,ImageFont,ImageChops
from pathlib import Path
import json
p=Path('tmp/eyes-rerun/step4');ref=Image.open('references/base-subject.png').convert('RGB');old=Image.open('refinement/groups/eyes/3.关联部件校准/preview.png').convert('RGB');new=Image.open('refinement/groups/eyes/4.眼周肤色与局部层次/preview.png').convert('RGB');font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
def rows(name,ims,labels):
 o=Image.new('RGB',(max(i.width for i in ims),sum(i.height+30 for i in ims)),'white');d=ImageDraw.Draw(o);y=0
 for im,label in zip(ims,labels):d.text((8,y+5),label,fill='#253441',font=font);o.paste(im,(0,y+30));y+=im.height+30
 o.save(p/name)
def cols(name,ims,labels):
 o=Image.new('RGB',(sum(i.width for i in ims),max(i.height for i in ims)+30),'white');d=ImageDraw.Draw(o);x=0
 for im,label in zip(ims,labels):d.text((x+8,5),label,fill='#253441',font=font);o.paste(im,(x,30));x+=im.width
 o.save(p/name)
rows('same-coordinates-12x.png',[Image.open(p/'reference-eyes-12x.png'),Image.open(p/'input-eyes-12x.png'),Image.open(p/'candidate-eyes-12x.png')],['Reference | x=390..500, y=178..219 | 12x','Step 3 input | same crop | direct SVG render 12x','Step 4 saved SVG | same crop | direct SVG render 12x'])
cols('normal-head-1x.png',[i.crop((330,115,555,290)) for i in [ref,old,new]],['Reference | 1:1','Step 3 input | 1:1','Step 4 saved SVG | 1:1'])
cols('normal-full-1x.png',[ref,new],['Reference | 1:1','Step 4 saved SVG | 1:1'])
rows('added-layers-switches-12x.png',[Image.open(p/(n+'-12x.png')) for n in ['right-added-off','left-added-off','all-added-off']],['Character right new layers off','Character left new layers off','Both eyes new layers off = step 3 input'])
rows('whole-eye-switches-12x.png',[Image.open(p/(n+'-12x.png')) for n in ['right-eye-off','left-eye-off','eyes-off']],['Character right entire eye off','Character left entire eye off','Both entire eyes off = clean source face'])
cols('face-switches-4x.png',[Image.open(p/(n+'-face-4x.png')) for n in ['candidate','all-added-off','eyes-off']],['Step 4 layers on','New layers off','Entire eyes off'])
assert ImageChops.difference(Image.open(p/'all-added-off-12x.png'),Image.open(p/'input-eyes-12x.png')).getbbox() is None
assert ImageChops.difference(Image.open(p/'eyes-off-12x.png'),Image.open(p/'source-eyes-off-12x.png')).getbbox() is None
pairs=[]
for x,y in [(411,191),(415,190),(415,191),(419,192),(470,190),(470,191),(475,192),(415,204),(415,206),(419,208),(470,204),(470,206),(475,204),(475,206),(479,206)]:pairs.append({'xy':[x,y],'reference':list(ref.getpixel((x,y))),'input':list(old.getpixel((x,y))),'candidate':list(new.getpixel((x,y)))})
(p/'pixel-comparison.json').write_text(json.dumps(pairs,ensure_ascii=False,indent=2),encoding='utf-8')
v=json.loads((p/'verification.json').read_text(encoding='utf-8'));v['new_layers_off_exactly_matches_input']=True;v['eyes_off_exactly_matches_source_clean_face']=True;v['preview_size']=list(new.size);v['preview_mode']=Image.open('refinement/groups/eyes/4.眼周肤色与局部层次/preview.png').mode;(p/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
print('Visual evidence generated. Layer-off pixel comparisons match.')
