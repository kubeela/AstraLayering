from pathlib import Path
from lxml import etree as E
p=Path(r'C:\Users\22129\AppData\Local\Temp\astra-mouth-case-20260928')
t=E.parse(str(p/'base.svg'))
root=t.getroot()
byid={e.get('id'):e for e in root.iter() if e.get('id')}
def setattrs(i,**attrs):
 e=byid[i]
 for k,v in attrs.items(): e.set(k.replace('_','-'),str(v))
def d(i,v): byid[i].set('d',v)

# A narrow neutral half-open aperture, replacing the closed double wave.
ap='M 431.10,243.18 C 435.12,242.50 439.55,242.94 443.83,243.25 C 448.08,242.94 452.44,242.51 456.55,243.16 C 454.70,245.98 450.04,248.55 443.83,248.80 C 437.58,248.55 432.91,245.99 431.10,243.18 Z'
d('mouth_inside_clip_geometry',ap)
d('mouth_inside_complete_shape',ap)
# Re-form existing internal pieces at their true depth; each remains clipped by the opening.
d('mouth_teeth_upper_complete_shape','M 431.80,240.40 C 438.60,239.70 449.20,239.70 455.90,240.40 C 455.25,242.16 453.85,243.76 451.28,244.60 C 446.42,245.14 440.80,245.18 436.24,244.57 C 433.77,243.78 432.34,242.16 431.80,240.40 Z')
d('mouth_tongue_complete_shape','M 433.35,250.70 C 434.43,248.43 438.28,246.70 441.42,246.96 C 442.57,247.04 443.20,247.45 443.85,247.50 C 444.55,247.45 445.10,247.05 446.40,246.96 C 449.52,246.74 453.32,248.48 454.38,250.70 C 454.60,253.74 450.39,256.64 443.85,256.70 C 437.35,256.71 433.09,253.75 433.35,250.70 Z')
d('mouth_teeth_lower_complete_shape','M 432.30,249.28 C 439.00,250.25 448.80,250.25 455.38,249.28 C 455.70,252.15 453.83,254.74 451.40,255.80 C 447.33,256.90 440.24,256.93 436.20,255.80 C 433.71,254.71 431.95,252.08 432.30,249.28 Z')

upper_skin='M 426.60,232.20 C 437.20,231.80 450.30,231.80 461.00,232.20 L 461.00,245.20 C 459.60,244.43 458.12,243.55 456.55,243.16 C 452.44,242.51 448.08,242.94 443.83,243.25 C 439.55,242.94 435.12,242.50 431.10,243.18 C 429.45,243.54 428.04,244.45 426.60,245.20 Z'
lower_skin='M 426.60,240.75 C 428.33,241.72 429.73,242.71 431.10,243.18 C 432.91,245.99 437.58,248.55 443.83,248.80 C 450.04,248.55 454.70,245.98 456.55,243.16 C 458.13,242.72 459.47,241.67 461.00,240.75 L 461.00,259.00 C 450.00,260.00 438.00,260.00 426.60,259.00 Z'
upper_lip='M 430.85,243.13 C 434.00,243.32 436.15,240.67 438.80,240.10 C 440.83,239.66 442.68,241.25 443.91,241.19 C 445.11,241.13 446.56,239.97 448.15,240.12 C 451.48,240.40 453.36,243.09 456.59,243.04 C 452.44,242.51 448.08,242.94 443.83,243.25 C 439.55,242.94 435.12,242.50 430.85,243.13 Z'
lower_lip='M 431.10,243.18 C 432.91,245.99 437.58,248.55 443.83,248.80 C 450.04,248.55 454.70,245.98 456.55,243.16 C 454.62,247.80 451.24,251.60 447.97,252.45 C 445.57,253.34 442.15,253.34 439.76,252.45 C 436.13,251.43 432.88,247.59 431.10,243.18 Z'
for i,shape in [
 ('mouth3_upper_skin_surface',upper_skin),('mouth_upper_skin_complete_shape',upper_skin),
 ('mouth3_lower_skin_surface',lower_skin),('mouth_lower_skin_complete_shape',lower_skin),
 ('mouth3_upper_lip_surface',upper_lip),('mouth_upper_lip_color_shape',upper_lip),('mouth_upper_right_volume',upper_lip),
 ('mouth3_lower_lip_surface',lower_lip),('mouth_lower_lip_color_shape',lower_lip),('mouth_lower_left_volume',lower_lip)]:
 d(i,shape)
