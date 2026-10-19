import { lstat, mkdir, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { taskDirectory } from '../shared/paths.ts';

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}

// One-time relocation, never a runtime fallback or a second source of truth.
// Preflight every byte conflict before moving anything; repeated runs are safe.
export async function migrateRunInputs(name: string, root?: string, dryRun = false): Promise<string[]> {
  const directory = taskDirectory(name, root), moves: { source: string; target: string }[] = [];
  const cleanup: string[] = [];
  async function collect(source: string, target: string) {
    if (!await exists(source)) return;
    if ((await lstat(source)).isDirectory()) {
      for (const entry of await readdir(source)) await collect(join(source, entry), join(target, entry));
      cleanup.unshift(source);
    } else moves.push({ source, target });
  }
  const characterReferences = join(directory, 'part-layering/references');
  if (await exists(characterReferences)) for (const file of await readdir(characterReferences)) {
    if (/^original\.[^.]+$/.test(file)) await collect(join(characterReferences, file), join(directory, 'input', file));
  }
  const clothesReferences = join(directory, 'clothing-part-layering/references');
  if (await exists(clothesReferences)) for (const file of await readdir(clothesReferences)) {
    if (/^simplified-character\.(png|jpe?g|webp)$/i.test(file)) await collect(join(clothesReferences, file),
      join(characterReferences, file.replace('simplified-character.', 'simplified-subject.')));
  }
  for (const [raster, part] of [['raster-layering', 'part-layering'], ['clothing-raster-layering', 'clothing-part-layering']]) {
    const snapshot = join(directory, raster, 'input');
    if (await exists(snapshot)) {
      const entries = await readdir(snapshot);
      if (entries.some(entry => !['parts', 'references', 'groups.json', 'occlusion.json', 'preview.svg'].includes(entry))) {
        throw new Error(`旧输入目录含额外文件，请先核对，尚未移动：${snapshot}`);
      }
      for (const entry of entries) {
        // Original images are owned by the root/person preparation, not duplicated in raster.
        if (entry === 'references') {
          for (const file of await readdir(join(snapshot, entry))) {
            const target = /^original\.[^.]+$/.test(file) ? join(directory, 'input', file)
              : /^simplified-character\.[^.]+$/.test(file) ? join(characterReferences, file.replace('simplified-character.', 'simplified-subject.'))
              : join(directory, part, entry, file);
            await collect(join(snapshot, entry, file), target);
          }
          cleanup.push(join(snapshot, entry));
        } else await collect(join(snapshot, entry), join(directory, part, entry));
      }
      cleanup.push(snapshot);
    }
  }
  const targets = new Map<string, string>();
  for (const move of moves) {
    const previous = targets.get(move.target) ?? (await exists(move.target) ? move.target : undefined);
    if (previous && !(await readFile(previous)).equals(await readFile(move.source))) {
      throw new Error(`迁移目标内容不同，未覆盖任何文件：\n${move.source}\n${move.target}\n请核对并保留正确的上游产物后重试。`);
    }
    targets.set(move.target, move.source);
  }
  const messages = moves.map(move => `${move.source} -> ${move.target}`);
  if (dryRun) return messages;
  for (const move of moves) {
    await mkdir(dirname(move.target), { recursive: true });
    if (await exists(move.target)) await rm(move.source);
    else await rename(move.source, move.target);
  }
  // Only remove proven-empty directories, never recursively remove unrecognized work.
  for (const path of [...new Set(cleanup)].sort((a, b) => b.length - a.length)) {
    if (await exists(path) && !(await readdir(path)).length) await rmdir(path);
  }
  for (const [raster, part] of [['raster-layering', 'part-layering'], ['clothing-raster-layering', 'clothing-part-layering']]) {
    const path = join(directory, raster, 'run.json');
    if (!await exists(path)) continue;
    const config = JSON.parse(await readFile(path, 'utf8'));
    config.sourceInput = { directory: join(directory, part), parts: join(directory, part, 'parts') };
    await writeFile(`${path}.tmp`, JSON.stringify(config, null, 2) + '\n');
    await rename(`${path}.tmp`, path);
  }
  return messages;
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { name: { type: 'string' }, 'dry-run': { type: 'boolean' } } });
  if (!values.name) throw new Error('需要 --name <任务名>');
  for (const message of await migrateRunInputs(values.name, undefined, values['dry-run'])) console.log(message);
}
