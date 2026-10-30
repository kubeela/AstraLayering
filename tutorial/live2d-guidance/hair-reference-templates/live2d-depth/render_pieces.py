# Usage: python render_pieces.py specs/<model>.json <out>/<model> <runtime models root>
# Render hair parts of an official Live2D sample with a pale face silhouette
# kept in true draw order, at ParamAngleX 0 and 30. Output RGBA pieces + json.
import sys, os, json, hashlib
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); from moc import parents
import glfw
from OpenGL.GL import *
import numpy as np
from PIL import Image
import live2d
W,H=1500,2000
glfw.init(); glfw.window_hint(glfw.VISIBLE, False)
win=glfw.create_window(W,H,'x',None,None); glfw.make_context_current(win)
live2d.init(); live2d.glInit()
spec=json.load(open(sys.argv[1])); out=sys.argv[2]; spec['model']=os.path.join(sys.argv[3],spec['model']); os.makedirs(out,exist_ok=True)
path=spec['model']; ids,par=parents(path.replace('.model3.json','.moc3'))
def anc(i):
    r=set()
    while par[i]>=0: i=par[i]; r.add(i)
    return r
def desc(i):
    r={i}; ch=True
    while ch:
        ch=False
        for k,p in enumerate(par):
            if p in r and k not in r: r.add(k); ch=True
    return r
def keepset(names):
    k=set()
    for t in names: i=ids.index(t); k|=desc(i)|anc(i)
    for t in spec.get('exclude',[]): k-=desc(ids.index(t))
    return k
def render(angle, keep=None):
    m=live2d.Model(); m.LoadModelJson(path); m.CreateRenderer(); m.Resize(W,H)
    m.SetAutoBlink(False); m.SetAutoBreath(False); pids=m.GetPartIds()
    for _ in range(3):
        m.SetParamById('ParamAngleX',angle); m.Update()
        if keep is not None:
            for i,p in enumerate(pids):
                if ids.index(p) not in keep: m.SetPartOpacity(i,0)
    live2d.clearBuffer(0,0,0,0); m.Draw()
    a=glReadPixels(0,0,W,H,GL_RGBA,GL_UNSIGNED_BYTE)
    return np.flipud(np.frombuffer(a,np.uint8).reshape(H,W,4)).astype(np.float32)
face=spec['face']; res={}
for ang in (0,30):
    Image.fromarray(render(ang).astype(np.uint8)).save(f'{out}/full_{ang}.png')
    F=render(ang,keepset(face))
    for key,names in spec['groups'].items():
        P=render(ang,keepset(names)); C=render(ang,keepset(names+face))
        # Face pixels = where the combined render matches the face-only render.
        isface=(F[...,3]>8)&(np.abs(C-F).sum(2)<24)
        pale=np.array([226,230,238,255],np.float32)
        o=C.copy(); o[isface]=pale*(F[isface][:,3:4]/255)
        o[isface,3]=F[isface,3]
        # Thin outline of the face silhouette so it reads on light boards.
        fa=F[...,3]>128; edge=fa^(np.roll(fa,2,0)&np.roll(fa,-2,0)&np.roll(fa,2,1)&np.roll(fa,-2,1))
        o[edge&isface]=[150,160,176,255]
        Image.fromarray(o.clip(0,255).astype(np.uint8)).save(f'{out}/{key}_{ang}.png')
        Image.fromarray(P.astype(np.uint8)).save(f'{out}/{key}_solo_{ang}.png')
        print(ang,key,int((P[...,3]>10).sum()),flush=True)
moc=path.replace('.model3.json','.moc3')
json.dump({'model':os.path.basename(path),'mocSha256':hashlib.sha256(open(moc,'rb').read()).hexdigest()},open(f'{out}/source.json','w'))
