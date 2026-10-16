"""Check the delivered parts and a real reopened Krita export, not mock layers."""
import argparse
import json
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from prepare import dump, leaves, STANDARD

ap=argparse.ArgumentParser();ap.add_argument('output',type=Path);a=ap.parse_args();out=a.output
m=json.loads((out/'manifest.json').read_text())
expected={n['id'] for n in leaves(json.loads((STANDARD/'groups.json').read_text())['groups'])}
assert {p['id'] for p in m['parts']}==expected and len(expected)==90
ref=np.array(Image.open(out/'reference.png').convert('RGBA'));ref[ref[:,:,3]==0]=0
composite=Image.new('RGBA',(1024,1536))
for p in m['parts']:
    root=out/'parts'/p['id'];full=Image.open(root/'full.png');visible=Image.open(root/'visible.png')
    assert full.size==visible.size==(1024,1536) and full.mode==visible.mode=='RGBA',p['id']
    pix=np.array(full);assert pix[:,:,3].max()>0,p['id']
    assert pix[:,:,3].min()==0,p['id']
    color=pix[:,:,:3].astype(int)
    green=(color[:,:,1]>color[:,:,0]+70)&(color[:,:,1]>color[:,:,2]+70)&(pix[:,:,3]>127)
    assert not green.any(),f'Control green leaked into {p["id"]}'
    assert p['generatedSha256'] and (root/'prompt.txt').stat().st_size>20
    composite.alpha_composite(visible)
actual=np.array(composite)
expected_projection=np.array(Image.open(out/'reassembled.png').convert('RGBA'))
assert np.abs(actual.astype(int)-expected_projection.astype(int)).max()<=1,'Independent PNGs fail reconstruction'
delta=abs(actual.astype(int)-ref.astype(int))
face=np.array(Image.open(out/'parts/face/face_base/visible.png'))[:,:,3]>0
assert not delta[:,:,:3][~face].any(),'Visible retouch escaped the face skin base'
assert delta[:,:,3].max()==0,'Source matte changed'
rgb_mse=float(np.mean(delta[:,:,:3].astype(float)**2))
psnr=float(20*np.log10(255/np.sqrt(rgb_mse))) if rgb_mse else None
assert rgb_mse<.65,'Whole-image restoration error exceeds the skin-fringe retouch budget'
k=json.loads((out/'krita-import.json').read_text());assert k['ok']
assert set(k['fullLayersPixelVerified'])==expected
assert k['manifestSha256']==hashlib.sha256((out/'manifest.json').read_bytes()).hexdigest()
assert k['reopenedNodeCounts']=={'paintlayer':90,'transparencymask':90,'grouplayer':25},k['reopenedNodeCounts']
reopened=np.array(Image.open(out/'krita-reopened.png').convert('RGBA'))
reopened[reopened[:,:,3]==0]=0
native_delta=abs(reopened.astype(int)-expected_projection.astype(int))
assert native_delta.max()<=1,f'Krita reopened RGBA mismatch: {native_delta.max()}'
report=json.loads((out/'validation.json').read_text())
report.update(kritaVersion=k['version'],nativePaintLayers=90,nativeTransparencyMasks=90,nativeGroups=25,
              reopenedRgbaMeanAbsoluteError=float(native_delta.mean()),reopenedRgbaMaxAbsoluteError=int(native_delta.max()),
              referenceRgbPsnrDb=psnr,referenceRgbMse=rgb_mse,
              sourceRgbUnchangedFraction=float(np.mean(np.all(delta[:,:,:3]==0,axis=2))),
              retouchedPixels=int(np.count_nonzero(np.any(delta[:,:,:3]>0,axis=2))),
              retouchScope='Only the antialiased feature fringes of face/face_base; source features remain on their own layers.',
              transparentParts=90,independentPngReassemblyMatches=True,passed=True)
dump(out/'validation.json',report)
print(json.dumps(report,ensure_ascii=False,indent=2))
