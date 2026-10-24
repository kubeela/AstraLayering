import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Every Codex run requires the patched build. Tests that reach the startup check
// without a fake app server point layering_codex_path here instead of building it.
export const patchedCodexCapabilities = { version: 1, failed_error_event_version: 1 };

export async function fakePatchedCodex(directory?: string): Promise<string> {
  const executable = join(directory ?? await mkdtemp(join(tmpdir(), 'fake-patched-codex-')), 'fake-patched-codex.mjs');
  await writeFile(executable, `#!${process.execPath}
if (process.argv[2] === 'debug') console.log(${JSON.stringify(JSON.stringify(patchedCodexCapabilities))});
else if (process.argv[2] === '--version') console.log('codex-cli 0.161.0');
else { console.error('fake patched Codex only answers startup checks'); process.exit(1); }
`);
  await chmod(executable, 0o755);
  return executable;
}
