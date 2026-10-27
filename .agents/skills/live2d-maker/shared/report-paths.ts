import { dirname, isAbsolute, resolve, sep } from 'node:path';

// The viewer and exporter resolve report links in the same order. Relative links
// may be rooted at the report, its ancestors, or the task root.
export function reportTargets(root: string, report: string, target: string): string[] {
  root = resolve(root);
  try { target = decodeURIComponent(target); } catch { return []; }
  const inside = (path: string) => path === root || path.startsWith(root + sep);
  if (isAbsolute(target)) return inside(target) ? [target] : [];
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return [];
  const paths: string[] = [];
  let base = dirname(resolve(root, report));
  while (inside(base)) {
    const path = resolve(base, target);
    if (inside(path)) paths.push(path);
    if (base === root) break;
    base = dirname(base);
  }
  return [...new Set(paths)];
}
