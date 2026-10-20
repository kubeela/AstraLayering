import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { createWorkbench } from '../server.ts';
import { snapshot } from '../snapshot.ts';
import { runWebTask } from '../worker.ts';
import { atomicJSON, jsonFile } from '../files.ts';
import { acquireTaskLock, configureRun, saveRun, readRun } from '../../.agents/skills/live2d-maker/workflow/state.ts';

async function fixture(t: any, start?: NonNullable<Parameters<typeof createWorkbench>[0]>['start']) {
  const base = await mkdtemp(join(tmpdir(), 'layering-web-'));
  const dir = join(base, 'runs'), settingsPath = join(base, 'settings.json');
  const server = await createWorkbench({ defaultDir: dir, settingsPath, start });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); await rm(base, { recursive: true, force: true }); });
  const port = (server.address() as any).port, url = 'http://127.0.0.1:' + port;
  const post = async (path: string, data: any, headers: any = {}) => {
    const response = await fetch(url + '/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ dir, ...data }) });
    return { status: response.status, value: await response.json() as any };
  };
  return { base, dir, server, url, post, settingsPath };
}
const upload = async () => (await sharp({ create: { width: 8, height: 8, channels: 3, background: '#cbbbaa' } }).png().toBuffer()).toString('base64');
async function put(root: string, path: string, value = 'content') { const file = join(root, path); await mkdir(join(file, '..'), { recursive: true }); await writeFile(file, value); }

test('upload retains original/config; same name never overwrites; selection persists; stale tabs cannot start in another root', async t => {
  const f = await fixture(t);
  const bytes = await upload();
  assert.equal((await f.post('tasks', { name: '角色-01', upload: bytes, from: 'part-layering', to: 'part-layering', standard: true })).status, 201);
  const task = join(f.dir, '角色-01');
  assert.equal((await readFile(join(task, 'input/original.png'))).toString('base64'), bytes);
  assert.equal((await readRun(task, '角色-01'))?.standard, true);
  assert.equal((await f.post('tasks', { name: '角色-01', upload: bytes })).status, 400);
  assert.equal((await f.post('tasks', { name: 'bad', upload: Buffer.from('not an image').toString('base64') })).status, 400);
  assert.equal((await f.post('tasks', { name: '../escape', upload: bytes })).status, 400);
  assert.equal((await f.post('start', { name: '角色-01' }, { Origin: 'https://unrelated.example' })).status, 403);
  const next = join(f.base, 'next');
  assert.equal((await f.post('settings', { directory: next })).status, 200);
  assert.equal((await f.post('start', { name: '角色-01' })).status, 409);
  const restart = await createWorkbench({ defaultDir: f.dir, settingsPath: f.settingsPath });
  await new Promise<void>(resolve => restart.listen(0, '127.0.0.1', resolve));
  assert.equal((await (await fetch('http://127.0.0.1:' + (restart.address() as any).port + '/api/settings')).json() as any).directory, next);
  await new Promise<void>(resolve => restart.close(() => resolve()));
});

