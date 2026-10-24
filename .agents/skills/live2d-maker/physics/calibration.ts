import {mkdir,readFile,realpath} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {setImmediate} from 'node:timers/promises';
import {ComponentScene} from '../shared/physics-core/component-physics-model.js';
import {validatePhysicsConfig} from '../shared/physics-core/component-physics-schema.js';
import {groupAssemblies} from '../shared/physics-core/assemblies.js';
import {applyTestInput,inputVersion} from '../shared/physics-evidence/physics-test-input.js';
import {MotionStepTracker,motionIssues} from '../shared/physics-evidence/physics-motion-review.js';
import {configHash,simulationHash} from './evidence.ts';
import {put,optional,hash} from './input.ts';
import {within} from '../shared/raster/run-store.ts';

export const calibrationVersion='astra-physics-calibration-1';
export const quickTests=['airflow','light-brush','support-release'] as const;
export const recipes=[
  {id:'hair-bend',kind:'strand',purpose:'游离发束：固定贴头根部，宽片克制截面旋转，开放中段和末端',response:{frequencyHz:1.3,dampingRatio:.25,inputGain:.65,windGain:.5,outputGain:1.7},authoring:{swing:{parallel:.8}}},
  {id:'soft-ribbon',kind:'strand',purpose:'窄软带／长绳：真实单向挂点，分段弯曲与后段余摆',response:{frequencyHz:1.15,dampingRatio:.3,inputGain:.65,windGain:.45,outputGain:1.4},authoring:{swing:{parallel:.15}}},
  {id:'soft-sheet',kind:'cloth',purpose:'宽自由衣料：固定缝边，规则控制格映射完整轮廓；材质与时间共同标定',response:{frequencyHz:1.1,dampingRatio:.48,inputGain:.65},material:{shearCompliance:.0005,compressionCompliance:.0005,bendCompliance:.0006,shapeCompliance:.00065}},
  {id:'rigid-ornament',kind:'pendant',purpose:'刚性悬饰：真实支点／串联下游保形；显示过渡与物理状态分开',response:{frequencyHz:1.2,dampingRatio:.3,inputGain:.65,outputFrequencyHz:.8}},
] as const;
const responseKeys=new Set(['frequencyHz','dampingRatio','inputGain','windGain','outputGain','outputFrequencyHz']);
const materialKeys=new Set(['stretchCompliance','shearCompliance','compressionCompliance','bendCompliance','shapeCompliance','areaCompliance']);
export type Candidate={id:string;parameters:Record<string,{response?:Record<string,number>;material?:Record<string,number>}>};
const componentHashes=(config:any,ids:string[])=>Object.fromEntries(config.components.filter((c:any)=>ids.includes(c.id)).map((c:any)=>[c.id,hash(JSON.stringify(c))]));
const inputScale=(config:any)=>Math.max(1,...config.components.filter((c:any)=>c.enabled).map((c:any)=>c.authoring.freeLength));
export function calibrationGeneration(config:any,ids:string[],solverHash:string){
  return hash(JSON.stringify({version:calibrationVersion,solverHash,inputVersion,inputScale:inputScale(config),source:config.source,components:config.components.filter((c:any)=>ids.includes(c.id)).map((c:any)=>{const {response,material,...geometry}=c;return geometry;}).sort((a:any,b:any)=>a.id.localeCompare(b.id))}));
}
function selectedMatches(config:any,tuning:any){
  return groupAssemblies(config).filter(a=>a.enabledComponentIds.length).every(a=>{
    const round=tuning.groups.find((g:any)=>g.assemblyId===a.id)?.rounds.at(-1),current=componentHashes(config,a.componentIds);
    return !!round?.selectedCandidate&&Object.entries(current).every(([id,value])=>round.selectedComponents?.[id]===value);
  });
}
export function parameterCandidate(config:any,componentIds:string[],candidate:Candidate){
  if(!candidate.id?.trim()||!/^[\w-]{1,64}$/.test(candidate.id)||!candidate.parameters||typeof candidate.parameters!=='object')throw Error('候选需要 id 与逐组件参数');
  const next=structuredClone(config),changes:any[]=[];
  for(const [id,groups]of Object.entries(candidate.parameters)){
    if(!componentIds.includes(id))throw Error('候选不能修改装配组之外的组件：'+id);
    const c=next.components.find((c:any)=>c.id===id);if(!c)throw Error('候选组件不存在：'+id);
    for(const [group,values]of Object.entries(groups)){
      if(!['response','material'].includes(group)||!values||typeof values!=='object')throw Error('标定只能调整 response／material，保持来源、几何和最大约束');
      for(const [key,to]of Object.entries(values)){
        if(!(group==='response'?responseKeys:materialKeys).has(key)||!Number.isFinite(to))throw Error('无效标定参数：'+group+'.'+key);
        if(group==='material'&&(Number(to)<0||Number(to)>.1))throw Error('材质柔顺性超出范围');
        const from=c[group][key]??null;c[group][key]=to;if(from!==to)changes.push({component:id,group,key,from,to});
      }
    }
  }
  validatePhysicsConfig(next);return {config:next,changes};
}
function defaults(config:any,ids:string[]):Candidate[]{
  const parameters=(mode:string)=>Object.fromEntries(ids.map(id=>{
    const c=config.components.find((c:any)=>c.id===id),r=c.response,m=c.material,p:any={};
    if(mode!=='material')p.response={frequencyHz:Math.max(.15,r.frequencyHz*.8),dampingRatio:Math.min(1.5,r.dampingRatio*1.25)};
    if(mode!=='response'&&c.kind==='cloth')p.material={shearCompliance:Math.min(.01,Math.max(.0004,m.shearCompliance*1.5)),compressionCompliance:Math.min(.01,Math.max(.0002,(m.compressionCompliance??.0005)*1.5)),bendCompliance:Math.min(.01,m.bendCompliance*1.5),shapeCompliance:Math.min(.01,m.shapeCompliance*1.25)};
    return [id,p];
  }));
  return [{id:'slower-response',parameters:parameters('response')},{id:'flexible-material',parameters:parameters('material')},{id:'soft-motion',parameters:parameters('both')}];
}
export async function measureCandidate(config:any,ids:string[],signal?:AbortSignal){
  const allLength=inputScale(config),filtered={...config,components:config.components.filter((c:any)=>ids.includes(c.id))},result:any={},issues:string[]=[];
  let score=0,eligible=true;
  for(const test of quickTests){
    const scene=new ComponentScene(filtered),metrics:any={},trackers=new Map(),previousDelta=new Map(),previous=new Map(),points=new Map();
    for(const [id,b]of scene.bodies){
      metrics[id]={peak:0,root:0,invalid:0,limited:0,fallback:0,maxStep:0,maxAcceleration:0,tailRms:0,curvature:0,samples:[]};trackers.set(id,new MotionStepTracker(config.source.canvas,b.positions.length));previous.set(id,new Float64Array(b.positions));previousDelta.set(id,new Float64Array(b.positions.length));
      const dist=(i:number)=>Math.hypot(b.rest[i*2]-b.component.supports[0].at[0],b.rest[i*2+1]-b.component.supports[0].at[1]);
      let tip=0;for(let i=1;i<b.weights.length;i++)if(b.weights[i]>b.weights[tip]||b.weights[i]===b.weights[tip]&&dist(i)>dist(tip))tip=i;
      let mid=tip;for(let i=0;i<b.weights.length;i++)if(b.weights[i]>0&&Math.abs(dist(i)-dist(tip)*.5)<Math.abs(dist(mid)-dist(tip)*.5))mid=i;
      points.set(id,{tip,mid});
    }
    const localLength=Math.max(1,...[...scene.bodies.values()].map(b=>b.freeLength));
    for(let step=0;step<=960;step++){
      signal?.throwIfAborted();if(step){applyTestInput(scene,test,step);if(test==='support-release')scene.sourcePose.x*=allLength/localLength;
        try{scene.step();}catch(e){eligible=false;issues.push(test+': '+(e as Error).message);for(const m of Object.values(metrics)as any[])m.invalid++;break;}}
      for(const [id,b]of scene.bodies){const m=metrics[id],s=b.stats,p=previous.get(id),delta=previousDelta.get(id),{tip,mid}=points.get(id),tx=b.positions[tip*2]-b.pose[tip*2],ty=b.positions[tip*2+1]-b.pose[tip*2+1],mx=b.positions[mid*2]-b.pose[mid*2],my=b.positions[mid*2+1]-b.pose[mid*2+1];
        m.peak=Math.max(m.peak,s.travel);m.root=Math.max(m.root,s.root);m.invalid+=+!s.valid;m.limited+=+s.limited;m.fallback+=+s.fallback;const tracker=trackers.get(id);tracker.update(b.positions,scene.sourcePose);m.maxStep=tracker.maxStep;m.maxWorldStep=tracker.maxWorldStep;m.curvature=Math.max(m.curvature,Math.hypot(tx-mx,ty-my));
        let acceleration=0;for(let i=0;i<b.positions.length;i++){const d=b.positions[i]-p[i];acceleration=Math.max(acceleration,Math.abs(d-delta[i]));delta[i]=d;}p.set(b.positions);if(step>64)m.maxAcceleration=Math.max(m.maxAcceleration,acceleration);
        if(step>=840)m.tailRms+=s.travel*s.travel/121;m.final=s.travel;
        if(step%6===0){let velocity=0;for(const v of b.velocity)velocity=Math.max(velocity,Math.abs(v));m.samples.push({step,time:step/120,tip:[tx,ty],mid:[mx,my],root:s.root,travel:s.travel,velocity,curvature:Math.hypot(tx-mx,ty-my)});}
      }
      if(step%120===0)await setImmediate();
    }
    for(const [id,b]of scene.bodies){const m=metrics[id];m.tailRms=Math.sqrt(m.tailRms);m.issues=motionIssues(test,b.component,m);issues.push(...m.issues.map((issue:string)=>test+'/'+id+': '+issue));if(m.invalid||m.root>1e-5)eligible=false;
      const L=Math.max(1,b.freeLength);score+=m.fallback*10+m.limited/961+m.maxAcceleration/L*100+m.maxStep/L*5+(test==='airflow'?0:m.tailRms/L*10)+m.issues.length*2;
    }
    result[test]=metrics;
  }
  return {metrics:result,score,eligible,issues,inputScale:allLength};
}
export async function calibrate(config:any,directory:string,assemblyId:string,reason:string,candidates?:Candidate[],signal?:AbortSignal){
  validatePhysicsConfig(config);if(!reason?.trim())throw Error('标定必须记录要解决的实际问题');
  const assemblies=groupAssemblies(config),group=assemblies.find(a=>a.id===assemblyId);if(!group?.enabledComponentIds.length)throw Error('装配组不存在或已关闭');
  const runtime=await simulationHash(),digest=configHash(config),tuning:any=await optional(join(directory,'tuning.json'))||{version:1,calibrationVersion,status:'draft',groups:[]};
  const supplied=candidates??defaults(config,group.enabledComponentIds);if(!Array.isArray(supplied)||supplied.length>3||new Set(supplied.map(c=>c.id)).size!==supplied.length||supplied.some(c=>c.id==='baseline'))throw Error('一次最多三个不同候选，baseline 由工具保留');
  let entry=tuning.groups.find((g:any)=>g.assemblyId===assemblyId);if(!entry){entry={assemblyId,componentIds:group.componentIds,rounds:[]};tuning.groups.push(entry);}
  const generation=calibrationGeneration(config,group.componentIds,runtime);
  if(entry.generation!==generation){if(entry.rounds.length)(entry.history||=[]).push({generation:entry.generation,rounds:entry.rounds});entry.rounds=[];entry.generation=generation;entry.componentIds=group.componentIds;}
  const baseComponents=componentHashes(config,group.componentIds),requestHash=hash(JSON.stringify({baseComponents,reason,candidates:supplied}));
  const existing=entry.rounds.findLast((r:any)=>r.requestHash===requestHash);if(existing)return {reused:true,round:existing};
  if(entry.rounds.length>=3)throw Error('该装配组已完成三轮标定；保留候选与失败原因，等待明确修正方案');
  const round:any={round:entry.rounds.length+1,reason,requestHash,generation,baseComponents,baseConfigHash:digest,solverHash:runtime,inputVersion,inputScale:inputScale(config),createdAt:new Date().toISOString(),candidates:[]};
  const folder=join(directory,'calibration',hash(assemblyId).slice(0,16),generation.slice(0,16),'round-'+round.round);await mkdir(folder,{recursive:true});
  const seen=new Set<string>();
  for(const candidate of [{id:'baseline',parameters:{}},...supplied]){
    signal?.throwIfAborted();const next=parameterCandidate(config,group.componentIds,candidate),nextHash=configHash(next.config);if(seen.has(nextHash))continue;seen.add(nextHash);
    const measured=await measureCandidate(next.config,group.componentIds,signal),path=join(folder,candidate.id+'.json');await put(path,next.config);
    round.candidates.push({id:candidate.id,changes:next.changes,configHash:nextHash,...measured,path:relative(directory,path)});
  }
  const best=round.candidates.filter((c:any)=>c.eligible).sort((a:any,b:any)=>a.score-b.score)[0];round.recommendedCandidate=best?.id??null;
  entry.rounds.push(round);tuning.configHash=digest;tuning.solverHash=runtime;tuning.status='draft';await put(join(directory,'assemblies.json'),{version:1,configHash:digest,groups:assemblies});await put(join(directory,'tuning.json'),tuning);
  return {reused:false,round};
}
export async function selectCandidate(config:any,directory:string,assemblyId:string,candidateId:string,reason:string){
  if(!reason?.trim())throw Error('选择候选需要说明依据');const tuning:any=await optional(join(directory,'tuning.json')),entry=tuning?.groups.find((g:any)=>g.assemblyId===assemblyId),round=entry?.rounds.at(-1),candidate=round?.candidates.find((c:any)=>c.id===candidateId);
  if(!candidate?.eligible)throw Error('候选不存在或安全检查失败');if(tuning.solverHash!==await simulationHash())throw Error('求解器改变，请重新标定');
  if(calibrationGeneration(config,entry.componentIds,tuning.solverHash)!==round.generation)throw Error('来源、几何、约束或输入尺度改变，请重新标定');
  const current=componentHashes(config,entry.componentIds);if(![round.baseComponents,round.selectedComponents].some(h=>h&&Object.entries(current).every(([id,value])=>h[id]===value)))throw Error('装配组草稿改变，不能直接应用旧候选');
  const path=await realpath(join(directory,candidate.path));if(!within(await realpath(directory),path))throw Error('候选路径位于标定目录之外');
  const selected=JSON.parse(await readFile(path,'utf8'));validatePhysicsConfig(selected);if(configHash(selected)!==candidate.configHash)throw Error('候选文件指纹不符');
  // Reapply only the measured assembly parameters so independent assemblies
  // selected after this run never get rolled back to a candidate snapshot.
  const next=structuredClone(config);for(const c of next.components.filter((c:any)=>entry.componentIds.includes(c.id))){const measured=selected.components.find((v:any)=>v.id===c.id);c.response=structuredClone(measured.response);c.material=structuredClone(measured.material);}validatePhysicsConfig(next);
  round.selectedCandidate=candidate.id;round.selectionReason=reason;round.selectedConfigHash=configHash(next);round.selectedComponents=Object.fromEntries(next.components.filter((c:any)=>entry.componentIds.includes(c.id)).map((c:any)=>[c.id,hash(JSON.stringify(c))]));
  tuning.configHash=configHash(next);tuning.status=selectedMatches(next,tuning)?'calibrated':'draft';await put(join(directory,'physics.draft.json'),next);await put(join(directory,'tuning.json'),tuning);await put(join(directory,'assemblies.json'),{version:1,configHash:configHash(next),groups:groupAssemblies(next)});return next;
}
export async function validateCalibration(config:any,directory:string){
  const tuning:any=await optional(join(directory,'tuning.json'));if(tuning?.calibrationVersion!==calibrationVersion||tuning.solverHash!==await simulationHash())throw Error('制作需使用当前求解器完成装配组标定');
  for(const assembly of groupAssemblies(config).filter(a=>a.enabledComponentIds.length)){
    const round=tuning.groups.find((g:any)=>g.assemblyId===assembly.id)?.rounds.at(-1);if(!round?.selectedCandidate)throw Error('装配组尚未选择标定候选：'+assembly.id);
    if(calibrationGeneration(config,assembly.componentIds,tuning.solverHash)!==round.generation)throw Error('来源、几何、约束或输入尺度改变：'+assembly.id);
    for(const id of assembly.componentIds){const c=config.components.find((c:any)=>c.id===id);if(round.selectedComponents?.[id]!==hash(JSON.stringify(c)))throw Error('标定后绑定或参数改变：'+id);}
  }
  return tuning;
}
