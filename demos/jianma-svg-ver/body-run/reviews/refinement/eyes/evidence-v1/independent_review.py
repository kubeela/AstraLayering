from pathlib import Path
from copy import deepcopy
from collections import Counter
from lxml import etree as ET
from PIL import Image, ImageDraw, ImageFont
import hashlib, json, re, sys
import numpy as np

OUT=Path('reviews/refinement/eyes/evidence-v1')
C=Path('reviews/refinement/eyes/candidates/character-v1.svg')
P=Path('refinement/groups/eyes')
S=ET.parse(str(C)).getroot()
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def idx(r): return {n.get('id'):n for n in r.iter() if n.get('id')}
def write(r,n,box=None,scale=1):
    if box:
        x,y,w,h=box;r.set('viewBox',f'{x} {y} {w} {h}');r.set('width',str(w*scale));r.set('height',str(h*scale))
    ET.ElementTree(r).write(str(OUT/(n+'.svg')),encoding='utf-8',xml_declaration=True)
def changed(a,b):
    d=np.abs(np.asarray(a).astype(int)-np.asarray(b).astype(int))
    return {'pixels':int(np.count_nonzero(d.max(axis=2))), 'max_channel':int(d.max())}
def pic(n):
    im=Image.open(OUT/(n+'.png')).convert('RGBA');bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);return bg.convert('RGB')

if sys.argv[1]=='prepare':
    OUT.mkdir(parents=True,exist_ok=True)
    assert sha(C)=='c7f775b90d84a970a528b9b56b9f7a43f3f484de002133270832f9dc8cadc83e'
    assert sha(P/'1.制作计划/plan.json')=='459f82982d648c44f4b54468c9d4a8c391f68ea16be896fb7ae9126717e87569'
    write(deepcopy(S),'candidate-full')
    write(deepcopy(S),'candidate-both',(394,180,100,37),12)
    write(deepcopy(S),'candidate-master',(399,184,40,31),16)
    variants={}
    nofx=deepcopy(S)
    for n in nofx.xpath('//*[@data-effect and @data-kind="eyes"]'):n.set('display','none')
    variants['effects-off']=nofx
    noskin=deepcopy(nofx)
    for n in noskin.xpath('//*[@data-role="eyelid-and-orbital-skin-material"]'):n.set('display','none')
    variants['effects-and-skin-off']=noskin
    nobands=deepcopy(nofx)
    for eye in ['eye_right','eye_left']:
        for name in ['iris_left_lower_band','iris_right_local_band']:idx(nobands)[eye+'_'+name].set('display','none')
    variants['local-bands-off']=nobands
    vertical=deepcopy(nofx)
    for eye in ['eye_right','eye_left']:
        for name in ['iris_center_transition','iris_left_lower_band','iris_right_local_band','iris_left_peripheral_depth','iris_right_peripheral_depth']:idx(vertical)[eye+'_'+name].set('display','none')
    variants['vertical-only']=vertical
    nohair=deepcopy(S)
    for n in nohair.xpath('/*/*[@data-kind="hair"]'):n.set('display','none')
    variants['hair-off']=nohair
    for name,r in variants.items():
        write(deepcopy(r),name+'-both',(394,180,100,37),12)
        write(deepcopy(r),name+'-master',(399,184,40,31),16)
    clean=ET.parse(str(P/'4.逐眼着色/eye_right/4.4.眼周皮肤明暗/character.svg')).getroot()
    write(clean,'clean-master',(399,184,40,31),16)
    ids=idx(S);counts=Counter(n.get('id') for n in S.iter() if n.get('id'));broken=[]
    for n in S.iter():
        for k,v in n.attrib.items():
            refs=re.findall(r'url\(#([^\)]+)\)',v)
            if k.endswith('href') and v.startswith('#'):refs.append(v[1:])
            for q in refs:
                if q not in ids:broken.append([n.get('id'),k,q])
    approved=ET.parse(str(P/'2.逐眼线稿/eye_right/character.svg')).getroot();ai=idx(approved)
    geo=['d','cx','cy','rx','ry','r','x','y','width','height','transform','stroke-width']
    differences=[]
    for n in ai['eye_right'].iter():
        q=n.get('id')
        if q in ids:
            for k in geo:
                if n.get(k)!=ids[q].get(k):differences.append([q,k,n.get(k),ids[q].get(k)])
    top=list(S);prior=ET.parse(str(P/'5.逐眼投影与高光/eye_right/character.svg')).getroot();pi=idx(prior)
    def canon(n):return ET.tostring(n,method='c14n')
    effects=[dict(n.attrib) for n in S.xpath('//*[@data-effect and @data-kind="eyes"]')]
    mapping=json.loads((P/'6.镜像组装与成稿审查/evidence/id-map.json').read_text(encoding='utf-8'))
    target_ids={n.get('id') for n in ids['eye_left'].iter() if n.get('id')}
    target_external=set();mirror_diffs=[]
    for n in ids['eye_left'].iter():
        for k,v in n.attrib.items():
            refs=re.findall(r'url\(#([^\)]+)\)',v)
            if k.endswith('href') and v.startswith('#'):refs.append(v[1:])
            target_external.update(q for q in refs if q not in target_ids)
    for source,target in mapping.items():
        if source in ['eye_right','eye44_right_face_surface_support']:continue
        a,b=ids[source],ids[target]
        for key in set(a.attrib)|set(b.attrib):
            av=a.get(key);bv=b.get(key)
            if av is not None:
                if av in mapping:av=mapping[av]
                elif av.startswith('#') and av[1:] in mapping:av='#'+mapping[av[1:]]
                else:av=re.sub(r'url\(#([^\)]+)\)',lambda m:'url(#'+mapping.get(m[1],m[1])+')',av)
            if av!=bv:mirror_diffs.append([source,target,key,av,bv])
    audit={'candidate_sha256':sha(C),'plan_sha256':sha(P/'1.制作计划/plan.json'),'reference_sha256':sha('references/base-subject.png'),
      'duplicates':[k for k,v in counts.items() if v>1],'broken_refs':broken,'approved_master_geometry_differences':differences,
      'master_unchanged_since_step5':canon(ids['eye_right'])==canon(pi['eye_right']),
      'non_target_top_level_changes':[n.get('id') for n in top if n.get('id') and n.get('id')!='eye_left' and n.get('id') in pi and canon(n)!=canon(pi[n.get('id')])],
      'target_transform':ids['eye_left'].get('transform'),
      'target_external_refs':sorted(target_external),'mirror_mapped_attribute_differences':mirror_diffs,
      'hair_order':{e:{h:top.index(ids[e])<top.index(ids[h]) for h in ['hair_front_right','hair_front_left']} for e in ['eye_right','eye_left']},
      'effects':effects,
      'stage_sha256':{str(q.relative_to(P)):sha(q) for q in [P/'2.逐眼线稿/eye_right/character.svg',P/'3.眼部色盘/palette.json',*[p/'character.svg' for p in sorted((P/'4.逐眼着色/eye_right').iterdir()) if p.is_dir()],P/'5.逐眼投影与高光/eye_right/character.svg']},
      'reused_evidence':'Same candidate SHA-256 verified for step6 audit and render-checks; symmetry pixel experiment not repeated.'}
    (OUT/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in audit.items() if k not in ['effects','stage_sha256']},ensure_ascii=False,indent=2))
