"""Hand-selected source contaminations, inspected against the reference at 1:1.

These geometric strokes only clear edit inputs. They never paint a completion
or alter a part silhouette, and never inspect source colours for thresholds.
"""
import json
import shutil
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
CORRECTIONS={
 'face/face_base': {'polygons':[
  [[476,128],[546,128],[549,145],[523,143],[512,149],[498,142],[477,146]],
  [[458,182],[501,182],[501,210],[458,210]],
  [[524,182],[564,182],[564,210],[524,210]],
  [[465,170],[501,170],[501,181],[465,181]],
  [[527,170],[560,170],[560,181],[527,181]],
  [[501,229],[523,229],[523,246],[501,246]]],
  'note':'发根蓝灰楔片、眼睑与睫毛边、眉边、唇周深色不属于脸底，目视选区清除；轮廓不变。'},
 'legs/leg_right/foot':{'lines':[
  {'points':[[468,1378],[466,1388],[469,1400],[478,1409],[489,1415],[501,1408],[508,1396],[512,1381]],'width':9},
  {'points':[[490,1353],[489,1372]],'width':10},
  {'points':[[485,1416],[483,1438]],'width':14}],
  'note':'按原图脚链走向手工选带及两枚吊坠范围，将混入脚部红区的链节完整清除。'},
 'legs/leg_left/foot':{'lines':[
  {'points':[[513,1380],[517,1397],[527,1408],[540,1417],[551,1409],[558,1396],[561,1381]],'width':9},
  {'points':[[540,1358],[542,1379]],'width':10},
  {'points':[[540,1418],[540,1438]],'width':14}],
  'note':'按原图脚链走向手工选带及两枚吊坠范围，保留脚趾本身的线条。'},
 'hair/hair_cap':{'polygons':[
  [[451,218],[473,218],[473,263],[451,263]],
  [[551,216],[575,216],[575,263],[551,263]]],
  'note':'底发面中混入的两侧耳坠残段清除，恢复连续头发。'}
}

def main():
    manifest=json.loads((ROOT/'manifest.json').read_text())
    rows={p['id']:p for p in manifest['parts']}
    for pid in sys.argv[1:] or CORRECTIONS:
        spec=CORRECTIONS[pid];f=ROOT/'work/parts'/pid;p=rows[pid]
        for name in ['control.png','input.png','control-crop.png','input-crop.png','prompt.txt']:
            backup=f/'attempt-1'/name;backup.parent.mkdir(exist_ok=True)
            if not backup.exists():shutil.copyfile(f/name,backup)
        selection=Image.new('L',tuple(manifest['canvas']));d=ImageDraw.Draw(selection)
        for poly in spec.get('polygons',[]):d.polygon([tuple(v) for v in poly],fill=255)
        for line in spec.get('lines',[]):d.line([tuple(v) for v in line['points']],fill=255,width=line['width'],joint='curve')
        alpha=np.array(Image.open(f/'shape.png'));sel=(np.array(selection)>0)&(alpha>127)
        control=np.array(Image.open(f/'attempt-1/control.png'));control[sel]=(255,255,0)
        inp=np.array(Image.open(f/'attempt-1/input.png'));inp[sel]=160
        Image.fromarray(control).save(f/'control.png');Image.fromarray(inp).save(f/'input.png')
        Image.fromarray((sel*255).astype('uint8')).save(f/'source-cleanup.png')
        box=p['crop'];size=p['size'];imgs=[]
        for arr,bg,resample in [(control,(0,255,0),Image.Resampling.NEAREST),(inp,(160,160,160),Image.Resampling.LANCZOS)]:
            im=Image.new('RGB',(box[2]-box[0],box[3]-box[1]),bg);im.paste(Image.fromarray(arr),(-box[0],-box[1]));imgs.append(im.resize(size,resample))
        a=np.array(imgs[1]);a[np.array(imgs[0])[:,:,1]!=0]=160
        imgs[0].save(f/'control-crop.png');Image.fromarray(a).save(f/'input-crop.png')
        print(pid,int(sel.sum()),'input pixels cleared')
    (ROOT/'source-cleanup.json').write_text(json.dumps(CORRECTIONS,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
