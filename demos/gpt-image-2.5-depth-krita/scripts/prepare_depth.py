"""Build RGB controls from part-layering's occlusion.json depth table.

Ownership of every visible source pixel is the front-most leaf part (highest
occlusion level) whose completed SVG covers it. Red = owned visible pixels,
yellow = rest of the completed shape (hidden by parts in front), green = other.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shlex
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import cairosvg
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
STANDARD = Path.home() / 'workspaces/AstraLayering/workflow-next/part-layering/.run/test'
W, H = 1024, 1536
MODEL = 'gpt-image-2.5-flare'


def leaves(nodes, parent=None):
    for node in nodes:
        if node.get('groups'):
            yield from leaves(node['groups'], node)
        else:
            yield node, parent


@lru_cache(maxsize=None)
def shape(stage, part):
    png = cairosvg.svg2png(url=str(STANDARD / stage / (part + '.svg')), output_width=W, output_height=H)
    return np.array(Image.open(BytesIO(png)).convert('RGBA'))[:, :, 3]


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def crop_box(mask, margin=1.35):
    yy, xx = np.where(mask)
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    bw, bh = x1 - x0, y1 - y0
    ratio = max(bw, bh) / max(1, min(bw, bh))
    aspect = (2 / 3 if bh > bw else 3 / 2) if ratio > 1.45 else 1
    ch = max(bh * margin, bw * margin / aspect, 40)
    cw = ch * aspect
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    size = [1024, 1536] if aspect < 1 else [1536, 1024] if aspect > 1 else [1024, 1024]
    return [round(cx - cw / 2), round(cy - ch / 2), round(cx + cw / 2), round(cy + ch / 2)], size


def label(pid):
    return pid.replace('/', ' / ')


EXTRA = {
    'face/face_base': '脸底只包含额头至下巴的皮肤，不含耳朵或脖子。移除头发、额饰、眉毛、眼睛、鼻部独立细节和嘴巴，'
                      '依据周围皮肤补成连续自然、无五官的脸底；头发遮住的额头及侧脸也需补完整，不可残留鼻部白点、嘴痕或发丝阴影。',
    'body/torso': '原图白色连体服及其领口、肩带、缝线和冷灰阴影保留；被遮处依邻域材质补齐，保持完整不透明的白色连体服，不画裸露身体。',
    'body/breast': '原图白色连体服覆盖的胸部保持原有白色衣料和阴影，补全处同样是不透明白色衣料，不画裸露身体。',
    'pelvis': '原图白色连体服的下摆与腿根保持原样，被遮处依邻域衣料和皮肤补齐，不画裸露私密部位。',
    'neck': '只输出脖子皮肤；被头发和下巴遮住的上端补成平滑连续的皮肤，不画下巴阴影或下巴轮廓线，不带锁骨以下衣物、头发或项链。',
    'hair/back_hair/lock_right': '一缕淡紫白色长发，黄色中间段被前面的头发遮住，沿发丝走向用同样的淡紫白发色补成连续发束，不带粉色、黄色或肤色。',
    'hair/back_hair/lock_left': '一缕淡紫白色长发，黄色中间段被前面的头发遮住，沿发丝走向用同样的淡紫白发色补成连续发束，不带粉色、黄色或肤色。',
    'legs/leg_left/foot': '只输出赤脚皮肤。脚踝上的银链和蓝色吊坠是单独部件，必须去掉，用相邻肤色补齐，不画任何饰品。',
    'face/ear_right': '黄色区域在图1里看到的是遮挡物（发丝、脸颊、眼睛），不是耳朵，必须全部去掉；按耳朵结构补画：外耳轮、内耳浅凹和耳垂，'
                      '肤色与红色区的耳朵一致，形状填满红黄并集。耳钉、耳坠和头发都不属于本部件。',
    'face/ear_left': '黄色区域在图1里看到的是遮挡物（发丝、脸颊、眼睛），不是耳朵，必须全部去掉；按耳朵结构补画：外耳轮、内耳浅凹和耳垂，'
                     '肤色与红色区的耳朵一致，形状填满红黄并集。耳钉、耳坠和头发都不属于本部件。',
    'head_accessories/left_earring/ear_stud': '一颗很小的银白珍珠耳钉，补全被耳朵和头发遮住的部分，只画耳钉本身，不画皮肤或头发。',
    'face/mouth/mouth_interior': '张开嘴里面的口腔底色：柔和的深粉红色块，保持图1的简单动漫画法，不画逐颗牙齿、舌苔或写实口腔细节。',
    'head_accessories/forehead_ornament/upper_sapphire_mount': '额饰上的菱形宝石托：浅银白细框包着浅蓝色宝石，颜色与图1一样浅淡，不画深蓝或多切面宝石。',
    'hair/hair_cap': '这是贴头的头发面（脸后面的后脑头发）；黄色中的脸部位置也必须用头发填满，被脸、前侧发和饰物遮住的部分沿发丝走向补全，不画脸、耳朵或饰物，不留脸形空洞。',
}


def prompt(node, occluders):
    pid = node['id']
    if pid.endswith('/iris'):
        extra = '补成完整圆形虹膜和瞳孔，保持图1的动漫画法：浅蓝灰渐变、圆形深色瞳孔，不画写实虹膜纹理或竖瞳；白色反光属于单独的高光层，必须移除并用相邻虹膜色阶补齐；上眼睑和睫毛的棕色不属于本层，顶部用虹膜的深蓝色补齐。'
    elif pid.endswith('/sclera'):
        extra = '这是一整片眼白底形。移除虹膜、瞳孔、反光、眼睑和睫毛，用自然冷灰白眼白补满，不能留洞。'
    elif pid.endswith(('_link', '_connector')):
        extra = '这是一个很小的浅银白色金属连接件，颜色与图1一致；被遮住的一端按同样的银白金属补齐，不画金色、红色、宝石或光晕。'
    elif 'teeth' in pid:
        extra = '原图中这排牙齿几乎完全被嘴唇遮住；按黄色范围画出一条简单、干净连续的浅米白牙齿带，不画逐颗牙缝和嘴唇红色，保持原图画风和色调。'
    else:
        extra = EXTRA.get(pid, '')
    cover = '、'.join(dict.fromkeys(occluders)) if occluders else '其它部件'
    return f'''请根据图2的 RGB 控制图，对图1进行部件提取和遮挡补全。
目标部件：{pid}，{node.get('name') or ''}。部件说明：{node['note']}
两张输入图坐标一一对应（以同一窗口裁切并等比放大）；图1中不属于本部件的区域已涂成绿色。图2中的颜色只是操作指令，不是输出颜色：
- 红色：保留图1对应位置的该部件像素，尽量保持原有像素、色彩、明暗、线条和画风。
- 黄色：在这里恢复目标部件。移除覆盖在它上面的{cover}，依据红色区域的连续结构补成完整自然的同一部件，不能挖空，不能带入其它部件。
- 绿色：该位置不属于本次输出，设为完全透明。
红色与黄色并集内的每个像素都必须是不透明的目标部件内容，不留空洞、缺口或透明洞。
{extra}
严格沿红色与黄色并集的轮廓制作；部件在画面中的位置、朝向、比例和大小不变，不居中、不拉伸、不重新设计。
画风必须与图1一致：柔和、浅淡、低对比的日系动漫上色，线条细软，细节很少。补全部分是被遮住的同一部件的自然延续，
看起来要像同一位画师在同一张图里画的；不要写实、厚涂或高细节风格，不要加入图1没有的纹理、硬高光、宝石切面、发光、金色或其它新颜色。
最终只输出一张透明背景 PNG，内容仅为完成提取与补全的 {pid}。不画棋盘格、光晕、投影、文字或控制图颜色；
若无法输出透明背景，背景必须是均匀纯绿色 RGB(0,255,0)。
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', type=Path, default=OUT / 'work')
    args = ap.parse_args()
    work = args.work.resolve()
    tree = json.loads((STANDARD / 'groups.json').read_text())
    occ = json.loads((STANDARD / 'occlusion.json').read_text())
    nodes = {n['id']: (n, p) for n, p in leaves(tree['groups'])}
    order = [row['id'] for row in occ['layers']]  # back -> front
    assert set(order) == set(nodes) and len(order) == len(nodes)
    source = Image.open(STANDARD / 'references/base-subject.png').convert('RGBA')
    src = np.array(source)
    alpha = src[:, :, 3]
    work.mkdir(parents=True, exist_ok=True)
    source.save(work / 'source.png')

    full = {pid: shape('parts', pid) for pid in order}
    # Painter's algorithm over completed shapes: the front-most cover owns a pixel.
    owner = np.zeros((H, W), np.int16)  # 0 = unassigned, else level+1
    for level, pid in enumerate(order):
        owner[full[pid] > 127] = level + 1
    opaque = alpha > 0
    missing = opaque & (owner == 0)
    if missing.any():
        _, near = ndi.distance_transform_edt(owner == 0, return_indices=True)
        owner[missing] = owner[tuple(near[:, missing])]
    owner[~opaque] = 0
    Image.fromarray(owner.astype(np.uint16)).save(work / 'owner.png')

    manifest, commands = [], []
    for level, pid in enumerate(order):
        node, parent = nodes[pid]
        folder = work / 'parts' / pid
        folder.mkdir(parents=True, exist_ok=True)
        visible = owner == level + 1
        f = np.maximum(full[pid], np.where(visible, alpha, 0).astype(np.uint8))
        Image.fromarray(f).save(folder / 'full-mask.png')
        hidden = (f > 127) & ~visible
        front = [order[i - 1] for i in np.unique(owner[hidden]) if i > level + 1]
        occluders = [nodes[o][0].get('name') or o.split('/')[-1] for o in front]
        control = np.zeros((H, W, 3), np.uint8)
        control[:] = [0, 255, 0]
        control[f > 127] = [255, 255, 0]
        control[visible & (alpha > 127)] = [255, 0, 0]
        Image.fromarray(control).save(folder / 'control.png')
        box, size = crop_box(f > 127)
        cc = Image.new('RGB', (box[2] - box[0], box[3] - box[1]), (0, 255, 0))
        cc.paste(Image.fromarray(control), (-box[0], -box[1]))
        cc.resize(size, Image.Resampling.NEAREST).save(folder / 'control-crop.png')
        sc = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (255, 255, 255, 255))
        piece = source.crop(box)
        sc.alpha_composite(piece)
        sc = sc.convert('RGB').resize(size, Image.Resampling.LANCZOS)
        sc.save(folder / 'source-context.png')
        # Image 1: the source with everything outside this part's shape painted
        # green, so the model does not extract neighbouring parts with it.
        outside = np.array(Image.open(folder / 'control-crop.png'))[:, :, 0] < 128
        scm = np.array(sc); scm[outside] = [0, 255, 0]
        Image.fromarray(scm).save(folder / 'source-crop.png')
        (folder / 'prompt.txt').write_text(prompt(node, occluders))
        rec = dict(id=pid, level=level, index=level + 1, parent=parent['id'] if parent else None, crop=box, size=size,
                   visiblePixels=int(visible.sum()), fullPixels=int((f > 127).sum()), occludedBy=front, model=MODEL)
        manifest.append(rec)
        cmd = ['forgeax-imagegen', 'edit', '--model', MODEL, '--image', str(folder / 'source-crop.png'),
               '--image', str(folder / 'control-crop.png'), '--prompt-file', str(folder / 'prompt.txt'),
               '--size', f'{size[0]}x{size[1]}', '--quality', 'high', '--background', 'transparent', '--output-format', 'png', '--no-augment',
               '--out', str(folder / 'generated.png')]
        commands.append(f'test -s {shlex.quote(str(folder / "generated.png"))} || '
                        f'{shlex.join(cmd)} > {shlex.quote(str(folder / "generation.log"))} 2>&1')
    (work / 'commands.nul').write_bytes(('\0'.join(commands) + '\0').encode())
    dump(work / 'manifest.json', dict(version=1, canvas=[W, H], order='occlusion.json back-to-front', parts=manifest,
         occlusionSourceHash=occ['sourceHash'],
         sourceSha256=hashlib.sha256((STANDARD / 'references/base-subject.png').read_bytes()).hexdigest()))
    print(json.dumps(dict(parts=len(order), unassignedFilled=int(missing.sum()),
                          zeroVisible=[m['id'] for m in manifest if m['visiblePixels'] == 0])))


if __name__ == '__main__':
    main()
