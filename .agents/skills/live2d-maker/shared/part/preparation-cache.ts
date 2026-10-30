import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { partSteps } from '../step-paths.js';

export const preparationHash = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');
export const fileHash = async (path: string): Promise<string> => preparationHash(await readFile(path));

// The person preparation mode is the output of the preparation options step.
export const preparationOptionsPath = (references: string) => join(dirname(references), partSteps.options, 'options.json');
export async function readPreparationOptions(directory: string): Promise<boolean | undefined> {
  const path = preparationOptionsPath(directory);
  let text: string;
  try { text = await readFile(path, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  const standard = (JSON.parse(text) as { standard?: unknown })?.standard;
  if (typeof standard !== 'boolean') throw new Error(`无效的 preparation 选项：${path}`);
  return standard;
}

// The layering steps and what they build. Only the current part section owns
// these files; raster/assembly markers and threads are untouched.
export const layeringEntries = [partSteps.initial, partSteps.outline, partSteps.reduce, partSteps.completion, partSteps.children,
  partSteps.merge, partSteps.occlusion, 'parts', 'preview.svg', 'occlusion.json'] as const;
export async function clearPreparedParts(directory: string): Promise<void> {
  for (const entry of ['groups.json', ...layeringEntries, 'stages', 'observations']) {
    await rm(join(directory, entry), { recursive: true, force: true });
  }
}
