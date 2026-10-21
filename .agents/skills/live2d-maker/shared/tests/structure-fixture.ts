import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Simulate a drawing agent saving a newly separated logical part through ordinary file writes.
export async function splitStructure(source: string) {
  const groups = JSON.parse(await readFile(join(source, 'groups.json'), 'utf8'));
  groups.groups.push({ id: 'new_part', kind: 'part', groups: [] });
  const plan = JSON.parse(await readFile(join(source, 'occlusion.json'), 'utf8'));
  plan.layers.push({ id: 'new_part', level: 17, note: 'new independent part', check: { passed: true, note: 'checked' } });
  const files: Record<string, string> = {
    'groups.json': JSON.stringify(groups), 'occlusion.json': JSON.stringify(plan),
    'parts/new_part.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path d="M0 0H10V10H0Z"/></svg>',
  };
  for (const [file, bytes] of Object.entries(files)) await writeFile(join(source, file), bytes);
  return files;
}
