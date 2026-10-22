import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ComponentScene } from '../studio/component-physics-model.js';
import { componentDefaults } from '../studio/component-physics-schema.js';
import { resolveComponentBindings } from '../studio/component-physics-binding.js';
import { refineControlGeometry } from '../studio/component-physics-geometry.js';
import { applyTestInput } from '../studio/physics-test-input.js';
import { projectionField } from '../studio/projection-field.js';
import { simulate, traceWindow, validateFindings } from '../../.agents/skills/live2d-maker/physics/evidence.ts';
const component=(kind='strand',extra:any={})=>({id:kind,name:kind,kind,priority:'primary',enabled:true,layerRefs:[{uuid:kind,contentHash:'a'.repeat(64)}],sourcePartIds:[kind],supports:[{id:'root',at:[100,40]}],...componentDefaults(kind),authoring:{freeLength:300,transitionPixels:55,fixedRegions:[[[50,20],[150,20],[150,60],[50,60]]],contour:[[50,20],[150,20],[150,340],[50,340]],centerline:[[100,40],[100,80],[100,140],[100,200],[100,260],[100,320]],widths:[55,55,50,45,35,25],pivot:[100,40],subdivisions:2},...extra});
const config=(components:any[])=>({kind:'astra-component-physics',version:1,solver:'astra-component-physics-1',source:{canvas:{width:300,height:400}},components});

