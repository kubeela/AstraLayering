import sys,json
from color_common import *
from PIL import Image
eye=sys.argv[1];doc,source,out,tmp=start(eye,1)
palette=json.loads((R/'refinement/groups/eyes/4.眼部色盘/palette.json').read_text(encoding='utf-8'))
assert palette['source_sha256']==sha(R/'references/base-subject.png')
samples={s['id']:s for s in palette['samples']};left=eye=='eye_left'
mapping={'sclera_surface':'01' if left else '03','iris':'06' if left else '10','pupil':'08' if left else '12','upper_lid_surface':'17' if left else '19','upper_lid_contour':'13' if left else '15','lower_lid_contour':'14' if left else '16','upper_lash_outer_instance':'13' if left else '15','upper_lash_outer_front_instance':'13' if left else '15','highlight_surface':'21' if left else '22'}
for suffix,pid in mapping.items():
 x=node(doc,eye+'_'+suffix);x.set('fill',samples[pid]['hex']);x.set('stroke','none')
im=Image.open(R/'references/base-subject.png').convert('RGB');point=(461,193) if left else (425,193);rgb=im.getpixel(point);color='#%02X%02X%02X'%rgb
fold=node(doc,eye+'_eyelid_fold_surface');fold.set('fill',color);fold.set('opacity','0.72');fold.set('stroke','none')
for g in node(doc,eye).xpath('.//*[@data-role="construction-guide"]'):g.set('display','none')
report=finish(doc,source,out,tmp,eye,1,{'palette_mapping':{eye+'_'+k:{'sample':v,'color':samples[v]['hex']} for k,v in mapping.items()},'fold_source_pixel':{'coordinate':point,'rgb':rgb,'hex':color},'edge_decisions':'No new outline; approved upper/lower liner and lash fill geometry retained; iris/sclera/highlight stroke=none. Effects remain for subsequent steps.'})
print(json.dumps(report,ensure_ascii=False,indent=2))
