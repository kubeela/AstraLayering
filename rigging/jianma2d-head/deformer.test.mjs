import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {boundaryPoint,evaluatePoint,weights} from './deformer.mjs';
const rig=JSON.parse(fs.readFileSync(new URL('./rig.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('./layers.json',import.meta.url)));
const close=(a,b,epsilon=1e-8)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
test('original neutral positions, all nine boundary keys and partition of unity',()=>{
 for(const l of manifest.layers){const [x,y,w,h]=l.box;for(const [u,v] of [[.2,.2],[.5,.5],[.8,.8]]){
  const px=x+u*w,py=y+v*h;assert.deepEqual(boundaryPoint(px,py,l.kind,0,0,rig),[px,py]);
  const zero=evaluatePoint(px,py,l.kind,{x:0,y:0,z:0},rig);close(zero[0],px);close(zero[1],py);
  for(const [kx,ky] of rig.keyCoordinates){const a=boundaryPoint(px,py,l.kind,kx,ky,rig),b=evaluatePoint(px,py,l.kind,{x:kx*30,y:ky*30,z:0},rig);close(a[0],b[0]);close(a[1],b[1]);}
 }}
 for(let x=-1;x<=1;x+=.1)for(let y=-1;y<=1;y+=.1)close(weights(x,y).reduce((a,b)=>a+b,0),1);
});
test('face pigment, eyes, lashes and root-contact hair share their parent field',()=>{
 for(const [kx,ky] of rig.keyCoordinates)for(const [x,y] of [[470,241],[540,240],[449,282],[558,264]]){
  assert.deepEqual(boundaryPoint(x,y,'face',kx,ky,rig),boundaryPoint(x,y,'feature',kx,ky,rig));
  assert.deepEqual(boundaryPoint(x,y,'skull',kx,ky,rig),boundaryPoint(x,y,'hair',kx,ky,rig));
  assert.deepEqual(boundaryPoint(x,y,'hair',kx,ky,rig),boundaryPoint(x,y,'rear',kx,ky,rig));
 }
});
test('neck/long hair stay pinned, body cannot move, and returning to neutral never accumulates drift',()=>{
 for(const [kx,ky] of rig.keyCoordinates)for(const z of [-20,0,20])for(const [x,y,kind] of [[448,379,'neck'],[370,691,'hair'],[500,395,'body']]){
  const q=evaluatePoint(x,y,kind,{x:kx*30,y:ky*30,z},rig);close(q[0],x);close(q[1],y);
 }
 for(let n=0;n<1000;n++)evaluatePoint(477,242,'feature',{x:Math.sin(n)*30,y:Math.cos(n)*30,z:20},rig);
 assert.deepEqual(evaluatePoint(477,242,'feature',{x:0,y:0,z:0},rig),[477,242]);
});
test('crossing the center axes has no position or velocity seam',()=>{
 const eps=.0001;
 for(const axis of ['x','y'])for(const other of [-25,0,25]){
  const value=v=>evaluatePoint(478,241,'feature',{x:axis==='x'?v:other,y:axis==='y'?v:other,z:0},rig);
  const a=value(-eps),b=value(0),c=value(eps);
  for(let k=0;k<2;k++)close((b[k]-a[k])/eps,(c[k]-b[k])/eps,.0001);
 }
});
test('visible layer grids remain finite and oriented across extremes and intermediate combinations',()=>{
 let minimum=Infinity;
 for(const l of manifest.layers){const [x,y,w,h]=l.box;
  for(let px=x;px<x+w;px+=25)for(let py=y;py<y+h;py+=25)
   for(const ax of [-30,-15,0,15,30])for(const ay of [-30,-15,0,15,30])for(const z of [-20,0,20]){
    const p={x:ax,y:ay,z},a=evaluatePoint(px,py,l.kind,p,rig),b=evaluatePoint(px+.1,py,l.kind,p,rig),c=evaluatePoint(px,py+.1,l.kind,p,rig);
    const det=((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/.01;
    minimum=Math.min(minimum,det);assert.ok(Number.isFinite(det)&&det>.12,`${l.kind} fold at ${px},${py} / ${ax},${ay},${z}: ${det}`);
   }
 }
 console.log('Minimum sampled area ratio:',minimum.toFixed(4));
});
test('preview textures retain the source fingerprint and all referenced files exist',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('./source.json',import.meta.url)));
 assert.equal(source.sourceSha256,manifest.inputSha256);
 for(const l of manifest.layers)assert.ok(fs.statSync(new URL(l.file,import.meta.url)).size>0);
});