# Aperture rims follow the new simple opening. Keep the soft line language of the source.
upper_rim='M 431.10,243.18 C 435.12,242.50 439.55,242.94 443.83,243.25 C 448.08,242.94 452.44,242.51 456.55,243.16 C 452.45,243.00 448.14,243.36 443.83,243.68 C 439.50,243.37 435.17,242.99 431.10,243.18 Z'
lower_rim='M 431.10,243.18 C 432.91,245.99 437.58,248.55 443.83,248.80 C 450.04,248.55 454.70,245.98 456.55,243.16 C 454.23,246.42 450.01,249.07 443.83,249.23 C 437.48,249.04 433.27,246.39 431.10,243.18 Z'
for i in ['mouth_upper_contact_diffusion','mouth_upper_line_shape','mouth_upper_inner_edge_color_shape']: d(i,upper_rim)
for i in ['mouth_lower_contact_diffusion','mouth_lower_line_shape']: d(i,lower_rim)
# Move lower-lip light and cast shadow with the volume.
d('fx_mouth_lower_soft_light_complete_shape','M 450.0,250.45 C 450.0,251.00 447.28,251.58 443.83,251.58 C 440.40,251.58 437.67,251.00 437.67,250.45 C 437.67,249.86 440.40,249.39 443.83,249.39 C 447.28,249.39 450.0,249.86 450.0,250.45 Z')
d('fx_mouth_lower_on_skin_complete_shape','M 452.45,254.0 C 452.45,255.95 448.64,257.35 443.83,257.35 C 439.06,257.35 435.25,255.95 435.25,254.0 C 435.25,252.49 439.06,251.07 443.83,251.07 C 448.64,251.07 452.45,252.49 452.45,254.0 Z')
# Gradient coordinates belong to the new shapes, not the old closed mouth.
setattrs('mouth3_cavity_color',gradientTransform='translate(443.8 246.2) scale(14.0 6.2)')
setattrs('mouth3_tongue_color',gradientTransform='translate(443.8 250.5) scale(11.0 5.0)')
setattrs('mouth3_upper_teeth_color',y1='241',y2='245')
setattrs('mouth3_lower_teeth_color',y1='248.5',y2='256')
setattrs('mouth3_lower_lip_color',y1='248.3',y2='253.1')
setattrs('mouth3_lower_left_volume',gradientTransform='translate(438.1 250.0) scale(4.3 2.7)')
setattrs('mouth3_lower_cast_color',gradientTransform='translate(443.8 254.7) scale(8.5 3.0)')
setattrs('mouth3_lower_light_color',gradientTransform='translate(443.8 250.5) scale(6.2 1.3)')
setattrs('mouth3_lower_skin_warmth',gradientTransform='translate(443.8 257.2) scale(9.2 4.7)')
setattrs('mouth_lower_skin_warmth',cy='257.2',ry='4.7')
setattrs('mouth3_contact_line',x1='431.1',x2='456.55')
setattrs('mouth3_lower_lip_side_alpha',x1='431.1',x2='456.55')
setattrs('mouth3_contact_side_alpha',x1='431.1',x2='456.55')
setattrs('mouth3_contact_side_fade',y='242',height='9')
setattrs('mouth3_lower_lip_side_fade',y='242',height='15')
byid['mouth'].set('data-neutral-pose','half-open; mouth_open=0.5; mouth_valence=0')
# Correct metadata above is handled below for Python syntax compatibility.
t.write(str(p/'a'/'character.svg'),encoding='UTF-8',xml_declaration=True)

