import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { pipelineIds } from './paths.ts';
import { executionPaths } from './agents/workspace.ts';
import { groupStepId } from './part/part-steps.ts';
import { reportReferences } from './report-links.js';
import { publishObservations, publishReportAssets, publishReportText } from './report-assets.ts';

export type WorkspaceMove = { source: string; target: string };
const metadata = /^(?:prompt\.md|.*\.prompt\.txt|(?:.*\.)?result\.json|attempts\.jsonl|events\.jsonl|error\.txt|session\.json(?:\.history\.jsonl)?)$/;
const inside = (root: string, path: string) => path === root || path.startsWith(root + sep);

async function files(root: string): Promise<string[]> {
  const result: string[] = [];
  async function visit(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.some(entry => /^Krita_.*_Default_Resources\.bundle$/.test(entry.name))) return;
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (['cli-data', 'node_modules', 'recovery', 'archive', 'backups', 'runtime', 'stages.legacy'].includes(entry.name)
        || entry.name.startsWith('.') && entry.name !== '.completed') continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        try { await stat(join(path, 'pyvenv.cfg')); continue; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        await visit(path);
      } else if (entry.isFile()) result.push(path);
    }
  }
  await visit(root); return result;
}

// Planning does not mutate a task. The caller owns the task lock while applying.
export async function planWorkspaceMigration(directory: string): Promise<WorkspaceMove[]> {
  const root = resolve(directory), all = await files(root), plan: WorkspaceMove[] = [];
  const existing = new Set(all), sources = new Set<string>(), targets = new Set<string>();
  const preserved = new Set<string>();
  for (const file of all.filter(path => /\.(?:md|json)$/.test(path) && !path.includes('/agents/') && !metadata.test(basename(path)))) {
    const text = await readFile(file, 'utf8');
    for (const ref of reportReferences(text)) {
      let target: string; try { target = decodeURIComponent(ref.target); } catch { continue; }
      let base = dirname(file);
      while (inside(root, base)) {
        const candidate = resolve(base, target);
        if (existing.has(candidate)) { preserved.add(candidate); break; }
        if (base === root) break; base = dirname(base);
      }
    }
  }
  const add = async (source: string, target: string) => {
    if (!inside(root, source) || !inside(root, target)) throw new Error('迁移路径离开当前任务');
    if (source === target || sources.has(source)) return;
    // A collision is retained under an execution-specific folder, never overwritten.
    if (existing.has(target) || targets.has(target)) {
      target = join(dirname(target), createHash('sha256').update(relative(root, source)).digest('hex').slice(0, 10) + '-' + basename(target));
      if (existing.has(target) || targets.has(target)) throw new Error('迁移目标已存在，请检查：' + target);
    }
    plan.push({ source, target }); sources.add(source); targets.add(target);
  };
  for (const pipeline of pipelineIds) {
    const base = join(root, pipeline);
    const paths = all.filter(path => inside(base, path));
    for (const request of paths.filter(path => /\/agents\/[^/]+\/request\.json$/.test(path))) {
      const old = join(dirname(request), 'workspace'), value = JSON.parse(await readFile(request, 'utf8'));
      const logical = request.split('/agents/')[0];
      const output = value.outputDirectory || executionPaths({ ...value.task, cwd: logical }, logical).outputDirectory;
      for (const source of paths.filter(path => inside(old, path))) {
        await add(source, join(output, 'workspace', relative(old, source)));
      }
    }
    for (const source of paths) {
      if (basename(source) === '.completed') continue;
      if (source.includes('/workspace/') || source.includes('/agents/')) continue;
      const local = relative(base, source).split(sep).join('/');
      const step = local.match(/^(.+?\/step\d+|step\d+|layers\/depth\d+|occlusion|merge)\/(.+)$/);
      if (step) {
        const [, id, item] = step, name = basename(item);
        if (metadata.test(name)) await add(source, join(base, 'agents', 'steps', id, item));
        else if (item.startsWith('references/')) await add(source, join(base, id, 'workspace', item));
        else if (!preserved.has(source) && !/\.md$/.test(name)
          && !/^(?:groups|review|check|children|review-baseline|inspection|shadows|plan|source|layer-map)\.json$/.test(name)
          && !/^(?:outline\.svg|character-(?:depth|soft-edges|dressup-base|assembled|shadowed)\.(?:kra|png)|clothing-(?:depth|soft-edges)\.kra|composite\.png|normal\.png|depth\.png|face-review\.png)$/.test(item)
          && !item.startsWith('inspection/') && !(id.startsWith('layers/') && name.endsWith('.svg') && !name.endsWith('.draft.svg'))) {
          await add(source, join(base, id, 'workspace', item));
        }
      } else if (local.startsWith('observations/')) {
        const [, phase, ...rest] = local.split('/');
        const group = rest.slice(0, -1).join('/');
        const number = phase === 'completion' ? 2 : phase === 'children' ? 3 : 1;
        const id = phase === 'initial-groups' ? 'initial/step01' : phase === 'occlusion' ? 'occlusion'
          : phase === 'outline-reduce' ? 'layers/depth' + String(Number(rest.shift()) + 1).padStart(2, '0')
            : groupStepId(group, number);
        await add(source, join(base, id, 'workspace', 'observations', ...rest));
      }
    }
    for (const source of paths.filter(path => path.startsWith(join(base, 'agents/generated') + sep))) {
      await add(source, join(base, 'preparation/workspace/generated', relative(join(base, 'agents/generated'), source)));
    }
  }
  return plan;
}

