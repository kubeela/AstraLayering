import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kraContents, kraLayers } from './delivery.ts';
import { fileHash, type ShadowInput } from './input.ts';

export const referenceNames = ['production.md', 'skirt.png', 'hair.png'] as const;
export const referenceUrl = (name: string) => new URL('./references/' + name, import.meta.url);
export type InputIndex = { version: 1; sourceHash: string; parts: { id: string; name: string; note: string; depth?: unknown }[];
  layers: { uuid: string; name: string; parent: string; type: string; nameMatch: string | null }[] };

export async function inputIndex(input: ShadowInput): Promise<InputIndex> {
  const parts: InputIndex['parts'] = [];
  for (const path of input.structureFiles.filter(p => p.endsWith('groups.json'))) {
    const namespace = path.includes('clothing-part-layering') ? 'clothing:' : 'character:';
    const depthPath = path.replace(/groups\.json$/, 'occlusion.json');
    const depths = JSON.parse(await readFile(depthPath, 'utf8')).layers ?? [];
    const walk = (nodes: any[]) => { for (const n of nodes) {
      const d = depths.find((x: any) => x.id === n.id);
      parts.push({ id: namespace + n.id, name: n.name ?? n.id, note: n.note ?? '', ...(d ? { depth: d.levels ?? d.level } : {}) });
      walk(n.groups ?? []);
    } };
    walk(JSON.parse(await readFile(path, 'utf8')).groups ?? []);
  }
  const layers = [...kraLayers(kraContents(await readFile(input.characterKra)).xml)].map(([uuid, n]) => {
    const prefix = n.name.match(/^(人物|衣服)\s*\|\s*/)?.[1];
    const namespace = prefix === '人物' ? 'character:' : prefix === '衣服' ? 'clothing:' : undefined;
    const name = n.name.replace(/^(人物|衣服)\s*\|\s*/, '').replace(/^\d+\s+/, '');
    const candidates = parts.filter(p => { const id = p.id.split(':')[1]; return (!namespace || p.id.startsWith(namespace)) && (name === id || name.startsWith(id + '/')); });
    const length = (p: InputIndex['parts'][number]) => p.id.slice(p.id.indexOf(':') + 1).length;
    candidates.sort((a, b) => length(b) - length(a));
    const ambiguous = candidates[1] && length(candidates[1]) === length(candidates[0]);
    return { uuid, name: n.name, parent: n.parent, type: n.nodetype, nameMatch: candidates[0] && !ambiguous ? candidates[0].id : null };
  });
  return { version: 1, sourceHash: await fileHash(input.characterKra), parts, layers };
}
export async function prepareMaskReferences(output: string, input: ShadowInput) {
  const dir = join(output, 'references'); await mkdir(dir, { recursive: true });
  for (const name of referenceNames) await copyFile(fileURLToPath(referenceUrl(name)), join(dir, name));
  await writeFile(join(dir, 'inputs.json'), JSON.stringify(await inputIndex(input), null, 2) + '\n');
}
