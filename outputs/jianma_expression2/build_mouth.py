from copy import deepcopy
import json
from pathlib import Path
from lxml import etree

ROOT=Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_expression2')
SRC=ROOT/'1.素材与关键形制作'/'1.3.眉眼制作'/'character.svg'
INPUT_MATERIALS=ROOT/'1.素材与关键形制作'/'1.3.眉眼制作'/'materials.json'
NODE=ROOT/'1.素材与关键形制作'/'1.4.嘴部制作'
KEYS=ROOT/'1.素材与关键形制作'/'关键姿态'/'expression_mouth'
NS='http://www.w3.org/2000/svg'
Q=lambda t:'{'+NS+'}'+t

base=etree.parse(str(SRC)).getroot()
find=lambda root,ident:root.xpath('//*[@id=$x]',x=ident)[0]
def setd(root,ident,d):find(root,ident).set('d',d)
def n(v):return f'{v:.2f}'.rstrip('0').rstrip('.')
def p(*values):return ','.join(n(v) for v in values)
def add(parent,tag,**attrs):
    return etree.SubElement(parent,Q(tag),{k.replace('_','-'):str(v) for k,v in attrs.items()})

mouth=find(base,'mouth')
mouth_defs=mouth.find(Q('defs'))
tongue_light=add(mouth_defs,'radialGradient',id='mouth_expression_tongue_light',gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform='translate(444 251) scale(7 2.2)')
add(tongue_light,'stop',offset='0',stop_color='#FFE1DE',stop_opacity='.48')
add(tongue_light,'stop',offset='.55',stop_color='#F6C1C5',stop_opacity='.23')
add(tongue_light,'stop',offset='1',stop_color='#F6C1C5',stop_opacity='0')
tongue_group=find(base,'mouth_tongue')
add(tongue_group,'path',id='mouth_tongue_soft_light',d='M 437,251 C 440,249.8 448,249.8 451,251 C 449,253.5 439,253.5 437,251 Z',fill='url(#mouth_expression_tongue_light)',filter='url(#mouth3_light_soft)',display='none')
variant=etree.Element(Q('g'),id='mouth_pout_variant',attrib={'display':'none','data-role':'static-pout-replacement'})
mouth.addnext(variant)
vdefs=add(variant,'defs')
for original,new in [('mouth3_upper_lip_color','pout_upper_lip_color'),('mouth3_lower_lip_color','pout_lower_lip_color'),('mouth3_contact_line','pout_contact_line'),('mouth3_lower_cast_color','pout_lower_cast_color'),('mouth3_lower_light_color','pout_lower_light_color')]:
    cp=deepcopy(find(base,original));cp.set('id',new);vdefs.append(cp)
find(variant,'pout_upper_lip_color').set('y1','239.1');find(variant,'pout_upper_lip_color').set('y2','245.2')
find(variant,'pout_lower_lip_color').set('y1','244.5');find(variant,'pout_lower_lip_color').set('y2','251.7')
find(variant,'pout_lower_cast_color').set('gradientTransform','translate(444 252) scale(7.5 3.3)')
find(variant,'pout_lower_light_color').set('gradientTransform','translate(444 248.5) scale(5.4 1.2)')
add(variant,'path',id='pout_lower_shadow',d='M 436.5,250.4 C 439,250 449,250 451.5,250.4 C 450.5,254.8 437.5,254.8 436.5,250.4 Z',fill='url(#pout_lower_cast_color)',filter='url(#mouth3_shadow_soft)')
add(variant,'path',id='pout_lower_lip',d='M 435.9,244.7 C 439.2,245.1 441,244.4 444,245 C 447,244.4 448.8,245.1 452.1,244.7 C 450.3,248.7 448,251.3 444,251.7 C 440,251.3 437.7,248.7 435.9,244.7 Z',fill='url(#pout_lower_lip_color)',filter='url(#mouth3_lower_lip_soft)')
add(variant,'path',id='pout_lower_light',d='M 439.3,247.5 C 442.3,248.7 445.7,248.7 448.7,247.5 C 448.2,249.6 439.8,249.6 439.3,247.5 Z',fill='url(#pout_lower_light_color)',filter='url(#mouth3_light_soft)')
add(variant,'path',id='pout_upper_lip',d='M 435.9,244.5 C 438.6,244.4 439.7,240.3 442.1,239.6 C 443.1,239.3 443.7,240.7 444,241 C 444.3,240.7 444.9,239.3 445.9,239.6 C 448.3,240.3 449.4,244.4 452.1,244.5 C 448.5,246 446.8,244.7 444,245.2 C 441.2,244.7 439.5,246 435.9,244.5 Z',fill='url(#pout_upper_lip_color)',filter='url(#mouth3_lip_soft)')
add(variant,'path',id='pout_center_seam',d='M 435.9,244.5 C 437.6,245.2 439,245.1 440.6,244.5 C 442,244.1 443.2,244.6 444,245.1 C 444.8,244.6 446,244.1 447.4,244.5 C 449,245.1 450.4,245.2 452.1,244.5 C 450.6,245.8 448.4,245.8 447.1,245.4 C 446.2,246.2 445,246.3 444,246.1 C 443,246.3 441.8,246.2 440.9,245.4 C 439.6,245.8 437.4,245.8 435.9,244.5 Z',fill='url(#pout_contact_line)',opacity='.9',filter='url(#mouth3_line_soft)')
add(variant,'path',id='pout_upper_glint',d='M 441.5,240.4 C 442.2,239.8 442.6,240.1 443,240.9 C 442.5,240.7 442,240.6 441.5,240.4 Z M 445,240.9 C 445.4,240.1 445.8,239.8 446.5,240.4 C 446,240.6 445.5,240.7 445,240.9 Z',fill='#FFECEB',opacity='.25',filter='url(#mouth3_light_soft)')

