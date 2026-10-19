import { join } from 'node:path';
import { requireUpstream, simplifiedCharacter } from '../upstream.ts';

export type PartLayeringInput = { directory: string; parts: string; originalCharacter?: string };
export async function resolvePartInput(name: string, pipeline: 'part-layering' | 'clothing-part-layering', root?: string): Promise<PartLayeringInput> {
  const directory = await requireUpstream(name, pipeline, [
    { path: 'parts', directory: true }, { path: 'groups.json' }, { path: 'occlusion.json' },
    { path: pipeline === 'part-layering' ? 'references/base-subject.png' : 'references/clothing.png' },
  ], root);
  return { directory, parts: join(directory, 'parts'), ...(pipeline === 'clothing-part-layering'
    ? { originalCharacter: await simplifiedCharacter(name, root) } : {}) };
}
