"""Inspect actual paired outputs and render blinded comparisons; no prompt modification."""
from pathlib import Path
import copy
import hashlib
import importlib.util
import json
import os
import subprocess
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
manifest = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
TRIAL = Path(manifest['root'])
SHARED = TRIAL / 'shared'
DEST = OUT / 'evidence'
DEST.mkdir(exist_ok=True)
NODE = Path('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
TOOL = SHARED / 'tools/render_svg.cjs'
ns = {'s': 'http://www.w3.org/2000/svg'}
ET.register_namespace('', ns['s'])
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')

spec = importlib.util.spec_from_file_location('preview', SHARED / 'tools/svg_preview.py')
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)

def write_svg(root, path):
    ET.ElementTree(root).write(path, encoding='utf-8', xml_declaration=True)

def render(svg, png):
    result = subprocess.run([str(NODE), str(TOOL), str(svg), str(png)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)

def array(file):
    return np.array(Image.open(file).convert('RGBA'))

def flat(file):
    im = Image.open(file).convert('RGBA')
    bg = Image.new('RGBA', im.size, (242,244,246,255))
    bg.alpha_composite(im)
    return np.array(bg.convert('RGB')).astype(np.int16)

def board(items, dest, crop=None, scale=1):
    images=[]
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
    for name, filename in items:
        im=Image.open(filename).convert('RGBA')
        if crop: im=im.crop(crop)
        im=im.resize((im.width*scale,im.height*scale),Image.Resampling.LANCZOS)
        cell=Image.new('RGB',(im.width,im.height+36),'white')
        cell.paste(im,(0,36),im)
        ImageDraw.Draw(cell).text((8,6),name,font=font,fill='#182d38')
        images.append(cell)
    output=Image.new('RGB',(sum(i.width for i in images),max(i.height for i in images)),'white')
    x=0
    for im in images:output.paste(im,(x,0));x+=im.width
    output.save(dest)

result={'scope':'SVG/render evidence only; artistic and planning judgment separate','inputs_unchanged':{}}
for name, data in manifest['inputs'].items():
    result['inputs_unchanged'][name]=hashlib.sha256((SHARED/name).read_bytes()).hexdigest()==data['sha256']
assert all(result['inputs_unchanged'].values())

# A/B identities are separate from the executor folder letters; reviewer is not given the mapping.
maps={'structure':{'A':'s','B':'r'}, 'mouth':{'A':'r','B':'s'}, 'shadow':{'A':'s','B':'r'}}
(OUT/'blind-map.json').write_text(json.dumps(maps,indent=2),encoding='utf-8')

for case, files in [('structure',['结构安排.md','补全要求.txt']),('mouth',['character.svg','结构对照.png']),('shadow',['character.svg','preview.png'])]:
    case_dir=DEST/case;case_dir.mkdir(exist_ok=True)
    for code, variant in maps[case].items():
        d=case_dir/code;d.mkdir(exist_ok=True)
        for name in files:
            src=TRIAL/case/variant/name
            if src.exists():(d/name).write_bytes(src.read_bytes())

shadow=DEST/'shadow'
if all((shadow/c/'character.svg').exists() for c in ['A','B']):
    render(SHARED/'shadow-input.svg',shadow/'baseline.png')
    base=flat(shadow/'baseline.png');ref=flat(SHARED/'shadow-reference.png')
    truth=np.max(np.abs(ref-base),axis=2)>1
    root=ET.parse(SHARED/'shadow-input.svg').getroot()
    mask=ET.Element(root.tag,root.attrib)
    face=copy.deepcopy(next(n for n in root.iter() if n.get('id')=='face_base'))
    for n in face.iter():
        if n.tag.rsplit('}',1)[-1]=='path':n.set('fill','#ffffff')
    mask.append(face);write_svg(mask,shadow/'receiver.svg');render(shadow/'receiver.svg',shadow/'receiver.png')
    allowed=array(shadow/'receiver.png')[:,:,3]>0
    rows={}
    for code in ['A','B']:
        d=shadow/code
        r=ET.parse(d/'character.svg').getroot()
        try:preview.validate_svg_resources(r);valid=True;error=None
        except ValueError as exc:valid=False;error=str(exc)
        render(d/'character.svg',d/'render.png')
        effects=[n for n in r.iter() if n.get('data-effect')=='cast-shadow']
        ids=[n.get('id') for n in effects]
        off=copy.deepcopy(r)
        for n in off.iter():
            if n.get('data-effect')=='cast-shadow':n.set('style',n.get('style','')+';display:none!important')
        write_svg(off,d/'off.svg');render(d/'off.svg',d/'off.png')
        cand=flat(d/'render.png');offpixels=flat(d/'off.png')
        delta=np.max(np.abs(cand-offpixels),axis=2)
        changed=delta>1
        union=truth|changed
        rows[code]={'valid_resources':valid,'resource_error':error,'effect_ids':ids,
                    'source_target':[dict(n.attrib) for n in effects],
                    'toggle_changed_pixels':int(changed.sum()),
                    'pixels_outside_receiver':int((changed&~allowed).sum()),
                    'off_vs_input_changed_pixels':int((np.max(np.abs(offpixels-base),axis=2)>0).sum()),
                    'reference_shadow_pixels':int(truth.sum()),
                    'footprint_iou':float((truth&changed).sum()/max(1,union.sum())),
                    'mean_rgb_error_reference_shadow':float(np.abs(cand-ref)[truth].mean()),
                    'mean_rgb_error_union_region':float(np.abs(cand-ref)[union].mean())}
    result['shadow']=rows
    board([('Reference',SHARED/'shadow-reference.png'),('A',shadow/'A/render.png'),('B',shadow/'B/render.png')],shadow/'comparison.png',scale=2)

mouth=DEST/'mouth'
if all((mouth/c/'character.svg').exists() for c in ['A','B']):
    before=ET.parse(SHARED/'mouth-input.svg').getroot()
    before_ids={n.get('id'):n for n in before if n.get('id') and n.get('data-part')!='mouth'}
    rows={}
    for code in ['A','B']:
        d=mouth/code;r=ET.parse(d/'character.svg').getroot()
        try:preview.validate_svg_resources(r);valid=True;error=None
        except ValueError as exc:valid=False;error=str(exc)
        render(d/'character.svg',d/'render.png')
        comp={}
        for n in r.iter():
            name=n.get('data-mouth-component')
            if name:
                comp.setdefault(name,[]).append({'id':n.get('id'),'geometry_count':sum(e.tag.rsplit('}',1)[-1] in preview.PAINT for e in n.iter())})
        shape_fields=('d','points','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','width','height','transform','fill','stroke','opacity','clip-path','mask','filter')
        def artwork_signature(n):
            return [(e.tag,e.get('id'),{k:e.get(k) for k in shape_fields if e.get(k) is not None}) for e in n.iter() if e.tag.rsplit('}',1)[-1] not in ('desc','metadata','title')]
        after_ids={n.get('id'):n for n in r if n.get('id')}
        changed_nonmouth=[key for key,node in before_ids.items() if key not in after_ids or artwork_signature(node)!=artwork_signature(after_ids[key])]
        rows[code]={'valid_resources':valid,'resource_error':error,'components':comp,'changed_nonmouth_top_level_ids':changed_nonmouth}
        # Show underlying geometry when just the upper/lower controls are hidden.
        reveal=copy.deepcopy(r)
        for n in reveal.iter():
            if n.get('data-mouth-component') in ('mouth_upper','mouth_lower'):
                n.set('style',n.get('style','')+';display:none!important')
        write_svg(reveal,d/'reveal.svg');render(d/'reveal.svg',d/'reveal.png')
    result['mouth']=rows
    board([('Reference',SHARED/'reference.png'),('A',mouth/'A/render.png'),('B',mouth/'B/render.png')],mouth/'comparison.png',crop=(418,229,482,261),scale=10)
    board([('A: upper/lower hidden',mouth/'A/reveal.png'),('B: upper/lower hidden',mouth/'B/reveal.png')],mouth/'hidden-parts.png',crop=(418,222,482,270),scale=10)

(OUT/'observations.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
