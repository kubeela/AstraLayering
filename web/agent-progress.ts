import { lstat, readFile } from 'node:fs/promises';
import { safePath } from './files.ts';
import { retryWaitFile } from '../.agents/skills/live2d-maker/shared/codex/agent-log.ts';

// throttledUntil: the call holds its slot while waiting to retry until then; rateLimited when the service returned 429.
export type AgentCall = { name: string; step: string; request: string; mtime: number; finished: boolean; failed: boolean; throttledUntil?: number; rateLimited?: boolean };
export const throttled = (call: AgentCall, now = Date.now()) => !call.finished && (call.throttledUntil ?? 0) > now;
export const retryReason = (call: AgentCall) => call.rateLimited ? '服务返回 429' : '服务临时错误';
const requests = new Map<string, { version: string; name: string; step: string }>();

// A request is recorded after acquiring a slot. Read these records, never infer activity from a draft.
export async function currentAgentCalls(directory: string, pipeline: string, files: Set<string>,
  errors: string[], activeSince?: string, readFailures = false): Promise<AgentCall[]> {
  if (!activeSince) return [];
  const since = Date.parse(activeSince), calls: AgentCall[] = [];
  const paths = [...files].filter(path => path.startsWith(pipeline + '/agents/') && path.endsWith('/request.json'));
  for (let offset = 0; offset < paths.length; offset += 16) {
    await Promise.all(paths.slice(offset, offset + 16).map(async request => {
      try {
        const path = await safePath(directory, request), info = await lstat(path);
        if (info.mtimeMs < since) return;
        const version = `${info.mtimeMs}:${info.size}`;
        let cached = requests.get(path);
        if (cached?.version !== version) {
          const value = JSON.parse(await readFile(path, 'utf8'));
          cached = { version, name: value.task?.name ?? value.name ?? '', step: value.task?.step ?? '' };
          if (requests.size >= 2048) requests.delete(requests.keys().next().value!);
          requests.set(path, cached);
        }
        const result = request.replace(/request.json$/, 'result.json'), finished = files.has(result);
        const failed = readFailures && finished
          ? JSON.parse(await readFile(await safePath(directory, result), 'utf8')).status === 'failed' : false;
        const waitPath = request.replace(/request.json$/, retryWaitFile);
        const wait = !finished && files.has(waitPath) ? JSON.parse(await readFile(await safePath(directory, waitPath), 'utf8')) : undefined;
        const throttledUntil = Date.parse(wait?.until) || undefined;
        calls.push({ name: cached.name, step: cached.step, request, mtime: info.mtimeMs, finished, failed,
          ...(throttledUntil ? { throttledUntil, rateLimited: wait.reason === 'rate-limit' } : {}) });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push(request + ': ' + String(error));
      }
    }));
  }
  return calls.sort((a, b) => a.mtime - b.mtime);
}
