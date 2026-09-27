from pathlib import Path
from lxml import etree as E
import json
out=Path('refinement/groups/eyes/5.眼黑与装饰部件绘制');ev=out/'evidence';source=Path('refinement/groups/eyes/4.眼周肤色与局部层次/character.svg')
parser=E.XMLParser(remove_blank_text=False);tree=E.parse(str(source),parser);r=tree.getroot();ns='http://www.w3.org/2000/svg';q=lambda s:'{'+ns+'}'+s
mk=lambda tag,**a:E.Element(q(tag),{k.replace('_','-'):str(v) for k,v in a.items()});get=lambda i:r.xpath('.//*[@id=$i]',i=i)[0];defs=r.find(q('defs'))
def lg(id,x1,y1,x2,y2,stops):
 g=mk('linearGradient',id=id,gradientUnits='userSpaceOnUse',x1=x1,y1=y1,x2=x2,y2=y2)
 for off,color,opacity in stops:g.append(mk('stop',offset=off,stop_color=color,stop_opacity=opacity))
 defs.append(g)
def rg(id,stops):
 g=mk('radialGradient',id=id,cx='.5',cy='.43',r='.62')
 for off,col,op in stops:g.append(mk('stop',offset=off,stop_color=col,stop_opacity=op))
 defs.append(g)
