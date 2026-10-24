import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MotionStepTracker,motionIssues} from '../../shared/physics-evidence/physics-motion-review.js';
import {recoveryState} from '../../shared/physics-evidence/settling.js';
import {simulate,traceWindow} from '../../shared/physics-evidence/store.ts';
import {componentDefaults} from '../../shared/physics-core/component-physics-schema.js';
import {measureCandidate} from '../calibration.ts';
const component=()=>({id:'drop',name:'drop',kind:'pendant',priority:'primary',enabled:true,layerRefs:[{uuid:'drop',contentHash:'a'.repeat(64)}],sourcePartIds:['drop'],supports:[{id:'root',at:[50,20]}],...componentDefaults('pendant'),authoring:{freeLength:100,pivot:[50,20],contour:[[45,20],[55,20],[55,120],[45,120]]}});
const config=(c:any)=>({kind:'astra-component-physics',version:1,solver:'astra-component-physics-1',source:{canvas:{width:200,height:200}},components:[c]});
test('连续运动保留可见父传动，速度大与真实跳变分开判断',()=>{
 const c=component(),tracker=new MotionStepTracker({width:200,height:200},2,c.authoring.freeLength*c.limits.maxTravel),pose={x:0,y:0,angle:0};
 for(let step=0;step<=10;step++)tracker.update(new Float64Array([50+step*step*.15,20]),pose);
 const metric={invalid:0,root:0,fallback:0,limited:0,peak:0,visiblePeak:tracker.visiblePeak,final:0,maxStep:tracker.maxStep,maxAcceleration:tracker.maxAcceleration,discontinuityRatio:tracker.discontinuityRatio};
 assert.equal(tracker.visiblePeak,15);assert.deepEqual(motionIssues('airflow',c,metric),[]);
 tracker.update(new Float64Array([95,20]),pose);
 assert(motionIssues('airflow',c,{...metric,maxStep:tracker.maxStep,maxAcceleration:tracker.maxAcceleration,discontinuityRatio:tracker.discontinuityRatio}).includes('discontinuous-motion'));
});
test('回落不能由过零、输出限幅或仍在运动的父件伪造',()=>{
 const b:any={kind:'pendant',freeLength:100,motion:{speed:1},stats:{valid:true,fallback:false,travel:0}};
 assert.equal(recoveryState(b,10).quiet,false,'at origin with energy is not at rest');
 b.motion.speed=0;assert.equal(recoveryState(b,10,5).quiet,false,'parent displacement must also recover');
 assert.equal(recoveryState(b,10,0).quiet,true);
 const c=component(),metric={invalid:0,root:0,fallback:0,limited:0,peak:10,final:0,maxStep:0,recovery:{passed:false}};
 assert(motionIssues('airflow',c,metric).includes('unsettled'));
});
test('慢速余摆由真实尾段验证，原施力片段计数不被尾段稀释',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'astra-settling-'));
 try{
  const c=component();Object.assign(c.response,{frequencyHz:.4,dampingRatio:.1,windGain:.25});c.limits.maxTravel=.2;c.limits.maxAngle=20;
  const cfg=config(c),measurement=await measureCandidate(cfg,['drop']),manifest=await simulate(cfg,directory),run=manifest.runs.find((r:any)=>r.test==='airflow');
  assert(run.durationSteps>960);const m=run.metrics.motionReview.components.drop;
  assert.equal(m.recovery.passed,true);assert(m.recovery.quietSteps>=60);assert.equal(m.recovery.startStep,960);
  assert.equal(m.limited,measurement.metrics.airflow.drop.limited);assert.equal(m.fallback,measurement.metrics.airflow.drop.fallback);
  assert.equal(measurement.metrics.airflow.drop.samples.length,161);
  const tail=await traceWindow(directory,'airflow',[960,run.durationSteps-1,run.durationSteps]);
  assert.equal(tail.at(-1).step,run.durationSteps);assert(tail.at(-1).components.drop.stats.travel<tail[0].components.drop.stats.travel);
  await assert.rejects(traceWindow(directory,'airflow',[run.durationSteps+1]),/时间窗/);
  c.response.dampingRatio=.03;
  const oscillating=await measureCandidate(config(c),['drop']);
  assert.equal(oscillating.metrics.airflow.drop.recovery.passed,false);
  assert(oscillating.metrics.airflow.drop.issues.includes('unsettled'));
 }finally{await rm(directory,{recursive:true,force:true});}
});
