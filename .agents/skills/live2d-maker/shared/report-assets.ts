import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { reportReferences } from './report-links.js';
import { taskRootOf, toTaskPathReal } from './task-paths.ts';

const inside = (root: string, path: string) => path === root || path.startsWith(root + sep);

// Preserve the agent's chosen layout. Only evidence cited from workspace is
// copied beside the report; unrelated drafts remain intermediate files.
export async function publishEvidence(path: string, workspace: string, output: string): Promise<string> {
  if (!inside(resolve(workspace), resolve(path))) return path;
  const root = await realpath(workspace), source = await realpath(path);
  if (!inside(root, source)) return path;
  const base = await realpath(output);
  let target = join(base, relative(root, source));
  await mkdir(dirname(target), { recursive: true });
  if (!inside(base, await realpath(dirname(target)))) {
    throw new Error('报告图片目录通过符号链接离开了输出目录');
  }
  try { await copyFile(source, target, constants.COPYFILE_EXCL); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const bytes = await readFile(source);
    if (!(await readFile(target)).equals(bytes)) {
      target = join(dirname(target), createHash('sha256').update(bytes).digest('hex').slice(0, 12) + '-' + basename(target));
      await copyFile(source, target);
    }
  }
  return target;
}

// Persisted savedPath is task-relative; old absolute records are read as is.
export async function publishObservations<T extends { savedPath: string }>(entries: readonly T[], workspace: string, output: string,
  root = taskRootOf(dirname(output))): Promise<T[]> {
  return Promise.all(entries.map(async entry => ({ ...entry,
    savedPath: await toTaskPathReal(root, await publishEvidence(entry.savedPath, workspace, output)) })));
}

export async function publishReportText(text: string, workspace: string, output: string): Promise<string> {
  const root = resolve(workspace);
  for (const ref of reportReferences(text).reverse()) {
    let target: string;
    try { target = decodeURIComponent(ref.target); } catch { continue; }
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) continue;
    const candidates = isAbsolute(target) ? [target] : [resolve(output, target), resolve(root, target)];
    let source: string | undefined;
    for (const candidate of candidates) {
      if (!inside(root, candidate)) continue;
      try { source = await realpath(candidate); break; }
      // A target that names no file (prose taken for a path, a too-long name) is left as written.
      catch (error) { if (!['ENOENT', 'ENOTDIR', 'ENAMETOOLONG'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error; }
    }
    if (!source) continue;
    const published = await publishEvidence(source, workspace, output);
    const newTarget = relative(output, published).split(sep).map(encodeURIComponent).join('/');
    const reference = text.slice(ref.start, ref.end).replace(ref.target, newTarget);
    text = text.slice(0, ref.start) + reference + text.slice(ref.end);
  }
  return text;
}

export async function publishReportAssets(report: string, workspace: string): Promise<void> {
  let text: string;
  try { text = await readFile(report, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  await writeFile(report, await publishReportText(text, workspace, dirname(report)));
}
