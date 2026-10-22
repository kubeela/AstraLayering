import { parseArgs } from 'node:util';
import { join, dirname } from 'node:path';
import { copyFile, readFile, stat, rm } from 'node:fs/promises';
import { pipelineDirectory, taskDirectory } from '../shared/paths.ts';
import { acquireTaskLock } from '../workflow/state.ts';
import { runWorkflow as shared, type WorkflowOptions, type Dependencies, type KritaPipeline } from '../shared/raster/workflow.ts';
import { steps, buildPrompt } from './steps.ts';
import { fingerprint, prepareSource, prepareProjectionPreview, resolveInput, put, json, optional, type PhysicsInput } from './input.ts';
import { toolsFor, validatePlan, validateBindings, validateProfile } from './tools.ts';
import { validateFindings, configHash } from './evidence.ts';
export async function runWorkflow(options:WorkflowOptions&{profile?:'primary'|'all'},dependencies:Dependencies={}) {
  const profile=options.profile??'primary';if(!['primary','all'].includes(profile))throw Error('物理范围必须为 primary 或 all');
  const directory=pipelineDirectory(options.name,'physics',options.dir??dependencies.runsDirectory);
  const renderedSource=async()=>await optional(join(directory,'preview/catalog.json'))?join(directory,'preview'):join(directory,'source');
  if(!options.dryRun&&await stat(join(directory,'step03/.completed')).then(()=>true,()=>false)){
    const saved=await optional(join(directory,'run.json')),krita=options.krita||saved?.krita?.executable;
    if(krita)await prepareProjectionPreview(await resolveInput(options.name,options.dir??dependencies.runsDirectory!,profile),directory,krita);
    try{await validateFindings(await json(join(directory,'step03/physics.json')),join(directory,'step03/evidence'),await json(join(directory,'step03/findings.json')),await renderedSource());}
    catch(e){await rm(join(directory,'step03/.completed'),{force:true});options.progress?.('step03：现有复核需更新，保留旧证据并重新复核：'+(e as Error).message);}
  }
  const pipeline:KritaPipeline<PhysicsInput>={id:'physics',steps,resolveInput:(name,root)=>resolveInput(name,root,profile),validateInput:(v):v is PhysicsInput=>!!v&&typeof v==='object'&&'document'in v&&'profile'in v,inputDirectories:i=>[join(i.task,'character-assembly'),...i.structures.map(dirname)],fingerprintInput:fingerprint,buildPrompt,
    tools:toolsFor,prepareStep:async(output,input,step,krita)=>{if(step.id==='step01')await prepareSource(input,dirname(output),krita.executable);if(step.id==='step03')await prepareProjectionPreview(input,dirname(output),krita.executable);},
    validateDelivery:async(output,input,step)=>{
      const catalog=await json(join(dirname(output),'source/catalog.json'));
      if(step.id==='step01')await validatePlan(await json(join(output,'analysis.json')),catalog);
      else if(step.id==='step02'){const config=await json(join(output,'physics.draft.json'));await validateBindings(config,catalog,join(dirname(output),'source'));await validateProfile(config,await json(join(dirname(output),'step01/analysis.json')),profile);}
      else {const config=await json(join(output,'physics.json'));await validateBindings(config,catalog,join(dirname(output),'source'));await validateProfile(config,await json(join(dirname(output),'step01/analysis.json')),profile);await validateFindings(config,join(output,'evidence'),await json(join(output,'findings.json')));if(config.review?.configHash!==configHash(config))throw Error('发布版本与复核不一致');}
    },
  };
  const result=await shared(pipeline,options,dependencies);if(options.dryRun)return result;
  const config=await json(join(directory,'step03/physics.json'));
  await validateBindings(config,await json(join(directory,'source/catalog.json')),join(directory,'source'));
  await validateProfile(config,await json(join(directory,'step01/analysis.json')),profile);
  await validateFindings(config,join(directory,'step03/evidence'),await json(join(directory,'step03/findings.json')),await renderedSource());
  await put(join(directory,'physics.json'),config);await put(join(taskDirectory(options.name,options.dir??dependencies.runsDirectory),'physics.components-cache.json'),{version:1,components:config.components});
  return result;
}
export const help='pnpm physics --name <任务名> --krita <可执行文件> [--dir <绝对运行根目录>] [--profile primary|all] [--dry-run]\n独立读取 assembled；不会要求重跑阴影。产出 physics/physics.json 和三步记录。总入口 --from physics --to physics 或 --physics --physics-profile primary|all。';
if(import.meta.main){const {values}=parseArgs({options:{name:{type:'string'},dir:{type:'string'},krita:{type:'string'},profile:{type:'string'},'dry-run':{type:'boolean'},help:{type:'boolean'}}});if(values.help)console.log(help);else {
  if(!values.name)throw Error('需要 --name');const controller=new AbortController();for(const s of ['SIGINT','SIGTERM'])process.once(s,()=>controller.abort(Error('物理工作流中断，进度保留')));
  const release=values['dry-run']?undefined:await acquireTaskLock(taskDirectory(values.name,values.dir));try{console.log(await runWorkflow({name:values.name,dir:values.dir,krita:values.krita,profile:values.profile as any,dryRun:values['dry-run'],signal:controller.signal,progress:console.log}));}finally{await release?.();}
}}
