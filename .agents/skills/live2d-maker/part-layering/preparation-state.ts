import { copyFile, lstat, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join, relative } from 'node:path';
import sharp from 'sharp';
import type { ChainStep } from '../shared/step-chain.ts';
import type { PreparationReferences } from '../shared/part/preparation-types.ts';

export type StandardJudgment = { needsAdjustment: boolean; reason?: string };
export type ReferenceJudgment = { needsSimplification: boolean; reason?: string };
export type PreparationStage = 'original' | 'options' | 'pose' | 'standard' | 'judgment' | 'simplified' | 'base' | 'ready';

export function checkStandardJudgment(value: unknown): asserts value is StandardJudgment {
  if (!value || typeof value !== 'object' || typeof (value as StandardJudgment).needsAdjustment !== 'boolean'
    || ((value as StandardJudgment).reason !== undefined && typeof (value as StandardJudgment).reason !== 'string')) {
    throw new Error('姿态判断须包含 boolean needsAdjustment，reason 须为字符串');
  }
}
export function checkJudgment(value: unknown): asserts value is ReferenceJudgment {
  if (!value || typeof value !== 'object' || typeof (value as ReferenceJudgment).needsSimplification !== 'boolean') {
    throw new Error('judgment must contain a boolean needsSimplification');
  }
  if ((value as ReferenceJudgment).reason !== undefined && typeof (value as ReferenceJudgment).reason !== 'string') {
    throw new Error('judgment reason must be a string');
  }
}

export async function present(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
export async function exists(path: string): Promise<boolean> {
  try { return (await lstat(path)).isFile(); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
export async function findImage(directory: string, name: string): Promise<string | undefined> {
  let names: string[];
  try { names = await readdir(directory); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  const matches: string[] = [];
  for (const file of names) {
    if (file.startsWith(`${name}.`) && !file.endsWith('.tmp') && await exists(join(directory, file))) matches.push(join(directory, file));
  }
  if (matches.length > 1) throw new Error(`Multiple ${name} images found in ${directory}`);
  return matches[0];
}

// Writes go to a temporary file first, so an interrupted step never leaves a partial output.
export async function produce(output: string, generate: (temporary: string) => Promise<void>): Promise<void> {
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await generate(temporary);
    if (!await exists(temporary)) throw new Error(`Preparation output was not produced: ${output}`);
    await rename(temporary, output);
  } finally { await rm(temporary, { force: true }); }
}
export const writeJson = (output: string, value: unknown) => produce(output, temporary =>
  writeFile(temporary, JSON.stringify(value, null, 2) + '\n', 'utf8'));
export async function copyAsPng(source: string, output: string): Promise<void> {
  const bytes = await readFile(source);
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) await copyFile(source, output);
  else await sharp(bytes).autoOrient().png().toFile(output);
}

export const stepsDirectory = (references: string) => join(references, '.steps');
export const poseJudgmentPath = (references: string) => join(stepsDirectory(references), 'pose/judgment.json');

// The preparation steps, each with its marker under references/.steps/<id> and
// its output at the existing reference path. The input original and the
// standard image take part when the task has them; older tasks made before the
// original was kept go on from their references alone. `ready` marks that the
// prepared parts were split from the current references.
export async function preparationChain(refs: PreparationReferences, standard: boolean, inputDirectory: string, source?: string): Promise<ChainStep[]> {
  const root = stepsDirectory(refs.directory);
  const original = refs.originalImage ?? (source || await present(join(root, 'original'))
    ? join(inputDirectory, `original${extname(source ?? '') || '.png'}`) : undefined);
  const withStandard = !!original || !!refs.standardImage || await present(join(root, 'standard'));
  const steps: [PreparationStage, PreparationStage[], string[]?][] = [];
  if (original) steps.push(['original', [], [original]]);
  steps.push(['options', [], [join(refs.directory, 'options.json')]]);
  if (standard && original) steps.push(['pose', ['original'], [poseJudgmentPath(refs.directory)]]);
  if (withStandard) steps.push(['standard', ['original', 'options', 'pose'], [join(refs.directory, 'standard.png')]]);
  steps.push(['judgment', ['standard'], [refs.judgment]], ['simplified', ['standard', 'judgment'], [refs.simplifiedSubject]],
    ['base', ['simplified'], [refs.baseSubject]], ['ready', ['simplified', 'base']]);
  const ids = new Set(steps.map(([id]) => id));
  return steps.map(([id, dependsOn, outputs]) => {
    const directory = join(root, id);
    return { id, directory, dependsOn: dependsOn.filter(dependency => ids.has(dependency)),
      ...(outputs ? { outputs: outputs.map(path => relative(directory, path)) } : {}) };
  });
}
