import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { ensureMattingRuntime, runMattingWorker } from '../matting/runtime.ts';
import { defaultRunsDirectory, resolveRunsDirectory, runsDirectory, taskDirectory } from '../paths.ts';

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'matting-runtime-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const krita = join(root, 'krita.mjs');
  await writeFile(krita, `#!${process.execPath}\nconsole.log('krita 5.3 fixture');\n`, { mode: 0o700 });
  return { root, krita };
}
const host = { python: '3.13.5', abi: 'cp313', platform: 'linux', krita: '5.3', home: '', config: '' };

test('共享环境在 --dir 的 .runtime，下游与不同任务共用；不传 dir 使用既有默认值', async t => {
  const f = await fixture(t);
  let installs = 0, downloads = 0;
  const services = {
    async pip(root: string) { downloads++; return join(root, 'test-pip.whl'); },
    async worker(_krita: string, _root: string, job: { mode: string; packages?: string }) {
      if (job.mode === 'install') {
        installs++; await delay(450);
        await mkdir(join(job.packages!, 'torch'), { recursive: true });
        await writeFile(join(job.packages!, 'torch/__init__.py'), 'test');
      }
      return { success: true, host, modules: { torch: '2.7.1+cpu' } };
    },
  };
  const signal = new AbortController().signal;
  const opts = { krita: f.krita, runsRoot: f.root };
  const [first, second] = await Promise.all([ensureMattingRuntime(opts, signal, services), ensureMattingRuntime(opts, signal, services)]);
  assert.deepEqual(first, second); assert.equal(installs, 1); assert.equal(downloads, 1);
  assert.ok(first.root.startsWith(join(f.root, '.runtime/matting')));
  assert.ok(!first.root.startsWith(taskDirectory('one', f.root)));
  const third = await ensureMattingRuntime(opts, signal, services);
  assert.deepEqual(third, first); assert.equal(installs, 1); assert.equal(downloads, 1);
  assert.equal(resolveRunsDirectory(), runsDirectory);
  assert.equal(defaultRunsDirectory(join(f.root, 'installed/live2d-maker')), join(f.root, 'installed/.run'));
  // A different embedded interpreter environment does not share incompatible wheels.
  const changed = await ensureMattingRuntime({ ...opts, env: { ...process.env, PYTHONHOME: '/other/python' } }, signal, services);
  assert.notEqual(changed.root, first.root); assert.equal(installs, 2);
});

test('安装失败或取消无成功记录、无未完成包；后续可以重试', async t => {
  const f = await fixture(t); const opts = { krita: f.krita, runsRoot: f.root };
  for (const cancel of [false, true]) {
    const controller = new AbortController();
    const services = {
      async pip(root: string) { return join(root, 'test-pip.whl'); },
      async worker(_k: string, _r: string, job: { mode: string; packages?: string }, _o: unknown, signal: AbortSignal) {
        if (job.mode === 'install') {
          await writeFile(join(job.packages!, 'unfinished'), 'test');
          if (cancel) { controller.abort(new Error('cancelled')); signal.throwIfAborted(); }
          throw new Error('network failed');
        }
        return { success: true, host };
      },
    };
    await assert.rejects(ensureMattingRuntime(opts, controller.signal, services), cancel ? /cancelled/ : /network failed/);
    const [id] = await readdir(join(f.root, '.runtime/matting'));
    const entries = await readdir(join(f.root, '.runtime/matting', id));
    assert.ok(!entries.includes('ready.json')); assert.ok(!entries.some(n => n.startsWith('.install-')));
  }
});

test('独立 Krita worker 保留传入环境并隔离 HOME、配置、缓存，不依赖系统 Python', async t => {
  const f = await fixture(t);
  await writeFile(f.krita, `#!${process.execPath}
import {readFileSync,writeFileSync} from 'node:fs';import {dirname,join} from 'node:path';
const p=process.env.LAYERING_MATTING_JOB,j=JSON.parse(readFileSync(p));
if(process.env.DEPENDENCY_FIXTURE!=='available') process.exit(4);
writeFileSync(join(dirname(p),'result.json'),JSON.stringify({success:true,host:{home:process.env.HOME,config:process.env.XDG_CONFIG_HOME,python:'embedded',abi:'cp313'}}));
// Simulate Krita ignoring quit() during startup: the manager must close its own process.
setInterval(()=>{},1000);
`);
  const env: NodeJS.ProcessEnv = { ...process.env, DEPENDENCY_FIXTURE: 'available' };
  const root = join(f.root, '.runtime/matting/test');
  const result = await runMattingWorker(f.krita, root, { mode: 'probe' }, { env }, new AbortController().signal);
  assert.ok(result.host.home.startsWith(root)); assert.ok(result.host.config.startsWith(root));
  assert.notEqual(result.host.home, env.HOME); assert.equal(process.env.DEPENDENCY_FIXTURE, undefined);
  const [id] = await readdir(join(root, 'jobs'));
  const job = JSON.parse(await readFile(join(root, 'jobs', id, 'job.json'), 'utf8'));
  assert.equal(job.expectedHome, result.host.home); assert.equal(job.expectedConfig, result.host.config);
});

test('缺少显式 Krita 时不建立运行环境', async t => {
  const f = await fixture(t);
  await assert.rejects(ensureMattingRuntime({ runsRoot: f.root }, new AbortController().signal), /--krita/);
  assert.deepEqual(await readdir(f.root), ['krita.mjs']);
});
