// Installed beside a verified CLI copy. Uses only Node built-ins and contains
// no credentials, workflow prompts, or machine-specific source checkout path.
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const directory = dirname(fileURLToPath(import.meta.url));
const binary = join(directory, 'antigravity.bin');
const manifest = JSON.parse(readFileSync(join(directory, 'patch.json'), 'utf8'));
const hash = () => createHash('sha256').update(readFileSync(binary)).digest('hex');
const failure = 'AGV 补丁副本校验失败，可能已被自动更新替换。未沿用失效补丁；请重新执行 patch:agv。';
if (manifest.defaultResponseHeaderTimeoutSeconds !== 0 || manifest.autoUpdateDisabledByTrue !== true || hash() !== manifest.patchedSha256) {
  console.error(failure); process.exit(1);
}
const initial = statSync(binary);
const child = spawn(binary, process.argv.slice(2), { stdio: 'inherit', env: { ...process.env, AGY_CLI_DISABLE_AUTO_UPDATE: 'true' } });
let failed = false;
const interval = setInterval(() => {
  try {
    const current = statSync(binary);
    if (current.ino === initial.ino && current.mtimeMs === initial.mtimeMs && current.size === initial.size) return;
    if (hash() === manifest.patchedSha256) return;
  } catch {}
  if (!failed) { failed = true; console.error(failure); child.kill('SIGTERM'); }
}, 1000);
interval.unref();
child.once('error', error => { clearInterval(interval); console.error(error.message); process.exitCode = 1; });
child.once('exit', (code, signal) => {
  clearInterval(interval);
  if (!failed) { try { failed = hash() !== manifest.patchedSha256; } catch { failed = true; } }
  if (failed) console.error(failure);
  process.exitCode = failed ? 1 : code ?? (signal ? 1 : 0);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
