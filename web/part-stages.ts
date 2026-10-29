import { clothingPreparationStep, partSteps } from '../.agents/skills/live2d-maker/shared/step-paths.js';
import type { StepStatus } from '../.agents/skills/live2d-maker/shared/step-chain.ts';
import { validateOcclusionDocument } from '../.agents/skills/live2d-maker/shared/part/occlusion-plan.ts';
import { throttled, type AgentCall } from './agent-progress.ts';

type Status = 'pending' | 'running' | 'throttled' | 'available' | 'done' | 'failed';
const stepPhases: Record<string, string> = {
  part_pose_judgment: 'standard', part_standardize: 'standard', part_reference_judgment: 'simplified',
  part_simplify: 'simplified', part_base_subject: 'base', clothing_preparation: 'clothing',
  part_initial_groups: 'initial', clothing_initial_groups: 'initial',
  part_occlusion: 'occlusion', clothing_occlusion: 'occlusion',
};
const namePhases: Record<string, string> = {
  '姿态判断': 'standard', '标准姿态': 'standard', '参考判断': 'simplified', '参考判断与简化': 'simplified', '简化图片': 'simplified',
  '素体换装': 'base', '纯衣服参考准备': 'clothing', '首次分组识别': 'initial', '最终遮挡层级规划': 'occlusion',
};

// Observe published files and existing receipts. This function never restores or writes scheduler state.
export async function partStages(directory: string, pipeline: string, groups: any[], files: Set<string>,
  json: (path: string) => Promise<any>, calls: AgentCall[], errors: string[], active = true,
  step: (id: string) => Promise<StepStatus> = async () => 'absent') {
  const states: Record<string, Status> = {}, messages: Record<string, string> = {};
  const present = (path: string) => files.has(pipeline + '/' + path);
  const artifact = (...paths: string[]): Status => paths.some(present) ? 'available' : 'pending';
  const reference = (name: string) => ['png', 'jpg', 'jpeg', 'webp'].map(ext => `references/${name}.${ext}`).find(present);
  states.initial = await step(partSteps.initial) === 'completed' ? 'done' : groups.length ? 'available' : 'pending';
  if (pipeline === 'part-layering') {
    for (const [phase, name] of [['standard', 'standard'], ['simplified', 'simplified-subject'], ['base', 'base-subject']] as const) {
      const path = reference(name);
      states[phase] = path && await step(partSteps[phase]) === 'completed' ? 'done' : path ? 'available' : 'pending';
    }
    states.preparation = ['standard', 'simplified', 'base'].every(phase => states[phase] === 'done') ? 'done'
      : ['standard', 'simplified', 'base'].some(phase => states[phase] !== 'pending') ? 'available' : 'pending';
  } else {
    states.clothing = await step(clothingPreparationStep) === 'completed' ? 'done' : artifact('references/clothing.png');
    states.preparation = states.clothing;
  }
  states.merge = artifact('preview.svg', 'preview.draft.svg');
  const all = (nodes: any[]): any[] => nodes.flatMap(node => [node, ...all(node.groups ?? [])]);
  if (present('preview.svg') && groups.length && await step(partSteps.merge) === 'completed' &&
      all(groups).every(node => Object.values(node.webPhases).every(value => value === 'done'))) states.merge = 'done';
  states.occlusion = artifact('occlusion.json', `${partSteps.occlusion}/preview.svg`, `${partSteps.occlusion}/workspace/candidate.svg`);
  if (present('occlusion.json') && await step(partSteps.occlusion) === 'completed') {
    try {
      const plan = validateOcclusionDocument(await json(pipeline + '/occlusion.json'));
      const leaves = all(groups).filter(node => !node.groups?.length);
      if (plan.layers.length === leaves.length && leaves.every(node => plan.layers.some(row => row.id === node.id))) states.occlusion = 'done';
    } catch (error) { errors.push(pipeline + '/occlusion.json: ' + String(error)); }
  }
  const latest = new Map<string, AgentCall>();
  for (const call of calls) {
    const phase = stepPhases[call.step] ?? namePhases[call.name];
    if (phase) latest.set(phase, call);
  }
  for (const [phase, call] of latest) {
    if (call.failed) {
      states[phase] = 'failed'; messages[phase] = '调用失败，请查看运行记录：' + call.name;
      if (['standard', 'simplified', 'base', 'clothing'].includes(phase)) states.preparation = 'failed';
      continue;
    }
    if (!active) continue;
    if (call.finished) continue;
    const status = throttled(call) ? 'throttled' : 'running';
    const message = status === 'throttled' ? call.retryError! : call.name;
    states[phase] = status; messages[phase] = message;
    if (['standard', 'simplified', 'base', 'clothing'].includes(phase)) {
      states.preparation = status; messages.preparation = message;
    }
  }
  return { states, messages };
}
