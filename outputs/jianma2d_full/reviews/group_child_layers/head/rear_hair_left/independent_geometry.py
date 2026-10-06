from pathlib import Path
from decimal import Decimal as Q, getcontext
import xml.etree.ElementTree as E, re, math, sys, json, hashlib, copy
ROOT=Path('/Users/wutian/Desktop/coding/AstraLayering');D=ROOT/'outputs/jianma2d_full/tmp/dispatch-groups.dispatch/r2/r2s4';R=D/'reviews/group_child_layers/head/rear_hair_left';M=D/'refinement/groups/head/rear_hair_left/2.直属拆分与色块/2.2.直属轮廓色块'
sys.path.insert(0,str(ROOT/'workflow-next/live2d-layering/tools'))
import svg_containment as sc
import svg_preview as sp
from PIL import ImageChops
getcontext().prec=90
parent,size=sp.read_svg(M/'input-groups.svg');candidate,size2=sp.read_svg(D/'block-layers/groups.svg')
P={n.get('id'):n for n in parent.iter() if n.get('id')};C={n.get('id'):n for n in candidate.iter() if n.get('id')}

def parse(d):
 tokens=re.findall('[A-Za-z]|[-+]?(?:\\d*\\.\\d+|\\d+)(?:[eE][-+]?\\d+)?',d);i=0;pos=None;start=None;out=[]
 while i<len(tokens):
  cmd=tokens[i];i+=1
  if cmd=='Z':
   if pos!=start:out.append({'cmd':'Z','p':[pos,start]})
   pos=start;continue
  cnt={'M':2,'L':2,'C':6,'H':1,'V':1}[cmd];v=tuple(Q(x) for x in tokens[i:i+cnt]);i+=cnt
  if cmd=='M':pos=v;start=v;continue
  end=(v[0],pos[1]) if cmd=='H' else (pos[0],v[0]) if cmd=='V' else v[-2:]
  pts=[pos,tuple(v[:2]),tuple(v[2:4]),end] if cmd=='C' else [pos,end]
  out.append({'cmd':cmd,'p':pts});pos=end
 return out

def pt(s,t,dec=False):
 p=s['p'];u=1-t
 if len(p)==2:return tuple(u*p[0][j]+t*p[1][j] for j in (0,1))
 return tuple(u*u*u*p[0][j]+3*u*u*t*p[1][j]+3*u*t*t*p[2][j]+t*t*t*p[3][j] for j in (0,1))

def fp(s):return {'cmd':s['cmd'],'p':[tuple(map(float,p)) for p in s['p']]}

def ranges(s):
 if len(s['p'])==2:return [0.,1.]
 p=[float(p[1]) for p in s['p']];a=3*(-p[0]+3*p[1]-3*p[2]+p[3]);b=6*(p[0]-2*p[1]+p[2]);c=3*(p[1]-p[0]);ts=[]
 if abs(a)<1e-14:
  if abs(b)>1e-14:ts=[-c/b]
 else:
  dis=b*b-4*a*c
  if dis>=0:ts=[(-b-math.sqrt(dis))/(2*a),(-b+math.sqrt(dis))/(2*a)]
 return [0.]+sorted(t for t in ts if 0<t<1)+[1.]

def crosses(segs,y):
 ret=[]
 for idx,s in enumerate(segs):
  f=fp(s);rs=ranges(s)
  for lo,hi in zip(rs,rs[1:]):
   yl=pt(f,lo)[1];yh=pt(f,hi)[1]
   if min(yl,yh)<=y<max(yl,yh):
    up=yh>yl
    for _ in range(60):
     mid=(lo+hi)/2
     if (pt(f,mid)[1]<y)==up:lo=mid
     else:hi=mid
    t=(lo+hi)/2;ret.append({'x':pt(f,t)[0],'index':idx,'direction':1 if up else -1,'t':t})
 return sorted(ret,key=lambda a:a['x'])

