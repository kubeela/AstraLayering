import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const preparationHash = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');
export const fileHash = async (path: string): Promise<string> => preparationHash(await readFile(path));

export async function writePreparationRecord(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

// Only the current part pipeline owns these files. Raster/assembly markers and threads are untouched.
export async function clearPreparedParts(directory: string): Promise<void> {
  for (const entry of ['groups.json', 'parts', 'stages', 'observations', 'preview.svg', 'occlusion.json']) {
    await rm(join(directory, entry), { recursive: true, force: true });
  }
}
