import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { workflowsDirectory } from '../../shared/paths.ts';

export const codexCommit = '979011409de0a60b52f179721948e65531d26144';
const { values } = parseArgs({ options: { source: { type: 'string' }, jobs: { type: 'string', default: '4' }, help: { type: 'boolean' } } });
if (values.help) {
  console.log('pnpm build:codex [--source <已有官方 Codex Git 仓库>] [--jobs 4]\n需要 Git、Rust 1.95.0 及平台原生编译工具。构建内容保存到 live2d-maker/.codex-build/，不会替换系统 Codex。');
  process.exit(0);
}
if (!/^\d+$/.test(values.jobs!) || Number(values.jobs) < 1) throw new Error('--jobs 必须为正整数');
const root = join(workflowsDirectory, '.codex-build'), source = join(root, 'source');
const patch = join(workflowsDirectory, 'tools/codex/layering-runtime.patch');
async function run(command: string, args: string[], cwd = root, capture = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
    let text = ''; child.stdout?.on('data', bytes => { text += bytes; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(text.trim()) : reject(new Error(`${command} 退出码 ${code}`)));
  });
}
await mkdir(root, { recursive: true });
if (!existsSync(source)) {
  if (values.source) {
    await run('git', ['-C', resolve(values.source), 'worktree', 'add', '--detach', source, codexCommit]);
  } else {
    await run('git', ['clone', '--no-checkout', '--depth', '1', '--branch', 'rust-v0.161.0', 'https://github.com/openai/codex.git', source]);
    await run('git', ['checkout', '--detach', codexCommit], source);
  }
}
if (await run('git', ['rev-parse', 'HEAD'], source, true) !== codexCommit) throw new Error('构建源版本不符；请保留现有目录并换用干净的 .codex-build/source。');
const stamp = join(root, 'applied.patch');
const bytes = await readFile(patch);
if (existsSync(stamp)) {
  if (!(await readFile(stamp)).equals(bytes)) throw new Error('补丁已变化；请移走 .codex-build/source 和 applied.patch 后重试，保留 target 缓存即可。');
} else {
  await run('git', ['apply', '--check', patch], source);
  await run('git', ['apply', patch], source);
  await writeFile(stamp, bytes);
}
await run('cargo', ['+1.95.0', 'build', '-p', 'codex-cli', '--bin', 'codex', '--profile', 'dev-small', '--jobs', values.jobs!, '--target-dir', join(root, 'target')], join(source, 'codex-rs'));
const binary = process.platform === 'win32' ? 'codex.exe' : 'codex';
const output = join(root, 'bin'); await mkdir(output, { recursive: true });
async function install(from: string, name: string): Promise<void> {
  const staged = join(output, `${name}.${process.pid}.tmp`);
  await copyFile(from, staged);
  await rename(staged, join(output, name));
}
await install(join(root, 'target/dev-small', binary), binary);
// Code Mode uses the unchanged official companion bundled alongside the SDK's CLI.
const sdkRequire = createRequire(import.meta.resolve('@openai/codex-sdk'));
const platforms: Record<string, string> = { 'linux-x64': 'x86_64-unknown-linux-musl', 'linux-arm64': 'aarch64-unknown-linux-musl',
  'darwin-x64': 'x86_64-apple-darwin', 'darwin-arm64': 'aarch64-apple-darwin', 'win32-x64': 'x86_64-pc-windows-msvc', 'win32-arm64': 'aarch64-pc-windows-msvc' };
const platform = `${process.platform}-${process.arch}`, triple = platforms[platform];
if (!triple) throw new Error(`未支持的 SDK 平台：${platform}`);
const npmRoot = dirname(sdkRequire.resolve(`@openai/codex-${platform}/package.json`));
const host = process.platform === 'win32' ? 'codex-code-mode-host.exe' : 'codex-code-mode-host';
await install(join(npmRoot, 'vendor', triple, 'bin', host), host);
await run(join(output, binary), ['debug', 'layering-capabilities']);
console.log(`已构建：${join(output, binary)}\n在 .env 中设置 layering_codex_path=.codex-build/bin/${binary}`);