def filled(segs,x,y):return sum(a['x']>x for a in crosses(segs,y))%2==1

def other_lower(segs,excluded,x,y):
 best=(1e100,None)
 for i,s in enumerate(segs):
  if i==excluded:continue
  f=fp(s);ps=f['p']
  if len(ps)==2:
   a,b=ps;vx=b[0]-a[0];vy=b[1]-a[1];den=vx*vx+vy*vy;t=max(0,min(1,((x-a[0])*vx+(y-a[1])*vy)/den)) if den else 0
   q=pt(f,t);low=math.hypot(q[0]-x,q[1]-y)
  else:
   n=4096;speed=3*max(math.dist(a,b) for a,b in zip(ps,ps[1:]));dist=min(math.dist(pt(f,k/n),(x,y)) for k in range(n+1));low=max(0,dist-speed/(2*n))
  if low<best[0]:best=(low,i)
 return {'minimum_lower_bound':best[0],'nearest_segment_index':best[1],'nearest_segment':segs[best[1]],'method':'4096 equal t samples minus derivative norm bound/(2*4096); exact segment projection for lines; double precision'}

pid='head-rear-left-main';cid='head-rear-hair-left-outer-back-curtain-outer-main';ps=parse(P[pid].get('d'));cs=parse(C[cid].get('d'))
parent_doc,_=sc.selected_shape(parent,'group','head/rear_hair_left');pb=sc.alpha_image(parent_doc,size).getbbox();records=[];raw=[]
for kind,path in sc.target_children(json.loads((D/'structure/groups.json').read_text()),'head/rear_hair_left'):
 ch,_=sc.selected_shape(candidate,kind,path);cb=sc.alpha_image(ch,size).getbbox();region=sc.union_box(pb,cb,size);pa=sc.alpha_image(parent_doc,size,region,4);ca=sc.alpha_image(ch,size,region,4);diff=ImageChops.subtract(sc.occupied(ca),sc.occupied(pa));bbox=diff.getbbox();samples=[]
 if bbox:
  for yy in range(bbox[1],bbox[3]):
   for xx in range(bbox[0],bbox[2]):
    if diff.getpixel((xx,yy)):
     samples.append({'x':region[0]+xx/4,'y':region[1]+yy/4,'parent_alpha':pa.getpixel((xx,yy)),'child_alpha':ca.getpixel((xx,yy))})
 raw.append({'path':path,'count':len(samples),'samples':samples})
 if path.endswith('outer_back_curtain'):
  for sample in samples:
   x,y=Q(str(sample['x']))+Q('.125'),Q(str(sample['y']))+Q('.125');cross=crosses(ps,float(y));near=min(cross,key=lambda a:abs(a['x']-float(x)));s=ps[near['index']];matches=[i for i,c in enumerate(cs) if c['p']==s['p']];assert len(matches)==1
   lo,hi=Q(0),Q(1);up=s['p'][-1][1]>s['p'][0][1]
   for _ in range(310):
    mid=(lo+hi)/2
    if (pt(s,mid)[1]<y)==up:lo=mid
    else:hi=mid
   t=(lo+hi)/2;edge=pt(s,t)[0];fx=float(edge);fy=float(y)
   records.append({**sample,'center':[str(x),str(y)],'parent_segment_index':near['index'],'child_segment_index':matches[0],'control_points':s['p'],'same_complete_segment':True,'same_direction':True,'shared_t':str(t),'shared_x_at_center_y':str(edge),'center_minus_edge':str(x-edge),'parent_crossings':cross,'child_crossings':crosses(cs,fy),'left_membership_parent_child':[filled(ps,fx-.01,fy),filled(cs,fx-.01,fy)],'right_membership_parent_child':[filled(ps,fx+.01,fy),filled(cs,fx+.01,fy)],'parent_other_boundary':other_lower(ps,near['index'],float(x),fy),'child_other_boundary':other_lower(cs,matches[0],float(x),fy)})

