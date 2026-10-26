// One listing policy for every workspace folder. Original files and formal
// deliveries remain available; limits apply to the rendered process list.
export function processFileList(files, roots, versions = {}, folderLimit = 500, totalLimit = 1000) {
  const groups = new Map();
  for (const path of files) {
    const root = roots.find(root => root === '' || path.startsWith(root + '/'));
    if (root === undefined) continue;
    const local = path.slice(root ? root.length + 1 : 0), folder = local.includes('/') ? local.slice(0, local.lastIndexOf('/')) : '';
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder).push(path);
  }
  const newest = (a, b) => Number((versions[b] || '0').split(':')[0]) - Number((versions[a] || '0').split(':')[0]) || a.localeCompare(b);
  const candidates = [...groups.values()].flatMap(paths => paths.sort(newest).slice(0, folderLimit)).sort(newest);
  const shown = new Set(candidates.slice(0, totalLimit));
  return { total: [...groups.values()].reduce((sum, paths) => sum + paths.length, 0), shown: shown.size,
    folders: [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([folder, paths]) => ({ folder, total: paths.length, files: paths.filter(path => shown.has(path)) })) };
}
