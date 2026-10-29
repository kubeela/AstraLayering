import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, posix, resolve, sep } from 'node:path';
import lockfile from 'proper-lockfile';
import { sectionIds } from '../shared/paths.ts';
import { clothingPreparationStep, partSteps, shadowStep, stepPattern } from '../shared/step-paths.js';

// Task directory layouts. The current one names every step stepNN_<note>
// (step-paths.js). The previous one (up to v0.1.3) kept part steps under
// preparation/, initial/, groups/<id>/stepNN, layers/, merge/ and occlusion/
// and the shadow modes under shadow/<mode>/. Tasks in the previous layout are
// converted as a whole, once, after a full copy of the old directory is kept
// as a backup; nothing converts silently. Layouts older than the previous one
// are refused.
export type Layout = 'current' | 'previous';
export class LayoutError extends Error {
  readonly directory: string; readonly layout: 'previous' | 'older';
  constructor(directory: string, layout: 'previous' | 'older', message: string) { super(message); this.directory = directory; this.layout = layout; }
}

const partSections = ['part-layering', 'clothing-part-layering'] as const;
const oldPartDirs = ['preparation', 'initial', 'groups', 'layers', 'merge', 'occlusion'];
const shadowModes = ['mask', 'normal-depth'];
const threadFields = ['threadId', 'threadHarness', 'threadStep', 'threadHandoff'] as const;
const legacyRunFields = [...threadFields, 'inputFingerprint'] as const;

