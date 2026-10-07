// Pure, shared SVG-point / preview-mesh mapping. Surface roles are authored in rig.json.
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export function classify(id,receivers='') {
 const s=receivers||id;
 if(/neck_chin/.test(id))return 'skinShadow';
 if(/neck/.test(s))return 'skin';
 if(/earring/.test(id))return /left/.test(id)?'earringL':'earringR';
 if(/right_ear|right\/ear/.test(s)&&!/eyebrow/.test(s))return 'earR';
 if(/left_ear|left\/ear/.test(s)&&!/eyebrow/.test(s))return 'earL';
 if(/face.*nose/.test(s))return 'nose';
 if(/face.*(eye|mouth)|mouth_cast|eye_.*(lash|catchlight)/.test(s))return 'feature';
 if(/face/.test(s))return 'face';
 if(/back_hair/.test(s))return 'rear';
 if(/side_hair|side\/hair/.test(s))return /left/.test(s)?'sideL':'sideR';
 if(/forehead_pendant/.test(s))return 'forehead';
 if(/head_ornament|head\/.*ornament/.test(s)) {
  const side=/left/.test(s)?'L':'R';
  return /ribbon|bead_chain|diamond_pendant/.test(s)?'ribbon'+side:'ornament'+side;
 }
 if(/hair_cap/.test(s))return 'fringe';
 if(/shell_crown/.test(s))return 'crown';
 if(/hair_bun/.test(s))return 'bun';
 if(/halo/.test(s))return 'halo';
 return 'body';
}
function project(x,y,depth,kx,ky,rig) {
 const h=rig.head,[cx,cy]=h.center,u=x-cx,v=y-cy;
 const a=kx*h.yawRadians,b=ky*(ky>0?h.pitchUpRadians:h.pitchDownRadians);
 const xx=u*Math.cos(a)+depth*Math.sin(a),zz=depth*Math.cos(a)-u*Math.sin(a);
 return [cx+xx,cy+v*Math.cos(b)-zz*Math.sin(b)];
}
function faceDepth(x,y,rig) {
 const h=rig.head,t=smooth(h.jawStart,h.chinY,y),radius=h.faceRadius*(1-.36*t);
 return h.faceDepth*Math.exp(-.65*((x-h.center[0])/radius)**2)*(1-.24*t);
}
function facePoint(x,y,kind,kx,ky,rig) {
 const h=rig.head,q=project(x,y,faceDepth(x,y,rig)+(kind==='nose'?5:0),kx,ky,rig);
 const lower=smooth(h.jawStart,h.chinY,y);
 q[0]+=kx*lower*(3.2+Math.abs(ky)*(ky>0?rig.cornerCorrection.jawTurnUp:rig.cornerCorrection.jawTurnDown));
 q[1]+=kx*ky*((x-h.center[0])/h.faceRadius)*rig.cornerCorrection.featureSlant;
 return q;
}
function scalpPoint(x,y,kx,ky,rig) {
 const s=rig.surfaces.fringe,h=rig.head;
 const depth=(s.topDepth+(h.faceDepth+s.thickness-s.topDepth)*smooth(s.topY,s.frontY,y))*Math.exp(-.65*((x-h.center[0])/s.radius)**2);
 const q=project(x,y,depth,kx,ky,rig);
 // Authored brow/temple corrections are part of the assembled head boundaries.
 const t=smooth(s.templeStart,s.templeEnd,y);
 q[0]+=kx*t*(ky>0?s.cornerUp:s.cornerDown)*Math.abs(ky);
 q[1]+=kx*ky*((x-h.center[0])/h.faceRadius)*rig.cornerCorrection.featureSlant*t;
 return q;
}
function earPoint(x,y,kind,kx,ky,rig) {
 const h=rig.head,side=kind==='earR'?1:-1,ax=h.center[0]-side*49;
 const depth=faceDepth(ax,245,rig)+h.earDepth+side*.35*(x-ax);
 return project(x,y,depth,kx,ky,rig);
}
export function attachment(kind,rig) {return rig.surfaces[kind]?.anchor;}
export function isHanging(kind,rig) {return Boolean(rig.surfaces[kind]?.guides)||kind.startsWith('earring');}
function guideAt(y,surface) {
 const g=surface.guides;
 if(y<=g[0][0])return g[0].slice(1);
 if(y>=g.at(-1)[0])return g.at(-1).slice(1);
 for(let i=1;i<g.length;i++)if(y<=g[i][0]) {
  const a=g[i-1],b=g[i],t=smooth(a[0],b[0],y);
  return a.slice(1).map((v,j)=>v+(b[j+1]-v)*t);
 }
}
// Only the cervical cross-section follows the head. Wide empty skin-cache margins
// must not gain large rotation arms and fold the shoulder field.
function skinWeight(x,y,rig) {
 return 1-smooth(rig.neck.followY,rig.neck.fixedY,y);
}
export function rollWeight(x,y,kind,rig) {
 if(kind==='body')return 0;
 if(kind==='skin'||kind==='skinShadow')return skinWeight(x,y,rig);
 const s=rig.surfaces[kind];
 return s?.guides?guideAt(y,s)[1]:1;
}
export function rollBend(x,y,kind,rig) {
 const s=rig.surfaces[kind];
 if(kind.startsWith('earring'))return 0;
 return s?.guides?1-smooth(s.anchor[1]+10,s.bendEndY,y):1;
}
export function rootPoint(kind,kx,ky,rig) {
 const s=rig.surfaces[kind],[x,y]=s.anchor;
 if(kind.startsWith('earring'))return earPoint(x,y,kind==='earringL'?'earL':'earR',kx,ky,rig);
 if(kind==='rear')return project(x,y,s.depth,kx,ky,rig);
 if(kind.startsWith('ribbon'))return project(x,y,s.depth,kx,ky,rig);
 return scalpPoint(x,y,kx,ky,rig);
}
export function boundaryPoint(x,y,kind,kx,ky,rig) {
 if(kind==='body'||(!kx&&!ky))return [x,y];
 if(['face','feature','nose'].includes(kind))return facePoint(x,y,kind,kx,ky,rig);
 if(kind==='earL'||kind==='earR')return earPoint(x,y,kind,kx,ky,rig);
 if(kind==='skin'||kind==='skinShadow') {
  const w=skinWeight(x,y,rig);
  const cx=rig.head.center[0],sx=cx+clamp(x-cx,-rig.neck.rollRadius,rig.neck.rollRadius);
  const q=facePoint(sx,y,'face',kx,ky,rig);
  q[0]+=x-sx;
  return [x+(q[0]-x)*w,y+(q[1]-y)*w];
 }
 if(kind==='fringe')return scalpPoint(x,y,kx,ky,rig);
 const s=rig.surfaces[kind];
 if(!s)throw Error('Unbound head surface: '+kind);
 if(isHanging(kind,rig)) {
  const [ax,ay]=s.anchor,q=rootPoint(kind,kx,ky,rig);
  if(kind.startsWith('earring'))return [x+q[0]-ax,y+q[1]-ay];
  const [spine,follow,width]=guideAt(y,s);
  const yaw=kx*rig.head.yawRadians,pitch=ky*(ky>0?rig.head.pitchUpRadians:rig.head.pitchDownRadians);
  const hanging=[x+(q[0]-ax)*follow+(x-spine)*(Math.cos(yaw)-1)*width,
    y+(q[1]-ay)*follow+(x-spine)*Math.sin(yaw)*Math.sin(pitch)*width];
  if(kind==='sideL'||kind==='sideR') {
   const top=scalpPoint(x,y,kx,ky,rig),blend=smooth(ay+8,ay+70,y);
   return top.map((v,i)=>v+(hanging[i]-v)*blend);
  }
  return hanging;
 }
 // Crown/halo/hairpins are separate rigid local planes attached to the head.
 const [ax,ay]=s.anchor,q=project(ax,ay,s.depth,kx,ky,rig);
 const yaw=kx*rig.head.yawRadians,pitch=ky*(ky>0?rig.head.pitchUpRadians:rig.head.pitchDownRadians);
 return [q[0]+(x-ax)*Math.cos(yaw),q[1]+(y-ay)*Math.cos(pitch)+(x-ax)*Math.sin(yaw)*Math.sin(pitch)];
}
export function weights(x,y) {
 const b=t=>[.5*t*(t-1),1-t*t,.5*t*(t+1)],a=b(x),c=b(y);return c.flatMap(v=>a.map(u=>u*v));
}
function mixPoint(x,y,kind,p,rig) {
 const w=weights(clamp(p.x/30,-1,1),clamp(p.y/30,-1,1)),q=[0,0];
 rig.keyCoordinates.forEach(([kx,ky],i)=>{const a=boundaryPoint(x,y,kind,kx,ky,rig);q[0]+=a[0]*w[i];q[1]+=a[1]*w[i];});return q;
}
export function evaluateRoot(kind,p,rig) {
 const w=weights(clamp(p.x/30,-1,1),clamp(p.y/30,-1,1)),q=[0,0];
 rig.keyCoordinates.forEach(([kx,ky],i)=>{const a=rootPoint(kind,kx,ky,rig);q[0]+=a[0]*w[i];q[1]+=a[1]*w[i];});return q;
}
export function evaluatePoint(x,y,kind,p,rig) {
 const q=mixPoint(x,y,kind,p,rig),a=clamp(p.z,-20,20)*Math.PI/180,[cx,cy]=rig.head.neckPivot,w=rollWeight(x,y,kind,rig);
 if(isHanging(kind,rig)) {
  const root=evaluateRoot(kind,p,rig),dx=root[0]-cx,dy=root[1]-cy,b=a*rollBend(x,y,kind,rig),u=q[0]-root[0],v=q[1]-root[1];
  return [q[0]+(dx*Math.cos(a)-dy*Math.sin(a)-dx)*w+u*Math.cos(b)-v*Math.sin(b)-u,
    q[1]+(dx*Math.sin(a)+dy*Math.cos(a)-dy)*w+u*Math.sin(b)+v*Math.cos(b)-v];
 }
 if(kind==='skin'||kind==='skinShadow'){
  const dx=clamp(q[0]-cx,-rig.neck.rollRadius,rig.neck.rollRadius),dy=q[1]-cy;
  return [q[0]+(dx*Math.cos(a)-dy*Math.sin(a)-dx)*w,q[1]+(dx*Math.sin(a)+dy*Math.cos(a)-dy)*w];
 }
 return [q[0]+((q[0]-cx)*Math.cos(a)-(q[1]-cy)*Math.sin(a)+cx-q[0])*w,
 q[1]+((q[0]-cx)*Math.sin(a)+(q[1]-cy)*Math.cos(a)+cy-q[1])*w];
}
