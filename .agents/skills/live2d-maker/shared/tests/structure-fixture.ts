import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createStructureTools } from '../raster/structure-tools.ts';

// Simulate a drawing agent saving SVG pixels, then committing the matching
// logical structure through the same controlled tool as a real step01.
export async function splitStructure(source: string) {
  const groups = JSON.parse(await readFile(join(source, 'groups.json'), 'utf8'));
  groups.groups.push({ id: 'new_part', kind: 'part', groups: [] });
  const plan = JSON.parse(await readFile(join(source, 'occlusion.json'), 'utf8'));
  plan.layers.push({ id: 'new_part', level: 17, note: 'new independent part', check: { passed: true, note: 'checked' } });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M0 0H10V10H0Z"/></svg>';
  await writeFile(join(source, 'parts/new_part.svg'), svg);
  await createStructureTools({ directory: source, parts: join(source, 'parts') })[0].execute(
    { groups: groups.groups, layers: plan.layers }, new AbortController().signal);
  const files: Record<string, string> = {
    'groups.json': await readFile(join(source, 'groups.json'), 'utf8'),
    'occlusion.json': await readFile(join(source, 'occlusion.json'), 'utf8'), 'parts/new_part.svg': svg,
  };
  return files;
}
