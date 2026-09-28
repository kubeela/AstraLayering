from copy import deepcopy
import json
from pathlib import Path
from lxml import etree

ROOT = Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_expression2')
SRC = Path(r'D:\Resources\workspace\AstraLayering\outputs\jianma_clothing\final\character.svg')
NODE = ROOT / '1.素材与关键形制作' / '1.3.眉眼制作'
KEYS = ROOT / '1.素材与关键形制作' / '关键姿态' / 'expression_eyes'
NS = 'http://www.w3.org/2000/svg'
Q = lambda t: '{'+NS+'}'+t

tree = etree.parse(str(SRC))
base = tree.getroot()
lookup = lambda root, ident: root.xpath('//*[@id=$n]', n=ident)[0]

def add(parent, tag, **attrs):
    return etree.SubElement(parent, Q(tag), {k.replace('_','-'):str(v) for k,v in attrs.items()})

for side in ('right','left'):
    eye = lookup(base, f'eye_{side}')
    defs = eye.find(Q('defs'))
    for name, center, radius, color, opacity in [
        ('socket', (418,198), (19,9), '#9A656F', .22),
        ('upper', (418,199), (17,6), '#B77B83', .36),
        ('lower', (417,204.5), (17,5.5), '#B67D86', .17),
        ('light', (418,194.5), (17,5), '#FFFDFC', .45),
    ]:
        grad=add(defs,'radialGradient',id=f'exp_{side}_{name}',gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform=f'translate({center[0]} {center[1]}) scale({radius[0]} {radius[1]})')
        add(grad,'stop',offset='0',stop_color=color,stop_opacity=opacity)
        add(grad,'stop',offset='.58',stop_color=color,stop_opacity=opacity*.43)
        add(grad,'stop',offset='1',stop_color=color,stop_opacity='0')
    star=add(defs,'radialGradient',id=f'exp_{side}_star',gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform='translate(418 198) scale(5 5)')
    add(star,'stop',offset='0',stop_color='#FFFFFF')
    add(star,'stop',offset='.48',stop_color='#DDF5FF')
    add(star,'stop',offset='1',stop_color='#8CB9DD',stop_opacity='.65')
    heart=add(defs,'linearGradient',id=f'exp_{side}_heart',gradientUnits='userSpaceOnUse',x1='416',y1='194',x2='420',y2='202')
    add(heart,'stop',offset='0',stop_color='#FFF7FD')
    add(heart,'stop',offset='.52',stop_color='#E9B9DA')
    add(heart,'stop',offset='1',stop_color='#A8CAE9')
    spiral_grad=add(defs,'radialGradient',id=f'exp_{side}_spiral',gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform='translate(418 198) scale(7.4 6.9)')
    add(spiral_grad,'stop',offset='0',stop_color='#7195BB')
    add(spiral_grad,'stop',offset='.72',stop_color='#A8C6E1')
    add(spiral_grad,'stop',offset='1',stop_color='#D6E6F4')
    crease_grad=add(defs,'radialGradient',id=f'exp_{side}_crease',gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform='translate(418 201) scale(17 5)')
    add(crease_grad,'stop',offset='0',stop_color='#A45F70',stop_opacity='.28')
    add(crease_grad,'stop',offset='.55',stop_color='#B77883',stop_opacity='.13')
    add(crease_grad,'stop',offset='1',stop_color='#B77883',stop_opacity='0')
    lid_grad=add(defs,'linearGradient',id=f'exp_{side}_lid_plane',gradientUnits='userSpaceOnUse',x1='0',y1='193',x2='0',y2='202')
    add(lid_grad,'stop',offset='0',stop_color='#FFF1EB',stop_opacity='.08')
    add(lid_grad,'stop',offset='.53',stop_color='#EDC9C6',stop_opacity='.27')
    add(lid_grad,'stop',offset='1',stop_color='#BE8589',stop_opacity='.48')

    skin=etree.Element(Q('g'),id=f'eye_{side}_expression_skin',attrib={'clip-path':f'url(#eye44_{side}_face_surface_clip)','display':'none'})
    eye.insert(list(eye).index(lookup(base,f'eye_{side}_eyelid_skin')),skin)
    for name,d in [
        ('socket','M 402.7,193.4 C 410,188.5 424,189 433.2,195 C 437,199 431,204 423,203 C 415,202 407,201 402.7,193.4 Z'),
        ('upper','M 403.5,193.6 C 412,190.1 423,192.2 432.6,198.4 C 434.4,200.8 432.7,203.6 427,203.2 C 417,201.9 409,201.8 403.5,197.6 Z'),
        ('lower','M 403.8,201.2 C 411,203 424,201.9 431,201.1 C 431,206.7 423,209.5 416,209.1 C 408,208.8 404,205 403.8,201.2 Z'),
        ('light','M 405,192.7 C 414,189.9 425,193 430.4,196.3 C 424,195.6 414,195.1 405,196 Z'),
    ]:
        filt='skin_soft' if name in ('upper','light') else 'skin_wide_soft'
        add(skin,'path',id=f'eye_{side}_expression_{name}_shape',d=d,fill=f'url(#exp_{side}_{name})',filter=f'url(#eye44_{side}_{filt})')
    add(skin,'path',id=f'eye_{side}_expression_lid_plane_shape',d='M 405,194 C 413,191 424,193 432,198 L 432,201 C 422,199 411,199 405,198 Z',fill=f'url(#exp_{side}_lid_plane)',filter=f'url(#eye44_{side}_skin_soft)')
    add(skin,'path',id=f'eye_{side}_expression_crease_shadow',d='M 404,199 C 412,198 423,200 432,201 C 426,204 415,206 405,202 Z',fill=f'url(#exp_{side}_crease)',filter=f'url(#eye44_{side}_skin_soft)')

    # Wrappers start without a transform; the binding stage owns motion.
    brow=lookup(base,f'brow_{side}')
    pigment=lookup(base,f'brow_{side}_pigment')
    brow.remove(pigment)
    wrap=add(brow,'g',id=f'brow_{side}_pose')
    wrap.append(pigment)

    gaze=lookup(base,f'eye_{side}_gaze')
    ornaments=add(gaze,'g',id=f'eye_{side}_ornaments')
    s=add(ornaments,'g',id=f'eye_{side}_star_art',display='none')
    add(s,'path',id=f'eye_{side}_star_glow',d='M 418,191.4 C 419,195.1 420.5,196.5 424.4,198 C 420.5,199 419,200.3 418,204 C 417,200.3 415.5,199 411.6,198 C 415.5,196.5 417,195.1 418,191.4 Z',fill=f'url(#exp_{side}_star)',opacity='.42')
    add(s,'path',id=f'eye_{side}_star_core',d='M 418,193.2 C 418.8,196.5 419.6,197.2 422.5,198 C 419.6,198.7 418.8,199.5 418,202.8 C 417.2,199.5 416.4,198.7 413.5,198 C 416.4,197.2 417.2,196.5 418,193.2 Z',fill=f'url(#exp_{side}_star)')
    h=add(ornaments,'g',id=f'eye_{side}_heart_art',display='none')
    add(h,'path',id=f'eye_{side}_heart_shape',d='M 418,202 C 416,200.5 414,199 414.2,197.4 C 414.4,195.7 416.5,195.7 418,197.2 C 419.5,195.7 421.6,195.7 421.8,197.4 C 422,199 420,200.5 418,202 Z',fill=f'url(#exp_{side}_heart)',stroke='#8FAFD0',stroke_width='.22')
    a=add(ornaments,'g',id=f'eye_{side}_alternate_reflection',display='none')
    add(a,'path',id=f'eye_{side}_alternate_reflection_shape',d='M 415.1,193.2 C 416.2,192.9 416.8,193.6 416.5,194.8 C 416.1,197 415.4,198.4 414.5,198.1 C 413.5,197.7 414,195 415.1,193.2 Z',fill='#F7FDFF',opacity='.85')
    tint=add(ornaments,'g',id=f'eye_{side}_cool_iris_art',display='none')
    add(tint,'ellipse',id=f'eye_{side}_cool_iris_glow',cx='418.18',cy='197.4',rx='6.6',ry='6.6',fill='#8BD7E8',opacity='.24')
    opening=lookup(base,f'eye_{side}_opening')
    spiral=add(opening,'g',id=f'eye_{side}_spiral_art',display='none')
    add(spiral,'ellipse',id=f'eye_{side}_spiral_base',cx='418.18',cy='197.65',rx='7.3',ry='6.7',fill=f'url(#exp_{side}_spiral)')
    add(spiral,'path',id=f'eye_{side}_spiral_line',d='M 417.5,197.2 C 419.8,194.6 422.8,197.2 421.1,199.2 C 419.5,201.1 415.5,200.2 414.8,197.9 C 413.9,194.7 418.5,192.2 422.2,194.8 C 426,197.5 423.7,202.4 418.5,203.1',fill='none',stroke='#E5F4FF',stroke_width='1.05',stroke_linecap='round')
    lash_group=lookup(base,f'eye_{side}_upper_lashes')
    fan=add(lash_group,'g',id=f'eye_{side}_closed_lash_fan',display='none')
    for i in range(9):
        add(fan,'path',id=f'eye_{side}_closed_lash_{i+1}',d='M 405,200 L 405,200.1 Z',fill=f'url(#eye43_{side}_upper_lashes_color)')

