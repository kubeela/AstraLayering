import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const markerName = '.web/launcher.json';
const pnpmVersion = '10.33.0';

export function supportedNode(version) {
  const [major, minor] = version.replace(/^v/, '').split('.').map(Number);
  return major > 24 || major === 24 && minor >= 12;
}

function command(executable, args, options = {}) {
  // Windows npm/pnpm entrypoints are .cmd files. Only fixed commands go through cmd.
  return process.platform === 'win32' && ['npm', 'pnpm'].includes(executable)
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [executable, ...args].join(' ')], { cwd: root, ...options })
    : spawn(executable, args, { cwd: root, ...options });
}

function run(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = command(executable, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${executable} 退出，状态 ${code ?? '中断'}`)));
  });
}

export async function initializeConfiguration(directory) {
  const skill = join(directory, '.agents/skills/live2d-maker');
  try {
    await copyFile(join(skill, 'example.env'), join(skill, '.env'), constants.COPYFILE_EXCL);
    console.log('已创建默认模型配置。');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('沿用已有模型配置。');
  }
}

export async function healthy(url) {
  try {
    const response = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(1200) });
    const data = await response.json();
    return response.ok && data.status === 'ok' && data.application === 'astra-layering' && data.mode === 'workbench';
  } catch { return false; }
}

async function freePort(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

function openBrowser(url) {
  console.log(`\n工作台：${url}\n请在网页中新建、运行和继续任务。\n`);
  let opener;
  if (process.platform === 'darwin') opener = spawn('open', [url], { cwd: root, stdio: 'ignore' });
  else if (process.platform === 'win32') opener = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], { cwd: root, stdio: 'ignore' });
  else opener = spawn('xdg-open', [url], { cwd: root, stdio: 'ignore' });
  opener.once('error', () => console.log('未能自动打开浏览器，请打开上方地址。'));
  opener.once('exit', code => { if (code) console.log('未能自动打开浏览器，请打开上方地址。'); });
  opener.unref();
}

export async function savedService(directory) {
  try {
    const saved = JSON.parse(await readFile(join(directory, markerName), 'utf8'));
    // The marker belongs to this checkout; never reuse an arbitrary service on 4387.
    if (saved.root !== directory || !/^http:\/\/127\.0\.0\.1:\d+$/.test(saved.url)) return null;
    if (await healthy(saved.url)) return saved.url;
  } catch { /* First launch, stale marker, or unavailable service. */ }
  return null;
}

export async function main() {
  if (process.argv.includes('--help')) {
    console.log('双击仓库根目录对应系统的 start-workbench 文件。准备默认配置和依赖后打开网页；不会启动制作任务。');
    return;
  }
  if (!supportedNode(process.versions.node)) throw new Error('需要 Node.js 24.12 或更新版本。请从 https://nodejs.org/en/download 安装后重新双击。');
  await initializeConfiguration(root);
  const existing = await savedService(root);
  if (existing) { console.log('复用这份仓库已有的工作台。'); openBrowser(existing); return; }

  let port;
  for (let candidate = 4387; candidate < 4407; candidate++) {
    if (await freePort(candidate)) { port = candidate; break; }
  }
  if (!port) throw new Error('4387–4406 端口均已占用，请关闭不再使用的工作台后重试。');

  console.log('正在准备项目依赖，首次启动需要联网。请保留此窗口。');
  // npm comes with the Node installer. Pin pnpm without changing the global installation.
  await run('npm', ['exec', '--yes', `--package=pnpm@${pnpmVersion}`, '--', 'pnpm', 'install', '--frozen-lockfile']);
  const url = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['web/server.ts', '--port', String(port)], { cwd: root, stdio: 'inherit' });
  let exited = false;
  const completion = new Promise((resolve, reject) => {
    server.once('error', error => { exited = true; reject(error); });
    server.once('exit', code => { exited = true; code === 0 ? resolve() : reject(new Error(`工作台服务退出，状态 ${code ?? '中断'}`)); });
  });
  // Register rejection handling while waiting for readiness.
  completion.catch(() => {});
  const stop = () => { if (!exited) server.kill('SIGTERM'); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120 && !exited; attempt++) {
      if (await healthy(url)) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) { stop(); throw new Error('工作台未能就绪，请查看此窗口上方的具体错误。'); }
    await mkdir(join(root, '.web'), { recursive: true });
    await writeFile(join(root, markerName), JSON.stringify({ root, url, pid: server.pid }) + '\n');
    openBrowser(url);
    console.log('关闭此窗口会停止网页服务；停止制作请在网页操作。');
    await completion;
  } finally {
    stop();
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`\n启动失败：${error.message}\n修复后重新双击启动文件即可。`); process.exitCode = 1; });
}
