import { spawn, type ChildProcess } from 'node:child_process';

// A .cmd launcher starts cmd.exe and a CLI child. Terminate the entire Windows tree.
export function stopCliProcess(child: ChildProcess, force = false): void {
  if (process.platform === 'win32' && child.pid) {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    killer.on('error', () => { try { child.kill(); } catch {} });
    return;
  }
  try { if (child.pid) process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); } catch {}
}
