import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { taskRootOf } from '../../shared/task-paths.ts';
import { test, type TestContext } from 'node:test';
import { artifactPath, readJson, reportPath } from '../../shared/part/artifact-facts.ts';
import { GroupStore, walkGroups, writeAtomic } from '../../shared/part/groups.ts';
import { runLayering } from '../../shared/part/layering.ts';
import type { LayeringSteps } from '../../shared/part/layering-types.ts';
import { groupStepId } from '../../shared/part/part-steps.ts';
import { readStep } from '../../shared/step-chain.ts';
import { fixture, shape, workingMerger, workingSteps } from './layering-fixture.ts';

async function missing(paths: string[]) {
  for (const path of paths) await assert.rejects(readFile(path), { code: 'ENOENT' }, path);
}
const snapshot = (paths: string[]) => Promise.all(paths.map(async path => [await readFile(path), (await stat(path, { bigint: true })).mtimeNs]));
// The first drawing of each listed group keeps the fixture shape; later drawings are narrower.
function redrawn(steps: LayeringSteps, ids: string[]): LayeringSteps {
  const drawn = new Set<string>();
  return { ...steps, async drawOutline(context) {
    const id = context.group.id;
    if (!ids.includes(id) || !drawn.has(id)) { drawn.add(id); return steps.drawOutline(context); }
    await steps.drawOutline(context);
    await writeAtomic(context.outputPath, shape(id, 20, 80));
    return { status: 'completed', output: { path: context.outputPath } };
  } };
}

test('删 outline 后原样重画：只重做轮廓与复核，本层去重、补全和合并全部沿用', async t => {
  const f = await fixture(t), events: string[] = [];
  const steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
  await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
  const kept = [...['a', 'b'].flatMap(id => [artifactPath(f.directory, id, 'reduction'), artifactPath(f.directory, id, 'completion'),
    reportPath(f.directory, id, 'completion-check')]), join(f.directory, 'preview.svg')];
  const before = await snapshot(kept);
  await rm(artifactPath(f.directory, 'a', 'outline'));
  events.length = 0;
  await runLayering({ ...f, groups: null, steps: { ...steps, async drawOutline(context) {
    // 重做 step01 会先删掉整个步骤目录：旧复核记录和会话不会带进新一轮。
    await missing([reportPath(f.directory, 'a', 'review'), join(f.directory, groupStepId('a', 'outline'), 'session.json')]);
    return steps.drawOutline(context);
  } }, mergeSvg: workingMerger(events) });
  assert.deepEqual(events, ['a:outline', 'a:review']);
  assert.deepEqual(await snapshot(kept), before);
});

for (const checkpoint of ['[a] 组轮廓与自检：完成', '第 0 层轮廓去重：完成']) {
  test(`删 outline 后重画出不同稿并在 ${checkpoint} 中断：恢复只重跑字节变化的补全`, async t => {
    const f = await fixture(t), events: string[] = [];
    const steps = redrawn(workingSteps(events, [{ id: 'a' }, { id: 'b' }]), ['a']);
    await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
    const other = [artifactPath(f.directory, 'b', 'reduction'), artifactPath(f.directory, 'b', 'completion'), reportPath(f.directory, 'b', 'completion-check')];
    const before = await snapshot(other);
    await rm(artifactPath(f.directory, 'a', 'outline'));
    await assert.rejects(runLayering({ ...f, groups: null, steps, progress(message) {
      if (message === checkpoint) throw new Error('interrupt before new part');
    } }), /interrupt before new part/);
    events.length = 0;
    const result = await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
    assert.equal(result.status, 'completed');
    assert.ok(!events.some(event => event.endsWith(':outline')));
    assert.ok(events.includes('a:completion') && events.includes('a:check') && events.includes('merge'));
    assert.ok(!events.some(event => event.startsWith('b:')));
    assert.deepEqual(await snapshot(other), before);
    events.length = 0;
    await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
    assert.deepEqual(events, []);
  });
}

