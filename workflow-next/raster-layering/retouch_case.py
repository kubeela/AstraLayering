"""Case-specific, visually selected repairs for the 91a8a080 character delivery.

This is not a generic defect detector. Coordinates, material constraints and
selected parts reflect individual visual review of this particular character.
Run on an unchanged baseline export into a separate output directory, then use
krita_retouch.py to apply the reviewed patches to the original native KRA.
"""
from pathlib import Path
import argparse,json,hashlib,shutil
import numpy as np
import cv2
from scipy import ndimage as ndi
from PIL import Image,ImageDraw,ImageFont
from prepare import shape
from assemble import contact_sheet
ap=argparse.ArgumentParser()
ap.add_argument('--input',type=Path,required=True,help='Unmodified 91a8a080 demo directory')
ap.add_argument('--output',type=Path,required=True)
args=ap.parse_args();BASE=args.input.resolve();OUT=args.output.resolve()
if BASE==OUT:raise ValueError('Retouch requires separate baseline and output directories')
if (BASE/'retouch-plan.json').exists():raise ValueError('Use the unretouched 91a8a080 baseline, not a previous repair output')
shutil.copytree(BASE,OUT,dirs_exist_ok=True)
(OUT/'krita-retouch.json').unlink(missing_ok=True)
m=json.loads((BASE/'manifest.json').read_text());entries={p['id']:p for p in m['parts']}
src=np.array(Image.open(BASE/'reference.png').convert('RGBA'));src[src[:,:,3]==0]=0
owner=np.zeros(src.shape[:2],np.int16)
full={};old={};reasons={};patch_masks={}
for pid,p in entries.items():
    vis=np.array(Image.open(BASE/'parts'/pid/'visible.png'))[:,:,3]>0;owner[vis]=p['index']
    old[pid]=np.array(Image.open(BASE/'parts'/pid/'full.png').convert('RGBA'))
    full[pid]=old[pid].copy()
original_owner=owner.copy()
Y,X=np.indices(owner.shape)

def reason(pid,txt):
    if txt not in reasons.setdefault(pid,[]):reasons[pid].append(txt)

def transfer(pid,to,mask):
    selected=mask&(owner==entries[pid]['index'])
    if not selected.any():return
    if to=='face/face_base':
        outside=selected&(old[to][:,:,3]==0)
        for side,side_mask in [('left',X>=512),('right',X<512)]:
            ear=f'face/ear_{side}';part=outside&side_mask
            owner[part]=entries[ear]['index'];full[ear][part]=src[part]
            if part.any():reason(ear,'Receive edge pixels outside face silhouette.')
        selected &= ~outside
    owner[selected]=entries[to]['index']
    full[to][selected,:3]=src[selected,:3]
    full[to][selected,3]=np.maximum(full[to][selected,3],src[selected,3])
    reason(to,'Receive source edge pixels belonging to this part; preserve original-pose pixels.')

def heal(pid,mask,seed=None,sigma=2,why='Repair local contamination.'):
    a=full[pid];valid=a[:,:,3]>0;mask=mask&valid
    if not mask.any():return
    if seed is None:seed=valid&~ndi.binary_dilation(mask,iterations=2)
    seed=seed&valid&~mask
    if not seed.any():raise ValueError(pid+' empty heal seed')
    # Local clone followed by a constrained color-field solve. Do not blur any
    # pixel outside the selected repair mask.
    near=ndi.distance_transform_edt(~seed,return_distances=False,return_indices=True)
    field=a[:,:,:3][tuple(near)].astype(np.float32)
    if sigma:field=ndi.gaussian_filter(field,(sigma,sigma,0))
    bx,by,bw,bh=cv2.boundingRect(mask.astype(np.uint8));pad=3
    x0=max(0,bx-pad);y0=max(0,by-pad);x1=min(a.shape[1],bx+bw+pad);y1=min(a.shape[0],by+bh+pad)
    local=field[y0:y1,x0:x1].copy();fixed=(valid&~mask)[y0:y1,x0:x1]
    values=a[y0:y1,x0:x1,:3].astype(float)
    for _ in range(200):
        local=cv2.blur(local,(3,3));local[fixed]=values[fixed]
    field[y0:y1,x0:x1]=local
    a[mask,:3]=np.rint(np.clip(field[mask],0,255)).astype(np.uint8)
    reason(pid,why)

def hidden(pid):return (full[pid][:,:,3]>0)&(owner!=entries[pid]['index'])

