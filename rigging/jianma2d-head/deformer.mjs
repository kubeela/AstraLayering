// Pure authoring kernel. The same field can map SVG curve points or preview mesh vertices.
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v-a)/(b-a)); return t*t*(3-2*t); };
export function classify(id, receivers = '') {
  const s = receivers || id;
  if (/neck/.test(s)) return 'neck';
  if (/right_ear|right\/ear/.test(s) && !/eyebrow/.test(s)) return 'earR';
  if (/left_ear|left\/ear/.test(s) && !/eyebrow/.test(s)) return 'earL';
  if (/earring/.test(s)) return 'earring';
  if (/face.*nose/.test(s)) return 'nose';
  if (/face.*(eye|mouth)|mouth_cast|eye_.*(lash|catchlight)/.test(s)) return 'feature';
  if (/face/.test(s)) return 'face';
  if (/back_hair/.test(s)) return 'rear';
  if (/side_hair|side\/hair/.test(s)) return 'hair';
  if (/ribbon|bead_chain|diamond_pendant/.test(s)) return 'ribbon';
  if (/head|hair_cap|hair_bun|shell_crown/.test(s)) return 'skull';
  return 'body';
}
export function rollWeight(x, y, kind, rig) {
  const h=rig.head;
  if(kind==='body') return 0;
  if(kind==='neck') return 1-smooth(310,h.neckPinY,y);
  if(['hair','rear','ribbon'].includes(kind)) return 1-smooth(330,h.hairPinY,y);
  return 1;
}
// Broad cranial turn -> curved face plane -> lower-jaw correction -> combined XY correction.
// Nearby skin, lines, pigment, eyelids, iris and attached masks share this field.
export function boundaryPoint(x,y,kind,kx,ky,rig) {
  if(kind==='body'||(!kx&&!ky)) return [x,y];
  const h=rig.head, [cx,cy]=h.center;
  const yaw=kx*h.yawRadians, pitch=ky*(ky>0?h.pitchUpRadians:h.pitchDownRadians);
  const isFace=['face','feature','nose'].includes(kind), ear=kind.startsWith('ear');
  let weight=1, sampleY=y;
  if(kind==='neck') {weight=1-smooth(310,h.neckPinY,y);sampleY=Math.min(y,312);}
  if(['hair','rear','ribbon'].includes(kind)) {weight=1-smooth(330,h.hairPinY,y);sampleY=Math.min(y,330);}
  const u=x-cx,v=sampleY-cy;
  let depth;
  if(ear) {
    // Attach the ear plane to the cheek/temple before projecting it. A constant
    // rear depth would tear the ear off the face when the hair is hidden.
    const side=kind==='earR'?1:-1,anchorX=cx-side*49;
    const rootDepth=h.faceDepth*Math.exp(-.65*((anchorX-cx)/h.faceRadius)**2);
    depth=rootDepth+h.earDepth+side*.35*(x-anchorX);
  }
  else if(isFace||kind==='neck') {
    const radius=h.faceRadius*(1-.36*smooth(h.jawStart,h.chinY,sampleY));
    // Smooth bounded dome; no clamped square-root kink at the silhouette.
    depth=h.faceDepth*Math.exp(-.65*(u/radius)**2);
    depth*=1-.24*smooth(h.jawStart,h.chinY,sampleY);
    if(kind==='nose') depth+=5;
  } else {
    depth=h.skullDepth*Math.exp(-.55*(u/h.skullRadius)**2);
    depth*=.30+.70*smooth(65,170,sampleY);
  }
  const sx=Math.sin(yaw),cxr=Math.cos(yaw),sy=Math.sin(pitch),cyr=Math.cos(pitch);
  let xx=u*cxr+depth*sx;
  const zz=depth*cxr-u*sx;
  let yy=v*cyr-zz*sy;
  if(isFace) {
    const lower=smooth(h.jawStart,h.chinY,sampleY);
    // Side cheek, chin and feature plane receive a coupled correction, not additive X/Y slides.
    xx+=kx*lower*(3.2+Math.abs(ky)*(ky>0?rig.cornerCorrection.jawTurnUp:rig.cornerCorrection.jawTurnDown));
    yy+=kx*ky*(u/h.faceRadius)*rig.cornerCorrection.featureSlant;
  }
  return [x+(cx+xx-x)*weight,y+(cy+yy-sampleY)*weight];
}
export function weights(x,y) {
  const b=t=>[.5*t*(t-1),1-t*t,.5*t*(t+1)], a=b(x),c=b(y);
  return c.flatMap(v=>a.map(u=>u*v));
}
export function evaluatePoint(x,y,kind,p,rig) {
  const w=weights(clamp(p.x/30,-1,1),clamp(p.y/30,-1,1));
  let px=0,py=0;
  rig.keyCoordinates.forEach(([kx,ky],i)=>{const q=boundaryPoint(x,y,kind,kx,ky,rig);px+=q[0]*w[i];py+=q[1]*w[i];});
  const a=clamp(p.z,-20,20)*Math.PI/180, [cx,cy]=rig.head.neckPivot,t=rollWeight(x,y,kind,rig);
  return [px+((px-cx)*Math.cos(a)-(py-cy)*Math.sin(a)+cx-px)*t,
          py+((px-cx)*Math.sin(a)+(py-cy)*Math.cos(a)+cy-py)*t];
}
