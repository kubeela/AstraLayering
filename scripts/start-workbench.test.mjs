import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { initializeConfiguration, savedService, supportedNode } from './start-workbench.mjs';

test('accepts supported Node versions at the minor-version boundary', () => {
  assert.equal(supportedNode('24.11.9'), false);
  assert.equal(supportedNode('24.12.0'), true);
  assert.equal(supportedNode('25.0.0'), true);
  assert.equal(supportedNode('22.99.0'), false);
});

test('initializes a missing configuration and preserves an existing file byte for byte', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'astra-launch-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const skill = join(directory, '.agents/skills/live2d-maker');
  await mkdir(skill, { recursive: true });
  await writeFile(join(skill, 'example.env'), 'model=default\n');
  await initializeConfiguration(directory);
  assert.equal(await readFile(join(skill, '.env'), 'utf8'), 'model=default\n');
  await writeFile(join(skill, '.env'), 'custom=保留\r\n# credentials and paths\r\n');
  await initializeConfiguration(directory);
  assert.equal(await readFile(join(skill, '.env'), 'utf8'), 'custom=保留\r\n# credentials and paths\r\n');
});

test('reuses only a healthy workbench registered to the same checkout', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'astra-reuse-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const server = createServer((req, res) => res.end(JSON.stringify({ status: 'ok', application: 'astra-layering', mode: 'workbench' })));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  await mkdir(join(directory, '.web'));
  const marker = join(directory, '.web/launcher.json');
  await writeFile(marker, JSON.stringify({ root: '/another-checkout', url }));
  assert.equal(await savedService(directory), null);
  await writeFile(marker, JSON.stringify({ root: directory, url }));
  assert.equal(await savedService(directory), url);
  await writeFile(marker, JSON.stringify({ root: directory, url: 'https://example.com' }));
  assert.equal(await savedService(directory), null);
});

test('launcher installs pinned dependencies, opens a ready service, and stops its own server', { skip: process.platform === 'win32' }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'astra 中文 space '));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const sub of ['scripts', 'web', 'bin', '.agents/skills/live2d-maker']) await mkdir(join(directory, sub), { recursive: true });
  await copyFile(new URL('./start-workbench.mjs', import.meta.url), join(directory, 'scripts/start-workbench.mjs'));
  await writeFile(join(directory, '.agents/skills/live2d-maker/example.env'), 'test=default\n');
  await writeFile(join(directory, 'bin/npm'), '#!/bin/sh\nprintf "%s\\n" "$@" > npm-args.txt\n', { mode: 0o755 });
  const opener = '#!/bin/sh\nprintf "%s" "$1" > opened-url.txt\n';
  for (const name of ['open', 'xdg-open']) await writeFile(join(directory, 'bin', name), opener, { mode: 0o755 });
  await writeFile(join(directory, 'web/server.ts'), `
    import { createServer } from 'node:http';
    const server = createServer((request, response) => response.end(JSON.stringify({status:'ok',application:'astra-layering',mode:'workbench'})));
    server.listen(Number(process.argv[3]), '127.0.0.1');
    process.on('SIGTERM', () => server.close());
  `);
  const child = spawn(process.execPath, ['scripts/start-workbench.mjs'], { cwd: directory,
    env: { ...process.env, PATH: join(directory, 'bin') + delimiter + process.env.PATH }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
  const completion = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  t.after(async () => { if (child.exitCode === null) child.kill('SIGTERM'); await completion; });
  let url;
  for (let i = 0; i < 100; i++) {
    try { url = await readFile(join(directory, 'opened-url.txt'), 'utf8'); if (url) break; } catch {}
    if (child.exitCode !== null) assert.fail(output);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.match(url ?? '', /^http:\/\/127\.0\.0\.1:\d+$/, output);
  assert.equal((await fetch(url + '/healthz')).status, 200);
  assert.match(await readFile(join(directory, 'npm-args.txt'), 'utf8'), /--package=pnpm@10\.33\.0\n--\npnpm\ninstall\n--frozen-lockfile/);
  assert.equal(await readFile(join(directory, '.agents/skills/live2d-maker/.env'), 'utf8'), 'test=default\n');
  // A second click reuses the same service and leaves the owner process running.
  const second = spawn(process.execPath, ['scripts/start-workbench.mjs'], { cwd: directory,
    env: { ...process.env, PATH: join(directory, 'bin') + delimiter + process.env.PATH }, stdio: 'ignore' });
  assert.equal(await new Promise(resolve => second.once('exit', resolve)), 0);
  assert.equal((await fetch(url + '/healthz')).status, 200);
  child.kill('SIGTERM');
  assert.equal((await completion).code, 0);
  await assert.rejects(fetch(url + '/healthz'));
});
