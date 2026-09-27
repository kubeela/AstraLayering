from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parent;ROOT=P.parents[2]
src=Image.open(ROOT/'references/base-subject.png').convert('RGB').crop((393,184,437,214))
can=Image.open(P/'strict-mirror-right-native.png').convert('RGB')
panel=Image.new('RGB',(1784,650),'white');d=ImageDraw.Draw(panel);font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',22)
d.text((10,12),'SOURCE eye_right | canvas x393-437',font=font,fill='black');d.text((904,12),'STRICT x443 MIRROR | no eye adjustment',font=font,fill='black')
panel.paste(src.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(can.resize((880,600),Image.Resampling.NEAREST),(900,45));panel.save(P/'strict-mirror-right-comparison.png')
Image.blend(src,can,.5).resize((880,600),Image.Resampling.NEAREST).save(P/'strict-mirror-right-blend-50pct.png')
src2=Image.open(ROOT/'references/base-subject.png').convert('RGB').crop((390,175,499,222));can2=Image.open(P/'strict-mirror-eyes-native.png').convert('RGB')
panel=Image.new('RGB',(1308,1168),'white');d=ImageDraw.Draw(panel);d.text((10,8),'SOURCE | original coordinates',font=font,fill='black');panel.paste(src2.resize((1308,564),Image.Resampling.NEAREST),(0,34));d.text((10,608),'CANDIDATE | strict x443 mirror, target hair retained',font=font,fill='black');panel.paste(can2.resize((1308,564),Image.Resampling.NEAREST),(0,638));panel.save(P/'strict-mirror-both-eyes-comparison.png')
