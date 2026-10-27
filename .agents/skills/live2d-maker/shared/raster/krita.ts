import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { delimiter, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { withKritaEnvironment } from '../krita/section-krita.ts';

export type KritaInstallation = { executable: string; version: string };
export type Probe = (command: string, args: string[]) => Promise<string>;

// Probes with the environment a section Krita gets: bundled libraries and,
// without a display, the framework's Xvfb.
const probe = (command: string, args: string[], env: NodeJS.ProcessEnv = process.env): Promise<string> =>
  withKritaEnvironment(command, env, async environment => {
    const result = await promisify(execFile)(command, args, { env: environment, timeout: 15_000 });
    return `${result.stdout}\n${result.stderr}`;
  });

export async function checkKrita(requested: string, run?: Probe, env?: NodeJS.ProcessEnv): Promise<KritaInstallation> {
  if (!requested?.trim()) throw new Error('请用 --krita 明确指定已安装的 Krita 可执行文件路径。');
  const executable = resolve(requested);
  try {
    if (!(await stat(executable)).isFile()) throw new Error('不是文件');
    await access(executable, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
  } catch (error) { throw new Error(`指定的 Krita 不存在或不可执行：${executable}`, { cause: error }); }
  const actual = env ?? process.env;
  // Without a display the framework starts Xvfb for the section's Krita.
  if (!run && process.platform === 'linux' && !actual.DISPLAY && !actual.WAYLAND_DISPLAY && !actual.QT_QPA_PLATFORM && !await onPath(actual.ASTRA_STUDIO_XVFB || 'Xvfb', actual)) {
    throw new Error(`Krita 已安装，但工作流环境没有显示配置，也找不到 Xvfb：${executable}。桌面模式请继承 DISPLAY 或 WAYLAND_DISPLAY；headless 模式请安装 Xvfb（如 apt install xvfb），或用 ASTRA_STUDIO_XVFB 指定其路径，也可设置 QT_QPA_PLATFORM。`);
  }
  let output: string;
  try { output = await (run ?? ((command, args) => probe(command, args, env)))(executable, ['--version']); }
  catch (error) { throw new Error(`指定的 Krita 无法启动：${executable}。请检查安装依赖和显示环境。`, { cause: error }); }
  const version = output.match(/\bkrita\s+(\d[^\r\n]*)/i)?.[1];
  if (!version) throw new Error(`未能确认 Krita 版本：${executable}`);
  return { executable, version: version.trim() };
}

async function onPath(command: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  const candidates = command.includes('/') ? [command] : (env.PATH ?? '').split(delimiter).filter(Boolean).map(directory => join(directory, command));
  for (const candidate of candidates) if (await access(candidate, constants.X_OK).then(() => true, () => false)) return true;
  return false;
}
