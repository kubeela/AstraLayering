import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

export type CommandOptions = { cwd?: string; env: NodeJS.ProcessEnv; log?: string };
export type Command = (command: string, args: string[], options: CommandOptions) => Promise<string>;
export const runCommand: Command = async (command, args, options) => {
  const log = options.log ? createWriteStream(options.log, { flags: 'a', mode: 0o600 }) : undefined;
  try {
    return await new Promise<string>((done, reject) => {
      const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      let output = '';
      child.stdout.on('data', bytes => { output = (output + bytes).slice(-1024 * 1024); log?.write(bytes); });
      child.stderr.on('data', bytes => log?.write(bytes));
      child.once('error', reject);
      child.once('close', code => code === 0 ? done(output.trim()) : reject(new Error(`${command} 退出码 ${code}${options.log ? `；日志：${options.log}` : ''}`)));
      log?.once('error', error => { child.kill(); reject(error); });
    });
  } finally { if (log) await new Promise<void>(resolve => log.end(resolve)); }
};
