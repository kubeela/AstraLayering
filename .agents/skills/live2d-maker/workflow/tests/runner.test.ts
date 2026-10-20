import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, type TestContext } from 'node:test';
import { pipelineIds, type PipelineId } from '../../shared/paths.ts';
import { runTask } from '../runner.ts';
import { acquireTaskLock, directoryFor, readRun, taskStatus } from '../state.ts';
import { parseArguments } from '../run.ts';

async function fixture(t: TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'live2d-runner-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const options = { name: 'case', dir, krita: process.execPath };
  const directory = directoryFor(options);
  await mkdir(directory);
  await writeFile(join(directory, 'reference.png'), 'original-image');
  return { options, directory };
}
const preflight = async (executable: string) => ({ executable, version: 'test' });

test('总控保留输入与配置，严格按序推进；后续仅用 name 和 dir 恢复', async t => {
  const f = await fixture(t), first: PipelineId[] = [], second: PipelineId[] = [];
  await runTask({ ...f.options, image: 'reference.png', jobs: 2 }, { preflight, execute: async (id, run) => {
    first.push(id);
    const disk = (await readRun(f.directory, 'case'))!;
    assert.equal(disk.activePipeline, id);
    assert.equal(disk.status, 'running');
    assert.equal(run.jobs, 2);
    assert.equal(run.image, 'input/original.png');
    return { summary: id, output: join(f.directory, id, 'output') };
  } });
  assert.deepEqual(first, pipelineIds);
  assert.equal(await readFile(join(f.directory, 'input/original.png'), 'utf8'), 'original-image');
  await rm(join(f.directory, 'reference.png'));
  await runTask({ name: 'case', dir: f.options.dir }, { preflight, execute: async (id, run) => {
    second.push(id); assert.equal(run.jobs, 2); assert.equal(run.krita, process.execPath);
    return { summary: '管线自身检查并跳过', output: 'retained' };
  } });
  // Re-enter the pipeline's own authoritative checks, never trust a stale top-level completion alone.
  assert.deepEqual(second, pipelineIds);
  const status = await taskStatus(f.options);
  assert.equal(status.status, 'completed'); assert.equal(status.runnerAlive, false); assert.equal(status.lockHeld, false);
  assert.equal(status.output, 'retained');
});

test('异常停止后续管线并展示模型原因；续跑沿用原始配置', async t => {
  const f = await fixture(t), calls: PipelineId[] = [];
  await assert.rejects(runTask({ ...f.options, image: 'reference.png' }, { preflight, execute: async id => {
    calls.push(id);
    if (id === 'raster-layering') throw new Error('thread=draw-1\n模型最后消息：没有 image_generation 工具');
    return { summary: 'complete' };
  } }), /没有 image_generation/);
  assert.deepEqual(calls, ['part-layering', 'raster-layering']);
  const run = (await readRun(f.directory, 'case'))!;
  assert.equal(run.status, 'failed'); assert.equal(run.activePipeline, 'raster-layering');
  assert.match(run.error!, /thread=draw-1/);
  assert.equal(run.pipelines['clothing-part-layering']!.status, 'pending');
  assert.match(await readFile(join(f.directory, 'workflow.log'), 'utf8'), /模型最后消息/);
  await runTask({ name: 'case', dir: f.options.dir }, { preflight, execute: async () => ({ summary: 'resumed' }) });
  assert.equal((await readRun(f.directory, 'case'))!.status, 'completed');
});

test('手动上游可从组装开始，不伪造此前进度；更换原图不会覆盖已有输入', async t => {
  const f = await fixture(t), calls: PipelineId[] = [];
  await runTask({ ...f.options, from: 'character-assembly' }, { preflight, execute: async id => {
    calls.push(id); return { summary: 'assembled' };
  } });
  assert.deepEqual(calls, ['character-assembly']);
  assert.deepEqual(Object.keys((await readRun(f.directory, 'case'))!.pipelines), ['character-assembly']);
  await runTask({ ...f.options, image: 'reference.png' }, { preflight, execute: async () => ({ summary: 'ok' }) });
  await writeFile(join(f.directory, 'different.png'), 'different image');
  await assert.rejects(runTask({ ...f.options, image: 'different.png' }), /已有不同的原图/);
  assert.equal(await readFile(join(f.directory, 'input/original.png'), 'utf8'), 'original-image');
});

test('Krita 预检先于任何制作且错误可查询；用户可补路径恢复', async t => {
  const f = await fixture(t);
  await assert.rejects(runTask({ name: 'case', dir: f.options.dir, image: 'reference.png' }, {
    execute: async () => assert.fail('preflight must stop production'),
  }), /--krita/);
  const state = await taskStatus(f.options);
  assert.equal(state.status, 'failed'); assert.match(state.error!, /不会自动下载或搜索/);
  await assert.rejects(runTask(f.options, { preflight: async () => { throw new Error('Krita无法启动'); },
    execute: async () => assert.fail('preflight must stop production'),
  }), /Krita无法启动/);
  await runTask(f.options, { preflight, execute: async () => ({ summary: 'ok' }) });
});

test('同名任务锁阻止重复启动，取消保留状态并释放锁', async t => {
  const f = await fixture(t);
  const release = await acquireTaskLock(f.directory);
  await assert.rejects(runTask(f.options), /不能重复启动/);
  await release();
  const controller = new AbortController();
  await assert.rejects(runTask(f.options, { preflight, signal: controller.signal, execute: async () => {
    controller.abort(new Error('cancelled')); controller.signal.throwIfAborted();
    return { summary: 'unreachable' };
  } }), /cancelled/);
  assert.equal((await taskStatus(f.options)).status, 'interrupted');
  const unlock = await acquireTaskLock(f.directory); await unlock();
});

test('CLI 区分只读查询、后台启动和恢复，拒绝冲突参数', () => {
  assert.equal(parseArguments(['--name', 'case', '--status', '--json']).mode, 'status');
  assert.equal(parseArguments(['--name', 'case', '--background']).mode, 'background');
  for (const args of [ ['--name', 'case', '--dir', 'relative'], ['--name', 'case', '--json'],
    ['--name', 'case', '--status', '--background'], ['--name', 'case', '--status', '--image', 'x'],
    ['--name', 'case', '--replace-thread', 'raster-layering'], ['--name', 'case', '--jobs', '0'] ]) {
    assert.throws(() => parseArguments(args));
  }
});
