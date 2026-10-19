from pathlib import Path
from lxml import etree as E
from copy import deepcopy
from PIL import Image
import hashlib,json,re

P=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.4.眼周皮肤明暗');Q=P/'evidence';Q.mkdir(parents=True,exist_ok=True)
SOURCE=Path('refinement/groups/eyes/4.逐眼着色/eye_right/4.3.睫毛与眼皮着色/character.svg')
EXPECTED='03c809a85f8cf16ad930bb6ace5dc5a460f2b266dfbf5d7f3886ae30e689a72e'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
APPROVED=Path('refinement/groups/eyes/2.逐眼线稿/eye_right/character.svg');assert hashlib.sha256(APPROVED.read_bytes()).hexdigest()=='314a57f9bf89580e3192adf3ab64e164aecbad520802147597ee3145e07f480e'
pal=json.loads(Path('refinement/groups/eyes/3.眼部色盘/palette.json').read_text(encoding='utf-8'));c={s['id']:s['hex'] for s in pal['samples']}
ref=Image.open('references/base-subject.png').convert('RGB')
extra={}
for key,xy in [('lower_outer_skin',(411,204)),('lower_mid_skin',(414,205)),('lower_center_skin',(418,205)),('lower_inner_skin',(422,205)),('inner_corner_light',(432,201)),('upper_inner_skin',(426,194))]:
 rgb=ref.getpixel(xy);extra[key]={'xy':xy,'rgb':rgb,'hex':'#'+''.join(f'{v:02X}' for v in rgb),'radius':0};c[key]=extra[key]['hex']
(Q/'supplemental-skin-samples.json').write_text(json.dumps(extra,ensure_ascii=False,indent=2),encoding='utf-8')
NS='http://www.w3.org/2000/svg';S=E.parse(str(SOURCE)).getroot();r=deepcopy(S)
def get(id,tree=None):return (r if tree is None else tree).xpath('.//*[@id="'+id+'"]')[0]
def el(tag,**attrs):return E.Element('{'+NS+'}'+tag,{k.replace('_','-'):str(v) for k,v in attrs.items()})
eye=get('eye_right');defs=eye.find('{'+NS+'}defs')
skin=el('g',id='eye_right_surround_skin',data_kind='eyes',data_part='eye_right',data_role='eyelid-and-orbital-skin-material',clip_path='url(#eye44_right_face_surface_clip)')
inside=el('g',id='eye_right_surround_skin_protected',data_kind='eyes',data_part='eye_right',data_role='skin-outside-eye-and-ink',mask='url(#eye44_right_eye_exclusion)');skin.append(inside)
eye.insert(eye.index(get('eye_right_eyelid_skin')),skin)

faceclip=el('clipPath',id='eye44_right_face_surface_clip',clipPathUnits='userSpaceOnUse');facepath=deepcopy(get('face_base_shape'));facepath.set('id','eye44_right_face_surface_support');faceclip.append(facepath);defs.append(faceclip)
mask=el('mask',id='eye44_right_eye_exclusion',maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x='396',y='182',width='47',height='36',style='mask-type:luminance')
mask.append(el('rect',x='396',y='182',width='47',height='36',fill='white'))
protected=['eye_right_aperture_shape','eye_right_upper_lid_ink','eye_right_lower_lid_rim','eye_right_upper_lash_sweep','eye_right_upper_lash_outer_taper','eye_right_lower_lash_outer_root']
for id in protected:
 src=get(id);attrs={'id':'eye44_right_exclude_'+id,'d':src.get('d'),'fill':'black'}
 if id=='eye_right_upper_fold':attrs.update(fill='none',stroke_width=str(float(src.get('stroke-width'))+.10),stroke_linecap='round')
 mask.append(el('path',**attrs))
defs.append(mask)
for id,std in [('eye44_right_skin_soft','.65'),('eye44_right_skin_wide_soft','1.05'),('eye44_right_lower_soft','.72')]:
 f=el('filter',id=id,x='-30%',y='-50%',width='160%',height='200%',color_interpolation_filters='sRGB');f.append(el('feGaussianBlur',stdDeviation=std));defs.append(f)
