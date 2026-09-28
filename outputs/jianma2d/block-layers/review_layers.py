"""Generate compact step-3 review evidence with the workflow-bound tools.
Run from the subject output directory with REVIEW_NODE / REVIEW_SHARP configured.
Only relative subject and skill paths are used.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, subprocess, sys, shutil, hashlib
import xml.etree.ElementTree as ET

ROOT=Path('block-layers'); EV=ROOT/'evidence';TMP=ROOT/'.review-work'
TMP.mkdir(exist_ok=True)
preview=Path('../../.agents/skills/live2d-layering/tools/svg_preview.py')
compare=Path('../../.agents/skills/live2d-layering/3.大层分层稿/tools/compare.py')
svg=ROOT/'character.svg';ref=Path('references/base-subject.png')
colors=json.loads((ROOT/'group-colors.json').read_text())
paths=list(colors); palette=[tuple(bytes.fromhex(c[1:])) for c in colors.values()]
segments={}
for node in ET.parse(svg).getroot().iter():
    group_path=node.get('data-group-path')
    if group_path:segments.setdefault(group_path,[]).append(node.get('id'))
assert set(segments)==set(paths)
assert all(identity for ids in segments.values() for identity in ids)
assert sum(map(len,segments.values()))==len({identity for ids in segments.values() for identity in ids})
full=Image.open(EV/'rendered-transparent.png').convert('RGBA');pix=list(full.getdata())
unique=set(p for p in pix if p[3]);nearest={}
for p in unique:
    distances=[sum((p[j]-rgb[j])**2 for j in range(3)) for rgb in palette]
    i=min(range(len(palette)),key=distances.__getitem__)
    nearest[p]=i if distances[i]<=64 else -1
labels=[nearest.get(p,-1) for p in pix]
font=ImageFont.load_default()

def run(args):
    subprocess.run([sys.executable]+[str(x) for x in args],check=True,stdout=subprocess.DEVNULL)
def visible(indices,out):
    result=Image.new('RGBA',full.size)
    result.putdata([p if label in indices else (0,0,0,0) for p,label in zip(pix,labels)])
    result.save(out)
    return result

def box_for(image):
    b=image.getbbox();margin=8
    x0,y0,x1,y1=b
    # Tiny details need a little context instead of an enormous nearest-neighbor zoom.
    w=max(32,x1-x0+margin*2);h=max(28,y1-y0+margin*2)
    cx=(x0+x1)//2;cy=(y0+y1)//2
    x=max(0,cx-w//2);y=max(0,cy-h//2)
    return (x,y,min(w,1024-x),min(h,1536-y))
def compare_visible(rendered,out,box=None,scale=1):
    args=[compare,'--reference',ref,'--rendered',rendered,'--out',out]
    if box:args+=['--crop',*box]
    if scale!=1:args+=['--scale',scale]
    run(args)

def fit(image,w,h,bg='white'):
    image=image.convert('RGBA');a=Image.new('RGBA',image.size,bg);a.alpha_composite(image)
    a=a.convert('RGB');factor=min(w/a.width,h/a.height);a=a.resize((max(1,round(a.width*factor)),max(1,round(a.height*factor))),Image.Resampling.LANCZOS)
    canvas=Image.new('RGB',(w,h),bg);canvas.paste(a,((w-a.width)//2,(h-a.height)//2));return canvas

# Full image and targeted close views always derive from this exact SVG render.
compare_visible(EV/'rendered-transparent.png',EV/'full')
for name,box,scale in [('head',(375,75,280,320),3),('feet',(432,1300,165,178),4),('torso',(390,363,255,426),2)]:
    compare_visible(EV/'rendered-transparent.png',EV/name,box,scale)

# Major classes: all their leaf groups together, and the visible contour in final stacking.
manifest={'svg_sha256':hashlib.sha256(svg.read_bytes()).hexdigest(),'leaf_count':len(paths),'drawing_segment_count':sum(map(len,segments.values())),'leaf_segments':segments,'major_classes':[],'leaves':[]}
for cat in ['face','hair','body','headdress','earrings','sandals']:
    members=[(i,p) for i,p in enumerate(paths) if p.split('/')[0]==cat]
    isolated=TMP/(cat+'-isolated.png')
    args=[preview,svg,isolated]
    for _,p in members:
        for identity in segments[p]:args+=['--only',identity]
    run(args)
    layer=Image.open(isolated).convert('RGBA');b=box_for(layer)
    vis=TMP/(cat+'-visible.png');visible({i for i,_ in members},vis)
    target=EV/'categories'/cat;compare_visible(vis,target,b,1 if cat=='body' else 2)
    # Include the complete hidden base next to reference / visible overlay / visible blend.
    panels=[Image.open(target/'reference.png'),layer.crop((b[0],b[1],b[0]+b[2],b[1]+b[3])),Image.open(target/'overlay.png'),Image.open(target/'blend.png')]
    cw=240;ch=min(1150,max(200,round(b[3]/b[2]*cw)))
    board=Image.new('RGB',(cw*4,ch+36),'#eeeeee');d=ImageDraw.Draw(board)
    for j,(name,im) in enumerate(zip(['reference','complete class','visible boundary','visible blend'],panels)):
        d.text((j*cw+6,7),cat+' / '+name,fill='black',font=font);board.paste(fit(im,cw,ch),(j*cw,36))
    board.save(EV/'categories'/(cat+'.png'))
    manifest['major_classes'].append({'path':cat,'evidence':str(EV/'categories'/(cat+'.png')),'leaf_count':len(members)})
    print('reviewed class',cat,flush=True)

# Every leaf gets its own bound-tool isolation and visible-boundary comparison.
# The sheet keeps the isolation (completed hidden geometry) distinct from visible pixels.
cards=[]
for i,p in enumerate(paths):
    leaf=p.split('/')[-1];isolated=TMP/(leaf+'-isolated.png')
    args=[preview,svg,isolated]
    for identity in segments[p]:args+=['--only',identity]
    run(args)
    layer=Image.open(isolated).convert('RGBA');b=box_for(layer);x,y,w,h=b
    vis=TMP/(leaf+'-visible.png');vm=visible({i},vis)
    out=TMP/(leaf+'-comparison');compare_visible(vis,out,b,2 if h<200 else 1)
    panels=[Image.open(out/'reference.png'),layer.crop((x,y,x+w,y+h)),Image.open(out/'overlay.png'),Image.open(out/'blend.png')]
    cw=180;ch=min(290,max(115,round(h/w*cw)))
    card=Image.new('RGB',(cw*4,ch+42),'#f0f0f0');d=ImageDraw.Draw(card)
    d.text((6,4),f'{i+1:02d}  {p}',fill='black',font=font)
    for j,(name,panel) in enumerate(zip(['Reference','Complete leaf','Visible boundary','Visible blend'],panels)):
        d.text((j*cw+6,20),name,fill='#444444',font=font);card.paste(fit(panel,cw,ch),(j*cw,42))
    cards.append(card)
    manifest['leaves'].append({'index':i+1,'path':p,'id':leaf,'ids':segments[p],'color':colors[p],'isolation_bbox':list(layer.getbbox()),'visible_bbox':list(vm.getbbox()) if vm.getbbox() else None,'sheet':f'block-layers/evidence/leaf-sheets/{i//5+1:02d}.png'})
    print(f'reviewed leaf {i+1:02d}/45 {p}',flush=True)

(EV/'leaf-sheets').mkdir(exist_ok=True)
for start in range(0,len(cards),5):
    subset=cards[start:start+5];sheet=Image.new('RGB',(720,sum(c.height for c in subset)+8*(len(subset)-1)),'#d8d8d8');y=0
    for card in subset:sheet.paste(card,(0,y));y+=card.height+8
    sheet.save(EV/'leaf-sheets'/f'{start//5+1:02d}.png')
(EV/'review-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
shutil.rmtree(TMP)
print('All six categories and 45 leaves have bound-tool evidence.',flush=True)
