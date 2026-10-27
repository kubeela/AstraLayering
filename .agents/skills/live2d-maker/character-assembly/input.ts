import { dirname, join } from 'node:path';
import { requireUpstream, simplifiedCharacter } from '../shared/upstream.ts';
import { readDressup } from '../shared/part/dressup.ts';
import { taskDirectory } from '../shared/paths.ts';

// clothingKra is null when the base subject has no dress-up: the clothing lane
// does not run and assembly copies the character result.
export type AssemblyInput = { characterKra: string; clothingKra: string | null; simplifiedCharacter: string };

export function isAssemblyInput(value: unknown): value is AssemblyInput {
  const input = value as AssemblyInput | null;
  const path = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  return !!input && path(input.characterKra) && path(input.simplifiedCharacter) && (input.clothingKra === null || path(input.clothingKra));
}

export async function resolveAssemblyInput(name: string, root: string): Promise<AssemblyInput> {
  const character = await requireUpstream(name, 'raster-layering', [{ path: 'step03/character-dressup-base.kra' }], root);
  // Older runs that drew the clothing lane anyway keep assembling it.
  const entries = [{ path: 'step02/clothing-soft-edges.kra' }];
  const clothing = await readDressup(taskDirectory(name, root)) !== false
    ? await requireUpstream(name, 'clothing-raster-layering', entries, root)
    : await requireUpstream(name, 'clothing-raster-layering', entries, root).catch(() => undefined);
  return {
    characterKra: join(character, 'step03/character-dressup-base.kra'),
    clothingKra: clothing ? join(clothing, 'step02/clothing-soft-edges.kra') : null,
    simplifiedCharacter: await simplifiedCharacter(name, root),
  };
}

export function inputDirectories(input: AssemblyInput): string[] {
  return [input.characterKra, input.clothingKra, input.simplifiedCharacter].filter(path => path !== null).map(path => dirname(dirname(path)));
}