def opening(c):
    L,R,C,U,B=c['left'],c['right'],c['corner'],c['upper'],c['bottom']
    mid=(C+U)/2
    shoulder=min(3.7,(B-C)*.8)
    top=f'M {p(L,C)} C {p(L+4,mid)} {p(438,U)} {p(444,U)} C {p(450,U)} {p(R-4,mid)} {p(R,C)}'
    low_back=f'C {p(R+.35,C+shoulder*.4)} {p(R-1.8,C+shoulder*.81)} {p(R-5.2,C+shoulder)} C {p(451,B)} {p(447,B)} {p(444,B)} C {p(441,B)} {p(437,B)} {p(L+5.2,C+shoulder)} C {p(L+1.8,C+shoulder*.81)} {p(L-.35,C+shoulder*.4)} {p(L,C)}'
    return top+' '+low_back+' Z'

def draw_open(root,c):
    L,R,C,U,B,P,V,O=(c[k] for k in ('left','right','corner','upper','bottom','peak','cupid','outer'))
    ap=opening(c)
    setd(root,'mouth_inside_complete_shape',ap)
    find(root,'mouth_inside_complete_shape').set('filter','url(#mouth3_seam_soft)')
    setd(root,'mouth_inside_clip_geometry',ap)
    mid=(C+U)/2;shoulder=min(3.7,(B-C)*.8)
    upper_back=f'C {p(R-4,mid)} {p(450,U)} {p(444,U)} C {p(438,U)} {p(L+4,mid)} {p(L,C)}'
    lower_for=f'C {p(L-.35,C+shoulder*.4)} {p(L+1.8,C+shoulder*.81)} {p(L+5.2,C+shoulder)} C {p(437,B)} {p(441,B)} {p(444,B)} C {p(447,B)} {p(451,B)} {p(R-5.2,C+shoulder)} C {p(R-1.8,C+shoulder*.81)} {p(R+.35,C+shoulder*.4)} {p(R,C)}'
    upper_skin=f'M {p(426.6,231)} L {p(461,231)} L {p(461,C+2)} C {p(R+1,C+1)} {p(R+.5,C)} {p(R,C)} {upper_back} C {p(L-.5,C)} {p(L-1,C+1)} {p(426.6,C+2)} Z'
    lower_skin=f'M {p(426.6,C-2)} C {p(L-1,C-1)} {p(L-.5,C)} {p(L,C)} {lower_for} C {p(R+.5,C)} {p(R+1,C-1)} {p(461,C-2)} L {p(461,262)} C {p(450,262)} {p(438,262)} {p(426.6,262)} Z'
    upper_lip=f'M {p(L,C)} C {p(L+3,(C+P)/2)} {p(437,P+.5)} {p(440,P)} C {p(442,P-.15)} {p(442.8,V)} {p(444,V)} C {p(445.2,V)} {p(446,P-.15)} {p(448,P)} C {p(451,P+.5)} {p(R-3,(C+P)/2)} {p(R,C)} {upper_back} Z'
    lower_lip=f'M {p(L,C)} {lower_for} C {p(R-3,O-1.8)} {p(450,O)} {p(444,O)} C {p(438,O)} {p(L+3,O-1.8)} {p(L,C)} Z'
    # A thin upper inner color and a separate lower contact edge follow the cavity.
    upper_line=f'M {p(L,C)} C {p(L+4,mid)} {p(438,U)} {p(444,U)} C {p(450,U)} {p(R-4,mid)} {p(R,C)} C {p(R-4,mid+.4)} {p(450,U+.4)} {p(444,U+.4)} C {p(438,U+.4)} {p(L+4,mid+.4)} {p(L,C)} Z'
    lower_line=f'M {p(L,C)} {lower_for} C {p(R+.35,C+shoulder*.4+.35)} {p(R-1.8,C+shoulder*.81+.35)} {p(R-5.2,C+shoulder+.35)} C {p(451,B+.4)} {p(447,B+.4)} {p(444,B+.4)} C {p(441,B+.4)} {p(437,B+.4)} {p(L+5.2,C+shoulder+.35)} C {p(L+1.8,C+shoulder*.81+.35)} {p(L-.35,C+shoulder*.4+.35)} {p(L,C)} Z'
    for ident,d in [('mouth_upper_skin_complete_shape',upper_skin),('mouth_lower_skin_complete_shape',lower_skin),('mouth_upper_lip_color_shape',upper_lip),('mouth_upper_right_volume',upper_lip),('mouth_lower_lip_color_shape',lower_lip),('mouth_lower_left_volume',lower_lip),('mouth_upper_inner_edge_color_shape',upper_line),('mouth_upper_line_shape',upper_line),('mouth_upper_contact_diffusion',upper_line),('mouth_lower_line_shape',lower_line),('mouth_lower_contact_diffusion',lower_line)]:setd(root,ident,d)
    for ident,d in [('mouth3_upper_skin_surface',upper_skin),('mouth3_lower_skin_surface',lower_skin),('mouth3_upper_lip_surface',upper_lip),('mouth3_lower_lip_surface',lower_lip)]:find(root,ident)[0].set('d',d)
    edge=find(root,'mouth_upper_inner_edge_color_shape')
    edge.set('stroke-width','.25');edge.set('opacity','.38')
    find(root,'mouth_lower_line_shape').set('opacity','.52')
    find(root,'mouth_lower_contact_diffusion').set('opacity','.22')
    find(root,'mouth_upper_line_shape').set('opacity','.65')
    find(root,'mouth_upper_contact_diffusion').set('opacity','.27')
    TL,TR=L+2.8,R-2.8
    tooth_depth=2.25 if c['valence']>0 else 2.25
    teeth=f'M {p(TL,mid+.15)} C {p(TL+3,U+.15)} {p(438,U+.2)} {p(444,U+.25)} C {p(450,U+.2)} {p(TR-3,U+.15)} {p(TR,mid+.15)} C {p(TR-2.4,U+1.35)} {p(451,U+tooth_depth-.3)} {p(449,U+tooth_depth-.1)} C {p(447,U+tooth_depth+.05)} {p(445,U+tooth_depth-.05)} {p(444,U+tooth_depth)} C {p(443,U+tooth_depth-.05)} {p(441,U+tooth_depth+.05)} {p(439,U+tooth_depth-.1)} C {p(437,U+tooth_depth-.3)} {p(TL+2.4,U+1.35)} {p(TL,mid+.15)} Z'
    setd(root,'mouth_teeth_upper_complete_shape',teeth)
    find(root,'mouth_teeth_upper').set('display','none' if not c['upper_teeth'] else 'inline')
    find(root,'mouth_teeth_lower').set('display','none' if not c['lower_teeth'] else 'inline')
    if c['lower_teeth']:
        # The two small lower tooth tips sit in front of the tongue at the lip corners.
        tongue_group=find(root,'mouth_tongue')
        lower_group=find(root,'mouth_teeth_lower')
        tongue_group.addnext(lower_group)
    lower_teeth=f'M {p(L+2.5,B-3.0)} C {p(L+3.6,B-2.55)} {p(L+6,B-1.4)} {p(L+7,B-.7)} C {p(L+5,B-.8)} {p(L+2.7,B-1.5)} {p(L+2.5,B-3)} Z M {p(R-2.5,B-3)} C {p(R-3.6,B-2.55)} {p(R-6,B-1.4)} {p(R-7,B-.7)} C {p(R-5,B-.8)} {p(R-2.7,B-1.5)} {p(R-2.5,B-3)} Z'
    setd(root,'mouth_teeth_lower_complete_shape',lower_teeth)
    T=c['tongue_top']
    tongue=f'M {p(L+5.5,T+2.0)} C {p(L+6.5,T-.5)} {p(439,T-1.1)} {p(444,T-.7)} C {p(449,T-1.1)} {p(R-6.5,T-.5)} {p(R-5.5,T+2)} C {p(R-4.8,T+5)} {p(450,T+7)} {p(444,T+7)} C {p(438,T+7)} {p(L+4.8,T+5)} {p(L+5.5,T+2)} Z'
    setd(root,'mouth_tongue_complete_shape',tongue)
    light=find(root,'mouth_tongue_soft_light')
    light.attrib.pop('display',None)
    light.set('d',f'M {p(437,T+3.5)} C {p(440,T+2.2)} {p(448,T+2.2)} {p(451,T+3.5)} C {p(449,T+5.5)} {p(439,T+5.5)} {p(437,T+3.5)} Z')
    find(root,'mouth_expression_tongue_light').set('gradientTransform',f'translate(444 {n(T+3.8)}) scale(7 2.2)')
    find(root,'mouth_lower_skin_warmth').set('cy',n(O+.6))
    find(root,'mouth_upper_skin_warmth').set('cy',n(P-4))
    # Every userSpaceOnUse field follows its own lip, tooth or tongue surface.
    for ident,y1,y2 in [('mouth3_upper_lip_color',P-.4,U+.9),('mouth3_lower_lip_color',B-.5,O+.3),('mouth3_upper_teeth_color',U-.5,U+tooth_depth+.3),('mouth3_lower_teeth_color',B-3,B+1)]:
        g=find(root,ident);g.set('y1',n(y1));g.set('y2',n(y2))
    fields={
        'mouth3_upper_right_volume':f'translate(448.5 {n(P+1.3)}) scale(4.8 2.2)',
        'mouth3_lower_left_volume':f'translate(438 {n((B+O)/2)}) scale(5 2.2)',
        'mouth3_lower_cast_color':f'translate(444 {n(O+.55)}) scale(9 2.8)',
        'mouth3_lower_light_color':f'translate(444 {n((B+O)/2)}) scale(6 1.4)',
        'mouth3_cavity_color':f'translate(444 {n((U+B)/2+.5)}) scale(17 15)',
        'mouth3_tongue_color':f'translate(444 {n(T+4)}) scale(12 8)',
    }
    for ident,tr in fields.items():find(root,ident).set('gradientTransform',tr)
    cast=f'M {p(453,O+.5)} C {p(453,O+1.8)} {p(449,O+2.7)} {p(444,O+2.7)} C {p(439,O+2.7)} {p(435,O+1.8)} {p(435,O+.5)} C {p(435,O-.9)} {p(439,O-1.7)} {p(444,O-1.7)} C {p(449,O-1.7)} {p(453,O-.9)} {p(453,O+.5)} Z'
    setd(root,'fx_mouth_lower_on_skin_complete_shape',cast)
    mid=(B+O)/2
    light=f'M {p(450,mid)} C {p(450,mid+1)} {p(447,mid+1.5)} {p(444,mid+1.5)} C {p(441,mid+1.5)} {p(438,mid+1)} {p(438,mid)} C {p(438,mid-1)} {p(441,mid-1.5)} {p(444,mid-1.5)} C {p(447,mid-1.5)} {p(450,mid-1)} {p(450,mid)} Z'
    setd(root,'fx_mouth_lower_soft_light_complete_shape',light)

