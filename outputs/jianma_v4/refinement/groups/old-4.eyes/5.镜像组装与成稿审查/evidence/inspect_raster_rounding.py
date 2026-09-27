from PIL import Image,ImageOps
from pathlib import Path
import numpy as np,json
p=Path('refinement/groups/eyes/5.镜像组装与成稿审查/evidence')
for mode in ['on','off']:
 a=Image.open(p/('eye_left-'+mode+'.png')).convert('RGBA');b=ImageOps.mirror(Image.open(p/('eye_right-'+mode+'.png')).convert('RGBA'))
 aa=np.array(a).astype(float);bb=np.array(b).astype(float)
 wa=aa[:,:,:3]*aa[:,:,3,None]/255+255-aa[:,:,3,None]
 wb=bb[:,:,:3]*bb[:,:,3,None]/255+255-bb[:,:,3,None]
 d=np.abs(wa-wb);print(mode,{'white_max':float(d.max()),'white_mean':float(d.mean()),'alpha_max':float(np.abs(aa[:,:,3]-bb[:,:,3]).max()),'opaque_rgb_max':float(np.abs(aa[:,:,:3]-bb[:,:,:3])[(aa[:,:,3]==255)&(bb[:,:,3]==255)].max())})
