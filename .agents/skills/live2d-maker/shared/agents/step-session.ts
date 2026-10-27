import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Harness } from './models.ts';
import { readStep } from '../step-chain.ts';
import { taskRootOf } from '../task-paths.ts';

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

// Raster run.json fields from before per-step sessions; migrated on the next
// run or recovery action.
type LegacyRun = { version?: number; threadId?: string | null; threadHarness?: Harness; threadStep?: string; threadHandoff?: ThreadHandoff };

export const sessionPath = (pipeline: string, step: string) => join(pipeline, 'agents', 'steps', step, 'session.json');
const active = (session: StepSession | undefined) => !!(session?.threadId || session?.handoff);

async function readJson<T>(path: string): Promise<T | undefined> {
  try { return JSON.parse(await readFile(path, 'utf8')) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
}

export async function readStepSession(pipeline: string, step: string): Promise<StepSession | undefined> {
  const saved = await readJson<StepSession>(sessionPath(pipeline, step))
    // Part steps once kept the session inside the step directory.
    ?? await readJson<StepSession>(join(pipeline, step, 'session.json'));
  if (saved) return saved;
  const legacy = await legacySession(pipeline);
  return legacy?.step === step ? legacy.session : undefined;
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
  await rm(join(pipeline, step, 'session.json'), { force: true });
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

// The legacy run.json thread belonged to threadStep; before threadStep it was
// step01's, and a handoff without a thread targeted the running step.
async function legacySession(pipeline: string): Promise<{ step: string; session: StepSession } | undefined> {
  const run = await readJson<LegacyRun>(join(pipeline, 'run.json'));
  return run?.version === 2 ? legacyOwner(pipeline, run) : undefined;
}
async function legacyOwner(pipeline: string, run: LegacyRun): Promise<{ step: string; session: StepSession } | undefined> {
  if (!run.threadId && !run.threadHandoff) return;
  let step = run.threadStep ?? (run.threadId ? 'step01' : undefined);
  if (!step) {
    const names = (await readdir(pipeline).catch(() => [] as string[])).filter(name => /^step\d{2}$/.test(name)).sort();
    for (const name of names) if ((await readStep(join(pipeline, name), taskRootOf(pipeline))).status === 'running') { step = name; break; }
  }
  if (!step) return;
  return { step, session: { ...(run.threadId ? { threadId: run.threadId } : {}), ...(run.threadHarness ? { harness: run.threadHarness } : {}),
    ...(run.threadHandoff ? { handoff: run.threadHandoff } : {}) } };
}

// Moves a legacy run.json thread into its step's session and strips the
// fields from the config; the caller saves the config. True when it changed.
export async function migrateRunSession(pipeline: string, config: LegacyRun): Promise<boolean> {
  const fields = ['threadId', 'threadHarness', 'threadStep', 'threadHandoff'] as const;
  if (!fields.some(field => field in config)) return false;
  const legacy = await legacyOwner(pipeline, config);
  if (legacy && !await readJson(sessionPath(pipeline, legacy.step))) {
    await mkdir(dirname(sessionPath(pipeline, legacy.step)), { recursive: true });
    await writeFile(sessionPath(pipeline, legacy.step), JSON.stringify(legacy.session, null, 2) + '\n');
  }
  for (const field of fields) delete config[field];
  return true;
}

// The same migration applied to the pipeline's run.json on disk.
export async function migrateRunFile(pipeline: string): Promise<void> {
  const file = join(pipeline, 'run.json'), config = await readJson<LegacyRun>(file);
  if (config?.version !== 2 || !await migrateRunSession(pipeline, config)) return;
  await writeFile(`${file}.tmp`, JSON.stringify(config, null, 2) + '\n');
  await rename(`${file}.tmp`, file);
}
