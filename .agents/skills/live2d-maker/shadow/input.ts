import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { requireUpstream, simplifiedCharacter } from '../shared/upstream.ts';
import { readDressup } from '../shared/part/dressup.ts';
import { taskDirectory } from '../shared/paths.ts';
import type { ChainStep } from '../shared/step-chain.ts';

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
// Both modes read the same input; the mode only picks which step01 runs.
export async function resolveShadowInput(name: string, root: string): Promise<ShadowInput> {
  const assembly = await requireUpstream(name, 'character-assembly', [
    { path: 'step01/character-assembled.kra' }, { path: 'step01/character-assembled.png' },
  ], root);
  const structureFiles: string[] = [];
  // Without a dress-up the clothing lane is skipped and only the character has
  // structure; older runs that made clothing parts anyway keep them.
  const clothing = await readDressup(taskDirectory(name, root)) !== false
    || await present(name, 'clothing-part-layering', root);
  for (const id of clothing ? ['part-layering', 'clothing-part-layering'] as const : ['part-layering'] as const) {
    const directory = await requireUpstream(name, id, [{ path: 'groups.json' }, { path: 'occlusion.json' }], root);
    structureFiles.push(join(directory, 'groups.json'), join(directory, 'occlusion.json'));
  }
  return { characterKra: join(assembly, 'step01/character-assembled.kra'),
    characterColor: join(assembly, 'step01/character-assembled.png'),
    simplifiedCharacter: await simplifiedCharacter(name, root), structureFiles };
}
const present = (name: string, id: 'clothing-part-layering', root: string) =>
  requireUpstream(name, id, [{ path: 'groups.json' }, { path: 'occlusion.json' }], root).then(() => true, () => false);
// The assembly's last step, which must be completed before shadow runs.
export function assemblyStep(input: ShadowInput): ChainStep {
  return { id: 'character-assembly/step01', directory: dirname(input.characterKra) };
}
export function inputDirectories(input: ShadowInput): string[] {
  return [...new Set([dirname(dirname(input.characterKra)), dirname(dirname(input.simplifiedCharacter)),
    ...input.structureFiles.map(dirname)])];
}
export async function fileHash(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}
