import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import sharp from 'sharp';
import type { FunctionTool } from '../shared/codex/function-tools.ts';
import { textResult } from '../shared/codex/function-tools.ts';
import { validatePhysicsConfig, componentDefaults } from '../../../../web/studio/component-physics-schema.js';
import { ComponentScene } from '../../../../web/studio/component-physics-model.js';
import { meshCoverage } from '../../../../web/studio/component-physics-geometry.js';
import { simulate, validateFindings, configHash, traceWindow } from './evidence.ts';
import { renderFrames } from './render.ts';
import { json, optional, put, hash, type PhysicsInput } from './input.ts';
import { validateMotionScope, coverageReport } from './coverage.ts';
import {imageSheet} from './images.ts';

function summarizeEvidence(manifest:any,test?:string){
  return {...manifest,runs:manifest.runs.filter((r:any)=>!test||r.test===test).map((r:any)=>({...r,frameSteps:undefined,events:undefined,frameCount:r.frameSteps.length,eventCount:r.events.length,
    ...(test?{windows:[...new Set(r.events.map((e:any)=>e.component))].map(id=>{const fallback=r.events.find((e:any)=>e.component===id&&e.type==='fallback'),peak=r.events.find((e:any)=>e.component===id&&e.type==='peak');return {component:id,firstFallback:fallback?.step,peak:peak?.step,peakTravel:peak?.travel};})}:{}),
  }))};
}

