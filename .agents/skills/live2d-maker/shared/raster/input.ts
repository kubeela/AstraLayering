import { join } from 'node:path';
import { requireUpstream, simplifiedCharacter } from '../upstream.ts';

export type PartLayeringInput = { directory: string; parts: string; originalCharacter?: string };
export function isPartLayeringInput(value: unknown): value is PartLayeringInput {
  const input = value as PartLayeringInput | null;
  return !!input && typeof input.directory === 'string' && typeof input.parts === 'string';
}

export async function resolvePartInput(name: string, section: 'part-layering' | 'clothing-part-layering', root?: string): Promise<PartLayeringInput> {
  const directory = await requireUpstream(name, section, [
    { path: 'parts', directory: true }, { path: 'groups.json' }, { path: 'occlusion.json' },
    { path: section === 'part-layering' ? 'references/base-subject.png' : 'references/clothing.png' },
  ], root);
  return { directory, parts: join(directory, 'parts'), ...(section === 'clothing-part-layering'
    ? { originalCharacter: await simplifiedCharacter(name, root) } : {}) };
}
