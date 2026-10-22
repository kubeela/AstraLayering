import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { requireUpstream, simplifiedCharacter } from '../shared/upstream.ts';
import type { ShadowMode } from '../shared/shadow.ts';

export type ShadowInput = {
  characterKra: string; characterColor: string; simplifiedCharacter: string;
  structureFiles: string[];
};
export function isShadowInput(value: unknown): value is ShadowInput {
  const input = value as ShadowInput | null;
  return !!input && [input.characterKra, input.characterColor, input.simplifiedCharacter]
    .every(path => typeof path === 'string' && !!path.trim())
    && Array.isArray(input.structureFiles) && input.structureFiles.every(path => typeof path === 'string');
}
export async function resolveShadowInput(name: string, root: string, mode: ShadowMode): Promise<ShadowInput> {
  const assembly = await requireUpstream(name, 'character-assembly', [
    { path: 'step01/character-assembled.kra' }, { path: 'step01/character-assembled.png' },
  ], root);
  const structureFiles: string[] = [];
  if (mode === 'mask') for (const id of ['part-layering', 'clothing-part-layering'] as const) {
    const directory = await requireUpstream(name, id, [{ path: 'groups.json' }, { path: 'occlusion.json' }], root);
    structureFiles.push(join(directory, 'groups.json'), join(directory, 'occlusion.json'));
  }
  return { characterKra: join(assembly, 'step01/character-assembled.kra'),
    characterColor: join(assembly, 'step01/character-assembled.png'),
    simplifiedCharacter: await simplifiedCharacter(name, root), structureFiles };
}
export function inputDirectories(input: ShadowInput): string[] {
  return [...new Set([dirname(dirname(input.characterKra)), dirname(dirname(input.simplifiedCharacter)),
    ...input.structureFiles.map(dirname)])];
}
export async function fileHash(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}
export async function inputFingerprint(input: ShadowInput, mode: ShadowMode, prompt: URL): Promise<string> {
  const hashes = await Promise.all([input.characterKra, input.characterColor, input.simplifiedCharacter,
    ...input.structureFiles].map(fileHash));
  return createHash('sha256').update(JSON.stringify({ version: 1, mode, hashes,
    prompt: await readFile(prompt, 'utf8') })).digest('hex');
}
