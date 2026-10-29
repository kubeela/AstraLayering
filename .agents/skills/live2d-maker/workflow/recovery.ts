import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline as character } from '../raster-layering/run.ts';
import { pipeline as clothing } from '../clothing-raster-layering/run.ts';
import { pipeline as assembly } from '../character-assembly/run.ts';
import { makePipeline as shadowPipeline } from '../shadow/run.ts';
import { inspectRun, loadConfig } from '../shared/raster/run-store.ts';
import { readStepSession, writeStepSession } from '../shared/agents/step-session.ts';
import { resolveInput, type PipelineId } from '../shared/paths.ts';
import { toTaskPath } from '../shared/task-paths.ts';
import { acquireTaskLock, directoryFor, now, readRun, type TaskOptions } from './state.ts';

export async function replaceThread(options: Pick<TaskOptions, 'name' | 'dir'> & {
  pipeline: PipelineId; handoff: string; reason: string;
}): Promise<string> {
  const regular = [character, clothing, assembly].find(value => value.id === options.pipeline);
  if (!regular && options.pipeline !== 'shadow') throw new Error('--replace-thread 仅适用于 raster、character-assembly 或 shadow；part 根据文件恢复。');
  if (!options.reason.trim()) throw new Error('更换 thread 必须提供非空 --reason。');
  const directory = directoryFor(options);
  const release = await acquireTaskLock(directory);
  try {
    const mode = options.pipeline === 'shadow' ? (await readRun(directory, options.name))?.shadowMode : undefined;
    if (options.pipeline === 'shadow' && !mode) throw new Error('阴影换会话需要总控记录中的 shadowMode；不能猜测目标模式。');
    const pipeline = mode ? shadowPipeline(mode) : regular!;
    const target = join(directory, pipeline.id);
    const config = await loadConfig<unknown>(target, options.name, pipeline.validateInput);
    if (!config) throw new Error('缺少管线配置：' + target);
    const plan = await inspectRun(target, pipeline.steps);
    if (plan.resetFrom !== undefined) throw new Error('当前已请求重跑步骤；不能同时替换 thread。请保留原标记并先明确恢复范围。');
    const step = [...plan.statuses].find(([, status]) => status === 'running')?.[0];
    if (!step) throw new Error('没有 .running 步骤；只为中断的绘制任务更换 thread。');
    const session = await readStepSession(target, step);
    if (!session?.threadId) throw new Error(`${step} 没有可替换的绘制 threadId：` + target);
    const notes = await readFile(resolveInput(options.name, options.handoff, options.dir), 'utf8');
    if (!notes.trim()) throw new Error('交接记录不能为空。');
    const id = randomUUID(), archive = join(target, 'recovery', id);
    await mkdir(archive, { recursive: true });
    await writeFile(join(archive, 'session-before.json'), JSON.stringify({ step, ...session }, null, 2) + '\n');
    await writeFile(join(archive, 'handoff.md'), notes);
    // Normal continuation overwrites the current attempt's prompt/result/error and
    // unfinished reports. Preserve these too; append-only event logs stay in place.
    for (const [id, status] of plan.statuses) {
      if (status !== 'running') continue;
      for (const location of [id, join('agents', 'steps', id)]) {
        const source = join(target, location), saved = join(archive, location);
        const entries = await readdir(source, { withFileTypes: true }).catch(error => { if (error.code !== 'ENOENT') throw error; return []; });
        await mkdir(saved, { recursive: true });
        for (const entry of entries) {
          if (entry.isFile() && (/^(prompt\.md|result\.json|error\.txt)$/.test(entry.name)
            || /\.(prompt\.txt|result\.json|md\.tmp)$/.test(entry.name))) {
            await copyFile(join(source, entry.name), join(saved, entry.name));
          }
        }
      }
    }
    // The running step continues in a new thread that first reads the handoff.
    await writeStepSession(target, step, { handoff: {
      id, previousThreadId: session.threadId, notes: toTaskPath(directoryFor(options), join(archive, 'handoff.md')),
      reason: options.reason.trim(), createdAt: now(),
    } }, '更换 thread：' + options.reason.trim());
    return archive;
  } finally { await release(); }
}
