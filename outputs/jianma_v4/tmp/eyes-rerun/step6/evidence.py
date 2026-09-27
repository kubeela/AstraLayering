from PIL import Image,ImageDraw,ImageFont,ImageChops
from pathlib import Path
import json
p=Path('tmp/eyes-rerun/step6');ref=Image.open('references/base-subject.png').convert('RGB');old=Image.open('refinement/groups/eyes/5.眼黑与装饰部件绘制/preview.png').convert('RGB');new=Image.open('refinement/groups/eyes/6.投影与高光效果/preview.png').convert('RGB');font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
def rows(name,ims,labels):
 o=Image.new('RGB',(max(i.width for i in ims),sum(i.height+30 for i in ims)),'white');d=ImageDraw.Draw(o);y=0
 for im,label in zip(ims,labels):d.text((8,y+5),label,fill='#253441',font=font);o.paste(im,(0,y+30));y+=im.height+30
 o.save(p/name)
def cols(name,ims,labels):
 o=Image.new('RGB',(sum(i.width for i in ims),max(i.height for i in ims)+30),'white');d=ImageDraw.Draw(o);x=0
 for im,label in zip(ims,labels):d.text((x+8,5),label,fill='#253441',font=font);o.paste(im,(x,30));x+=im.width
 o.save(p/name)
rows('same-coordinates-12x.png',[Image.open(p/'reference-eyes-12x.png'),Image.open(p/'input-eyes-12x.png'),Image.open(p/'candidate-eyes-12x.png')],['Reference | original x=390..500, y=178..219 | 12x','Step 5 input | direct SVG render 12x','Step 6 saved SVG | direct SVG render 12x'])
cols('normal-head-1x.png',[i.crop((330,115,555,290)) for i in [ref,old,new]],['Reference | 1:1','Step 5 input | 1:1','Step 6 saved SVG | 1:1'])
cols('normal-full-1x.png',[ref,new],['Reference | 1:1','Step 6 saved SVG | 1:1'])
refhead=ref.crop((300,0,590,295)).resize((580,590));cols('same-coordinates-head-2x.png',[refhead,Image.open(p/'candidate-head-2x.png')],['Reference | same head crop 2x','Step 6 saved SVG | direct SVG 2x'])
rows('effect-switches-12x.png',[Image.open(p/(n+'-12x.png')) for n in ['right-effects-off','left-effects-off','effects-off']],['Character right effects off','Character left effects off','All new eye effects off'])
rows('effect-isolation-12x.png',[Image.open(p/(n+'-12x.png')) for n in ['right-effects-only','left-effects-only','highlights-only']],['Character right effects isolated','Character left effects isolated','Highlights isolated | tinted backing'])
rows('source-switches-12x.png',[Image.open(p/(n+'-12x.png')) for n in ['right-lid-source-off','left-lid-source-off','front-hair-sources-off']],['Character right upper lid and its projections off','Character left upper lid and its projections off','Front hair sources and their existing face shadows off'])
rows('completion-checks-12x.png',[Image.open(p/(n+'-12x.png')) for n in ['complete-sclera','complete-eye-black','unclipped-eye-black-context']],['Complete solid sclera shapes','Complete eye-black without sclera cropping','Temporary uncropped eye-black in context | effects off'])
Image.blend(Image.open(p/'reference-eyes-12x.png').convert('RGB'),Image.open(p/'candidate-eyes-12x.png').convert('RGB'),.5).save(p/'overlay-50-percent-12x.png')
assert ImageChops.difference(Image.open(p/'eyes-off-12x.png'),Image.open(p/'source-eyes-off-12x.png')).getbbox() is None
v=json.loads((p/'verification.json').read_text(encoding='utf-8'));v['all_eyes_and_cross_layer_fragments_off_matches_input_clean_face']=True;v['preview_size']=list(new.size);v['preview_mode']=Image.open('refinement/groups/eyes/6.投影与高光效果/preview.png').mode;(p/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
print('All visual evidence generated; whole-eye off-state matches input clean face.')
