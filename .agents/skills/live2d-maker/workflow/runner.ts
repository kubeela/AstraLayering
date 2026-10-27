import { fork, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTaskLog, readTaskLog } from './log.ts';
import { formatAgentError } from '../shared/codex/diagnostics.ts';
import { fromTaskPath, toTaskPath } from '../shared/task-paths.ts';
import type { PipelineId } from '../shared/paths.ts';
import { checkKrita, type KritaInstallation } from '../shared/raster/krita.ts';
import type { PipelineResult } from './pipelines.ts';
import { acquireTaskLock, configureRun, directoryFor, now, saveRun, selectedPipelines, type TaskOptions, type TaskRun } from './state.ts';
import { loadWorkflowEnvironment, type WorkflowEnvironment } from '../shared/codex/environment.ts';
import { pipelineAgentSteps, preflightAgentSteps } from '../shared/agents/preflight.ts';
import { clearTaskStop, watchTaskStop } from './control.ts';
import { requireKrita } from './krita.ts';
import { readDressup } from '../shared/part/dressup.ts';
import { AgentSlotPool, agentSlotsVariable } from './agent-slots.ts';

export type PipelineExecution = (id: PipelineId, run: TaskRun, context: {
  signal: AbortSignal; progress(message: string): void; started(pid: number): Promise<void>;
  // The task's agent slots, shared by every pipeline worker it starts.
  slots?: AgentSlotPool;
}) => Promise<PipelineResult>;

function terminate(child: ChildProcess, force = false) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', ...(force ? ['/F'] : [])], { stdio: 'ignore' });
    killer.on('error', () => child.kill(force ? 'SIGKILL' : 'SIGTERM'));
  } else {
    try { process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
  }
}
export const executeChild: PipelineExecution = async (id, run, context) => {
  context.signal.throwIfAborted();
  const directory = directoryFor(run);
  return new Promise<PipelineResult>((resolve, reject) => {
    const child = fork(fileURLToPath(new URL('./pipeline-worker.ts', import.meta.url)), [directory, run.name, id, run.runner!.id], {
      cwd: directory, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: context.slots ? { ...process.env, [agentSlotsVariable]: 'ipc' } : process.env,
    });
    context.slots?.attach(child);
    let result: PipelineResult | undefined, failure = '', output = '', killTimer: NodeJS.Timeout | undefined;
    const abort = () => { terminate(child); killTimer = setTimeout(() => terminate(child, true), 10_000); killTimer.unref(); };
    context.signal.addEventListener('abort', abort, { once: true });
    for (const stream of [child.stdout, child.stderr]) stream!.on('data', data => {
      const text = String(data); output = (output + text).slice(-64 * 1024); context.progress(text.trimEnd());
    });
    child.on('message', message => {
      const value = message as { type?: string; result?: PipelineResult; message?: string };
      if (value.type === 'result') result = value.result;
      if (value.type === 'failure') failure = value.message ?? '';
    });
    child.once('spawn', () => { void context.started(child.pid!).catch(error => { failure = formatAgentError(error); abort(); }); });
    child.once('error', error => { failure = formatAgentError(error); });
    child.once('close', (code, signal) => {
      context.signal.removeEventListener('abort', abort);
      if (killTimer) clearTimeout(killTimer);
      if (context.signal.aborted) reject(context.signal.reason);
      else if (code === 0 && result && !failure) resolve(result);
      else reject(new Error(failure || ('管线退出但未交付完成结果：' + id + ' (code=' + code + ', signal=' + signal + ')\n' + output)));
    });
    if (context.signal.aborted) abort();
  });
};

const clothingSkipped = '素体换装沿用了简化参考，没有衣服需要拆分和绘制，跳过';