test('父稿变化后重新分析子组：保留的子组按新父稿重画，删除的子组撤下步骤目录和 part', async t => {
  const f = await fixture(t), events: string[] = [];
  const children: Record<string, { id: string; kind?: 'part' }[]> = { head: [{ id: 'head/eye', kind: 'part' }, { id: 'head/ear', kind: 'part' }] };
  const steps = redrawn(workingSteps(events, [{ id: 'head' }], children), ['head']);
  await runLayering({ ...f, groups: null, steps });
  const ear = [artifactPath(f.directory, 'head/ear', 'completion'), join(f.directory, groupStepId('head/ear', 'outline'))];
  for (const path of ear) await stat(path);
  children.head = [{ id: 'head/eye', kind: 'part' }];
  await rm(artifactPath(f.directory, 'head', 'outline'));
  events.length = 0;
  await runLayering({ ...f, groups: null, steps });
  assert.ok(events.includes('head:children') && events.includes('head/eye:outline') && events.includes('head/eye:completion'));
  for (const path of ear) await assert.rejects(stat(path), { code: 'ENOENT' });
  assert.deepEqual((await readJson(reportPath(f.directory, 'head', 'children'))).groups.map((group: { id: string }) => group.id), ['head/eye']);
  assert.ok(walkGroups((await GroupStore.open(f.directory)).snapshot().groups).every(({ group }) => group.steps.children.status === 'completed'));
});

test('只删除某件补全时重做该件补全与检查；原样重建后子组分析、其他部件和合并沿用', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
  await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
  const kept = [artifactPath(f.directory, 'b', 'completion'), reportPath(f.directory, 'b', 'completion-check'),
    artifactPath(f.directory, 'a', 'reduction'), join(f.directory, 'preview.svg')];
  const before = await snapshot(kept);
  await rm(artifactPath(f.directory, 'a', 'completion'));
  events.length = 0;
  await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
  assert.deepEqual(events, ['a:completion', 'a:check']);
  assert.deepEqual(await snapshot(kept), before);
});

test('复核中断后续跑沿用同一轮廓与复核记录，不重画也不重置返修次数', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  const report = { groupId: 'head', reviews: [{ verdict: 'revise', feedback: 'first', candidateHash: 'old' }] };
  await assert.rejects(runLayering({ ...f, groups: null, steps: { ...steps, async reviewOutline(context) {
    await writeAtomic(context.reportPath, JSON.stringify(report)); throw new Error('review interrupted');
  } } }), /review interrupted/);
  assert.equal((await readStep(join(f.directory, groupStepId('head', 'outline')), taskRootOf(f.directory))).status, 'running');
  events.length = 0;
  await runLayering({ ...f, groups: null, steps: { ...steps, async reviewOutline(context) {
    assert.deepEqual(await readJson(context.reportPath), report);
    return steps.reviewOutline(context);
  } } });
  assert.ok(!events.includes('head:outline'));
});

async function referencing(t: TestContext, source: string, from: string, sibling: string) {
  const prompts = await mkdtemp(join(tmpdir(), 'part-layering-prompts-'));
  t.after(() => rm(prompts, { recursive: true, force: true }));
  await cp(source, prompts, { recursive: true });
  await writeAtomic(join(prompts, 'groups', from, 'completion.references.json'), JSON.stringify([{ sibling }]));
  return prompts;
}

test('掌片去重稿变化只重跑引用它的补全，不重画引用者轮廓或无关部件', async t => {
  const f = await fixture(t), events: string[] = [];
  const profile = { ...f.profile, promptsDirectory: await referencing(t, f.profile.promptsDirectory, 'hand/finger', 'palm') };
  const steps = redrawn(workingSteps(events, [{ id: 'hand' }], { hand: ['palm', 'finger', 'ornament'].map(name => ({ id: `hand/${name}`, kind: 'part' as const })) }), ['hand/palm']);
  await runLayering({ ...f, profile, groups: null, steps });
  const ornament = [artifactPath(f.directory, 'hand/ornament', 'completion'), reportPath(f.directory, 'hand/ornament', 'completion-check')];
  const before = await snapshot(ornament);
  await rm(artifactPath(f.directory, 'hand/palm', 'outline'));
  events.length = 0;
  const result = await runLayering({ ...f, profile, groups: { id: 'hand/palm' }, steps });
  assert.equal(result.status, 'completed');
  assert.ok(events.includes('hand/palm:completion') && events.includes('hand/finger:completion'));
  assert.ok(!events.includes('hand/finger:outline') && !events.some(event => event.startsWith('hand/ornament:')));
  assert.deepEqual(await snapshot(ornament), before);
});

