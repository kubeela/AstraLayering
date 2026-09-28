"""Derive one neutral half-open mouth from the supplied closed-mouth SVG."""
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(r'C:\Users\22129\AppData\Local\Temp\astra-mouth-case-20260928')
tree = ET.parse(str(ROOT / 'base.svg'))
svg = 'http://www.w3.org/2000/svg'
ET.register_namespace('', svg)

def el(id_):
    matches = [node for node in tree.iter() if node.get('id') == id_]
    assert len(matches) == 1, (id_, len(matches))
    return matches[0]

def setd(id_, d):
    el(id_).set('d', d)

# Same outer vermilion and cupid's bow as the zero pose.  The two inner
# edges peel apart smoothly and converge at the original left/right corners.
upper_edge = ('M 430.85,243.13 C 433.50,243.12 436.12,242.34 438.82,242.38 '
              'C 440.70,242.41 442.25,243.35 443.87,243.43 '
              'C 445.64,243.49 446.90,242.39 448.72,242.43 '
              'C 451.60,242.48 453.85,243.16 456.59,243.04')
lower_edge_reverse = ('C 454.48,245.65 451.74,247.34 449.03,248.10 '
                      'C 445.83,249.05 442.32,249.12 439.02,248.03 '
                      'C 435.99,247.02 433.21,245.08 430.85,243.13 Z')
aperture = upper_edge + ' ' + lower_edge_reverse

mouth = el('mouth')
mouth.set('data-neutral-pose', 'half-open')
mouth.set('data-mouth-open', '0.5')
mouth.set('data-mouth-valence', '0')
mouth.find(f'{{{svg}}}title').text = '中性半张嘴 · mouth_open 0.5'
mouth.find(f'{{{svg}}}desc').text = ('沿闭口原有左右口角和唇峰分开上下唇内缘；'
                                    '原口腔、牙弓与舌体在半张口裁切中显露。')
defs = mouth.find(f'{{{svg}}}defs')
clip = ET.SubElement(defs, f'{{{svg}}}clipPath', id='mouth_half_open_aperture_clip', clipPathUnits='userSpaceOnUse')
ET.SubElement(clip, f'{{{svg}}}path', id='mouth_half_open_aperture_geometry', d=aperture)

# Full internal entities remain intact; only their visible aperture changes.
for part in ['mouth_inside', 'mouth_teeth_lower', 'mouth_tongue', 'mouth_teeth_upper']:
    el(part).set('clip-path', 'url(#mouth_half_open_aperture_clip)')

upper_skin = ('M 426.60,232.20 C 437.20,231.80 450.30,231.80 461.00,232.20 '
              'L 461.00,245.20 C 459.60,244.40 457.65,243.06 456.59,243.04 '
              'C 453.85,243.16 451.60,242.48 448.72,242.43 '
              'C 446.90,242.39 445.64,243.49 443.87,243.43 '
              'C 442.25,243.35 440.70,242.41 438.82,242.38 '
              'C 436.12,242.34 433.50,243.12 430.85,243.13 '
              'C 429.65,243.18 428.10,244.55 426.60,245.20 Z')
lower_skin = ('M 426.60,240.75 C 428.45,241.92 429.72,242.96 430.85,243.13 '
              'C 433.21,245.08 435.99,247.02 439.02,248.03 '
              'C 442.32,249.12 445.83,249.05 449.03,248.10 '
              'C 451.74,247.34 454.48,245.65 456.59,243.04 '
              'C 458.18,242.75 459.45,241.60 461.00,240.75 '
              'L 461.00,259.00 C 450.00,260.00 438.00,260.00 426.60,259.00 Z')
setd('mouth_upper_skin_complete_shape', upper_skin)
setd('mouth_lower_skin_complete_shape', lower_skin)
el('mouth3_upper_skin_surface')[0].set('d', upper_skin)
el('mouth3_lower_skin_surface')[0].set('d', lower_skin)

upper_lip = ('M 430.85,243.13 C 434.00,243.32 436.15,240.67 438.80,240.10 '
             'C 440.83,239.66 442.68,241.25 443.91,241.19 '
             'C 445.11,241.13 446.56,239.97 448.15,240.12 '
             'C 451.48,240.40 453.36,243.09 456.59,243.04 '
             'C 453.85,243.16 451.60,242.48 448.72,242.43 '
             'C 446.90,242.39 445.64,243.49 443.87,243.43 '
             'C 442.25,243.35 440.70,242.41 438.82,242.38 '
             'C 436.12,242.34 433.50,243.12 430.85,243.13 Z')
