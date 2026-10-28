import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, type TestContext } from 'node:test';
import { pipelineIds, type PipelineId } from '../../shared/paths.ts';
import { runTask } from '../runner.ts';
import { acquireTaskLock, configureRun, directoryFor, readRun, saveRun, taskStatus } from '../state.ts';
import { main, parseArguments, startBackground } from '../run.ts';
import { fakePatchedCodex } from '../../shared/tests/fake-codex.ts';
import { markBaseStep } from '../../shared/tests/dressup-fixture.ts';

// Real background workers inherit this and pass the Codex startup check without a build.
process.env.layering_codex_path = await fakePatchedCodex();

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

test('状态保存失败不能切断后续 agent 日志、状态和阶段推进', async t => {
  const f = await fixture(t);
  let injected = false;
  await runTask({ ...f.options, from: 'part-layering', to: 'part-layering' }, {
    save: async (directory, run) => {
      if (run.lastMessage === '[hair] 第一条消息' && !injected) {
        injected = true;
        throw Object.assign(new Error('模拟 Windows 文件占用'), { code: 'EPERM' });
      }
      await saveRun(directory, run);
    },
    execute: async (_id, _run, context) => {
      context.progress('[hair] 第一条消息');
      context.progress('[hair] 写入草稿成功');
      return { summary: '完成' };
    },
  });
  assert.equal(injected, true);
  const log = await readFile(join(f.directory, 'workflow.log'), 'utf8');
  assert.match(log, /状态保存失败.*模拟 Windows 文件占用/);
  assert.equal(log.match(/\[hair\] 写入草稿成功/g)?.length, 1);
  assert.match(log, /所选路线已完成/);
  assert.equal((await readRun(f.directory, 'case'))?.status, 'completed');
  assert.equal((await taskStatus(f.options)).log, join(f.directory, 'workflow.log'));
  assert.equal((await readdir(f.directory)).includes('service.log'), false);
});

test('状态原子替换对短暂占用重试，永久失败保留旧状态并清理暂存', async t => {
  const f = await fixture(t), run = await configureRun(f.options, f.directory);
  let attempts = 0;
  await saveRun(f.directory, run, async (source, destination) => {
    if (++attempts < 3) throw Object.assign(new Error('busy'), { code: 'EPERM' });
    await rename(source, destination);
  });
  assert.equal(attempts, 3);
  const before = await readFile(join(f.directory, 'run.json'), 'utf8');
  await assert.rejects(saveRun(f.directory, { ...run, status: 'completed' }, async () => {
    throw Object.assign(new Error('disk failure'), { code: 'EIO' });
  }), /disk failure/);
  assert.equal(await readFile(join(f.directory, 'run.json'), 'utf8'), before);
  assert.equal((await readdir(f.directory)).some(name => name.endsWith('.tmp')), false);
});

test('真实后台启动失败只写主日志，不另建 service.log', async t => {
  const f = await fixture(t);
  // A Krita path that is not executable fails the light check.
  await assert.rejects(startBackground({ ...f.options, krita: join(f.directory, 'reference.png'), from: 'raster-layering', to: 'raster-layering' }), /Krita|krita/);
  assert.match(await readFile(join(f.directory, 'workflow.log'), 'utf8'), /Krita|krita/);
  assert.equal((await readdir(f.directory)).includes('service.log'), false);
});

test('总控保留输入与配置，严格按序推进；后续仅用 name 和 dir 恢复', async t => {
  const f = await fixture(t), first: PipelineId[] = [], second: PipelineId[] = [];
  await runTask({ ...f.options, image: 'reference.png', jobs: 2, standard: true }, { preflight, execute: async (id, run) => {
    first.push(id);
    const disk = (await readRun(f.directory, 'case'))!;
    assert.equal(disk.activePipeline, id);
    assert.equal(disk.status, 'running');
    assert.equal(run.jobs, 2);
    assert.equal(run.image, join('input', 'original.png'));
    assert.equal(run.standard, true); assert.equal(disk.standard, true);
    return { summary: id, output: join(f.directory, id, 'output') };
  } });
  assert.deepEqual(first, pipelineIds);
  assert.equal(await readFile(join(f.directory, 'input/original.png'), 'utf8'), 'original-image');
  await rm(join(f.directory, 'reference.png'));
  await runTask({ name: 'case', dir: f.options.dir }, { preflight, execute: async (id, run) => {
    second.push(id); assert.equal(run.jobs, 2); assert.equal(run.krita, process.execPath);
    assert.equal(run.standard, true);
    return { summary: '管线自身检查并跳过', output: 'retained' };
  } });
  // Re-enter the pipeline's own authoritative checks, never trust a stale top-level completion alone.
  assert.deepEqual(second, pipelineIds.filter(id => !['part-layering', 'clothing-part-layering'].includes(id)));
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
  assert.deepEqual(calls, ['character-assembly', 'shadow']);
  assert.deepEqual(Object.keys((await readRun(f.directory, 'case'))!.pipelines), ['character-assembly', 'shadow']);
  await runTask({ ...f.options, image: 'reference.png' }, { preflight, execute: async () => ({ summary: 'ok' }) });
  await writeFile(join(f.directory, 'different.png'), 'different image');
  await assert.rejects(runTask({ ...f.options, image: 'different.png' }), /已有不同的原图/);
  assert.equal(await readFile(join(f.directory, 'input/original.png'), 'utf8'), 'original-image');
});

