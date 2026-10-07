import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {boundaryPoint,evaluatePoint,evaluateRoot,weights,classify} from './deformer.mjs';
const rig=JSON.parse(fs.readFileSync(new URL('./rig.json',import.meta.url)));
const close=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const pointClose=(a,b,e)=>a.forEach((v,i)=>close(v,b[i],e));
test('neutral and nine exact keys remain reproducible, with a partition of unity',()=>{
 for(const kind of ['body','skin','fringe','face','faceBare','collar',...Object.keys(rig.features),'earL','earR',...Object.keys(rig.surfaces)])for(const [x,y] of [[400,200],[444,265],[492,320],[355,600]]){
  pointClose(evaluatePoint(x,y,kind,{x:0,y:0,z:0},rig),[x,y]);
  for(const [kx,ky] of rig.keyCoordinates)pointClose(boundaryPoint(x,y,kind,kx,ky,rig),evaluatePoint(x,y,kind,{x:kx*30,y:ky*30,z:0},rig));
 }
 for(let x=-1;x<=1;x+=.1)for(let y=-1;y<=1;y+=.1)close(weights(x,y).reduce((a,b)=>a+b,0),1);
});
test('actual torso boundary is fixed and skin joins its fixed region continuously',()=>{
 for(const [kx,ky] of rig.keyCoordinates)for(const z of [-20,0,20]){
  const p={x:kx*30,y:ky*30,z};
  for(const x of [400,420,444,467,488]){
   pointClose(evaluatePoint(x,rig.neck.fixedY,'skin',p,rig),[x,rig.neck.fixedY]);
   const a=evaluatePoint(x,rig.neck.fixedY-.001,'skin',p,rig);
   pointClose(a,[x,rig.neck.fixedY-.001],.00001);
  }
 }
});
test('front/rear hair roots share the scalp parent at every corner',()=>{
 for(const kind of ['sideL','sideR','rearL','rearR'])for(const [kx,ky] of rig.keyCoordinates)for(const z of [-20,0,20]){
  const [x,y]=rig.surfaces[kind].anchor,p={x:kx*30,y:ky*30,z};
  pointClose(evaluatePoint(x,y,kind,p,rig),evaluatePoint(x,y,'fringe',p,rig));
 }

 const near=boundaryPoint(410,200,'face',1,0,rig),far=boundaryPoint(478,200,'face',1,0,rig);
 assert(near[0]-410>far[0]-478,'far side must compress relative to near side');
 assert.equal(classify('hair_crown',rig),'fringe');assert.equal(classify('forehead_jewel',rig),'forehead');
 assert.equal(classify('fx_hair_front_right_on_face',rig),'face');
 assert.throws(()=>classify('new_unbound_art',rig),/Unbound SVG group/);
});
test('rigid head ornaments preserve straight lines instead of bending with the scalp',()=>{
 for(const kind of ['crown','bun','halo','ornamentL','ornamentR','forehead'])for(const [kx,ky] of rig.keyCoordinates){
  const [x,y]=rig.surfaces[kind].anchor,p={x:kx*30,y:ky*30,z:17};
  const a=evaluatePoint(x-15,y-10,kind,p,rig),b=evaluatePoint(x+15,y+10,kind,p,rig),m=evaluatePoint(x,y,kind,p,rig);
  close((b[0]-a[0])*(m[1]-a[1])-(b[1]-a[1])*(m[0]-a[0]),0,1e-7);
 }
});
test('crossing either center axis is continuous for all authored parts',()=>{
 const eps=.0001;
 for(const kind of ['face','fringe','sideL','rearL','skin',...Object.keys(rig.features)])for(const axis of ['x','y'])for(const other of [-25,0,25]){
  const value=v=>evaluatePoint(420,kind==='skin'?295:215,kind,{x:axis==='x'?v:other,y:axis==='y'?v:other,z:0},rig);
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
test('exact dressed expression source and explicit layer ownership are recorded',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('./source.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('./layers.json',import.meta.url)));
 assert.equal(source.sourceSha256,'5bce80aa35a0331f34f1905d03886d0a4c2318ab623b8420a5e52561a5a5cae9');
 assert.equal(source.sourceSha256,manifest.inputSha256);assert.equal(manifest.sourcePreserved,true);
 assert.equal(source.path,'outputs/jianma_clothing/final/character.svg');
 assert(manifest.preparation.some(p=>p.operation==='defer-collar-occlusion-to-draw-order'));
 const bare=manifest.layers.find(l=>l.kind==='faceBare');assert(bare);
 assert(!bare.groups.some(id=>id.startsWith('fx_hair_')||id.startsWith('fx_forehead_')));
 for(const kind of ['rearL','rearR'])assert(manifest.layers.find(l=>l.kind===kind).box[3]>400);
 for(const l of manifest.layers){
  assert.ok(fs.statSync(new URL(l.file,import.meta.url)).size>0);
  for(const id of l.groups){const role=classify(id,rig);assert(role===l.kind||['face','faceBare'].includes(l.kind)&&['face','collar',...Object.keys(rig.features)].includes(role),id+' leaked into '+l.kind);}
 }
});

test('individual eyes and lips keep affine drawing proportions inside each keyform',()=>{
 for(const kind of Object.keys(rig.features))for(const [kx,ky] of rig.keyCoordinates){
  const [x,y]=rig.features[kind].anchor;
  const a=boundaryPoint(x-9,y-4,kind,kx,ky,rig),b=boundaryPoint(x+9,y+4,kind,kx,ky,rig),m=boundaryPoint(x,y,kind,kx,ky,rig);
  pointClose(m,a.map((v,i)=>(v+b[i])/2));
 }
 const near=boundaryPoint(429.5,198.5,'eyeR',1,0,rig)[0]-boundaryPoint(409.5,198.5,'eyeR',1,0,rig)[0];
 const far=boundaryPoint(478.5,198.5,'eyeL',1,0,rig)[0]-boundaryPoint(458.5,198.5,'eyeL',1,0,rig)[0];
 assert(near>far && near/20>.9 && far/20>.75);
});
test('collar opening follows the neck partially while its sewn edge stays fixed',()=>{
 for(const [kx,ky] of rig.keyCoordinates)for(const z of [-20,0,20]){
  const p={x:kx*30,y:ky*30,z};
  pointClose(evaluatePoint(410,rig.collar.fixedY,'collar',p,rig),[410,rig.collar.fixedY]);
 }
 const a=evaluatePoint(444,270,'collar',{x:30,y:0,z:0},rig);
 assert(a[0]>444 && a[0]<evaluatePoint(444,270,'skin',{x:30,y:0,z:0},rig)[0]);
});
