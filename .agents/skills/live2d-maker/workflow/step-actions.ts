import { appendFile, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readStep, type StepStatus } from '../shared/step-chain.ts';
import { taskRootOf } from '../shared/task-paths.ts';
import { saveConfig, within, type RunConfig } from '../shared/raster/run-store.ts';
import { occlusionPath } from '../shared/part/occlusion-plan.ts';
import { artifactPath, draftPath } from '../shared/part/artifact-facts.ts';
import { shadowMode } from '../shared/shadow.ts';
import { pipelineIds, type PipelineId } from '../shared/paths.ts';
import { acquireTaskLock, directoryFor, now, pipelineId, readRun, type TaskOptions } from './state.ts';

// Per-step recovery for an interrupted or failed step, by any client (web, CLI):
//   continue: change nothing; the next run continues the step with its
//             products and session.
//   resume:   drop the step's session and keep its products, so the next run
//             continues them in a new session.
//   retry:    reset the step (directory, declared outputs and session); the
//             next run reruns it, and the steps built on it rerun with it.
// Part steps keep their session in agents/steps/<step>/session.json; raster-style pipelines
// keep the current step's drawing thread in run.json (threadStep names its step). Steps without a session (one-shot
// agents) simply rerun when they have no product, so resume equals continue.
// The empty step id continues the whole pipeline.
export const stepActions = ['continue', 'resume', 'retry'] as const;
export type StepAction = typeof stepActions[number];
export type StepEntry = { id: string; status: Exclude<StepStatus, 'absent'>; session: boolean };

const partPipelines: readonly PipelineId[] = ['part-layering', 'clothing-part-layering'];
const safeSegment = (segment: string) => !!segment && segment !== '.' && segment !== '..' && !/[\\\0]/.test(segment);
// Step ids are the step directories relative to the pipeline (see part-steps.ts and step-section.ts).
export function validStepId(pipeline: PipelineId, id: string): boolean {
  if (typeof id !== 'string' || !id.split('/').every(safeSegment)) return false;
  if (!partPipelines.includes(pipeline)) return /^step\d{2}$/.test(id);
  return /^(initial\/step01|merge|occlusion|layers\/depth\d{2}|preparation\/step\d{2})$/.test(id)
    || /^groups\/[^/]+(\/children\/[^/]+)*\/step0[123]$/.test(id);
}

export async function pipelineRoot(directory: string, pipeline: PipelineId, name: string): Promise<string> {
  if (pipeline !== 'shadow') return join(directory, pipeline);
  return join(directory, pipeline, shadowMode((await readRun(directory, name))?.shadowMode));
}

const exists = (path: string) => readFile(path).then(() => true, error => {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error;
});

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
    steps.push({ id, status, session: partPipelines.includes(pipeline) &&
      (await exists(join(root, 'agents', 'steps', id, 'session.json')) || await exists(join(root, id, 'session.json'))) });
  }
  return steps;
}

async function readConfig(root: string): Promise<RunConfig<unknown>> {
  const config = JSON.parse(await readFile(join(root, 'run.json'), 'utf8')) as RunConfig<unknown>;
  if (config?.version !== 2) throw new Error('无效的管线配置：' + join(root, 'run.json'));
  return config;
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
    const root = await pipelineRoot(directory, pipeline, options.name);
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
      const root = await pipelineRoot(directory, pipeline, options.name);
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
    const reason = '网页恢复：清除会话，保留产物';
    if (part) {
      const session = await exists(join(root, 'agents', 'steps', step, 'session.json'))
        ? join(root, 'agents', 'steps', step, 'session.json') : join(stepDirectory, 'session.json');
      if (!await exists(session)) return `${step} 没有保存的会话，恢复等同继续：下次运行沿用产物。`;
      const saved = JSON.parse(await readFile(session, 'utf8'));
      await appendFile(session + '.history.jsonl', JSON.stringify({ ...saved, replacedAt: now(), reason }) + '\n');
      await rm(session);
      await rm(join(stepDirectory, 'session.json'), { force: true });
      return `${step}：已清除会话${saved.threadId ? ' ' + saved.threadId : ''}，保留产物；下次运行在新会话中继续。`;
    }
    const config = await readConfig(root);
    if (!config.threadId && !config.threadHandoff) return `${pipeline} 没有保存的绘制 thread，恢复等同继续：下次运行沿用产物。`;
    // Another step's thread is left alone; this step starts its own anyway.
    if (config.threadStep && config.threadStep !== step) return `${step} 没有保存的绘制 thread，恢复等同继续：下次运行沿用产物。`;
    const records = join(root, 'agents', 'steps', step);
    await mkdir(records, { recursive: true });
    await appendFile(join(records, 'attempts.jsonl'), JSON.stringify({ previousThreadId: config.threadId,
      previousHarness: config.threadHarness || 'codex', ...(config.threadHandoff ? { previousHandoff: config.threadHandoff.id } : {}), reason, at: now() }) + '\n');
    config.threadId = null;
    delete config.threadHarness;
    delete config.threadStep;
    delete config.threadHandoff;
    await saveConfig(root, config);
    return `${step}：已清除绘制 thread，保留产物；下次运行在新 thread 中继续。`;
  }
  // retry: the step directory holds its session; declared outputs may live outside it.
  const outputs = Object.keys(record?.outputs ?? {}).map(name => resolve(stepDirectory, name));
  // A running part step has no recorded outputs yet; its drafts and plans outside the
  // step directory are intermediate products too.
  const group = /^groups\/(.+)\/step02$/.exec(step)?.[1]?.split('/children/').join('/');
  if (part && group) outputs.push(artifactPath(root, group, 'completion'), draftPath(artifactPath(root, group, 'completion')));
  if (part && step === 'merge') outputs.push(join(root, 'preview.svg'), join(root, 'preview.draft.svg'));
  if (part && step === 'occlusion') outputs.push(occlusionPath(root));
  const outside = outputs.filter(path => !within(root, path));
  if (outside.length) throw new Error(`${step} 的产物在管线目录之外（${outside.join('、')}），不能在此重试。`);
  for (const path of outputs) await rm(path, { force: true });
  await rm(stepDirectory, { recursive: true, force: true });
  await rm(join(root, 'agents', 'steps', step), { recursive: true, force: true });
  return `${step}：已删除步骤产物和会话；下次运行重做该步骤，依赖它的后续步骤随之重跑。`;
}