def setd(root,nid,d): lookup(root,nid).set('d',d)
def hide(root,nid): lookup(root,nid).set('display','none')
def show(root,nid): lookup(root,nid).attrib.pop('display',None)

ORDINARY={
 'upper':'M 404.65,198.55 C 410,198.2 416,200.0 421.3,200.55 C 426,200.9 429.8,200.5 431.5,200.2 C 427,201.2 422.8,201.25 418.5,201.0 C 412.4,200.65 407.3,199.8 404.65,198.55 Z',
 'lash':'M 405.7,198.7 C 403.3,198.7 401.5,198.0 400.8,197.1 C 401.6,198.8 403.4,199.45 406.2,199.35 C 407.5,199.6 408.4,199.8 409.7,200.0 C 408.2,199.2 406.7,198.8 405.7,198.7 Z',
 'fold':'M 405.7,194.8 C 413,193.0 423,195.6 430.3,198.4',
 'fan':['M 405.5,198.7 C 403.5,199.1 401.9,200.0 400.9,201.0 C 401.6,199.6 403.0,198.7 405.0,198.3 Z','M 407.8,199.4 C 405.9,199.7 404.1,200.7 403.0,202.0 C 403.5,200.3 405.1,199.2 407.3,199.0 Z','M 410.4,200.2 C 408.7,200.5 407.3,201.4 406.5,202.7 C 406.8,201.1 408.1,200.1 409.8,199.7 Z','M 413.0,200.8 C 411.7,201.2 410.7,201.9 410.2,202.9 C 410.4,201.6 411.3,200.7 412.4,200.4 Z','M 415.7,201.2 C 414.5,201.7 413.7,202.4 413.4,203.3 C 413.3,202.1 414.0,201.2 415.1,200.8 Z','M 418.4,201.5 C 417.5,202.0 416.9,202.5 416.8,203.2 C 416.6,202.1 417.0,201.4 418.0,201.2 Z'],
 'shadow':'M 404,198.7 C 411,198.8 424,201.3 432,200.2 C 427,203.5 414,204.1 405,201.4 Z',
 'shadow_center':(418,201),
}
SMILE={
 'upper':'M 404.6,200.45 C 411.4,195.7 422,195.8 431.5,201.1 C 423.8,197.8 412.8,196.9 404.6,201.0 Z',
 'lash':'M 405.8,199.9 C 403.4,200.3 401.5,200.0 400.5,199.3 C 401.7,201.0 403.6,201.3 405.8,200.7 C 410,197.6 415,196.5 419,196.5 C 412.4,196.5 408.2,198.0 405.8,199.9 Z',
 'fold':'M 406.2,195.8 C 413.3,192.3 423.6,192.7 430.5,197.8',
 'fan':['M 405.3,200.3 C 404.0,200.5 402.8,201.1 401.9,202.5 C 402.1,201.0 403.4,199.9 405.2,199.9 Z','M 407.9,198.8 C 406.2,199.2 405.0,200.2 404.3,201.7 C 404.6,199.9 405.8,198.8 407.6,198.4 Z','M 410.7,197.9 C 409.1,198.4 408.0,199.4 407.3,200.8 C 407.5,199.1 408.6,198.0 410.4,197.5 Z','M 413.6,197.2 C 413.3,198.1 412.5,199.2 411.8,200.1 C 411.9,198.7 412.5,197.4 413.3,196.8 Z','M 416.5,196.8 C 416.2,197.7 415.6,198.7 414.8,199.6 C 414.9,198.4 415.4,197.2 416.3,196.4 Z','M 419.5,196.8 C 419.3,197.7 418.8,198.6 418.1,199.2 C 418.1,198.1 418.5,197.1 419.2,196.5 Z'],
 'shadow':'M 404,201 C 410,196.1 423,195.8 432,201.4 C 428,205.0 410,205.2 404,202.3 Z',
 'shadow_center':(418,199),
}
HALF={
 'aperture':'M 405.9,198.7 C 411.5,196.8 422.4,197.2 431.5,201.8 C 428.4,202.8 425.5,203.6 421.0,204.0 C 416,204.3 411.6,203.8 408.4,201.5 C 407.4,200.8 406.6,199.5 405.9,198.7 Z',
 'upper':'M 405.0,197.5 C 409.6,195.4 416.8,195.35 423.5,197.45 C 427.4,198.7 430,200.3 431.5,201.8 C 425.4,199.2 417,196.8 410,197.55 C 407,197.9 405.5,198.4 404.8,199.25 C 404.45,198.6 404.55,197.9 405,197.5 Z',
 'lash':'M 407,196.5 C 404.8,197.1 403.2,197.7 401.4,197.0 C 402.3,198.55 404.0,198.9 406.1,198.05 C 409.8,196.65 413.5,196.2 418,196.5 C 413.5,195.65 409.7,195.75 407,196.5 Z',
 'fold':'M 406.4,193.3 C 414,191.0 425.1,194.1 430.9,199.0',
 'fan':['M 405.4,197.3 C 403.7,197.4 402.4,198.0 401.3,198.9 C 402,197.6 403.5,196.8 405.4,196.8 Z','M 407.7,196.6 C 406.1,196.7 404.8,197.4 404.0,198.3 C 404.5,197.0 405.7,196.1 407.6,196.1 Z','M 410.2,196.4 C 408.8,196.5 407.7,197.0 407.0,197.9 C 407.4,196.8 408.4,196.0 410.1,195.9 Z','M 412.5,196.5 C 412.1,197.4 411.5,198.3 410.9,199.1 C 410.9,197.9 411.4,196.8 412.4,196.1 Z','M 415.1,196.9 C 414.7,197.8 414.1,198.7 413.5,199.4 C 413.5,198.2 414.1,197.2 415,196.5 Z','M 417.7,197.3 C 417.4,198.2 416.9,199.0 416.3,199.6 C 416.2,198.6 416.8,197.6 417.5,197.0 Z'],
 'shadow':'M 404,197 C 412,194.4 424,196 432,201 C 426,202.7 414,203 405,200 Z',
 'shadow_center':(418,200),
}