export async function validateBindings(config:any,catalog:any,source?:string) {
  validatePhysicsConfig(config);const scene=new ComponentScene(config);
  if(config.source.canvas.width!==catalog.canvas.width||config.source.canvas.height!==catalog.canvas.height)throw Error('物理画布与原稿不一致');
  for(const c of config.components) for(const ref of c.layerRefs) {
    const layer=catalog.layers.find((l:any)=>l.uuid===ref.uuid);
    if(!layer||layer.contentHash!==ref.contentHash)throw Error('组件源 UUID 或像素指纹不一致：'+c.name);
  }
  if(source)for(const c of config.components.filter((c:any)=>c.enabled))for(const ref of c.layerRefs){const l=catalog.layers.find((l:any)=>l.uuid===ref.uuid),b=scene.bodies.get(c.id),raw=await sharp(join(source,l.original)).ensureAlpha().raw().toBuffer(),coverage=meshCoverage(b.rest,b.indices,l.bounds,raw);if(coverage.missing>2)throw Error(c.name+' 网格裁掉 '+coverage.missing+' 个原像素；扩大完整轮廓或横截面，例 '+JSON.stringify(coverage.examples));}
  return scene;
}
export async function validatePlan(plan:any,catalog:any,profile='all') {
  if(!Array.isArray(plan.parts)||!Array.isArray(plan.components))throw Error('物理分析结构无效');
  validateMotionScope(plan,profile);
  const sourceIds=new Set(catalog.parts.map((p:any)=>p.id)),ids=new Set();
  if(plan.parts.length!==sourceIds.size||plan.parts.some((p:any)=>!sourceIds.has(p.id)))throw Error('分析需与实际源 part 一一对应');
  for(const part of catalog.parts) {
    const decisions=plan.parts.filter((p:any)=>p.id===part.id);
    if(decisions.length!==1||!['bind','defer','excluded'].includes(decisions[0].decision)||!decisions[0].reason?.trim())throw Error('每个源 part 必须有唯一判断与原因：'+part.id);
    if(decisions[0].decision==='bind'&&!plan.components.some((c:any)=>c.sourcePartIds?.includes(part.id)))throw Error('选择制作的 part 未归属组件：'+part.id);
  }
  for(const c of plan.components) {
    if(!c.id||!c.name||!['strand','cloth','pendant'].includes(c.kind)||!['primary','secondary'].includes(c.priority)||!c.connection?.trim()||!c.layerUuids?.length)throw Error('组件必须说明形态与实际连接');
    if(ids.has(c.id))throw Error('组件 ID 重复');ids.add(c.id);
    if(!c.sourcePartIds?.length||c.sourcePartIds.some((id:string)=>plan.parts.find((p:any)=>p.id===id)?.decision!=='bind'))throw Error('组件只能关联已选择的原 part');
    for(const id of c.layerUuids)if(!catalog.layers.some((l:any)=>l.uuid===id))throw Error('组件源层不存在：'+id);
    const expected=catalog.layers.filter((l:any)=>c.sourcePartIds.includes(l.partPath));
    if(expected.length&&(expected.length!==c.layerUuids.length||expected.some((l:any)=>!c.layerUuids.includes(l.uuid))))throw Error('选定 part 与实际图层来源不一致：'+c.name);
  }
  for(const p of plan.parts.filter((p:any)=>p.decision==='bind'))if(plan.components.filter((c:any)=>c.sourcePartIds.includes(p.id)).length!==1)throw Error('每个选定 part 必须有唯一组件场：'+p.id);
}
export async function validateProfile(config:any,plan:any,profile:string){
  validateMotionScope(plan,profile);
  for(const c of plan.components.filter((c:any)=>profile==='all'||c.priority==='primary')){
    const binding=config.components.find((v:any)=>v.id===c.id&&v.enabled);
    if(!binding)throw Error('漏做已选择组件：'+c.name);
    if(c.sourcePartIds.length!==binding.sourcePartIds.length||c.sourcePartIds.some((id:string)=>!binding.sourcePartIds.includes(id))||c.layerUuids.length!==binding.layerRefs.length||c.layerUuids.some((id:string)=>!binding.layerRefs.some((r:any)=>r.uuid===id)))throw Error('绑定与选定原层不一致：'+c.name);
  }
}
export function validatePreservedComponents(config:any,catalog:any,cache:any){
  for(const old of cache?.components||[]){if(!old.layerRefs.every((r:any)=>catalog.layers.some((l:any)=>l.uuid===r.uuid&&l.contentHash===r.contentHash)))continue;const next=config.components.find((c:any)=>c.id===old.id);if(!next||old.enabled&&!next.enabled&&!next.disabledReason?.trim())throw Error('保留已制作组件，或明确关闭并记录 disabledReason：'+old.name);}
}
export function toolsFor(output:string,input:PhysicsInput):FunctionTool[] {
  const pipeline=dirname(output),source=join(pipeline,'source'),evidence=join(pipeline,'step03/evidence');
  const tool=(name:string,description:string,properties:any,execute:any):FunctionTool=>({name,description,inputSchema:{type:'object',properties,additionalProperties:false},execute:async(args:any,signal)=>{signal.throwIfAborted();try{return await execute(args,signal);}catch(e){return {success:false,contentItems:[{type:'inputText',text:(e as Error).message}]};}}});
  const str={type:'string'},arr={type:'array',items:str};
  const getConfig=()=>json(join(pipeline,'step02/physics.draft.json'));
  const renderSource=async()=>await optional(join(pipeline,'preview/catalog.json'))?join(pipeline,'preview'):source;
  return [
    tool('physics_catalog','默认读取源层/UUID/指纹/原尺寸及简明分组索引。partIds 指定原 part 后返回这些部件及父组的完整连接和造型说明；先索引再按部位查询，不一次灌入所有长说明。无需生图。',{partIds:arr},async({partIds}:any)=>{
      const catalog=await json(join(source,'catalog.json')),structures=await Promise.all(input.structures.map(json)),descriptions=new Map<string,any>();
      const indexed=structures.map((s:any,i:number)=>{
        const walk=(nodes:any[],parents:any[]=[]):any[]=>nodes.map(n=>{const {groups,...fields}=n,id=(i?'clothing:':'character:')+n.id;
          if(groups?.length)return {id,name:n.name??n.label??n.id,groups:walk(groups,[...parents,fields])};
          descriptions.set(id,{part:fields,parents});return {id,name:n.name??n.label??n.id};
        });return walk(s.groups);
      });
      if(partIds?.some((id:string)=>!descriptions.has(id)))throw Error('未知源 part，先读取索引');
      return textResult({...catalog,...(partIds?.length?{descriptions:partIds.map((id:string)=>({id,...descriptions.get(id)}))}:{structures:indexed}),defaults:{strand:componentDefaults('strand'),cloth:componentDefaults('cloth'),pendant:componentDefaults('pendant')},profile:input.profile,reuse:await optional(join(input.task,'physics.components-cache.json'))});
    }),
    tool('physics_source_image','查看原尺寸源层。uuids 一次 1–16 层，返回单张无缩放拼图及编号/原 bounds；uuid 单层；空参数为整体。优先分部位批量看图，避免累计超过服务图片上限。',{uuid:str,uuids:arr},async({uuid,uuids}:any)=>{
      const catalog=await json(join(source,'catalog.json'));if(uuid&&uuids)throw Error('uuid 与 uuids 二选一');
      const ids=uuids||[uuid];if(!ids.length||ids.length>16)throw Error('一次查看 1–16 层');
      const layers=ids.map((id:string)=>{const l=id&&catalog.layers.find((l:any)=>l.uuid===id);if(id&&!l)throw Error('源层不存在');return l;});
      const items=await Promise.all(layers.map(async(l:any)=>({label:l?.partPath||'character',bytes:await readFile(join(source,l?l.original:'color.png'))})));
      const sheet=await imageSheet(items);return {success:true,contentItems:[{type:'inputText',text:JSON.stringify({sourcePixelScale:1,tiles:sheet.tiles,layers:layers.map((l:any)=>l||catalog.canvas)})},{type:'inputImage',imageUrl:'data:image/png;base64,'+sheet.image.toString('base64')}]};
    }),
    tool('physics_save_plan','保存 version:2 分析。parts 每项 id/decision/reason/motion:{family(hair|fabric|accessory|other),region,freedom(free|fixed|follow|uncertain)}；defer 另需 deferCode。components 每项 id/name/kind/priority/sourcePartIds/layerUuids/connection。按实际自由段判断，固定发盖排除，头发和挂件不能整类跳过。',{plan:{type:'object'}},async({plan}:any)=>{await validatePlan(plan,await json(join(source,'catalog.json')),input.profile);await put(join(pipeline,'step01/analysis.json'),plan);const coverage=coverageReport(plan);await put(join(pipeline,'step01/coverage.json'),coverage);return textResult({saved:true,coverage});}),
    tool('physics_save_binding','保存完整组件配置。结构与 formal 11 一致，source.canvas、components；每项有 supports、authoring、response、material、limits。不接受仅按图层包围盒摆动。',{config:{type:'object'}},async({config}:any)=>{
      config={...config,kind:'astra-component-physics',version:1,solver:'astra-component-physics-1',review:{status:'draft'}};
      const catalog=await json(join(source,'catalog.json'));await validateBindings(config,catalog,source);
      const plan=await json(join(pipeline,'step01/analysis.json'));
      await validateProfile(config,plan,input.profile);
      validatePreservedComponents(config,catalog,await optional(join(input.task,'physics.components-cache.json')));
      await put(join(pipeline,'step02/physics.draft.json'),config);await put(join(pipeline,'step02/coverage.json'),coverageReport(plan,config));return textResult({saved:true,configHash:configHash(config),components:config.components.length});
    }),
    tool('physics_simulate','运行 9 组规范输入，每步保存完整网格、姿态残差与约束。改参数后必须重新运行。',{render:{type:'boolean'}},async({render}:any,signal:AbortSignal)=>{
      const config=await getConfig(),manifest=await simulate(config,evidence,signal);
      if(render!==false)await renderFrames(config,await renderSource(),evidence,manifest.runs.map((r:any)=>({test:r.test,steps:Array.from({length:81},(_,i)=>i*12),modes:['color','lit'],cropSteps:[0,60,96,180,360,960]})),signal);
      return textResult(summarizeEvidence(await json(join(evidence,'manifest.json'))));
    }),
    tool('physics_frames','精确重放整数步并输出原尺寸固定取景帧。事件窗用间隔 2 步（60 Hz），疑似顿挫用 1 步；component 可仅截指定局部，完整索引分页读取。',{test:str,component:str,steps:{type:'array',items:{type:'integer'}},modes:arr},async({test,component,steps,modes}:any,signal:AbortSignal)=>{const frames=await renderFrames(await getConfig(),await renderSource(),evidence,[{test,steps,modes:modes||['color','lit','normal','depth'],components:component?[component]:undefined}],signal);return textResult({images:frames.slice(0,24),total:frames.length,index:'physics_evidence_index'});}),
    tool('physics_view','读取 evidence 图片（最多 8 张），返回一张原像素拼图并记录每帧版本。按编号逐帧看，不缩放原图；先均匀序列，再事件窗与原尺寸接缝。',{paths:arr},async({paths}:any)=>{
      if(!Array.isArray(paths)||!paths.length||paths.length>8)throw Error('一次查看 1–8 张');
      const manifest=await json(join(evidence,'manifest.json')),frames=await json(join(evidence,'frames.json')),viewed=await optional(join(evidence,'viewed.json'))||[],items:any[]=[],chosen:any[]=[];
      for(const path of paths){const f=frames.find((f:any)=>f.path===path&&f.configHash===manifest.configHash);if(!f)throw Error('图片未在当前证据索引中');const bytes=await readFile(join(evidence,path));items.push({label:path,bytes});chosen.push({...f,path,configHash:manifest.configHash,imageHash:hash(bytes)});}
      const sheet=await imageSheet(items);await put(join(evidence,'viewed.json'),[...viewed,...chosen]);return {success:true,contentItems:[{type:'inputText',text:JSON.stringify({sourcePixelScale:1,tiles:sheet.tiles,frames:chosen})},{type:'inputImage',imageUrl:'data:image/png;base64,'+sheet.image.toString('base64')}]};
    }),
    tool('physics_trace','读取精确步的指标、速度峰值、末端与支撑。指定 component 可聚焦；fullMesh=true 可读单组件最多 5 步完整顶点，完整所有步轨迹保留在 gzip JSONL。',{test:str,component:str,fullMesh:{type:'boolean'},steps:{type:'array',items:{type:'integer'}}},async({test,steps,component,fullMesh}:any)=>{
      if(fullMesh&&(!component||steps.length>5))throw Error('完整网格需指定单个组件，最多 5 步');
      const rows=await traceWindow(evidence,test,steps);return textResult(rows.map((r:any)=>({...r,components:Object.fromEntries(Object.entries(r.components).filter(([id])=>!component||id===component).map(([id,v]:[string,any])=>[id,fullMesh?v:{stats:v.stats,supports:v.supports,tip:v.tip,maxSpeed:Math.max(...v.velocity.map(Math.abs))}]))})));
    }),
    tool('physics_strip','以原像素拼接连续颜色帧并返回模型，记录每一帧的实际查看。最多 6 帧；component 可指定固定局部，留空为整体。',{test:str,component:str,steps:{type:'array',items:{type:'integer'}}},async({test,component,steps}:any)=>{
      if(!Array.isArray(steps)||!steps.length||steps.length>6)throw Error('一组 1–6 帧');
      const manifest=await json(join(evidence,'manifest.json')),frames=await json(join(evidence,'frames.json')),chosen=steps.map((step:number)=>frames.find((f:any)=>f.configHash===manifest.configHash&&f.test===test&&f.step===step&&f.mode==='color'&&(component?f.component===component:!f.component)));
      if(chosen.some((f:any)=>!f))throw Error('请先生成所需精确帧');
      const images=await Promise.all(chosen.map((f:any)=>readFile(join(evidence,f.path)))),meta=await sharp(images[0]).metadata();
      const width=meta.width!,height=meta.height!;
      if(width*height*images.length>64_000_000)throw Error('拼图过大，请减少帧数');
      const strip=await sharp({create:{width:width*images.length,height:height+28,channels:4,background:'#182232'}}).composite(images.map((input,i)=>({input,left:i*width,top:28}))).png().toBuffer();
      const viewed=await optional(join(evidence,'viewed.json'))||[];for(let i=0;i<chosen.length;i++)viewed.push({...chosen[i],imageHash:hash(images[i])});await put(join(evidence,'viewed.json'),viewed);
      return {success:true,contentItems:[{type:'inputText',text:JSON.stringify({leftToRight:chosen,sourcePixelScale:1})},{type:'inputImage',imageUrl:'data:image/png;base64,'+strip.toString('base64')}]};
    }),
    tool('physics_evidence_index','查询事件、指标与图片索引（分页）。不要猜不存在的帧。',{test:str,component:str,offset:{type:'integer'},limit:{type:'integer'}},async({test,component,offset=0,limit=24}:any)=>{
      const manifest=await optional(join(evidence,'manifest.json')),frames=await optional(join(evidence,'frames.json'))||[];
      if(!manifest)return textResult({complete:false,failure:await optional(join(evidence,'failure.json')),images:[]});
      const images=frames.filter((f:any)=>f.configHash===manifest.configHash&&(!test||f.test===test)&&(!component||f.component===component));
      return textResult({manifest:summarizeEvidence(manifest,test),images:images.slice(Math.max(0,offset),Math.max(0,offset)+Math.min(60,Math.max(1,limit))),total:images.length,nextOffset:offset+limit<images.length?offset+limit:null});
    }),
    tool('physics_submit_review','逐组件提交六项视觉结论。每项 verdict/reason/images，images 必须通过 physics_view 读取。通过后生成 step03/physics.json。',{findings:{type:'object'}},async({findings}:any)=>{
      const config=await getConfig(),manifest=await validateFindings(config,evidence,findings,await renderSource());
      await put(join(pipeline,'step03/findings.json'),findings);
      config.review={status:'accepted',configHash:manifest.configHash,evidenceVersion:manifest.version,coverage:{...manifest.coverage,aiVisual:'selected-frames',human:'unreviewed'},findings:'step03/findings.json',evidence:'step03/evidence/manifest.json'};
      await put(join(pipeline,'step03/physics.json'),config);return textResult({published:true,coverage:config.review.coverage});
    }),
  ];
}
