// Composed head shell, facial/scalp surfaces, local corrections and attachments.
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
export function validateRig(rig){
 if(rig.schema!=='astra.head-nine-key.v5')throw Error('Unsupported head rig: '+rig.schema);
 for(const name of ['faceSurface','scalpSurface']){
  const s=rig[name];if(s.parent!=='shell')throw Error(name+': parent must be shell');
  if(s.rows.some((v,i)=>!Number.isFinite(v)||i&&v<=s.rows[i-1])||!(s.radiusX>0))throw Error(name+': invalid coordinates');
  for(const key of ['yawByRow','upCenter','upEdge','downCenter','downEdge','pitchWidth','cornerDx'])if(s[key].length!==s.rows.length||s[key].some(v=>!Number.isFinite(v)))throw Error(name+'.'+key+': one value per latitude required');
 }
 for(const [name,f] of Object.entries(rig.features))if(f.parent!=='faceSurface')throw Error(name+': parent must be faceSurface');
 for(const [name,p] of Object.entries(rig.projections))if(!['face','earL','earR','skin'].includes(p.receiver)||rig.projections[p.caster])throw Error(name+': invalid projection ownership');
}
// Child corrections are evaluated in the undeformed parent coordinates. Only the
// shared parent converts them into the posed head frame; it is never added twice.
export function shellPoint(x,y,kx,ky,rig){
 const s=rig.shell,[cx]=s.center;
 return [cx+(x-cx)*(1-s.yawNarrow*Math.abs(kx))+kx*s.yawShift,y+ky*s.pitchShift];
}
function surfaceLocal(x,y,kx,ky,s){
 const u=(x-s.centerX)/s.radiusX,arc=Math.max(0,1-u*u);
 const yaw=curve(s.rows,s.yawByRow,y)*curve(s.yawColumns,s.yawProfile,u*(kx<0?-1:1))*kx;
 const edge=curve(s.rows,ky>0?s.upEdge:s.downEdge,y),middle=curve(s.rows,ky>0?s.upCenter:s.downCenter,y);
 const pitch=(edge+(middle-edge)*arc)*Math.abs(ky),width=1+ky*curve(s.rows,s.pitchWidth,y);
 let px=s.centerX+(x-s.centerX)*width+yaw+kx*ky*curve(s.rows,s.cornerDx,y)*arc,py=y+pitch;
 const a=kx*ky*s.cornerRadians,dx=px-s.centerX,dy=py-s.centerY;
 return [s.centerX+dx*Math.cos(a)-dy*Math.sin(a),s.centerY+dx*Math.sin(a)+dy*Math.cos(a)];
}
export function faceSurfacePoint(x,y,kx,ky,rig){return shellPoint(...surfaceLocal(x,y,kx,ky,rig.faceSurface),kx,ky,rig);}
export function scalpPoint(x,y,kx,ky,rig){return shellPoint(...surfaceLocal(x,y,kx,ky,rig.scalpSurface),kx,ky,rig);}
export function headPoint(x,y,kx,ky,rig){
 const c=rig.contour,cx=rig.head.center[0],side=(x-cx)/rig.faceSurface.radiusX;
 const socket=(1-smooth(0,c.socketRadiusY,Math.abs(y-c.socketY)))*smooth(.5,1,side*kx);
 const jaw=smooth(c.jawStartY,c.jawEndY,y);
 const xx=x-kx*c.farSocketInset*socket-(x-cx)*Math.abs(kx)*jaw*c.jawNarrow;
 return faceSurfacePoint(xx,y,kx,ky,rig);
}
export function featureLocalPoint(x,y,kind,kx,ky,rig){
 const f=rig.features[kind],[cx,cy]=f.anchor,[w,h]=f.size,u=clamp((x-cx)/(w*.5),-1,1),v=clamp((y-cy)/h,-.5,.5);
 const far=(cx-rig.head.center[0])*kx>0,scale=kx?(far?f.farWidth:f.nearWidth):1;
 const arc=1-u*u,lag=f.cornerLag*Math.abs(u)*(1+u*kx)*.5;
 return [cx+(x-cx)*scale+kx*(f.yawShift+v*f.tipDepth-lag),cy+(y-cy)*(1+ky*f.pitchStretch)+Math.abs(ky)*(ky>0?f.pitchShift[0]:f.pitchShift[1])-ky*f.localArch*arc];
}
function featurePoint(x,y,kind,kx,ky,rig){return faceSurfacePoint(...featureLocalPoint(x,y,kind,kx,ky,rig),kx,ky,rig);}
function earPoint(x,y,kind,kx,ky,rig){
 const cx=kind==='earR'?394:494,far=(cx-rig.head.center[0])*kx>0;
 return faceSurfacePoint(cx+(x-cx)*(far?.87:1)-kx*2,y,kx,ky,rig);
}
export function motionKind(kind,rig){return rig.projections?.[kind]?.caster||kind;}
export function attachment(kind,rig){return rig.surfaces[kind]?.anchor;}
export function isHanging(kind,rig){return Boolean(rig.surfaces[kind]?.guides)||kind.startsWith('earring');}
const skinWeight=(y,rig)=>1-smooth(rig.neck.followY,rig.neck.fixedY,y);
function guideAt(y,s){const rows=s.guides,knots=rows.map(r=>r[0]);return [1,2,3].map(i=>curve(knots,rows.map(r=>r[i]),y));}
export function rollWeight(x,y,kind,rig){if(kind==='body')return 0;if(kind==='skin')return skinWeight(y,rig);if(kind==='collar')return (1-smooth(rig.collar.followY,rig.collar.fixedY,y))*rig.collar.rollFollow;const s=rig.surfaces[kind];return s?.guides?guideAt(y,s)[1]:1;}
export function rollBend(x,y,kind,rig){const s=rig.surfaces[kind];return kind.startsWith('earring')?0:s?.guides?1-smooth(s.anchor[1]+12,s.bendEndY,y):1;}
export function rootPoint(kind,kx,ky,rig){
 const s=rig.surfaces[kind],[x,y]=s.anchor;
 if(s.parent)return boundaryPoint(x,y,s.parent,kx,ky,rig);
 return kind.startsWith('earring')?earPoint(x,y,kind==='earringR'?'earR':'earL',kx,ky,rig):scalpPoint(x,y,kx,ky,rig);
}
function planePoint(x,y,kind,kx,ky,rig){
 const s=rig.surfaces[kind],[ax,ay]=s.anchor,q=rootPoint(kind,kx,ky,rig),v=rig.perspective;
 const a=kx*v.yawRadians,b=ky*(ky>0?v.upRadians:v.downRadians),u=x-ax,w=y-ay;
 const xx=u*Math.cos(a),zz=-u*Math.sin(a),yy=w*Math.cos(b)-zz*Math.sin(b);
 const depth=w*Math.sin(b)+zz*Math.cos(b),f=(v.focalLength-(s.depth||0))/(v.focalLength-(s.depth||0)-depth);
 return [q[0]+xx*f,q[1]+yy*f];
}
export function boundaryPoint(x,y,kind,kx,ky,rig){
 kind=motionKind(kind,rig);
 if(kind==='body'||(!kx&&!ky))return [x,y];
 if(rig.features[kind])return featurePoint(x,y,kind,kx,ky,rig);
 if(['face','faceBare','faceDetail','faceShadow'].includes(kind))return headPoint(x,y,kx,ky,rig);
 if(kind==='earL'||kind==='earR')return earPoint(x,y,kind,kx,ky,rig);
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
 kind=motionKind(kind,rig);
 const q=mixPoint(x,y,kind,p,rig),a=clamp(p.z,-20,20)*Math.PI/180,[cx,cy]=rig.head.neckPivot,w=rollWeight(x,y,kind,rig);
 if(isHanging(kind,rig)){
  const root=evaluateRoot(kind,p,rig),dx=root[0]-cx,dy=root[1]-cy,b=a*rollBend(x,y,kind,rig),u=q[0]-root[0],v=q[1]-root[1];
  return [q[0]+(dx*Math.cos(a)-dy*Math.sin(a)-dx)*w+u*Math.cos(b)-v*Math.sin(b)-u,q[1]+(dx*Math.sin(a)+dy*Math.cos(a)-dy)*w+u*Math.sin(b)+v*Math.cos(b)-v];
 }
 const dx=kind==='skin'?clamp(q[0]-cx,-rig.neck.rollRadius,rig.neck.rollRadius):q[0]-cx,dy=q[1]-cy;
 return [q[0]+(dx*Math.cos(a)-dy*Math.sin(a)-dx)*w,q[1]+(dx*Math.sin(a)+dy*Math.cos(a)-dy)*w];
}
export function inertiaWeights(y,kind,rig){const s=rig.physics.strands[kind];if(!s)return [0,0];const t=clamp((y-s.startY)/(s.endY-s.startY));return [3*t*t*(1-t),t*t*t];}
