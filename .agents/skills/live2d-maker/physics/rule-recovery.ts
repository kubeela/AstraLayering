import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {copyFile,rm,rename} from 'node:fs/promises';
import {fingerprint,json,optional,put,ruleBaseline,type PhysicsInput,type RuleBaseline} from './input.ts';

// Prove the old digest using current source bytes before preserving analysis.
// This never writes a completed marker or a review verdict.
export async function resumeRuleUpdate(input:PhysicsInput,directory:string,baseline:RuleBaseline,validate:()=>Promise<void>){
  const run=await json(join(directory,'run.json')),current=await fingerprint(input);
  if(run.inputFingerprint===current)return {status:'current' as const};
  if(run.inputFingerprint!==await fingerprint(input,baseline))throw Error('规则恢复拒绝：源图、groups、范围或参考与原任务不一致，或提供的旧规则基线不匹配');
  await validate();
  const archive=join(directory,'recovery','rules-'+randomUUID());
  await put(join(archive,'run-before.json'),run);
  await put(join(archive,'rules-before.json'),baseline);
  await put(join(archive,'rules-after.json'),await ruleBaseline());
  const roles=await optional(join(directory,'roles.json'));
  if(roles)await put(join(archive,'roles-before.json'),roles);
  for(const path of ['physics.draft.json','assemblies.json','tuning.json','coverage.json','report.md'])try{await copyFile(join(directory,'step02',path),join(archive,'step02-'+path));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  for(const path of ['step02/.completed','step03/.completed','step02/repair-request.json','step03/feedback.json','step03/review-session.json']) {
    const target=path.replaceAll('/','-');
    try{await copyFile(join(directory,path),join(archive,target));if(path.endsWith('/.completed'))await rename(join(directory,path),join(directory,path.replace('/.completed','/.running')));else await rm(join(directory,path));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
  if(roles)await put(join(directory,'roles.json'),{...roles,repairRounds:{},repairGeneration:current,previousRepairRounds:roles.repairRounds||{}});
  const next={...run,inputFingerprint:current,sourceInput:input};
  if(roles?.authoring?.threadId){next.threadId=roles.authoring.threadId;next.threadHarness=roles.authoring.threadHarness;next.threadStep='step02';if(next.threadHandoff?.replacementThreadId!==next.threadId)delete next.threadHandoff;}
  await put(join(archive,'migration.json'),{version:1,reason:'Explicit rule maintenance; all source inputs match the previous fingerprint',previousFingerprint:run.inputFingerprint,inputFingerprint:current,at:new Date().toISOString(),analysisValidated:true,bindingsValidated:!!await optional(join(directory,'step02/physics.draft.json')),reviewAcceptanceInherited:false,authoringAndReviewMustRepeat:true,oldFeedbackAndBudgetArchived:true});
  await put(join(directory,'run.json'),next);
  return {status:'migrated' as const,archive};
}
