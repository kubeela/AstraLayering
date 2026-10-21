import { execFile } from 'node:child_process';
import { access, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { promisify } from 'node:util';

export type FfmpegOptions = { env?: NodeJS.ProcessEnv; krita?: string };
export type FfmpegInstallation = { executable: string; source: 'krita' | 'path' };
export type FfmpegProbe = (executable: string, env: NodeJS.ProcessEnv) => Promise<string>;

const probe: FfmpegProbe = async (executable, env) => {
  const result = await promisify(execFile)(executable, ['-hide_banner', '-filters'],
    { env, timeout: 15_000, maxBuffer: 1024 * 1024, windowsHide: true });
  return result.stdout + '\n' + result.stderr;
};

// Only fixed locations relative to the explicitly supplied installation are used.
// Never parse launcher scripts, unpack AppImages, or search unrelated directories.
export async function bundledFfmpegCandidates(krita: string): Promise<string[]> {
  let executable: string;
  try {
    executable = await realpath(krita);
    if (!(await stat(executable)).isFile()) throw new Error('不是文件');
    await access(executable, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
  } catch (error) { throw new Error(`指定的 Krita 不存在或不可执行：${krita}`, { cause: error }); }
  const directory = dirname(executable);
  const name = extname(executable).toLowerCase() === '.exe' ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = [join(directory, name)];
  if (directory.endsWith('/Contents/MacOS')) {
    candidates.push(join(directory, 'bin', name), join(directory, '../Resources/bin', name));
  }
  return candidates;
}

export async function checkFfmpeg(options: FfmpegOptions = {}, run: FfmpegProbe = probe): Promise<FfmpegInstallation> {
  const env = options.env ?? process.env;
  const candidates: FfmpegInstallation[] = [{ executable: 'ffmpeg', source: 'path' }];
  const failures: string[] = [];
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    try {
      const output = await run(candidate.executable, env);
      const filters = new Set(output.split(/\r?\n/).map(line => line.trim().split(/\s+/)[1]));
      const missing = ['format', 'chromakey', 'colorkey', 'despill'].filter(name => !filters.has(name));
      if (missing.length) throw new Error('缺少滤镜：' + missing.join(', '));
      return candidate;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      // Native errors should not expose any environment credentials in diagnostics.
      const safe = Object.entries(env).reduce((text, [key, value]) =>
        /(?:key|token|secret|password)/i.test(key) && value ? text.replaceAll(value, '[redacted]') : text, reason);
      failures.push(`${candidate.executable}：${safe}`);
      if (index === 0 && options.krita) {
        candidates.push(...(await bundledFfmpegCandidates(options.krita)).map(executable => ({ executable, source: 'krita' as const })));
      }
    }
  }
  throw new Error('参考图后处理的 FFmpeg 检查失败。请确认已有 FFmpeg 可在运行环境中调用，'
    + '或用 --krita 指定带有所需 FFmpeg 的安装内可执行文件。包装脚本或未解包 AppImage 可由调用方准备已有 FFmpeg 的 PATH。'
    + '不会自动安装或搜索系统目录。\n' + failures.join('\n'));
}

export function reportFfmpeg(installation: FfmpegInstallation): string {
  const source = { krita: '所指定 Krita 安装', path: '已有 PATH' }[installation.source];
  return `参考后处理：复用 FFmpeg（${source}）：${installation.executable}`;
}
