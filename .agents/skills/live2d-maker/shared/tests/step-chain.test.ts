import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { beginStep, checkStep, completeStep, inspectChain, modifiedError, resetChain, startStep, type ChainStep } from '../step-chain.ts';

async function tree(t: { after(fn: () => Promise<void>): void }) {
  const root = await mkdtemp(join(tmpdir(), 'step-chain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  // a -> b -> c, and a -> d: a tree, not a line.
  const step = (id: string, ...dependsOn: string[]): ChainStep => ({ id, root, directory: join(root, id), dependsOn });
  const steps = [step('a'), step('b', 'a'), step('c', 'b'), step('d', 'a')];
  const finish = async (id: string) => {
    const target = steps.find(s => s.id === id)!;
    await mkdir(target.directory, { recursive: true });
    await startStep(target.directory, (await inspectChain(steps)).statuses.get(id)!);
    await completeStep(target, steps);
  };
  return { steps, finish };
}

test('上游重新完成后，依赖它的已完成步骤及其后代断链重跑，旁支保留', async t => {
  const { steps, finish } = await tree(t);
  for (const id of ['a', 'b', 'c', 'd']) await finish(id);
  assert.deepEqual((await inspectChain(steps)).reset, []);
  await rm(join(steps[1].directory, '.completed'));
  await finish('b');
  const plan = await inspectChain(steps);
  assert.deepEqual(plan.reset, ['c']);
  await resetChain(steps, plan);
  await assert.rejects(stat(steps[2].directory), { code: 'ENOENT' });
  await stat(join(steps[3].directory, '.completed'));
});

test('缺标记的步骤与其存在的后代重跑；缺失的上游只断开已存在的下游', async t => {
  const { steps, finish } = await tree(t);
  for (const id of ['a', 'b', 'c', 'd']) await finish(id);
  await rm(join(steps[0].directory, '.completed'));
  assert.deepEqual((await inspectChain(steps)).reset, ['a', 'b', 'c', 'd']);
  await rm(steps[0].directory, { recursive: true });
  assert.deepEqual((await inspectChain(steps)).reset, ['b', 'c', 'd']);
});

test('旧的空 .completed 视为完成；重新打开已完成步骤保留原 stamp', async t => {
  const { steps, finish } = await tree(t);
  await mkdir(steps[0].directory); await writeFile(join(steps[0].directory, '.completed'), '');
  await finish('b');
  assert.deepEqual(JSON.parse(await readFile(join(steps[1].directory, '.completed'), 'utf8')).inputs, {});
  const before = await readFile(join(steps[1].directory, '.completed'), 'utf8');
  await finish('b');
  assert.equal(await readFile(join(steps[1].directory, '.completed'), 'utf8'), before);
  assert.deepEqual((await inspectChain(steps)).reset, []);
});

test('声明产物的步骤：续跑发现产物被换则报告改动；重试后 hash 刷新，同内容重做保留下游', async t => {
  const root = await mkdtemp(join(tmpdir(), 'step-chain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const steps: ChainStep[] = [{ id: 'a', root, directory: join(root, 'a'), dependsOn: [], outputs: ['a.png'] },
    { id: 'b', root, directory: join(root, 'b'), dependsOn: ['a'], outputs: ['b.png'] }];
  const finish = async (index: number, bytes: string) => {
    await mkdir(steps[index].directory, { recursive: true });
    await writeFile(join(steps[index].directory, `${steps[index].id}.png`), bytes);
    await startStep(steps[index].directory, (await inspectChain(steps)).statuses.get(steps[index].id)!);
    await completeStep(steps[index], steps);
  };
  await finish(0, 'one'); await finish(1, 'two');
  await writeFile(join(steps[0].directory, 'a.png'), 'swapped');
  const plan = await inspectChain(steps);
  assert.deepEqual(plan, { ...plan, reset: [], modified: ['a'] });
  assert.match(modifiedError(plan, steps)!.message, /不能直接续跑/);
  // Retry a with the same bytes: b stays.
  await rm(steps[0].directory, { recursive: true });
  await finish(0, 'one');
  assert.deepEqual((await inspectChain(steps)).reset, []);
  // Retry a with new bytes: b reruns.
  await rm(steps[0].directory, { recursive: true });
  await finish(0, 'changed');
  assert.deepEqual((await inspectChain(steps)).reset, ['b']);
});

test('产物可在步骤目录外：删除产物即重试该步骤，重置会一并删除后代的产物', async t => {
  const root = await mkdtemp(join(tmpdir(), 'step-chain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const steps: ChainStep[] = [{ id: 'a', root, directory: join(root, 'raster-layering/a'), dependsOn: [], outputs: ['../a.png'] },
    { id: 'b', root, directory: join(root, 'raster-layering/b'), dependsOn: ['a'], outputs: ['../b.png'] }];
  for (const step of steps) {
    await mkdir(step.directory, { recursive: true });
    await writeFile(join(root, `raster-layering/${step.id}.png`), step.id);
    await startStep(step.directory, 'absent');
    await completeStep(step, steps);
  }
  // Recorded output paths are task-root-relative.
  const record = JSON.parse(await readFile(join(root, 'raster-layering/b/.completed'), 'utf8'));
  assert.deepEqual([Object.keys(record.outputs), record.paths], [['raster-layering/b.png'], 'task']);
  assert.deepEqual((await inspectChain(steps)).reset, []);
  // Older records keyed by the declared step-relative name still match.
  await writeFile(join(root, 'raster-layering/b/.completed'), JSON.stringify({ ...record, paths: undefined, outputs: { '../b.png': record.outputs['raster-layering/b.png'] } }));
  assert.deepEqual([(await inspectChain(steps)).reset, (await inspectChain(steps)).modified], [[], []]);
  await rm(join(root, 'raster-layering/a.png'));
  const plan = await inspectChain(steps);
  assert.deepEqual([plan.reset, plan.modified], [['a', 'b'], []]);
  await resetChain(steps, plan);
  for (const path of ['raster-layering/b.png', 'raster-layering/a', 'raster-layering/b']) await assert.rejects(stat(join(root, path)), { code: 'ENOENT' });
});

test('部件组以管线名命名时，记录仍以给定的任务根为基准', async t => {
  const root = await mkdtemp(join(tmpdir(), 'step-chain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const group = join(root, 'part-layering/groups/raster-layering');
  const step: ChainStep = { id: 'step01', root, directory: join(group, 'step01'), dependsOn: [], outputs: ['../outline.svg'] };
  await mkdir(step.directory, { recursive: true }); await writeFile(join(group, 'outline.svg'), '<svg/>');
  await startStep(step.directory, 'absent'); await completeStep(step, [step]);
  const record = JSON.parse(await readFile(join(step.directory, '.completed'), 'utf8'));
  assert.deepEqual(Object.keys(record.outputs), ['part-layering/groups/raster-layering/outline.svg']);
  assert.deepEqual([(await inspectChain([step])).reset, (await inspectChain([step])).modified], [[], []]);
});

test('按产物依赖（id#output）：只有所依赖的产物变化才重跑；中断时同输入续跑，输入变了重跑', async t => {
  const root = await mkdtemp(join(tmpdir(), 'step-chain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const layer: ChainStep = { id: 'layer', root, directory: join(root, 'layer'), dependsOn: [], outputs: ['x.svg', 'y.svg'] };
  const step = (name: string): ChainStep => ({ id: name, root, directory: join(root, name), dependsOn: [`layer#${name}.svg`] });
  const [x, y] = [step('x'), step('y')], steps = [layer, x, y];
  const write = async (name: string, text: string) => { await mkdir(layer.directory, { recursive: true }); await writeFile(join(layer.directory, name), text); };
  const run = async (target: ChainStep) => { await beginStep(target.directory, (await checkStep(target, steps)).inputs); await completeStep(target, steps); };
  await beginStep(layer.directory, {});
  await write('x.svg', 'x1'); await write('y.svg', 'y1');
  await completeStep(layer, steps);
  for (const target of [x, y]) await run(target);
  assert.deepEqual(await Promise.all([x, y].map(async target => (await checkStep(target, steps)).action)), ['keep', 'keep']);

  // The layer reruns and rewrites y only; x keeps, y reruns.
  await beginStep(layer.directory, {});
  await write('y.svg', 'y2');
  await completeStep(layer, steps);
  assert.equal((await checkStep(x, steps)).action, 'keep');
  assert.equal((await checkStep(y, steps)).action, 'rerun');

  // Interrupted against the current inputs: continue. Inputs changed meanwhile: rerun.
  await beginStep(y.directory, (await checkStep(y, steps)).inputs);
  assert.equal((await checkStep(y, steps)).action, 'continue');
  await beginStep(layer.directory, {});
  await write('y.svg', 'y3');
  await completeStep(layer, steps);
  assert.equal((await checkStep(y, steps)).action, 'rerun');
  assert.equal((await checkStep(x, steps)).action, 'keep');
});
