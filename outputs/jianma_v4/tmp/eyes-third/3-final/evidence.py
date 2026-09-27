from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from lxml import etree as E
import numpy as np,json,hashlib
P=Path(__file__).resolve().parent;R=P.parents[2]
OUT=R/'refinement/groups/eyes/3.双眼线稿组装与审查'
formal=E.parse(str(OUT/'character.svg'));digest=hashlib.sha256((OUT/'character.svg').read_bytes()).hexdigest()
source=Image.open(R/'references/base-subject.png').convert('RGB')
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',20)
link_font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',17)
settings=json.loads((P/'settings.json').read_text(encoding='utf-8'))
def savejson(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def components(a):
 spans=[];parents=[];previous=[]
 def find(x):
  while parents[x]!=x:parents[x]=parents[parents[x]];x=parents[x]
  return x
 for y,row in enumerate(a):
  edge=np.flatnonzero(np.diff(np.pad(row.astype(np.int8),(1,1))));cur=[]
  for x0,x1 in zip(edge[::2],edge[1::2]):
   n=len(parents);parents.append(n);spans.append((y,int(x0),int(x1)));cur.append(n)
   for o in previous:
    _,p0,p1=spans[o]
    if p1>=x0 and p0<=x1:parents[find(n)]=find(o)
  previous=cur
 return len(set(find(x) for x in range(len(parents))))
def no_row_holes(a):
 return all(not r.any() or r[np.flatnonzero(r)[0]:np.flatnonzero(r)[-1]+1].all() for r in a)
baseline=np.array(Image.open(P/'candidate-eyes-direct-12x.png').convert('RGB'))
report={'candidate_sha256':digest,'per_eye':{}}
for eye,config in settings.items():
 folder=P/eye;side=eye.split('_')[-1];box=config['box'];x0,y0,w,h=box
 src=source.crop((x0,y0,x0+w,y0+h));cand=Image.open(folder/'candidate-eye-native.png').convert('RGB')
 src.save(folder/'source-eye-native.png');src.resize((1320,900),Image.Resampling.NEAREST).save(folder/'reference-eye-nearest-30x.png')
 panel=Image.new('RGB',(1784,650),'white');draw=ImageDraw.Draw(panel)
 draw.text((12,12),f'SOURCE | {eye} | original coordinates',font=font,fill='black');draw.text((904,12),f'ASSEMBLY | same box {box}',font=font,fill='black')
 panel.paste(src.resize((880,600),Image.Resampling.NEAREST),(8,45));panel.paste(cand.resize((880,600),Image.Resampling.NEAREST),(900,45));panel.save(folder/'reference-candidate-side-by-side.png')
 Image.blend(src,cand,.5).resize((880,600),Image.Resampling.NEAREST).save(folder/'same-coordinate-blend-50pct.png')
 def mask(name):return np.array(Image.open(folder/(name+'.png')).convert('L'))<128
 def bounds(a):
  yy,xx=np.where(a);return [x0+xx.min()/60,y0+yy.min()/60,x0+(xx.max()+1)/60,y0+(yy.max()+1)/60]
 def size(b):return [b[2]-b[0],b[3]-b[1]]
 def extent(a,y):
  xs=np.flatnonzero(a[round((y-y0)*60)]);return [x0+xs.min()/60,x0+(xs.max()+1)/60]
 def column(a,x):
  ys=np.flatnonzero(a[:,round((x-x0)*60)]);return [y0+ys.min()/60,y0+(ys.max()+1)/60]
 aperture=mask('mask-aperture');iris=mask('mask-iris-visible');full=mask('mask-iris-complete');hair=mask('mask-actual-hair');sclera=mask('mask-sclera-complete')
 roi=np.ones_like(aperture,dtype=bool)
 if side=='left':roi[:,1860:]=False
 else:roi[:,:840]=False
 assert not (aperture&hair&roi).any()
 eb=bounds(aperture&roi);ib=bounds(iris&roi);ew,eh=size(eb);iw,ih=size(ib)
 pupil=mask('mask-pupil-visible');highlight=mask('mask-highlight-visible');dy,dx=np.where(pupil&~highlight)
 scans=[]
 for y in [198.5,199.5,200.5,201.5]:
  a=extent(aperture&roi,y);i=extent(iris&roi,y)
  lo,hi=i[0]-a[0],a[1]-i[1]
  scans.append({'y':y,'eye_extent':a,'iris_extent':i,'inner_white_width':lo if side=='left' else hi,'outer_white_width':hi if side=='left' else lo})
 cx=470.15 if side=='left' else 418.2;cf=column(full,cx);cv=column(iris,cx)
 previous=R/('tmp/eyes-third/2.2' if side=='left' else 'tmp/eyes-third/2.2-right')/'visible-proportion-measurements.json'
 source_estimates=json.loads(previous.read_text(encoding='utf-8'))['source_estimates']
 measure={'candidate_sha256':digest,'measurement_coordinates':'Original canvas; direct 60x SVG masks; 50% threshold. Same source and candidate observable domain.',
 'visible_domain':'x < 480' if side=='left' else 'x >= 407','source_estimates':source_estimates,'source_estimate_provenance':'Original reference pixel intervals from this run stage 2.2, visually rechecked at assembly; current candidate recomputed.',
 'candidate':{'visible_eye_bbox':eb,'visible_eye_size':[ew,eh],'visible_iris_bbox':ib,'visible_iris_size':[iw,ih],'iris_to_eye_width_ratio':iw/ew,'iris_to_eye_height_ratio':ih/eh,
 'visible_iris_bbox_center':[(ib[0]+ib[2])/2,(ib[1]+ib[3])/2],'pupil_visible_dark_centroid':[x0+(dx.mean()+.5)/60,y0+(dy.mean()+.5)/60],
 'highlight_visible_bbox':bounds(highlight),'scanlines':scans,'complete_iris_bbox':bounds(full),'center_column_x':cx,'center_column_full':cf,'center_column_visible':cv,'center_column_hidden_above':cv[0]-cf[0],'center_column_hidden_below':cf[1]-cv[1]},
 'actual_hair_has_no_aperture_intersection_in_shared_domain':True,
 'limits':'Blurred source boundaries have approximately 0.5-1 px uncertainty. Nominal interval ends are visual estimates, not subpixel ground truth.'}
 if side=='left':measure['borderline_observation']='At y199.5 inner white 5.083 px is 0.083 above prior nominal 5.0 interval end; visible pupil centroid y197.574 is 0.026 below nominal numeric lower bound y197.6. Both differences are below source pixel-boundary uncertainty; reported without rounding them into the interval.'
 assert source_estimates['width_ratio_range'][0]<=iw/ew<=source_estimates['width_ratio_range'][1]
 savejson(folder/'visible-proportion-measurements.json',measure)
 b=mask('real-hair-before');m=mask('real-hair-moved');c=mask('real-hair-curve-edited');lx=config['lash_box'][0]
 if side=='left':near=np.arange(b.shape[1])[None,:]<(480-lx)*60;far=np.arange(b.shape[1])[None,:]>(483-lx)*60
 else:near=np.arange(b.shape[1])[None,:]>(406-lx)*60;far=np.arange(b.shape[1])[None,:]<(404.2-lx)*60
 other_box=(393,184,437,214) if side=='left' else (449,184,493,214)
 ox1,oy1,ox2,oy2=other_box;crop=np.s_[(oy1-175)*12:(oy2-175)*12,(ox1-390)*12:(ox2-390)*12]
 independent={}
 for mode in ['moved','curve-edited','guides-on']:
  changed=np.array(Image.open(folder/('both-eyes-'+mode+'.png')).convert('RGB'))
  independent[mode]=np.array_equal(baseline[crop],changed[crop]);assert independent[mode]
  other='eye_right' if side=='left' else 'eye_left';test=E.parse(str(folder/('both-eyes-'+mode+'.svg')))
  for orig in formal.xpath('//*[@id]'):
   if orig.get('id')==other or orig.get('id').startswith(other+'_'):
    assert E.tostring(orig,with_tail=False)==E.tostring(test.xpath('//*[@id=$v]',v=orig.get('id'))[0],with_tail=False)
 controller=formal.xpath('//*[@id=$v]',v=eye+'_upper_lash_outer_controller')[0]
 formal_source=formal.xpath('//*[@id=$v]',v=eye+'_upper_lash_outer_geometry')[0]
 root_overlap=int((mask('mask-upper-ink')&mask('mask-lash-complete')).sum())
 linkage={'candidate_sha256':digest,'test_hair':'Actual formal hair surface and shared coverage clip; only fill changed to white for ink measurement; no surrogate occluder.',
 'full_source_components':components(mask('real-hair-complete-no-hair')),'actual_hair_fragment_counts':{'before':components(b),'moved':components(m),'curve_edited':components(c)},
 'controller_change':'translate(0.8 0.35)','single_source_curve_change':config['curve_change'],
 'controller_difference_pixels':{'near_root':int(((b!=m)&near).sum()),'far_tip':int(((b!=m)&far).sum())},
 'curve_difference_pixels':{'near_root':int(((b!=c)&near).sum()),'far_tip':int(((b!=c)&far).sum())},
 'upper_lid_lash_root_overlap_pixels_60x':root_overlap,'other_eye_pixels_and_resources_unchanged':independent,
 'formal_restored':controller.get('transform')=='translate(0 0)' and config['curve_change'][0] in formal_source.get('d')}
 assert linkage['full_source_components']==1 and all(n==2 for n in linkage['actual_hair_fragment_counts'].values())
 assert root_overlap>0 and linkage['formal_restored']
 assert all(n>0 for key in ['controller_difference_pixels','curve_difference_pixels'] for n in linkage[key].values())
 savejson(folder/'real-hair-linkage-check.json',linkage)
 panel=Image.new('RGB',(2160,644),'white');draw=ImageDraw.Draw(panel)
 for n,(name,title) in enumerate([('before','BEFORE | actual hair'),('moved','CONTROLLER | +0.8,+0.35'),('curve-edited','SOURCE | one control-point edit')]):
  draw.text((720*n+10,10),f'{eye} | {title}',font=link_font,fill='black');panel.paste(Image.open(folder/('real-hair-'+name+'.png')).resize((720,600),Image.Resampling.LANCZOS),(720*n,40))
 panel.save(folder/'real-hair-linkage-before-after-panel.png')
 structure={'complete_sclera_components':components(sclera),'complete_sclera_enclosed_holes':components(~sclera)-1,'complete_iris_components':components(full),'complete_iris_enclosed_holes':components(~full)-1,'highlight_components':components(highlight),'lower_lashes':'Absent: no independently identifiable lower lash tips in source','extra_tear_mole':'Absent: unsupported by source'}
 assert structure['complete_sclera_components']==1 and structure['complete_iris_components']==1 and structure['highlight_components']==1
 assert structure['complete_sclera_enclosed_holes']==0 and structure['complete_iris_enclosed_holes']==0
 savejson(folder/'complete-shapes-check.json',structure)
 items=[('upper_lid','UPPER LID'),('lower_lid','LOWER LID'),('sclera','COMPLETE SCLERA'),('full-interior-unclipped','FULL IRIS + PUPIL'),('highlight-only','INDEPENDENT HIGHLIGHT'),('upper_lashes','COMPLETE UPPER LASH'),(None,'LOWER LASH: no source evidence'),('eyelid_fold','EYELID FOLD')]
 panel=Image.new('RGB',(1608,1200),'#eeeeee');draw=ImageDraw.Draw(panel)
 for n,(key,label) in enumerate(items):
  px=(n%3)*536;py=(n//3)*400;draw.text((px+6,py+5),label,font=font,fill='black')
  if key:panel.paste(Image.open(folder/('component-'+key+'.png')).resize((528,360),Image.Resampling.LANCZOS),(px+4,py+35))
 panel.save(folder/'eight-components-panel.png')
 report['per_eye'][eye]={'visible_width_ratio':iw/ew,'sclera_complete':True,'iris_complete':True,'linkage_checks_pass':True,'opposite_eye_isolated':True,'source_measurements_file':str((folder/'visible-proportion-measurements.json').relative_to(P))}

for name,box,scale in [('head',(374,108,523,276),6),('eyes',(390,175,499,222),8)]:
 src=source.crop(box);src.save(P/('source-'+name+'-native.png'));candidate=Image.open(P/('candidate-'+name+'-native.png')).convert('RGB')
 W,H=src.size;panel=Image.new('RGB',(W*scale*2+24,H*scale+44),'white');draw=ImageDraw.Draw(panel)
 draw.text((8,8),'SOURCE | same coordinates',font=font,fill='black');draw.text((W*scale+16,8),'ASSEMBLY | independent eyes',font=font,fill='black')
 panel.paste(src.resize((W*scale,H*scale),Image.Resampling.NEAREST),(4,40));panel.paste(candidate.resize((W*scale,H*scale),Image.Resampling.NEAREST),(W*scale+16,40));panel.save(P/(name+'-same-coordinate-comparison.png'))
savejson(P/'visual-verification.json',report)
assert (OUT/'character.svg').read_bytes()==(R/'refinement/groups/eyes/2.逐眼线稿/eye_right/2.4.关联遮挡与线稿校准/character.svg').read_bytes()
print(json.dumps(report,ensure_ascii=False,indent=2))
