import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fromTaskPath } from '../.agents/skills/live2d-maker/shared/task-paths.ts';
import { webFilePath } from './files.ts';

const fingerprints = new Map<string, { version: string; hash: string }>();
async function fingerprint(path: string): Promise<string> {
  const info = await stat(path), version = `${info.size}:${info.mtimeMs}`;
  const previous = fingerprints.get(path); if (previous?.version === version) return previous.hash;
  const hash = createHash('sha256'); for await (const chunk of createReadStream(path)) hash.update(chunk);
  const value = hash.digest('hex');
  if (fingerprints.size > 256) fingerprints.clear();
  fingerprints.set(path, { version, hash: value }); return value;
}
// Recorded input .kra paths: task-relative (new runs) or absolute (older runs).
// A relative path always means the task root; one climbing out of it is ignored.
export function inputKras(value: unknown, root: string): string[] {
  if (typeof value === 'string') {
    if (!/\.kra$/i.test(value)) return [];
    try { return [fromTaskPath(root, value)]; } catch { return []; }
  }
  if (!value || typeof value !== 'object') return [];
  return [...new Set(Object.values(value).flatMap(item => inputKras(item, root)))];
}
// A read-only input copied into workspace is not painting progress. Compare
// exact bytes only when sizes match; edited/saved engineering files remain visible.
export async function copiedInput(path: string, inputs: readonly string[]): Promise<boolean> {
  if (!webFilePath(path).includes('/workspace/')) return false;
  const info = await stat(path);
  for (const input of inputs) {
    try { if ((await stat(input)).size === info.size && await fingerprint(path) === await fingerprint(input)) return true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return false;
}
