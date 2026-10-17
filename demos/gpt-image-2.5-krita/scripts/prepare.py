"""Create RGB editing controls from the accepted part tree, without changing it.

Source pixels own the resting pose. Full SVG shapes own hidden completion.
The two masks stay separate: a rig may reveal completion without destroying it.
"""
from __future__ import annotations

import argparse
from functools import lru_cache
import hashlib
from io import BytesIO
import json
from pathlib import Path
import shlex

import cairosvg
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
STANDARD = REPO / 'workflow-next/part-layering/.run/test'
W, H = 1024, 1536


def leaves(nodes):
    for node in nodes:
        if node.get('groups'):
            yield from leaves(node['groups'])
        else:
            yield node


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


@lru_cache(maxsize=None)
def shape(stage, part):
    path = STANDARD / stage / (part + '.svg')
    png = cairosvg.svg2png(url=str(path), output_width=W, output_height=H)
    return np.array(Image.open(BytesIO(png)).convert('RGBA'))[:, :, 3]


def ordered(nodes, parent):
    # Occlusion order for the reference pose, back to front. Logical hierarchy
    # remains exactly the accepted groups.json; this only determines ownership.
    preferences = {
        '': ['hair', 'body', 'pelvis', 'legs', 'arms', 'neck', 'face', 'head_accessories'],
        'face': ['face_base', 'ear_left', 'ear_right', 'eye_left', 'eye_right',
                 'eyebrow_left', 'eyebrow_right', 'nose', 'mouth'],
        'hair': ['back_hair', 'hair_cap', 'side_hair_left', 'side_hair_right', 'bun'],
    }
    if parent.endswith(('eye_left', 'eye_right')):
        names = ['sclera', 'iris', 'highlight', 'upper_eyelid', 'lower_eyelid',
                 'lower_eyelashes', 'eyelid_crease']
    elif parent == 'face/mouth':
        names = ['mouth_interior', 'tongue', 'upper_teeth', 'lower_teeth', 'upper_lip', 'lower_lip']
    else:
        names = preferences.get(parent, [n['id'].split('/')[-1] for n in nodes])
    return sorted(nodes, key=lambda n: names.index(n['id'].split('/')[-1]))


def allocate(nodes, region, owner, index, parent=''):
    local = np.zeros((H, W), np.int16)
    nodes = ordered(nodes, parent)
    for i, node in enumerate(nodes, 1):
        # The accepted notes explicitly say neither tooth row is exposed in the
        # reference's small open mouth. They remain full, generated rig parts.
        if node['id'] in ('face/mouth/upper_teeth', 'face/mouth/lower_teeth'):
            continue
        m = shape('stages/outline-reduce', node['id']) > 100
        local[m] = i
    # The line-art standard is subpixel approximate. Attribute only unclaimed
    # source-alpha pixels to the nearest semantic shape, never make new groups.
    missing = region & (local == 0)
    if missing.any():
        nearest = ndi.distance_transform_edt(local == 0, return_distances=False, return_indices=True)
        local[missing] = local[tuple(nearest[:, missing])]
    for i, node in enumerate(nodes, 1):
        selected = region & (local == i)
        if node.get('groups'):
            allocate(node['groups'], selected, owner, index, node['id'])
        else:
            owner[selected] = index[node['id']]


def crop_box(mask):
    yy, xx = np.where(mask)
    x0, x1, y0, y1 = xx.min(), xx.max()+1, yy.min(), yy.max()+1
    bw, bh = x1-x0, y1-y0
    # Crop and enlarge both references identically, preserving aspect ratio.
    ratio = max(bw, bh) / max(1, min(bw, bh))
    aspect = (2/3 if bh > bw else 3/2) if ratio > 1.45 else 1
    ch = max(bh * 1.3, bw * 1.3 / aspect, 24)
    cw = ch * aspect
    cx, cy = (x0+x1)/2, (y0+y1)/2
    return [round(cx-cw/2), round(cy-ch/2), round(cx+cw/2), round(cy+ch/2)], (
        [1024,1536] if aspect < 1 else [1536,1024] if aspect > 1 else [1024,1024])


