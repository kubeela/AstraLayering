from pathlib import Path
from copy import deepcopy
from collections import Counter
import hashlib, json, re, sys
from lxml import etree as ET
from PIL import Image, ImageDraw, ImageFont

ROOT = Path.cwd()
OUT = ROOT / 'reviews/refinement/eyes/line-art/eye_right/evidence-v1'
CANDIDATE = ROOT / 'reviews/refinement/eyes/line-art/eye_right/candidates/character-v1.svg'
BASELINE = ROOT / 'refinement/groups/face/6.投影与高光效果/character.svg'
PLAN = ROOT / 'refinement/groups/eyes/1.制作计划/plan.json'
REF = ROOT / 'references/base-subject.png'
S = ET.parse(str(CANDIDATE)).getroot()
B = ET.parse(str(BASELINE)).getroot()
NS = 'http://www.w3.org/2000/svg'
def byid(root, value): return root.xpath('//*[@id=$value]', value=value)[0]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write_svg(root, name):
    ET.ElementTree(root).write(str(OUT / (name+'.svg')),encoding='utf-8',xml_declaration=True)
def crop_root(root):
    root.set('viewBox','394 185 45 28'); root.set('width','1080'); root.set('height','672')
    return root

if sys.argv[1] == 'prepare':
    assert sha(CANDIDATE) == '314a57f9bf89580e3192adf3ab64e164aecbad520802147597ee3145e07f480e'
    assert sha(PLAN) == '459f82982d648c44f4b54468c9d4a8c391f68ea16be896fb7ae9126717e87569'
    OUT.mkdir(parents=True, exist_ok=True)
    write_svg(deepcopy(S), 'candidate-full')
    write_svg(deepcopy(B), 'baseline-full')
    write_svg(crop_root(deepcopy(S)), 'candidate-eye')
    nohair = deepcopy(S)
    for node in nohair.xpath('/*/*[@data-kind="hair"]'): node.set('display','none')
    write_svg(crop_root(nohair), 'candidate-nohair')
    for name,target in [('eye-isolated','eye_right'),('sclera-complete','eye_right_sclera'),('gaze-complete','eye_right_gaze'),('upper-lashes','eye_right_upper_lashes'),('lower-lashes','eye_right_lower_lashes')]:
        root=ET.Element('{'+NS+'}svg',nsmap={None:NS})
        crop_root(root)
        for defs in S.xpath('//*[local-name()="defs"]'):
            if target == 'eye_right' and defs.getparent().get('id') == target: continue
            root.append(deepcopy(defs))
        root.append(deepcopy(byid(S,target)))
        write_svg(root,name)
    guide=deepcopy(S); byid(guide,'eye_right_construction_guides').set('display','inline')
    write_svg(crop_root(guide),'candidate-guides')
    ids=[n.get('id') for n in S.iter() if n.get('id')]
    references=[]
    for n in S.iter():
        for k,v in n.attrib.items():
            if k.endswith('href') and v.startswith('#'): references.append((n.get('id'),v[1:]))
            references.extend((n.get('id'),a) for a in re.findall(r'url\(#([^)]*)\)',v))
    baseline_top={n.get('id'):ET.tostring(n,method='c14n') for n in B if n.get('id')}
    changed=[n.get('id') for n in S if n.get('id') in baseline_top and ET.tostring(n,method='c14n') != baseline_top[n.get('id')]]
    order={n.get('id'):i for i,n in enumerate(S) if n.get('id')}
    eye_desc=set(byid(S,'eye_right').iter())
    outside=[]
    for n in S.iter():
        if n in eye_desc: continue
        for k,v in n.attrib.items():
            if (k.endswith('href') and v.startswith('#eye_right')) or re.search(r'url\(#eye_right',v): outside.append([n.get('id'),k,v])
    audit={
        'candidate_sha256':sha(CANDIDATE),'plan_sha256':sha(PLAN),'reference_sha256':sha(REF),
        'candidate_viewBox':S.get('viewBox'),'baseline_viewBox':B.get('viewBox'),'reference_dimensions':Image.open(REF).size,
        'duplicate_ids':[k for k,v in Counter(ids).items() if v>1],
        'missing_references':[(n,r) for n,r in references if r not in ids],
        'changed_top_level_ids':changed,
        'added_top_level_ids':[n.get('id') for n in S if n.get('id') and n.get('id') not in baseline_top],
        'removed_top_level_ids':[key for key in baseline_top if key not in order],
        'eye_order':{x:order[x] for x in ['eye_right','hair_front_right','hair_front_left']},
        'outside_eye_references':outside,
        'gaze_children':[n.get('id') for n in byid(S,'eye_right_gaze')],
        'default_guide_display':byid(S,'eye_right_construction_guides').get('display'),
        'plan':json.loads(PLAN.read_text(encoding='utf-8')),
        'method':'Original canvas preserved. Direct Sharp/librsvg rendering. Hair disabled only in diagnostic clone. No candidate registration.'
    }
    (OUT/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(audit,ensure_ascii=False,indent=2))