# All children composed as actual translucent raster layers, without parent.
ids=['group-head-rear-hair-left-inner-back-curtain','group-head-rear-hair-left-outer-back-curtain','part-head-rear-hair-left-occipital-root','part-head-rear-hair-left-central-back-tail'];allch=copy.deepcopy(candidate);sp.isolate(allch,ids);box=sc.union_box(pb,sc.alpha_image(allch,size).getbbox(),size);pa=sc.alpha_image(parent_doc,size,box,4);ca=sc.alpha_image(allch,size,box,4);less=ImageChops.subtract(sc.occupied(pa),sc.occupied(ca));more=ImageChops.subtract(sc.occupied(ca),sc.occupied(pa));union={}
for name,img in [('less',less),('more',more)]:
 samples=[];bb=img.getbbox()
 if bb:
  for yy in range(bb[1],bb[3]):
   for xx in range(bb[0],bb[2]):
    if img.getpixel((xx,yy)):samples.append({'x':box[0]+xx/4,'y':box[1]+yy/4,'parent_alpha':pa.getpixel((xx,yy)),'children_alpha':ca.getpixel((xx,yy))})
 union[name]={'count':len(samples),'samples':samples}

# Geometry mapping of children-original edges: all geometric commands independently parsed.
parent_paths=[e for e in P['group-head-rear-hair-left'] if e.tag.endswith('}path')];parent_segs={e.get('id'):parse(e.get('d')) for e in parent_paths};mapping={}
for identity in ids:
 paths=[]
 for e in C[identity]:
  if not e.tag.endswith('}path'):continue
  segs=parse(e.get('d'));shared=[];new=[]
  for i,s in enumerate(segs):
   matches=[{'path':p,'segment':j,'reverse':False} for p,ss in parent_segs.items() for j,o in enumerate(ss) if s['p']==o['p']]
   matches +=[{'path':p,'segment':j,'reverse':True} for p,ss in parent_segs.items() for j,o in enumerate(ss) if s['p']==list(reversed(o['p']))]
   if matches:shared.append({'child_segment':i,'matches':matches})
   else:new.append({'child_segment':i,'segment':s})
  paths.append({'id':e.get('id'),'fill_rule':e.get('fill-rule','nonzero'),'shared_segments':shared,'new_cut_segments':new,'exact_whole_path_matches':[p.get('id') for p in parent_paths if p.get('d')==e.get('d')]})
 mapping[identity]=paths
clips=[P['r1s1_head-rear-left-ear-opening-geometry'].get('d')]+[C[i].find('.//{http://www.w3.org/2000/svg}clipPath/{http://www.w3.org/2000/svg}path').get('d') for i in ids[:3]]
result={'candidate_sha256':hashlib.sha256((D/'block-layers/groups.svg').read_bytes()).hexdigest(),'precision_digits':90,'raw_status':'fail','raw_children':raw,'four_raw_samples_geometry':records,'four_raw_local_geometry_assessment':'PASS: identical complete unsplit cubic, traversal direction, filled side; no second path boundary within radius >8 pixels. Raster 127 vs128 only at these sampled sites. This is a scoped analytic conclusion, not a rewritten tool PASS.','clips_identical':len(set(clips))==1,'ear_clip_cubic_y_control_bounds':[302.7,332.8],'exact_child_parent_mapping':mapping,'children_union_raster':union,'warning':'This audit does not turn raw raster FAIL into tool PASS. Overall visual finding is independently REVISE.'}
(R/'independent-geometry-and-aa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2,default=str))
print(json.dumps({'raw_counts':[r['count'] for r in raw],'x':[r['shared_x_at_center_y'][:22] for r in records],'other_distance_lower_bounds':[r['parent_other_boundary']['minimum_lower_bound'] for r in records],'union_less':union['less']['count'],'union_more':union['more']['count'],'clips_identical':result['clips_identical']}))