def refine_face_edges(owner, index, source):
    """Give antialiased feature fringes to their owning feature, not face skin.

    The accepted SVGs are shape guides, not exact raster selections. Two source
    pixels of overlap on eyelids/mouth and the hairline prevent duplicate ink
    from remaining on a supposedly clean skin base. No source pixel is lost.
    """
    base=index['face/face_base']
    feature_ids=[i for p,i in index.items() if p.startswith('face/') and
                 any(s in p for s in ('eye_','eyebrow_','mouth/','nose'))]
    features=np.isin(owner,feature_ids)
    dist,near=ndi.distance_transform_edt(~features,return_indices=True)
    change=(owner==base)&(dist<=3.5)
    owner[change]=owner[tuple(near[:,change])]
    # Face/hair source boundaries include a dark antialiased hairline. Keep it
    # on the corresponding front hair layer, above the clean completed forehead.
    hair_ids=[i for p,i in index.items() if p.startswith('hair/')]
    hair=np.isin(owner,hair_ids)
    dist,near=ndi.distance_transform_edt(~hair,return_indices=True)
    yy=np.arange(H)[:,None]
    change=(owner==base)&(dist<=5.0)&(yy<194)
    owner[change]=owner[tuple(near[:,change])]
    # Match the original antialias fringe where the semantic SVG boundary is a
    # few pixels inside a dark hairline. Preserve the jaw/chin outline itself.
    r,g,b=[source[:,:,i].astype(int) for i in range(3)]
    foreign_ink=(owner==base)&(yy<222)&((r<225)|(b>=r-2))
    candidates=np.isin(owner,feature_ids+hair_ids+
                       [i for p,i in index.items() if p.startswith('head_accessories/forehead_ornament/')])
    _,nearest=ndi.distance_transform_edt(~candidates,return_indices=True)
    owner[foreign_ink]=owner[tuple(nearest[:,foreign_ink])]


