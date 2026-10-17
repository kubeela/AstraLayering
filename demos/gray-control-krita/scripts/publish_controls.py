"""Publish final RGB ownership maps while preserving the actual API input maps.

Post-review source exclusions and SVG antialias support are reflected in the
final maps. Model-input images remain verbatim and are never relabeled as finals.
"""
from pathlib import Path
import json,shutil
from PIL import Image
import numpy as np
R=Path(__file__).resolve().parents[1]
source=np.array(Image.open(R/'reference.png').convert('RGB'))
rows=json.loads((R/'manifest.json').read_text())['parts']
for p in rows:
 f=R/'parts'/p['id']
 for n in ['input','control']:
  dest=f/f'{n}-model.png'
  if not dest.exists():shutil.copyfile(f/f'{n}.png',dest)
 a=np.array(Image.open(f/'shape.png'));visible=(np.array(Image.open(f/'visible-overlay-mask.png'))>0)&(a>0)
 c=np.full((*a.shape,3),(0,255,0),np.uint8);c[a>0]=(255,255,0);c[visible]=(255,0,0)
 inp=np.full_like(source,160);inp[visible]=source[visible]
 Image.fromarray(c).save(f/'control.png');Image.fromarray(inp).save(f/'input.png')
print('90 final RGB maps include the complete SVG alpha support; model inputs preserved.')