test('Krita 不可用时拒绝启动且不改动任务记录；用 --krita 重新指定后继续', async t => {
  const f = await fixture(t);
  const refuse = { execute: async () => assert.fail('preflight must stop production') };
  await assert.rejects(runTask({ name: 'case', dir: f.options.dir, image: 'reference.png' }, refuse), /没有记录 Krita 路径[\s\S]*--krita/);
  await assert.rejects(readFile(join(f.directory, 'run.json')), { code: 'ENOENT' });
  assert.match(await readFile(join(f.directory, 'workflow.log'), 'utf8'), /--krita/);
  await runTask({ ...f.options, image: 'reference.png', to: 'part-layering' }, { ...refuse, execute: async () => ({ summary: 'ok' }) });
  const before = await readFile(join(f.directory, 'run.json'), 'utf8');
  const broken = async () => { throw new Error('Krita无法启动'); };
  await assert.rejects(runTask({ name: 'case', dir: f.options.dir, to: 'shadow' }, { ...refuse, preflight: broken }),
    error => /记录的 Krita 不可用：/.test(String(error)) && /Krita无法启动/.test(String(error)) && /--krita/.test(String(error)));
  await assert.rejects(runTask({ name: 'case', dir: f.options.dir, to: 'shadow', krita: 'other-krita' }, { ...refuse, preflight: broken }), /指定的 Krita 不可用：.*other-krita/);
  assert.equal(await readFile(join(f.directory, 'run.json'), 'utf8'), before, '拒绝启动不能记录失败状态或错误路径');
  await runTask({ name: 'case', dir: f.options.dir, to: 'shadow' }, { preflight, execute: async () => ({ summary: 'ok' }) });
  assert.equal((await readRun(f.directory, 'case'))!.krita, process.execPath);
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
    ['--name', 'case', '--replace-thread', 'raster-layering'], ['--name', 'case', '--jobs', '0'],
    ['--name', 'case', '--standard', '--no-standard'], ['--name', 'case', '--status', '--standard'],
    ['--name', 'case', '--status', '--no-standard'] ]) {
    assert.throws(() => parseArguments(args));
  }
});

test('CLI 与网页操作对应：继续、恢复、重试、停止，可指定单个步骤', () => {
  const parse = (...args: string[]) => parseArguments(['--name', 'case', ...args]) as any;
  assert.deepEqual(parse('--retry').action, { action: 'retry', pipeline: undefined, step: '' });
  assert.equal(parse('--retry').mode, 'run');
  assert.deepEqual([parse('--resume', '--background').mode, parse('--resume', '--background').action.action], ['background', 'resume']);
  assert.equal(parse('--continue', '--krita', '/opt/krita').options.krita, '/opt/krita');
  assert.deepEqual(parse('--retry', '--pipeline', 'part-layering', '--step', 'groups/head/step02').action,
    { action: 'retry', pipeline: 'part-layering', step: 'groups/head/step02' });
  assert.deepEqual(parse('--continue', '--pipeline', 'shadow').action, { action: 'continue', pipeline: 'shadow', step: '' });
  assert.equal(parse('--stop').mode, 'stop');
  assert.equal(parse().action, undefined);
  for (const args of [['--resume', '--retry'], ['--pipeline', 'shadow'], ['--retry', '--step', 'step01'],
    ['--retry', '--pipeline', 'shadow'], ['--retry', '--pipeline', 'unknown', '--step', 'step01'],
    ['--stop', '--krita', 'x'], ['--stop', '--background'], ['--stop', '--retry'], ['--status', '--retry']]) {
    assert.throws(() => parse(...args), Error, args.join(' '));
  }
});

