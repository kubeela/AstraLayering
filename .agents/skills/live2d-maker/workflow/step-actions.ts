import { readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readStep, type StepStatus } from '../shared/step-chain.ts';
import { fromTaskPath, taskRootOf } from '../shared/task-paths.ts';
import { within } from '../shared/raster/run-store.ts';
import { clearStepSession, readStepSession } from '../shared/agents/step-session.ts';
import { occlusionPath } from '../shared/part/occlusion-plan.ts';
import { artifactPath, draftPath } from '../shared/part/artifact-facts.ts';
import { partSteps, stepPattern } from '../shared/step-paths.js';
import { pipelineIds, type PipelineId } from '../shared/paths.ts';
import { acquireTaskLock, directoryFor, pipelineId, type TaskOptions } from './state.ts';

// Per-step recovery for an interrupted or failed step, by any client (web, CLI):
//   continue: change nothing; the next run continues the step with its
//             products and session.
//   resume:   drop the step's session and keep its products, so the next run
//             continues them in a new session.
//   retry:    reset the step (directory, declared outputs, session and the
//             agent attempts that worked in it); the next run reruns it from a
//             clean step, and the steps built on it rerun with it.
// Every pipeline keeps a step's session in agents/steps/<step>/session.json
// (shared/agents/step-session.ts). Steps without a session (one-shot agents)
// simply rerun when they have no product, so resume equals continue.
// The empty step id continues the whole pipeline.
export const stepActions = ['continue', 'resume', 'retry'] as const;
export type StepAction = typeof stepActions[number];
export type StepEntry = { id: string; status: Exclude<StepStatus, 'absent'>; session: boolean };

const partPipelines: readonly PipelineId[] = ['part-layering', 'clothing-part-layering'];
const safeSegment = (segment: string) => !!segment && segment !== '.' && segment !== '..' && !/[\\\0]/.test(segment);
// Step ids are the step directories relative to the section (see part-steps.ts and step-section.ts).
const itemSteps: readonly string[] = [partSteps.outline, partSteps.completion, partSteps.children];
export function validStepId(pipeline: PipelineId, id: string): boolean {
  if (typeof id !== 'string' || !id.split('/').every(safeSegment)) return false;
  const [step, ...items] = id.split('/'), item = items.join('/');
  if (!stepPattern.test(step)) return false;
  if (!partPipelines.includes(pipeline)) return !items.length;
  if (itemSteps.includes(step)) return /^[^/]+(\/children\/[^/]+)*$/.test(item);
  if (step === partSteps.reduce) return /^depth\d{2}$/.test(item);
  return !items.length;
}

export const pipelineRoot = (directory: string, pipeline: PipelineId): string => join(directory, pipeline);

