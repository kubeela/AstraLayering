import { dirname, join } from 'node:path';
import { requireUpstream, simplifiedCharacter } from '../shared/upstream.ts';

export type AssemblyInput = { characterKra: string; clothingKra: string; simplifiedCharacter: string };

export function isAssemblyInput(value: unknown): value is AssemblyInput {
  const input = value as AssemblyInput | null;
  return !!input && [input.characterKra, input.clothingKra, input.simplifiedCharacter]
    .every(path => typeof path === 'string' && path.trim().length > 0);
}

export async function resolveAssemblyInput(name: string, root: string): Promise<AssemblyInput> {
  const character = await requireUpstream(name, 'raster-layering', [{ path: 'step03/character-dressup-base.kra' }], root);
  const clothing = await requireUpstream(name, 'clothing-raster-layering', [{ path: 'step02/clothing-soft-edges.kra' }], root);
  return {
    characterKra: join(character, 'step03/character-dressup-base.kra'),
    clothingKra: join(clothing, 'step02/clothing-soft-edges.kra'),
    simplifiedCharacter: await simplifiedCharacter(name, root),
  };
}

export function inputDirectories(input: AssemblyInput): string[] {
  return [input.characterKra, input.clothingKra, input.simplifiedCharacter].map(path => dirname(dirname(path)));
}
