import { createHash } from 'node:crypto';
import { initialStepId } from '../.agents/skills/live2d-maker/shared/part/part-steps.ts';
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
  json: (path: string) => Promise<any>, read: (path: string) => Promise<Buffer | undefined>, calls: AgentCall[], errors: string[], active = true,
  step: (id: string) => Promise<StepStatus> = async () => 'absent') {
  const states: Record<string, Status> = {}, messages: Record<string, string> = {};
  const present = (path: string) => files.has(pipeline + '/' + path);
  const artifact = (...paths: string[]): Status => paths.some(present) ? 'available' : 'pending';
  const record = await json(pipeline + '/references/preparation.json');
  const prep = record?.version === 1 ? record : undefined;
  const reference = (name: string) => ['png', 'jpg', 'jpeg', 'webp'].map(ext => `references/${name}.${ext}`).find(present);
  const fingerprint = async (path: string | undefined, hash: unknown) => {
    if (!path || typeof hash !== 'string') return false;
    const bytes = await read(pipeline + '/' + path);
    return !!bytes && createHash('sha256').update(bytes).digest('hex') === hash;
  };
  states.initial = await step(initialStepId) === 'completed' ? 'done' : groups.length ? 'available' : 'pending';
  if (pipeline === 'part-layering') {
    for (const [phase, name, number] of [['standard', 'standard', 4], ['simplified', 'simplified-subject', 6], ['base', 'base-subject', 7]] as const) {
      const path = reference(name);
      states[phase] = path && (await step(`preparation/step0${number}`) === 'completed'
        || await fingerprint(path, prep?.files?.[phase]?.outputHash)) ? 'done' : path ? 'available' : 'pending';
    }
    states.preparation = ['standard', 'simplified', 'base'].every(phase => states[phase] === 'done') ? 'done'
      : ['standard', 'simplified', 'base'].some(phase => states[phase] !== 'pending') ? 'available' : 'pending';
  } else {
    states.clothing = await fingerprint('references/clothing.png', prep?.clothingHash) ? 'done' : artifact('references/clothing.png');
    states.preparation = states.clothing;
  }
  states.merge = artifact('preview.svg', 'preview.draft.svg');
  const all = (nodes: any[]): any[] => nodes.flatMap(node => [node, ...all(node.groups ?? [])]);
  if (present('preview.svg') && groups.length && await step('merge') === 'completed' &&
      all(groups).every(node => Object.values(node.webPhases).every(value => value === 'done'))) states.merge = 'done';
  states.occlusion = artifact('occlusion.json', 'occlusion/preview.svg', 'occlusion/workspace/candidate.svg');
  if (present('occlusion.json') && await step('occlusion') === 'completed') {
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
    states[phase] = status; messages[phase] = call.name;
    if (['standard', 'simplified', 'base', 'clothing'].includes(phase)) {
      states.preparation = status; messages.preparation = call.name;
    }
  }
  return { states, messages };
}
