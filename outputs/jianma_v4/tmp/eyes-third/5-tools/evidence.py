from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np,json,sys
from color_common import R
P=Path(sys.argv[1]);check=json.loads((P/'check.json').read_text(encoding='utf-8'));eye=check['eye'];x,y,w,h=check['box']
src=Image.open(R/'references/base-subject.png').convert('RGB').crop((x,y,x+w,y+h));cand=Image.open(P/'candidate-eye-native.png').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',20);panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel)
d.text((12,12),'SOURCE | original coordinates',font=font,fill='black');d.text((904,12),f'{check["step"][:3]} | {eye} | same coordinates',font=font,fill='black')
panel.paste(src.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(cand.resize((880,600),Image.Resampling.NEAREST),(900,45));panel.save(P/'source-candidate-comparison.png')
Image.blend(src,cand,.5).resize((880,600),Image.Resampling.NEAREST).save(P/'same-coordinate-blend50.png')
src.resize((1320,900),Image.Resampling.NEAREST).save(P/'source-pixels-30x.png')
before=np.array(Image.open(P/'before-eyes-direct-12x.png'));after=np.array(Image.open(P/'candidate-eyes-direct-12x.png'))
other=(393,184,437,214) if eye=='eye_left' else (449,184,493,214);a,b,c,d=other;crop=np.s_[(b-175)*12:(d-175)*12,(a-390)*12:(c-390)*12]
assert np.array_equal(before[crop],after[crop]);check['other_eye_pixels_unchanged']=True
(P/'check.json').write_text(json.dumps(check,ensure_ascii=False,indent=2),encoding='utf-8')
print('Same-coordinate evidence saved; opposite eye pixel difference = 0.')