async function present(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
async function readJson(path: string): Promise<any> {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
}

async function previousSignals(directory: string): Promise<string[]> {
  const found: string[] = [];
  if ((await readJson(join(directory, 'run.json')))?.pipelines) found.push('run.json');
  for (const section of partSections) for (const name of oldPartDirs) {
    if (await present(join(directory, section, name))) found.push(`${section}/${name}`);
  }
  if (await present(join(directory, 'clothing-part-layering/references/preparation.json'))) found.push('clothing-part-layering/references/preparation.json');
  for (const mode of shadowModes) if (await present(join(directory, 'shadow', mode))) found.push(`shadow/${mode}`);
  for (const section of sectionIds) {
    const config = await readJson(join(directory, section, 'run.json')).catch(() => undefined);
    if (config && legacyRunFields.some(field => field in config)) found.push(`${section}/run.json`);
  }
  return found;
}

export async function layoutState(directory: string): Promise<Layout> {
  // Part references records from before the preparation steps (older than v0.1.3's previous layout).
  for (const name of ['preparation.json', '.steps', 'options.json']) {
    if (await present(join(directory, 'part-layering/references', name))) {
      throw new LayoutError(directory, 'older', `任务目录布局早于 v0.1.3（发现 part-layering/references/${name}），不能转换：${directory}\n请先用 v0.1.3 运行一次该任务的 part-layering 完成当时的升级，再转换目录。`);
    }
  }
  return (await previousSignals(directory)).length ? 'previous' : 'current';
}

// Refuses a task that is not in the current layout; called where tasks are read and run.
export async function requireCurrentLayout(directory: string): Promise<void> {
  if (await layoutState(directory) === 'current') return;
  throw new LayoutError(directory, 'previous', `任务使用旧版目录布局：${directory}\n请在网页中点击「转换目录」，或运行 pnpm convert-layout --name <任务名>；转换前会先完整备份原目录。`);
}

// ---- Path mapping, previous layout → current layout ----
// A mapped path: undefined when it is not recognized, null when the content is
// retired, else the new task-relative path; step is the new step id (relative
// to its section) when the path lies in a step directory.
type Mapped = { path: string; section?: string; step?: string; rest: string[] } | null | undefined;
const preparationIds: Record<string, string | null> = {
  step01: partSteps.original, step02: partSteps.options, step03: partSteps.pose, step04: partSteps.standard,
  step05: null, step06: partSteps.simplified, step07: partSteps.base, step08: partSteps.ready,
};
const groupIds: Record<string, string> = { step01: partSteps.outline, step02: partSteps.completion, step03: partSteps.children };
const stepIn = (section: string, step: string[], rest: string[]) => ({ path: [section, ...step, ...rest].join('/'), section, step: step.join('/'), rest });

function mapPart(section: string, segments: string[]): Mapped {
  const [head, ...tail] = segments;
  if (head === 'preparation') {
    if (section !== 'part-layering') return;
    if (tail[0] === 'agents') return { path: [section, ...tail].join('/'), rest: [] };
    const id = preparationIds[tail[0]];
    return id === undefined ? undefined : id === null ? null : stepIn(section, [id], tail.slice(1));
  }
  if (head === 'initial') return tail[0] === 'step01' ? stepIn(section, [partSteps.initial], tail.slice(1)) : undefined;
  if (head === 'groups') {
    if (!tail[0]) return;
    const item = [tail[0]];
    let index = 1;
    while (tail[index] === 'children' && tail[index + 1]) { item.push('children', tail[index + 1]); index += 2; }
    const id = groupIds[tail[index]];
    return id ? stepIn(section, [id, ...item], tail.slice(index + 1)) : undefined;
  }
  if (head === 'layers') return tail[0] ? stepIn(section, [partSteps.reduce, tail[0]], tail.slice(1)) : undefined;
  if (head === 'merge') return stepIn(section, [partSteps.merge], tail);
  if (head === 'occlusion') return stepIn(section, [partSteps.occlusion], tail);
  if (section === 'clothing-part-layering' && segments.join('/') === 'references/preparation.json') return null;
  return { path: [section, ...segments].join('/'), rest: [] };
}

function mapShadow(segments: string[]): Mapped {
  const [mode, ...tail] = segments;
  if (!shadowModes.includes(mode)) return { path: ['shadow', ...segments].join('/'), rest: [] };
  if (tail.some(segment => segment.includes('.previous-'))) return null;
  if (tail[0] === 'run.json' && tail.length === 1) return { path: 'shadow/run.json', rest: [] };
  if (tail[0] === 'step01') return stepIn('shadow', [shadowStep(mode)], tail.slice(1));
  if (mode === 'normal-depth' && tail[0] === 'step02') return null;
  if (tail[0] === 'agents') return { path: ['shadow', ...tail].join('/'), rest: [] };
}

// Maps an old task-relative path, a file or directory.
export function mapPath(path: string): Mapped {
  const [section, ...segments] = path.split('/');
  if (!(sectionIds as readonly string[]).includes(section) || !segments.length) return { path, rest: [] };
  if ((partSections as readonly string[]).includes(section)) return mapPart(section, segments);
  if (section === 'shadow') return mapShadow(segments);
  return stepPattern.test(segments[0]) ? stepIn(section, [segments[0]], segments.slice(1)) : { path, rest: [] };
}

// The old directory that a step's section-relative ids are relative to.
function oldUnit(markerPath: string): string {
  const [section, next] = markerPath.split('/');
  if (section === 'part-layering' && next === 'preparation') return 'part-layering/preparation';
  if (section === 'shadow' && shadowModes.includes(next)) return `shadow/${next}`;
  return section;
}
const prefixed = (id: string) => (sectionIds as readonly string[]).includes(id.split('/')[0]) && id.includes('/');
// An old dependency id of a step in unit, as its new id; null when the dependency is retired.
function mapId(id: string, unit: string): string | null | undefined {
  const [step, output] = id.split('#');
  const full = prefixed(step) ? step : `${unit}/${step}`, mapped = mapPath(full);
  if (!mapped) return mapped;
  if (mapped.rest.length || !mapped.step) return mapped.path === full ? (prefixed(step) ? step : step) : undefined;
  const target = prefixed(step) ? `${mapped.section}/${mapped.step}` : mapped.step;
  if (output === undefined) return target;
  // An output named relative to the step directory keeps its target.
  const named = mapPath(posix.normalize(`${full}/${output}`));
  const name = named ? posix.relative(mapped.path, named.path) : output;
  return `${target}#${name}`;
}

const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileSha = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');

type Entry = { old: string; target: string };
export type Conversion = { directory: string; backup: string; notes: string[] };

async function walk(root: string, path = ''): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
    const relative = path ? `${path}/${entry.name}` : entry.name;
    if (relative === '.runner.lock') continue;
    if (entry.isDirectory()) files.push(...await walk(root, relative));
    else files.push(relative);
  }
  return files;
}

