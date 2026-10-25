import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendFile, mkdir, mkdtemp, realpath, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { createWorkbench } from '../server.ts';
import { snapshot } from '../snapshot.ts';
import { launch, runWebTask } from '../worker.ts';
import { atomicJSON, jsonFile } from '../files.ts';
import { acquireTaskLock, configureRun, saveRun, readRun } from '../../.agents/skills/live2d-maker/workflow/state.ts';

async function fixture(t: any, start?: NonNullable<Parameters<typeof createWorkbench>[0]>['start']) {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'layering-web-')));
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

test('页面与状态查询读取同一份最新日志，不被旧 run.json 摘要遮盖', async t => {
  const f = await fixture(t), task = join(f.dir, 'test');
  await mkdir(task);
  const run = await configureRun({ name: 'test', dir: f.dir }, task);
  run.lastMessage = '[review-hair] 旧消息';
  await saveRun(task, run);
  await put(task, 'workflow.log', '[2026-10-20T14:40:00.000Z] [review-hair] 旧消息\n');
  await utimes(join(task, 'workflow.log'), 1, 1);
  await put(task, 'service.log', '[返修-hair] 工具调用：write_outline_svg\n{\n  "svg": "省略"\n}\n');
  let value = await snapshot(task, 'test', f.dir);
  assert.match(value.logs, /write_outline_svg/);
  assert.equal(value.lastLogMessage, '[返修-hair] 工具调用：write_outline_svg');
  assert.equal(value.logPath, join(task, 'service.log'));
  await appendFile(join(task, 'workflow.log'), '[2026-10-20T16:00:00.000Z] [返修-hair] 自检完成\n'
    + '[2026-10-20T16:00:01.000Z] [返修-hair] 收到 skills/changed：{}\n'
    + '[2026-10-20T16:00:02.000Z] [返修-hair] 思考摘要：\n'
    + '[2026-10-20T16:00:03.000Z] [返修-hair] 完成：{\n}\n');
  await utimes(join(task, 'service.log'), 1, 1);
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.logPath, join(task, 'workflow.log'));
  assert.equal(value.lastLogMessage, '[返修-hair] 自检完成');
  assert.ok(value.logUpdatedAt);
  const cli = await import('../../.agents/skills/live2d-maker/workflow/state.ts');
  const status = await cli.taskStatus({ name: 'test', dir: f.dir });
  assert.equal(status.lastMessage, value.lastLogMessage);
  assert.equal(status.log, value.logPath);
});

test('网页后台启动同样只使用 workflow.log，失败时等待日志完成写入', async t => {
  const f = await fixture(t);
  await assert.rejects(launch({ name: 'test', dir: f.dir, krita: process.execPath,
    from: 'raster-layering', to: 'raster-layering' }), /Krita|krita/);
  assert.match(await readFile(join(f.dir, 'test/workflow.log'), 'utf8'), /Krita|krita/);
  assert.equal(await readFile(join(f.dir, 'test/service.log')).then(() => true, () => false), false);
});

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
test('web forwards shadow mode to the existing coordinator and shows both branch artifacts', async t => {
  let received: any;
  const f = await fixture(t, async options => { received = options; return 123; });
  assert.equal((await f.post('tasks', { name: 'shadow-case', upload: await upload(), shadowMode: 'mask' })).status, 201);
  assert.equal((await f.post('start', { name: 'shadow-case', from: 'shadow', to: 'shadow', shadowMode: 'normal-depth' })).status, 202);
  assert.equal(received.shadowMode, 'normal-depth'); assert.equal(received.from, 'shadow');
  assert.equal((await f.post('start', { name: 'shadow-case', shadowMode: '../mask' })).status, 400);
  const root = join(f.dir, 'shadow-case');
  await put(root, 'shadow/mask/step01/character-shadowed.png');
  const value = await snapshot(root, 'shadow-case', f.dir), stage = value.pipelines.find(stage => stage.id === 'shadow')!;
  assert.equal(stage.states.mask, 'available'); assert.equal(stage.states['normal-depth'], 'pending');
  for (const path of ['normal.png', 'depth.png', 'report.md', '.completed']) await put(root, 'shadow/normal-depth/step01/' + path);
  await put(root, 'shadow/normal-depth/step02/light.json');
  const finished = (await snapshot(root, 'shadow-case', f.dir)).pipelines.find(stage => stage.id === 'shadow')!;
  assert.equal(finished.states['normal-depth'], 'done');
  assert.equal(Object.hasOwn(finished.states, 'normal-depth-lighting'), false);
});

