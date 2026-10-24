import { preparePrivateKrita } from '../shared/krita/private-environment.ts';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, readFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export type NativeResult = { success: boolean; error?: string; width: number; height: number; nativeVersion: string;
  relations: { id: string; bounds: number[]; fullPaint: string; receiver: string; clipBase: string; frames: { offset: number[]; file: string; clipped: string }[] }[] };
export type NativeInspect = (document: string, relations: any[], output: string, krita: string,
  env: NodeJS.ProcessEnv, signal?: AbortSignal) => Promise<NativeResult>;

export const inspectNative: NativeInspect = async (document, relations, output, krita, inherited, signal) => {
  signal?.throwIfAborted();
  const root = await mkdtemp(join(tmpdir(), 'astra-shadow-'));
  const { resource, env: privateEnv } = await preparePrivateKrita(root, 'astra_shadow',
    fileURLToPath(new URL('./native_worker.py', import.meta.url)), inherited);
  const job = join(root, 'job.json');
  await mkdir(output, { recursive: true });
  await writeFile(job, JSON.stringify({document,relations,output}), {mode:0o600});
  const env: NodeJS.ProcessEnv = { ...privateEnv, ASTRA_SHADOW_JOB:job, ...(process.platform === 'linux' ? {
    QT_QPA_PLATFORM:'xcb', FONTCONFIG_PATH: inherited.FONTCONFIG_PATH || '/etc/fonts', FONTCONFIG_FILE: inherited.FONTCONFIG_FILE || '/etc/fonts/fonts.conf',
  } : {}) };
  let displayProcess: ReturnType<typeof spawn> | undefined;
  if (process.platform === 'linux' && !env.DISPLAY) {
    // The bundled Krita may have only xcb. Own this display; do not alter any running X server.
    displayProcess = spawn(inherited.ASTRA_STUDIO_XVFB || 'Xvfb', ['-displayfd','1','-screen','0','1280x800x24','-nolisten','tcp'], {env,stdio:['ignore','pipe','pipe']});
    try {
      env.DISPLAY = ':' + await new Promise<string>((resolve,reject) => {
        let buffer = '';
        const timer = setTimeout(() => reject(new Error('阴影检查 Xvfb 启动超时')),10_000);
        displayProcess!.once('error',e => {clearTimeout(timer);reject(e);});
        displayProcess!.once('exit',() => {clearTimeout(timer);reject(new Error('阴影检查 Xvfb 启动失败'));});
        displayProcess!.stdout!.on('data',b => {buffer += b.toString();if (/^\d+\n/.test(buffer)) {clearTimeout(timer);resolve(buffer.trim());}});
      });
    } catch (e) {
      displayProcess.kill();
      const {rm} = await import('node:fs/promises'); await rm(root,{recursive:true,force:true}); throw e;
    }
  }
  const bundle = join(dirname(krita), 'usr');
  if (inherited.ASTRA_STUDIO_KRITA_PYTHONHOME) env.PYTHONHOME = inherited.ASTRA_STUDIO_KRITA_PYTHONHOME;
  else if (await stat(join(bundle,'lib/krita-python-libs')).catch(() => undefined)) env.PYTHONHOME = bundle;
  if (inherited.ASTRA_STUDIO_KRITA_PYTHONPATH) env.PYTHONPATH = inherited.ASTRA_STUDIO_KRITA_PYTHONPATH;
  else if (env.PYTHONHOME === bundle) env.PYTHONPATH = [join(bundle,'share/krita/pykrita'),join(bundle,'lib/krita-python-libs')].join(process.platform === 'win32' ? ';' : ':');
  const child = spawn(krita, ['--nosplash','--resource-location',resource], {cwd:root,env,stdio:['ignore','pipe','pipe'],windowsHide:true,detached:process.platform !== 'win32'});
  let log = '', exited = false, resultReady = false, launchError: Error | undefined;
  child.stdout?.on('data', b => { log = (log + b.toString()).slice(-12000); });
  child.stderr?.on('data', b => { log = (log + b.toString()).slice(-12000); });
  const closed = new Promise<void>(resolve => { child.once('close', (code, exitSignal) => {
    exited = true;
    log += `\n[astra-shadow] Krita exit: code=${code}, signal=${exitSignal}\n`;
    resolve();
  }); });
  child.once('error', e => { launchError = e; });
  const stop = (force = false) => {
    if (!child.pid || exited) return;
    if (process.platform === 'win32') child.kill(force ? 'SIGKILL' : 'SIGTERM');
    else try { process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM'); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e; }
  };
  const abort = () => stop();
  signal?.addEventListener('abort', abort, {once:true});
  try {
    const until = Date.now() + 180_000;
    while (Date.now() < until) {
      signal?.throwIfAborted();
      if (launchError) throw launchError;
      try {
        const result = JSON.parse(await readFile(join(output,'result.json'),'utf8')) as NativeResult;
        if (!result.success) throw new Error('原生阴影检查失败：' + result.error);
        resultReady = true;
        return result;
      } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      if (log.includes('ModuleNotFoundError') && /(?:No module named ['"]astra_shadow['"]|Could not import astra_shadow)/.test(log))
        throw new Error('Krita 已发现阴影插件，但 Python 无法导入；检查私有 HOME、CFFIXED_USER_HOME 和 macOS Library 路径。\n' + log);
      if (exited) throw new Error('Krita 未执行检查插件：' + log);
      await delay(150);
    }
    throw new Error('Krita 阴影检查超时；诊断保留于 ' + join(output,'native.log'));
  } finally {
    signal?.removeEventListener('abort', abort);
    // A successful worker requests Krita's normal shutdown. Give it time to
    // finish before using the bounded cleanup for failed or hung processes.
    if (resultReady && !signal?.aborted) await Promise.race([closed, delay(1500)]);
    stop();
    await Promise.race([closed, delay(1500)]);
    if (!exited) { stop(true); await closed; }
    displayProcess?.kill();
    await writeFile(join(output,'native.log'), log);
    const { rm } = await import('node:fs/promises'); await rm(root,{recursive:true,force:true});
  }
};
