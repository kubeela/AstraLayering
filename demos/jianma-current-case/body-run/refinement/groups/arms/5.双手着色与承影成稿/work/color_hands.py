from pathlib import Path
import xml.etree.ElementTree as E
import copy
import json

NS='http://www.w3.org/2000/svg'
E.register_namespace('',NS)
E.register_namespace('xlink','http://www.w3.org/1999/xlink')
def tag(n): return '{'+NS+'}'+n
def el(n,attrs=None,text=None):
    x=E.Element(tag(n),{k:str(v) for k,v in (attrs or {}).items()})
    x.text=text
    return x

root_path=Path.cwd()
src=root_path/'refinement/groups/arms/4.双手结构线稿与隐藏补全/character.svg'
out=root_path/'refinement/groups/arms/5.双手着色与承影成稿'
r=E.parse(src).getroot()
original=copy.deepcopy(r)
ids={n.get('id'):n for n in r.iter() if n.get('id')}
defs=r.find(tag('defs'))
new_defs=el('g',{'id':'arms5_hand_resources','data-role':'hand-owned-material-and-effect-resources'})
# Resources are appended directly under defs. A descriptive metadata node groups provenance.
defs.append(el('metadata',{'id':'arms5_material_provenance'},'Neutral line-art geometry retained exactly. Skin uses palette 07/08, 15/16, 17/18; nail planes 19/20; contact shadows 21/22. Hidden root colors are inferred continuations. Per-component surface clips reference each exact complete_shape directly.'))

def linear(identity,points,stops):
    g=el('linearGradient',{'id':identity,'gradientUnits':'userSpaceOnUse','x1':points[0],'y1':points[1],'x2':points[2],'y2':points[3]})
    for off,col,op in stops: g.append(el('stop',{'offset':off,'stop-color':col,'stop-opacity':op}))
    defs.append(g)
    return 'url(#'+identity+')'

def radial(identity,cx,cy,rx,ry,color,opacity):
    g=el('radialGradient',{'id':identity,'gradientUnits':'userSpaceOnUse','cx':0,'cy':0,'r':1,'gradientTransform':f'translate({cx} {cy}) scale({rx} {ry})'})
    for off,op in [(0,opacity),(.38,opacity*.88),(.72,opacity*.32),(1,0)]:
        g.append(el('stop',{'offset':off,'stop-color':color,'stop-opacity':op}))
    defs.append(g)
    return 'url(#'+identity+')'

def blur(identity,sigma):
    f=el('filter',{'id':identity,'x':'-30%','y':'-20%','width':'160%','height':'140%','color-interpolation-filters':'sRGB'})
    f.append(el('feGaussianBlur',{'stdDeviation':sigma}))
    defs.append(f)

for name,sigma in [('arms5_volume_soft',1.25),('arms5_finger_soft',.83),('arms5_contact_soft',.67),('arms5_nail_soft',.45)]: blur(name,sigma)

def own_clip(cid):
    cp=el('clipPath',{'id':cid+'_surface_clip','clipPathUnits':'userSpaceOnUse'})
    cp.append(el('use',{'href':'#'+cid+'_complete_shape','clip-rule':'nonzero','fill-rule':'nonzero'}))
    defs.append(cp)
    return 'url(#'+cid+'_surface_clip)'

def ellipse_layer(parent,identity,cx,cy,rx,ry,color,opacity,angle=0):
    fill=radial(identity+'_paint',cx,cy,rx,ry,color,opacity)
    n=el('ellipse',{'id':identity,'cx':cx,'cy':cy,'rx':rx,'ry':ry,'fill':fill})
    if angle: n.set('transform',f'rotate({angle} {cx} {cy})')
    parent.append(n)