elif sys.argv[1]=='finish':
    ref=Image.open('references/base-subject.png').convert('RGB')
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
    page=Image.new('RGB',(1280,1130),'#eeeeef');d=ImageDraw.Draw(page)
    items=[('原图 · 同坐标眼窝与眼下',ref.crop((399,184,439,215)).resize((640,496))),('候选直接渲染 · 16倍',pic('candidate-master')),('第5步效果关闭 · 保留自身材料',pic('effects-off-master')),('效果与眼周层关闭 · 对照',pic('effects-and-skin-off-master'))]
    for k,(label,im) in enumerate(items):
        x=k%2*640;y=k//2*565;d.text((x+12,y+12),label,font=font,fill='#22242c');page.paste(im,(x,y+50))
    page.save(OUT/'independent-skin-and-effects.png')
    page=Image.new('RGB',(1280,1130),'#eeeeef');d=ImageDraw.Draw(page)
    items=[('原图 · 同坐标',ref.crop((399,184,439,215)).resize((640,496))),('候选自身材料 · 关闭第5步效果',pic('effects-off-master')),('仅纵向虹膜底阶 · 保留瞳孔',pic('vertical-only-master')),('关闭左右局部色带 · 保留中心及边缘',pic('local-bands-off-master'))]
    for k,(label,im) in enumerate(items):
        x=k%2*640;y=k//2*565;d.text((x+12,y+12),label,font=font,fill='#22242c');page.paste(im,(x,y+50))
    page.save(OUT/'independent-iris-material.png')
    page=Image.new('RGB',(1200,1530),'#eeeeef');d=ImageDraw.Draw(page)
    for k,(label,im) in enumerate([('原图 · 双眼同坐标',ref.crop((394,180,494,217)).resize((1200,444))),('候选直接渲染 · 双眼',pic('candidate-both')),('关闭双眼第5步效果 · 色阶与眼周仍在',pic('effects-off-both'))]):
        y=k*510;d.text((12,y+12),label,font=font,fill='#22242c');page.paste(im,(0,y+50))
    page.save(OUT/'independent-both-eyes.png')
    page=Image.new('RGB',(1280,570),'#eeeeef');d=ImageDraw.Draw(page)
    for k,(im,label) in enumerate([(ref,'原图原生像素再放大'),(pic('candidate-full'),'独立候选1倍渲染再放大')]):
        d.text((k*640+12,12),label,font=font,fill='#22242c')
        page.paste(im.crop((399,184,439,215)).resize((640,496)),(k*640,50))
    page.save(OUT/'native-resolution-comparison.png')
    a=json.loads((OUT/'audit.json').read_text(encoding='utf-8'))
    a['render_checks']={'effects_off_master_vs_clean_4_4':changed(pic('effects-off-master'),pic('clean-master')),
      'intrinsic_iris_vs_vertical_only':changed(pic('effects-off-master'),pic('vertical-only-master')),
      'local_bands_on_vs_off':changed(pic('effects-off-master'),pic('local-bands-off-master')),
      'skin_on_vs_off_with_step5_disabled':changed(pic('effects-off-master'),pic('effects-and-skin-off-master'))}
    a['candidate_sha256_after']=sha(C)
    (OUT/'audit.json').write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(a['render_checks'],ensure_ascii=False,indent=2))