test('CLI 恢复与重试先检查 Krita，不可用则拒绝且不改动步骤', async t => {
  const f = await fixture(t), dir = f.options.dir!;
  const session = join(f.directory, 'part-layering/agents/steps/groups/head/step02/session.json');
  await mkdir(join(f.directory, 'part-layering/groups/head/step02'), { recursive: true });
  await writeFile(join(f.directory, 'part-layering/groups/head/step02/.running'), JSON.stringify({ inputs: {} }));
  await mkdir(join(session, '..'), { recursive: true }); await writeFile(session, JSON.stringify({ threadId: 'thread-1' }));
  for (const action of ['--resume', '--retry']) {
    await assert.rejects(main(['--name', 'case', '--dir', dir, action]), /没有记录 Krita 路径[\s\S]*--krita/);
    await assert.rejects(main(['--name', 'case', '--dir', dir, action, '--krita', join(f.directory, 'missing-krita')]), /指定的 Krita 不可用[\s\S]*不存在或不可执行[\s\S]*--krita/);
  }
  assert.equal(JSON.parse(await readFile(session, 'utf8')).threadId, 'thread-1');
  assert.equal(await readFile(join(f.directory, 'part-layering/groups/head/step02/.running'), 'utf8'), JSON.stringify({ inputs: {} }));
  await assert.rejects(main(['--name', 'case', '--dir', dir, '--stop']), /缺少总控记录/);
});

test('标准化选项保持未指定、开启和关闭的区别，并继承独立 part 的已存选项', async t => {
  for (const [flags, expected] of [[[], undefined], [['--standard'], true], [['--no-standard'], false]] as const) {
    const parsed = parseArguments(['--name', 'case', ...flags]);
    assert.notEqual(parsed.mode, 'help');
    if (parsed.mode !== 'help') assert.equal(parsed.options.standard, expected);
  }
  const f = await fixture(t);
  assert.equal((await configureRun(f.options, f.directory)).standard, false);
  const refs = join(f.directory, 'part-layering/references');
  await mkdir(refs, { recursive: true });
  await writeFile(join(refs, 'preparation.json'), JSON.stringify({ version: 1, standard: true, files: {} }));
  assert.equal((await configureRun(f.options, f.directory)).standard, true);
  assert.equal((await configureRun({ ...f.options, standard: false }, f.directory)).standard, false);
  await assert.rejects(configureRun({ ...f.options, from: 'character-assembly', standard: true }, f.directory), /需要本次路线包含 part-layering/);
  await assert.rejects(configureRun({ ...f.options, from: 'character-assembly', standard: false }, f.directory), /需要本次路线包含 part-layering/);
});


test('绘画中断后总控不重进已完成 part 管线，沿用新增结构', async t => {
  for (const [part, raster] of [['part-layering', 'raster-layering'], ['clothing-part-layering', 'clothing-raster-layering']] as const) {
    const f = await fixture(t);
    const options = { ...f.options, from: part, to: raster };
    const file = join(f.directory, part, 'groups.json');
    await assert.rejects(runTask(options, { preflight, execute: async id => {
      if (id === part) { await mkdir(join(f.directory, part)); await writeFile(file, 'original'); return { summary: 'complete' }; }
      await writeFile(file, 'drawing corrected structure');
      throw new Error('drawing interrupted');
    } }), /drawing interrupted/);
    const calls: string[] = [];
    await runTask(options, { preflight, execute: async id => {
      calls.push(id);
      assert.equal(await readFile(file, 'utf8'), 'drawing corrected structure');
      return { summary: 'complete' };
    } });
    assert.deepEqual(calls, [raster]);
  }
});

test('素体未换装时跳过衣服拆分与衣服绘制，记为已完成后继续组装和阴影', async t => {
  const f = await fixture(t), executed: PipelineId[] = [];
  const execute = async (id: PipelineId) => {
    executed.push(id);
    if (id === 'part-layering') await markBaseStep(f.directory, false);
    return { summary: id };
  };
  const run = await runTask({ ...f.options, image: 'reference.png' }, { preflight, execute });
  assert.deepEqual(executed, ['part-layering', 'raster-layering', 'character-assembly', 'shadow']);
  for (const id of ['clothing-part-layering', 'clothing-raster-layering'] as const) {
    assert.equal(run.pipelines[id]?.status, 'completed'); assert.equal(run.pipelines[id]?.skipped, true);
    assert.match(run.pipelines[id]!.summary!, /没有衣服需要拆分和绘制/);
  }
  assert.equal(run.status, 'completed');
  // A rerun of the base step that dresses the subject runs the clothing lane again.
  executed.length = 0;
  await markBaseStep(f.directory, true);
  const dressed = await runTask({ name: 'case', dir: f.options.dir }, { preflight, execute: async id => { executed.push(id); return { summary: id }; } });
  // part-layering stays as drawn: its raster stage has started.
  assert.deepEqual(executed, pipelineIds.slice(1));
  assert.equal(dressed.pipelines['clothing-part-layering']?.skipped, undefined);
});
