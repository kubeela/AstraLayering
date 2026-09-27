from PIL import Image,ImageDraw,ImageFont,ImageChops
from pathlib import Path
import json
p=Path('tmp/eyes-rerun/step5');ref=Image.open('references/base-subject.png').convert('RGB');old=Image.open('refinement/groups/eyes/4.眼周肤色与局部层次/preview.png').convert('RGB');new=Image.open('refinement/groups/eyes/5.眼黑与装饰部件绘制/preview.png').convert('RGB');font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
def rows(name,ims,labels):
 o=Image.new('RGB',(max(i.width for i in ims),sum(i.height+30 for i in ims)),'white');d=ImageDraw.Draw(o);y=0
 for im,label in zip(ims,labels):d.text((8,y+5),label,fill='#253441',font=font);o.paste(im,(0,y+30));y+=im.height+30
 o.save(p/name)
def cols(name,ims,labels):
 o=Image.new('RGB',(sum(i.width for i in ims),max(i.height for i in ims)+30),'white');d=ImageDraw.Draw(o);x=0
 for im,label in zip(ims,labels):d.text((x+8,5),label,fill='#253441',font=font);o.paste(im,(x,30));x+=im.width
 o.save(p/name)
rows('same-coordinates-12x.png',[Image.open(p/'reference-eyes-12x.png'),Image.open(p/'input-eyes-12x.png'),Image.open(p/'candidate-eyes-12x.png')],['Reference | original x=390..500, y=178..219 | 12x','Step 4 input | direct SVG render 12x','Step 5 saved SVG | direct SVG render 12x | highlights deferred'])
cols('normal-head-1x.png',[i.crop((330,115,555,290)) for i in [ref,old,new]],['Reference | 1:1','Step 4 input | 1:1','Step 5 saved SVG | 1:1'])
cols('normal-full-1x.png',[ref,new],['Reference | 1:1','Step 5 saved SVG | 1:1'])
rows('complete-iris-checks-12x.png',[Image.open(p/(n+'-12x.png')) for n in ['eye-black-isolated','eye-black-unclipped','sclera-clip-off-combined']],['Isolated eye-black | delivery sclera clips active','Isolated complete eye-black | only sclera clips disabled in temporary SVG','Temporary unclipped eye-black in context'])
rows('decoration-checks-12x.png',[Image.open(p/(n+'-12x.png')) for n in ['decorations-isolated','decorations-off','eye-black-off']],['Decorations isolated | full editable lash fragments and folds','Decorations hidden | original opening contours preserved','Eye-black hidden | complete white shapes and decorations'])
Image.blend(Image.open(p/'reference-eyes-12x.png').convert('RGB'),Image.open(p/'candidate-eyes-12x.png').convert('RGB'),.5).save(p/'overlay-50-percent-12x.png')
assert ImageChops.difference(Image.open(p/'eyes-off-12x.png'),Image.open(p/'source-eyes-off-12x.png')).getbbox() is None
v=json.loads((p/'verification.json').read_text(encoding='utf-8'));v['all_eye_parts_off_including_front_fragments_matches_source']=True;v['preview_size']=list(new.size);v['preview_mode']=Image.open('refinement/groups/eyes/5.眼黑与装饰部件绘制/preview.png').mode;(p/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
print('Evidence and off-state equality complete.')
