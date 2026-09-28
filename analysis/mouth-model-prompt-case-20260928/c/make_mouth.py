from pathlib import Path
from lxml import etree as E
R=Path('C:/Users/22129/AppData/Local/Temp/astra-mouth-case-20260928')
t=E.parse(str(R/'base.svg')); root=t.getroot(); ids={x.get('id'):x for x in root.iter() if x.get('id')}
def attrs(i,**kw):
 for k,v in kw.items(): ids[i].set(k.replace('_','-'),str(v))
def path(i,d): ids[i].set('d',d)
def clip(i,d): ids[i][0].set('d',d)
# Neutral, relaxed aperture: corners retain source position, contours are redrawn.
opening='M 431.1,243.35 C 434.4,242.65 437.1,241.75 440.1,241.85 C 442.1,241.91 443.0,242.15 443.9,242.15 C 445.0,242.15 446.3,241.83 448.0,241.89 C 451.0,241.98 453.4,242.66 456.3,243.35 C 454.7,245.65 451.0,249.0 447.6,249.57 C 445.3,249.98 442.1,249.95 439.8,249.42 C 436.2,248.62 433.2,245.79 431.1,243.35 Z'
path('mouth_inside_clip_geometry',opening)
for i in ['mouth_inside','mouth_teeth_lower','mouth_tongue','mouth_teeth_upper']:
 attrs(i,clip_path='url(#mouth_inside_complete_clip)')
# The existing complete surfaces extend behind the aperture, with distinct depth.
path('mouth_teeth_upper_complete_shape','M 432.2,233.4 C 439.0,232.5 449.4,232.5 455.2,233.4 C 456.0,237.4 455.3,241.9 453.6,243.15 C 447.2,244.05 440.5,244.03 434.0,243.12 C 432.1,241.9 431.4,237.5 432.2,233.4 Z')
path('mouth_teeth_lower_complete_shape','M 431.0,252.0 C 438,254 450,254 457,252 C 457,256 452,259 444,259 C 436,259 430,256 431,252 Z')
path('mouth_tongue_complete_shape','M 433.1,252.3 C 433.5,249.4 437.3,247.55 440.6,247.42 C 442.1,247.35 443.1,247.65 444,247.7 C 444.9,247.65 446.0,247.35 447.4,247.43 C 450.8,247.58 454.5,249.4 454.9,252.3 C 455.4,256.8 451.1,260.1 444,260.1 C 436.9,260.1 432.6,256.8 433.1,252.3 Z')
attrs('mouth3_tongue_color',gradientTransform='translate(443.8 250.8) scale(11.8 8.0)')
attrs('mouth3_upper_teeth_color',y1='239.8',y2='244.0')
# Keep source skin entities, adapt their shared lip boundaries, no added cover patches.
upper_skin='M 426.6,232.2 C 437.2,231.8 450.3,231.8 461,232.2 L 461,243.4 L 456.3,243.35 C 453.4,242.66 451.0,241.98 448.0,241.89 C 446.3,241.83 445.0,242.15 443.9,242.15 C 443,242.15 442.1,241.91 440.1,241.85 C 437.1,241.75 434.4,242.65 431.1,243.35 L 426.6,243.4 Z'
lower_skin='M 426.6,243.35 L 431.1,243.35 C 433.2,245.79 436.2,248.62 439.8,249.42 C 442.1,249.95 445.3,249.98 447.6,249.57 C 451,249 454.7,245.65 456.3,243.35 L 461,243.35 L 461,259 C 450,260 438,260 426.6,259 Z'
upper='M 431.1,243.35 C 434.1,242.4 436.3,239.93 438.9,239.53 C 440.8,239.22 442.6,240.45 443.9,240.42 C 445.3,240.4 446.7,239.3 448.3,239.57 C 451.4,240.06 453.5,242.5 456.3,243.35 C 453.4,242.66 451,241.98 448,241.89 C 446.3,241.83 445,242.15 443.9,242.15 C 443,242.15 442.1,241.91 440.1,241.85 C 437.1,241.75 434.4,242.65 431.1,243.35 Z'
lower='M 431.1,243.35 C 433.2,245.79 436.2,248.62 439.8,249.42 C 442.1,249.95 445.3,249.98 447.6,249.57 C 451,249 454.7,245.65 456.3,243.35 C 454.8,246.9 451.8,250.25 448.8,251.55 C 446.1,252.73 441.7,252.57 438.8,251.26 C 435.5,249.67 432.7,246.41 431.1,243.35 Z'
for half,d,lip in [('upper',upper_skin,upper),('lower',lower_skin,lower)]:
 path('mouth_'+half+'_skin_complete_shape',d); clip('mouth3_'+half+'_skin_surface',d)
 path('mouth_'+half+'_lip_color_shape',lip); clip('mouth3_'+half+'_lip_surface',lip)
