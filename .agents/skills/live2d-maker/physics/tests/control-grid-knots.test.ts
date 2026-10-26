import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {componentDefaults,validatePhysicsConfig} from '../../shared/physics-core/component-physics-schema.js';
import {gridControlGeometry} from '../../shared/physics-core/component-physics-geometry.js';
import {ComponentScene} from '../../shared/physics-core/component-physics-model.js';
import {measureCandidate} from '../calibration.ts';

const rig=()=>({kind:'astra-component-physics',version:1,solver:'astra-component-physics-1',source:{canvas:{width:300,height:200}},components:[{
  id:'cuff',name:'cuff',kind:'cloth',priority:'primary',enabled:true,sourcePartIds:['cuff'],layerRefs:[{uuid:'cuff',contentHash:'a'.repeat(64)}],supports:[{id:'root',at:[61.8,21.3]}],...componentDefaults('cloth'),
  authoring:{freeLength:80,transitionPixels:18,fixedRegions:[[[0,0],[120,0],[120,40],[0,40]],[[0,104],[120,104],[120,122],[0,122]]],contour:[[0,0],[120,0],[120,122],[0,122]],controlGrid:[4,6],controlGridKnots:{x:[0,30,60,90,120],y:[0,20,40,60,80,100,122]},subdivisions:0},
}]});

test('明确坐标在缝边与自由面布点，支撑不会额外插入贴边细行',()=>{
  const config=rig();validatePhysicsConfig(config);
  const c=config.components[0],g=gridControlGeometry(c.authoring,c.supports),points=Array.from({length:g.rest.length/2},(_,i)=>g.rest.slice(i*2,i*2+2));
  assert.equal(points.length,35);assert(points.some(p=>p[0]===90&&p[1]===80));
  assert.deepEqual([...new Set(points.map(p=>p[1]))],c.authoring.controlGridKnots.y);
  assert(!points.some(p=>p[0]===61.8||p[1]===21.3));
  for(const point of [[52.9,71],[120,122],[0,0]]){
    const s=g.sample(point),actual=[0,1].map(k=>s.slice(0,3).reduce((v,id,n)=>v+g.rest[id*2+k]*s[n+3],0));
    assert(Math.hypot(actual[0]-point[0],actual[1]-point[1])<1e-9);
  }
  const legacy=structuredClone(c.authoring) as any;delete legacy.controlGridKnots;
  const old=gridControlGeometry(legacy,c.supports);assert(old.rest.some(v=>v===61.8));assert(old.rest.some(v=>Math.abs(v-122*2/6)<1e-9));
});

test('明确坐标仍按源固定区跟随父姿态，显示网格保持合法',()=>{
  const scene=new ComponentScene(rig()),body=scene.bodies.get('cuff')!;
  for(let step=0;step<120;step++){
    scene.sourcePose={x:step*.02,y:0,angle:Math.sin(step/120)*.005};scene.step();
    assert(body.stats.valid);assert(body.stats.root<1e-7);
    for(let i=0;i<body.weights.length;i++)if(body.weights[i]===0){assert.equal(body.positions[i*2],body.pose[i*2]);assert.equal(body.positions[i*2+1],body.pose[i*2+1]);}
  }
});

test('明确坐标拒绝乱序、错误点数和未覆盖原轮廓的网格',()=>{
  for(const x of [[0,30,30,90,120],[0,30,90,120],[1,30,60,90,120]]){
    const c=rig();c.components[0].authoring.controlGridKnots.x=x;
    assert.throws(()=>validatePhysicsConfig(c),/控制格/);
  }
});

test('标定同样拒收连续回退，不能仅用八秒总次数放行',async()=>{
  const config=JSON.parse(await readFile(new URL('./fixtures/cuff-fallback-config.json',import.meta.url),'utf8'));
  const result=await measureCandidate(config,['cuff']),m=result.metrics['support-release'].cuff;
  assert(m.fallback>0&&m.fallback/960<.05);assert(m.maxFallbackStreak>=3);
  assert(m.issues.includes('continuous-retreat'));assert.equal(result.eligible,false);
});
