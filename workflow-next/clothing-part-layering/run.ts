import { runCli, runPartPipeline, type PartPipeline, type PartInput, type PartAdapters } from '../shared/part/run.ts';
import type { AgentOptions } from '../shared/codex/agents.ts';
import { profile } from './profile.ts';
import { getPreparationDirectory, loadPreparedReferences, prepareReferences, createPreparationSteps } from './preparation.ts';
export { parseRunArguments, readGroupInput, formatLayeringSummary } from '../shared/part/run.ts';

export const pipeline: PartPipeline = {
  profile,
  imageHelp: '简化穿衣角色图片路径',
  preparationHelp: '--image 首次启动需要；生成纯衣服参考；续跑沿用已保存的输入和参考。',
  getPreparationDirectory, loadPreparedReferences,
  prepare: (input, agents, progress) => prepareReferences(input, createPreparationSteps(agents), progress),
};

export function runClothingPartLayering(input: PartInput, adapters: PartAdapters = {}, options: AgentOptions = {}) {
  return runPartPipeline(pipeline, input, adapters, options);
}

if (import.meta.main) await runCli(pipeline);
