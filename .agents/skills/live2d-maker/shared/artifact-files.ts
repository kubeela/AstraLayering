import { lstat, mkdir, open, readdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

export const inside = (root: string, path: string) => path === root || path.startsWith(root + sep);
export async function safePath(root: string, path = ''): Promise<string> {
  if (isAbsolute(path) || path.split(/[\\/]/).some(p => p === '..') || path.includes('\0')) throw new Error('无效的任务文件路径');
  const canonical = await realpath(root), target = resolve(canonical, path);
  if (!inside(canonical, target)) throw new Error('文件不在任务目录内');
  // Reject symlinks (including parents) rather than follow aliases into another task.
  let current = canonical;
  for (const segment of relative(canonical, target).split(sep).filter(Boolean)) {
    current = join(current, segment);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error('任务文件不能通过符号链接访问');
  }
  return target;
}
export async function jsonFile<T = any>(root: string, path: string): Promise<T | undefined> {
  try { return JSON.parse(await readFile(await safePath(root, path), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw new Error(path + '：' + (error as Error).message); }
}
export async function atomicJSON(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const temp = path + '.' + randomUUID() + '.tmp';
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(temp, path);
}
export const artifactExtensions = /\.(png|jpe?g|webp|svg|kra|psd|ora|json|jsonl|jsonl.gz|md(?:\.tmp)?|py|[cm]?js|ts|txt)$/i;
export async function inventory(root: string, versions?: Record<string, string>) {
  const files: string[] = [];
  const excluded = new Set(['node_modules']);
  async function walk(path: string, depth: number) {
    if (depth > 40) throw new Error('任务目录嵌套超过 40 层');
    const entries = await readdir(join(root, path), { withFileTypes: true });
    // Krita's bundled brushes/patterns are software resources, not generated art.
    if (entries.some(entry => /^Krita_.*_Default_Resources\.bundle$/.test(entry.name))) return;
    for (const entry of entries) {
      if (entry.name.startsWith('.') || excluded.has(entry.name) || entry.isSymbolicLink()) continue;
      if (path.split('/').includes('agents') && !path.split('/').includes('workspace') && entry.name === 'cli-data') continue;
      if (path.includes('agents/') && !path.split('/').includes('workspace') && ['tmp', 'bridge-results'].includes(entry.name)) continue;
      if (path.includes('agents/') && ['auth-settings.json', 'mcp.json', 'sessions.json', 'tool-log-forwarder.json'].includes(entry.name)) continue;
      const child = path ? path + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        try { await lstat(join(root, child, 'pyvenv.cfg')); continue; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        await walk(child, depth + 1);
      }
      else if (entry.isFile() && artifactExtensions.test(entry.name)) {
        if (versions) {
          try { const info = await lstat(join(root, child)); versions[child] = `${info.mtimeMs}:${info.size}`; }
          catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
        }
        files.push(child);
      }
    }
  }
  await walk('', 0);
  return files.sort();
}
export async function tail(root: string, path: string, bytes = 24 * 1024): Promise<string> {
  let handle;
  try {
    handle = await open(await safePath(root, path), 'r');
    const info = await handle.stat();
    const start = Math.max(0, info.size - bytes), buffer = Buffer.alloc(Math.min(info.size, bytes));
    await handle.read(buffer, 0, buffer.length, start);
    return (start ? '…（仅显示末尾）\n' : '') + buffer.toString('utf8');
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw error; }
  finally { await handle?.close(); }
}
