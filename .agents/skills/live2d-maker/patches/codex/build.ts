import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import lockfile from 'proper-lockfile';
import { workflowsDirectory } from '../../shared/paths.ts';
import { runCommand, type Command } from './process.ts';
import { withRust } from './rust.ts';

export const codexCommit = '979011409de0a60b52f179721948e65531d26144';
// building: called once before waiting for or running a build, which can take many minutes.
type Options = { source?: string; jobs?: number; root?: string; env?: NodeJS.ProcessEnv; progress?: (message: string) => void; building?: () => void };
type Services = { run?: Command; rust?: typeof withRust; companion?: () => string };
const platforms: Record<string, string> = { 'linux-x64': 'x86_64-unknown-linux-musl', 'linux-arm64': 'aarch64-unknown-linux-musl',
  'darwin-x64': 'x86_64-apple-darwin', 'darwin-arm64': 'aarch64-apple-darwin', 'win32-x64': 'x86_64-pc-windows-msvc', 'win32-arm64': 'aarch64-pc-windows-msvc' };
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function companion(): string {
  const platform = `${process.platform}-${process.arch}`, triple = platforms[platform];
  if (!triple) throw new Error(`未支持的 SDK 平台：${platform}`);
  const sdkRequire = createRequire(import.meta.resolve('@openai/codex-sdk'));
  const npmRoot = dirname(sdkRequire.resolve(`@openai/codex-${platform}/package.json`));
  return join(npmRoot, 'vendor', triple, 'bin', process.platform === 'win32' ? 'codex-code-mode-host.exe' : 'codex-code-mode-host');
}

export async function ensurePatchedCodex(options: Options = {}, services: Services = {}): Promise<string> {
  const jobs = options.jobs ?? 4;
  if (!Number.isSafeInteger(jobs) || jobs < 1) throw new Error('--jobs 必须为正整数');
  const patch = join(workflowsDirectory, 'patches/codex/layering-runtime.patch'), bytes = await readFile(patch);
  const key = sha256(Buffer.concat([Buffer.from(codexCommit + ':v1:' + process.platform + ':' + process.arch), bytes])).slice(0, 20);
  const root = join(options.root ?? join(workflowsDirectory, '.codex-build'), `${process.platform}-${process.arch}`, key);
  const binary = process.platform === 'win32' ? 'codex.exe' : 'codex';
  const host = process.platform === 'win32' ? 'codex-code-mode-host.exe' : 'codex-code-mode-host';
  const output = join(root, 'bin'), executable = join(output, binary), receipt = join(root, 'ready.json');
  const progress = options.progress ?? (message => console.error(message));
  const env = options.env ?? process.env, log = join(root, 'build.log');
  const run = services.run ?? runCommand;
  async function cached() {
    try {
      const hashes = JSON.parse(await readFile(receipt, 'utf8'));
      return hashes.binary === sha256(await readFile(executable)) && hashes.host === sha256(await readFile(join(output, host)));
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return false; throw error; }
  }
  await mkdir(root, { recursive: true });
  if (await cached()) return executable;
  let release: (() => Promise<void>) | undefined, waiting = false, compromised: Error | undefined;
  while (!release) {
    try { release = await lockfile.lock(root, { realpath: false, stale: 30_000, update: 5000, onCompromised(error) { compromised = error; } }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ELOCKED') throw error;
      if (!waiting) { options.building?.(); progress('等待同一 Codex 补丁构建完成；不会重复构建。'); waiting = true; }
      await delay(250);
    }
  }
  try {
    if (await cached()) return executable;
    if (!waiting) options.building?.();
    progress(`已开启 Codex 补丁功能，正在自动构建并缓存；日志：${log}`);
    const source = join(root, 'source');
    const exec = (command: string, args: string[], cwd = root) => run(command, args, { cwd, env, log });
    if (!existsSync(source)) {
      if (options.source) await exec('git', ['-C', resolve(options.source), 'worktree', 'add', '--detach', source, codexCommit]);
      else {
        const stage = join(root, 'source-clone');
        await rm(stage, { recursive: true, force: true });
        await exec('git', ['clone', '--no-checkout', '--depth', '1', '--branch', 'rust-v0.161.0', 'https://github.com/openai/codex.git', stage]);
        await exec('git', ['checkout', '--detach', codexCommit], stage);
        await rename(stage, source);
      }
    }
    if (await exec('git', ['rev-parse', 'HEAD'], source) !== codexCommit) throw new Error('补丁缓存的源码版本不符；未覆盖现有目录。');
    const stamp = join(root, 'applied.patch');
    if (!existsSync(stamp)) {
      // Recover an interruption after git apply and before writing its receipt.
      let applied = false;
      try { await exec('git', ['apply', '--reverse', '--check', patch], source); applied = true; } catch {}
      if (!applied) { await exec('git', ['apply', '--check', patch], source); await exec('git', ['apply', patch], source); }
      await writeFile(stamp, bytes);
    } else if (!(await readFile(stamp)).equals(bytes)) throw new Error('补丁缓存不一致；未覆盖现有源码。');
    await (services.rust ?? withRust)(env, async toolchain => {
      await run(toolchain.cargo, [...toolchain.prefix, 'build', '-p', 'codex-cli', '--bin', 'codex', '--profile', 'dev-small',
        '--jobs', String(jobs), '--target-dir', join(root, 'target')], { cwd: join(source, 'codex-rs'), env: toolchain.env, log });
    }, progress, {log});
    if (compromised) throw compromised;
    await mkdir(output, { recursive: true });
    for (const [from, name] of [[join(root, 'target/dev-small', binary), binary], [(services.companion ?? companion)(), host]]) {
      const staged = join(output, name + '.tmp'); await copyFile(from, staged); await rename(staged, join(output, name));
    }
    const capabilities = JSON.parse(await exec(executable, ['debug', 'layering-capabilities']));
    if (capabilities.version !== 1 || capabilities.image_provider_version !== 2 || capabilities.image_compaction_version !== 2 || capabilities.request_compaction_version !== 1
      || capabilities.failed_error_event_version !== 1) throw new Error('新构建未通过补丁能力检查');
    if (compromised) throw compromised;
    await writeFile(receipt + '.tmp', JSON.stringify({ binary: sha256(await readFile(executable)), host: sha256(await readFile(join(output, host))) }));
    await rename(receipt + '.tmp', receipt);
    progress(`Codex 补丁已准备：${executable}`);
    return executable;
  } catch (error) { throw new Error(`Codex 补丁自动构建失败；保留会话和产物，修复依赖后可直接续跑。日志：${log}`, { cause: error }); }
  finally { await release(); }
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { source: { type: 'string' }, jobs: { type: 'string', default: '4' }, help: { type: 'boolean' } } });
  if (values.help) console.log('pnpm build:codex [--source <已有官方 Codex Git 仓库>] [--jobs 4]\n自动准备 Rust 1.95.0，仍需 Git 和平台 C/C++ 编译依赖。构建缓存位于 .codex-build/；不替换系统 Codex。');
  else console.log(await ensurePatchedCodex({ source: values.source, jobs: Number(values.jobs) }));
}
