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
  preparationHelp: '--image 首次启动需要；--standard 先判断并按需调整姿态，未开启则复制原图为 standard.png。续跑沿用已存选项，--no-standard 显式关闭；已有参考须通过指纹检查。',
  getPreparationDirectory, loadPreparedReferences,
  prepare: (input, agents, progress, normalization) => prepareReferences(input, createPreparationSteps(agents), progress, normalization),
};

export function runPartLayering(input: PartInput, adapters: PartAdapters = {}, options: AgentOptions = {}) {
  return runPartPipeline(pipeline, input, adapters, options);
}

if (import.meta.main) await runCli(pipeline);
