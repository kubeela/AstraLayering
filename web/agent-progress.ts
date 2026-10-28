import { lstat, readFile } from 'node:fs/promises';
import { safePath } from './files.ts';
import { rateLimitWaitFile } from '../.agents/skills/live2d-maker/shared/codex/agent-log.ts';

// throttledUntil: the call holds its slot while waiting out a 429 until then.
export type AgentCall = { name: string; step: string; request: string; mtime: number; finished: boolean; failed: boolean; throttledUntil?: number };
export const throttled = (call: AgentCall, now = Date.now()) => !call.finished && (call.throttledUntil ?? 0) > now;
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
        const wait = request.replace(/request.json$/, rateLimitWaitFile);
        const throttledUntil = !finished && files.has(wait)
          ? Date.parse(JSON.parse(await readFile(await safePath(directory, wait), 'utf8')).until) || undefined : undefined;
        calls.push({ name: cached.name, step: cached.step, request, mtime: info.mtimeMs, finished, failed, ...(throttledUntil ? { throttledUntil } : {}) });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push(request + ': ' + String(error));
      }
    }));
  }
  return calls.sort((a, b) => a.mtime - b.mtime);
}