data={
'eye_right':{'cx':417.2,'cy':197.75,'rx':6.05,'ry':6.05,'pcx':417.55,'pcy':196.5,'prx':2.65,'pry':3.1,
 'rim':[(0,'#243B55',1),(.48,'#3E6188',1),(.8,'#799EBA',1),(1,'#9CBBD1',1)],
 'body':[(0,'#2F3A52',1),(.34,'#456A96',1),(.57,'#709CC7',1),(.80,'#A3CBEE',1),(1,'#BCD4F0',1)],
 'crescent':'M 411.9,196.8 C 412.0,200.9 414.2,203.2 417.4,203.25 C 420.6,203.25 422.75,201.05 422.75,197.6 C 421.85,200.35 420.2,201.7 417.45,201.75 C 414.7,201.7 412.95,200.2 411.9,196.8 Z',
 'crescentColor':'#BEDCF3','crescentOpacity':'.67',
 'sector':'M 410.6,197.2 C 410.8,199.6 411.5,201.15 413.1,202.25 L 414.15,201.2 C 412.7,199.5 412.3,197.6 412.55,195.5 Z',
 'sectorColor':'#4F80AD',
 'crease':'M 406.8,190.25 C 410.5,188.6 415.2,188.8 419.35,190.45 C 424.25,192.45 428.4,195.9 430.35,198.65 C 427.65,195.85 423.7,192.95 419.0,191.1 C 414.9,189.45 410.6,189.3 406.8,190.25 Z',
 'creaseStops':[(0,'#BFA0A2',.14),(.28,'#B39194',.66),(.62,'#BFA0A2',.56),(1,'#C7A6A6',.04)],
 'lashes':'M 403.65,197.8 C 403.8,195.0 404.8,193.25 406.3,191.95 C 405.55,193.75 405.5,194.75 407.45,194.45 L 408.4,195.45 C 406.45,195.6 404.9,196.55 403.65,197.8 Z',
 'tip':'M 403.1,195.95 C 403.7,195.9 404.4,195.5 404.65,195.0 C 405.0,196.2 404.4,197.2 403.25,197.35 C 402.8,197.05 402.7,196.5 403.1,195.95 Z','tipOpacity':'.57',
 'lashColor':'#09050C'},
'eye_left':{'cx':470.45,'cy':197.65,'rx':6.0,'ry':6.15,'pcx':470.20,'pcy':196.4,'prx':2.60,'pry':3.05,
 'rim':[(0,'#374353',1),(.47,'#59778E',1),(.8,'#7A9DB4',1),(1,'#ABC6D8',1)],
 'body':[(0,'#4A5065',1),(.33,'#6687AA',1),(.56,'#94BBDD',1),(.80,'#B7D9F2',1),(1,'#C4DDF4',1)],
 'crescent':'M 465.15,196.9 C 465.2,200.9 467.1,203.45 470.45,203.55 C 473.85,203.4 475.8,201.0 475.95,197.3 C 474.8,200.5 473.1,201.95 470.5,202.0 C 467.95,201.9 466.2,200.2 465.15,196.9 Z',
 'crescentColor':'#C8E3F5','crescentOpacity':'.56',
 'sector':'M 475.4,195.5 C 476.55,198.4 475.7,201.55 473.8,202.5 L 472.75,201.35 C 474.15,199.75 474.75,197.7 474.8,195.6 Z',
 'sectorColor':'#78A5CD',
 'crease':'M 456.45,198.2 C 459.75,193.25 465.8,189.15 472.25,188.95 C 477.1,188.75 480.95,189.65 483.2,191.65 C 480.25,190.2 476.95,189.4 472.3,189.55 C 466.3,189.75 460.35,193.55 456.45,198.2 Z',
 'creaseStops':[(0,'#CEAFAD',.09),(.28,'#C8A9A7',.39),(.62,'#BFA0A2',.60),(1,'#B39194',.34)],
 'lashes':'M 479.8,193.45 C 482.7,193.5 484.15,192.3 484.3,190.9 C 485.2,192.2 485.35,193.5 486.0,194.5 C 486.7,195.55 487.15,196.25 487.95,196.2 C 487.35,197.55 486.4,197.95 485.35,197.35 C 483.4,196.3 482.5,195.0 479.8,194.9 Z',
 'tip':'M 483.2,194.2 C 483.4,195.3 484.0,196.0 485.3,196.15 C 485.4,197.1 484.5,197.5 483.7,197.15 C 483.1,196.95 482.7,196.35 482.8,195.55 C 482.9,194.95 483.0,194.55 483.2,194.2 Z','tipOpacity':'.94',
 'lashColor':'#06070F'}
}
foreground=[]
for part,d in data.items():
 eye=get(part);black=get(part+'_eye_black');black.set('data-status','complete-step-5');black.set('data-role','complete-iris-and-pupil')
 base=get(part+'_eye_black_shape');black.remove(base)
 lg(part+'_iris_edge_color',0,191,0,204.8,d['rim']);lg(part+'_iris_body_color',0,191,0,204.4,d['body'])
 rg(part+'_pupil_color',[(0,'#13263E',1),(.65,'#213D5D',1),(1,'#4B739A',1)])
 cp=mk('clipPath',id=part+'_iris_surface_clip',clipPathUnits='userSpaceOnUse');cp.append(mk('use',href='#'+part+'_eye_black_shape'));defs.append(cp)
 iris=mk('g',id=part+'_iris',data_part=part,data_kind='eyes',data_role='complete-iris');black.append(iris);base.set('fill','url(#'+part+'_iris_edge_color)');iris.append(base)
 colors=mk('g',id=part+'_iris_color_zones',data_part=part,data_kind='eyes',data_role='intrinsic-iris-color-zones',clip_path='url(#'+part+'_iris_surface_clip)');iris.append(colors)
 colors.append(mk('ellipse',id=part+'_iris_body_shape',cx=d['cx'],cy=d['cy'],rx=d['rx'],ry=d['ry'],fill='url(#'+part+'_iris_body_color)'))
 colors.append(mk('path',id=part+'_iris_peripheral_color_shape',d=d['sector'],fill=d['sectorColor'],opacity='.42'))
 colors.append(mk('path',id=part+'_iris_lower_color_shape',d=d['crescent'],fill=d['crescentColor'],opacity=d['crescentOpacity']))
 colors.append(mk('ellipse',id=part+'_iris_collarette_shape',cx=d['pcx'],cy=d['pcy']+.5,rx=d['prx']+.9,ry=d['pry']+.7,fill='none',stroke='#5F8DB4',stroke_width='.55',opacity='.43'))
 pupil=mk('g',id=part+'_pupil',data_part=part,data_kind='eyes',data_role='complete-pupil');black.append(pupil)
 pupil.append(mk('ellipse',id=part+'_pupil_shape',cx=d['pcx'],cy=d['pcy'],rx=d['prx'],ry=d['pry'],fill='url(#'+part+'_pupil_color)'))
 # Eyelid crease decoration stays behind the white and separate from the eye opening boundary.
 x1,x2=(404,431) if part=='eye_right' else (455,484)
 lg(part+'_eyelid_crease_color',x1,0,x2,0,d['creaseStops'])
 crease=mk('g',id=part+'_eyelid_decoration',data_part=part,data_kind='eyes',data_role='eyelid-crease-decoration',clip_path='url(#'+part+'_skin_surface_clip)')
 crease.append(mk('path',id=part+'_eyelid_crease_shape',d=d['crease'],fill='url(#'+part+'_eyelid_crease_color)'))
 sclera=get(part+'_sclera');eye.insert(list(eye).index(sclera),crease)
 lashes=mk('g',id=part+'_upper_lashes',data_part=part,data_kind='eyes',data_role='upper-lashes')
 lashes.append(mk('path',id=part+'_upper_lash_root_shape',d=d['lashes'],fill=d['lashColor']));eye.append(lashes)
 # Only the source-visible tips cross in front of the intervening hair strand.
 tips=mk('g',id=part+'_upper_lashes_foreground',data_part=part,data_kind='eyes',data_role='upper-lash-tip-in-front-of-hair',data_owner_group=part+'_upper_lashes')
 tips.append(mk('path',id=part+'_upper_lash_foreground_tip_shape',d=d['tip'],fill=d['lashColor'],opacity=d['tipOpacity']));foreground.append(tips)