FAN_GUIDES={
    'ordinary':[(404.1,198.6,-2.1,1.25),(406.5,199.15,-1.8,1.95),(409.0,199.55,-1.55,2.05),(411.7,200.05,-1.25,1.8),(414.5,200.45,-.95,1.5),(417.3,200.75,-.65,1.25),(420.3,200.9,-.45,1.0),(423.3,200.85,-.25,.7),(426.3,200.65,-.15,.45)],
    'smile':[(404.2,200.5,-2.5,.7),(406.4,199.25,-1.85,-.65),(408.9,198.15,-1.3,-1.15),(411.5,197.4,-.9,-1.2),(414.3,196.85,-.5,-1.1),(417.1,196.6,-.1,-.95),(420.1,196.8,.25,-.85),(423.0,197.35,.5,-.65),(426.0,198.15,.55,-.45)],
    'half':[(404.5,197.75,-2.35,-.45),(406.9,196.65,-1.65,-1.1),(409.5,196.05,-1.2,-1.2),(412.3,195.8,-.8,-1.15),(415.1,195.8,-.35,-1.05),(418.0,196.1,.1,-.95),(420.9,196.65,.4,-.85),(423.8,197.35,.65,-.7),(426.7,198.45,.8,-.5)],
}
def lash_fan(kind):
    out=[]
    for x,y,dx,dy in FAN_GUIDES[kind]:
        if kind in ('smile','half'):
            y+=.55
        tx,ty=x+dx,y+dy
        out.append(f'M {x-.29:.2f},{y-.16:.2f} C {x+dx*.25:.2f},{y+dy*.06:.2f} {x+dx*.76:.2f},{y+dy*.72:.2f} {tx:.2f},{ty:.2f} C {x+dx*.5:.2f},{y+dy*.79:.2f} {x+.4:.2f},{y+.18:.2f} {x+.35:.2f},{y+.24:.2f} Z')
    return out