export async function applyWorkspaceMigration(directory: string, moves: readonly WorkspaceMove[]): Promise<void> {
  const root = resolve(directory);
  const before = await files(root), directoryMoves = new Map<string, string>();
  const counts = new Map<string, { total: number; moved: number; target?: string; consistent: boolean }>();
  for (const file of before) for (let path = dirname(file); inside(root, path) && path !== root; path = dirname(path)) {
    const count = counts.get(path) || { total: 0, moved: 0, consistent: true }; count.total++; counts.set(path, count);
  }
  for (const move of moves) {
    let source = dirname(move.source), target = dirname(move.target);
    while (inside(root, source) && source !== root) {
      const count = counts.get(source)!; count.moved++;
      if (count.target && count.target !== target) count.consistent = false;
      count.target = target; source = dirname(source); target = dirname(target);
    }
  }
  for (const [source, count] of counts) if (count.total === count.moved && count.consistent) directoryMoves.set(source, count.target!);
  // Verify every source and destination before moving the first file.
  for (const move of moves) {
    if (!inside(root, move.source) || !inside(root, move.target) || !(await stat(move.source)).isFile()) throw new Error('无效迁移项');
    try { await stat(move.target); throw new Error('迁移目标已存在：' + move.target); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  await writeFile(join(root, '.workspace-migration.json'), JSON.stringify({ status: 'moving', moves }, null, 2));
  for (const move of moves) { await mkdir(dirname(move.target), { recursive: true }); await rename(move.source, move.target); }
  // Keep historical prompts/events verbatim. Update current reports and metadata.
  const replacements = [...moves, ...[...directoryMoves].map(([source, target]) => ({ source, target }))].sort((a, b) => b.source.length - a.source.length);
  for (const file of await files(root)) {
    if (!/\.(?:md|json|py|[cm]?js|ts)$/.test(file) || file.includes('/agents/') && !file.endsWith('/sessions.json') || file.endsWith('/prompt.md')) continue;
    const original = await readFile(file, 'utf8'); let text = original;
    if (file.includes('/workspace/') && !text.includes(root)) continue;
    for (const move of replacements) {
      text = text.replaceAll(move.source, move.target);
      if (!file.includes('/agents/')) {
        const from = relative(dirname(file), move.source).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (from) text = text.replace(new RegExp(`(?<![\\w./-])${from}(?![\\w.-])`, 'g'), () => relative(dirname(file), move.target));
      }
    }
    if (text !== original) await writeFile(file, text);
    if (file.endsWith('.md') && !file.includes('/workspace/') && !file.includes('/agents/')) {
      const step = file.match(/^(.*\/step\d+)\//)?.[1];
      if (step) await publishReportAssets(file, join(step, 'workspace'));
    }
    if (file.endsWith('/review.json') && !file.includes('/workspace/') && !file.includes('/agents/')) {
      const report = JSON.parse(text);
      if (Array.isArray(report.reviews)) {
        for (const review of report.reviews) {
          if (Array.isArray(review.observations)) review.observations = await publishObservations(review.observations, join(dirname(file), 'workspace'), dirname(file));
          if (typeof review.feedback === 'string') review.feedback = await publishReportText(review.feedback, join(dirname(file), 'workspace'), dirname(file));
        }
        await writeFile(file, JSON.stringify(report, null, 2) + '\n');
      }
    }
  }
  // Link-only changes must not invalidate a completed drawing and rerun it.
  // Keep step stamps/dependencies; refresh hashes of the existing deliveries.
  for (const receipt of (await files(root)).filter(path => path.endsWith('/.completed'))) {
    const text = await readFile(receipt, 'utf8');
    let record: any; try { record = JSON.parse(text); } catch { continue; }
    if (!record?.outputs || typeof record.outputs !== 'object') continue;
    for (const key of Object.keys(record.outputs)) {
      const path = resolve(dirname(receipt), key);
      if (!inside(root, path)) throw new Error('完成记录的产物离开任务目录');
      record.outputs[key] = createHash('sha256').update(await readFile(path)).digest('hex');
    }
    await writeFile(receipt, JSON.stringify(record, null, 2) + '\n');
  }
  await writeFile(join(root, '.workspace-migration.json'), JSON.stringify({ status: 'completed', moves }, null, 2));
}