const insideAgents = (path: string) => path.split('/').includes('agents');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

// The backup goes next to the task, under the runs directory's hidden .backups.
export const backupDirectory = (directory: string) => join(dirname(directory), '.backups', `${basename(directory)}-${stamp()}`);

export async function convertLayout(directory: string, progress?: (message: string) => void): Promise<Conversion> {
  directory = resolve(directory);
  if (await layoutState(directory) === 'current') throw new Error(`任务已是当前目录布局，无需转换：${directory}`);
  let release: () => Promise<void>;
  try { release = await lockfile.lock(directory, { lockfilePath: join(directory, '.runner.lock'), stale: 30_000, update: 10_000, retries: 0 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ELOCKED') throw new Error('该任务正在运行或被其他操作占用，请先停止后再转换目录。', { cause: error });
    throw error;
  }
  try { return await convertLocked(directory, progress); }
  finally { await release(); }
}

async function convertLocked(directory: string, progress?: (message: string) => void): Promise<Conversion> {
  const notes: string[] = [];
  const files = await walk(directory), known = new Set(files);
  for (const file of files) for (let parent = dirname(file); parent !== '.'; parent = dirname(parent)) known.add(parent);

  // Plan every move before anything changes.
  const unknown: string[] = [], retired = new Set<string>(), entries: Entry[] = [];
  for (const file of files) {
    const mapped = mapPath(file);
    if (mapped === undefined) { unknown.push(file); continue; }
    if (mapped === null) { retired.add(file); continue; }
    entries.push({ old: file, target: mapped.path });
  }
  if (unknown.length) throw new Error(`以下文件不在已知的旧版目录布局中，未做任何改动：\n${unknown.slice(0, 20).join('\n')}${unknown.length > 20 ? `\n…共 ${unknown.length} 个` : ''}`);
  // One shadow run.json serves both modes; the mask one is kept.
  const byTarget = new Map<string, Entry[]>();
  for (const entry of entries) byTarget.set(entry.target, [...byTarget.get(entry.target) ?? [], entry]);
  for (const [target, group] of byTarget) {
    if (group.length < 2) continue;
    const keep = target === 'shadow/run.json' ? group.find(entry => entry.old === 'shadow/mask/run.json') : undefined;
    if (!keep) {
      throw new Error(`转换后路径冲突，未做任何改动：${target}\n${group.map(entry => entry.old).join('\n')}`);
    }
    for (const entry of group) if (entry !== keep) { retired.add(entry.old); entries.splice(entries.indexOf(entry), 1); }
  }

  const backup = backupDirectory(directory);
  progress?.(`备份原目录到 ${backup}`);
  await mkdir(dirname(backup), { recursive: true });
  await cp(directory, backup, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true, verbatimSymlinks: true,
    filter: source => source !== join(directory, '.runner.lock') && !source.startsWith(join(directory, '.runner.lock') + sep) });

  const contents = new Map<string, string>();
  const read = (path: string) => readFile(join(directory, path), 'utf8');

  // Step records: outputs re-keyed for the new directories, output stamps
  // recomputed from the new declared names, then dependencies re-keyed.
  const markers = entries.filter(entry => ['.completed', '.running'].includes(basename(entry.old)));
  const records = new Map<string, any>(), stamps = new Map<string, string>();
  for (const { old, target } of markers) {
    const text = await read(old);
    let record: any;
    try { record = text.trim() ? JSON.parse(text) : undefined; } catch { record = undefined; }
    if (!record || typeof record !== 'object') continue;
    records.set(old, record);
    if (!record.outputs) continue;
    const from = dirname(old), to = dirname(target), task = record.paths === 'task';
    const declaredOld: Record<string, string> = {}, declaredNew: Record<string, string> = {}, stored: Record<string, string> = {};
    for (const [key, hash] of Object.entries(record.outputs as Record<string, string>)) {
      const absolute = task ? key : posix.normalize(`${from}/${key}`);
      const moved = mapPath(absolute)?.path ?? absolute;
      declaredOld[posix.relative(from, absolute)] = hash;
      declaredNew[posix.relative(to, moved)] = hash;
      stored[task ? moved : posix.relative(to, moved)] = hash;
    }
    record.outputs = stored;
    if (typeof record.stamp === 'string' && record.stamp === sha(declaredOld)) {
      const next = sha(declaredNew);
      if (next !== record.stamp) stamps.set(record.stamp, next);
      record.stamp = next;
    }
  }
  for (const [old, record] of records) {
    if (!record.inputs || typeof record.inputs !== 'object') continue;
    const unit = oldUnit(old), inputs: Record<string, string> = {};
    for (const [id, value] of Object.entries(record.inputs as Record<string, string>)) {
      const next = mapId(id, unit);
      if (next === null) continue;
      if (next === undefined) throw new Error(`无法识别的步骤依赖 ${id}（${old}），未做转换；原目录备份在 ${backup}`);
      inputs[next] = stamps.get(value) ?? value;
    }
    record.inputs = inputs;
    contents.set(old, JSON.stringify(record) + '\n');
  }

  // Section configurations: legacy thread fields are dropped; agents/ records stay as they are.
  for (const entry of entries.filter(entry => /^[^/]+(\/(mask|normal-depth))?\/run\.json$/.test(entry.old))) {
    const config = JSON.parse(await read(entry.old));
    if (!legacyRunFields.some(field => field in config)) continue;
    for (const field of legacyRunFields) delete config[field];
    contents.set(entry.old, JSON.stringify(config, null, 2) + '\n');
  }
  if (known.has('run.json')) {
    const run = JSON.parse(contents.get('run.json') ?? await read('run.json'));
    if (run.pipelines && !run.sections) { run.sections = run.pipelines; delete run.pipelines; contents.set('run.json', JSON.stringify(run, null, 2) + '\n'); }
  }

  // The clothing preparation.json record becomes the step01_preparation record
  // when it still matches the person references it was made from.
  const clothingRecord = 'clothing-part-layering/references/preparation.json';
  if (known.has(clothingRecord)) {
    const record = JSON.parse(await read(clothingRecord));
    const person = 'part-layering/references', clothing = 'clothing-part-layering/references/clothing.png';
    const hash = async (path: string) => known.has(path) ? fileSha(join(directory, path)) : undefined;
    const upstream: Record<string, string> = {};
    for (const id of [partSteps.standard, partSteps.simplified, partSteps.base]) {
      const old = Object.keys(preparationIds).find(key => preparationIds[key] === id)!;
      const marker = records.get(`part-layering/preparation/${old}/.completed`);
      if (marker?.stamp) upstream[`part-layering/${id}`] = marker.stamp;
    }
    const valid = [1, 2].includes(record?.version) && Object.keys(upstream).length === 3
      && record.inputHash === await hash(`${person}/simplified-subject.png`) && record.clothingHash === await hash(clothing)
      && (record.version !== 2 || record.baseInputHash === await hash(`${person}/base-subject.png`))
      && (!record.standardHash || record.standardHash === await hash(`${person}/standard.png`));
    if (valid) {
      const outputs = { [clothing]: record.clothingHash };
      contents.set(`\0clothing-part-layering/${clothingPreparationStep}/.completed`,
        JSON.stringify({ stamp: sha({ '../references/clothing.png': record.clothingHash }), inputs: upstream, outputs, paths: 'task' }) + '\n');
      notes.push('衣服 preparation.json 已转换为 step01_preparation 步骤记录，沿用现有纯衣服参考');
    } else notes.push('衣服 preparation.json 与当前人物参考不一致或人物准备步骤缺失，未转换；下次运行将重做衣服 preparation');
  }

  // Paths written into products (reports, reviews, manifests) follow their targets.
  const moveTarget = (path: string) => { const mapped = mapPath(path); return mapped ? mapped.path : path; };
  const rewrite = (value: string, from: string, to: string): string => {
    const [path, suffix = ''] = value.split(/(?=[#?])/, 2);
    if (!path || /^[a-z][a-z0-9+.-]*:/i.test(path) || /\s/.test(path) && !path.includes('/')) return value;
    if (path.startsWith(directory + '/')) {
      const relative = path.slice(directory.length + 1);
      return known.has(relative) ? join(directory, moveTarget(relative)) + suffix : value;
    }
    if (path.startsWith('/')) return value;
    const local = posix.normalize(posix.join(posix.dirname(from), path));
    if (!local.startsWith('../') && known.has(local)) {
      const next = posix.relative(posix.dirname(to), moveTarget(local)) || '.';
      return next === posix.normalize(path) ? value : (path.startsWith('./') && !next.startsWith('.') ? './' : '') + next + suffix;
    }
    const task = posix.normalize(path);
    return known.has(task) && moveTarget(task) !== task ? moveTarget(task) + suffix : value;
  };
  const rewriteJson = (value: any, from: string, to: string): any => typeof value === 'string' ? rewrite(value, from, to)
    : Array.isArray(value) ? value.map(item => rewriteJson(item, from, to))
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [rewrite(key, from, to), rewriteJson(item, from, to)]))
    : value;
  let rewritten = 0;
  for (const { old, target } of entries) {
    if (insideAgents(old) || records.has(old) || !/\.(json|md)$/i.test(old)) continue;
    const text = contents.get(old) ?? await read(old);
    let next = text;
    if (/\.json$/i.test(old)) {
      let value: any;
      try { value = JSON.parse(text); } catch { continue; }
      const changed = rewriteJson(value, old, target);
      if (JSON.stringify(changed) !== JSON.stringify(value)) next = JSON.stringify(changed, null, /\n\s/.test(text) ? 2 : undefined) + (text.endsWith('\n') ? '\n' : '');
    } else {
      next = text.replace(/(\]\()([^)\s]+)(\))|(src=")([^"]+)(")|(`)([^`\n]+)(`)/g,
        (match, a, b, c, d, e, f, g, h, i) => a ? a + rewrite(b, old, target) + c : d ? d + rewrite(e, old, target) + f : g + rewrite(h, old, target) + i);
    }
    if (next !== text) { contents.set(old, next); rewritten++; }
  }

  // Apply: moves are renames within the task; rewritten files are written in place.
  for (const { old, target } of entries) {
    await mkdir(dirname(join(directory, target)), { recursive: true });
    if (old !== target) await rename(join(directory, old), join(directory, target));
    const text = contents.get(old);
    if (text !== undefined) await writeFile(join(directory, target), text);
  }
  for (const [key, text] of contents) {
    if (!key.startsWith('\0')) continue;
    const target = join(directory, key.slice(1));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
  }
  for (const file of retired) await rm(join(directory, file), { force: true });
  // Remove the old directories the moves emptied.
  const emptied = new Set<string>();
  for (const file of [...entries.filter(entry => entry.old !== entry.target).map(entry => entry.old), ...retired]) {
    for (let parent = dirname(file); parent !== '.'; parent = dirname(parent)) emptied.add(parent);
  }
  for (const path of [...emptied].sort((a, b) => b.split('/').length - a.split('/').length)) {
    await rmdir(join(directory, path)).catch(error => { if (!['ENOTEMPTY', 'ENOENT', 'EEXIST'].includes(error.code)) throw error; });
  }
  if (await present(join(directory, 'clothing-part-layering/references/preparation.json'))) throw new Error('clothing preparation.json 未移除');

  const retiredRoots = new Set([...retired].map(file => {
    const parts = file.split('/'), index = parts.findIndex(part => part.includes('.previous-') || /^step\d{2}$/.test(part) || part === 'run.json' || part === 'preparation.json');
    return parts.slice(0, index + 1).join('/');
  }));
  if (retiredRoots.size) notes.push(`已从转换后的目录移除不再使用的内容（备份中保留）：${[...retiredRoots].join('、')}`);
  if (rewritten) notes.push(`更新了 ${rewritten} 个报告/记录文件中的路径`);
  if (stamps.size) notes.push(`重算了 ${stamps.size} 个产物步骤的指纹`);
  return { directory, backup, notes };
}
