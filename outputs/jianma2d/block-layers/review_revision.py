"""R2 evidence; all leaf operations aggregate every segment by data-group-path.

Run from the subject output directory with REVIEW_NODE / REVIEW_SHARP set.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import hashlib, json, os, shutil, subprocess, sys
import xml.etree.ElementTree as ET

ROOT=Path('block-layers');EV=ROOT/'evidence';REV=EV/'revision-r2-bases'
TMP=REV/'.work';TMP.mkdir(exist_ok=True)
SVG=ROOT/'character.svg';REF=Path('references/base-subject.png')
PREVIEW=Path('../../.agents/skills/live2d-layering/tools/svg_preview.py')
COMPARE=Path('../../.agents/skills/live2d-layering/3.大层分层稿/tools/compare.py')
PREVIOUS=REV/'previous.svg';INITIAL=EV/'revision-r1-r3/baseline.svg'

def run(args):
    subprocess.run([sys.executable,*map(str,args)],check=True,stdout=subprocess.DEVNULL,
                   env=dict(os.environ,TMPDIR=str(TMP.resolve())))

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def by_path(path):
    result={}
    for node in ET.parse(path).getroot().iter():
        group_path=node.get('data-group-path')
        if group_path:result.setdefault(group_path,[]).append(node)
    return result

def serialized(parts):return b''.join(ET.tostring(part) for part in parts)

def flatten(groups,prefix=''):
    for group in groups:
        path=prefix+'/'+group['name'] if prefix else group['name']
        if group['groups']:yield from flatten(group['groups'],path)
        else:yield path

current,previous,initial=by_path(SVG),by_path(PREVIOUS),by_path(INITIAL)
segment_ids={path:[part.get('id') for part in parts] for path,parts in current.items()}
all_ids=[identity for ids in segment_ids.values() for identity in ids]
expected=set(flatten(json.loads(Path('structure/groups.json').read_text())['groups']))
assert set(current)==set(previous)==set(initial)==expected
assert len(current)==45 and len(all_ids)==len(set(all_ids))==47 and all(all_ids)
assert not any(node.tag.rsplit('}',1)[-1] in ('clipPath','mask','image','linearGradient','radialGradient')
               or node.get('clip-path') or node.get('mask') for node in ET.parse(SVG).getroot().iter())
changed=[path for path in current if serialized(current[path])!=serialized(previous[path])]
hair_paths=['hair/crown_hair','hair/right_bangs','hair/left_bangs']
ear_paths=['face/right_ear','face/left_ear']
assert set(changed)==set(hair_paths+ear_paths),changed
for path in hair_paths:assert serialized(current[path])==serialized(initial[path]),path
for path in ear_paths:assert ET.tostring(current[path][0])==ET.tostring(previous[path][0]),path

def render(out,paths=(),hide=(),crop=None,scale=1):
    args=[PREVIEW,SVG,out]
    for path in paths:
        for identity in segment_ids[path]:args+=['--only',identity]
    for path in hide:
        for identity in segment_ids[path]:args+=['--hide',identity]
    if crop:args+=['--crop',*crop]
    if scale!=1:args+=['--scale',scale]
    run(args)
    return Image.open(out).convert('RGBA')

def compare(rendered,out,crop=None,scale=1):
    args=[COMPARE,'--reference',REF,'--rendered',rendered,'--out',out]
    if crop:args+=['--crop',*crop]
    if scale!=1:args+=['--scale',scale]
    run(args)

full=render(EV/'rendered-transparent.png')
shutil.copy2(EV/'rendered-transparent.png',REV/'current-transparent.png')
run([PREVIEW,SVG,ROOT/'preview.png','--background','white'])
white=Image.open(ROOT/'preview.png').convert('RGBA')
assert full.size==Image.open(REF).size==(1024,1536)
assert white.tobytes()==Image.alpha_composite(Image.new('RGBA',full.size,'white'),full).tobytes()
old=Image.open(REV/'previous-transparent.png').convert('RGBA')
diff=ImageChops.difference(old,full)
rgb_bbox,alpha_bbox=diff.convert('RGB').getbbox(),diff.getchannel('A').getbbox()
for box in (rgb_bbox,alpha_bbox):
    assert box is None or (440<=box[0]<=box[2]<=595 and 268<=box[1]<=box[3]<=289),box
changed_pixels=sum(any(pixel) for pixel in diff.getdata())
compare(EV/'rendered-transparent.png',EV/'full')
compare(EV/'rendered-transparent.png',EV/'head',(375,75,280,320),3)
compare(EV/'rendered-transparent.png',REV/'ears',(440,255,155,85),5)
for side,crop in [('right',(445,258,42,42)),('left',(548,258,43,42))]:
    compare(EV/'rendered-transparent.png',REV/('current-'+side+'-ear'),crop,8)

selected=hair_paths+ear_paths+['hair/right_side_lock','hair/left_side_lock']
checks={}
for path in selected:
    leaf=path.split('/')[-1];isolated=REV/'leaves'/(leaf+'.png')
    layer=render(isolated,[path]);hidden_path=REV/'hidden'/(leaf+'.png')
    hidden=render(hidden_path,hide=[path])
    count=sum(any(pixel) for pixel in ImageChops.difference(full,hidden).getdata())
    assert layer.getbbox() is not None and count>0
    checks[path]={'ids':segment_ids[path],'isolated':str(isolated),'hidden':str(hidden_path),
                  'isolation_bbox':list(layer.getbbox()),'hidden_changed_pixels':count}

# Actual 8x SVG renders expose the formerly clipped regions, including thin edges.
rows=[]
for name,path,crop in [('crown-right','hair/crown_hair',(446,264,25,25)),
                       ('right-bangs','hair/right_bangs',(446,264,25,25)),
                       ('crown-left','hair/crown_hair',(568,264,25,25)),
                       ('left-bangs','hair/left_bangs',(568,264,25,25))]:
    out=REV/(name+'-8x.png')
    old_layer=EV/'revision-r1-r3/leaves'/(path.split('/')[-1]+'.png')
    args=[PREVIEW,SVG,out,'--compare',old_layer,'--crop',*crop,'--scale',8,
          '--columns',3,'--background','checker']
    for identity in segment_ids[path]:args+=['--only',identity]
    run(args);rows.append((name,Image.open(out).convert('RGB')))
board=Image.new('RGB',(600,sum(row.height+22 for _,row in rows)),'#eeeeee')
d=ImageDraw.Draw(board);y=0
for name,row in rows:
    d.text((4,y+3),name+' / previous (1x source), current (8x SVG), blend',fill='black')
    board.paste(row,(0,y+22));y+=row.height+22
board.save(REV/'hair-bases-comparison.png')
run([PREVIEW,SVG,REV/'complete-hair-bases.png','--crop',440,155,155,140,'--scale',3,
     '--only','crown_hair','--part','right_bangs','--part','left_bangs','--columns',3,
     '--background','checker'])

# A leaf board uses all ear ids for isolation and all ear ids for hiding.
ref=Image.open(REF).convert('RGBA')
ear_board=Image.new('RGB',(1376,744),'#eeeeee');d=ImageDraw.Draw(ear_board)
for i,(side,crop) in enumerate([('right',(443,262,43,43)),('left',(549,262,43,43))]):
    x,y,w,h=crop;path='face/'+side+'_ear'
    panels=[ref.crop((x,y,x+w,y+h)),full.crop((x,y,x+w,y+h)),
            Image.open(checks[path]['isolated']).convert('RGBA').crop((x,y,x+w,y+h)),
            Image.open(checks[path]['hidden']).convert('RGBA').crop((x,y,x+w,y+h))]
    for j,(name,panel) in enumerate(zip(['reference','current stack','whole ear leaf','without whole ear'],panels)):
        panel=Image.alpha_composite(Image.new('RGBA',panel.size,'white'),panel)
        panel=panel.resize((344,344),Image.Resampling.NEAREST).convert('RGB')
        d.text((j*344+4,i*372+5),side+' / '+name,fill='black')
        ear_board.paste(panel,(j*344,i*372+28))
ear_board.save(REV/'ear-leaf-aggregation.png')

colors=json.loads((ROOT/'group-colors.json').read_text());paths=list(colors)
palette=[tuple(bytes.fromhex(color[1:])) for color in colors.values()]
pix=list(full.getdata());nearest={}
for pixel in set(p for p in pix if p[3]):
    distances=[sum((pixel[j]-color[j])**2 for j in range(3)) for color in palette]
    index=min(range(len(palette)),key=distances.__getitem__)
    nearest[pixel]=index if distances[index]<=64 else -1
labels=[nearest.get(pixel,-1) for pixel in pix]

def visible(indices,out):
    image=Image.new('RGBA',full.size)
    image.putdata([pixel if index in indices else (0,0,0,0) for pixel,index in zip(pix,labels)])
    image.save(out);return image

manifest=json.loads((REV/'previous-review-manifest.json').read_text())
previous_sha=sha(PREVIOUS);current_sha=sha(SVG)
manifest.update(svg_sha256=current_sha,drawing_segment_count=len(all_ids),leaf_segments=segment_ids,
                current_review_scope='R2 hair bases and whole-path ear occlusion')
manifest['previous_independent_recheck']={'svg_sha256':previous_sha,'R1':'pass','R3':'pass',
    'R2_visible':'pass','R2_hidden_hair_bases':'revise','report':'reviews/group_layers/审查.md'}
for category in manifest['major_classes']:
    name=category['path']
    if name not in ('face','hair'):continue
    members=[path for path in current if path.startswith(name+'/')]
    layer_path=REV/(name+'-isolated.png');layer=render(layer_path,members)
    box=(435,150,165,190) if name=='face' else (405,85,220,565)
    visible_path=TMP/(name+'-visible.png')
    visible({paths.index(path) for path in members},visible_path)
    target=EV/'categories'/name;compare(visible_path,target,box,2 if name=='face' else 1)
    x,y,w,h=box
    panels=[Image.open(target/'reference.png'),layer.crop((x,y,x+w,y+h)),
            Image.open(target/'overlay.png'),Image.open(target/'blend.png')]
    cw,ch=240,round(h/w*240);board=Image.new('RGB',(cw*4,ch+28),'#eeeeee');d=ImageDraw.Draw(board)
    for j,(name2,panel) in enumerate(zip(['reference','complete path class','visible boundary','visible blend'],panels)):
        panel=Image.alpha_composite(Image.new('RGBA',panel.size,'white'),panel.convert('RGBA'))
        board.paste(panel.resize((cw,ch),Image.Resampling.LANCZOS).convert('RGB'),(j*cw,28))
        d.text((j*cw+4,5),name+' / '+name2,fill='black')
    board.save(EV/'categories'/(name+'.png'))
    category.update(svg_sha256=current_sha,review='R2 updated; all segment ids included')
for leaf in manifest['leaves']:
    path=leaf['path'];leaf['ids']=segment_ids[path]
    leaf['control']='aggregate every id in ids for this data-group-path'
    leaf['geometry_changed_since_initial']=serialized(current[path])!=serialized(initial[path])
    if path in selected:
        leaf.update(current_svg_sha256=current_sha,current_isolation=checks[path]['isolated'],
                    isolation_bbox=checks[path]['isolation_bbox'],current_evidence=str(REV/(
                        'hair-bases-comparison.png' if path in hair_paths else 'ear-leaf-aggregation.png')),
                    review='R2 current aggregate leaf and neighbouring occlusion rechecked')
        layer=visible({paths.index(path)},TMP/(leaf['id']+'-visible.png'))
        leaf['visible_bbox']=list(layer.getbbox()) if layer.getbbox() else None
        leaf['visible_bbox_svg_sha256']=current_sha
manifest['revision_history']=[manifest['revision']]
manifest['revision']={'scope':'R2 hidden hair bases only','previous_svg_sha256':previous_sha,
    'svg_sha256':current_sha,'preview_sha256':sha(ROOT/'preview.png'),'changed_leaf_paths':changed,
    'unchanged_leaf_paths':len(current)-len(changed),'leaf_count':len(current),
    'drawing_segment_count':len(all_ids),'leaf_segments':segment_ids,'removed_resource':'ear_visibility_windows',
    'complete_hair_geometry_equals_initial':hair_paths,'complete_ear_base_geometry_equals_previous':ear_paths,
    'full_render_changed_rgba_pixels':changed_pixels,'full_render_rgb_change_bbox':rgb_bbox,
    'full_render_alpha_change_bbox':alpha_bbox,
    'R1_R3_preservation':'unchanged serialized groups and identical pixels outside the R2 ear region',
    'isolation_and_hide':checks,'evidence':[str(REV/path) for path in ['hair-bases-comparison.png',
        'complete-hair-bases.png','ear-leaf-aggregation.png','current-right-ear/comparison.png',
        'current-left-ear/comparison.png','ears/blend.png']],
    'script':str(ROOT/'review_revision.py'),'independent_recheck':'pending'}
(EV/'review-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
(REV/'manifest.json').write_text(json.dumps(manifest['revision'],indent=2,ensure_ascii=False)+'\n')
shutil.rmtree(TMP)
print(json.dumps({key:manifest['revision'][key] for key in ['svg_sha256','preview_sha256','leaf_count',
    'drawing_segment_count','changed_leaf_paths','full_render_changed_rgba_pixels']},indent=2))
