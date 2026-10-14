import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaults = { outline: '5-组轮廓.md', review: '6-轮廓review.md' } as const;
export type OutlineStage = keyof typeof defaults;

export async function readGroupPrompt(
  id: string, stage: OutlineStage,
  directory = fileURLToPath(new URL('prompts/', import.meta.url)),
): Promise<{ path: string; text: string }> {
  if (!/^[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u.test(id)) throw new Error('Invalid group prompt id');
  let path = join(directory, 'groups', id, `${stage}.md`);
  let text: string;
  try { text = await readFile(path, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    path = join(directory, defaults[stage]);
    text = await readFile(path, 'utf8');
  }
  if (!text.trim()) throw new Error(`组提示词为空：${path}`);
  return { path, text };
}
