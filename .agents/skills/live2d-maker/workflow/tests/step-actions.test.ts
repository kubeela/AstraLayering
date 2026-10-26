import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { artifactPath, draftPath } from '../../shared/part/artifact-facts.ts';
import { groupStepId } from '../../shared/part/part-steps.ts';
import { readStep } from '../../shared/step-chain.ts';
import { acquireTaskLock } from '../state.ts';
import { applyStepAction, applyTaskAction, legacyLayout, listSteps, validStepId } from '../step-actions.ts';

async function fixture(t: TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'step-actions-')), task = join(dir, 'case');
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(task);
  return { dir, task, act: (pipeline: string, step: string, action: string) => applyStepAction({ name: 'case', dir, pipeline, step, action }) };
}
async function put(path: string, value: string) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, value); }
const text = (path: string) => readFile(path, 'utf8');
const gone = (path: string) => assert.rejects(readFile(path), { code: 'ENOENT' }, path);
const completed = (outputs: Record<string, string>) => JSON.stringify({ stamp: 's', inputs: {}, outputs });

for (const pipeline of ['part-layering', 'clothing-part-layering']) {
  test(`${pipeline} 补全步骤：继续不动，恢复只清会话，重试删除本步产物与草稿且不碰别组`, async t => {
    const f = await fixture(t), root = join(f.task, pipeline), step = join(root, groupStepId('head/eye', 2));
    const part = artifactPath(root, 'head/eye', 'completion'), other = artifactPath(root, 'body', 'completion');
    await put(join(step, '.running'), JSON.stringify({ inputs: {} }));
    await put(join(step, 'session.json'), JSON.stringify({ threadId: 'thread-1', harness: 'codex' }));
    await put(part, 'part'); await put(draftPath(part), 'draft'); await put(other, 'body');
    await put(join(root, groupStepId('body', 2), '.completed'), completed({ '../../../parts/body.svg': 'h' }));
    assert.deepEqual((await listSteps(root, pipeline as any)).map(entry => [entry.id, entry.status, entry.session]),
      [[groupStepId('body', 2), 'completed', false], [groupStepId('head/eye', 2), 'running', true]]);

    assert.match(await f.act(pipeline, groupStepId('head/eye', 2), 'continue'), /继续/);
    assert.equal(JSON.parse(await text(join(step, 'session.json'))).threadId, 'thread-1');

    assert.match(await f.act(pipeline, groupStepId('head/eye', 2), 'resume'), /thread-1/);
    await gone(join(step, 'session.json'));
    assert.equal(JSON.parse(await text(join(step, 'session.json.history.jsonl'))).threadId, 'thread-1');
    assert.equal(await text(part), 'part');
    assert.equal(await text(draftPath(part)), 'draft');
    assert.match(await f.act(pipeline, groupStepId('head/eye', 2), 'resume'), /恢复等同继续/);

    await f.act(pipeline, groupStepId('head/eye', 2), 'retry');
    assert.equal((await readStep(step)).status, 'absent');
    await gone(part); await gone(draftPath(part));
    assert.equal(await text(other), 'body');
    assert.equal((await readStep(join(root, groupStepId('body', 2)))).status, 'completed');
  });
}

test('任务级操作作用于全部中断或失败的步骤，已完成步骤不动', async t => {
  const f = await fixture(t), task = (action: string) => applyTaskAction({ name: 'case', dir: f.dir, action });
  const part = join(f.task, 'part-layering'), clothing = join(f.task, 'clothing-part-layering');
  const face = join(part, groupStepId('face', 3)), shirt = join(clothing, groupStepId('shirt', 2));
  const done = join(part, groupStepId('body', 2)), shirtPart = artifactPath(clothing, 'shirt', 'completion');
  for (const step of [face, shirt]) {
    await put(join(step, '.running'), JSON.stringify({ inputs: {} }));
    await put(join(step, 'session.json'), JSON.stringify({ threadId: 'thread-' + step.length }));
  }
  await put(join(done, '.completed'), completed({})); await put(join(done, 'session.json'), '{}');
  await put(draftPath(shirtPart), 'draft');

  assert.match(await task('continue'), /face\/step03[\s\S]*shirt\/step02/);
  assert.equal((await readStep(face)).status, 'running');
  await task('resume');
  await gone(join(face, 'session.json')); await gone(join(shirt, 'session.json'));
  assert.equal(await text(join(done, 'session.json')), '{}');
  assert.equal(await text(draftPath(shirtPart)), 'draft');
  await task('retry');
  assert.equal((await readStep(face)).status, 'absent'); assert.equal((await readStep(shirt)).status, 'absent');
  await gone(draftPath(shirtPart));
  assert.equal((await readStep(done)).status, 'completed');
  await assert.rejects(task('resume'), /没有中断或失败的步骤/);
  assert.match(await task('continue'), /从未完成处续跑/);
});

test('part 合并与遮挡重试删除步骤外的产物；已完成步骤只能重试', async t => {
  const f = await fixture(t), root = join(f.task, 'part-layering');
  await put(join(root, 'merge', '.completed'), completed({ '../preview.svg': 'h' }));
  await put(join(root, 'preview.svg'), 'preview'); await put(join(root, 'preview.draft.svg'), 'draft');
  await put(join(root, 'occlusion', '.running'), JSON.stringify({ inputs: {} })); await put(join(root, 'occlusion.json'), '{}');
  await assert.rejects(f.act('part-layering', 'merge', 'continue'), /已完成/);
  await assert.rejects(f.act('part-layering', 'merge', 'resume'), /已完成/);
  await f.act('part-layering', 'merge', 'retry');
  await gone(join(root, 'preview.svg')); await gone(join(root, 'preview.draft.svg'));
  await f.act('part-layering', 'occlusion', 'retry');
  await gone(join(root, 'occlusion.json'));
  await assert.rejects(f.act('part-layering', 'groups/../step01', 'retry'), /没有步骤/);
  await assert.rejects(f.act('part-layering', 'initial/step01', 'retry'), /不存在/);
});