def radial(id,cx,cy,rx,ry,color,stops):
 g=el('radialGradient',id=id,gradientUnits='userSpaceOnUse',cx='0',cy='0',r='1',gradientTransform=f'translate({cx} {cy}) scale({rx} {ry})')
 for pos,op in stops:g.append(el('stop',offset=pos,stop_color=color,stop_opacity=op))
 defs.append(g)
def linear(id,x1,y1,x2,y2,stops):
 g=el('linearGradient',id=id,gradientUnits='userSpaceOnUse',x1=x1,y1=y1,x2=x2,y2=y2)
 for pos,color,op in stops:g.append(el('stop',offset=pos,stop_color=color,stop_opacity=op))
 defs.append(g)
radial('eye44_right_socket_warm_color',424.3,190.4,9.4,5.2,c['27'],[(0,.92),(.43,.82),(.75,.30),(1,0)])
radial('eye44_right_upper_volume_color',417.2,193.05,12.2,3.1,c['28'],[(0,1),(.46,1),(.76,.70),(1,0)])
radial('eye44_right_upper_outer_color',410.25,192.6,6.1,2.7,c['34'],[(0,1),(.35,1),(.70,.74),(1,0)])
radial('eye44_right_upper_inner_color',426.05,195.0,5.2,3.0,c['upper_inner_skin'],[(0,.95),(.42,.80),(.75,.26),(1,0)])
radial('eye44_right_upper_plane_color',415.9,188.65,8.0,2.6,c['26'],[(0,.85),(.48,.80),(.78,.30),(1,0)])
radial('eye44_right_outer_corner_color',406.8,204.1,6.7,5.3,c['29'],[(0,.96),(.36,.92),(.68,.46),(1,0)])
linear('eye44_right_lower_volume_color',405.6,0,426.8,0,[(0,c['29'],.6),(.23,c['lower_outer_skin'],.93),(.42,c['lower_mid_skin'],.92),(.60,c['lower_center_skin'],.86),(.78,c['lower_inner_skin'],.72),(1,c['32'],0)])
radial('eye44_right_lower_transition_color',412.0,206.25,7.3,3.2,c['30'],[(0,.86),(.36,.72),(.70,.29),(1,0)])
radial('eye44_right_lower_plane_color',421.25,208.6,8.2,3.55,c['31'],[(0,.84),(.40,.73),(.75,.27),(1,0)])
radial('eye44_right_inner_corner_color',432.55,201.55,3.55,3.25,c['inner_corner_light'],[(0,.86),(.36,.66),(.72,.16),(1,0)])
radial('eye44_right_inner_bridge_color',434.4,204.1,5.15,5.0,c['32'],[(0,.65),(.44,.47),(.8,.12),(1,0)])
linear('eye44_right_lower_volume_fade_color',0,203,0,207,[(0,'white',1),(.625,'white',1),(.70,'white',.85),(.82,'white',.30),(.875,'white',.10),(1,'white',0)])
fade=el('mask',id='eye44_right_lower_volume_fade',maskUnits='userSpaceOnUse',maskContentUnits='userSpaceOnUse',x='399',y='194',width='34',height='20',style='mask-type:luminance')
fade.append(el('rect',x='399',y='194',width='34',height='20',fill='url(#eye44_right_lower_volume_fade_color)'));defs.append(fade)
layers=[]
def layer(id,role,shape,gradient,soft='eye44_right_skin_wide_soft'):
 g=el('g',id=id,data_kind='eyes',data_part='eye_right',data_role=role)
 attrs={'id':id+'_shape','d':shape,'fill':'url(#'+gradient+')'}
 if soft:attrs['filter']='url(#'+soft+')'
 g.append(el('path',**attrs));inside.append(g);layers.append(id)
