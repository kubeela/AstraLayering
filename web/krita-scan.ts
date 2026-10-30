import { fork, type ChildProcess } from 'node:child_process';
import { access, constants, opendir, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Finds Krita executables for the settings form. The walk runs in a child process
// so a whole-disk scan never blocks the workbench; progress arrives over IPC.
export type KritaScanState = { running: boolean; scanned: number; current: string; found: string[]; startedAt?: string; finishedAt?: string; error?: string };
type Plan = { known: string[]; roots: string[]; depth: number };
type Message = { scanned: number; current: string } | { found: string } | { error: string };

const windows = process.platform === 'win32';
const skipped = new Set(['/proc', '/sys', '/dev', '/run', '/snap', '/System', '/private/var/vm']);
const skippedNames = new Set(['node_modules', '$Recycle.Bin', 'System Volume Information']);
export const kritaName = (name: string) => windows ? name.toLowerCase() === 'krita.exe' : name === 'krita' || /^krita.*\.appimage$/i.test(name);

export function defaultPlan(): Plan {
  const home = homedir();
  const known = [
    ...(process.env.PATH ?? '').split(delimiter).filter(Boolean),
    '/usr/bin', '/usr/local/bin', '/opt', '/opt/krita/bin', '/snap/bin', '/var/lib/flatpak/exports/bin', '/Applications/krita.app/Contents/MacOS',
    join(home, '.local/bin'), join(home, 'Applications'), join(home, 'Applications/krita.app/Contents/MacOS'), join(home, 'Downloads'), join(home, 'Desktop'),
    'C:\\Program Files\\Krita (x64)\\bin', 'C:\\Program Files\\Krita\\bin', join(home, 'AppData\\Local\\Programs\\Krita (x64)\\bin'),
  ];
  const roots = windows ? 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => letter + ':\\') : ['/'];
  return { known, roots, depth: 12 };
}

async function executable(path: string): Promise<string | undefined> {
  try {
    if (!(await stat(path)).isFile()) return;
    await access(path, windows ? constants.F_OK : constants.X_OK);
    return await realpath(path);
  } catch { return; }
}

// Returns the final progress, which the caller sends last.
export async function scan(plan: Plan, send: (message: Message) => void): Promise<Message> {
  const seen = new Set<string>(); let scanned = 0, last = 0;
  const report = async (path: string) => {
    const real = await executable(path);
    if (real && !seen.has(real)) { seen.add(real); send({ found: path }); }
  };
  const progress = (current: string) => {
    if (Date.now() - last < 200) return;
    last = Date.now(); send({ scanned, current });
  };
  for (const directory of plan.known) {
    for (const name of windows ? ['krita.exe'] : ['krita']) await report(join(directory, name));
    try { for await (const entry of await opendir(directory)) if (kritaName(entry.name) && !entry.isDirectory()) await report(join(directory, entry.name)); }
    catch { /* absent or unreadable */ }
  }
  // Breadth first, so shallow install locations are reported before deep trees.
  let level = plan.roots.map(path => ({ path, depth: 0 }));
  while (level.length) {
    const next: typeof level = [];
    for (const { path, depth } of level) {
      if (skipped.has(path) || (windows && /^[A-Z]:\\Windows$/i.test(path))) continue;
      let entries;
      try { entries = await opendir(path); } catch { continue; }
      progress(path);
      try {
        for await (const entry of entries) {
          scanned++;
          const child = join(path, entry.name);
          // Symlinked directories are not followed: they would revisit or loop.
          if (entry.isDirectory()) {
            if (depth + 1 < plan.depth && !entry.name.startsWith('.') && !skippedNames.has(entry.name)) next.push({ path: child, depth: depth + 1 });
          } else if (kritaName(entry.name)) await report(child);
        }
      } catch { /* vanished or unreadable mid-listing */ }
    }
    level = next;
  }
  return { scanned, current: '' };
}

export function createKritaScan(plan: () => Plan = defaultPlan) {
  let state: KritaScanState = { running: false, scanned: 0, current: '', found: [] };
  let child: ChildProcess | undefined;
  return {
    state: () => state,
    start() {
      if (child) return state;
      state = { running: true, scanned: 0, current: '', found: [], startedAt: new Date().toISOString() };
      const process_ = fork(fileURLToPath(import.meta.url), [JSON.stringify(plan())], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      child = process_;
      process_.on('message', (message: Message) => {
        if ('found' in message) state = { ...state, found: [...state.found, message.found] };
        else if ('error' in message) state = { ...state, error: message.error };
        else state = { ...state, scanned: message.scanned, current: message.current };
      });
      process_.once('exit', (code, signal) => {
        if (child === process_) child = undefined;
        state = { ...state, running: false, current: '', finishedAt: new Date().toISOString(),
          ...(code && !state.error ? { error: '扫描进程异常退出：' + code } : signal && signal !== 'SIGTERM' ? { error: '扫描进程被终止：' + signal } : {}) };
      });
      return state;
    },
    stop() { child?.kill(); return state; },
  };
}

if (import.meta.main && process.send) {
  const send = (message: Message) => process.send!(message);
  let final: Message;
  try { final = await scan(JSON.parse(process.argv[2]!), send); }
  catch (error) { final = { error: (error as Error).message }; }
  // Disconnect only after the last message is flushed.
  process.send(final, () => process.disconnect());
}
