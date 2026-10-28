import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';
import type { TestContext } from 'node:test';

// Windows 不执行 Node shebang；模拟协议仍通过真实子进程运行。
export function nodeExecutables(t: TestContext): void {
  if (process.platform !== 'win32') return;
  const spawn = childProcess.spawn;
  t.mock.method(childProcess, 'spawn', ((file: string, args: string[], options: any) =>
    file.endsWith('.mjs') ? spawn(process.execPath, [file, ...args], options) : spawn(file, args, options)) as typeof spawn);
  const execFile = childProcess.execFile;
  const nodeArgs = (args: any[]) => typeof args[0] === 'string' && args[0].endsWith('.mjs')
    ? [process.execPath, [args[0], ...args[1]], ...args.slice(2)] : args;
  const execute = (...args: any[]) => Reflect.apply(execFile, childProcess, nodeArgs(args));
  Object.defineProperty(execute, promisify.custom, { value: (...args: any[]) =>
    Reflect.apply(promisify(execFile), childProcess, nodeArgs(args)) });
  childProcess.execFile = execute as typeof execFile;
  syncBuiltinESMExports();
  t.after(() => { childProcess.execFile = execFile; t.mock.restoreAll(); syncBuiltinESMExports(); });
}