# One visual repair: relax the corners and narrow the exposed upper teeth.
t=E.parse(str(p/'a'/'character.svg'))
root=t.getroot(); byid={e.get('id'):e for e in root.iter() if e.get('id')}
ap='M 432.55,244.15 C 435.10,242.86 439.32,243.02 443.83,243.35 C 448.33,243.02 452.65,242.86 455.20,244.15 C 455.97,246.00 450.92,248.72 443.83,248.95 C 436.78,248.73 431.78,246.01 432.55,244.15 Z'
d('mouth_inside_clip_geometry',ap); d('mouth_inside_complete_shape',ap)
upper_skin='M 426.60,232.20 C 437.20,231.80 450.30,231.80 461.00,232.20 L 461.00,245.20 C 459.61,244.38 457.47,243.73 455.20,244.15 C 452.65,242.86 448.33,243.02 443.83,243.35 C 439.32,243.02 435.10,242.86 432.55,244.15 C 430.17,243.72 428.02,244.38 426.60,245.20 Z'
lower_skin='M 426.60,240.75 C 428.18,241.67 430.64,243.48 432.55,244.15 C 431.78,246.01 436.78,248.73 443.83,248.95 C 450.92,248.72 455.97,246.00 455.20,244.15 C 457.29,243.56 459.44,241.72 461.00,240.75 L 461.00,259.00 C 450.00,260.00 438.00,260.00 426.60,259.00 Z'
upper_lip='M 430.85,243.13 C 434.00,243.32 436.15,240.67 438.80,240.10 C 440.83,239.66 442.68,241.25 443.91,241.19 C 445.11,241.13 446.56,239.97 448.15,240.12 C 451.48,240.40 453.36,243.09 456.59,243.04 C 456.45,243.64 456.01,244.05 455.20,244.15 C 452.65,242.86 448.33,243.02 443.83,243.35 C 439.32,243.02 435.10,242.86 432.55,244.15 C 431.74,244.06 431.14,243.64 430.85,243.13 Z'
lower_lip='M 432.55,244.15 C 431.78,246.01 436.78,248.73 443.83,248.95 C 450.92,248.72 455.97,246.00 455.20,244.15 C 454.54,248.23 450.88,251.53 447.90,252.44 C 445.50,253.24 442.17,253.24 439.78,252.44 C 436.35,251.48 433.25,248.18 432.55,244.15 Z'
for i,shape in [('mouth3_upper_skin_surface',upper_skin),('mouth_upper_skin_complete_shape',upper_skin),('mouth3_lower_skin_surface',lower_skin),('mouth_lower_skin_complete_shape',lower_skin),('mouth3_upper_lip_surface',upper_lip),('mouth_upper_lip_color_shape',upper_lip),('mouth_upper_right_volume',upper_lip),('mouth3_lower_lip_surface',lower_lip),('mouth_lower_lip_color_shape',lower_lip),('mouth_lower_left_volume',lower_lip)]: d(i,shape)
upper_rim='M 432.55,244.15 C 435.10,242.86 439.32,243.02 443.83,243.35 C 448.33,243.02 452.65,242.86 455.20,244.15 C 451.98,243.30 448.25,243.38 443.83,243.76 C 439.39,243.38 435.72,243.30 432.55,244.15 Z'
lower_rim='M 432.55,244.15 C 431.78,246.01 436.78,248.73 443.83,248.95 C 450.92,248.72 455.97,246.00 455.20,244.15 C 455.47,246.57 450.71,249.18 443.83,249.37 C 436.96,249.18 432.25,246.59 432.55,244.15 Z'
for i in ['mouth_upper_contact_diffusion','mouth_upper_line_shape','mouth_upper_inner_edge_color_shape']: d(i,upper_rim)
for i in ['mouth_lower_contact_diffusion','mouth_lower_line_shape']: d(i,lower_rim)
d('mouth_teeth_upper_complete_shape','M 434.92,241.20 C 439.58,240.64 448.02,240.64 452.68,241.20 C 453.00,242.54 452.16,243.69 450.86,244.25 C 446.41,244.79 441.24,244.79 436.79,244.25 C 435.50,243.71 434.61,242.54 434.92,241.20 Z')
byid['mouth_teeth_upper_complete_shape'].set('opacity','0.84')
t.write(str(p/'a'/'character.svg'),encoding='UTF-8',xml_declaration=True)
