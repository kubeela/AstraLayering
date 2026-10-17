"""Exact SVG geometry, depth controls and grey-cleared inputs; no image synthesis."""
import hashlib
import json
import shlex
from io import BytesIO
from pathlib import Path

import cairosvg
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
STANDARD = ROOT / 'standard'
SIZE = (1024, 1536)
MODEL = 'gpt-image-2.5-sunburst'

def leaves(nodes):
    for n in nodes:
        if n.get('groups'):
            yield from leaves(n['groups'])
        else:
            yield n

def extra(pid):
    if pid == 'face/face_base':
        return '完整连续的脸部皮肤底层，只到额头而非整个头顶。不含耳朵、脖子、头发、眉眼、鼻部独立亮点、嘴巴或额饰。黄区恢复平滑肤色，眼睛嘴巴处也补成连续皮肤。保持原有柔和腮红。不要画无五官面具的厚边。'
    if pid.startswith('face/ear_'):
        return '只画完整耳朵：外耳轮、浅淡内耳凹面和耳垂。黄区补成耳朵结构，不画脸颊、眼睛、头发、耳钉、金属。细软浅褐耳轮线，柔淡肤色，不能有写实的深色耳洞。'
    if pid == 'hair/hair_cap':
        return '目标是连续的淡紫白头发底层，红黄并集是实心发面；脸所在的黄色区域也完全补成头发，不留脸洞，不画脸或五官。'
    if pid.startswith('hair/'):
        return '黄色只补成同一束淡紫白色头发，沿已有发丝方向自然延续。删除皮肤、衣服、冠饰、蓝色飘带；保持原有稀疏细软发丝，不增加粗深色条纹。'
    if pid.endswith('/sclera'):
        return '完整连续的浅灰白杏仁形眼白。黄色中间必须补成眼白，完全去除虹膜、瞳孔、睫毛、眼线和高光。边缘只留眼白自己的柔和灰紫阴影。'
    if pid.endswith('/iris'):
        return '完整圆形或略椭圆形的蓝灰色动漫虹膜，包含默认同动的深色椭圆瞳孔；补全被上睑遮住的顶部圆周。白色高光是独立层，不能出现在本图；上睫毛的褐色也不属于虹膜。少量蓝灰渐变，不画写实纹理。'
    if 'teeth' in pid:
        return '只画一条完整简单的浅米白牙齿带，几乎全隐藏于嘴唇后。不要逐颗牙缝、牙龈、嘴唇、口腔暗红或高细节。'
    if pid.endswith('mouth_interior'):
        return '完整的柔和深粉口腔底形，不含舌头、牙齿或唇线；保持简单低对比动漫色块。'
    if pid == 'neck':
        return '只补成连续的脖子皮肤，上端被下巴遮住的区域也是皮肤。不要画下巴轮廓、V形线、头发、耳饰或衣料。'
    if pid.endswith('/foot'):
        return '只画完整脚部皮肤与现有脚趾，灰底缺口补成肤色。蓝色吊坠、银色脚链及它们的深色轮廓完全不属于脚，需要彻底去掉，不能残留圈线、宝石或链节。'
    if '/arm_' in pid or pid.endswith('/leg'):
        return '只输出目标肢体本身。被衣料、邻接肢体或头发覆盖的黄色区域必须补为连续自然的皮肤，不要保留衣服、肩带、头发、饰品或邻接部件的分界线。不要改变关节姿势，不新增手指。'
    if pid in ('body/breast','body/torso','pelvis'):
        return '这是全年龄角色的服装图层整理。保留图1中已有的白色不透明连体训练服、原有皮肤与布料分界；黄色沿相邻白色衣料补齐，保持衣服覆盖，不添加身体细节，不画透视服装。'
    if pid.endswith(('_link','_connector')):
        return '仅一个很小的浅银白金属连接件；两端也补成相同金属。不要宝石、皮肤、金色、光晕或粗黑描边。'
    if pid.startswith('head_accessories/') or '/ankl' in pid:
        return '只画这一个饰物，严格沿红黄形状。银白边和浅蓝色保留原画的柔淡渐变，不新增宝石切面、硬高光、发光、金色、皮肤或头发。'
    return '只提取目标部件自身的简单形状、色彩与细软线条，排除周围肤色和相邻部件，不因局部放大而增加细节。'

def prompt(n):
    pid=n['id']
    # Semantic IDs remain in manifest; neutral descriptions avoid ambiguous API wording.
    label = 'white training garment upper panel' if pid == 'body/breast' else pid
    return f'''请根据图2的 RGB 控制图，对图1进行精确的部件提取和遮挡补全。这是全年龄动漫立绘的绘画图层整理。
目标部件：{label}。
部件形状说明：{n['note']}
两张输入图使用相同窗口、相同比例，坐标一一对应。图1只保留本部件在红区的可见内容；原来被遮住的黄区和全部绿区都已经抹为中性灰 RGB(160,160,160)，灰色不是部件颜色。
图2颜色只代表操作指令，不是输出颜色：
- 红色：尽量保留图1对应内容的肤色/材质、明暗和原有画风。
- 黄色：灰底里恢复目标部件本身，延续红区的结构与颜色。不能重画原来的遮挡物，不留灰块、孔洞、白洞或锯齿拼接。
- 绿色：目标之外，输出完全透明，不带周围部件。
{extra(pid)}
严格依红黄并集轮廓、位置、大小、朝向制作完整部件，不改姿势、不居中重排。红黄并集每处都有属于目标的连续内容。
画风与图1一致：柔和、浅淡、低对比日系动漫上色，线条细软，细节少。补全像同一画师画的自然延续，不写实、不厚涂，不新增纹理、硬高光、发光或新颜色。
只输出一张透明背景 PNG，只有完成提取和补全的目标部件。不画棋盘格，不输出控制图或灰底。
'''