def eye_pose(root,kind,sides=('right','left')):
    for side in sides:
        p=f'eye_{side}_'
        show(root,p+'expression_skin')
        hide(root,p+'surround_skin')
        hide(root,p+'upper_lash_outer_taper')
        hide(root,p+'lower_lash_outer_root')
        if kind in ('ordinary','smile'):
            v=ORDINARY if kind=='ordinary' else SMILE
            hide(root,p+'opening')
            hide(root,p+'lower_lid_rim')
            setd(root,p+'upper_lid_ink',v['upper'])
            setd(root,p+'upper_lash_sweep',v['lash'])
            setd(root,p+'upper_fold',v['fold'])
            lookup(root,p+'upper_fold').set('opacity','.55')
            show(root,p+'closed_lash_fan')
            for i,d in enumerate(lash_fan(kind),1): setd(root,p+f'closed_lash_{i}',d)
            if kind=='smile':
                lookup(root,p+'expression_lower_shape').set('d','M 403.8,199.8 C 412,202.2 424,201.0 431.5,200.1 C 432,206.0 426,209.2 418,209.5 C 410,209.5 404,205.8 403.8,199.8 Z')
        else:
            setd(root,p+'aperture_shape',HALF['aperture'])
            setd(root,p+'upper_lid_ink',HALF['upper'])
            setd(root,p+'upper_lash_sweep',HALF['lash'])
            setd(root,p+'upper_fold',HALF['fold'])
            lookup(root,p+'upper_fold').set('opacity','.55')
            lookup(root,p+'expression_upper_shape').set('d','M 403.6,193.1 C 413,190.4 424,193.2 432.7,198.4 C 434.2,201.0 433.2,204 427.0,203.8 C 417,201.6 409,201.0 403.6,198.4 Z')
            show(root,p+'closed_lash_fan')
            show(root,p+'upper_lash_outer_taper')
            setd(root,p+'upper_lash_outer_taper','M 405.6,197.4 C 404.4,197.0 403.7,195.6 403.5,194.5 C 403.2,196.4 403.8,197.9 405.0,198.4 C 405.4,198.2 405.5,197.9 405.6,197.4 Z')
            for i,d in enumerate(lash_fan('half'),1): setd(root,p+f'closed_lash_{i}',d)
            # Maintain a lower edge beneath the clipped iris, not a duplicate closure line.
        v=ORDINARY if kind=='ordinary' else SMILE if kind=='smile' else HALF
        plane={
            'ordinary':'M 404.2,194.6 C 412,192.0 424,194.2 432,198.4 C 427,200.3 419,201.0 412,199.9 C 408,199.3 405,198.9 404.2,194.6 Z',
            'smile':'M 404.2,196.7 C 412,192.0 424,192.3 432,198.2 C 428,198.1 424,196.7 419,196.4 C 413,196.0 408,197.9 404.2,201.0 Z',
            'half':'M 404.2,194.1 C 412,191.6 424,193.7 432,198.3 C 430,200.0 424,198.4 419,197.1 C 413,195.9 407,197.3 404.2,199.1 Z',
        }[kind]
        setd(root,p+'expression_lid_plane_shape',plane)
        if kind=='smile':
            lookup(root,p+'expression_crease_shadow').set('d',v['shadow'])
            lookup(root,p+'expression_lower_shape').set('d','M 404,200.6 C 412,198.0 424,198.7 432,201.6 C 432,206.9 424,209.3 418,209.2 C 411,209.1 404,206.5 404,200.6 Z')
        setd(root,p+'expression_crease_shadow',v['shadow'])
        lookup(root,f'exp_{side}_crease').set('gradientTransform',f"translate({v['shadow_center'][0]} {v['shadow_center'][1]}) scale(17 5)")

