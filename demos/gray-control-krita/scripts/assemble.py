"""Place model pixels in the SVG frame; preserve alpha geometry, then source detail.

No inpainting, clone filling, colour-threshold repair, or synthetic colour fields.
Uncovered generated areas are explicitly recorded for regeneration/paint review.
"""
import hashlib
import json
import sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from registration import register, generation
from smooth_fit import smooth_fit

ROOT=Path(__file__).resolve().parents[1]

def contour_deform(path, target):
    """Match the two silhouettes' horizontal spans by resampling model pixels.

    Used only for individually reviewed single-surface parts. This does not
    invent colour: every output position addresses the original generated PNG.
    """
    raw=np.array(Image.open(path).convert('RGBA'))
    silhouette=raw[:,:,3]>200
    gy,gx=np.where(silhouette);ty,tx=np.where(target>0)
    rows=np.unique(gy)
    spans=[]
    for sy in rows:
        coords=np.where(silhouette[sy])[0]
        runs=np.split(coords,np.where(np.diff(coords)>1)[0]+1)
        body=max(runs,key=len)
        spans.append((body[0],body[-1]))
    spans=np.array(spans,dtype='float32')
    smooth=ndi.gaussian_filter1d(spans,3,axis=0)
    mapx=np.zeros(target.shape,np.float32);mapy=np.zeros(target.shape,np.float32)
    for y in np.unique(ty):
        xs=np.where(target[y]>0)[0]
        sy=gy.min()+1+(y-ty.min())/max(1,ty.max()-ty.min())*max(0,gy.max()-gy.min()-2)
        sy=int(rows[np.argmin(abs(rows-sy))])
        j=int(np.searchsorted(rows,sy));lo=max(spans[j,0],smooth[j,0]);hi=min(spans[j,1],smooth[j,1])
        if lo>hi:lo,hi=spans[j]
        # Tiny free strands in the model do not define the main part width.
        # Smooth dominant contour correspondence avoids abrupt scanline jumps.
        u=(xs-xs.min())/max(1,xs.max()-xs.min())
        mapx[y,xs]=lo+u*(hi-lo)
        mapy[y,xs]=sy
    data=cv2.remap(raw,mapx,mapy,cv2.INTER_LINEAR)
    return data[:,:,:3].astype('float32'),data[:,:,3],{'method':'reviewed contour coordinate deformation'}

