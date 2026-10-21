import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { access, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import lockfile from 'proper-lockfile';
import type { ImageProcessingOptions } from '../image-processing.ts';
import { resolveRunsDirectory } from '../paths.ts';
import { checkKrita } from '../raster/krita.ts';

const resources = fileURLToPath(new URL('./', import.meta.url));
const pipHash = 'c46efd13b6aa8279f33f2864459c8ce587ea6a1a59ee20de055868d8f7688f7f';
const pipUrl = 'https://files.pythonhosted.org/packages/c9/bc/b7db44f5f39f9d0494071bddae6880eb645970366d0a200022a1a93d57f5/pip-25.0.1-py3-none-any.whl';
type Host = { python: string; abi: string; platform: string; krita: string; home: string; config: string };
type WorkerResult = { success: boolean; host: Host; modules?: Record<string, string>; matting?: Record<string, unknown>; error?: string };
type Job = { mode: 'probe' | 'install' | 'infer'; packages?: string; pip?: string; input?: string; output?: string };
type Runtime = { root: string; packages: string; host: Host };
type RuntimeServices = { worker: typeof runMattingWorker; pip: typeof preparePip };

export function requireMattingKrita(options: ImageProcessingOptions): string {
  if (!options.krita?.trim()) throw new Error('Nano 透明后处理需要 Krita 内嵌 Python；请用 --krita 指定已安装的 Krita 可执行文件。');
  return resolve(options.krita);
}

function stop(child: ChildProcess, force = false) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', ...(force ? ['/F'] : [])], { stdio: 'ignore' });
    killer.on('error', () => child.kill(force ? 'SIGKILL' : 'SIGTERM'));
  } else try { process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
}