def brow_pose(root,kind):
    if kind=='sad':
        setd(root,'brow_right_complete_shape','M 405.7,182.3 C 414.7,182.2 426.8,181.9 434.2,185.3 C 425.6,185.0 416.5,185.2 406.4,185.3 C 404.7,184.8 403.8,183.9 402.9,182.9 C 403.8,182.4 404.7,182.2 405.7,182.3 Z')
        setd(root,'brow_left_complete_shape','M 454.1,185.6 C 461.3,182.2 472.2,182.2 482.0,182.2 C 483.4,182.2 484.8,182.4 485.6,182.9 C 484.7,183.9 483.6,184.9 482.3,185.3 C 472.7,185.2 462.2,185.0 454.1,185.6 Z')
    else:
        setd(root,'brow_right_complete_shape','M 405.7,181.7 C 415.2,181.1 427.0,185.2 434.2,190.0 C 425.5,187.9 416.1,184.7 406.3,184.9 C 404.7,184.5 403.8,183.8 402.9,182.7 C 403.8,182.1 404.7,181.8 405.7,181.7 Z')
        setd(root,'brow_left_complete_shape','M 454.1,190.3 C 461.3,185.0 472.5,181.1 482.0,181.6 C 483.4,181.7 484.8,182.1 485.6,182.7 C 484.7,183.8 483.6,184.6 482.3,184.9 C 472.5,184.7 462.3,188.0 454.1,190.3 Z')