configs={
 'neutral_half_open':{'left':435.6,'right':452.4,'corner':244.1,'upper':242.8,'bottom':248.0,'peak':240.3,'cupid':240.9,'outer':250.9,'upper_teeth':False,'lower_teeth':False,'tongue_top':246.0,'valence':0},
 'neutral_open':{'left':431.0,'right':457.0,'corner':244.6,'upper':242.1,'bottom':251.4,'peak':239.5,'cupid':240.0,'outer':254.8,'upper_teeth':True,'lower_teeth':False,'tongue_top':248.2,'valence':0},
 'smiling_open':{'left':430.1,'right':457.9,'corner':241.7,'upper':244.1,'bottom':252.7,'peak':239.9,'cupid':240.8,'outer':256.1,'upper_teeth':True,'lower_teeth':False,'tongue_top':248.0,'valence':1},
 'sad_open':{'left':431.0,'right':457.0,'corner':247.5,'upper':242.2,'bottom':252.2,'peak':239.9,'cupid':240.8,'outer':255.1,'upper_teeth':True,'lower_teeth':True,'tongue_top':249.0,'valence':-1},
}

NODE.mkdir(parents=True,exist_ok=True)
KEYS.mkdir(parents=True,exist_ok=True)
def save(root,path):etree.ElementTree(root).write(str(path),encoding='utf-8',xml_declaration=True)
save(base,NODE/'character.svg')
poses={
 'neutral_half_open':{'mouth_open':.5,'mouth_valence':0},
 'neutral_open':{'mouth_open':1,'mouth_valence':0},
 'smiling_open':{'mouth_open':1,'mouth_valence':1},
 'sad_open':{'mouth_open':1,'mouth_valence':-1},
 'pout':{'mouth_variant':'pout'},
}
for name,values in poses.items():
    root=deepcopy(base)
    if name=='pout':
        find(root,'mouth').set('display','none')
        find(root,'mouth_pout_variant').set('display','inline')
    else:draw_open(root,configs[name])
    folder=KEYS/name;folder.mkdir(parents=True,exist_ok=True)
    save(root,folder/'character.svg')
    cmd={'schema_version':'0.1.0','document_type':'command','character_id':'jianma','actions':[{'op':'reset'},{'op':'set_parameters','values':values,'transition_s':0}]}
    (folder/'command.json').write_text(json.dumps(cmd,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

materials=json.loads(INPUT_MATERIALS.read_text(encoding='utf-8'))
materials['parameters']['mouth_open']={'type':'number','label':'嘴开度','description':'0 默认闭合，0.5 半张，1 张口；关键造型待后续规则网格绑定','min':0,'max':1,'default':0,'access':'public','role':'control'}
materials['parameters']['mouth_valence']={'type':'number','label':'嘴部悲喜','description':'-1 悲口，0 中性，1 笑口；当前张口关键造型已绘制','min':-1,'max':1,'default':0,'access':'public','role':'control'}
materials['parameters']['mouth_variant']={'type':'enum','label':'特殊嘴型','description':'原嘴或轻微嘟嘴静态替换','choices':['original','pout'],'default':'original','access':'public'}
materials['anchors']['mouth_left_corner']={'type':'point','svg_id':'mouth_upper_lip_color_shape','point':[430.7,243.1]}
materials['anchors']['mouth_right_corner']={'type':'point','svg_id':'mouth_upper_lip_color_shape','point':[456.8,243.1]}
materials['anchors']['mouth_upper_center']={'type':'point','svg_id':'mouth_upper_lip_color_shape','point':[444,241.2]}
materials['anchors']['mouth_lower_center']={'type':'point','svg_id':'mouth_lower_lip_color_shape','point':[444,248.2]}
materials['components'] += [
 {'id':'mouth_opening_material','owner_node':'expression_mouth','svg_ids':['mouth','mouth_inside_complete_shape','mouth_inside_clip_geometry','mouth_upper_skin_complete_shape','mouth_lower_skin_complete_shape','mouth_upper_lip_color_shape','mouth_lower_lip_color_shape','mouth_upper_line_shape','mouth_lower_line_shape','mouth_teeth_upper_complete_shape','mouth_teeth_lower_complete_shape','mouth_tongue_complete_shape','mouth_tongue_soft_light','fx_mouth_lower_on_skin_complete_shape','fx_mouth_lower_soft_light_complete_shape'],'parameter_ids':['mouth_open','mouth_valence'],'role':'常规嘴开合、悲喜形与口内材质','motion':'默认闭嘴沿用原稿；半张、中性张、笑张、悲张为独立静态目标。开口与剪裁共用轮廓，原牙舌随深度显露；唇体、口周肤色、接触线、下唇高光和柔影随形重绘，二维网格留待审查后绑定。','style_notes':'据表情风格参考中部的笑口与悲口大图及输入闭唇形；中性半张和中性张口按原角色画风设计，不复制闭口波纹。'},
 {'id':'mouth_pout_material','owner_node':'expression_mouth','svg_ids':['mouth_pout_variant','pout_upper_lip','pout_lower_lip','pout_center_seam','pout_lower_shadow','pout_lower_light','pout_upper_glint'],'parameter_ids':['mouth_variant'],'role':'轻微嘟嘴静态替换','motion':'原 mouth 与 pout_variant 互斥，默认关闭；不承诺嘟嘴张闭或外伸吐舌。','style_notes':'依据参考板中部右侧嘟嘴局部；沿用原柔珊瑚上唇和下唇渐变、软边及中央小口缝。'},
]
(NODE/'materials.json').write_text(json.dumps(materials,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('wrote',len(poses),'mouth keyforms; cumulative',len(materials['parameters']),'parameters')
