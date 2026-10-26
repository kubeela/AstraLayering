// One listing policy for every workspace folder. Original files and formal
// deliveries remain available; limits apply to the rendered process list.
export function processFileList(files, roots, versions = {}, totalLimit = 1000) {
  const groups = new Map();
  for (const path of files) {
    const root = roots.find(root => root === '' || path.startsWith(root + '/'));
    if (root === undefined) continue;
    const local = path.slice(root ? root.length + 1 : 0), folder = local.includes('/') ? local.slice(0, local.lastIndexOf('/')) : '';
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder).push(path);
  }
  const newest = (a, b) => Number((versions[b] || '0').split(':')[0]) - Number((versions[a] || '0').split(':')[0]) || a.localeCompare(b);
  const folders = [...groups].sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, paths]) => ({ folder, total: paths.length, files: paths.sort(newest), count: 0 }));
  const total = folders.reduce((sum, folder) => sum + folder.total, 0);
  let remaining = Math.min(totalLimit, total), active = folders;
  // Root files and each actual subfolder share the budget equally. Redistribute
  // unused shares from small folders; remainder slots follow the folder order.
  while (remaining > 0 && active.length) {
    const share = Math.floor(remaining / active.length);
    if (!share) {
      for (const folder of active.slice(0, remaining)) folder.count++;
      remaining = 0;
    } else {
      for (const folder of active) {
        const take = Math.min(share, folder.total - folder.count);
        folder.count += take; remaining -= take;
      }
      active = active.filter(folder => folder.count < folder.total);
    }
  }
  return { total, shown: folders.reduce((sum, folder) => sum + folder.count, 0),
    folders: folders.map(({ folder, total, files, count }) => ({ folder, total, files: files.slice(0, count) })) };
}
