// Separate authored keyforms for silhouette, features, scalp and attached parts.
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export function classify(id,rig){const role=rig.bindings[id];if(!role)throw Error('Unbound SVG group: '+id);return role;}
// Shape-preserving Hermite interpolation: no cosine lens and no flat band at every row.
function curve(knots,values,x){
 const n=knots.length;if(x<=knots[0])return values[0];if(x>=knots[n-1])return values[n-1];
 let i=0;while(x>knots[i+1])i++;
 const slope=j=>{if(j===0)return (values[1]-values[0])/(knots[1]-knots[0]);if(j===n-1)return (values[j]-values[j-1])/(knots[j]-knots[j-1]);const a=(values[j]-values[j-1])/(knots[j]-knots[j-1]),b=(values[j+1]-values[j])/(knots[j+1]-knots[j]);return a*b<=0?0:2*a*b/(a+b);};
 const h=knots[i+1]-knots[i],t=(x-knots[i])/h,t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*values[i]+(t3-2*t2+t)*h*slope(i)+(-2*t3+3*t2)*values[i+1]+(t3-t2)*h*slope(i+1);
}
function cagePoint(x,y,kx,ky,cage,rig){
 const cx=rig.head.center[0],sampleX=kx<0?2*cx-x:x;
 const rowDx=cage.rightDx.map(row=>curve(cage.columns,row,sampleX));
 const dx=kx*curve(cage.rows,rowDx,y),dy=Math.abs(ky)*curve(cage.rows,ky>0?cage.upDy:cage.downDy,y);
 return [x+dx,y+dy+kx*ky*(x-cx)*cage.cornerSlope];
}
export function headPoint(x,y,kx,ky,rig){return cagePoint(x,y,kx,ky,rig.faceCage,rig);}
export function scalpPoint(x,y,kx,ky,rig){return cagePoint(x,y,kx,ky,rig.scalpCage,rig);}
function featurePoint(x,y,kind,kx,ky,rig){
 const f=rig.features[kind],[ax,ay]=f.anchor,tx=kx?f[kx>0?'right':'left']:[0,0,1,1],ty=ky?f[ky>0?'up':'down']:[0,0,1,1];
 // Each eye/lip keeps its internal drawing proportions. Its local keyform is affine;
 // the face contour has its own keyform and never bends an iris into a lens.
 const sx=tx[2]*ty[2],sy=tx[3]*ty[3],slope=kx*ky*.045;
 return [ax+tx[0]+ty[0]+(x-ax)*sx,ay+tx[1]+ty[1]+kx*ky*(ax-rig.head.center[0])*.055+(y-ay)*sy+(x-ax)*slope];
}
export function attachment(kind,rig){return rig.surfaces[kind]?.anchor;}
export function isHanging(kind,rig){return Boolean(rig.surfaces[kind]?.guides)||kind.startsWith('earring');}
const skinWeight=(y,rig)=>1-smooth(rig.neck.followY,rig.neck.fixedY,y);
function guideAt(y,s){const rows=s.guides,knots=rows.map(r=>r[0]);return [1,2,3].map(i=>curve(knots,rows.map(r=>r[i]),y));}
export function rollWeight(x,y,kind,rig){if(kind==='body')return 0;if(kind==='skin')return skinWeight(y,rig);if(kind==='collar')return (1-smooth(rig.collar.followY,rig.collar.fixedY,y))*rig.collar.rollFollow;const s=rig.surfaces[kind];return s?.guides?guideAt(y,s)[1]:1;}
export function rollBend(x,y,kind,rig){const s=rig.surfaces[kind];return kind.startsWith('earring')?0:s?.guides?1-smooth(s.anchor[1]+12,s.bendEndY,y):1;}
export function rootPoint(kind,kx,ky,rig){
 const s=rig.surfaces[kind],[x,y]=s.anchor;
 if(s.parent)return boundaryPoint(x,y,s.parent,kx,ky,rig);
 return kind.startsWith('earring')?headPoint(x,y,kx,ky,rig):scalpPoint(x,y,kx,ky,rig);
}
function planePoint(x,y,kind,kx,ky,rig){
 const s=rig.surfaces[kind],[ax,ay]=s.anchor,q=rootPoint(kind,kx,ky,rig),v=rig.perspective;
 const a=kx*v.yawRadians,b=ky*(ky>0?v.upRadians:v.downRadians),u=x-ax,w=y-ay;
 const xx=u*Math.cos(a),zz=-u*Math.sin(a),yy=w*Math.cos(b)-zz*Math.sin(b);
 const depth=w*Math.sin(b)+zz*Math.cos(b),f=(v.focalLength-(s.depth||0))/(v.focalLength-(s.depth||0)-depth);
 return [q[0]+xx*f,q[1]+yy*f];
}
export function boundaryPoint(x,y,kind,kx,ky,rig){
 if(kind==='body'||(!kx&&!ky))return [x,y];
 if(rig.features[kind])return featurePoint(x,y,kind,kx,ky,rig);
 if(['face','faceBare','faceShadow','earL','earR'].includes(kind))return headPoint(x,y,kx,ky,rig);
 if(kind==='fringe')return scalpPoint(x,y,kx,ky,rig);
 if(kind==='skin'||kind==='collar'){
  const yy=Math.min(y,270),q=headPoint(x,yy,kx,ky,rig);
  const w=kind==='skin'?skinWeight(y,rig):(1-smooth(rig.collar.followY,rig.collar.fixedY,y))*rig.collar.headFollow;
  return [x+(q[0]-x)*w,y+(q[1]-yy)*w+(kind==='collar'?(x-rig.head.center[0])*kx*rig.collar.twist*w:0)];
 }
 const s=rig.surfaces[kind];if(!s)throw Error('Unbound head surface: '+kind);
 const [ax,ay]=s.anchor,q=rootPoint(kind,kx,ky,rig);
 if(isHanging(kind,rig)){
  if(kind.startsWith('earring'))return planePoint(x,y,kind,kx,ky,rig);
  const [spine,follow,width]=guideAt(y,s),hanging=[x+(q[0]-ax)*follow+(x-spine)*(-.07*Math.abs(kx))*width,y+(q[1]-ay)*follow];
  if(s.rootBlend){const top=scalpPoint(x,y,kx,ky,rig),t=smooth(...s.rootBlend,y);return top.map((v,i)=>v+(hanging[i]-v)*t);}
  return hanging;
 }
 return planePoint(x,y,kind,kx,ky,rig);
}
export function weights(x,y){const b=t=>[.5*t*(t-1),1-t*t,.5*t*(t+1)],a=b(x),c=b(y);return c.flatMap(v=>a.map(u=>u*v));}
function mixPoint(x,y,kind,p,rig){const w=weights(clamp(p.x/30,-1,1),clamp(p.y/30,-1,1)),q=[0,0];rig.keyCoordinates.forEach(([kx,ky],i)=>{const a=boundaryPoint(x,y,kind,kx,ky,rig);q[0]+=a[0]*w[i];q[1]+=a[1]*w[i];});return q;}
export function evaluateRoot(kind,p,rig){const w=weights(clamp(p.x/30,-1,1),clamp(p.y/30,-1,1)),q=[0,0];rig.keyCoordinates.forEach(([kx,ky],i)=>{const a=rootPoint(kind,kx,ky,rig);q[0]+=a[0]*w[i];q[1]+=a[1]*w[i];});return q;}
export function evaluatePoint(x,y,kind,p,rig){
 const q=mixPoint(x,y,kind,p,rig),a=clamp(p.z,-20,20)*Math.PI/180,[cx,cy]=rig.head.neckPivot,w=rollWeight(x,y,kind,rig);
 if(isHanging(kind,rig)){
  const root=evaluateRoot(kind,p,rig),dx=root[0]-cx,dy=root[1]-cy,b=a*rollBend(x,y,kind,rig),u=q[0]-root[0],v=q[1]-root[1];
  return [q[0]+(dx*Math.cos(a)-dy*Math.sin(a)-dx)*w+u*Math.cos(b)-v*Math.sin(b)-u,q[1]+(dx*Math.sin(a)+dy*Math.cos(a)-dy)*w+u*Math.sin(b)+v*Math.cos(b)-v];
 }
 const dx=kind==='skin'?clamp(q[0]-cx,-rig.neck.rollRadius,rig.neck.rollRadius):q[0]-cx,dy=q[1]-cy;
 return [q[0]+(dx*Math.cos(a)-dy*Math.sin(a)-dx)*w,q[1]+(dx*Math.sin(a)+dy*Math.cos(a)-dy)*w];
}
export function inertiaWeights(y,kind,rig){const s=rig.physics.strands[kind];if(!s)return [0,0];const t=clamp((y-s.startY)/(s.endY-s.startY));return [3*t*t*(1-t),t*t*t];}
