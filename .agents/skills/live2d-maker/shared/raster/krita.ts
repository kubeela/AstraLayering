import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

export type KritaInstallation = { executable: string; version: string };
export type Probe = (command: string, args: string[]) => Promise<string>;

const probe = async (command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<string> => {
  const result = await promisify(execFile)(command, args, { env, timeout: 15_000 });
  return `${result.stdout}\n${result.stderr}`;
};

export async function checkKrita(requested: string, run?: Probe, env?: NodeJS.ProcessEnv): Promise<KritaInstallation> {
  if (!requested?.trim()) throw new Error('请用 --krita 明确指定已安装的 Krita 可执行文件路径。');
  const executable = resolve(requested);
  try {
    if (!(await stat(executable)).isFile()) throw new Error('不是文件');
    await access(executable, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
  } catch (error) { throw new Error(`指定的 Krita 不存在或不可执行：${executable}`, { cause: error }); }
  let output: string;
  try { output = await (run ?? ((command, args) => probe(command, args, env)))(executable, ['--version']); }
  catch (error) { throw new Error(`指定的 Krita 无法启动：${executable}。请检查安装依赖和显示环境。`, { cause: error }); }
  const version = output.match(/\bkrita\s+(\d[^\r\n]*)/i)?.[1];
  if (!version) throw new Error(`未能确认 Krita 版本：${executable}`);
  const actual = env ?? process.env;
  if (!run && process.platform === 'linux' && !actual.DISPLAY && !actual.WAYLAND_DISPLAY && !actual.QT_QPA_PLATFORM) {
    throw new Error(`Krita 已安装，但工作流环境没有显示配置：${executable}。桌面模式请继承 DISPLAY 或 WAYLAND_DISPLAY；headless 模式请先配置虚拟显示（如 Xvfb）及 DISPLAY，或已验证的 Qt 平台。安装方案由 skill agent 与用户确认。`);
  }
  return { executable, version: version.trim() };
}
