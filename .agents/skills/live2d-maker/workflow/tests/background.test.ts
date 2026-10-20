import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { test, type TestContext } from 'node:test';
import { newConfig, initializeRun } from '../../shared/raster/run-store.ts';
import { steps } from '../../character-assembly/steps.ts';
import { startBackground } from '../run.ts';
import { runTask } from '../runner.ts';
import { processAlive, taskStatus } from '../state.ts';

const cli = fileURLToPath(new URL('../run.ts', import.meta.url));
async function fixture(t: TestContext, slow = false) {
  const dir = await mkdtemp(join(tmpdir(), 'live2d-background-')), name = 'case', task = join(dir, name);
  t.after(() => rm(dir, { recursive: true, force: true }));
  const inputs = {
    characterKra: join(task, 'raster-layering/step03/character-dressup-base.kra'),
    clothingKra: join(task, 'clothing-raster-layering/step02/clothing-soft-edges.kra'),
    simplifiedCharacter: join(task, 'part-layering/references/simplified-subject.png'),
  };
  for (const path of Object.values(inputs)) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, 'upstream'); }
  const krita = join(task, 'krita-fixture');
  const script = '#!' + process.execPath + '\n'
    + (slow ? 'require("node:fs").writeFileSync(' + JSON.stringify(join(task, 'probe.pid')) + ', String(process.pid)); setTimeout(() => console.log("krita 5.3.4"), 6000);' : 'console.log("krita 5.3.4");');
  await writeFile(krita, script, { mode: 0o755 });
  const output = join(task, 'character-assembly');
  const config = newConfig(name, inputs, { executable: krita, version: '5.3.4' }, steps);
  config.threadId = 'completed-fixture';
  await initializeRun(output, config);
  await mkdir(join(output, 'step01'));
  for (const file of [...steps[0].requiredFiles, '.completed']) await writeFile(join(output, 'step01', file), 'retained');
  return { dir, name, task, inputs, output, options: { dir, name, krita, from: 'character-assembly' as const } };
}
async function until(check: () => Promise<boolean>, timeout = 10_000) {
  const end = Date.now() + timeout;
  while (!await check()) { if (Date.now() > end) assert.fail('timed out'); await delay(30); }
}

test('真实后台父进程退出后任务继续，已完成组装跳过模型并记录交付', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t);
  const { stdout } = await promisify(execFile)(process.execPath, [cli, '--name', f.name, '--dir', f.dir,
    '--from', 'character-assembly', '--background'], { timeout: 15_000 });
  assert.match(stdout, /后台总调度已启动/);
  await until(async () => !(await taskStatus(f.options)).lockHeld);
  const status = await taskStatus(f.options);
  assert.equal(status.status, 'completed'); assert.equal(status.pipelines[0].threadId, 'completed-fixture');
  assert.equal(status.output, join(f.output, 'step01/character-assembled.kra'));
  const before = await readFile(join(f.task, 'run.json'));
  const result = await promisify(execFile)(process.execPath, [cli, '--name', f.name, '--dir', f.dir, '--status', '--json']);
  assert.equal(JSON.parse(result.stdout).status, 'completed');
  assert.deepEqual(await readFile(join(f.task, 'run.json')), before, 'status is read-only');
});

test('后台前置错误不假报启动；子管线错误完整进入总控', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t);
  await assert.rejects(startBackground({ ...f.options, krita: join(f.task, 'missing') }), /不存在或不可执行/);
  assert.equal((await taskStatus(f.options)).status, 'failed');
  await rm(f.inputs.clothingKra);
  await startBackground(f.options);
  await until(async () => !(await taskStatus(f.options)).lockHeld);
  const status = await taskStatus(f.options);
  assert.equal(status.status, 'failed'); assert.match(status.error!, /clothing-soft-edges.kra/);
  assert.match(status.error!, /手动放置/);
});

test('后台启动转发标准化的显式开启和关闭，不悄悄忽略选项', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t);
  // The actual worker must reject these options for an assembly-only route before it signals ready.
  for (const standard of [true, false]) {
    await assert.rejects(startBackground({ ...f.options, standard }), /需要本次路线包含 part-layering/);
  }
});

test('取消总调度会终止实际管线子进程及其工具进程，保留已有工程', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t, true), controller = new AbortController();
  const running = runTask(f.options, { signal: controller.signal,
    // Skip just the parent's probe, so cancellation targets the actual worker and its probe child.
    preflight: async executable => ({ executable, version: 'fixture' }),
  });
  // Attach a rejection handler immediately while waiting for the child to initialize.
  const stopped = assert.rejects(running, /cancel test/);
  await until(() => readFile(join(f.task, 'probe.pid')).then(() => true, () => false));
  const probePid = Number(await readFile(join(f.task, 'probe.pid'), 'utf8'));
  const workerPid = (await taskStatus(f.options)).runner!.childPid!;
  controller.abort(new Error('cancel test'));
  await stopped;
  await until(async () => !processAlive(workerPid));
  // Linux can retain an orphan as a zombie briefly: it is dead, even if kill(pid, 0) succeeds.
  if (process.platform === 'linux' && processAlive(probePid)) {
    assert.match(await readFile('/proc/' + probePid + '/status', 'utf8').catch(() => 'State: Z'), /State:\s+Z/);
  } else assert.equal(processAlive(probePid), false);
  assert.equal((await taskStatus(f.options)).status, 'interrupted');
  assert.equal(await readFile(join(f.output, 'step01/character-assembled.kra'), 'utf8'), 'retained');
});