else:
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
    def white(path):
        im=Image.open(path).convert('RGBA'); bg=Image.new('RGBA',im.size,'white'); bg.alpha_composite(im); return bg.convert('RGB')
    ref=white(REF); base=white(OUT/'baseline-full.png'); cand=white(OUT/'candidate-full.png')
    page=Image.new('RGB',(1440,770),'#eeeeef');d=ImageDraw.Draw(page)
    for i,(im,label) in enumerate([(ref,'原彩图'),(base,'输入底稿'),(cand,'独立渲染候选 v1'),(Image.blend(ref,cand,.5),'同坐标 50% 混合')]):
        x=i*360; d.text((x+10,8),label,font=font,fill='#222222')
        page.paste(im.crop((382,167,502,277)).resize((360,330),Image.Resampling.LANCZOS),(x,36))
        page.paste(im.crop((399,189,435,212)).resize((360,230),Image.Resampling.NEAREST),(x,406))
        page.paste(im.crop((395,186,438,211)),(x+159,685))
    d.text((12,377),'同画布眼部 10x（最近邻显示原始像素）',font=font,fill='#222222')
    d.text((12,739),'画布 941×1672；脸框 (382,167)-(502,277)；眼框 (399,189)-(435,212)；底行为 1x。',font=font,fill='#222222')
    page.save(OUT/'same-coordinate-comparison.png')
    page=Image.new('RGB',(1440,912),'#eeeeef');d=ImageDraw.Draw(page)
    views=[('candidate-eye','整眼与前发'),('candidate-nohair','关闭头发 / 完整眼型'),('eye-isolated','仅眼组 / 辅助线关闭'),('sclera-complete','完整眼白 / 无虹膜洞'),('gaze-complete','完整眼黑 / 含独立高光'),('upper-lashes','完整上睫毛'),('lower-lashes','完整下睫毛根区'),('candidate-guides','辅助线开启')]
    for i,(name,label) in enumerate(views):
        x=(i%4)*360; y=(i//4)*456;d.text((x+8,y+8),label,font=font,fill='#222222')
        page.paste(white(OUT/(name+'.png')).resize((360,224),Image.Resampling.LANCZOS),(x,y+39))
    page.save(OUT/'structure-and-hair-check.png')
    audit=json.loads((OUT/'audit.json').read_text(encoding='utf-8'))
    for name in ['upper-lashes','lower-lashes']:
        im=Image.open(OUT/(name+'.png')).convert('RGBA'); a=im.getchannel('A')
        todo={(i%im.width,i//im.width) for i,v in enumerate(a.tobytes()) if v>=128}; sizes=[]
        while todo:
            q=[todo.pop()];count=0
            while q:
                x,y=q.pop();count+=1
                for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
                    p=(x+dx,y+dy)
                    if p in todo: todo.remove(p);q.append(p)
            sizes.append(count)
        audit[name]={'independent_direct_render_scale':24,'single_alpha_threshold':128,'connected_components':len(sizes),'areas':sorted(sizes,reverse=True)}
    audit['candidate_sha256_after_review']=sha(CANDIDATE)
    (OUT/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(audit,ensure_ascii=False,indent=2))
