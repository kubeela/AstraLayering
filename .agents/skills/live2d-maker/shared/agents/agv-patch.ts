import {readFile} from 'node:fs/promises';
import {dirname,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
const sha256=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export async function resolvePatchedAgv(executable: string): Promise<string> {
  let manifest;
  try { manifest = JSON.parse(await readFile(join(dirname(executable), 'patch.json'), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return executable; throw error; }
  if (!manifest.sourceSha256 || manifest.defaultResponseHeaderTimeoutSeconds === undefined) return executable;
  let root = dirname(executable);
  while (dirname(root) !== root && dirname(root).split(sep).at(-1) !== '.runtime') root = dirname(root);
  if (dirname(root).split(sep).at(-1) !== '.runtime') throw new Error('AGV 补丁入口不在受控的 .runtime 目录内。');
  const runsRoot = dirname(dirname(root));
  if (manifest.format !== 2) return (await import('../../patches/agv/patch-response-header.ts')).createPatchedAgv(executable, runsRoot);
  if (manifest.defaultResponseHeaderTimeoutSeconds !== 0 || manifest.autoUpdateDisabledByTrue !== true) {
    throw new Error('AGV 补丁没有确认禁用自动更新，未启动。请重新执行 patch:agv。');
  }
  const payload = join(dirname(executable), 'antigravity.bin');
  if (sha256(await readFile(payload)) !== manifest.patchedSha256) {
    // An updated payload must pass structural compatibility checks again. Never
    // launch it using an old manifest's assertion that the deadline is disabled.
    return (await import('../../patches/agv/patch-response-header.ts')).createPatchedAgv(payload, runsRoot);
  }
  return executable;
}
