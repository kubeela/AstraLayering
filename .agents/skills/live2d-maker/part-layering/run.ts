import { runCli, runPartPipeline, type PartPipeline, type PartInput, type PartAdapters } from '../shared/part/run.ts';
import type { AgentOptions } from '../shared/codex/agents.ts';
import { profile } from './profile.ts';
import { getPreparationDirectory, loadPreparedReferences, prepareReferences } from './preparation.ts';
import { createPreparationSteps } from './preparation-agents.ts';
export { createPreparationSteps } from './preparation-agents.ts';
export { parseRunArguments, readGroupInput, formatLayeringSummary } from '../shared/part/run.ts';

export const pipeline: PartPipeline = {
  profile,
  imageHelp: '角色图片路径',
  preparationHelp: '--image 首次启动需要；续跑使用运行目录中的原图，并自动补齐缺失的参考输出。',
  getPreparationDirectory, loadPreparedReferences,
  prepare: (input, agents, progress) => prepareReferences(input, createPreparationSteps(agents), progress),
};

export function runPartLayering(input: PartInput, adapters: PartAdapters = {}, options: AgentOptions = {}) {
  return runPartPipeline(pipeline, input, adapters, options);
}

if (import.meta.main) await runCli(pipeline);
