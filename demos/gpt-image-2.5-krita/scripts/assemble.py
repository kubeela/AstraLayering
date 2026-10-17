"""Register generated completions to standard masks and restore observed pixels.

This intentionally does not trust a model's canvas size, matte or geometry. All
saved parts have the source canvas coordinates and true alpha. Original-pose
occlusion is a separate, reversible Krita transparency mask.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

from prepare import HERE, STANDARD, W, H, dump


def foreground(im):
    rgba = np.array(im.convert('RGBA'))
    rgb = rgba[:,:,:3]
    alpha = rgba[:,:,3]
    if (alpha < 16).mean() > .05:
        return alpha > 100, 'generated-alpha'
    r,g,b = [rgb[:,:,i].astype(np.int16) for i in range(3)]
    green = (g > 150) & (g > r+65) & (g > b+45)
    if green.mean() > .12:
        spill = (g > r+12) & (g > b+12)
        mask = ~spill
        mode = 'green-key'
    else:
        # Some image endpoints return an opaque painted checker. Both checker
        # colors are neutral and light; keep chromatic artwork and dark lines.
        neutral = (rgb.max(2).astype(int)-rgb.min(2) < 9) & (rgb.min(2)>170)
        mask = ~neutral
        mode = 'opaque-neutral-background'
    labels,count = ndi.label(mask)
    sizes=np.bincount(labels.ravel());sizes[0]=0
    # Reject isolated encoding specks, but keep legitimate disconnected pieces.
    keep=sizes > max(6, sizes.max()*.0003)
    mask=ndi.binary_fill_holes(keep[labels])
    if mode=='green-key':
        core=ndi.binary_erosion(mask,iterations=3)
        if core.sum()>mask.sum()*.5:
            mask=core  # Remove mixed green/subject pixels before color extension.
    return mask, mode


def bbox(mask):
    yy,xx=np.where(mask)
    if not len(xx):
        raise ValueError('Empty generated foreground')
    return [int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]


def register(im, full, record):
    fg, mode = foreground(im)
    rgb=np.array(im.convert('RGB'))
    gb=bbox(fg)
    tb=bbox(full>127)
    x0,y0,x1,y1=tb
    gx0,gy0,gx1,gy1=gb
    # Map the generated foreground bounds back to the author's full shape.
    # A deterministic row warp restores the contour for single solid parts.
    patch=rgb[gy0:gy1,gx0:gx1]
    fm=fg[gy0:gy1,gx0:gx1]
    ix=ndi.distance_transform_edt(~fm,return_distances=False,return_indices=True)
    patch=patch[tuple(ix)]
    tw,th=x1-x0,y1-y0
    reg=cv2.resize(patch,(tw,th),interpolation=cv2.INTER_CUBIC)
    target=full[y0:y1,x0:x1]>127
    gm=cv2.resize(fm.astype(np.uint8),(tw,th),interpolation=cv2.INTER_NEAREST)>0
    # Eyes, fingers, skin and broad hair are solid. Branching crown and chains
    # use only the bounding transform so their holes don't become stretched.
    simple = ('face_base' in record['id'] or '/iris' in record['id'] or
              '/sclera' in record['id'] or record['id'].startswith(('arms/','body/','legs/'))
              and not any(t in record['id'] for t in ('anklet','gem')))
    if simple and tw>2 and th>2:
        for y in range(th):
            s=np.flatnonzero(gm[y]);t=np.flatnonzero(target[y])
            if len(s)>1 and len(t)>1:
                a,b=int(t[0]),int(t[-1])+1
                reg[y,a:b]=cv2.resize(reg[y:y+1,s[0]:s[-1]+1],(b-a,1),interpolation=cv2.INTER_CUBIC)[0]
    canvas=np.zeros((H,W,3),np.uint8)
    canvas[y0:y1,x0:x1]=reg
    edge=(full>0)&(full<=127)&(canvas.max(2)==0)
    if edge.any():
        near=ndi.distance_transform_edt(full<=127,return_distances=False,return_indices=True)
        canvas[edge]=canvas[tuple(near[:,edge])]
    return canvas, dict(background=mode,generatedBounds=gb,targetBounds=tb,
                        scale=[tw/(gx1-gx0),th/(gy1-gy0)],rowWarp=simple)


def harmonize(gen, src, visible, full, pid):
    """Solve a smooth low-frequency color correction, clamped to source pixels.

    Hidden textures still come from the real image-model output. Only their
    low-frequency boundary colors are corrected to avoid a pasted-on seam.
    """
    gen=gen.astype(np.float32)
    skin_part=(pid=='neck' or pid.startswith('arms/') or
               pid in ('legs/leg_left/leg','legs/leg_right/leg',
                       'legs/leg_left/foot','legs/leg_right/foot'))
    cloth_part=pid in ('body/torso','pelvis')
    if skin_part or cloth_part:
        # Finish smooth hidden skin/fabric with source-guided healing. The image
        # model sometimes paints an anklet on a foot or a neckline on a neck,
        # despite those being separate parts. Observed pixels remain untouched;
        # only hidden material gets a smooth color field plus bounded GPT detail.
        r,g,b=[src[:,:,i].astype(float) for i in range(3)]
        opaque=src[:,:,3]>240
        skin=opaque & (r>180) & (r>g+3) & (r>b+7)
        cloth=opaque & (r>200) & (g>200) & (b>200) & (abs(r-g)<20) & (b>r-7)
        zones=[(skin, full>0)] if skin_part else [(cloth,full>0)]
        if pid=='body/torso':
            yy=np.arange(full.shape[0])[:,None]
            zones=[(skin,(full>0)&(yy<340)),(cloth,(full>0)&(yy>=340))]
        for material,zone in zones:
            seed=visible & material & zone
            if seed.sum()<3:seed=visible & material
            if seed.sum()<3:continue
            nearest=ndi.distance_transform_edt(~seed,return_distances=False,return_indices=True)
            field=src[:,:,:3][tuple(nearest)].astype(np.float32)
            field=ndi.gaussian_filter(field,(3,3,0))
            bx,by,bw,bh=cv2.boundingRect(zone.astype(np.uint8))
            section=field[by:by+bh,bx:bx+bw].copy()
            known=seed[by:by+bh,bx:bx+bw]
            values=src[by:by+bh,bx:bx+bw,:3]
            for _ in range(64):
                section=cv2.blur(section,(3,3));section[known]=values[known]
            field[by:by+bh,bx:bx+bw]=section
            detail=gen-ndi.gaussian_filter(gen,(5,5,0))
            healed=np.clip(field+np.clip(detail,-1.5,1.5),0,255)
            gen[zone & ~visible]=healed[zone & ~visible]
    if visible.any() and not (skin_part or cloth_part):
        # A nearest-pixel correction propagates eyelashes/hairline ink into
        # hidden skin. Use a robust uniform color shift sampled well inside
        # owned areas; preserve generated shading rather than spreading ink.
        safe=ndi.binary_erosion(visible,iterations=3)
        if not safe.any():safe=visible
        delta=np.median(src[:,:,:3][safe].astype(np.float32)-gen[safe],axis=0)
        gen=np.clip(gen+np.clip(delta,-18,18),0,255)
    if pid=='face/face_base':
        # The model occasionally hallucinates a nose highlight even when asked
        # for a featureless base. Remove such bright isolated pixels in the
        # hidden eye/nose/mouth area, without touching source-owned cheeks.
        area=(~visible)&(full>0)
        yy,xx=np.indices(area.shape)
        area &= (yy>177)&(yy<245)&(xx>470)&(xx<555)
        bright=area & (gen.min(2)>240)
        bright=ndi.binary_dilation(bright,iterations=1)&area
        if bright.any():
            gen=cv2.inpaint(gen.astype(np.uint8),bright.astype(np.uint8)*255,4,cv2.INPAINT_TELEA).astype(np.float32)
        # Feather the raster fringe of removed features into the clean model
        # base. Literal source restoration here preserves hair/ornament shadows
        # as ghost features. This is the only intentional visible-pixel retouch.
        weight=np.clip((ndi.distance_transform_edt(visible)-1)/5,0,1)
        yy=np.arange(full.shape[0])[:,None]
        outer=ndi.distance_transform_edt(full>0)<3
        weight[visible & outer & (yy>222)]=1  # Keep the original jaw outline.
        gen=gen*(1-weight[:,:,None])+src[:,:,:3]*weight[:,:,None]
    else:
        gen[visible]=src[:,:,:3][visible]
    return np.rint(gen).astype(np.uint8)


def contact_sheet(entries, output, kind='full'):
    thumb=176;cell_h=230;cols=6
    for page in range((len(entries)+23)//24):
        chunk=entries[page*24:(page+1)*24]
        sheet=Image.new('RGB',(cols*thumb,4*cell_h),'#eeeeef')
        draw=ImageDraw.Draw(sheet)
        for i,p in enumerate(chunk):
            folder=output/'parts'/p['id']
            im=Image.open(folder/f'{kind}.png')
            b=im.getchannel('A').point(lambda a: 255 if a>127 else 0).getbbox()
            if b:
                im=im.crop(b)
                scale=min((thumb-16)/im.width,188/im.height)
                im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
                x=(i%cols)*thumb+(thumb-im.width)//2;y=(i//cols)*cell_h+8
                sheet.paste(im,(x,y),im)
            label=p['id'].replace('head_accessories/','acc/').replace('jeweled_suspension/','')
            words=label.split('/')
            text='\n'.join(['/'.join(words[:-1]),words[-1]])
            draw.text(((i%cols)*thumb+5,(i//cols)*cell_h+199),text,fill='#242430')
        sheet.save(output/f'contact-{kind}-{page+1}.jpg',quality=93)


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--work',type=Path,default=HERE/'.work')
    ap.add_argument('--output',type=Path,default=HERE.parent)
    ap.add_argument('--partial',action='store_true')
    args=ap.parse_args();work=args.work.resolve();out=args.output.resolve()
    out.mkdir(parents=True,exist_ok=True)
    m=json.loads((work/'manifest.json').read_text())
    src=np.array(Image.open(work/'source.png').convert('RGBA'))
    src[src[:,:,3]==0]=0  # Invisible RGB under alpha=0 is not image content.
    owner=np.array(Image.open(work/'owner.png'))
    missing=[p['id'] for p in m['parts'] if not (work/'parts'/p['id']/'generated.png').exists()]
    if missing and not args.partial:
        raise SystemExit(f'Missing {len(missing)} model outputs: '+', '.join(missing))
    entries=[];assembled=np.zeros_like(src)
    for p in m['parts']:
        pid=p['id'];folder=work/'parts'/pid
        if not (folder/'generated.png').exists():continue
        selected=json.loads((folder/'selected.json').read_text()) if (folder/'selected.json').exists() else {}
        p=dict(p,**selected)
        target=out/'parts'/pid;target.mkdir(parents=True,exist_ok=True)
        full=np.array(Image.open(folder/'full-mask.png'))
        pose=np.array(Image.open(folder/'pose-mask.png'))
        visible=owner==p['index']
        gen,registration=register(Image.open(folder/'generated.png'),full,p)
        rgb=harmonize(gen,src,visible,full,pid)
        rgba=np.dstack([rgb,full]);rgba[full==0]=0
        Image.fromarray(rgba).save(target/'full.png')
        visible_rgba=np.zeros_like(src)
        visible_rgba[visible,:3]=rgba[visible,:3]
        visible_rgba[visible,3]=src[visible,3]
        Image.fromarray(visible_rgba).save(target/'visible.png')
        Image.fromarray(pose).save(target/'pose-mask.png')
        # Keep control, prompt and source-coordinate mask with each delivered
        # part. Raw costly model outputs remain cached in the work directory.
        for name in ('control.png','prompt.txt'):
            shutil.copy2(folder/name,target/name)
        if selected.get('promptFile'):
            shutil.copy2(folder/selected['promptFile'],target/'prompt.txt')
        composed=rgba.copy()
        composed[:,:,3]=np.rint(full.astype(float)*pose/255).astype(np.uint8)
        assembled[visible]=composed[visible]
        entries.append(dict(p,registration=registration,
                            generatedSha256=hashlib.sha256((folder/'generated.png').read_bytes()).hexdigest(),
                            fullSha256=hashlib.sha256((target/'full.png').read_bytes()).hexdigest()))
    Image.fromarray(assembled).save(out/'reassembled.png')
    shutil.copy2(work/'source.png',out/'reference.png')
    shutil.copy2(work/'groups.json',out/'groups.json')
    shutil.copy2(work/'ownership-preview.png',out/'ownership.png')
    if not missing:
        if np.abs(assembled[:,:,3].astype(int)-src[:,:,3]).max()>1:
            raise AssertionError('Reassembly changed source alpha by more than one quantization level')
    dump(out/'manifest.json',dict(m,parts=entries,missing=missing))
    dump(out/'validation.json',dict(parts=len(entries),expectedParts=90,missing=missing,
         rgbaMeanAbsoluteError=float(np.abs(assembled.astype(float)-src).mean()),
         rgbaMaxAbsoluteError=int(np.abs(assembled.astype(int)-src).max()),
         sourceOwnedPixels=int((owner>0).sum()),unassignedSourcePixels=int(((src[:,:,3]>0)&(owner==0)).sum()),
         comparison='All visible source RGBA pixels partitioned among semantic leaf parts; no flattened overlay.',
         completion='Model-generated hidden regions registered to accepted SVG boundaries; rest-pose masks are reversible.'))
    contact_sheet(entries,out)
    print(json.dumps({'assembled':len(entries),'missing':len(missing),'output':str(out)}))


if __name__=='__main__':main()