def checker(w,h):
    y,x=np.indices((h,w));g=np.where((x//10+y//10)%2,218,235).astype('uint8')
    return Image.fromarray(np.dstack([g,g,g,np.full_like(g,255)]))

def review_card(p,folder):
    a=Image.open(folder/'shape.png');b=a.getbbox();b=(max(0,b[0]-8),max(0,b[1]-8),min(1024,b[2]+8),min(1536,b[3]+8))
    sources=[ROOT/'reference.png',folder/'control.png',folder/'model.png',folder/'full.png']
    cw,ch=b[2]-b[0],b[3]-b[1]
    panel=Image.new('RGB',(max(720,cw*4),ch+48),'white');d=ImageDraw.Draw(panel)
    d.text((4,4),f"{p['level']:02d} {p['id']} | native pixels | reference / control / generated registered / source overlay",fill='black')
    for i,src in enumerate(sources):
        im=Image.open(src).convert('RGBA').crop(b);base=checker(cw,ch);base.alpha_composite(im);panel.paste(base,(i*cw,40))
    review=ROOT/'review';review.mkdir(exist_ok=True);panel.save(review/f"{p['level']:02d}.png")

def main():
    manifest=json.loads((ROOT/'manifest.json').read_text())
    source=np.array(Image.open(ROOT/'reference.png').convert('RGBA'))
    records=[]
    ids=set(sys.argv[1:])
    for p in manifest['parts']:
        if ids and p['id'] not in ids:continue
        w=ROOT/'work/parts'/p['id'];out=ROOT/'parts'/p['id']
        try:g=generation(w)
        except FileNotFoundError:continue
        digest=hashlib.sha256(g.read_bytes()).hexdigest()
        fits=json.loads((ROOT/'shape-fit.json').read_text()) if (ROOT/'shape-fit.json').exists() else {}
        mode=fits.get(p['id'])
        if (out/'registration.json').exists() and json.loads((out/'registration.json').read_text()).get('generationSha256')==digest and json.loads((out/'registration.json').read_text()).get('shapeFit')==mode and json.loads((out/'registration.json').read_text()).get('revision')==3:
            continue
        out.mkdir(parents=True,exist_ok=True)
        full=np.array(Image.open(w/'shape.png'));c=np.array(Image.open(w/'control.png'));visible=c[:,:,1]==0
        rgb,a,stats=(smooth_fit(g,full) if mode == 'smooth' else contour_deform(g,full)) if mode else register(w,p,full,source,visible)
        # When generation has changed framing strongly, fit its alpha bbox.
        # This is a coordinate transform of generated pixels, never a fill.
        if not mode and stats['iou']<.85:
            raw=np.array(Image.open(g).convert('RGBA'));m=raw[:,:,3]>127;ys,xs=np.where(m)
            ty,tx=np.where(full>127)
            box=[xs.min(),ys.min(),xs.max()+1,ys.max()+1]
            sx=(tx.max()+1-tx.min())/(box[2]-box[0]);sy=(ty.max()+1-ty.min())/(box[3]-box[1])
            mat=np.array([[sx,0,tx.min()-sx*box[0]],[0,sy,ty.min()-sy*box[1]]],np.float32)
            data=cv2.warpAffine(raw,mat,(1024,1536),flags=cv2.INTER_LINEAR)
            ca=data[:,:,3];score=((ca>127)&(full>127)).sum()/max(1,((ca>127)|(full>127)).sum())
            if score>stats['iou']:
                rgb=data[:,:,:3].astype('float32');a=ca;stats={'method':'alpha-bbox','iou':float(score),'matrix':mat.tolist()}
        # Original pixels are restricted to the observed uncontaminated visible
        # region. A small geometric transition will be visually brush-reviewed.
        blend=np.clip(ndi.distance_transform_edt(visible)-.5,0,1.5)/1.5
        model=np.uint8(np.clip(np.rint(rgb),0,255))
        rgba=np.dstack([model,full]);rgba[full==0]=0
        result=rgba.copy();result[:,:,:3]=np.uint8(np.rint(model*(1-blend[:,:,None])+source[:,:,:3]*blend[:,:,None]));result[full==0]=0
        # Missing alpha is never silently sourced from the original. Retain its
        # actual generated coverage and require a generation or painting repair.
        uncovered=(full>127)&(a<32)&~visible
        result[uncovered,3]=0;rgba[uncovered,3]=0
        Image.fromarray(rgba).save(out/'model.png');Image.fromarray(result).save(out/'full.png')
        for name in ['shape.png','control.png','input.png']:(out/name).write_bytes((w/name).read_bytes())
        actual_prompt=w/({'generated-v5.png':'prompt-v5.txt','generated-review.png':'prompt-review.txt','generated-retry.png':'prompt-retry.txt','generated-final.png':'prompt-final.txt'}.get(g.name,'prompt.txt'))
        (out/'prompt.txt').write_bytes(actual_prompt.read_bytes())
        stats.update(generation=g.name,generationSha256=digest,shapeFit=mode,revision=3,uncoveredHiddenPixels=int(uncovered.sum()))
        (out/'registration.json').write_text(json.dumps(stats,indent=2)+'\n')
        review_card(p,out)
        print(p['id'],stats['method'],'uncovered',stats['uncoveredHiddenPixels'],flush=True)
        records.append(p['id'])
    print('assembled',len(records),'new model outputs',flush=True)

if __name__=='__main__':main()