def main():
    root=ROOT/'work'; root.mkdir(parents=True,exist_ok=True)
    tree=json.loads((STANDARD/'groups.json').read_text())
    occ=json.loads((STANDARD/'occlusion.json').read_text())
    nodes={n['id']:n for n in leaves(tree['groups'])}
    order=[n['id'] for n in occ['layers']]
    assert len(order)==90 and set(order)==set(nodes)
    source=Image.open(ROOT/'reference.png').convert('RGBA')
    src=np.array(source)
    masks={}
    owner=np.zeros((SIZE[1],SIZE[0]),np.uint8)
    for i,pid in enumerate(order):
        data=cairosvg.svg2png(url=str(STANDARD/'parts'/f'{pid}.svg'))
        a=np.array(Image.open(BytesIO(data)).convert('RGBA'))[:,:,3]
        masks[pid]=a
        owner[a>127]=i+1
    Image.fromarray(owner).save(root/'owner.png')
    source.save(ROOT/'reference.png')
    rows=[]; commands=[]
    for i,pid in enumerate(order):
        folder=root/'parts'/pid; folder.mkdir(parents=True,exist_ok=True)
        a=masks[pid]; inside=a>127
        visible=(owner==i+1)&(src[:,:,3]>127)
        control=np.full((*inside.shape,3),(0,255,0),np.uint8)
        control[inside]=(255,255,0); control[visible]=(255,0,0)
        cleared=np.full_like(control,160); cleared[visible]=src[:,:,:3][visible]
        assert np.all(cleared[~visible]==160)
        Image.fromarray(a).save(folder/'shape.png')
        Image.fromarray(control).save(folder/'control.png')
        Image.fromarray(cleared).save(folder/'input.png')
        ys,xs=np.where(inside); bw=xs.max()+1-xs.min(); bh=ys.max()+1-ys.min()
        ratio=(2/3 if bh>bw else 3/2) if max(bw,bh)/max(1,min(bw,bh))>1.45 else 1
        ch=max(bh*1.2,bw*1.2/ratio,32); cw=ch*ratio
        cx=(xs.max()+1+xs.min())/2; cy=(ys.max()+1+ys.min())/2
        box=[round(cx-cw/2),round(cy-ch/2),round(cx+cw/2),round(cy+ch/2)]
        size=[1024,1536] if ratio<1 else [1536,1024] if ratio>1 else [1024,1024]
        cropped=[]
        for name,arr,bg,resample in [('control',control,(0,255,0),Image.Resampling.NEAREST),('input',cleared,(160,160,160),Image.Resampling.LANCZOS)]:
            im=Image.new('RGB',(box[2]-box[0],box[3]-box[1]),bg); im.paste(Image.fromarray(arr),(-box[0],-box[1]))
            cropped.append(im.resize(size,resample))
        # Re-clear after resampling as well: no source pixels leak into grey zones.
        ic=np.array(cropped[1]); red=np.array(cropped[0])[:,:,1]==0; ic[~red]=160
        cropped[0].save(folder/'control-crop.png'); Image.fromarray(ic).save(folder/'input-crop.png')
        (folder/'prompt.txt').write_text(prompt(nodes[pid]))
        rows.append(dict(id=pid,level=i,crop=box,size=size,model=MODEL,visiblePixels=int(visible.sum()),hiddenPixels=int((inside&~visible).sum()),shapeSha256=hashlib.sha256(a.tobytes()).hexdigest()))
        cmd=['forgeax-imagegen','edit','--model',MODEL,'--image',str(folder/'input-crop.png'),'--image',str(folder/'control-crop.png'),'--prompt-file',str(folder/'prompt.txt'),'--size',f'{size[0]}x{size[1]}','--quality','high','--background','transparent','--output-format','png','--no-augment','--out',str(folder/'generated.png')]
        commands.append((pid,shlex.join(cmd)+' > '+shlex.quote(str(folder/'generation.log'))+' 2>&1 && echo '+shlex.quote('OK '+pid)+' || echo '+shlex.quote('FAILED '+pid)))
    priority=['face/face_base','face/ear_left','face/ear_right','arms/arm_right/upper_arm','legs/leg_left/foot','hair/hair_cap']
    commands.sort(key=lambda p: priority.index(p[0]) if p[0] in priority else 90+order.index(p[0]))
    (root/'commands.nul').write_bytes(('\0'.join(c for p,c in commands)+'\0').encode())
    (ROOT/'manifest.json').write_text(json.dumps(dict(canvas=list(SIZE),standardCommit='0f11ad1b',order='occlusion.json, back to front',parts=rows),ensure_ascii=False,indent=2)+'\n')
    for name in ['groups.json','occlusion.json']:(ROOT/name).write_bytes((STANDARD/name).read_bytes())
    print('Prepared 90 exact shapes and aligned neutral-grey edit pairs; all non-red input pixels checked.')

if __name__=='__main__':main()