def prompt(node):
    note = node['note']
    if node['id'] in ('body/torso', 'body/breast', 'pelvis'):
        note = ('按控制图提取该躯干部件，原图白色连体服及其领口、肩带、缝线、冷灰色阴影保留在对应部件上。'
                '被其它部件遮住的区域依邻域材质补齐，保持覆盖身体的完整白色不透明连体服，不脱衣，不画裸露乳房或私密部位。')
    extra = ''
    if node['id'] == 'face/face_base':
        extra = ('脸底只包含额头至下巴，不含耳朵或脖子。移除所有头发、额饰、眉毛、眼睛、鼻尖亮点、鼻孔和嘴巴，'
                 '补成连续自然、无五官的皮肤底板；不可残留鼻部白点或嘴痕。')
    elif node['id'].endswith('/iris'):
        extra = '补成完整虹膜和瞳孔；白色反光在单独高光层，必须从本层移除，用邻近虹膜色阶补齐。'
    elif node['id'].endswith('/sclera'):
        extra = '这是一整片眼白底形。移除虹膜、瞳孔、反光和睫毛，用自然冷灰白眼白补满，不能留洞。'
    return f'''Use case: precise-object-edit
Asset type: 可编辑角色拆分 PNG，部件 {node['id']}
图1是待编辑的原图局部；图2是 RGB 操作控制图。两张图以完全相同的坐标裁切、等比放大，位置一一对应。
目标部件：{node['id']}。
部件定义：{note}
颜色只代表编辑操作，绝不是输出颜色：
- 红色：保留图1对应位置属于该部件的原有像素、材质、色彩、明暗、线条和画风。
- 黄色：在此补全同一个部件的被遮挡底形；清除覆盖物并依据红区的连续结构补齐，不能挖空，不能重复带入其它部件。
- 绿色：不属于本部件，最终完全透明。
{extra}
请严格沿红色与黄色并集的轮廓制作，不扩大到其它区域，不加其它器官、装饰、肢体或另一侧对称部件。
保持精准的图像编辑：部件在画布中的位置、朝向、比例和大小不变；不自动居中、不拉伸、不重新设计。
最终只输出一张透明背景 PNG，内容仅为该完整部件。不能画棋盘格、背景光晕、投影、文字或控制图颜色。
若透明输出受限，背景必须是均匀纯绿色 RGB(0,255,0)，不得棋盘格；部件本体颜色仍严格来自原图。
'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', type=Path, default=HERE / '.work')
    args = ap.parse_args()
    work = args.work.resolve()
    work.mkdir(parents=True, exist_ok=True)
    tree = json.loads((STANDARD/'groups.json').read_text())
    parts = list(leaves(tree['groups']))
    index = {node['id']: i+1 for i,node in enumerate(parts)}
    source = Image.open(STANDARD/'references/base-subject.png').convert('RGBA')
    src = np.array(source)
    source.save(work/'source.png')
    owner = np.zeros((H,W), np.int16)
    allocate(tree['groups'], src[:,:,3] > 0, owner, index)
    refine_face_edges(owner,index,src)
    Image.fromarray(owner.astype(np.uint16)).save(work/'owner.png')
    dump(work/'groups.json', tree)
    commands = []
    manifest = []
    for n, node in enumerate(parts):
        pid = node['id']
        folder = work/'parts'/pid
        folder.mkdir(parents=True, exist_ok=True)
        full = shape('parts', pid)
        visible = owner == index[pid]
        # Keep tiny original contour corrections (visible source ownership) with
        # their designated part, while retaining the full authored SVG shape.
        full = np.maximum(full, np.where(visible,src[:,:,3],0).astype(np.uint8))
        Image.fromarray(full).save(folder/'full-mask.png')
        pose = np.zeros((H,W),np.uint8)
        pose[visible] = np.rint(src[:,:,3][visible].astype(float)*255/full[visible]).astype(np.uint8)
        Image.fromarray(pose).save(folder/'pose-mask.png')
        control = np.zeros((H,W,3), np.uint8)
        control[:] = [0,255,0]
        control[full>127] = [255,255,0]
        control[visible & (src[:,:,3]>127)] = [255,0,0]
        control = Image.fromarray(control)
        control.save(folder/'control.png')
        box, size = crop_box(full > 127)
        # Pillow fills outside the original canvas with transparency. Explicit
        # green padding on the paired control keeps off-canvas intent unambiguous.
        cropped = Image.new('RGB', (box[2]-box[0],box[3]-box[1]), (0,255,0))
        cropped.paste(control, (-box[0],-box[1]))
        cropped.resize(size, Image.Resampling.NEAREST).save(folder/'control-crop.png')
        source.crop(box).resize(size, Image.Resampling.LANCZOS).save(folder/'source-crop.png')
        (folder/'prompt.txt').write_text(prompt(node))
        record = dict(id=pid,index=index[pid],crop=box,size=size,
                      visiblePixels=int(visible.sum()),fullPixels=int((full>0).sum()),
                      model='gpt-image-2.5-flare')
        manifest.append(record)
        cmd = ['forgeax-imagegen','edit','--model',record['model'],
               '--image',str(folder/'source-crop.png'),'--image',str(folder/'control-crop.png'),
               '--prompt-file',str(folder/'prompt.txt'),'--size',f'{size[0]}x{size[1]}',
               '--quality','high','--output-format','png','--out',str(folder/'generated.png')]
        command = shlex.join(cmd)
        commands.append(f'test -s {shlex.quote(str(folder/"generated.png"))} || {command} > {shlex.quote(str(folder/"generation.log"))} 2>&1')
    (work/'commands.nul').write_bytes(('\0'.join(commands)+'\0').encode())
    dump(work/'manifest.json', dict(version=1,canvas=[W,H],parts=manifest,
         sourceSha256=hashlib.sha256((STANDARD/'references/base-subject.png').read_bytes()).hexdigest(),
         structureSha256=hashlib.sha256((STANDARD/'groups.json').read_bytes()).hexdigest()))
    colors=np.zeros((len(parts)+1,3),np.uint8)
    import colorsys
    for i in range(1,len(colors)):
        colors[i]=np.array(colorsys.hsv_to_rgb((i*.618034)%1,.65,.95))*255
    rgba=np.concatenate([colors[owner],src[:,:,3:4]],axis=2)
    Image.fromarray(rgba).save(work/'ownership-preview.png')
    print(json.dumps({'parts':len(parts),'sourcePixels':int((src[:,:,3]>0).sum()),
                      'unassigned':int(((src[:,:,3]>0)&(owner==0)).sum()),'work':str(work)}))


if __name__ == '__main__':
    main()
