import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { GroupNode } from './layering-types.ts';

export type InputDependency = { path: string; hash: string; groupId?: string; stage?: 'reduction' | 'completion' };
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

// Siblings whose reduced outlines a completion reads, from the group's completion.references.json.
export async function completionReferenceGroups(id: string, parentId?: string, promptsDirectory?: string): Promise<string[]> {
  if (!promptsDirectory) return [];
  try {
    const config = JSON.parse(await readFile(join(promptsDirectory, 'groups', id, 'completion.references.json'), 'utf8'));
    return parentId && Array.isArray(config) ? config.flatMap(entry => typeof entry?.sibling === 'string' ? [`${parentId}/${entry.sibling}`] : []) : [];
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}

export async function fileDependency(directory: string, path: string,
  source: Pick<InputDependency, 'groupId' | 'stage'> = {}): Promise<InputDependency> {
  const rel = relative(directory, path);
  return { path: rel.startsWith('..') || isAbsolute(rel) ? path : rel, hash: hash(await readFile(path)), ...source };
}

export async function dependenciesMatch(directory: string, dependencies: InputDependency[], groups?: Map<string, GroupNode>): Promise<boolean> {
  for (const dependency of dependencies) {
    if (groups && dependency.groupId && (!dependency.stage || groups.get(dependency.groupId)?.steps[dependency.stage].status !== 'completed')) return false;
    try { if (hash(await readFile(resolve(directory, dependency.path))) !== dependency.hash) return false; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
  }
  return true;
}