test('task assets reject traversal and symlinks; SVG is served sandboxed; version browsing remains read only', async t => {
  const f = await fixture(t);
  await f.post('tasks', { name: 'test', upload: await upload() });
  await put(f.dir, 'test/out.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await put(f.base, 'private/private.json', '{"private":true}');
  await symlink(join(f.base, 'private'), join(f.dir, 'test/leak'), process.platform === 'win32' ? 'junction' : 'dir');
  const artifact = (path: string) => f.url + '/artifact?' + new URLSearchParams({ name: 'test', dir: f.dir, path });
  assert.equal((await fetch(artifact('../private.json'))).status, 400);
  assert.equal((await fetch(artifact('leak/private.json'))).status, 400);
  const svg = await fetch(artifact('out.svg'));
  assert.equal(svg.status, 200); assert.match(svg.headers.get('content-security-policy')!, /sandbox/);
  const files = await (await fetch(f.url + '/api/config/files?ref=HEAD')).json() as any;
  assert.ok(files.paths.includes('part-layering/prompts/11-遮挡层级规划.md'));
  const localFiles = await (await fetch(f.url + '/api/config/files?ref=worktree')).json() as any;
  assert.ok(localFiles.paths.includes('presets/optimized.env'));
  assert.ok(localFiles.paths.includes('references/model-presets.md'));
  const preset = await fetch(f.url + '/api/config/content?ref=worktree&path=presets/optimized.env');
  assert.equal(preset.status, 200);
  assert.match((await preset.json() as any).text, /layering_agent_part_draw_model=gpt-6.1-sol-xhigh/);
  assert.equal((await fetch(f.url + '/api/config/content?ref=HEAD&path=../../.env')).status, 400);
});

test('snapshots distinguish artifacts, real group states, missing outputs, review pass, two repairs and dead runners', async t => {
  const f = await fixture(t), task = join(f.dir, 'test');
  await mkdir(task);
  await put(task, 'part-layering/groups.json', JSON.stringify({ groups: [{ id: 'body', groups: [] }] }));
  await put(task, 'part-layering/groups/body/step01/outline.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await put(task, 'part-layering/preview.svg');
  let value = await snapshot(task, 'test', f.dir);
  assert.equal(value.status, 'untracked');
  assert.equal(value.pipelines[0].states.standard, 'pending');
  assert.equal(value.pipelines[0].states.merge, 'available');
  assert.equal(value.pipelines[0].groups[0].webPhases.outline, 'done');
  assert.equal(value.pipelines[0].groups[0].webPhases.review, 'pending');
  const prefix = 'clothing-raster-layering/step01/';
  for (const path of ['.completed', 'clothing-depth.kra', 'report.md']) await put(task, prefix + path);
  await put(task, prefix + 'review-01.md', '结论：通过\n逐层核对完毕。');
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.pipelines[3].states.step01, 'done');
  assert.equal(value.pipelines[3].states['review-02'], 'skipped');
  await rm(join(task, prefix, 'clothing-depth.kra'));
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.pipelines[3].states.step01, 'failed');
  assert.match(value.pipelines[3].messages.step01, /缺少交付/);
  await put(task, prefix + 'clothing-depth.kra');
  await put(task, prefix + 'review-01.md', '结论：需要修复\n修复轮廓。');
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.pipelines[3].states.step01, 'failed');
  for (const phase of ['01', '02']) {
    await put(task, prefix + 'review-' + phase + '.md', '结论：需要修复\n修复轮廓。');
    await put(task, prefix + 'repair-' + phase + '.md', '结论：已修复\n完成逐层检查。');
  }
  value = await snapshot(task, 'test', f.dir);
  assert.equal(value.pipelines[3].states.step01, 'done');
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

test('shadow reference routes serve only bundled guides, and inspection previews use declared files', async t => {
  const f=await fixture(t);
  for(const name of ['skirt','hair']) {
    const response=await fetch(f.url+'/shadow-reference/'+name+'.png');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');
    const meta=await sharp(Buffer.from(await response.arrayBuffer())).metadata();assert.equal(meta.width,2048);assert.equal(meta.height,1280);
  }
  assert.equal((await fetch(f.url+'/shadow-reference/native_worker.py')).status,404);
  const {shadowInspectionArtifacts}=await import(new URL('../progress.js',import.meta.url).href);
  const path='shadow/mask/step01/inspection/relation-001-review.png';
  assert.deepEqual(shadowInspectionArtifacts([path,'shadow/mask/step01/inspection/native-123/offset.png','shadow/normal-depth/step01/inspection/relation-000-review.png']).map((a:any)=>a.path),[path]);
});

test('步骤操作接口：重试人物与衣服分块的步骤后按保存的路线重新运行，快照列出未完成步骤', async t => {
  const started: any[] = [];
  const f = await fixture(t, async options => { started.push(options); return 456; }), task = join(f.dir, 'case');
  await mkdir(task);
  await saveRun(task, await configureRun({ name: 'case', dir: f.dir }, task));
  for (const pipeline of ['part-layering', 'clothing-part-layering']) {
    await put(task, `${pipeline}/groups/head/step02/.running`, JSON.stringify({ inputs: {} }));
    await put(task, `${pipeline}/groups/head/step02/session.json`, JSON.stringify({ threadId: 'thread-' + pipeline }));
  }
  const pipelines = (await snapshot(task, 'case', f.dir)).pipelines;
  for (const id of ['part-layering', 'clothing-part-layering']) {
    assert.deepEqual(pipelines.find(pipeline => pipeline.id === id)!.steps, [{ id: 'groups/head/step02', status: 'running', session: true }]);
  }
  const resumed = await f.post('step-action', { name: 'case', pipeline: 'clothing-part-layering', step: 'groups/head/step02', action: 'resume' });
  assert.equal(resumed.status, 202); assert.equal(resumed.value.pid, 456); assert.match(resumed.value.message, /thread-clothing-part-layering/);
  await assert.rejects(readFile(join(task, 'clothing-part-layering/groups/head/step02/session.json')), { code: 'ENOENT' });
  const retried = await f.post('step-action', { name: 'case', pipeline: 'part-layering', step: 'groups/head/step02', action: 'retry' });
  assert.equal(retried.status, 202);
  await assert.rejects(readFile(join(task, 'part-layering/groups/head/step02/.running')), { code: 'ENOENT' });
  assert.equal(started.length, 2); assert.equal(started[0].name, 'case'); assert.equal(started[0].from, undefined);
  const refused = await f.post('step-action', { name: 'case', pipeline: 'part-layering', step: 'groups/head/step02', action: 'retry' });
  assert.equal(refused.status >= 400, true); assert.match(refused.value.error, /不存在/);
  assert.equal(started.length, 2);
});
