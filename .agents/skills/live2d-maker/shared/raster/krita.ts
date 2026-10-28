import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { delimiter, join, resolve } from 'node:path';

// The Krita a workflow uses. It is started only by agents through the krita
// tool; its version comes from the running Krita (the tool's status).
export type KritaInstallation = { executable: string };

// A light check without starting Krita: the file exists and is executable, and
// on Linux there is a display or the Xvfb the section Krita would start on.
export async function checkKrita(requested: string, env: NodeJS.ProcessEnv = process.env): Promise<KritaInstallation> {
  if (!requested?.trim()) throw new Error('请用 --krita 明确指定已安装的 Krita 可执行文件路径。');
  const executable = resolve(requested);
  try {
    if (!(await stat(executable)).isFile()) throw new Error('不是文件');
    await access(executable, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
  } catch (error) { throw new Error(`指定的 Krita 不存在或不可执行：${executable}`, { cause: error }); }
  if (process.platform === 'linux' && !env.DISPLAY && !env.WAYLAND_DISPLAY && !env.QT_QPA_PLATFORM && !await onPath(env.ASTRA_STUDIO_XVFB || 'Xvfb', env)) {
    throw new Error(`Krita 已安装，但工作流环境没有显示配置，也找不到 Xvfb：${executable}。桌面模式请继承 DISPLAY 或 WAYLAND_DISPLAY；headless 模式请安装 Xvfb（如 apt install xvfb），或用 ASTRA_STUDIO_XVFB 指定其路径，也可设置 QT_QPA_PLATFORM。`);
  }
  return { executable };
}

async function onPath(command: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  const candidates = command.includes('/') ? [command] : (env.PATH ?? '').split(delimiter).filter(Boolean).map(directory => join(directory, command));
  for (const candidate of candidates) if (await access(candidate, constants.X_OK).then(() => true, () => false)) return true;
  return false;
}