# Eye whites: source-color remnants of iris/eyelids are assigned to the actual
# sibling part; skin pixels go back to the continuous face base.
for side in ['left','right']:
    pid=f'face/eye_{side}/sclera';a=full[pid];r,g,b=[src[:,:,i].astype(int) for i in range(3)]
    owned=owner==entries[pid]['index']
    iris=f'face/eye_{side}/iris';iriszone=ndi.binary_dilation(shape('parts',iris)>64,iterations=1)
    transfer(pid,iris,owned & iriszone & (b>=r-4)&(src[:,:,:3].mean(2)<221))
    transfer(pid,f'face/eye_{side}/upper_eyelid',owned & (r<155)&(r>b+8))
    transfer(pid,'face/face_base',owned & (r>b+7))
    accepted=shape('parts',pid)
    a[:,:,3]=accepted
    own=owner==entries[pid]['index'];a[own,3]=np.maximum(a[own,3],src[own,3]);a[own,:3]=src[own,:3]
    bad=(a[:,:,3]>0)&~own
    good=own&(src[:,:,2].astype(int)>=src[:,:,0].astype(int)-3)&(src[:,:,:3].mean(2)>180)
    heal(pid,bad,good,2,'Remove iris, eyeliner and skin contamination; heal continuous sclera.')
    # The pupil and iris continue under the lid; replace the generated horizontal
    # eyelid stripe with a clone of clean iris rows below it.
    a=full[iris];h=hidden(iris);box=Image.fromarray(a[:,:,3]).getbbox();x0,y0,x1,y1=box
    # Skin speck outside the iris silhouette returns to face skin.
    owned=owner==entries[iris]['index']
    transfer(iris,'face/face_base',owned & (((r>b+8)&(r>215)) | ((Y<193)&(src[:,:,:3].min(2)>225))))
    accepted=shape('parts',iris)
    a[:,:,3]=np.maximum(accepted,np.where(owner==entries[iris]['index'],src[:,:,3],0).astype(np.uint8))
    labels,count=ndi.label(a[:,:,3]>0);sizes=np.bincount(labels.ravel());sizes[0]=0
    specks=(labels!=np.argmax(sizes))&(labels>0)
    transfer(iris,'face/face_base',specks);a[specks]=0
    a[a[:,:,3]==0]=0
    reason(iris,'Remove foreign skin specks and restore source pixels along iris rim.')

# Hair: preserve visible strands, relocate skin slivers, locally clone clean
# hair into the freed region instead of repainting the whole silhouette.
for pid in ['hair/hair_cap','hair/side_hair_left','hair/side_hair_right']:
    a=full[pid];r,g,b=[a[:,:,i].astype(int) for i in range(3)]
    contam=(a[:,:,3]>0)&(Y>130)&(Y<205)&(r>b+8)&(r>180)
    transfer(pid,'face/face_base',contam)
    region=ndi.binary_dilation(contam,iterations=2)&(a[:,:,3]>0)
    region &= owner!=entries[pid]['index']
    heal(pid,region,sigma=1,why='Remove forehead/skin slivers from isolated hair; retain strand direction nearby.')

# Bun: the source lotus is separate. Continue the hair's radial highlight and
# crease directions through the hidden lower bun by reflecting clean top hair.
pid='hair/bun';a=full[pid]
lotus=owner==entries['head_accessories/lotus_ornament']['index']
transfer(pid,'head_accessories/lotus_ornament',ndi.distance_transform_edt(~lotus)<=1.5)
mask=hidden(pid);b=Image.fromarray(a[:,:,3]).getbbox();x0,y0,x1,y1=b
for y in range(y0,y1):
    for x in range(x0,x1):
        if mask[y,x]:
            sy=int(np.clip(30+(y-y0)*.12,30,40));sx=int(np.clip(511+(x-511)*.45,488,536))
            if a[sy,sx,3]:a[y,x,:3]=a[sy,sx,:3]
# Smooth only the narrow repaired boundary, not the retained hair texture.
work=a[:,:,:3].astype(float);smooth=ndi.gaussian_filter(work,(.7,.7,0))
a[mask,:3]=np.rint(smooth[mask]).astype(np.uint8)
reason(pid,'Remove duplicated lotus ornament from hidden bun and clone clean hair structure.')

# Teeth are entirely hidden in this pose. A narrow warm ivory gradient follows
# each authored tooth-row mask, with a darker root and a restrained enamel edge.
for pid in ['face/mouth/upper_teeth','face/mouth/lower_teeth']:
    a=full[pid];box=Image.fromarray(a[:,:,3]).getbbox();x0,y0,x1,y1=box
    t=np.clip((Y-y0)/max(1,y1-y0-1),0,1)
    if 'lower' in pid:t=1-t
    color=np.stack([228+23*t,215+29*t,206+31*t],2)
    active=a[:,:,3]>0;a[active,:3]=np.rint(color[active]).astype(np.uint8)
    reason(pid,'Correct dull/beige hidden tooth row to a coherent warm ivory enamel gradient.')

# Mouth interior: discard disconnected face-colored fringe islands.
pid='face/mouth/mouth_interior';a=full[pid];r,g,b=[src[:,:,i].astype(int) for i in range(3)]
skin=(r>230)&(g>180)&(b>160)
transfer(pid,'face/face_base',skin)
a[:,:,3]=np.maximum(shape('parts',pid),np.where(owner==entries[pid]['index'],src[:,:,3],0).astype(np.uint8))
heal(pid,hidden(pid),seed=(owner==entries[pid]['index']),sigma=1,why='Remove disconnected pale skin islands from mouth interior.')

