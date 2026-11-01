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
export async function partStages(directory: string, section: string, groups: any[], files: Set<string>,
  json: (path: string) => Promise<any>, calls: AgentCall[], errors: string[], active = true,
  step: (id: string) => Promise<StepStatus> = async () => 'absent') {
  const states: Record<string, Status> = {}, messages: Record<string, string> = {};
  const present = (path: string) => files.has(section + '/' + path);
  // A product counts only in a marked step; a completed step missing its product failed.
  const missing = (phase: string, path: string) => { messages[phase] = '.completed 存在但缺少交付：' + section + '/' + path; return 'failed' as const; };
  const stage = async (phase: string, id: string, path: string | undefined, delivery: string, ...drafts: string[]): Promise<Status> => {
    const status = await step(id);
    if (status === 'completed') return path ? 'done' : missing(phase, delivery);
    return status === 'running' && (path || drafts.some(present)) ? 'available' : 'pending';
  };
  const reference = (name: string) => [`references/${name}.png`].find(present);
  const initial = await step(partSteps.initial);
  states.initial = initial === 'completed' ? 'done' : initial === 'running' && groups.length ? 'available' : 'pending';
  if (section === 'part-layering') {
    for (const [phase, name] of [['standard', 'standard'], ['simplified', 'simplified-subject'], ['base', 'base-subject']] as const) {
      states[phase] = await stage(phase, partSteps[phase], reference(name), `references/${name}.png`);
    }
    states.preparation = ['standard', 'simplified', 'base'].some(phase => states[phase] === 'failed') ? 'failed'
      : ['standard', 'simplified', 'base'].every(phase => states[phase] === 'done') ? 'done'
      : ['standard', 'simplified', 'base'].some(phase => states[phase] !== 'pending') ? 'available' : 'pending';
  } else {
    states.clothing = await stage('clothing', clothingPreparationStep, reference('clothing'), 'references/clothing.png');
    states.preparation = states.clothing;
  }
  const all = (nodes: any[]): any[] => nodes.flatMap(node => [node, ...all(node.groups ?? [])]);
  states.merge = await stage('merge', partSteps.merge, present('preview.svg') ? 'preview.svg' : undefined, 'preview.svg', 'preview.draft.svg');
  if (states.merge === 'done' && !(groups.length && all(groups).every(node => Object.values(node.webPhases).every(value => value === 'done')))) states.merge = 'available';
  states.occlusion = await stage('occlusion', partSteps.occlusion, present('occlusion.json') ? 'occlusion.json' : undefined, 'occlusion.json',
    `${partSteps.occlusion}/preview.svg`, `${partSteps.occlusion}/workspace/candidate.svg`);
  if (states.occlusion === 'done') {
    states.occlusion = 'available';
    try {
      const plan = validateOcclusionDocument(await json(section + '/occlusion.json'));
      const leaves = all(groups).filter(node => !node.groups?.length);
      if (plan.layers.length === leaves.length && leaves.every(node => plan.layers.some(row => row.id === node.id))) states.occlusion = 'done';
    } catch (error) { errors.push(section + '/occlusion.json: ' + String(error)); }
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