export async function runTask(options: TaskOptions, dependencies: {
  execute?: PipelineExecution; signal?: AbortSignal; progress?: (message: string) => void;
  ready?: (run: TaskRun) => void;
  // Called instead of waiting for ready when the preflight has to build the
  // patched Codex: the task lock is held and the run is recorded as running, so
  // a launcher can confirm the start; the build and its outcome go to the log.
  preparing?: (run: TaskRun) => void;
  environment?: WorkflowEnvironment;
  preflight?: (path: string) => Promise<KritaInstallation>;
  save?: typeof saveRun;
} = {}): Promise<TaskRun> {
  const directory = directoryFor(options);
  const release = await acquireTaskLock(directory);
  const stopController = new AbortController();
  const signal = dependencies.signal ? AbortSignal.any([dependencies.signal, stopController.signal]) : stopController.signal;
  let stopWatching: (() => void) | undefined;
  let run: TaskRun | undefined, pending = Promise.resolve();
  const log = createTaskLog(directory, dependencies.progress);
  const persist = () => {
    const snapshot = structuredClone(run!);
    const operation = pending.then(() => (dependencies.save ?? saveRun)(directory, snapshot));
    // A failed snapshot is reported to its caller, but cannot poison later saves.
    pending = operation.catch(() => {});
    return operation;
  };
  const progress = (message: string) => {
    if (!message) return;
    run!.lastMessage = message;
    log.write(message);
    void persist().catch(error => log.write('状态保存失败，将在后续更新重试：' + formatAgentError(error)));
  };
  try {
    const environment = !dependencies.execute || dependencies.environment ? dependencies.environment ?? loadWorkflowEnvironment() : undefined;
    // Krita is checked before the run is recorded as running, and before the agent
    // preflight: it is quick, while that may build the patched Codex. A refusal
    // leaves run.json as it was.
    const configured = await configureRun(options, directory);
    await requireKrita(configured, !!options.krita, dependencies.preflight ?? (path => checkKrita(path, undefined, environment?.codex.env)));
    run = configured;
    run.status = 'running'; delete run.error; delete run.output; delete run.activePipeline;
    run.runner = { id: randomUUID(), pid: process.pid, startedAt: now(), stopProtocol: 'file-v1' };
    const slots = new AgentSlotPool(run.jobs);
    await persist();
    stopWatching = watchTaskStop(directory, run.runner.id, stopController,
      error => log.write('停止请求读取失败：' + formatAgentError(error)));
    const selected = selectedPipelines(run.from, run.to);
    if (environment) {
      const standard = run.standard;
      await preflightAgentSteps(environment, selected.flatMap(id => pipelineAgentSteps(id, standard, run!.shadowMode)), { krita: run.krita, runsRoot: dirname(directory), progress,
        building: () => { progress('准备中：构建补丁版 Codex，完成后自动开始；构建期间的停止请求在构建结束后生效。'); dependencies.preparing?.(run!); } });
    }
    signal.throwIfAborted();
    dependencies.ready?.(run);
    progress('总调度启动：' + directory + '；路线：' + selectedPipelines(run.from, run.to).join(' → '));
    for (const id of selectedPipelines(run.from, run.to)) {
      signal.throwIfAborted();
      // Once drawing has started, its upstream structural corrections are authoritative.
      const downstream = id === 'part-layering' ? 'raster-layering'
        : id === 'clothing-part-layering' ? 'clothing-raster-layering' : undefined;
      if (downstream && selectedPipelines(run.from, run.to).includes(downstream)
        && run.pipelines[id]?.status === 'completed' && !run.pipelines[id]!.skipped && run.pipelines[downstream]
        && run.pipelines[downstream]!.status !== 'pending') {
        progress('沿用已完成的分层产物及绘画阶段保存的结构修正：' + id);
        continue;
      }
      // Without a dress-up nothing is worn to separate. A clothing lane that
      // had already completed is kept as it is.
      if ((id === 'clothing-part-layering' || id === 'clothing-raster-layering') && await readDressup(directory) === false
        && !(run.pipelines[id]?.status === 'completed' && !run.pipelines[id]!.skipped)) {
        run.pipelines[id] = { status: 'completed', skipped: true, updatedAt: now(), summary: clothingSkipped };
        await persist();
        progress(id + '：' + clothingSkipped);
        continue;
      }
      run.activePipeline = id;
      run.pipelines[id] = { status: 'running', updatedAt: now() };
      await persist();
      progress('启动或恢复：' + id + '；由该管线校验已有产物和完成标记。');
      const result = await (dependencies.execute ?? executeChild)(id, run, {
        signal, progress, slots, started: async pid => { run!.runner!.childPid = pid; await persist(); },
      });
      delete run.runner.childPid;
      run.pipelines[id] = { status: 'completed', updatedAt: now(), summary: result.summary };
      run.output = result.output && toTaskPath(directory, result.output);
      await persist();
      progress(id + '：已完成');
    }
    run.status = 'completed'; delete run.activePipeline;
    progress('所选路线已完成。交付：' + (run.output ? fromTaskPath(directory, run.output) : directory));
    return run;
  } catch (error) {
    if (run) {
      run.status = signal.aborted ? 'interrupted' : 'failed';
      run.error = formatAgentError(error);
      if (run.activePipeline) run.pipelines[run.activePipeline] = { status: 'failed', updatedAt: now(), summary: run.error };
      progress(run.error);
    } else log.write(formatAgentError(error));
    throw error;
  } finally {
    stopWatching?.();
    try {
      if (run?.runner) { delete run.runner.childPid; run.runner.finishedAt = now(); await persist(); }
      await pending;
    } finally {
      try { if (run?.runner) await clearTaskStop(directory, run.runner.id); }
      finally { try { await log.flush(); } finally { await release(); } }
    }
  }
}

export async function lastLog(directory: string): Promise<string> {
  return (await readTaskLog(directory)).text;
}
