import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { readStep } from '../step-chain.ts';
import { stageStep } from './preparation-steps.ts';

// The base-subject step either draws a dress-up base body or copies the
// simplified reference. Without a dress-up nothing is worn to strip, so the
// clothing lane, raster step03 and the assembly agent are skipped.
// The decision sits beside the step's records, outside its fingerprinted outputs.
export type DressupDecision = { version: 1; dressed: boolean; reason: string };

const baseStep = (taskRoot: string) => join(taskRoot, 'part-layering', stageStep('base'));
export const dressupDecisionPath = (taskRoot: string) => join(baseStep(taskRoot), 'decision.json');

export function checkDressupDecision(value: unknown): asserts value is DressupDecision {
  const decision = value as DressupDecision | null;
  if (!decision || decision.version !== 1 || typeof decision.dressed !== 'boolean' || typeof decision.reason !== 'string')
    throw new Error('素体换装判断记录无效：' + JSON.stringify(value));
}

// undefined until the base-subject step has completed.
export async function readDressup(taskRoot: string): Promise<boolean | undefined> {
  if ((await readStep(baseStep(taskRoot), taskRoot)).status !== 'completed') return;
  try {
    const decision: unknown = JSON.parse(await readFile(dressupDecisionPath(taskRoot), 'utf8'));
    checkDressupDecision(decision);
    return decision.dressed;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  // Runs from before the decision was recorded: a reused reference is a pixel copy.
  const references = join(taskRoot, 'part-layering', 'references');
  const simplified = join(references, 'simplified-subject.png'), base = join(references, 'base-subject.png');
  if (!await stat(simplified).catch(() => undefined) || !await stat(base).catch(() => undefined)) return;
  const [a, b] = await Promise.all([simplified, base].map(path =>
    sharp(path).autoOrient().ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  return !(a!.info.width === b!.info.width && a!.info.height === b!.info.height && a!.data.equals(b!.data));
}
