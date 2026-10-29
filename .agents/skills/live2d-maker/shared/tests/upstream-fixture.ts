import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sectionDirectory } from '../paths.ts';

export async function seedUpstream(name: string, section: 'part-layering' | 'clothing-part-layering', root?: string): Promise<string> {
  const directory = sectionDirectory(name, section, root);
  const files: Record<string, string> = {
    'parts/fixture.svg': 'fixture part',
    'groups.json': '{"groups":[{"id":"fixture","kind":"part","groups":[]}]}',
    'occlusion.json': JSON.stringify({ version: 2, direction: 'back-to-front', sourceHash: 'fixture', layers: [
      { id: 'fixture', level: 0, note: 'fixture', check: { passed: true, note: 'checked' } },
    ] }),
    [section === 'part-layering' ? 'references/base-subject.png' : 'references/clothing.png']: 'fixture reference',
  };
  if (section === 'clothing-part-layering') files['../part-layering/references/simplified-subject.png'] = 'clothed character';
  for (const [file, content] of Object.entries(files)) {
    const path = join(directory, file);
    try { await stat(path); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
    }
  }
  return directory;
}
