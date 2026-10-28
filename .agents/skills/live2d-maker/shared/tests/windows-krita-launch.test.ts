import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { enableKritaPlugin, ensureWindowsKritaPlugin, prepareWindowsKritaApplication } from '../krita/windows-launch.ts';

test('Windows bridge enablement preserves shared preferences, comments and CRLF, and never changes ResourceDirectory', async t => {
  const root = await mkdtemp(join(tmpdir(), 'windows-krita-settings-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const original = '# user preferences\r\nResourceDirectory=D:/my-assets\r\n[python]\r\nenable_other=true\r\nenable_astra_bridge=false\r\n[RecentFiles]\r\nFile1=D:/my.kra\r\n';
  await writeFile(join(root, 'kritarc'), original);
  await Promise.all([ensureWindowsKritaPlugin(root, 'astra_bridge'), ensureWindowsKritaPlugin(root, 'astra_bridge')]);
  const actual = await readFile(join(root, 'kritarc'), 'utf8');
  assert.equal(actual, original.replace('enable_astra_bridge=false', 'enable_astra_bridge=true'));
  assert.equal(enableKritaPlugin(actual, 'astra_bridge'), actual);
  assert.deepEqual(await readdir(root), ['kritarc']);
});

test('enabling a missing bridge key leaves other groups and enabled plugins intact', () => {
  const original = '[General]\nName=保留\n[python]\nenable_other=true\n[RecentFiles]\nFile1=one.kra\n';
  const next = enableKritaPlugin(original, 'astra_bridge');
  assert.equal(next, original.replace('[python]\n', '[python]\nenable_astra_bridge=true\n'));
  assert.equal(enableKritaPlugin('ResourceDirectory=D:/mine\n', 'astra_bridge'), 'ResourceDirectory=D:/mine\n[python]\nenable_astra_bridge=true\n');
  assert.throws(() => enableKritaPlugin(original, '../escape'), /无效/);
});

test('Windows launch view exposes only the private Python bridge and cleanup does not follow installation junctions', async t => {
  const root = await mkdtemp(join(tmpdir(), 'windows-krita-view-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const installed = join(root, 'installed'), profile = join(root, 'profile'), resource = join(profile, 'share/krita');
  for (const path of ['bin', 'lib', 'python', 'share/icons', 'share/krita/brushes', 'share/krita/pykrita/user_plugin']) await mkdir(join(installed, path), { recursive: true });
  await writeFile(join(installed, 'bin/krita.exe'), 'binary');
  await writeFile(join(installed, 'share/krita/brushes/preset'), 'original');
  await mkdir(join(resource, 'pykrita/astra_bridge'), { recursive: true });
  await writeFile(join(resource, 'pykrita/astra_bridge/__init__.py'), '# private');
  await writeFile(join(resource, 'pykrita/astra_bridge.desktop'), 'descriptor');
  const executable = await prepareWindowsKritaApplication(profile, join(installed, 'bin/krita.exe'), resource);
  assert.equal(await readFile(executable, 'utf8'), 'binary');
  const scripts = join(profile, 'application/share/krita/pykrita');
  assert.deepEqual((await readdir(scripts)).sort(), ['astra_bridge', 'astra_bridge.desktop']);
  assert.equal(await readFile(join(scripts, 'astra_bridge/__init__.py'), 'utf8'), '# private');
  assert.equal(await readFile(join(profile, 'application/share/krita/brushes/preset'), 'utf8'), 'original');
  await rm(profile, { recursive: true, force: true });
  assert.equal(await readFile(join(installed, 'bin/krita.exe'), 'utf8'), 'binary');
  assert.equal(await readFile(join(installed, 'share/krita/brushes/preset'), 'utf8'), 'original');
});
