import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {boundaryPoint,evaluatePoint,evaluateRoot,weights,classify} from './deformer.mjs';
const rig=JSON.parse(fs.readFileSync(new URL('./rig.json',import.meta.url)));
const close=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const pointClose=(a,b,e)=>a.forEach((v,i)=>close(v,b[i],e));
test('neutral and nine exact keys remain reproducible, with a partition of unity',()=>{
 for(const kind of ['skin','skinShadow','face','feature','nose','earL','earR',...Object.keys(rig.surfaces)])for(const [x,y] of [[470,240],[506,300],[554,356],[430,600]]){
  pointClose(evaluatePoint(x,y,kind,{x:0,y:0,z:0},rig),[x,y]);
  for(const [kx,ky] of rig.keyCoordinates)pointClose(boundaryPoint(x,y,kind,kx,ky,rig),evaluatePoint(x,y,kind,{x:kx*30,y:ky*30,z:0},rig));
 }
 for(let x=-1;x<=1;x+=.1)for(let y=-1;y<=1;y+=.1)close(weights(x,y).reduce((a,b)=>a+b,0),1);
});
test('actual torso boundary is fixed and skin joins its fixed region continuously',()=>{
 for(const [kx,ky] of rig.keyCoordinates)for(const z of [-20,0,20]){
  const p={x:kx*30,y:ky*30,z};
  for(const x of [440,480,506,540,575]){
   pointClose(evaluatePoint(x,rig.neck.fixedY,'skin',p,rig),[x,rig.neck.fixedY]);
   const a=evaluatePoint(x,rig.neck.fixedY-.001,'skin',p,rig);
   pointClose(a,[x,rig.neck.fixedY-.001],.00001);
  }
 }
});
test('scalp roots stay attached while rear volume has genuine opposite parallax',()=>{
 for(const kind of ['sideL','sideR'])for(const [kx,ky] of rig.keyCoordinates){
  const [x,y]=rig.surfaces[kind].anchor;
  pointClose(boundaryPoint(x,y,kind,kx,ky,rig),boundaryPoint(x,y,'fringe',kx,ky,rig));
  pointClose(evaluatePoint(x,y,kind,{x:kx*30,y:ky*30,z:20},rig),evaluatePoint(x,y,'fringe',{x:kx*30,y:ky*30,z:20},rig));
 }
 assert(evaluateRoot('rear',{x:30,y:0,z:0},rig)[0]<506);
 assert(boundaryPoint(506,224,'face',1,0,rig)[0]>506);
 for(const side of ['L','R'])for(const [kx,ky] of rig.keyCoordinates){
  const [x,y]=rig.surfaces['ribbon'+side].anchor;
  pointClose(boundaryPoint(x,y,'ribbon'+side,kx,ky,rig),boundaryPoint(x,y,'ornament'+side,kx,ky,rig));
 }
 assert.equal(classify('head_left_earring_parts'),'earringL');
 assert.equal(classify('part_head_hair_cap'),'fringe');
 assert.equal(classify('part_head_hair_bun_shell_crown_shell_plate'),'crown');
});
test('rigid head ornaments preserve straight lines instead of bending with the scalp',()=>{
 for(const kind of ['crown','bun','halo','ornamentL','ornamentR','forehead'])for(const [kx,ky] of rig.keyCoordinates){
  const [x,y]=rig.surfaces[kind].anchor,p={x:kx*30,y:ky*30,z:17};
  const a=evaluatePoint(x-15,y-10,kind,p,rig),b=evaluatePoint(x+15,y+10,kind,p,rig),m=evaluatePoint(x,y,kind,p,rig);
  pointClose(m,a.map((v,i)=>(v+b[i])/2));
 }
});
test('face detail shares one surface; crossing either center axis is continuous',()=>{
 for(const [kx,ky] of rig.keyCoordinates)pointClose(boundaryPoint(478,241,'face',kx,ky,rig),boundaryPoint(478,241,'feature',kx,ky,rig));
 const eps=.0001;
 for(const kind of ['face','fringe','sideL','rear','skin'])for(const axis of ['x','y'])for(const other of [-25,0,25]){
  const value=v=>evaluatePoint(478,kind==='skin'?342:260,kind,{x:axis==='x'?v:other,y:axis==='y'?v:other,z:0},rig);
  const a=value(-eps),b=value(0),c=value(eps);
  for(let k=0;k<2;k++)close((b[k]-a[k])/eps,(c[k]-b[k])/eps,.0001);
 }
});
test('sampled visible and full hanging surfaces do not fold at combined parameter extremes',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('./layers.json',import.meta.url)));let minimum=Infinity;
 for(const l of manifest.layers){const [x,y,w,h]=l.box;
  for(let px=x;px<x+w;px+=30)for(let py=y;py<y+h;py+=30)
   for(const ax of [-30,0,30])for(const ay of [-30,0,30])for(const z of [-20,0,20]){
    const p={x:ax,y:ay,z},a=evaluatePoint(px,py,l.kind,p,rig),b=evaluatePoint(px+.1,py,l.kind,p,rig),c=evaluatePoint(px,py+.1,l.kind,p,rig);
    const det=((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/.01;
    minimum=Math.min(minimum,det);assert.ok(Number.isFinite(det)&&det>.10,`${l.kind} fold at ${px},${py} / ${ax},${ay},${z}: ${det}`);
   }
 }
 console.log('Minimum sampled area ratio:',minimum.toFixed(4));
});
test('source, supplemental art, repaired masks and full tress bounds are recorded',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('./source.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('./layers.json',import.meta.url)));
 assert.equal(source.sourceSha256,manifest.inputSha256);
 assert.equal(manifest.supplementalSha256,createHash('sha256').update(fs.readFileSync(new URL('./artwork-repairs.svg',import.meta.url))).digest('hex'));
 assert.equal(manifest.repairs.filter(r=>r.operation==='fill-earring-occlusion'&&r.maskCopiesUpdated>1).length,2);
 for(const kind of ['sideL','sideR'])assert(manifest.layers.filter(l=>l.kind===kind).some(l=>l.box[1]+l.box[3]>980));
 assert.equal(manifest.layers.filter(l=>l.kind==='skin').length,1);
 assert(manifest.repairs.some(r=>r.operation==='unify-neck-shoulder-contour'));
 for(const l of manifest.layers)assert.ok(fs.statSync(new URL(l.file,import.meta.url)).size>0);
});
