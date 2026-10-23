import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createGzip, createGunzip } from 'node:zlib';
import { createReadStream, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createInterface } from 'node:readline';
import { join, dirname, resolve } from 'node:path';
import { ComponentScene } from '../../../../web/studio/component-physics-model.js';
import { applyTestInput, testNames, inputVersion } from '../../../../web/studio/physics-test-input.js';
import { reviewCriteria } from '../../../../web/studio/component-physics-schema.js';
import { hash, put, json } from './input.ts';
import { motionIssues, motionReviewVersion, motionStepBasis, MotionStepTracker } from '../../../../web/studio/physics-motion-review.js';
export const evidenceVersion='astra-physics-evidence-2';
export async function simulationHash(){return hash((await Promise.all([
  // Measurement code is part of the evidence contract, just like the solver.
  readFile(new URL(import.meta.url)),
  ...['component-physics-model.js','component-physics-geometry.js','component-physics-schema.js','component-physics-worker.js','component-physics-runner.js','physics-test-input.js','physics-airflow.js','physics-motion-review.js','vendor/psd2live/xpbd.js','vendor/psd2live/pendulum.js','vendor/inochi2d/pendulum.js'].map(n=>readFile(new URL('../../../../web/studio/'+n,import.meta.url)))
])).map(hash).join(':'));}
export const configHash=(config:any)=>{const {review,...body}=config;return hash(JSON.stringify(body));};
export async function simulate(config:any, output:string,signal?:AbortSignal) {
  const digest=configHash(config),runtimeHash=await simulationHash(),runs:any[]=[];
  const prior=await (await import('./input.ts')).optional(join(output,'manifest.json'));
  if(prior?.configHash===digest&&prior.version===evidenceVersion&&prior.simulationHash===runtimeHash)return prior;
  if(prior){const backups=join(dirname(output),'backups');await mkdir(backups,{recursive:true});await rename(output,join(backups,'evidence-'+randomUUID()));}
  await mkdir(output,{recursive:true});
  await (await import('node:fs/promises')).rm(join(output,'failure.json'),{force:true});
  for(const test of testNames) {
    const scene=new ComponentScene(config),directory=join(output,test);await mkdir(directory,{recursive:true});
    const frames:number[]=[0],events:any[]=[],previousStats=new Map(),curvePoints=new Map<string,number[][]>(),metrics:any={invalidSteps:0,fallbackSteps:0,limitedSteps:0,maxRoot:0,maxTravel:0,minArea:1,notSettled:[],simulationMs:0};
    const motionMetrics:any={};const stepTrackers=new Map<string,InstanceType<typeof MotionStepTracker>>();
    const peaks=new Map<string,{step:number;travel:number}>();const signs=new Map<string,number>();
    const started=performance.now();
    async function* records(){for(let step=0;step<=960;step++) {
      signal?.throwIfAborted();
      if(step) {applyTestInput(scene,test,step);try{scene.step();}catch(e){await put(join(output,'failure.json'),{test,step,time:step/120,reason:(e as Error).message,configHash:digest,simulationHash:runtimeHash,components:Object.fromEntries([...scene.bodies].map(([id,b])=>[id,{stats:b.stats,controls:b.inspect(true),positions:Array.from(b.positions),pose:Array.from(b.pose),velocity:Array.from(b.velocity)}]))});throw e;}}
      const components:any={};
      for(const [id,b]of scene.bodies) {
        const m=motionMetrics[id]||=( {peak:0,root:0,fallback:0,limited:0,maxStep:0,maxWorldStep:0,final:0,invalid:0} );
        m.peak=Math.max(m.peak,b.stats.travel);m.root=Math.max(m.root,b.stats.root);m.fallback+=+b.stats.fallback;m.limited+=+b.stats.limited;m.invalid+=+!b.stats.valid;m.final=b.stats.travel;
        let tracker=stepTrackers.get(id);if(!tracker){tracker=new MotionStepTracker(config.source.canvas,b.positions.length);stepTrackers.set(id,tracker);}
        tracker.update(b.positions,scene.sourcePose);m.maxStep=tracker.maxStep;m.maxWorldStep=tracker.maxWorldStep;
        const stats=b.stats,residual=Array.from(b.positions,(v:any,i:number)=>v-b.pose[i]);
        let tip=0;for(let i=1;i<b.weights.length;i++)if(b.weights[i]>b.weights[tip]||b.weights[i]===b.weights[tip]&&Math.hypot(b.rest[i*2]-b.component.supports[0].at[0],b.rest[i*2+1]-b.component.supports[0].at[1])>Math.hypot(b.rest[tip*2]-b.component.supports[0].at[0],b.rest[tip*2+1]-b.component.supports[0].at[1]))tip=i;
        const sign=Math.sign(residual[tip*2]);if(sign&&signs.get(id)&&signs.get(id)!==sign&&stats.travel>.1)events.push({type:'reversal',component:id,step});if(sign)signs.set(id,sign);
        if(stats.limited&&!previousStats.get(id)?.limited)events.push({type:'limit',component:id,step});
        if(stats.fallback&&!previousStats.get(id)?.fallback)events.push({type:'fallback',component:id,step});previousStats.set(id,stats);
        if(!peaks.has(id)||stats.travel>peaks.get(id)!.travel)peaks.set(id,{step,travel:stats.travel});
        metrics.invalidSteps+=!stats.valid;metrics.fallbackSteps+=!!stats.fallback;metrics.limitedSteps+=!!stats.limited;metrics.maxRoot=Math.max(metrics.maxRoot,stats.root);metrics.maxTravel=Math.max(metrics.maxTravel,stats.travel);metrics.minArea=Math.min(metrics.minArea,stats.minArea);
        components[id]={stats,pose:Array.from(b.pose),positions:Array.from(b.positions),velocity:Array.from(b.velocity),residual,supports:b.component.supports.map((s:any)=>scene.support(s)),tip:residual.slice(tip*2,tip*2+2)};
        if(step%4===0){if(!curvePoints.has(id))curvePoints.set(id,[]);curvePoints.get(id)!.push([step/120,residual[tip*2]]);}
        if(step===960&&stats.travel>.1)metrics.notSettled.push(id);
      }
      yield JSON.stringify({step,time:step/120,sourcePose:scene.sourcePose,components})+'\n';if(step&&step%12===0)frames.push(step);
    }}
    await pipeline(Readable.from(records()),createGzip({level:1}),createWriteStream(join(directory,'trace.jsonl.gz')),{signal});
    metrics.simulationMs=performance.now()-started;
    metrics.motionReview={version:motionReviewVersion,stepBasis:motionStepBasis,components:Object.fromEntries([...scene.bodies].map(([id,b])=>[id,{...motionMetrics[id],issues:motionIssues(test,b.component,motionMetrics[id])}]))};
    for(const[id,peak]of peaks)if(peak.travel>.1)events.push({type:'peak',component:id,...peak});
    // The first sequence is uniform. Dense windows supplement it; they never
    // replace uninteresting frames or interpolate unrecorded peak positions.
    const dense=new Set(frames);for(const event of events)for(let step=Math.max(0,event.step-12);step<=Math.min(960,event.step+12);step+=event.type==='limit'?1:2)dense.add(step);
    const frameSteps=[...dense].sort((a,b)=>a-b);
    await put(join(directory,'metrics.json'),metrics);await put(join(directory,'events.json'),events);
    const curves=[...scene.bodies.keys()].map(id=>({id,points:curvePoints.get(id)!}));
    const max=Math.max(1,...curves.flatMap(c=>c.points.map(p=>Math.abs(p[1]))));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="320" viewBox="0 0 960 320"><rect width="960" height="320" fill="#131c28"/><path d="M30 160H940" stroke="#64748b"/>${curves.map((c,i)=>`<polyline fill="none" stroke="hsl(${i*67%360} 80% 70%)" stroke-width="2" points="${c.points.map(p=>`${30+p[0]/8*900},${160-p[1]/max*130}`).join(' ')}"/>`).join('')}</svg>`;
    await writeFile(join(directory,'curves.svg'),svg);
    runs.push({test,frameSteps,metrics,events,trace:test+'/trace.jsonl.gz',plot:test+'/curves.svg'});
  }
  const manifest={version:evidenceVersion,solver:config.solver,inputVersion,configHash:digest,simulationHash:runtimeHash,stepHz:120,steps:960,baselineRenderHz:10,diagnosticRenderHz:60,createdAt:new Date().toISOString(),runs,coverage:{numerical:'all-steps-all-meshes',render:'pending',aiVisual:'unreviewed',human:'unreviewed'}};
  await put(join(output,'manifest.json'),manifest);return manifest;
}
export async function validateFindings(config:any,evidence:string,findings:any,expectedSource?:string) {
  const manifest=await json(join(evidence,'manifest.json'));
  if(manifest.simulationHash!==await simulationHash())throw Error('求解器实现已改变，需要重新生成证据');
  if(manifest.version!==evidenceVersion||manifest.configHash!==configHash(config)||findings.configHash!==manifest.configHash||findings.evidenceVersion!==evidenceVersion)throw Error('复核引用了另一版配置或证据');
  if(manifest.runs.some((r:any)=>r.metrics.invalidSteps||r.metrics.maxRoot>1e-5))throw Error('数值复核失败');
  const failed=manifest.runs.flatMap((r:any)=>Object.entries(r.metrics.motionReview?.components||{}).filter(([,v]:any)=>v.issues.length).map(([id,v]:any)=>r.test+'/'+id+': '+v.issues.join(', ')));
  if(failed.length)throw Error('运动响应复核失败：'+failed.join('; '));
  if(manifest.coverage.render!=='completed')throw Error('渲染复核未完成');
  if(!manifest.renderDirectory||manifest.renderHash!==await(await import('./render.ts')).renderFingerprint(resolve(evidence,manifest.renderDirectory)))throw Error('渲染器、贴图或裁切关系已变化，需要重新复核');
  if(expectedSource&&resolve(evidence,manifest.renderDirectory)!==resolve(expectedSource))throw Error('可用投影输入已变化，需要重新复核');
  if(!Array.isArray(findings.components))throw Error('缺少逐组件复核');
  const viewed=await json(join(evidence,'viewed.json'));
  for(const c of config.components.filter((c:any)=>c.enabled)) {
    const row=findings.components.find((r:any)=>r.id===c.id);if(!row)throw Error('未复核组件：'+c.name);
    for(const run of manifest.runs) {
      const samples=[0,60,96,180,360,960];
      for(const step of samples)if(!viewed.some((v:any)=>v.configHash===manifest.configHash&&v.renderHash===manifest.renderHash&&v.test===run.test&&v.step===step&&(v.component===c.id||!v.component)&&v.mode==='color'))throw Error(c.name+' 缺少 '+run.test+' / '+step+' 步的实际图像复核');
      if(!viewed.some((v:any)=>v.configHash===manifest.configHash&&v.renderHash===manifest.renderHash&&v.test===run.test&&(v.component===c.id||!v.component)&&v.mode==='lit'&&v.step>60))throw Error(c.name+' 缺少 '+run.test+' 的运动光照复核');
      const event=run.events.find((e:any)=>e.component===c.id&&e.type==='fallback')||run.events.find((e:any)=>e.component===c.id&&e.type==='peak');
      if(event){const stride=event.type==='fallback'?1:2;for(const step of [Math.max(0,event.step-stride),event.step,Math.min(960,event.step+stride)])if(!viewed.some((v:any)=>v.configHash===manifest.configHash&&v.renderHash===manifest.renderHash&&v.test===run.test&&v.step===step&&(v.component===c.id||!v.component)&&v.mode==='color'))throw Error(c.name+' 缺少 '+run.test+' 的 '+event.type+' 连续帧：'+step);}
    }
    for(const mode of ['normal','depth'])if(!viewed.some((v:any)=>v.configHash===manifest.configHash&&v.renderHash===manifest.renderHash&&(v.component===c.id||!v.component)&&v.mode===mode&&v.step>60))throw Error(c.name+' 缺少运动 '+mode+' 贴图复核');
    for(const criterion of reviewCriteria) {
      const f=row.criteria?.[criterion];if(f?.verdict!=='supported'||!f.reason?.trim()||!Array.isArray(f.images)||new Set(f.images).size<2)throw Error(c.name+' 的 '+criterion+' 需要证据或修复');
      const cited=f.images.map((ref:string)=>viewed.find((v:any)=>v.path===ref&&v.configHash===manifest.configHash&&v.renderHash===manifest.renderHash&&(v.component===c.id||!v.component)));
      if(cited.some((v:any)=>!v))throw Error('未查看当前组件或整体的证据：'+c.name+' / '+criterion);
      if(['attachment','shape'].includes(criterion)&&!cited.some((v:any)=>v.component===c.id))throw Error(c.name+' 的 '+criterion+' 缺少原尺寸组件局部');
      if(['response','shape','limits'].includes(criterion)&&new Set(cited.map((v:any)=>v.step)).size<2)throw Error(c.name+' 的 '+criterion+' 缺少不同时间的画面');
    }
  }
  return manifest;
}

export async function traceWindow(evidence:string,test:string,steps:number[],maxSteps=60) {
  if(!testNames.includes(test)||!Array.isArray(steps)||steps.some(n=>!Number.isInteger(n)||n<0||n>960)||steps.length>maxSteps)throw Error('无效时间窗');
  if(!steps.length)return [];const wanted=new Set(steps),result=new Map(),input=createReadStream(join(evidence,test,'trace.jsonl.gz')),gzip=createGunzip();input.pipe(gzip);
  const rows=createInterface({input:gzip,crlfDelay:Infinity});let step=0;
  try{for await(const line of rows){if(wanted.has(step))result.set(step,JSON.parse(line));if(++step>Math.max(...steps))break;}if(result.size!==wanted.size)throw Error('轨迹不完整');return steps.map(n=>result.get(n));}
  finally{rows.close();input.destroy();gzip.destroy();}
}
