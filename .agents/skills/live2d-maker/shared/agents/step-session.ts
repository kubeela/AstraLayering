import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Harness } from './models.ts';

// One session store for every agent step of every pipeline (part groups,
// preparation, raster stepNN, shadow): <pipeline>/agents/steps/<step>/session.json.
// A step's draw and repairs share its thread; reviewers are fresh and never saved.
// Each replaced or cleared session is appended to session.json.history.jsonl.
// Deleting agents/steps/<step> (a rerun) drops the session with the step.
export type ThreadHandoff = {
  id: string;
  previousThreadId: string;
  notes: string;
  reason: string;
  createdAt: string;
  replacementThreadId?: string;
};
export type StepSession = { threadId?: string; harness?: Harness; handoff?: ThreadHandoff };

export const sessionPath = (pipeline: string, step: string) => join(pipeline, 'agents', 'steps', step, 'session.json');
const active = (session: StepSession | undefined) => !!(session?.threadId || session?.handoff);

async function readJson<T>(path: string): Promise<T | undefined> {
  try { return JSON.parse(await readFile(path, 'utf8')) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
}

export async function readStepSession(pipeline: string, step: string): Promise<StepSession | undefined> {
  return readJson<StepSession>(sessionPath(pipeline, step));
}

export async function writeStepSession(pipeline: string, step: string, next: StepSession, reason?: string): Promise<void> {
  const path = sessionPath(pipeline, step), previous = await readStepSession(pipeline, step);
  if (active(previous) && (previous!.threadId !== next.threadId || previous!.handoff?.id !== next.handoff?.id)) {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path + '.history.jsonl', JSON.stringify({ ...previous, replacedAt: new Date().toISOString(), ...(reason ? { reason } : {}) }) + '\n');
  }
  const record: StepSession = { ...(next.threadId ? { threadId: next.threadId } : {}), ...(next.harness ? { harness: next.harness } : {}),
    ...(next.handoff ? { handoff: next.handoff } : {}) };
  if (active(record)) {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(record, null, 2) + '\n');
    await rename(temporary, path);
  } else await rm(path, { force: true });
}

// Drops the step's session, keeping its products; returns what was dropped.
export async function clearStepSession(pipeline: string, step: string, reason: string): Promise<StepSession | undefined> {
  const previous = await readStepSession(pipeline, step);
  if (active(previous)) await writeStepSession(pipeline, step, {}, reason);
  return active(previous) ? previous : undefined;
}

// The session of the running step, else of the last step that has one.
export async function currentSession(pipeline: string, steps: readonly { id: string; status: string }[]): Promise<StepSession | undefined> {
  const running = steps.find(step => step.status === 'running');
  if (running) return readStepSession(pipeline, running.id);
  for (const step of [...steps].reverse()) {
    const session = await readStepSession(pipeline, step.id);
    if (active(session)) return session;
  }
}
