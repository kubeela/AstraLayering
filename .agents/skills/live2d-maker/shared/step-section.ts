import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { completeStep, inspectChain, modifiedError, resetChain, startStep, type ChainPlan, type ChainStep, type StepStatus } from './step-chain.ts';
import { stepName, stepNumber } from './step-paths.js';

// A section is one part of the section: a directory of steps stepNN or
// stepNN_<note> (step-paths.js) driven by the shared step chain. Numbers are
// fixed per step, so a step that a run does not use leaves a gap, and steps
// sharing a number are alternatives a run picks one of. Step directories left
// on disk that the run does not define (from an earlier, longer definition)
// join the chain after the step before them, so retrying upstream clears them too.
export { stepName };
// dependsOn defaults to the step before it; dependencies the run does not define are dropped.
// upstream names completed steps of another section (see SectionRun.upstream) that this step was built on.
export type SectionStep = { number: number; note?: string; dependsOn?: readonly number[]; upstream?: readonly string[]; outputs?: readonly string[] };
export type SectionPlan = ChainPlan & { chain: ChainStep[]; defined: Set<string>; resetFrom?: number };
// last: steps numbered after it belong to a later stage of the section, which
// checks them itself; the scan leaves them alone.
export type SectionScan = { scan?: boolean; last?: number; upstream?: readonly ChainStep[] };

export async function sectionChain(directory: string, root: string, steps: readonly SectionStep[], { scan = true, last = 99, upstream = [] }: SectionScan = {}): Promise<ChainStep[]> {
  const defined = new Map<number, SectionStep>();
  for (const step of steps) {
    if (!Number.isInteger(step.number) || step.number < 1 || step.number > last || defined.has(step.number)
      || [...defined.keys()].some(number => number > step.number)) throw new Error('步骤编号须为 step01–step99，从小到大且不重复。');
    if (step.dependsOn?.some(number => number >= step.number)) throw new Error(`${stepName(step.number, step.note)} 只能依赖排在它之前的步骤`);
    defined.set(step.number, step);
  }
  const names = new Map([...defined].map(([number, step]) => [number, stepName(number, step.note)]));
  if (scan) {
    let entries: string[] = [];
    try { entries = await readdir(directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    for (const name of entries.sort()) {
      const number = stepNumber(name);
      // An alternative to a defined step belongs to another run, not a leftover.
      if (number && number <= last && !names.has(number)) names.set(number, name);
    }
  }
  // Upstream steps lead the chain so their stamps are recorded and checked, but
  // the section never runs or resets them; only completed ones may be passed in.
  const chain: ChainStep[] = [...upstream], external = new Set(upstream.map(step => step.id));
  for (const number of [...names.keys()].sort((a, b) => a - b)) {
    const step = defined.get(number), previous = chain.length > upstream.length ? chain.at(-1) : undefined, id = names.get(number)!;
    const local = step?.dependsOn ? step.dependsOn.filter(dependency => defined.has(dependency)).map(dependency => names.get(dependency)!) : previous ? [previous.id] : [];
    chain.push({ id, root, directory: join(directory, id),
      dependsOn: [...(step?.upstream ?? []).filter(dependency => external.has(dependency)), ...local],
      ...(step?.outputs ? { outputs: step.outputs } : {}) });
  }
  return chain;
}

export async function inspectSection(directory: string, root: string, steps: readonly SectionStep[], options: SectionScan = {}): Promise<SectionPlan> {
  const chain = await sectionChain(directory, root, steps, options);
  const upstream = options.upstream ?? [];
  const plan = { ...await inspectChain(chain), chain, defined: new Set(steps.map(step => stepName(step.number, step.note))) };
  if (!plan.reset.length) return plan;
  // Report the break from the first missing step before it, as the gap caused it.
  let index = chain.findIndex(step => step.id === plan.reset[0]);
  while (index > upstream.length && plan.statuses.get(chain[index - 1].id) === 'absent') index--;
  return { ...plan, resetFrom: stepNumber(chain[index].id) };
}

export type SectionRun = {
  directory: string;
  // The task root, for the task-relative paths in step records.
  root: string;
  steps: readonly SectionStep[];
  dryRun?: boolean;
  signal?: AbortSignal;
  progress?: (message: string) => void;
  resetNote?: string;
  // Completed steps of the section this one reads (see SectionStep.upstream).
  upstream?: readonly ChainStep[];
  // See SectionScan.last.
  last?: number;
  // Both run after inspection and before anything changes, so they can refuse safely.
  check?(plan: SectionPlan): Promise<void>;
  keep?(step: ChainStep, plan: SectionPlan): Promise<void>;
  // Right before resets and steps run; not in a dry run.
  prepare?(plan: SectionPlan): Promise<void>;
  // The work a step still needs, or nothing for a completed step that is kept.
  // A dry run calls the work without touching markers, so it only previews.
  step(step: ChainStep, status: StepStatus, plan: SectionPlan): Promise<(() => Promise<void>) | undefined>;
};

// The one run loop: refuse modified outputs, retry what broke, then run each
// unfinished step under a .running marker and complete it with its record.
export async function runSection(run: SectionRun): Promise<SectionPlan> {
  const plan = await inspectSection(run.directory, run.root, run.steps, { last: run.last, upstream: run.upstream });
  const modified = modifiedError(plan, plan.chain);
  if (modified) throw modified;
  await run.check?.(plan);
  if (plan.resetFrom !== undefined) run.progress?.(`${run.dryRun ? '预览：将' : '将'}重置 ${plan.chain.find(step => stepNumber(step.id) === plan.resetFrom)!.id} 及依赖它的后续步骤${run.resetNote ?? ''}。`);
  for (const step of plan.chain) {
    if (plan.defined.has(step.id) && plan.statuses.get(step.id) === 'completed' && !plan.reset.includes(step.id)) await run.keep?.(step, plan);
  }
  if (!run.dryRun) {
    run.signal?.throwIfAborted();
    await run.prepare?.(plan);
    await resetChain(plan.chain, plan);
  }
  for (const id of plan.reset) plan.statuses.set(id, 'absent');
  for (const step of plan.chain) {
    if (!plan.defined.has(step.id)) continue;
    run.signal?.throwIfAborted();
    const status = plan.statuses.get(step.id)!;
    const work = await run.step(step, status, plan);
    if (!work) {
      if (status !== 'completed') throw new Error(`${step.id} 尚未完成，不能跳过`);
      continue;
    }
    if (run.dryRun) { await work(); continue; }
    await mkdir(step.directory, { recursive: true });
    await startStep(step.directory, status);
    await work();
    run.signal?.throwIfAborted();
    await completeStep(step, plan.chain);
    plan.statuses.set(step.id, 'completed');
  }
  return plan;
}
