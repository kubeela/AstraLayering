// SVG points and GPU meshes share the same authored head cage. No layer-name inference.
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export function classify(id,rig){const role=rig.bindings[id];if(!role)throw Error('Unbound SVG group: '+id);return role;}
function rowAt(y,rows){
 if(y<=rows[0][0])return rows[0];if(y>=rows.at(-1)[0])return rows.at(-1);
 for(let i=1;i<rows.length;i++)if(y<=rows[i][0]){const a=rows[i-1],b=rows[i],t=smooth(a[0],b[0],y);return a.map((v,j)=>v+(b[j]-v)*t);}
}
export function headPoint(x,y,kx,ky,rig){
 const r=rowAt(y,rig.cage.rows),cx=r[2],u=x-cx;
 // A single skull cross-section controls both the face and the hair at each height.
 // Keep a broad section at the jaw: narrowing the cage to the chin folds the side hair.
 const radius=Math.max(65,(r[3]-r[1])/2),t=clamp(u/radius,-1,1);
 const depth=rig.cage.outerShift+(1-rig.cage.outerShift)*Math.cos(t*Math.PI*.5);
 const width=1+(r[5]-1)*Math.abs(kx);
 const py=ky>0?r[6]*ky:r[7]*-ky,pw=1+(ky>0?r[8]-1:r[9]-1)*Math.abs(ky);
 return [cx+u*width*pw+kx*r[4]*depth,
  y+py+kx*ky*t*rig.cage.cornerSlant];
}
export function attachment(kind,rig){return rig.surfaces[kind]?.anchor;}
export function isHanging(kind,rig){return Boolean(rig.surfaces[kind]?.guides)||kind.startsWith('earring');}
const skinWeight=(y,rig)=>1-smooth(rig.neck.followY,rig.neck.fixedY,y);
function guideAt(y,s){return rowAt(y,s.guides).slice(1);}
export function rollWeight(x,y,kind,rig){if(kind==='body')return 0;if(kind==='skin')return skinWeight(y,rig);const s=rig.surfaces[kind];return s?.guides?guideAt(y,s)[1]:1;}
export function rollBend(x,y,kind,rig){const s=rig.surfaces[kind];return kind.startsWith('earring')?0:s?.guides?1-smooth(s.anchor[1]+12,s.bendEndY,y):1;}
export function rootPoint(kind,kx,ky,rig){const [x,y]=rig.surfaces[kind].anchor;return headPoint(x,y,kx,ky,rig);}
export function boundaryPoint(x,y,kind,kx,ky,rig){
 if(kind==='body'||(!kx&&!ky))return [x,y];
 if(['face','faceBare','feature','nose','fringe','earL','earR'].includes(kind)){
  return headPoint(x,y,kx,ky,rig);
 }
 if(kind==='skin'){const q=headPoint(x,Math.min(y,270),kx,ky,rig),w=skinWeight(y,rig);return [x+(q[0]-x)*w,y+(q[1]-Math.min(y,270))*w];}
 const s=rig.surfaces[kind];if(!s)throw Error('Unbound head surface: '+kind);
 const [ax,ay]=s.anchor,q=rootPoint(kind,kx,ky,rig);
 if(isHanging(kind,rig)){
  if(kind.startsWith('earring'))return [x+q[0]-ax,y+q[1]-ay];
  const [spine,follow,width]=guideAt(y,s);
  const hanging=[x+(q[0]-ax)*follow+(x-spine)*(-.045*Math.abs(kx))*width,y+(q[1]-ay)*follow];
  if(kind.startsWith('side')||kind.startsWith('rear')){
   const top=headPoint(x,y,kx,ky,rig),t=smooth(230,325,y);
   return top.map((v,i)=>v+(hanging[i]-v)*t);
  }
  return hanging;
 }
 // Ornaments retain their local shape under parent turn; roll uses true rotation.
 return [q[0]+(x-ax)*(1-.075*Math.abs(kx)),q[1]+(y-ay)*(1-.025*Math.abs(ky))+(x-ax)*kx*ky*.035];
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
