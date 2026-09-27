from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from lxml import etree as E
import json,hashlib,shutil,numpy as np
B=Path('refinement/groups/mouth');A=B/'返修版本/v1';V=B/'返修版本/v2';Q=V/'evidence';Q.mkdir(parents=True,exist_ok=True)
stages={'4.3':B/'4.分部件着色/4.3.唇部颜色与层次','4.4':B/'4.分部件着色/4.4.嘴周皮肤明暗','5':B/'5.独立投影与高光','6':B/'6.组装与成稿审查'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def font(n):return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
def rgb(p,bg='white'):
 a=Image.open(p).convert('RGBA');b=Image.new('RGBA',a.size,bg);b.alpha_composite(a);return b.convert('RGB')
def cell(canvas,im,x,y,label,w=378,h=217):
 ImageDraw.Draw(canvas).text((x,y),label,font=font(20),fill='#302d36');canvas.paste(im.resize((w,h),Image.Resampling.LANCZOS),(x,y+34))
ref=rgb('references/base-subject.png');native={k:rgb(p/'preview.png') for k,p in stages.items()};old={k:rgb(A/k/'preview.png') for k in stages}
box=(421,232,468,259);r=ref.crop(box);xs=[28,450,872,1294]
f1=Image.new('RGB',(1700,1130),'#F7F6F4');d=ImageDraw.Draw(f1);d.text((28,20),'mouth v2 · F1｜下唇颜色与覆盖度修正',font=font(29),fill='#302d36');d.text((28,66),'第一行统一由941×1672原尺寸整图裁出同坐标，再用相同算法放大；没有平移、缩放配准嘴型。',font=font(20),fill='#59515c')
for x,label,im in zip(xs,['原彩图','4.3 v1（无独立效果）','4.3 v2（无独立效果）','4.3 v2 + 原图各50%'],[r,old['4.3'].crop(box),native['4.3'].crop(box),Image.blend(r,native['4.3'].crop(box),.5)]):cell(f1,im,x,112,label)
d.text((28,399),'第二行直接24×渲染：下缘取消过量收缩，缩短颜色软边；实体完整路径与正式线保持冻结。',font=font(20),fill='#59515c')
for x,label,im in zip(xs,['原图同坐标','4.3 v1 直接24×','4.3 v2 直接24×','下唇材质v2 · 灰底独显'],[r,rgb(Q/'v1-4.3-direct.png'),rgb(Q/'v2-4.3-direct.png'),rgb(Q/'v2-lower-lip-direct.png','#DFE3E7')]):cell(f1,im,x,444,label)
d.text((28,739),'中央定位点（原画布像素）：原图 / v1 / v2；只作为空间定位辅助，不逐点复制原图噪声。',font=font(20),fill='#59515c')
for j,p in enumerate([(444,248),(445,248),(444,247)]):d.text((28,791+j*42),f'{p}：{ref.getpixel(p)} / {old["4.3"].getpixel(p)} / {native["4.3"].getpixel(p)}',font=font(22),fill='#3f3743')
d.text((28,970),'颜色保持上薄下丰满、中央柔亮、左右差异；下唇下缘继续保留粉色，不再提前淡成肤色白边。',font=font(20),fill='#514a55');d.text((28,1015),'保持4.1/4.2、口裂、嘴角、完整隐藏素材、上唇、合口线和非mouth内容。最终验收仍交独立review。',font=font(20),fill='#514a55')
f1.save(stages['4.3']/'evidence/F1-v1-v2.png');f1.save(Q/'F1-v1-v2.png')
f2=Image.new('RGB',(1700,1325),'#F7F6F4');d=ImageDraw.Draw(f2);d.text((28,20),'mouth v2 · F2｜下唇柔边与皮肤投影连续交接',font=font(29),fill='#302d36');d.text((28,65),'第一行统一由原尺寸完整画布裁图放大；第二行为同坐标直接24×。完整嘴型保持不变。',font=font(20),fill='#59515c')
for x,label,im in zip(xs,['原彩图','v1 完整成稿','v2 更新后的干净4.4','v2 独立柔影开启'],[r,old['6'].crop(box),native['4.4'].crop(box),native['6'].crop(box)]):cell(f2,im,x,111,label)
for x,label,im in zip(xs,['原图同坐标','v1 直接24×','v2 关闭效果＝新4.4','v2 直接24×'],[r,rgb(A/'6/evidence/candidate-closeup.png'),rgb(stages['5']/'evidence/all-effects-off-closeup.png'),rgb(stages['6']/'evidence/candidate-closeup.png')]):cell(f2,im,x,407,label)
d.text((28,698),'v2：效果仍在下方皮肤上；用实际下唇颜色的覆盖度排除不透明唇面，让柔边后显露的皮肤连续受影。',font=font(20),fill='#59515c')
cell(f2,rgb(A/'5/evidence/effect-only.png','#DFE3E7'),28,745,'v1 效果独显 · 完整唇形硬排除')
cell(f2,rgb(stages['5']/'evidence/effect-only.png','#DFE3E7'),450,745,'v2 效果独显 · 实际材质透明交接')
d.text((872,745),'正常尺寸面部 1×',font=font(21),fill='#302d36')
for x,label,im in [(890,'原图',ref),(1130,'v1',old['6']),(1390,'v2',native['6'])]:d.text((x,790),label,font=font(20),fill='#59515c');f2.paste(im.crop((389,164,501,274)),(x,830))
d.text((28,1052),'检查：不透明唇面和正式线无效果覆盖；皮肤承影面之外无漏色；全部第5步效果关闭精确回到新4.4。',font=font(20),fill='#514a55');d.text((28,1095),'同时保留全部11个皮肤色区。未去掉全部裁切、未把柔影烙入唇面或face；完整路径与来源/目标关系保留。',font=font(20),fill='#514a55');d.text((28,1154),'F1/F2修复候选，交独立review复验；不宣布最终通过。',font=font(23),fill='#514a55')
f2.save(stages['5']/'evidence/F2-v1-v2.png');f2.save(stages['6']/'evidence/F1-F2-v1-v2.png');f2.save(Q/'F2-v1-v2.png')
probes=[(x,y) for x in [440,442,444,445,447,449,450] for y in [247,248,249,250]]
record={'revision':'v2-F1-F2','native_sampling':'all images rendered at full 941x1672 canvas before crop; coordinates unchanged','hashes':{k:{'v1':sha(A/k/'character.svg'),'v2':sha(p/'character.svg')} for k,p in stages.items()},'probes':[{'pixel':p,'reference':ref.getpixel(p),'v1_4.3':old['4.3'].getpixel(p),'v2_4.3':native['4.3'].getpixel(p),'v1_final':old['6'].getpixel(p),'v2_clean':native['4.4'].getpixel(p),'v2_final':native['6'].getpixel(p)} for p in probes],'central_vertical_progression':[{'pixel':[444,y],'reference':ref.getpixel((444,y)),'v1':old['6'].getpixel((444,y)),'v2':native['6'].getpixel((444,y))} for y in range(246,254)],'effect_render_checks':json.loads((stages['5']/'evidence/render-checks.json').read_text(encoding='utf-8')),'assembly_render_checks':json.loads((stages['6']/'evidence/render-checks.json').read_text(encoding='utf-8'))}
trees={k:E.parse(str(p/'character.svg')).getroot() for k,p in stages.items()}
def get(t,id):return t.xpath('.//*[@id="'+id+'"]')[0]
old44=E.parse(str(A/'4.4/character.svg')).getroot();record['all_11_skin_regions_preserved_v1_v2']={e.get('id'):E.tostring(e)==E.tostring(get(trees['4.4'],e.get('id'))) for e in old44.iter() if e.get('data-role')=='local-skin-color-region'}
record['upper_lip_xml_preserved_v1_v2']=E.tostring(get(E.parse(str(A/'4.3/character.svg')).getroot(),'mouth_lip_upper'))==E.tostring(get(trees['4.3'],'mouth_lip_upper'))
(Q/'repair-chain.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8');shutil.copy2(Q/'repair-chain.json',stages['6']/'evidence/repair-chain.json')
print(json.dumps({'hashes':record['hashes'],'central_vertical_progression':record['central_vertical_progression'],'skin_regions_preserved':all(record['all_11_skin_regions_preserved_v1_v2'].values())},ensure_ascii=False,indent=2))
