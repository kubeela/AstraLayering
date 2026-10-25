import { cp, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { beginStep, completeStep, readStep, stepInputs, type ChainStep } from '../step-chain.ts';
import { completionReferenceGroups } from './completion-inputs.ts';
import { groupStep, initialStepId, layerStep, layerStepId, parentGroupId } from './part-steps.ts';

// Runs of the earlier layout kept every stage flat under stages/<stage>/<id>.*,
// with the tree and children analyses in groups.json. They convert once into
// step directories: each finished stage becomes a completed step in dependency
// order, so the stamps chain as if the steps had run here, and the first
// unfinished stage is what the next run picks up. stages/ is kept as
// stages.legacy; parts/ stays where it is. A marker makes an interrupted
// conversion start over.
type LegacyGroup = { id: string; name?: string; note?: string; kind?: string; metadata?: unknown; childrenAnalysis?: { note?: string }; groups?: LegacyGroup[] };

export async function migrateLegacyLayout(directory: string, promptsDirectory?: string): Promise<boolean> {
  const stages = join(directory, 'stages'), marker = join(directory, '.legacy-migration');
  if (!await exists(stages)) return false;
  if ((await readStep(join(directory, initialStepId))).status === 'completed' && !await exists(marker)) return false;
  const legacy = JSON.parse(await readFile(join(directory, 'groups.json'), 'utf8')) as { subject?: unknown; groups?: LegacyGroup[] };
  if (!Array.isArray(legacy?.groups) || !legacy.groups.length) throw new Error(`旧版目录缺少可转换的 groups.json：${directory}`);
  await writeFile(marker, '');
  for (const entry of ['initial', 'groups', 'layers', 'merge', 'occlusion']) await rm(join(directory, entry), { recursive: true, force: true });
  const lookup = (id: string): ChainStep => ({ id, directory: join(directory, id), dependsOn: [] });
  const finish = async (step: ChainStep, write: () => Promise<void>) => {
    await beginStep(step.directory, await stepInputs(step, lookup));
    await write();
    await completeStep(step, lookup);
  };
  const seed = ({ groups, childrenAnalysis, ...rest }: LegacyGroup) => ({ ...rest, kind: rest.kind ?? 'group' });
  const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
  const legacyFile = (stage: string, name: string) => join(stages, stage, name);

  const initial: ChainStep = { id: initialStepId, directory: join(directory, initialStepId), dependsOn: [], outputs: ['groups.json'] };
  await finish(initial, () => writeFile(join(initial.directory, 'groups.json'),
    json({ ...(legacy.subject !== undefined ? { subject: legacy.subject } : {}), groups: legacy.groups!.map(seed) })));

  // One depth at a time, like the scheduler: a layer converts only when every
  // group of it has its outline, and a split only when its part is complete.
  let layer = legacy.groups;
  for (let depth = 0; layer.length; depth++) {
    const outlined: string[] = [];
    for (const group of layer) {
      const outline = legacyFile('outline', `${group.id}.svg`);
      if (!await exists(outline)) continue;
      const step = groupStep(directory, group.id, 1);
      await finish(step, async () => {
        await mkdir(step.directory, { recursive: true });
        await cp(outline, join(step.directory, 'outline.svg'));
        const repairs = legacyFile('outline', `${group.id}.repairs`);
        if (await exists(repairs)) await cp(repairs, join(step.directory, 'outline.repairs'), { recursive: true });
        const review = legacyFile('review', `${group.id}.review.json`);
        if (await exists(review)) await cp(review, join(step.directory, 'review.json'));
      });
      outlined.push(group.id);
    }
    const ids = layer.map(group => group.id);
    if (outlined.length !== ids.length) break;
    const reduced = await Promise.all(ids.map(id => exists(legacyFile('outline-reduce', `${id}.svg`))));
    if (reduced.includes(false)) break;
    const reduction = layerStep(directory, depth, ids);
    await finish(reduction, async () => {
      for (const id of ids) {
        await mkdir(join(directory, layerStepId(depth), parentGroupId(id) ?? ''), { recursive: true });
        await cp(legacyFile('outline-reduce', `${id}.svg`), join(reduction.directory, `${id}.svg`));
      }
    });
    const next: LegacyGroup[] = [];
    for (const group of layer) {
      const check = legacyFile('completion-check', `${group.id}.json`);
      if (!await exists(join(directory, 'parts', `${group.id}.svg`)) || !await exists(check)) continue;
      const references = await completionReferenceGroups(group.id, parentGroupId(group.id), promptsDirectory);
      const completion = groupStep(directory, group.id, 2, references);
      await finish(completion, async () => {
        await mkdir(completion.directory, { recursive: true });
        await cp(check, join(completion.directory, 'check.json'));
      });
      const split = groupStep(directory, group.id, 3);
      // Parts never had an analysis; their split is the empty one the scheduler writes.
      // A group without one had its split started right after its part, and it
      // failed or was interrupted: it stays a running step to continue or retry.
      if (!group.childrenAnalysis && group.kind !== 'part') {
        await beginStep(split.directory, await stepInputs(split, lookup));
        continue;
      }
      const children = group.groups ?? [];
      await finish(split, async () => {
        await mkdir(split.directory, { recursive: true });
        await writeFile(join(split.directory, 'children.json'), json({ groupId: group.id, groups: children.map(seed),
          ...(group.childrenAnalysis?.note ? { note: group.childrenAnalysis.note } : {}) }));
      });
      next.push(...children);
    }
    layer = next;
  }
  const backup = await exists(join(directory, 'stages.legacy')) ? `stages.legacy-${Date.now()}` : 'stages.legacy';
  await rename(stages, join(directory, backup));
  await rm(marker, { force: true });
  return true;
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
