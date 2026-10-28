import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { delimiter, join, resolve } from 'node:path';
import { MissingDependencyError } from '../missing-dependency.ts';

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
  await checkDisplay(env);
  return { executable };
}

// Linux without a desktop needs the Xvfb the section Krita starts on. Not the Krita path's fault, so the
// run fails with an install hint instead of asking for another path.
export async function checkDisplay(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): Promise<void> {
  if (platform !== 'linux' || env.DISPLAY || env.WAYLAND_DISPLAY || env.QT_QPA_PLATFORM) return;
  const xvfb = env.ASTRA_STUDIO_XVFB || 'Xvfb';
  if (await onPath(xvfb, env)) return;
  throw new MissingDependencyError(`没有桌面显示（DISPLAY / WAYLAND_DISPLAY），也找不到虚拟桌面 Xvfb（${xvfb}），Krita 无法启动。`,
    '请安装 Xvfb：Debian/Ubuntu 运行 sudo apt install xvfb；Fedora/RHEL 运行 sudo dnf install xorg-x11-server-Xvfb；Arch 运行 sudo pacman -S xorg-server-xvfb。'
    + '已装在其他位置时用 ASTRA_STUDIO_XVFB 指定路径；有桌面时继承 DISPLAY 或 WAYLAND_DISPLAY 启动工作台。');
}

async function onPath(command: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  const candidates = command.includes('/') ? [command] : (env.PATH ?? '').split(delimiter).filter(Boolean).map(directory => join(directory, command));
  for (const candidate of candidates) if (await access(candidate, constants.X_OK).then(() => true, () => false)) return true;
  return false;
}
