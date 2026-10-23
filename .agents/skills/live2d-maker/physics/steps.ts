import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { defaultModels } from '../shared/codex/environment.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
import type { PhysicsInput } from './input.ts';
export const steps=[
  {id:'step01',title:'组件、连接与活动区分析',...defaultModels.medium,modelStep:'physics_analysis',prompt:new URL('prompts/analysis.md',import.meta.url),requiredFiles:['analysis.json','coverage.json','report.md']},
  {id:'step02',title:'网格、固定区与最大约束绑定',...defaultModels.high,modelStep:'physics_authoring',freshSession:true,prompt:new URL('prompts/authoring.md',import.meta.url),requiredFiles:['physics.draft.json','coverage.json','report.md']},
  {id:'step03',title:'连续动画模拟与视觉复核',...defaultModels.high,modelStep:'physics_review',freshSession:true,prompt:new URL('prompts/review.md',import.meta.url),requiredFiles:['physics.json','findings.json','evidence/manifest.json','report.md']},
] as const satisfies readonly StepDefinition[];
export async function buildPrompt(step:StepDefinition,input:PhysicsInput,output:string) {
  return `${await readFile(step.prompt,'utf8')}\n本次管线：${dirname(output)}；输出：${output}。范围 ${input.profile}。源工程与 PNG 只读：${input.document}、${input.color}。catalog 与原尺寸部件图：${join(dirname(output),'source')}。使用 physics_* 工具，绝不重画皮套。已有组件缓存：${join(input.task,'physics.components-cache.json')}；只复用 UUID、指纹、实际支撑都匹配的绑定，重新验证运动。必须产出 ${step.requiredFiles.join('、')}。只修改本步骤及未正式发布的物理草稿；不改上游、另一管线、管线 run.json 或完成标记。最后返回 status、summary。视觉不通过则修订 step02 草稿并重跑模拟，不伪造 findings，不把数值通过写成自然效果通过。`;
}
