import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

// The viewer and exporter resolve report links the same way, taking the first
// candidate that exists. A relative link is relative to the report file (Markdown
// convention); next comes the task root, which older reports also used
// (e.g. raster-layering/step01/x.png). Legacy only: older runs and demos also
// rooted links at an intermediate ancestor of the report (a section or sub-run
// directory), so those ancestors come last, nearest first, and are reached only
// when neither the report directory nor the task root yields an existing file.
// Absolute links are accepted inside the task root, or inside an alias of it
// (the same task reached through a symlinked runs root), rebased onto root.
export function reportTargets(root: string, report: string, target: string, aliases: readonly string[] = []): string[] {
  root = resolve(root);
  try { target = decodeURIComponent(target); } catch { return []; }
  const within = (base: string, path: string) => path === base || path.startsWith(base + sep);
  if (isAbsolute(target)) {
    target = resolve(target);
    if (within(root, target)) return [target];
    const alias = aliases.map(path => resolve(path)).find(path => within(path, target));
    return alias ? [resolve(root, relative(alias, target))] : [];
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return [];
  const directory = dirname(resolve(root, report)), paths = [resolve(directory, target), resolve(root, target)];
  for (let base = dirname(directory); within(root, base) && base !== root; base = dirname(base)) paths.push(resolve(base, target)); // legacy
  return [...new Set(paths.filter(path => within(root, path)))];
}
