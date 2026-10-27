import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path';
import { pipelineIds } from './paths.ts';

// One base for every path the workflow persists or shows an agent: the task
// root <runs>/<name> (after export, demos/<name>). Inside the task a path is
// written relative to that root in POSIX form; only things outside the task,
// such as the Krita executable or skill resources, stay absolute.
//
// Reading is lenient: absolute paths from older runs are still accepted as is,
// and a relative path always means the task root.

const pipelines = new Set<string>(pipelineIds);
const inside = (root: string, path: string) => path === root || path.startsWith(root.endsWith(sep) ? root : root + sep);

const shadowModes = new Set(['mask', 'normal-depth']);

// The task root containing a pipeline, step or workspace directory: the parent
// of the innermost pipeline directory. Part group ids cannot contain '-', so
// only "shadow" needs its mode child (or nothing below it) to count. A
// directory outside the standard layout (tests, ad hoc tools) is its own root.
export function taskRootOf(directory: string): string {
  const start = resolve(directory);
  for (let current = start, child = ''; ; child = basename(current), current = dirname(current)) {
    const name = basename(current);
    if (pipelines.has(name) && (name !== 'shadow' || !child || shadowModes.has(child))) return dirname(current);
    if (dirname(current) === current) return start;
  }
}

// Writes a path for persistence or for an agent: task-relative POSIX inside the
// task root, absolute outside it. A relative input is already task-relative.
export function toTaskPath(root: string, path: string): string {
  if (!isAbsolute(path)) return posix.normalize(path.split(sep).join('/'));
  root = resolve(root); path = resolve(path);
  if (!inside(root, path)) return path;
  return relative(root, path).split(sep).join('/') || '.';
}

// Same as toTaskPath, also matching a root reached through symlinks.
export async function toTaskPathReal(root: string, path: string): Promise<string> {
  if (!isAbsolute(path) || inside(resolve(root), resolve(path))) return toTaskPath(root, path);
  const real = await realpath(root).catch(() => resolve(root));
  return toTaskPath(inside(real, resolve(path)) ? real : root, path);
}

// Resolves a persisted or agent-supplied path. Relative paths use the task root
// and may not climb out of it; absolute paths are accepted unchanged.
export function fromTaskPath(root: string, path: string): string {
  if (isAbsolute(path)) return resolve(path);
  const resolved = resolve(root, path);
  if (!inside(resolve(root), resolved)) throw new Error(`相对路径须以任务根目录为基准且不能越出任务根：${path}`);
  return resolved;
}

// Rewrites every absolute string inside the task root to its task path.
export function toTaskPaths<T>(root: string, value: T): T {
  if (typeof value === 'string') return (isAbsolute(value) ? toTaskPath(root, value) : value) as T;
  if (Array.isArray(value)) return value.map(item => toTaskPaths(root, item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toTaskPaths(root, item)])) as T;
  }
  return value;
}
