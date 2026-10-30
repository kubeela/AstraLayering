import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import lockfile from 'proper-lockfile';

// QStandardPaths on Windows uses Known Folders, not the inherited APPDATA or
// XDG variables. Resolve the same native directory rather than guessing it.
// PowerShell takes a second or more to start, so one lookup serves the process.
type Lookup = (file: string, args: string[], options: { encoding: 'utf8'; windowsHide: boolean; timeout: number }) => Promise<{ stdout: string }>;
let configDirectory: Promise<string> | undefined;
export function windowsKritaConfigDirectory(lookup: Lookup = promisify(execFile) as Lookup, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  return configDirectory ??= knownLocalAppData(lookup, env).catch(error => { configDirectory = undefined; throw error; });
}

async function knownLocalAppData(lookup: Lookup, env: NodeJS.ProcessEnv): Promise<string> {
  const powershell = join(env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  let failure: string;
  try {
    const { stdout } = await lookup(powershell,
      ['-NoProfile', '-NonInteractive', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8; [Environment]::GetFolderPath("LocalApplicationData")'],
      { encoding: 'utf8', windowsHide: true, timeout: 10_000 });
    const directory = stdout.trim();
    if (directory && isAbsolute(directory)) return directory;
    failure = `PowerShell 返回了 ${JSON.stringify(directory)}`;
  } catch (error) {
    failure = ((error as { stderr?: string }).stderr?.trim() || (error as Error).message);
  }
  // Windows sets LOCALAPPDATA from the same Known Folder at logon, so it is a
  // sound fallback when PowerShell is missing or blocked by policy.
  if (env.LOCALAPPDATA && isAbsolute(env.LOCALAPPDATA)) return env.LOCALAPPDATA;
  throw new Error(`无法定位 Windows Krita 用户配置目录（LocalApplicationData）：${failure}`);
}

// Edits kritarc (KConfig INI) in place. A header like [python][sub] opens a
// nested group, not [python]; a key may carry modifiers such as [$i]. The
// result holds exactly one plain enable_<module>=true inside [python].
export function enableKritaPlugin(text: string, module: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(module)) throw new Error('无效的 Krita 插件模块名');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const key = `enable_${module}`, entry = new RegExp(`^\\s*${key}\\s*(?:\\[[^\\]]*\\])*\\s*=`);
  const lines = text.split(/\r?\n/), next: string[] = [];
  let inPython = false, group = -1, enabled = false;
  for (const line of lines) {
    if (/^\s*\[/.test(line)) {
      inPython = /^\s*\[python\]\s*$/.test(line);
      if (inPython && group < 0) group = next.length;
    } else if (inPython && entry.test(line)) {
      if (enabled) continue;
      enabled = true;
      next.push(`${key}=true`);
      continue;
    }
    next.push(line);
  }
  if (!enabled) {
    if (group >= 0) next.splice(group + 1, 0, `${key}=true`);
    else return text + (text && !text.endsWith('\n') ? eol : '') + `[python]${eol}${key}=true${eol}`;
  }
  return next.join(eol);
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
//
// The view's pykrita holds only this bridge, so Krita's bundled Python plugins
// do not load either. Windows shares the user's kritarc, so whichever of them the
// user enabled would otherwise start in every unattended section: an extra
// docker or a plugin error dialog nobody can close stalls the instance. Linux and
// macOS reach the same state through a private kritarc that enables only the bridge.
export async function prepareWindowsKritaApplication(root: string, executable: string, resource: string): Promise<string> {
  const installation = await kritaInstallation(executable);
  const binaryDirectory = dirname(resolve(executable));
  const view = join(root, 'application'), scripts = join(view, 'share/krita/pykrita');
  await mkdir(scripts, { recursive: true });
  const link = (source: string, target: string) => symlink(source, target, 'junction');
  // Entries that are themselves junctions or links are linked again, never copied.
  const mirror = async (from: string, to: string, skip?: string) => {
    for (const entry of await readdir(from, { withFileTypes: true })) {
      if (entry.name === skip) continue;
      const source = join(from, entry.name), target = join(to, entry.name);
      if (entry.isDirectory() || entry.isSymbolicLink() && (await stat(source).catch(() => undefined))?.isDirectory()) await link(source, target);
      else await copyFile(source, target);
    }
  };
  await link(binaryDirectory, join(view, 'bin'));
  for (const name of ['lib', 'python']) if (existsSync(join(installation, name))) await link(join(installation, name), join(view, name));
  await mirror(join(installation, 'share'), join(view, 'share'), 'krita');
  await mirror(join(installation, 'share/krita'), join(view, 'share/krita'), 'pykrita');
  await mirror(join(resource, 'pykrita'), scripts);
  return join(view, 'bin', basename(executable));
}

// The view needs Krita's standard layout: <root>/bin/<executable>, <root>/lib and
// <root>/share/krita. Say which part is missing instead of failing in readdir.
async function kritaInstallation(executable: string): Promise<string> {
  const path = resolve(executable), binaryDirectory = dirname(path), installation = dirname(binaryDirectory);
  const expected = '需要标准安装结构：<安装目录>\\bin\\krita.exe、<安装目录>\\lib 与 <安装目录>\\share\\krita。' +
    '--krita 请传安装目录 bin 下的 krita.exe；便携版解压后同样使用其中的 bin\\krita.exe。';
  if (!(await stat(path).catch(() => undefined))?.isFile()) throw new Error(`找不到 Krita 可执行文件：${path}`);
  if (basename(binaryDirectory).toLowerCase() !== 'bin') throw new Error(`无法识别 Krita 安装目录：${path} 不在 bin 目录中。${expected}`);
  for (const part of ['lib', 'share/krita'])
    if (!(await stat(join(installation, part)).catch(() => undefined))?.isDirectory())
      throw new Error(`无法识别 Krita 安装目录：${installation} 缺少 ${part}。${expected}`);
  return installation;
}