lower_lip = ('M 430.85,243.13 C 433.21,245.08 435.99,247.02 439.02,248.03 '
             'C 442.32,249.12 445.83,249.05 449.03,248.10 '
             'C 451.74,247.34 454.48,245.65 456.59,243.04 '
             'C 454.30,246.88 451.98,249.27 448.87,250.55 '
             'C 445.67,251.83 442.02,251.78 438.99,250.49 '
             'C 435.88,249.19 433.22,246.40 430.85,243.13 Z')
for id_ in ['mouth_upper_lip_color_shape', 'mouth_upper_right_volume']:
    setd(id_, upper_lip)
for id_ in ['mouth_lower_lip_color_shape', 'mouth_lower_left_volume']:
    setd(id_, lower_lip)
el('mouth3_upper_lip_surface')[0].set('d', upper_lip)
el('mouth3_lower_lip_surface')[0].set('d', lower_lip)

# The rim shades follow their own separated edges, rather than duplicating
# the closed mouth wave on both sides of the opening.
upper_rim = upper_edge + (' C 453.70,243.55 451.27,242.88 448.72,242.80 '
                          'C 446.70,242.74 445.53,243.78 443.87,243.78 '
                          'C 442.16,243.70 440.62,242.77 438.82,242.75 '
                          'C 436.22,242.70 433.58,243.46 430.85,243.13 Z')
lower_rim = ('M 430.85,243.13 C 433.21,245.08 435.99,247.02 439.02,248.03 '
             'C 442.32,249.12 445.83,249.05 449.03,248.10 '
             'C 451.74,247.34 454.48,245.65 456.59,243.04 '
             'C 454.44,245.98 451.81,247.69 449.13,248.47 '
             'C 445.84,249.43 442.25,249.49 438.90,248.41 '
             'C 435.84,247.39 433.08,245.36 430.85,243.13 Z')
for id_ in ['mouth_upper_line_shape', 'mouth_upper_contact_diffusion', 'mouth_upper_inner_edge_color_shape']:
    setd(id_, upper_rim)
for id_ in ['mouth_lower_line_shape', 'mouth_lower_contact_diffusion']:
    setd(id_, lower_rim)
el('mouth_lower_line_shape').set('opacity', '0.58')
el('mouth_lower_contact_diffusion').set('opacity', '0.28')
el('mouth_upper_inner_edge_color_shape').set('stroke-width', '0.55')

# Color fields move with the new lip volume and the cast shadow moves below it.
for id_, attrs in {
    'mouth3_lower_lip_color': {'y1': '247.6', 'y2': '251.6'},
    'mouth3_lower_left_volume': {'gradientTransform': 'translate(438 249.0) scale(5.0 2.2)'},
    'mouth3_lower_cast_color': {'gradientTransform': 'translate(444.0 253.0) scale(8.7 3.3)'},
    'mouth3_lower_light_color': {'gradientTransform': 'translate(443.8 249.8) scale(5.6 1.0)'},
    'mouth3_lower_skin_warmth': {'gradientTransform': 'translate(444.0 256.5) scale(9.2 5.4)'},
    'mouth3_cavity_color': {'gradientTransform': 'translate(443.8 246.7) scale(16.0 10.0)'},
}.items():
    for key, value in attrs.items():
        el(id_).set(key, value)
el('mouth_lower_skin_warmth').set('cy', '256.5')
setd('fx_mouth_lower_on_skin_complete_shape',
     'M 452.7,253.0 C 452.7,254.86 448.82,256.3 444,256.3 '
     'C 439.18,256.3 435.3,254.86 435.3,253.0 '
     'C 435.3,251.14 439.18,249.7 444,249.7 '
     'C 448.82,249.7 452.7,251.14 452.7,253.0 Z')
setd('fx_mouth_lower_soft_light_complete_shape',
     'M 449.4,249.8 C 449.4,250.35 446.98,250.8 444,250.8 '
     'C 441.02,250.8 438.6,250.35 438.6,249.8 '
     'C 438.6,249.25 441.02,248.8 444,248.8 '
     'C 446.98,248.8 449.4,249.25 449.4,249.8 Z')

out = ROOT / 'b' / 'character.svg'
tree.write(str(out), encoding='utf-8', xml_declaration=True)
# Prove the edit stays within the original mouth subtree.
original = ET.parse(str(ROOT / 'base.svg'))
def exterior_fingerprint(doc):
    mouth_root = next(node for node in doc.iter() if node.get('id') == 'mouth')
    parent = next(node for node in doc.iter() if mouth_root in list(node))
    parent.remove(mouth_root)
    return ET.tostring(doc.getroot(), encoding='utf-8')
assert exterior_fingerprint(original) == exterior_fingerprint(ET.parse(str(out)))
print(out)