path('mouth_upper_right_volume',upper); path('mouth_lower_left_volume',lower)
upline='M 431.1,243.35 C 434.4,242.65 437.1,241.75 440.1,241.85 C 442.1,241.91 443,242.15 443.9,242.15 C 445,242.15 446.3,241.83 448,241.89 C 451,241.98 453.4,242.66 456.3,243.35'
lowline='M 431.1,243.35 C 433.2,245.79 436.2,248.62 439.8,249.42 C 442.1,249.95 445.3,249.98 447.6,249.57 C 451,249 454.7,245.65 456.3,243.35'
for half,d in [('upper',upline),('lower',lowline)]:
 for suffix in ['line_shape','contact_diffusion']:
  i='mouth_'+half+'_'+suffix;path(i,d);attrs(i,fill='none',stroke='url(#mouth3_contact_line)',stroke_width='.34' if suffix=='line_shape' else '.70',stroke_linecap='round')
path('mouth_upper_inner_edge_color_shape',upline)
attrs('mouth_upper_inner_edge_color_shape',fill='none',stroke_width='.65',opacity='.50')
# Lip gradients and surface light track the new rounded volume.
attrs('mouth3_upper_lip_color',y1='239.2',y2='242.8')
attrs('mouth3_lower_lip_color',y1='247.5',y2='253.0')
attrs('mouth3_upper_right_volume',gradientTransform='translate(448.1 240.8) scale(4.8 1.8)')
attrs('mouth3_lower_left_volume',gradientTransform='translate(438.2 250.1) scale(4.1 2.1)')
attrs('mouth3_lower_light_color',gradientTransform='translate(444 250.8) scale(5.2 .85)')
path('fx_mouth_lower_soft_light_complete_shape','M 449.2,250.8 C 449.2,251.27 446.87,251.65 444,251.65 C 441.13,251.65 438.8,251.27 438.8,250.8 C 438.8,250.33 441.13,249.95 444,249.95 C 446.87,249.95 449.2,250.33 449.2,250.8 Z')
attrs('mouth3_lower_cast_color',gradientTransform='translate(444 254) scale(7.7 2.5)')
path('fx_mouth_lower_on_skin_complete_shape','M 451.7,254 C 451.7,255.38 448.25,256.5 444,256.5 C 439.75,256.5 436.3,255.38 436.3,254 C 436.3,252.62 439.75,251.5 444,251.5 C 448.25,251.5 451.7,252.62 451.7,254 Z')
attrs('mouth',data_neutral_pose='half-open',data_mouth_open='.5',data_mouth_valence='0')
# Single visual correction: relaxed corners at the middle of the aperture.
for e in ids['mouth'].iter():
 if e.get('d'): e.set('d',e.get('d').replace('243.35','245.0'))
for i in ['mouth_inside_complete_clip','mouth3_upper_skin_surface','mouth3_upper_lip_surface','mouth3_lower_skin_surface','mouth3_lower_lip_surface']:
 for e in ids[i].iter():
  if e.get('d'): e.set('d',e.get('d').replace('243.35','245.0'))
t.write(str(R/'c'/'character.svg'),encoding='UTF-8',xml_declaration=True)
# Structural verification: every original ID retained; only mouth descendants/defs changed.
orig=E.parse(str(R/'base.svg')); old={e.get('id'):e for e in orig.iter() if e.get('id')}
changed=[]
for i,e in ids.items():
 if E.tostring(e,with_tail=False)!=E.tostring(old[i],with_tail=False): changed.append(i)
print('Wrote character.svg; retained all',len(old),'IDs; changed mouth-only leaves:',[i for i in changed if len(ids[i])==0])