layer('eye_right_skin_socket_warm','upper-socket-warm-plane','M 415,186 C 421,183 430,185 434,190 C 436,194 432,200 426,199 C 421,198 415,194 415,186 Z','eye44_right_socket_warm_color')
layer('eye_right_skin_upper_lid_volume','upper-lid-intrinsic-volume','M 403.8,191.7 C 411,189.1 421.4,190.2 427.4,194.0 C 430.5,196.0 432.1,198.5 432.2,200.6 C 429,198.7 425.8,197.1 421.8,195.9 C 415,193.9 408,195.3 404.5,196.3 Z','eye44_right_upper_volume_color','eye44_right_skin_soft')
layer('eye_right_skin_upper_outer_chroma','upper-outer-pink-brown-material','M 403.8,191.3 C 408.1,189.3 413.5,190.4 416.2,192.2 C 416.3,194.0 413.6,195.3 408.8,195.4 L 403.8,196.0 Z','eye44_right_upper_outer_color','eye44_right_skin_soft')
layer('eye_right_skin_upper_inner_transition','upper-inner-warm-volume','M 420.8,192.5 C 424.3,190.6 429.0,193.1 431.4,196.8 C 433.3,199.3 432.1,201.4 430.5,200.3 C 427.2,197.6 424.4,196.0 421.1,195.2 Z','eye44_right_upper_inner_color','eye44_right_skin_soft')
layer('eye_right_skin_upper_plane_light','upper-eyelid-soft-light-plane','M 406.6,186.6 C 412.8,185.4 420.9,185.6 424.3,189.4 C 421.1,190.2 413.1,191.6 407.0,190.8 Z','eye44_right_upper_plane_color')
layer('eye_right_skin_outer_corner_warm','outer-canthus-warm-skin','M 400.1,198.6 C 405.2,196.7 409.1,200.1 412.5,203.5 C 413.0,207.2 409.3,210.2 404.1,209.5 C 400.5,207.9 398.9,202.1 400.1,198.6 Z','eye44_right_outer_corner_color','eye44_right_skin_wide_soft')
layer('eye_right_skin_lower_outer_transition','lower-outer-pink-skin-transition','M 404.8,204.2 C 408.6,203.8 414.2,205.1 418.8,205.7 C 420.0,208.3 416.3,210.2 411.0,209.3 C 407.9,208.6 405.1,207.2 404.8,204.2 Z','eye44_right_lower_transition_color')
layer('eye_right_skin_lower_lid_volume','lower-orbital-soft-skin-volume','M 404.2,199.0 C 407.6,201.2 410.9,203.0 415.2,203.8 C 419.3,204.3 422.9,203.1 427.8,203.0 C 425.4,205.4 421.2,207.0 416.8,207.1 C 411.0,207.1 407.3,205.3 403.9,202.7 Z','eye44_right_lower_volume_color','eye44_right_lower_soft')
get('eye_right_skin_lower_lid_volume').set('mask','url(#eye44_right_lower_volume_fade)')
layer('eye_right_skin_lower_plane_light','lower-orbital-soft-light-plane','M 412.8,207.4 C 417.6,205.9 425.1,204.7 429.5,206.6 C 430.6,208.5 427.1,212.4 421.1,212.6 C 417.1,212.5 413.9,210.7 412.8,207.4 Z','eye44_right_lower_plane_color')
layer('eye_right_skin_inner_corner_light','inner-canthus-soft-skin-light','M 429.2,198.0 C 432.8,196.6 436.1,199.0 435.4,202.9 C 434.8,205.1 431.7,205.9 429.2,203.1 Z','eye44_right_inner_corner_color')
layer('eye_right_skin_inner_bridge_transition','inner-skin-to-face-transition','M 430.1,199.0 C 434.2,197.8 438.3,200.2 439.0,204.3 C 438.5,208.0 434.8,210.8 431.3,207.5 Z','eye44_right_inner_bridge_color')
eye.set('data-stage','clean-color-through-eye-surround-4.4')
E.ElementTree(r).write(str(P/'character.svg'),encoding='utf-8',xml_declaration=True)
off=deepcopy(r);get('eye_right_surround_skin',off).set('display','none');E.ElementTree(off).write(str(Q/'all-skin-off.svg'),encoding='utf-8',xml_declaration=True)