// Only this private Krita instance loads the fixed worker; no user plugins/config are edited.
export async function runMattingWorker(krita: string, root: string, job: Job,
  options: ImageProcessingOptions, signal: AbortSignal): Promise<WorkerResult> {
  signal.throwIfAborted();
  const directory = join(root, 'jobs', randomUUID());
  const home = join(directory, 'home'), config = join(directory, 'config'), share = join(directory, 'share');
  const resource = join(share, 'krita'), plugin = join(resource, 'pykrita/layering_matting');
  const cache = join(root, 'cache');
  const dirs = [home, config, plugin, cache, join(directory, 'runtime'), join(directory, 'tmp'),
    join(directory, 'appdata'), join(directory, 'local'), join(home, 'Library/Preferences')];
  await Promise.all(dirs.map(path => mkdir(path, { recursive: true, mode: 0o700 })));
  await copyFile(join(resources, 'worker.py'), join(plugin, '__init__.py'));
  await writeFile(join(resource, 'pykrita/layering_matting.desktop'), '[Desktop Entry]\nType=Service\nServiceTypes=Krita/PythonPlugin\nX-KDE-Library=layering_matting\nX-Python-2-Compatible=false\nName=Layering private matting\n');
  await Promise.all([config, join(home, 'Library/Preferences'), join(directory, 'local'), join(directory, 'appdata')]
    .map(path => writeFile(join(path, 'kritarc'), '[python]\nenable_layering_matting=true\n')));
  const jobPath = join(directory, 'job.json');
  await writeFile(jobPath, JSON.stringify({ ...job, weights: join(resources, 'vitmatte-small'),
    requirements: join(resources, 'requirements.txt'), expectedHome: home, expectedConfig: config }), { mode: 0o600 });
  const env = { ...(options.env ?? process.env), HOME: home, USERPROFILE: home,
    APPDATA: join(directory, 'appdata'), LOCALAPPDATA: join(directory, 'local'),
    XDG_CONFIG_HOME: config, XDG_DATA_HOME: share, XDG_CACHE_HOME: cache,
    XDG_RUNTIME_DIR: join(directory, 'runtime'), TMPDIR: join(directory, 'tmp'),
    TEMP: join(directory, 'tmp'), TMP: join(directory, 'tmp'),
    PYTHONNOUSERSITE: '1', PYTHONDONTWRITEBYTECODE: '1',
    PIP_CONFIG_FILE: process.platform === 'win32' ? 'NUL' : '/dev/null', PIP_CACHE_DIR: join(cache, 'pip'),
    HF_HOME: join(cache, 'huggingface'), HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1',
    NUMBA_CACHE_DIR: join(cache, 'numba'), TORCH_HOME: join(cache, 'torch'),
    LAYERING_MATTING_JOB: jobPath };
  const logPath = join(directory, 'krita.log'), log = createWriteStream(logPath, { mode: 0o600 });
  const child = spawn(krita, ['--nosplash', '--resource-location', resource], {
    cwd: directory, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  child.stdout!.pipe(log, { end: false }); child.stderr!.pipe(log, { end: false });
  let forced: NodeJS.Timeout | undefined, timedOut = false, resultReady = false;
  const abort = () => { stop(child); forced = setTimeout(() => stop(child, true), 5000); forced.unref(); };
  const timeout = setTimeout(() => { timedOut = true; abort(); }, job.mode === 'install' ? 20 * 60_000 : 5 * 60_000);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  // A plugin may finish before Krita enters its main event loop, where quit() is
  // ignored. Its atomic result is authoritative; terminate only our own instance.
  const watching = new AbortController();
  const watcher = (async () => {
    try {
      while (!watching.signal.aborted) {
        try { await access(join(directory, 'result.json')); resultReady = true; }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        if (resultReady) { await delay(500, undefined, { signal: watching.signal }); abort(); return; }
        await delay(200, undefined, { signal: watching.signal });
      }
    } catch (error) { if (!watching.signal.aborted) { abort(); throw error; } }
  })();
  let code: number | null;
  try {
    code = await new Promise<number | null>((done, reject) => {
      child.once('error', reject); child.once('close', done);
    });
  } finally {
    clearTimeout(timeout); if (forced) clearTimeout(forced);
    watching.abort(); await watcher;
    signal.removeEventListener('abort', abort); log.end();
  }
  signal.throwIfAborted();
  if (timedOut) throw new Error(`Krita matting ${job.mode} 超时；日志：${logPath}`);
  let result: WorkerResult;
  try { result = JSON.parse(await readFile(join(directory, 'result.json'), 'utf8')); }
  catch (error) { throw new Error(`Krita 未执行内嵌 Python matting 插件（exit=${code}）。请检查 --krita 入口、Python 插件及显示环境；启动包装器必须保留传入的 HOME / XDG 隔离配置。日志：${logPath}`, { cause: error }); }
  if (!result.success || code !== 0 && !resultReady) throw new Error(`Krita matting ${job.mode} 失败：${result.error ?? `exit=${code}`}\n日志：${logPath}`);
  return result;
}

async function readReceipt(path: string): Promise<Runtime | undefined> {
  try {
    const receipt = JSON.parse(await readFile(path, 'utf8')) as Runtime;
    await access(join(receipt.packages, 'torch/__init__.py'));
    return { root: receipt.root, packages: receipt.packages, host: receipt.host };
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
}

async function preparePip(root: string, signal: AbortSignal): Promise<string> {
  const pip = join(root, 'pip-25.0.1-py3-none-any.whl');
  let bytes: Buffer | undefined;
  try { bytes = await readFile(pip); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (!bytes || createHash('sha256').update(bytes).digest('hex') !== pipHash) {
    const response = await fetch(pipUrl, { signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]) });
    if (!response.ok) throw new Error('自动安装 pip 下载失败：HTTP ' + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== pipHash) throw new Error('自动安装 pip 校验失败。');
    await writeFile(pip, bytes, { mode: 0o600 });
  }
  return pip;
}

// Installation is demanded by inference, never by provider selection or route startup.
export async function ensureMattingRuntime(options: ImageProcessingOptions, signal: AbortSignal,
  services: RuntimeServices = { worker: runMattingWorker, pip: preparePip }): Promise<Runtime> {
  const krita = requireMattingKrita(options);
  const installation = await checkKrita(krita, undefined, options.env);
  signal.throwIfAborted();
  const metadata = await stat(krita);
  const hash = createHash('sha256').update(JSON.stringify({ krita, version: installation.version,
    platform: process.platform, arch: process.arch, size: metadata.size, mtime: metadata.mtimeMs,
    pythonHome: (options.env ?? process.env).PYTHONHOME, pythonPath: (options.env ?? process.env).PYTHONPATH }))
    .update(await readFile(join(resources, 'requirements.txt'))).update(await readFile(join(resources, 'worker.py'))).digest('hex').slice(0, 20);
  const root = join(resolveRunsDirectory(options.runsRoot), '.runtime/matting', hash), receiptPath = join(root, 'ready.json');
  await mkdir(root, { recursive: true, mode: 0o700 });
  let receipt = await readReceipt(receiptPath);
  if (receipt) { options.progress?.('Nano 透明后处理：复用运行目录内已安装的 Python 模块。'); return receipt; }
  let release: (() => Promise<void>) | undefined, waiting = false, compromised: Error | undefined;
  while (!release) {
    signal.throwIfAborted();
    try { release = await lockfile.lock(root, { realpath: false, stale: 30_000, update: 5000, onCompromised(error) { compromised = error; } }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ELOCKED') throw error;
      if (!waiting) { options.progress?.('Nano 透明后处理：等待同一运行目录的 Python 模块安装完成。'); waiting = true; }
      await delay(250, undefined, { signal });
    }
  }
  const stage = join(root, `.install-${randomUUID()}`);
  try {
    receipt = await readReceipt(receiptPath);
    if (receipt) return receipt;
    options.progress?.('Nano 透明后处理：首次自动安装 CPU Python 模块到 ' + root + '；仅使用 Krita 内嵌 Python。');
    await services.worker(krita, root, { mode: 'probe' }, options, signal);
    const pip = await services.pip(root, signal);
    await mkdir(stage, { mode: 0o700 });
    const result = await services.worker(krita, root, { mode: 'install', pip, packages: stage }, options, signal);
    signal.throwIfAborted(); if (compromised) throw compromised;
    const packages = join(root, 'packages');
    await rm(packages, { recursive: true, force: true }); await rename(stage, packages);
    receipt = { root, packages, host: result.host };
    const temporary = receiptPath + '.tmp';
    await writeFile(temporary, JSON.stringify({ ...receipt, modules: result.modules, installedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
    await rename(temporary, receiptPath);
    options.progress?.('Nano 透明后处理：Python 模块安装及实际推理检查通过，后续任务直接复用。');
    return receipt;
  } finally { await rm(stage, { recursive: true, force: true }); await release(); }
}

export async function matteImage(input: string, output: string, options: ImageProcessingOptions, signal: AbortSignal): Promise<Record<string, unknown>> {
  const runtime = await ensureMattingRuntime(options, signal);
  options.progress?.('Nano 透明后处理：ViTMatte 提取透明度并恢复前景颜色。');
  const result = await runMattingWorker(requireMattingKrita(options), runtime.root,
    { mode: 'infer', packages: runtime.packages, input: resolve(input), output: resolve(output) }, options, signal);
  if (result.host.abi !== runtime.host.abi || result.host.python !== runtime.host.python) throw new Error('Krita 内嵌 Python 已改变；请清理对应 .runtime/matting 缓存后重试。');
  return { ...result.matting, runtime: runtime.root, python: result.host.python };
}