test('去重实际改变别件时只重跑变化的补全；未改变的去重结果保持，提交后中断也安全', async t => {
  const f = await fixture(t), events: string[] = [];
  const base = redrawn(workingSteps(events, ['a', 'b', 'd'].map(id => ({ id }))), ['a']);
  await runLayering({ ...f, groups: null, steps: { ...base, async reduceOutlines(context) {
    const entry = context.entries.find(entry => entry.group.id === 'd')!;
    await writeAtomic(entry.outputPath, shape('d', 20, 80));
    return { status: 'completed', output: { changed: [{ groupId: 'd', path: entry.outputPath }] } };
  } } });
  const preserved = [artifactPath(f.directory, 'd', 'reduction'), artifactPath(f.directory, 'd', 'completion'), reportPath(f.directory, 'd', 'completion-check')];
  const before = await snapshot(preserved);
  await rm(artifactPath(f.directory, 'a', 'outline'));
  await assert.rejects(runLayering({ ...f, groups: { id: 'a' }, steps: { ...base, async reduceOutlines(context) {
    // 轮廓未变的组把当前去重稿交给适配器参考。
    assert.equal(context.entries.find(entry => entry.group.id === 'd')!.current?.path, preserved[0]);
    assert.equal(context.entries.find(entry => entry.group.id === 'a')!.current, undefined);
    const entry = context.entries.find(entry => entry.group.id === 'b')!;
    await writeAtomic(entry.outputPath, shape('b', 20, 80));
    return { status: 'completed', output: { changed: [{ groupId: 'b', path: entry.outputPath }] } };
  } }, progress(message) { if (message === '第 0 层轮廓去重：完成') throw new Error('interrupt after changed reduction'); } }), /interrupt after changed reduction/);
  events.length = 0;
  await runLayering({ ...f, groups: null, steps: base });
  assert.ok(events.includes('a:completion') && events.includes('b:completion'));
  assert.ok(!events.some(event => event.startsWith('d:') || event.endsWith(':outline') || event.endsWith(':reduce')));
  assert.deepEqual(await snapshot(preserved), before);
});

for (const stage of ['outline', 'completion'] as const) {
  test(`${stage} 中断后续跑沿用草稿；重试删除步骤后从空草稿重画`, async t => {
    const f = await fixture(t), events: string[] = [];
    const steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
    const partial = Buffer.from(shape('a', 30, 70));
    const draw = stage === 'outline' ? 'drawOutline' : 'completeOcclusion';
    await assert.rejects(runLayering({ ...f, groups: null, mergeSvg: workingMerger(events), steps: { ...steps, async [draw](context: never) {
      const { group, outputPath, resumeDraft } = context as { group: { id: string }; outputPath: string; resumeDraft?: boolean };
      if (group.id !== 'a') return (steps[draw] as (c: never) => Promise<unknown>)(context);
      assert.equal(resumeDraft, false);
      await writeAtomic(outputPath, partial);
      throw new Error('interrupted while drawing');
    } } }), /interrupted while drawing/);
    const resumed: (boolean | undefined)[] = [];
    const resuming = { ...steps, async [draw](context: never) {
      const { group, outputPath, resumeDraft } = context as { group: { id: string }; outputPath: string; resumeDraft?: boolean };
      if (group.id === 'a') {
        resumed.push(resumeDraft);
        if (resumeDraft) assert.deepEqual(await readFile(outputPath), partial);
        else await missing([outputPath]);
      }
      return (steps[draw] as (c: never) => Promise<unknown>)(context);
    } };
    await runLayering({ ...f, groups: null, steps: resuming, mergeSvg: workingMerger(events) });
    assert.deepEqual(resumed, [true]);
    // 重试：删掉步骤目录（及补全草稿）后不再沿用。
    await rm(join(f.directory, groupStepId('a', stage)), { recursive: true });
    if (stage === 'completion') await rm(artifactPath(f.directory, 'a', 'completion'));
    await runLayering({ ...f, groups: null, steps: resuming, mergeSvg: workingMerger(events) });
    assert.deepEqual(resumed, [true, false]);
  });
}
