"""Smooth coordinate deformation of generated paint; alpha-only registration.

This only maps generated pixels to the standard. It does not synthesize paint
and records areas still needing artist strokes after placement.
"""
import cv2,numpy as np
from PIL import Image
from scipy import ndimage as ndi

def smooth_fit(path,target):
 raw=np.array(Image.open(path).convert('RGBA'))
 gy,gx=np.where(raw[:,:,3]>127);ty,tx=np.where(target>127)
 # Start with bounding-box alignment in the 1:1 target crop.
 x0,x1=tx.min(),tx.max()+1;y0,y1=ty.min(),ty.max()+1
 w,h=x1-x0,y1-y0
 data=cv2.resize(raw[gy.min():gy.max()+1,gx.min():gx.max()+1],(w,h),interpolation=cv2.INTER_LINEAR)
 T=target[y0:y1,x0:x1]>127;G=data[:,:,3]>127
 # Fit smoothed outer spans. Both boundary functions are smoothed before
 # mapping so fine curls never cause discontinuous row-by-row scaling.
 def bounds(mask):
  rows=np.where(mask.any(axis=1))[0];lo=[];hi=[]
  for y in rows:
   xs=np.where(mask[y])[0];lo.append(xs[0]);hi.append(xs[-1])
  yy=np.arange(mask.shape[0]);left=np.interp(yy,rows,lo);right=np.interp(yy,rows,hi)
  sigma=max(2,h*.009)
  return ndi.gaussian_filter1d(left,sigma),ndi.gaussian_filter1d(right,sigma)
 tl,tr=bounds(T);gl,gr=bounds(G)
 yy,xx=np.indices((h,w),dtype='float32');u=(xx-tl[:,None])/np.maximum(tr-tl,2)[:,None]
 mx=(gl[:,None]+u*(gr-gl)[:,None]).astype('float32')
 result=cv2.remap(data,mx,yy,cv2.INTER_LINEAR)
 out=np.zeros((*target.shape,4),np.uint8);out[y0:y1,x0:x1]=result
 return out[:,:,:3].astype('float32'),out[:,:,3],{'method':'smooth silhouette coordinate deformation'}
