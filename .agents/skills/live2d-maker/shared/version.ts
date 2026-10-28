import { execFile } from 'node:child_process';
import { access, readFile, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { workflowsDirectory } from './paths.ts';

// Releases are Git tags vX.Y.Z; the tag decides the version. The root package.json carries the
// same number for copies without .git (the release ZIP), and is updated before tagging.
export const releaseTag = /^v(\d+)\.(\d+)\.(\d+)$/;
export type InstalledVersion = {
  version: string;           // X.Y.Z of the tag, or of package.json without one
  label: string;             // shown to people: v0.1.0, or v0.1.0+3 for commits after the tag
  exact: boolean;            // exactly a release tag with no later commits
  source: 'git' | 'package' | 'unknown';
};

export function compareVersions(a: string, b: string) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// `git describe` output: v0.1.0, or v0.1.0-3-gabc1234 for commits after the tag.
export function parseDescribe(text: string): InstalledVersion | undefined {
  const match = /^v(\d+\.\d+\.\d+)(?:-(\d+)-g[0-9a-f]+)?$/.exec(text.trim());
  if (!match) return undefined;
  const ahead = Number(match[2] ?? 0);
  return { version: match[1], label: 'v' + match[1] + (ahead ? '+' + ahead : ''), exact: !ahead, source: 'git' };
}

const run = promisify(execFile);
export async function installedVersion(skill = workflowsDirectory): Promise<InstalledVersion> {
  const repository = resolve(skill, '../../..');
  const unknown: InstalledVersion = { version: '0.0.0', label: '未知版本', exact: false, source: 'unknown' };
  let application: { name?: string; version?: string };
  try {
    application = JSON.parse(await readFile(join(repository, 'package.json'), 'utf8'));
    if (application.name !== 'astra-layering-web') return unknown;
    await Promise.all([access(join(repository, 'web/server.ts')), access(join(repository, 'pnpm-workspace.yaml'))]);
  } catch { return unknown; }
  try {
    // Only this application's checkout counts, not an unrelated repository the skill was copied into.
    const { stdout: top } = await run('git', ['rev-parse', '--show-toplevel'], { cwd: skill, timeout: 3000 });
    if (await realpath(top.trim()) === await realpath(repository)) {
      // Git's --match accepts globs, so its digit wildcard also matches suffixes such as -rc1.
      // Select exact release names first, then let describe find the nearest reachable one.
      const { stdout: tags } = await run('git', ['tag', '--list', 'v*'], { cwd: skill, timeout: 3000 });
      const stable = tags.split(/\r?\n/).filter(tag => releaseTag.test(tag));
      if (stable.length) {
        const { stdout } = await run('git', ['describe', '--tags', ...stable.flatMap(tag => ['--match', tag])], { cwd: skill, timeout: 3000 });
        const described = parseDescribe(stdout);
        if (described) return described;
      }
    }
  } catch { /* No Git, no checkout, or no release tag yet. */ }
  const { version } = application;
  if (typeof version === 'string' && releaseTag.test('v' + version)) return { version, label: 'v' + version, exact: true, source: 'package' };
  return unknown;
}