test('task assets reject traversal and symlinks; SVG is served sandboxed; version browsing remains read only', async t => {
  const f = await fixture(t);
  await f.post('tasks', { name: 'test', upload: await upload() });
  await put(f.dir, 'test/out.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await put(f.base, 'private.json', '{"private":true}');
  await symlink(join(f.base, 'private.json'), join(f.dir, 'test/leak.json'));
  const artifact = (path: string) => f.url + '/artifact?' + new URLSearchParams({ name: 'test', dir: f.dir, path });
  assert.equal((await fetch(artifact('../private.json'))).status, 400);
  assert.equal((await fetch(artifact('leak.json'))).status, 400);
  const svg = await fetch(artifact('out.svg'));
  assert.equal(svg.status, 200); assert.match(svg.headers.get('content-security-policy')!, /sandbox/);
  const files = await (await fetch(f.url + '/api/config/files?ref=HEAD')).json() as any;
  assert.ok(files.paths.includes('part-layering/prompts/11-遮挡层级规划.md'));
  assert.equal((await fetch(f.url + '/api/config/content?ref=HEAD&path=../../.env')).status, 400);
});

test('snapshots distinguish artifacts, real group states, missing outputs, review pass, two repairs and dead runners', async t => {
  const f = await fixture(t), task = join(f.dir, 'test');
  await mkdir(task);
  await put(task, 'part-layering/groups.json', JSON.stringify({ groups: [{ id: 'body', groups: [], steps: { outline: { status: 'completed' }, review: { status: 'running' } } }] }));
  await put(task, 'part-layering/preview.svg');
  let value = await snapshot(task, 'test', f.dir);
  assert.equal(value.status, 'untracked');
  assert.equal(value.pipelines[0].states.standard, 'pending');
  assert.equal(value.pipelines[0].states.merge, 'available');
  assert.equal(value.pipelines[0].groups[0].webPhases.outline, 'done');
  assert.equal(value.pipelines[0].groups[0].webPhases.review, 'unconfirmed');
  const prefix = 'clothing-raster-layering/step02/';
  for (const path of ['.completed', 'clothing-soft-edges.kra', 'report.md']) await put(task, prefix + path);
  await put(task, prefix + 'review-01.md', '结论：通过\n逐层核对完毕。');
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.pipelines[3].states.step02, 'done');
  assert.equal(value.pipelines[3].states['review-02'], 'skipped');
  await rm(join(task, prefix, 'clothing-soft-edges.kra'));
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.pipelines[3].states.step02, 'failed');
  assert.match(value.pipelines[3].messages.step02, /缺少交付/);
  await put(task, prefix + 'clothing-soft-edges.kra');
  await put(task, prefix + 'review-01.md', '结论：需要修复\n修复边缘。');
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.pipelines[3].states.step02, 'failed');
  for (const phase of ['01', '02']) {
    await put(task, prefix + 'review-' + phase + '.md', '结论：需要修复\n修复边缘。');
    await put(task, prefix + 'repair-' + phase + '.md', '结论：已修复\n完成逐层检查。');
  }
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.pipelines[3].states.step02, 'done');
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'clothing-raster-layering', to: 'clothing-raster-layering' }, task);
  run.status = 'running'; run.runner = { id: 'dead', pid: 2147483647, startedAt: new Date().toISOString() };
  await saveRun(task, run);
  assert.equal((await snapshot(task, 'test', f.dir)).status, 'interrupted');
  await put(task, 'part-layering/groups.json', '{broken');
  assert.match((await snapshot(task, 'test', f.dir)).errors.join(), /groups.json/);
});

test('real coordinator owns web execution: locking, failure diagnostics, resume, cancellation, thread preservation', async t => {
  const f = await fixture(t), task = join(f.dir, 'test');
  await f.post('tasks', { name: 'test', upload: await upload(), from: 'part-layering', to: 'part-layering' });
  await put(task, 'raster-layering/run.json', JSON.stringify({ threadId: 'keep-me' }));
  const options = { name: 'test', dir: f.dir, from: 'part-layering', to: 'part-layering' } as const;
  await assert.rejects(runWebTask(options, 'failure', { execute: async (_id, _run, context) => {
    context.progress('模型最后消息：没有 image_generation 工具'); throw new Error('未交付结果');
  } }), /未交付/);
  let run = await readRun(task, 'test'); assert.equal(run?.status, 'failed');
  assert.match(await readFile(join(task, 'workflow.log'), 'utf8'), /没有 image_generation/);
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const executing = runWebTask(options, 'cancel', { ready: started, execute: async (_id, _run, context) => {
    await new Promise<void>((_resolve, reject) => context.signal.addEventListener('abort', () => reject(context.signal.reason), { once: true }));
    throw new Error('unreachable');
  } });
  // Attach rejection handler before signalling cancellation.
  const cancelled = assert.rejects(executing, /停止/);
  await ready;
  await assert.rejects(acquireTaskLock(task), /不能重复启动/);
  assert.equal((await f.post('stop', { name: 'test' })).status, 200);
  await cancelled;
  assert.equal((await readRun(task, 'test'))?.status, 'interrupted');
  await runWebTask(options, 'resume', { execute: async () => ({ output: join(task, 'parts'), summary: '完成' }) });
  run = await readRun(task, 'test'); assert.equal(run?.status, 'completed');
  assert.equal((await jsonFile(task, 'raster-layering/run.json'))?.threadId, 'keep-me');
});
