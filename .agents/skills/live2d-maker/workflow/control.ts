import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { directoryFor, readRun, taskStatus, type TaskOptions, type TaskRun } from './state.ts';

type LegacyWorker = { token?: string; runnerId?: string };
export const stopRequestPath = (directory: string) => join(directory, '.stop-request.json');
async function optionalJSON(path: string) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
async function writeJSON(path: string, value: unknown) {
  const temporary = path + '.' + randomUUID() + '.tmp';
  try { await writeFile(temporary, JSON.stringify(value) + '\n', { mode: 0o600 }); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
}

export function taskStopMethod(runner: TaskRun['runner'], alive: boolean, locked: boolean,
  worker?: LegacyWorker, platform: NodeJS.Platform = process.platform): 'request' | 'web-request' | 'signal' | undefined {
  if (!alive || !locked || !runner?.id) return;
  if (runner.stopProtocol === 'file-v1') return 'request';
  // Keep already-running workers controllable without restarting their model calls.
  if (worker?.token && worker.runnerId === runner.id) return 'web-request';
  if (platform !== 'win32') return 'signal';
}

export async function requestTaskStop(options: Pick<TaskOptions, 'name' | 'dir'>) {
  const directory = directoryFor(options), live = await taskStatus(options);
  const worker: LegacyWorker | undefined = await optionalJSON(join(directory, '.web-worker.json'));
  const method = taskStopMethod(live.runner, live.runnerAlive, live.lockHeld, worker);
  if (!method) throw new Error('当前没有可停止的运行任务');
  if (method === 'request') await writeJSON(stopRequestPath(directory), { runnerId: live.runner!.id });
  else if (method === 'web-request') await writeJSON(join(directory, '.web-cancel.json'), { token: worker!.token });
  else {
    const current = await readRun(directory, options.name);
    if (current?.runner?.id !== live.runner!.id || current.runner.pid !== live.runner!.pid || current.runner.finishedAt) {
      throw new Error('运行任务已改变，请刷新页面后重试');
    }
    process.kill(current.runner.pid, 'SIGTERM');
  }
}

export function watchTaskStop(directory: string, runnerId: string, controller: AbortController, onError: (error: unknown) => void) {
  let polling = false;
  const timer = setInterval(async () => {
    if (polling || controller.signal.aborted) return;
    polling = true;
    try {
      if ((await optionalJSON(stopRequestPath(directory)))?.runnerId === runnerId) {
        controller.abort(new Error('已请求停止；保留已有产物与 thread，稍后可续跑。'));
      }
    } catch (error) { onError(error); }
    finally { polling = false; }
  }, 1000);
  return () => clearInterval(timer);
}

export async function clearTaskStop(directory: string, runnerId: string) {
  if ((await optionalJSON(stopRequestPath(directory)))?.runnerId === runnerId) await rm(stopRequestPath(directory), { force: true });
}
