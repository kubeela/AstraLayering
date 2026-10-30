// Submits one Python file to a section Krita's bridge and waits for its
// result. Shared by submit.mjs (shell) and the krita tool.
import { copyFile, readFile, rename, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export class BridgeError extends Error {}

const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; } };

// Resolves to the bridge's result object ({ok, result, stdout, stderr, error,
// hints, dialogs, seconds}); throws BridgeError when there is no result.
export async function submitJob(bridge, script, { timeoutSeconds = 600, signal } = {}) {
  let ready;
  try { ready = JSON.parse(await readFile(join(bridge, 'ready.json'), 'utf8')); }
  catch { throw new BridgeError(`桥接目录没有 ready.json：${bridge}。这个 section 的 Krita 尚未启动或已经关闭，用 krita 工具 start。`); }
  if (!alive(ready.pid)) throw new BridgeError(`Krita 进程 ${ready.pid} 已退出，用 krita 工具 restart 重启。`);
  const id = `${Date.now()}-${basename(script).replace(/[^\w.-]/g, '_').replace(/\.py$/, '')}-${randomUUID().slice(0, 8)}`;
  const jobs = ready.jobs ?? join(bridge, 'jobs'), staged = join(jobs, `${id}.py.tmp`);
  await copyFile(script, staged);
  await rename(staged, join(jobs, `${id}.py`));
  const until = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < until) {
    signal?.throwIfAborted();
    try { return { id, ...JSON.parse(await readFile(join(jobs, `${id}.json`), 'utf8')) }; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!alive(ready.pid)) throw new BridgeError(`Krita 进程 ${ready.pid} 在执行 ${id} 时退出（脚本可能使它崩溃）。用 krita 工具 restart 重启；未保存的文档和 session 变量已丢失，从已保存的文件重新打开。`);
    await delay(100);
  }
  const running = await stat(join(jobs, `${id}.running`)).then(() => true, () => false);
  throw new BridgeError(running
    ? `任务 ${id} 超过 ${timeoutSeconds} 秒仍在执行，Krita 的界面线程被它占用，之后的任务会排队；结果仍会写到 ${join(jobs, id + '.json')}。确认卡死时用 krita 工具 restart。`
    : `任务 ${id} 在 ${timeoutSeconds} 秒内没有开始：前一个任务仍在占用这个 Krita。`);
}