anchor=get('hair_front_left');ix=list(r).index(anchor)+1
for n,el in enumerate(foreground):r.insert(ix+n,el)
r.find(q('title')).text='剑妈 · 完整分层稿 · eyes 第5步眼黑与装饰'
tree.write(str(out/'character.svg'),encoding='utf-8',xml_declaration=True)
# Temporary QA variants; final never loses the sclera clips.
for mode in ['eye-black-only-unclipped','eyes-unclipped','decoration-only','no-decoration','no-eyes']:
 t=E.parse(str(out/'character.svg'),parser);root=t.getroot()
 if mode in ['eye-black-only-unclipped','eyes-unclipped']:
  for el in root.xpath('.//*[@id="eye_right_interior" or @id="eye_left_interior"]'):el.attrib.pop('clip-path',None)
 if mode in ['eye-black-only-unclipped','decoration-only']:
  groups=[]
  for part in data:
   wanted=[part+'_eye_black'] if mode.startswith('eye-black') else [part+'_eyelid_decoration',part+'_upper_lashes',part+'_upper_lashes_foreground']
   for id in wanted:groups.append(root.xpath('.//*[@id=$id]',id=id)[0])
  for el in list(root):
   if el.tag not in [q('defs'),q('title'),q('desc')]:root.remove(el)
  for g in groups:
   if g.getparent() is not None:g.getparent().remove(g)
   root.append(g)
 if mode=='no-decoration':
  for el in root.xpath('.//*[@data-role="eyelid-crease-decoration" or @data-role="upper-lashes" or @data-role="upper-lash-tip-in-front-of-hair"]'):el.set('display','none')
 if mode=='no-eyes':
  for el in root.xpath('.//*[@data-part="eye_right" or @data-part="eye_left"]'):el.set('display','none')
 t.write(str(ev/f'{mode}.svg'),encoding='utf-8',xml_declaration=True)
# Existing non-eye layers and resources are immutable.
src=E.parse(str(source),parser).getroot();now=E.parse(str(out/'character.svg'),parser).getroot()
for old in src:
 if old.tag in [q('defs'),q('title')] or old.get('data-kind')=='eyes':continue
 new=now.xpath('./*[@id=$id]',id=old.get('id'))[0] if old.get('id') else now.find(old.tag)
 assert E.tostring(old)==E.tostring(new),old.get('id')
for old in src.find(q('defs')):
 new=now.xpath('.//*[@id=$i]',i=old.get('id'))[0];assert E.tostring(old)==E.tostring(new),old.get('id')
for part in data:
 for suffix in ['sclera','upper_eyelid','lower_eyelid','periocular_skin']:
  old=src.xpath('.//*[@id=$i]',i=part+'_'+suffix)[0];new=now.xpath('.//*[@id=$i]',i=part+'_'+suffix)[0];assert E.tostring(old)==E.tostring(new),part+'_'+suffix
ids=[el.get('id') for el in r.iter() if el.get('id')];assert len(ids)==len(set(ids))
summary={'non_eye_layers_preserved':True,'existing_eye_contour_sclera_skin_preserved':True,'all_prior_defs_preserved':True,'unique_ids':len(ids),'foreground_lash_fragments':[g.get('id') for g in foreground],'lower_lashes':'Absent: no independently visible lower lash strands are resolved in reference; existing lower eyelid retained.','independent_highlights_added':0}
(ev/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))