const rasterConfig = (threadId: string | null) => JSON.stringify({ version: 2, name: 'case', threadId, threadHarness: 'claude',
  sourceInput: {}, krita: { executable: process.execPath, version: 'test' } });
for (const pipeline of ['raster-layering', 'clothing-raster-layering', 'character-assembly']) {
  test(`${pipeline} 步骤：恢复清除共享 thread 并记录，重试只删除该步骤`, async t => {
    const f = await fixture(t), root = join(f.task, pipeline);
    await put(join(root, 'run.json'), rasterConfig('thread-r'));
    await put(join(root, 'step01', '.completed'), 'legacy'); await put(join(root, 'step01', 'kept.kra'), 'kra');
    await put(join(root, 'step02', '.running'), JSON.stringify({ inputs: {} })); await put(join(root, 'step02', 'draft.kra'), 'draft');
    assert.deepEqual((await listSteps(root, pipeline as any)).map(entry => entry.id), ['step01', 'step02']);
    await f.act(pipeline, 'step02', 'resume');
    const config = JSON.parse(await text(join(root, 'run.json')));
    assert.equal(config.threadId, null); assert.equal(config.threadHarness, undefined);
    assert.deepEqual(JSON.parse(await text(join(root, 'agents/steps/step02', 'attempts.jsonl'))), {
      previousThreadId: 'thread-r', previousHarness: 'claude', reason: '网页恢复：清除会话，保留产物', at: JSON.parse(await text(join(root, 'agents/steps/step02', 'attempts.jsonl'))).at });
    assert.equal(await text(join(root, 'step02', 'draft.kra')), 'draft');
    assert.match(await f.act(pipeline, 'step02', 'resume'), /恢复等同继续/);
    await f.act(pipeline, 'step02', 'retry');
    assert.equal((await readStep(join(root, 'step02'))).status, 'absent');
    assert.equal(await text(join(root, 'step01', 'kept.kra')), 'kra');
    await assert.rejects(f.act(pipeline, 'merge', 'retry'), /没有步骤/);
  });
}

test('阴影步骤按总控记录的方式定位分支，另一分支不受影响', async t => {
  const f = await fixture(t);
  await put(join(f.task, 'run.json'), JSON.stringify({ version: 1, name: 'case', dir: f.dir, from: 'shadow', to: 'shadow', jobs: 1, status: 'interrupted', pipelines: {}, shadowMode: 'normal-depth' }));
  const target = join(f.task, 'shadow', 'normal-depth'), other = join(f.task, 'shadow', 'mask');
  await put(join(target, 'run.json'), rasterConfig('thread-s'));
  await put(join(target, 'step01', '.running'), JSON.stringify({ inputs: {} }));
  await put(join(other, 'step01', '.running'), JSON.stringify({ inputs: {} }));
  await f.act('shadow', 'step01', 'retry');
  assert.equal((await readStep(join(target, 'step01'))).status, 'absent');
  assert.equal((await readStep(join(other, 'step01'))).status, 'running');
});

test('旧 stages/ 目录在步骤操作时先转换；空步骤 id 只能继续整条管线', async t => {
  const f = await fixture(t), root = join(f.task, 'part-layering');
  await put(join(root, 'groups.json'), JSON.stringify({ subject: 'character', groups: [{ id: 'face', name: 'face' }] }));
  await put(join(root, 'stages', 'outline', 'face.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>');
  assert.equal(await legacyLayout(root, 'part-layering'), true);
  assert.equal(await legacyLayout(join(f.task, 'raster-layering'), 'raster-layering'), false);
  await assert.rejects(f.act('part-layering', '', 'retry'), /没有步骤/);
  assert.match(await f.act('part-layering', '', 'continue'), /旧版目录已转换/);
  assert.equal(await legacyLayout(root, 'part-layering'), false);
  assert.equal((await readStep(join(root, groupStepId('face', 1)))).status, 'completed');
  assert.match(await f.act('part-layering', '', 'continue'), /下次运行续跑/);
});

test('运行中的任务持有锁时拒绝步骤操作', async t => {
  const f = await fixture(t), root = join(f.task, 'raster-layering');
  await put(join(root, 'step01', '.running'), JSON.stringify({ inputs: {} }));
  const release = await acquireTaskLock(f.task);
  try { await assert.rejects(f.act('raster-layering', 'step01', 'retry')); }
  finally { await release(); }
  assert.equal((await readStep(join(root, 'step01'))).status, 'running');
  await assert.rejects(f.act('raster-layering', 'step01', 'redo'), /未知操作/);
});

test('步骤 id 只接受管线自己的步骤目录', () => {
  assert.ok(validStepId('part-layering', 'groups/head/children/eye/step03'));
  assert.ok(validStepId('clothing-part-layering', 'layers/depth02'));
  assert.ok(!validStepId('part-layering', 'step01'));
  assert.ok(!validStepId('raster-layering', 'groups/head/step01'));
  assert.ok(!validStepId('part-layering', 'groups/../step01'));
});