# Clean hidden ears without propagating earring/hair colors into the skin.
for side in ['left','right']:
    pid=f'face/ear_{side}';a=full[pid];r,g,b=[a[:,:,i].astype(int) for i in range(3)]
    valid=a[:,:,3]>0;own=owner==entries[pid]['index']
    seed=own&(r>b+18)&(r>170)&(r<250)
    heal(pid,hidden(pid),seed,1.2,'Clean hidden ear skin of duplicated earrings and hair; retain observed ear folds.')

# Heal jewelry ghosts on feet from skin sufficiently far away from the chain,
# with no jewelry-edge samples. The source nails, toes and exterior lines stay.
for side in ['left','right']:
    pid=f'legs/leg_{side}/foot';a=full[pid]
    jewelry_ids=[p['index'] for key,p in entries.items() if key.startswith(f'legs/leg_{side}/') and ('anklet/' in key or 'ankle_gem' in key)]
    jewelry=np.isin(owner,jewelry_ids)
    dist,near=ndi.distance_transform_edt(~jewelry,return_indices=True)
    for target,p in entries.items():
        if p['index'] in jewelry_ids:
            transfer(pid,target,(dist<=2.2)&(owner[tuple(near)]==p['index']) & (src[:,:,0].astype(int)-src[:,:,2].astype(int)<28))
    own=owner==entries[pid]['index'];valid=a[:,:,3]>0
    bad=(dist<=2.2)&valid
    bad |= hidden(pid)
    r,g,b=[a[:,:,i].astype(int) for i in range(3)]
    seed=own&(r>b+16)&(r>228)&ndi.binary_erosion(valid,iterations=3)
    seed &= ndi.distance_transform_edt(~bad)>5
    heal(pid,bad,seed,2.5,'Heal chain/pendant ghosts and mixed edge pixels with nearby skin; retain toe and nail detail.')

# The dark hidden joint caps came from contour samples. Extend material from a
# safely interior strip of the adjacent visible limb instead.
for pid in ['arms/arm_right/upper_arm','legs/leg_left/leg','legs/leg_right/leg','neck']:
    a=full[pid];valid=a[:,:,3]>0;own=owner==entries[pid]['index'];r,g,b=[a[:,:,i].astype(int) for i in range(3)]
    seed=own&ndi.binary_erosion(valid,iterations=5)&(r>b+14)&(r>227)
    heal(pid,hidden(pid),seed,2.5,'Blend hidden joint/neck extension from interior skin; remove dark contour-derived cap.')

# Write candidate and explicit per-pixel repair masks. Krita will apply these
# patches to the existing document, rather than rebuild a different tree.
patches=[];assembled=np.zeros_like(src)
for pid,p in entries.items():
    a=full[pid];vis=owner==p['index'];a[a[:,:,3]==0]=0
    a[vis,3]=np.maximum(a[vis,3],src[vis,3])
    # Preserve newly reassigned source pixels on their proper feature. The face
    # base keeps its clean skin; hair/eyeliner fringes must not be pasted back.
    moved=vis&(original_owner!=owner)
    if pid=='face/face_base':
        a[moved,:3]=old[pid][moved,:3]
    else:a[moved,:3]=src[moved,:3]
    alpha=a[:,:,3].astype(float);pose=np.zeros_like(owner,dtype=np.uint8)
    pose[vis]=np.clip(np.rint(src[vis,3].astype(float)*255/alpha[vis]),0,255).astype(np.uint8)
    v=np.zeros_like(src);v[vis,:3]=a[vis,:3];v[vis,3]=src[vis,3];assembled[vis]=v[vis]
    folder=OUT/'parts'/pid
    Image.fromarray(a).save(folder/'full.png');Image.fromarray(v).save(folder/'visible.png');Image.fromarray(pose).save(folder/'pose-mask.png')
    changed=np.any(a!=old[pid],2)
    p['visiblePixels']=int(vis.sum());p['fullPixels']=int((a[:,:,3]>0).sum())
    p['fullSha256']=hashlib.sha256((folder/'full.png').read_bytes()).hexdigest()
    if changed.any() or np.any(vis!=(original_owner==p['index'])):
        Image.fromarray(changed.astype(np.uint8)*255).save(folder/'retouch-mask.png')
        Image.fromarray(old[pid]).save(folder/'before-retouch.png')
        box=Image.fromarray(changed.astype(np.uint8)*255).getbbox()
        patches.append(dict(id=pid,reasons=reasons.get(pid,['Update source ownership.']),changedPixels=int(changed.sum()),bounds=box,beforeSha256=hashlib.sha256((BASE/'parts'/pid/'full.png').read_bytes()).hexdigest(),afterSha256=p['fullSha256']))
Image.fromarray(assembled).save(OUT/'reassembled.png')
(OUT/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
(OUT/'retouch-plan.json').write_text(json.dumps(dict(sourceCommit='91a8a080',parts=patches),ensure_ascii=False,indent=2)+'\n')
contact_sheet(m['parts'],OUT)
print('Changed parts',len(patches));print('\n'.join(f'{p["id"]}: {p["changedPixels"]}' for p in patches))
delta=abs(assembled.astype(int)-np.array(Image.open(BASE/'reassembled.png')).astype(int))
print('Projection max diff',delta.max(),'RGB mse',np.mean(delta[:,:,:3]**2))