test('strand has pinned source pixels, continuous curvature, constrained impulse and decaying residual',()=>{
  const scene=new ComponentScene(config([component()])),b=scene.bodies.get('strand');
  b.impulse(100,310,400,0,160);let peak=0,bent=false;
  for(let step=0;step<960;step++){scene.step();assert(b.stats.valid);assert.equal(b.stats.root,0);assert(Math.hypot(...b.sample([100,55]).map((v:number,i:number)=>v-[100,55][i]))<1e-9,'pinned source pixels inherited motion across a mesh triangle');peak=Math.max(peak,b.stats.travel);if(step===12){const left=b.p[4]-b.pPose[4],tip=b.p.at(-2)-b.pPose.at(-2);bent=Math.abs(left-tip)>.5;}}
  assert(peak>10&&peak<b.maxDistance);assert(bent,'a rigid translation cannot represent a free hair strand');assert(b.stats.travel<.01);
  b.reset();assert.deepEqual(b.positions,b.rest);assert(b.velocity.every((v:number)=>v===0));
  for(let step=0;step<180;step++){if(step%8===0)b.impulse(100,260,1e9,-1e8,500);scene.step();assert(b.stats.valid);assert.equal(b.stats.root,0);assert(b.stats.travel<=b.maxDistance+1e-5);}
});
test('cloth fixed polygon and source holes survive an extreme force',()=>{
  const c=component('cloth');c.authoring.holes=[[[85,180],[85,210],[115,210],[115,180]]];
  const scene=new ComponentScene(config([c])),b=scene.bodies.get('cloth');b.impulse(80,310,1e6,-500,200);
  for(let n=0;n<240;n++){scene.step();assert.equal(b.stats.root,0);assert(b.stats.valid);assert(b.stats.minArea>=c.limits.minAreaRatio-1e-5);}
  assert(b.indices.length>12);
});
test('regular cloth controls accept a point load between controls and settle without moving pinned pixels',()=>{
  const c=component('cloth');c.authoring.controlGrid=[4,8];
  const scene=new ComponentScene(config([c])),b=scene.bodies.get('cloth');
  b.impulse(112,301,300,0,1);assert(b.velocity.some((v:number)=>Math.abs(v)>0),'a small pointer radius must not miss the control field');
  let peak=0;for(let n=0;n<960;n++){scene.step();assert(b.stats.valid);assert.equal(b.stats.root,0);peak=Math.max(peak,b.stats.travel);}
  assert(peak>.1);assert(b.stats.travel<.1);b.reset();assert.equal(b.stats.fallback,false);assert.deepEqual(b.positions,b.rest);
});
test('thin display triangles retain their own control face through refinement',()=>{
  const control={rest:[0,0,100,100,100.00001,100,100,0],indices:[0,1,2,0,3,2]},mesh=refineControlGeometry(control,3);
  for(let i=0;i<mesh.samples.length;i++){const[a,b,c,u,v,w]=mesh.samples[i];assert(Math.abs(u+v+w-1)<1e-12);for(let axis=0;axis<2;axis++)assert(Math.abs(mesh.rest[i*2+axis]-(control.rest[a*2+axis]*u+control.rest[b*2+axis]*v+control.rest[c*2+axis]*w))<1e-10);}
});
test('rigid pendant preserves pair distances rather than stretching into jelly',()=>{
  const scene=new ComponentScene(config([component('pendant')])),b=scene.bodies.get('pendant');b.impulse(100,320,900,400,500);
  for(let n=0;n<180;n++){scene.step();assert(b.stats.valid);for(let i=1;i<b.weights.length;i++)assert(Math.abs(Math.hypot(b.positions[i*2]-b.positions[0],b.positions[i*2+1]-b.positions[1])-Math.hypot(b.rest[i*2]-b.rest[0],b.rest[i*2+1]-b.rest[1]))<1e-8);}
});
test('moving support is measured against the same-time pose and child stays attached',()=>{
  const parent=component(),child=component('pendant',{supports:[{id:'tail',at:[100,320],componentId:'strand'}]});
  const scene=new ComponentScene(config([parent,child]));
  for(let n=0;n<180;n++){scene.inputs.set('root',{x:Math.sin(n/40)*8,angle:.02});scene.step();const b=scene.bodies.get('strand');assert.equal(b.stats.root,0);assert(b.stats.valid);assert(b.pose[0]!==b.rest[0]||n===0);}
  assert.throws(()=>new ComponentScene(config([component('strand',{supports:[{id:'cycle',at:[100,40],componentId:'strand'}]})])),/环/);
});
test('parent test pose moves artwork and attachments in the same space without reducing per-part input',()=>{
  const a=component(),c=component('cloth');c.authoring.controlGrid=[4,8];c.authoring.freeLength=180;
  const scene=new ComponentScene(config([a,c]));for(let n=1;n<=180;n++){applyTestInput(scene,'support-release',n);scene.step();for(const b of scene.bodies.values())for(let i=0;i<b.weights.length;i++)if(!b.weights[i]){const p=scene.sourcePoint([b.rest[i*2],b.rest[i*2+1]]);assert(Math.hypot(b.positions[i*2]-p[0],b.positions[i*2+1]-p[1])<1e-7);}}
  assert.equal(scene.sourcePose.x,15);assert(scene.sourcePose.x>=c.authoring.freeLength*.05);
  const caster={rest:new Float64Array([100,40,100,320]),positions:new Float64Array([...scene.sourcePoint([100,40]),...scene.sourcePoint([100,320])]),freeLength:280};
  const field=projectionField({x:20,y:200,width:220,height:150},caster,scene);field.update();for(let i=0;i<field.rest.length/2;i++){const p=scene.sourcePoint([field.rest[i*2],field.rest[i*2+1]]);assert(Math.hypot(field.positions[i*2]-p[0],field.positions[i*2+1]-p[1])<1e-8,'parent rotation must not be approximated as caster residual outside the caster');}
});
test('UUID bindings preserve multiple source layers through reorder and clipping islands without guessing ambiguity',()=>{
  const a=component(),b=component('cloth'),c=config([a,b]);
  let result=resolveComponentBindings(c,[{id:'new-order',uuid:'strand',contentHash:'a'.repeat(64)},{id:'other',uuid:'cloth',contentHash:'a'.repeat(64)}]);assert.equal(result.assignments.get('new-order'),'strand');
  result=resolveComponentBindings(c,[{id:'island',uuid:'shadow-group',contentHash:'different',sourceLayers:[{uuid:'strand',contentHash:'a'.repeat(64)}]},{id:'other',uuid:'cloth',contentHash:'a'.repeat(64)}]);assert.equal(result.assignments.get('island'),'strand');
  result=resolveComponentBindings(c,[{id:'island',uuid:'shadow-group',sourceLayers:[{uuid:'strand',contentHash:'a'.repeat(64)},{uuid:'cloth',contentHash:'a'.repeat(64)}]}]);assert.equal(result.assignments.size,0);assert.equal(result.issues.length,2);
  result=resolveComponentBindings(config([a]),[{id:'island',uuid:'shadow-group',composited:true,sourceLayers:[{uuid:'strand',contentHash:'a'.repeat(64)},{uuid:'unbound-static',contentHash:'b'.repeat(64)}]}]);assert.equal(result.assignments.size,0);assert.match(result.issues[0].reason,/未绑定/);
});
test('evidence records exact every-step states and never publishes numerical-only review',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'astra-component-test-'));try{
    const c=config([component()]);const manifest=await simulate(c,directory);assert.equal(manifest.runs.length,7);assert.equal(manifest.coverage.render,'pending');
    const rows=await traceWindow(directory,'tip-impulse',[59,60,61,960]);assert.equal(rows[1].time,.5);assert(rows[0].components.strand.stats.travel<1e-10);assert(rows[2].components.strand.stats.travel>0);assert(rows[2].components.strand.positions.length>0);
    assert.deepEqual((await traceWindow(directory,'tip-impulse',[61]))[0],rows[2]);
    await assert.rejects(validateFindings(c,directory,{configHash:manifest.configHash,evidenceVersion:manifest.version,components:[]}),/渲染/);
  }finally{await rm(directory,{recursive:true,force:true});}
});