NODE.mkdir(parents=True,exist_ok=True)
KEYS.mkdir(parents=True,exist_ok=True)
def save(root,path):
    etree.ElementTree(root).write(str(path),encoding='utf-8',xml_declaration=True)

save(base,NODE/'character.svg')
poses={
 'ordinary_closed':({'eye_right_open':0,'eye_left_open':0,'eye_right_smile':0,'eye_left_smile':0},lambda r:eye_pose(r,'ordinary')),
 'smiling_closed':({'eye_right_open':0,'eye_left_open':0,'eye_right_smile':1,'eye_left_smile':1},lambda r:eye_pose(r,'smile')),
 'half_lidded':({'eye_right_open':.5,'eye_left_open':.5,'eye_right_smile':0,'eye_left_smile':0},lambda r:eye_pose(r,'half')),
 'wink_right':({'eye_right_open':0,'eye_left_open':1,'eye_right_smile':0},lambda r:eye_pose(r,'ordinary',('right',))),
 'brow_sad':({'brow_right_shape':-1,'brow_left_shape':-1},lambda r:brow_pose(r,'sad')),
 'brow_angry':({'brow_right_shape':1,'brow_left_shape':1},lambda r:brow_pose(r,'angry')),
 'star_eyes':({'star_right':1,'star_left':1},lambda r:[show(r,f'eye_{s}_star_art') for s in ('right','left')]),
 'heart_eyes':({'heart_right':1,'heart_left':1},lambda r:[show(r,f'eye_{s}_heart_art') for s in ('right','left')]),
 'alternate_highlight':({'highlight_style_right':'slim','highlight_style_left':'slim'},lambda r:[(hide(r,f'fx_eye_{s}_iris_main_reflection'),show(r,f'eye_{s}_alternate_reflection')) for s in ('right','left')]),
 'cool_iris':({'iris_style_right':'cool','iris_style_left':'cool','iris_glow_right':.35,'iris_glow_left':.35},lambda r:[show(r,f'eye_{s}_cool_iris_art') for s in ('right','left')]),
 'spiral_eyes':({'eye_variant_right':'spiral','eye_variant_left':'spiral'},lambda r:[(hide(r,f'eye_{s}_gaze'),hide(r,f'fx_eye_{s}_upper_lid_on_iris'),hide(r,f'fx_eye_{s}_lower_lid_on_iris'),hide(r,f'fx_eye_{s}_iris_main_reflection'),show(r,f'eye_{s}_spiral_art')) for s in ('right','left')]),
}
for name,(values,draw) in poses.items():
    r=deepcopy(base)
    draw(r)
    folder=KEYS/name
    folder.mkdir(parents=True,exist_ok=True)
    save(r,folder/'character.svg')
    cmd={'schema_version':'0.1.0','document_type':'command','character_id':'jianma','actions':[{'op':'reset'},{'op':'set_parameters','values':values,'transition_s':0}]}
    (folder/'command.json').write_text(json.dumps(cmd,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def num(label,lo,hi,default=0,desc='',access='public',role='control'):
    return {'type':'number','label':label,'description':desc or label,'min':lo,'max':hi,'default':default,'access':access,'role':role}
def en(label,choices,default,desc=''):
    return {'type':'enum','label':label,'description':desc or label,'choices':choices,'default':default,'access':'public'}
params={}
for side in ('right','left'):
    zh='右' if side=='right' else '左'
    for axis in ('x','y'):
        params[f'brow_{side}_{axis}']=num(f'{zh}眉位移{axis.upper()}',-5,5,0,'眉独立包装层局部位移，绑定阶段制作')
    params[f'brow_{side}_angle']=num(f'{zh}眉角度',-15,15,0,'眉独立包装层旋转，绑定阶段制作')
    params[f'brow_{side}_shape']=num(f'{zh}眉弯曲',-1,1,0,'-1 悲伤内端抬起，0 默认，1 愤怒内端下压')
    params[f'eye_{side}_open']=num(f'{zh}眼开度',0,1,1,'0 闭眼，0.5 半闭，1 默认全开；静态关键形已绘制')
    params[f'eye_{side}_smile']=num(f'{zh}眼闭笑',0,1,0,'0 普通闭眼，1 闭眼笑；静态关键形已绘制')
    for axis in ('x','y'):
        params[f'gaze_{side}_{axis}']=num(f'{zh}眼视线{axis.upper()}',-3,3,0,'眼内整体局部位移，绑定阶段需同步虹膜材质与反光')
    params[f'highlight_{side}']=num(f'{zh}眼原高光强度',0,1,1,'原虹膜高光显隐')
    params[f'highlight_style_{side}']=en(f'{zh}眼高光样式',['original','slim'],'original','原样或细长备选静态高光')
    params[f'star_{side}']=num(f'{zh}眼星星强度',0,1,0,'星形眼内贴图，静态关键形已绘制')
    params[f'heart_{side}']=num(f'{zh}眼爱心强度',0,1,0,'心形眼内贴图，静态关键形已绘制')
    params[f'iris_style_{side}']=en(f'{zh}眼虹膜色',['original','cool'],'original','原样或冷青静态覆盖')
    params[f'iris_glow_{side}']=num(f'{zh}眼微光强度',0,1,0,'冷青微光强度，绑定阶段制作')
    params[f'eye_variant_{side}']=en(f'{zh}眼型',['original','spiral'],'original','原眼或静态圈圈眼')
for name in ('star','heart'):
    params[f'{name}_phase']=num(f'{name}跳动相位',0,1,0,'绑定阶段制作循环相位','animation','phase')
    params[f'{name}_speed']=num(f'{name}跳动速度',0,3,1,'绑定阶段制作循环速度','animation','control')

components=[]
for side in ('right','left'):
    for ident,svgids,pids,role,motion,notes in [
        ('brow',[f'brow_{side}_pose',f'brow_{side}_complete_shape'],[f'brow_{side}_{x}' for x in ('x','y','angle','shape')],'眉平移、转角和悲怒轮廓','静态悲怒轮廓已交；位置角度留给绑定','保留原灰紫渐变与柔边，无肤色贴片'),
        ('lid',[f'eye_{side}_opening',f'eye_{side}_aperture_shape',f'eye_{side}_upper_lid_ink',f'eye_{side}_lower_lid_rim',f'eye_{side}_upper_lash_sweep',f'eye_{side}_closed_lash_fan',f'eye_{side}_upper_fold',f'eye_{side}_expression_skin'],[f'eye_{side}_open',f'eye_{side}_smile'],'眼裂、睫毛与眼周皮肤','全开、半闭、普通闭眼和笑眼静态目标；规则网格留给绑定','参考板上排闭眼局部与源脸部；自有渐变在眼局部坐标，不搬运发影'),
        ('gaze',[f'eye_{side}_gaze',f'eye_{side}_iris',f'eye_{side}_pupil'],[f'gaze_{side}_{x}' for x in ('x','y')],'眼内视线','独立视线包装层预留，尚需虹膜投影与反光同步','虹膜分层及遮挡内实体沿用源稿'),
        ('primary_reflection',[f'fx_eye_{side}_iris_main_reflection'],[f'highlight_{side}'],'原虹膜高光','强度独立，绑定阶段实现','当前可见反光，非源文件隐藏的 eye_*_highlights'),
        ('alternate_reflection',[f'eye_{side}_alternate_reflection',f'eye_{side}_alternate_reflection_shape'],[f'highlight_style_{side}'],'细长备选高光','默认隐藏；静态备选目标已交','冷白细长反光，裁在眼裂内'),
        ('star',[f'eye_{side}_star_art',f'eye_{side}_star_core'],[f'star_{side}'],'星形眼内贴图','默认隐藏；静态星形目标已交','浅蓝白渐变，处在视线与眼裂共同裁切层'),
        ('heart',[f'eye_{side}_heart_art',f'eye_{side}_heart_shape'],[f'heart_{side}'],'爱心眼内贴图','默认隐藏；静态爱心目标已交','低饱和淡粉与蓝边，处在视线与眼裂共同裁切层'),
        ('cool',[f'eye_{side}_cool_iris_art',f'eye_{side}_cool_iris_glow'],[f'iris_style_{side}',f'iris_glow_{side}'],'冷青虹膜材质','默认隐藏；静态覆盖目标已交','原虹膜细节保留；独立光强待绑定'),
        ('spiral',[f'eye_{side}_spiral_art',f'eye_{side}_spiral_base',f'eye_{side}_spiral_line'],[f'eye_variant_{side}'],'静态圈圈眼','默认隐藏；替换姿态已交','淡蓝漫画眼型，泪缘接合由 face_effects 负责'),
    ]:
        components.append({'id':f'{ident}_{side}','owner_node':'expression_eyes','svg_ids':svgids,'parameter_ids':pids,'role':role,'motion':motion,'style_notes':notes})
components += [
 {'id':'star_clock','owner_node':'expression_eyes','svg_ids':['eye_right_star_glow','eye_left_star_glow'],'parameter_ids':['star_phase','star_speed'],'role':'双眼星形轻跳共用相位','motion':'绑定阶段制作循环','style_notes':'保持双眼贴图在各自眼裂裁切内'},
 {'id':'heart_clock','owner_node':'expression_eyes','svg_ids':['eye_right_heart_shape','eye_left_heart_shape'],'parameter_ids':['heart_phase','heart_speed'],'role':'双眼爱心轻跳共用相位','motion':'绑定阶段制作循环','style_notes':'与星星、圈圈互斥'},
]
# One element may have one owner: clock components use outer ornament wrappers.
for c in components:
    if c['id']=='heart_clock': c['svg_ids']=['eye_right_ornaments','eye_left_ornaments']
materials={'schema_version':'0.1.0','character_id':'jianma','parameters':params,'bindings':{},'anchors':{},'components':components}
for side in ('right','left'):
    materials['anchors'][f'tear_{side}_outer']={'type':'point','svg_id':f'eye_{side}_lower_lid_rim','point':[406.2,198.0]}
    materials['anchors'][f'tear_{side}_inner']={'type':'point','svg_id':f'eye_{side}_lower_lid_rim','point':[430.6,201.8]}
    materials['anchors'][f'tear_{side}_lower_center']={'type':'point','svg_id':f'eye_{side}_lower_lid_rim','point':[418.2,203.8]}
    materials['anchors'][f'tear_{side}_closed_join']={'type':'point','svg_id':f'eye_{side}_upper_lid_ink','point':[418.2,201.8]}
    materials['anchors'][f'tear_{side}_smile_join']={'type':'point','svg_id':f'eye_{side}_upper_lid_ink','point':[418.2,197.8]}
    materials['anchors'][f'tear_{side}_spiral_join']={'type':'point','svg_id':f'eye_{side}_spiral_art','point':[418.2,203.5]}
(NODE/'materials.json').write_text(json.dumps(materials,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('wrote', len(poses), 'keyforms',len(params),'parameters')