// Every marked or unmarked step directory of a pipeline, in path order.
export async function listSteps(root: string, pipeline: PipelineId): Promise<StepEntry[]> {
  let names: string[];
  try { names = await readdir(root, { recursive: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  const ids = new Set(names.map(name => name.split(/[\\/]/).join('/')).filter(name => validStepId(pipeline, name)));
  const steps: StepEntry[] = [];
  for (const id of [...ids].sort()) {
    const { status } = await readStep(join(root, id), taskRootOf(root));
    if (status === 'absent') continue;
    const session = await readStepSession(root, id);
    steps.push({ id, status, session: !!(session?.threadId || session?.handoff) });
  }
  return steps;
}

export async function applyStepAction(options: Pick<TaskOptions, 'name' | 'dir'> & { pipeline: string; step: string; action: string }): Promise<string> {
  const pipeline = pipelineId(options.pipeline);
  if (!(stepActions as readonly string[]).includes(options.action)) throw new Error('未知操作：' + options.action + '；可选：' + stepActions.join(', '));
  const whole = options.step === '';
  if (whole ? options.action !== 'continue' : !validStepId(pipeline, options.step)) throw new Error(`${pipeline} 没有步骤 ${options.step}`);
  const directory = directoryFor(options);
  // The task lock keeps a running coordinator and a second recovery out.
  const release = await acquireTaskLock(directory);
  try {
    const root = pipelineRoot(directory, pipeline);
    if (whole) return `${pipeline}：保留全部产物，下次运行续跑。`;
    return await actOnStep(root, pipeline, options.step, options.action as StepAction);
  } finally { await release(); }
}

// The task-wide form the web toolbar uses: the action applies to every
// interrupted or failed step of every pipeline. Continue with no such step
// just runs the task on from where it stopped.
export async function applyTaskAction(options: Pick<TaskOptions, 'name' | 'dir'> & { action: string }): Promise<string> {
  if (!(stepActions as readonly string[]).includes(options.action)) throw new Error('未知操作：' + options.action + '；可选：' + stepActions.join(', '));
  const action = options.action as StepAction, directory = directoryFor(options);
  const release = await acquireTaskLock(directory);
  try {
    const messages: string[] = [];
    for (const pipeline of pipelineIds) {
      const root = pipelineRoot(directory, pipeline);
      for (const step of await listSteps(root, pipeline)) {
        if (step.status === 'running') messages.push(`${pipeline}/` + await actOnStep(root, pipeline, step.id, action));
      }
    }
    if (!messages.length) {
      if (action !== 'continue') throw new Error(`没有中断或失败的步骤可${action === 'resume' ? '恢复' : '重试'}；继续运行即可。`);
      return '没有中断或失败的步骤，保留全部产物，从未完成处续跑。';
    }
    return messages.join('\n');
  } finally { await release(); }
}

async function actOnStep(root: string, pipeline: PipelineId, step: string, action: StepAction): Promise<string> {
  const stepDirectory = join(root, step);
  const { status, record } = await readStep(stepDirectory, taskRootOf(root));
  if (status === 'absent') throw new Error(`步骤 ${pipeline}/${step} 不存在，下次运行会直接执行。`);
  const part = partPipelines.includes(pipeline);
  if (action === 'continue') {
    if (status === 'completed') throw new Error(`步骤 ${step} 已完成；需要重做请选择重试。`);
    return `${step}：保留产物和会话，下次运行继续。`;
  }
  if (action === 'resume') {
    if (status === 'completed') throw new Error(`步骤 ${step} 已完成；只能对中断或失败的步骤恢复。`);
    const dropped = await clearStepSession(root, step, '网页恢复：清除会话，保留产物');
    if (!dropped) return `${step} 没有保存的会话，恢复等同继续：下次运行沿用产物。`;
    return `${step}：已清除会话${dropped.threadId ? ' ' + dropped.threadId : ''}，保留产物；下次运行在新会话中继续。`;
  }
  // retry: the step directory holds its session; declared outputs may live outside it.
  const outputs = Object.keys(record?.outputs ?? {}).map(name => resolve(stepDirectory, name));
  // A running part step has no recorded outputs yet; its drafts and plans outside the
  // step directory are intermediate products too.
  const group = step.startsWith(partSteps.completion + '/') ? step.slice(partSteps.completion.length + 1).split('/children/').join('/') : undefined;
  if (part && group) outputs.push(artifactPath(root, group, 'completion'), draftPath(artifactPath(root, group, 'completion')));
  if (part && step === partSteps.merge) outputs.push(join(root, 'preview.svg'), join(root, 'preview.draft.svg'));
  if (part && step === partSteps.occlusion) outputs.push(occlusionPath(root));
  const outside = outputs.filter(path => !within(root, path));
  if (outside.length) throw new Error(`${step} 的产物在管线目录之外（${outside.join('、')}），不能在此重试。`);
  for (const path of outputs) await rm(path, { force: true });
  await rm(stepDirectory, { recursive: true, force: true });
  await rm(join(root, 'agents', 'steps', step), { recursive: true, force: true });
  const attempts = await clearAgentAttempts(root, stepDirectory);
  return `${step}：已删除步骤产物、会话${attempts ? `和 ${attempts} 次 agent 尝试记录` : ''}；下次运行重做该步骤，依赖它的后续步骤随之重跑。`;
}

// Each agent call leaves agents/<time>-<name>-*/ (request, events, CLI data) and a
// sessions.json entry. A retried step drops the ones whose output went to that step,
// so its new agent does not find and repeat the earlier attempts. Attempts with no
// recorded output directory are kept: their step is unknown.
async function clearAgentAttempts(root: string, stepDirectory: string): Promise<number> {
  const agents = join(root, 'agents'), taskRoot = taskRootOf(root);
  const inside = (directory: string, path: unknown) => {
    if (typeof path !== 'string') return false;
    try { return within(directory, fromTaskPath(taskRoot, path)); } catch { return false; }
  };
  const inStep = (path: unknown) => inside(stepDirectory, path);
  let entries;
  try { entries = await readdir(agents, { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0; throw error; }
  const removed: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'steps') continue;
    let request;
    try { request = JSON.parse(await readFile(join(agents, entry.name, 'request.json'), 'utf8')); } catch { continue; }
    if (!inStep(request?.outputDirectory ?? request?.task?.outputDirectory)) continue;
    await rm(join(agents, entry.name), { recursive: true, force: true });
    removed.push(join(agents, entry.name));
  }
  const file = join(agents, 'sessions.json');
  let sessions: Record<string, { data?: string; workspace?: string }>;
  try { sessions = JSON.parse(await readFile(file, 'utf8')); } catch { return removed.length; }
  const kept = Object.fromEntries(Object.entries(sessions).filter(([, session]) =>
    !inStep(session?.workspace) && !removed.some(directory => inside(directory, session?.data))));
  if (Object.keys(kept).length !== Object.keys(sessions).length) {
    const temporary = `${file}.retry.tmp`;
    await writeFile(temporary, JSON.stringify(kept, null, 2), { mode: 0o600 }); await rename(temporary, file);
  }
  return removed.length;
}
