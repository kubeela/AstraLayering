import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import lockfile from 'proper-lockfile';

// QStandardPaths on Windows uses Known Folders, not the inherited APPDATA or
// XDG variables. Resolve the same native directory rather than guessing it.
export async function windowsKritaConfigDirectory(): Promise<string> {
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const { stdout } = await promisify(execFile)(powershell,
    ['-NoProfile', '-NonInteractive', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8; [Environment]::GetFolderPath("LocalApplicationData")'],
    { encoding: 'utf8', windowsHide: true, timeout: 10_000 });
  const directory = stdout.trim();
  if (!directory) throw new Error('无法定位 Windows Krita 用户配置目录');
  return directory;
}

export function enableKritaPlugin(text: string, module: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(module)) throw new Error('无效的 Krita 插件模块名');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/), key = `enable_${module}`;
  let inPython = false, group = -1, enabled = false;
  for (let i = 0; i < lines.length; i++) {
    const header = /^\s*\[([^\]]+)\]\s*$/.exec(lines[i]);
    if (header) { inPython = header[1] === 'python'; if (inPython) group = i; }
    if (inPython && new RegExp(`^\\s*${key}\\s*=`).test(lines[i])) {
      if (lines[i] !== `${key}=true`) lines[i] = `${key}=true`;
      enabled = true;
    }
  }
  if (!enabled) {
    if (group >= 0) lines.splice(group + 1, 0, `${key}=true`);
    else return text + (text && !text.endsWith('\n') ? eol : '') + `[python]${eol}${key}=true${eol}`;
  }
  return lines.join(eol);
}

// Keep the one enable flag. Never restore a whole old kritarc over another
// Krita's newer preferences, and never change the global ResourceDirectory.
export async function ensureWindowsKritaPlugin(configDirectory: string, module: string): Promise<void> {
  await mkdir(configDirectory, { recursive: true });
  const path = join(configDirectory, 'kritarc');
  await writeFile(path, '', { flag: 'ax' }).catch(error => { if (error.code !== 'EEXIST') throw error; });
  const release = await lockfile.lock(path, { retries: { retries: 8, minTimeout: 50, maxTimeout: 500 }, stale: 10_000 });
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const original = await readFile(path, 'utf8'), next = enableKritaPlugin(original, module);
      if (next === original) return;
      const temporary = `${path}.astra-${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, next);
        // Other applications need not honor our lock. Retry if they saved a
        // newer file while we prepared this edit; never restore an old backup.
        if (await readFile(path, 'utf8') !== original) continue;
        await rename(temporary, path);
        return;
      } finally { await rm(temporary, { force: true }); }
    }
    throw new Error('Krita 配置正在变化，未写入桥接启用项，请稍后重试');
  } finally { await release(); }
}

// --resource-location controls data discovery but Windows' embedded Python can
// initialize its import paths from installation-relative folders first. A
// private installation view makes that fallback contain our bridge too. Native
// binaries and stock resources are reused through directory junctions; no files
// are installed in the user's pykrita folder or the selected Krita installation.
export async function prepareWindowsKritaApplication(root: string, executable: string, resource: string): Promise<string> {
  const binaryDirectory = dirname(resolve(executable));
  const installation = basename(binaryDirectory).toLowerCase() === 'bin' ? dirname(binaryDirectory) : binaryDirectory;
  const view = join(root, 'application'), scripts = join(view, 'share/krita/pykrita');
  await mkdir(scripts, { recursive: true });
  const link = async (source: string, target: string) => symlink(source, target, 'junction');
  await link(binaryDirectory, join(view, 'bin'));
  for (const name of ['lib', 'python']) await link(join(installation, name), join(view, name));
  for (const entry of await readdir(join(installation, 'share'), { withFileTypes: true })) {
    if (entry.name === 'krita') continue;
    const source = join(installation, 'share', entry.name), target = join(view, 'share', entry.name);
    if (entry.isDirectory()) await link(source, target); else await copyFile(source, target);
  }
  for (const entry of await readdir(join(installation, 'share/krita'), { withFileTypes: true })) {
    if (entry.name === 'pykrita') continue;
    const source = join(installation, 'share/krita', entry.name), target = join(view, 'share/krita', entry.name);
    if (entry.isDirectory()) await link(source, target); else await copyFile(source, target);
  }
  // Use a junction to this section's plugin files, without copying the user's
  // other Python plugins into the launch view.
  for (const entry of await readdir(join(resource, 'pykrita'), { withFileTypes: true })) {
    const source = join(resource, 'pykrita', entry.name), target = join(scripts, entry.name);
    if (entry.isDirectory()) await link(source, target); else await copyFile(source, target);
  }
  return join(view, 'bin', basename(executable));
}
