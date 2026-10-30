import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installedVersion } from '../version.ts';

async function fixture(t: test.TestContext, { root = '', name = 'astra-layering-web', version = '0.1.0', checkout = true, markers = true } = {}) {
  root ||= await mkdtemp(join(tmpdir(), 'astra-version-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = join(root, '.agents/skills/live2d-maker');
  await mkdir(skill, { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name, version }));
  if (markers) {
    await mkdir(join(root, 'web'), { recursive: true });
    await writeFile(join(root, 'web/server.ts'), '// Application entry point\n');
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
  }
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=Version Test', '-c', 'user.email=version@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${join(root, 'no-hooks')}`, ...args], { cwd: root, encoding: 'utf8' }).trim();
  if (checkout) { git('init', '-q'); git('add', '.'); git('commit', '-qm', 'application'); }
  return { root, skill, git };
}

test('a copied skill does not borrow an unrelated checkout or package version', async t => {
  const host = await fixture(t, { name: 'unrelated-application', version: '9.9.9' });
  host.git('tag', 'v9.9.9');
  assert.equal((await installedVersion(host.skill)).source, 'unknown');
  host.git('tag', '-d', 'v9.9.9');
  assert.equal((await installedVersion(host.skill)).source, 'unknown', 'package fallback must also verify application identity');

  const standalone = await fixture(t, { markers: false, checkout: false });
  assert.equal((await installedVersion(standalone.skill)).source, 'unknown', 'a package name alone is not the application layout');
});

test('application checkouts report their release tag and later commits', async t => {
  const app = await fixture(t, { version: '0.9.0' });
  app.git('tag', 'v0.1.0');
  assert.deepEqual(await installedVersion(app.skill), { version: '0.1.0', label: 'v0.1.0', exact: true, source: 'git' });
  await writeFile(join(app.root, 'next.txt'), 'next commit\n');
  app.git('add', '.'); app.git('commit', '-qm', 'next');
  assert.deepEqual(await installedVersion(app.skill), { version: '0.1.0', label: 'v0.1.0+1', exact: false, source: 'git' });
});

test('pre-release and suffix tags do not hide the nearest formal release', async t => {
  const app = await fixture(t);
  app.git('tag', 'v0.1.0');
  await writeFile(join(app.root, 'next.txt'), 'pre-release work\n');
  app.git('add', '.'); app.git('commit', '-qm', 'pre-release');
  app.git('tag', 'v0.2.0-rc1');
  app.git('tag', 'v0.3.0suffix');
  assert.deepEqual(await installedVersion(app.skill), { version: '0.1.0', label: 'v0.1.0+1', exact: false, source: 'git' });
});

test('a release ZIP uses its own package even inside another Git checkout', async t => {
  const host = await fixture(t, { name: 'unrelated-application', version: '9.9.9' });
  host.git('tag', 'v9.9.9');
  const app = await fixture(t, { root: join(host.root, 'unpacked'), checkout: false, version: '0.2.0' });
  assert.deepEqual(await installedVersion(app.skill), { version: '0.2.0', label: 'v0.2.0', exact: true, source: 'package' });
});

test('an application without formal tags falls back to its own package', async t => {
  const app = await fixture(t);
  app.git('tag', 'v0.2.0-rc1');
  assert.deepEqual(await installedVersion(app.skill), { version: '0.1.0', label: 'v0.1.0', exact: true, source: 'package' });
});
