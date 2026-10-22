import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { resolveRunsDirectory, workflowsDirectory } from '../../shared/paths.ts';

const instruction = Buffer.from('48ba005847f80d00000048899000010000', 'hex');
export const knownBuild = {
  version: '1.4.4 linux-x64',
  sourceSha256: '337dcde668441a2828968644d7982829c2d2a5e0c4144f346e1f3fc6abb3cdc7',
  patchedSha256: 'e9bcf1865173e79129cd2029ffd2a4eecabebc8b9c66ed756291338d4cab86d0',
  offset: 0x8833e32,
};
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export function patchResponseHeaders(source: Buffer, build = knownBuild): Buffer {
  if (sha256(source) !== build.sourceSha256) throw new Error('未知 AGV 构建，拒绝修改。此补丁只支持已验证的 ' + build.version + ' SHA-256。');
  if (!source.subarray(build.offset, build.offset + instruction.length).equals(instruction)) {
    throw new Error('AGV 响应头期限指令不匹配，拒绝修改。');
  }
  const patched = Buffer.from(source);
  // Only the default ResponseHeaderTimeout constant changes: 60s -> 0 (no deadline).
  // Explicit options, connect/TLS deadlines, HTTP status parsing and monitors remain intact.
  patched.fill(0, build.offset + 2, build.offset + 10);
  if (sha256(patched) !== build.patchedSha256) throw new Error('AGV 补丁产物校验失败。');
  return patched;
}

export async function createPatchedAgv(sourcePath: string, directory?: string): Promise<string> {
  const root = resolveRunsDirectory(directory), skill = resolve(workflowsDirectory);
  const realRoot = await realpath(root);
  if (realRoot === skill || realRoot.startsWith(skill + sep)) throw new Error('--dir 必须位于 skill 外。');
  const source = await readFile(await realpath(sourcePath));
  const hash = sha256(source);
  const bytes = hash === knownBuild.patchedSha256 ? source : patchResponseHeaders(source);
  const output = join(realRoot, '.runtime', 'agv', knownBuild.sourceSha256, 'antigravity');
  const verify = async () => {
    if (sha256(await readFile(output)) !== knownBuild.patchedSha256) throw new Error('已存在的 AGV 副本校验失败，未覆盖。');
  };
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  const temporary = output + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, bytes, { flag: 'wx', mode: 0o700 });
    try { await link(temporary, output); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    await verify();
    await writeFile(join(dirname(output), 'patch.json'), JSON.stringify({ version: knownBuild.version, sourceSha256: knownBuild.sourceSha256,
      patchedSha256: knownBuild.patchedSha256, defaultResponseHeaderTimeoutSeconds: 0, originalModified: false }, null, 2) + '\n');
  } finally { await rm(temporary, { force: true }); }
  return output;
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { source: { type: 'string' }, dir: { type: 'string' } }, strict: true, allowPositionals: false });
  if (!values.source) throw new Error('请指定 --source <已安装的 AGV 可执行文件>，不会下载或安装 CLI。');
  console.log('layering_agv_path=' + await createPatchedAgv(resolve(values.source), values.dir));
}