def line_layer(parent,identity,d,width,fill,opacity=1,soft='arms5_finger_soft'):
    parent.append(el('path',{'id':identity,'d':d,'fill':'none','stroke':fill,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round','opacity':opacity,'filter':'url(#'+soft+')'}))

# Skin strokes follow each independently reviewed finger's own curve.
skin={
 'right':{
  'index':('M 216,813 C 216,826 215.5,837 218,846 C 221,853 229,868 231.5,875','M 222,815 C 223,829 219,837 223,847 C 228,858 231.8,868 232.5,876',4.8,3.3,.48),
  'middle':('M 222,814 C 221,830 220,843 231,855 C 239,863 249,867 252,873','M 226,817 C 224,835 228,849 234,857 C 240,863 249,867 252,872',3.7,4.0,.39),
  'ring':('M 226,810 C 225,827 225,841 235,850 C 242,857 251,857 255,860','M 231,815 C 228,829 230,843 239,850 C 245,853 252,856 255,860',3.0,3.8,.42),
  'pinky':('M 232,807 C 235,816 230,830 233,840 C 236,849 249,850 253,853','M 235,812 C 237,822 233,831 236,840 C 240,846 249,849 253,853',2.2,3.4,.45),
  'thumb':('M 249,791 C 252,804 247,818 247,831 C 246.9,837 246,842 246,845','M 239,807 C 242,821 239.5,838 243,844',5.3,3.2,.24)
 },
 'left':{
  'index':('M 668,815 C 668,827 666.5,838 664.5,846 C 661,855 653,869 650,875','M 661,815 C 660,829 661,838 657,848 C 653,857 649,869 648.6,875',4.8,3.3,.43),
  'middle':('M 661,815 C 662,829 662,840 650,852 C 642,861 632,866 628.5,872','M 656,818 C 658,832 652,846 647,853 C 642,859 631,866 628,872',3.8,4.0,.38),
  'ring':('M 656,813 C 659,829 657,841 647,849 C 638,856 629,856 624,859','M 651,816 C 655,830 651,841 644,847 C 636,853 627,855 624,859',3.0,3.8,.43),
  'pinky':('M 650,809 C 651,819 654,829 650,840 C 646,849 635,849 628,853','M 647,812 C 650,822 651,831 647,840 C 643,846 633,849 628,853',2.2,3.5,.48),
  'thumb':('M 634,792 C 630,805 635,820 635.4,831 C 635.4,837 635.8,842 636,845','M 643,808 C 639.6,823 642,838 639,844',5.2,3.0,.25)
 }
}

nails={
 'right':{
  'thumb':'M 242.7,838.8 C 242.6,836.5 244.4,835.4 246.4,835.5 C 248.6,835.3 250.1,836.6 249.8,838.2 C 249.2,841.6 247.8,845.4 246.2,846.0 C 244.6,845.2 243.1,841.6 242.7,838.8 Z',
  'index':'M 228.4,867.6 C 230.1,867.8 231.6,870.0 232.0,872.6 L 231.9,876.5 C 230.4,874.1 229.9,871.0 228.4,867.6 Z',
  'middle':'M 248.3,869.1 C 250.0,869.2 251.7,871.3 252.0,873.0 L 252.1,874.0 C 250.8,873.5 249.8,871.3 248.3,869.1 Z',
  'ring':'M 249.7,856.9 C 252.0,857.0 254.0,858.4 254.6,860.0 C 252.8,859.7 251.0,858.5 249.7,856.9 Z',
  'pinky':'M 248.4,850.6 C 250.4,850.7 252.0,851.9 252.7,853.2 C 251.0,853.0 249.5,851.8 248.4,850.6 Z'
 },
 'left':{
  'thumb':'M 631.7,837.7 C 631.3,835.9 632.8,835.0 634.8,835.1 C 637.0,835.2 638.7,836.1 638.8,838.4 C 638.8,841.8 637.6,845.1 636.2,845.9 C 634.3,845.3 632.4,841.5 631.7,837.7 Z',
  'index':'M 652.6,868.4 C 651.1,869.1 649.3,872.1 648.9,874.5 L 649.2,876.5 C 650.8,874.5 651.4,871.2 652.6,868.4 Z',
  'middle':'M 632.1,866.8 C 630.5,867.5 628.6,869.4 628.0,871.4 L 627.8,872.5 C 629.2,871.6 630.7,869.2 632.1,866.8 Z',
  'ring':'M 628.5,855.8 C 625.9,855.9 624.6,857.0 624.5,858.7 C 626.2,858.4 627.6,857.0 628.5,855.8 Z',
  'pinky':'M 632.5,849.9 C 630.7,850.3 629.0,851.4 628.3,852.8 C 630.2,852.4 631.4,851.3 632.5,849.9 Z'
 }
}

for side in ['right','left']:
    hid='hand_'+side
    hand=ids[hid]
    hand.set('data-stage','arms-5')
    hand.set('data-color-status','reference-colored')
    hand.find(tag('desc')).text='保留独立审查通过的掌/拇/食/中/无名/小指完整底形、默认姿态和绘制层序。皮肤依据原图及色盘完成，腕口沿用小臂同色和原体积场。隐藏指根补色依同侧可见皮肤推断；自身体积、甲面归本件，外来指间影独立并记录真实 source/target id。没有整手静态裁切；尚未进行动态绑定或动作验证。'
    basecolor='#FCF2F0' if side=='right' else '#FCF2F1'
    backcolor='#FBECEA' if side=='right' else '#FBEEEC'
    base=linear('arms5_'+hid+'_continuous_base',(0,755,0,880),[(0,basecolor,1),(.128,basecolor,1),(.32,backcolor,1),(.47,'#FCF0ED',1),(.72,'#F8E4DE',1),(1,'#F4DCD4',1)])
    palmline=linear('arms5_'+hid+'_palm_line',(0,755,0,825),[(0,'#AA8C91',.24),(.10,'#AA8C91',.34),(.28,'#A4878C',.60),(.66,'#9F7D84',.77),(1,'#976F78',.77)])
    fingerline=linear('arms5_'+hid+'_finger_line',(0,809,0,880),[(0,'#A5888C',0),(.21,'#A4878B',.03),(.36,'#9F7C85',.40),(.58,'#966C77',.77),(.82,'#A57E84',.68),(1,'#A48389',.61)])
    thumbline=linear('arms5_'+hid+'_thumb_line',(0,789,0,850),[(0,'#A5878C',.64),(.26,'#987A83',.70),(.71,'#976E7A',.77),(1,'#A57981',.75)])
    warmth=linear('arms5_'+hid+'_finger_turn',(0,803,0,880),[(0,'#D5AEA8',0),(.24,'#D5AAA6',0),(.34,'#D5AAA6',.18),(.48,'#CFA1A2',.85),(.60,'#CFA1A2',1),(.81,'#D9ABA2',.8),(1,'#E0B5AA',.5)])
    light=linear('arms5_'+hid+'_finger_light',(0,803,0,880),[(0,'#FFF7F1',0),(.24,'#FFF6F0',0),(.39,'#FFF5ED',.60),(.59,'#FFEFE6',.85),(.88,'#FFF1E8',.75),(1,'#FFEDE2',.2)])
    shared=el('g',{'id':'arms5_'+hid+'_shared_intrinsic_field','data-role':'continuous-wrist-palm-root-volume'})
    shared.append(el('use',{'href':'#arms2_'+side+'_intrinsic_field','data-role':'continued-forearm-field'}))
    if side=='right':
        shared_layers=[('broad_warmth',241,795,15,23,'#F3D2CF',.16,9),('wide_light',231.5,788,9.5,25,'#FFF9F5',.22,16),('outer_turn',210.8,810,4.2,18,'#DDB9B6',.32,11),('thenar_turn',255.0,797,4.8,16,'#E6BEB9',.28,-3),('knuckle_bloom',219,814,7,7,'#F0CCC4',.14,0)]
    else:
        shared_layers=[('broad_warmth',641,795,15,24,'#F2D4CE',.14,-8),('wide_light',651,787,9.5,24,'#FFF9F4',.20,-13),('outer_turn',671.7,811,4.2,18,'#DDB9B6',.30,-11),('thenar_turn',627.8,798,4.5,17,'#E3BDB8',.30,3),('knuckle_bloom',661,815,7,7,'#F2CFC6',.16,0)]
    for short,*args in shared_layers: ellipse_layer(shared,hid+'_shared_'+short,*args)
    defs.append(shared)
    for name in ['pinky','ring','middle','index','palm','thumb']:
        cid=hid+'_'+name
        comp=ids[cid]
        shape=ids[cid+'_complete_shape']
        shape.set('fill',base)
        shape.set('fill-rule','nonzero')
        clip=own_clip(cid)
        material=el('g',{'id':cid+'_material','data-role':'intrinsic-skin-volume','clip-path':clip})
        # Exact same arm field through the wrist; lower ellipses do not restart at its cap.
        material.append(el('use',{'href':'#arms5_'+hid+'_shared_intrinsic_field','data-role':'continued-wrist-palm-field'}))
        if name!='palm':
            center,turn,lw,tw,alpha=skin[side][name]
            line_layer(material,cid+'_warm_turn',turn,tw,warmth,alpha, 'arms5_volume_soft')
            line_layer(material,cid+'_soft_axis',center,lw,light,.57 if name in ['index','thumb'] else .42)
            # Broad bent-surface rose plane belongs to each finger, not to its contact-shadow toggle.
            bends=json.loads(ids['arms-joints'].text)['hands'][hid]['fingers'][cid]['bends']
            b=bends[0]
            ellipse_layer(material,cid+'_bent_plane',b[0],b[1],4.0 if name!='thumb' else 5,8.0,'#E6BFB7',.16 if name in ['thumb','index'] else .26)
            if name=='thumb':
                cx=252.0 if side=='right' else 629.8
                ellipse_layer(material,cid+'_lateral_warmth',cx,824,3.2,16,'#E1B2A7',.21)
        insert=list(comp).index(shape)+1
        comp.insert(insert,material)
        lines=ids[cid+'_visible_lines']
        lines.set('stroke',palmline if name=='palm' else thumbline if name=='thumb' else fingerline)
        for line in lines:
            if line.get('id','').endswith('_nail_edge'):
                line.set('stroke','#B99295')
                line.set('stroke-opacity','.78')
                line.set('stroke-width','.31')
            elif name=='palm':
                line.set('stroke-width',str(round(float(line.get('stroke-width'))*.94,3)))
            elif name=='thumb' and line.get('id','').endswith('_contour_1'):
                line.set('stroke-opacity','.62')
        if name!='palm':
            nailcol='#FBE3DF' if side=='right' else '#F7E0DE'
            shapeid=cid+'_nail_shape'
            nailpaint=linear(cid+'_nail_paint',(0,835 if name=='thumb' else 849,0,849 if name=='thumb' else 878),[(0,'#FDECE6',1),(.50,nailcol,1),(1,'#FAE5DC',1)])
            nailgroup=el('g',{'id':cid+'_nail','data-role':'visible-nail-plane','clip-path':clip})
            nailgroup.append(el('path',{'id':shapeid,'d':nails[side][name],'fill':nailpaint,'stroke':'none'}))
            if name=='thumb':
                nailclip=el('clipPath',{'id':cid+'_nail_clip','clipPathUnits':'userSpaceOnUse'})
                nailclip.append(el('use',{'href':'#'+shapeid,'clip-rule':'nonzero'}))
                defs.append(nailclip)
                ng=el('g',{'clip-path':'url(#'+cid+'_nail_clip)'})
                ellipse_layer(ng,cid+'_nail_soft_light',246.3 if side=='right' else 634.8,839,2.2,3.6,'#FFFCF7',.57)
                nailgroup.append(ng)
            comp.insert(list(comp).index(lines),nailgroup)
            comp.find(tag('desc')).text += ' 肤色由同侧掌色延续，隐藏根部为邻近肤色推断；关节暖转面与柔亮保留在本体，甲面仅填实际露出的区域。'

# Existing hand->hair effect identities and receivers remain untouched.
# Replace only the cached source silhouettes so they follow the reviewed six-part geometry.
for side in ['right','left']:
    hid='hand_'+side
    source=ids['hair5_complete_source_'+hid]
    for child in list(source): source.remove(child)
    combined=' '.join(ids[hid+'_'+n+'_complete_shape'].get('d') for n in ['pinky','ring','middle','index','palm','thumb'])
    source.append(el('path',{'id':'arms5_'+hid+'_existing_hair_source_shape','d':combined,'fill-rule':'nonzero','clip-rule':'nonzero','data-role':'reviewed-hand-union-source'}))

# Actual contact shadows in the side-view finger stack. Each has one exact receiving surface.
# Full editable source silhouettes, not a painted stripe, feed the projection.
effects=[]
for side in ['right','left']:
    hid='hand_'+side
    lateral=1 if side=='right' else -1
    relations=[('thumb','pinky',-1.15*lateral,1.1,.57),('index','middle',1.3*lateral,.75,.34),('middle','ring',.95*lateral,.60,.26)]
    for source_name,target_name,dx,dy,amount in relations:
        sid=hid+'_'+source_name
        tid=hid+'_'+target_name
        eid='fx_arms5_'+sid+'_on_'+target_name
        projection=eid+'_complete_projection'
        # Geometry is stored separately from painted source material so its opacity is applied once.
        defs.append(el('path',{'id':projection,'d':ids[sid+'_complete_shape'].get('d'),'transform':f'translate({dx} {dy})','fill-rule':'nonzero','data-role':'complete-editable-cast-shape','data-source-shape':sid+'_complete_shape'}))
        color=linear(eid+'_paint',(0,803,0,878),[(0,'#A87985',0),(.18,'#AA7D88',amount*.12),(.36,'#AE8189',amount*.46),(.55,'#AC7C87',amount),(.68,'#B6898B',amount*.94),(.83,'#BA8D8D',amount*.36),(1,'#C69B97',0)])
        effect=el('g',{'id':eid,'data-part':hid,'data-kind':'arms','data-effect':'cast-shadow','data-source-part':hid,'data-target-part':hid,'data-source-id':sid,'data-target-id':tid,'data-driven-by':sid,'data-complete-path':projection,'clip-path':'url(#'+tid+'_surface_clip)'})
        effect.append(el('desc',text='原图侧视屈指的实际近接投影。完整来源形按局部接触方向小量投射；外层准确裁切承影指底形，内层柔化，真实指缝保持透明。来源显隐/运动继承及投影形更新需后续绑定，本节点只交静态默认姿态。'))
        effect.append(el('use',{'id':eid+'_surface','href':'#'+projection,'fill':color,'filter':'url(#arms5_contact_soft)'}))
        target=ids[tid]
        target.insert(list(target).index(ids[tid+'_visible_lines']),effect)
        effects.append(eid)

# Guides remain disabled. No new guide or global lighting judgment is introduced.
for hid in ['hand_right','hand_left']:
    for n in ids[hid].iter():
        if n.get('data-role')=='construction-guide': n.set('display','none')
meta=json.loads(ids['arms-joints'].text)
meta['hand_status']='双手掌/五指完整底形维持已审结构；皮肤、真实可见甲面、本体体积和独立实际接触影完成。后续需绑定来源显隐与投影形更新，未作动态动作验证。'
meta['hand_effects']=effects
ids['arms-joints'].text=json.dumps(meta,ensure_ascii=False,separators=(',',':'))
defs.append(el('metadata',{'id':'arms5_effect_provenance'},'New receivers are hand surfaces only. Six contact effects: thumb on pinky, index on middle, middle on ring, independently per hand. No external-object hand shadow or separate highlight was inferred. Existing hair receiver effects preserve IDs/kind; only their cached hand-source union is updated to reviewed component geometry. No action-dependent shadow or binding validation is claimed.'))

# Preserve reviewed geometry and all unrelated drawable subtrees exactly.
old_ids={n.get('id'):n for n in original.iter() if n.get('id')}
new_ids={n.get('id'):n for n in r.iter() if n.get('id')}
for side in ['right','left']:
    for name in ['palm','thumb','index','middle','ring','pinky']:
        identity=f'hand_{side}_{name}_complete_shape'
        assert new_ids[identity].get('d')==old_ids[identity].get('d')
for old_node in original:
    identity=old_node.get('id')
    if old_node.tag in [tag('defs'),tag('metadata')] or identity in ['hand_right','hand_left']:
        continue
    matching=next((n for n in r if n.get('id')==identity and n.tag==old_node.tag),None)
    assert matching is not None and E.tostring(matching)==E.tostring(old_node),identity
allids=[n.get('id') for n in r.iter() if n.get('id')]
assert len(allids)==len(set(allids))
out.mkdir(parents=True,exist_ok=True)
E.ElementTree(r).write(out/'character.svg',encoding='utf-8',xml_declaration=True)
print(out/'character.svg')
print('Reviewed 12 base geometries preserved; six actual hand contact effects; existing hair effects preserved with source-cache update.')