def view(name,tree,target=None,hide_hair=False):
 if target:
  out=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 182 49 34',width='1176',height='816')
  for d in tree.xpath('//*[local-name()="defs"]'):out.append(deepcopy(d))
  obj=deepcopy(get(target,tree))
  for d in obj.xpath('.//*[local-name()="defs"]'):d.getparent().remove(d)
  if target in layers:
   face=el('g',clip_path='url(#eye44_right_face_surface_clip)');prot=el('g',mask='url(#eye44_right_eye_exclusion)');face.append(prot);prot.append(obj);out.append(face)
  else:out.append(obj)
 else:
  out=deepcopy(tree);out.set('viewBox','394 182 49 34');out.set('width','1176');out.set('height','816')
 if hide_hair:
  for item in out.xpath('//*[@data-kind="hair"]'):item.set('display','none')
 E.ElementTree(out).write(str(Q/(name+'.svg')),encoding='utf-8',xml_declaration=True)
view('input-closeup',S);view('final-closeup',r);view('input-nohair',S,hide_hair=True);view('final-nohair',r,hide_hair=True)
view('skin-isolated',r,'eye_right_surround_skin')
for id in layers:view(id,r,id)
protect=E.Element('{'+NS+'}svg',nsmap={None:NS},viewBox='394 182 49 34',width='1176',height='816')
for id in protected:
 src=get(id);attrs={'d':src.get('d'),'fill':'white'}
 if id=='eye_right_upper_fold':attrs.update(fill='none',stroke='white',stroke_width=src.get('stroke-width'),stroke_linecap='round')
 protect.append(el('path',**attrs))
E.ElementTree(protect).write(str(Q/'protected-eye-mask.svg'),encoding='utf-8',xml_declaration=True)
before={e.get('id'):e for e in S.iter() if e.get('id')};after={e.get('id'):e for e in r.iter() if e.get('id')}
keys=['d','cx','cy','rx','ry','x','y','transform','clip-path','clipPathUnits','fill-rule','stroke-width','stroke-linecap']
def changes(tree):return [{'id':e.get('id'),'attr':k} for e in tree.iter() if e.get('id') for k in keys if e.get(k)!=after[e.get('id')].get(k)]
existing_changes=[{'id':id,'attr':k} for id,e in before.items() for k in set(e.attrib)|set(after[id].attrib) if e.get(k)!=after[id].get(k)]
ids=[e.get('id') for e in r.iter() if e.get('id')];refs=[]
for e in r.iter():
 for k,v in e.attrib.items():
  refs+=re.findall(r'url\(#([^\)]+)\)',v)
  if k=='href' and v.startswith('#'):refs.append(v[1:])
keep=['eye_right_sclera','eye_right_iris','eye_right_pupil','eye_right_upper_eyelid','eye_right_lower_eyelid','eye_right_upper_lashes','eye_right_lower_lashes','eye_right_eyelid_skin','eye_right_highlights']
audit={'input_sha256':EXPECTED,'candidate_sha256':hashlib.sha256((P/'character.svg').read_bytes()).hexdigest(),'plan_sha256':'459f82982d648c44f4b54468c9d4a8c391f68ea16be896fb7ae9126717e87569',
 'frozen_geometry_changes_against_input':changes(S),'frozen_geometry_changes_against_approved_line_art':changes(E.parse(str(APPROVED)).getroot()),'existing_attribute_changes':existing_changes,
 'completed_subparts_xml_unchanged':{id:E.tostring(before[id])==E.tostring(after[id]) for id in keep},
 'old_resources_xml_unchanged':all(E.tostring(e)==E.tostring(after[e.get('id')]) for e in before['eye_right'].find('{'+NS+'}defs') if e.get('id')),
 'non_eye_top_level_xml_unchanged':all(E.tostring(a)==E.tostring(b) for a,b in zip(S,r) if a.get('id')!='eye_right'),
 'skin_layer_ids':layers,'skin_above_face_below_eye_ink':list(eye).index(skin)<list(eye).index(get('eye_right_eyelid_skin')),
 'outside_gaze':get('eye_right_gaze') not in skin.iterancestors(),
 'duplicate_ids':sorted({i for i in ids if ids.count(i)>1}),'broken_refs':sorted(set(refs)-set(ids)),
 'new_effect_nodes':len(r.xpath('//*[@data-effect]'))-len(S.xpath('//*[@data-effect]')),'highlights_display':get('eye_right_highlights').get('display')}
(Q/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(audit,ensure_ascii=False,indent=2))
