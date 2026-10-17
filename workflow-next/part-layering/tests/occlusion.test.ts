import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { artifactPath, readJson } from '../artifact-facts.ts';
import { GroupStore, writeAtomic } from '../groups.ts';
import { runLayering } from '../layering.ts';
import type { OcclusionContext } from '../layering-types.ts';
import { planPartOcclusion } from '../occlusion-agent.ts';
import { occlusionPath, occlusionSourceHash, restoreOcclusionPlan, validateOcclusionPlan } from '../occlusion-plan.ts';
import { fixture, workingMerger, workingSteps } from './layering-fixture.ts';

const signal = new AbortController().signal;
async function prepared(t: Parameters<typeof fixture>[0]) {
  const f = await fixture(t), events: string[] = [];
  const steps = workingSteps(events, [{ id: 'head' }, { id: 'neck' }], { head: [{ id: 'head/face', kind: 'part' }, { id: 'head/eye', kind: 'part' }] });
  await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
  const document = (await GroupStore.open(f.directory)).snapshot();
  const context: OcclusionContext = { ...f, groups: document.groups, preview: document.merge.output! };
  return { ...f, steps, events, context };
}

test('独立深度表覆盖全部终止节点，拒绝重复、非法深度、漏检、旧版本和局部规则', async t => {
  const f = await prepared(t), plan = (await restoreOcclusionPlan(f.context))!;
  assert.deepEqual(plan.layers.map(row => row.id), ['head/face', 'head/eye', 'neck']);
  const hash = await occlusionSourceHash(f.context);
  for (const change of [
    (p: typeof plan) => p.layers.pop(),
    (p: typeof plan) => { p.layers[1].id = p.layers[0].id; },
    (p: typeof plan) => { p.layers[0].id = 'head'; },
    (p: typeof plan) => { p.layers[0].level = 2; },
    (p: typeof plan) => { p.layers[0].check.note = ''; },
    (p: typeof plan) => { Object.assign(p, { version: 1 }); },
    (p: typeof plan) => { Object.assign(p.layers[0], { localOcclusions: [] }); },
    (p: typeof plan) => { Object.assign(p.layers[0], { occludedBy: [] }); },
    (p: typeof plan) => { Object.assign(p.layers[0], { visibility: 'visible' }); },
  ]) {
    const bad = structuredClone(plan); change(bad);
    assert.throws(() => validateOcclusionPlan(bad, f.context, hash));
  }
  const tree = await readJson(join(f.directory, 'groups.json'));
  assert.equal(tree.occlusion, undefined);
  assert.equal(tree.layers, undefined);
});

test('最后一步在 preview 后执行；缺失、损坏、漏检或语义变化只重跑层级，不重做上游', async t => {
  const f = await prepared(t), previewBefore = await readFile(f.context.preview.path), treePath = join(f.directory, 'groups.json');
  const treeBefore = await readFile(treePath);
  let calls = 0;
  const steps = { ...f.steps, async planOcclusion(context: OcclusionContext) {
    calls++;
    assert.deepEqual(await readFile(context.preview.path), previewBefore);
    return f.steps.planOcclusion!(context);
  } };
  f.events.length = 0;
  await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(f.events) });
  assert.equal(calls, 0);
  for (const invalid of ['missing', '{broken', JSON.stringify({ version: 1, layers: [] })]) {
    if (invalid === 'missing') await rm(occlusionPath(f.directory));
    else await writeAtomic(occlusionPath(f.directory), invalid);
    assert.equal((await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(f.events) })).status, 'completed');
  }
  assert.equal(calls, 3);
  assert.deepEqual(f.events, []);
  assert.deepEqual(await readFile(treePath), treeBefore);
  const tree = JSON.parse(treeBefore.toString()); tree.groups[0].note = 'changed semantic responsibility';
  await writeAtomic(treePath, JSON.stringify(tree));
  await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(f.events) });
  assert.equal(calls, 4);
  assert.deepEqual(f.events, []);
  const original = await readFile(f.references.baseSubject);
  await writeAtomic(f.references.baseSubject, Buffer.concat([original, Buffer.from('\n')]));
  await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(f.events) });
  assert.equal(calls, 5);
  assert.deepEqual(f.events, []);
});

test('已合并而最后一步待办、失败或中断时不冒充完成，恢复只执行最后一步', async t => {
  const f = await prepared(t);
  await rm(occlusionPath(f.directory)); f.events.length = 0;
  const pending = await runLayering({ ...f, groups: null, steps: { ...f.steps,
    async planOcclusion() { return { status: 'pending', message: 'head/face 深度待确认' }; } } });
  assert.equal(pending.status, 'pending');
  assert.equal(pending.output, f.context.preview.path);
  assert.equal(pending.occlusionPath, undefined);
  await assert.rejects(runLayering({ ...f, groups: null, steps: { ...f.steps,
    async planOcclusion() { throw new Error('interrupted'); } } }), /interrupted/);
  assert.equal(await readJson(occlusionPath(f.directory)), undefined);
  const done = await runLayering({ ...f, groups: null, steps: f.steps });
  assert.equal(done.status, 'completed');
  assert.equal(done.occlusionPath, occlusionPath(f.directory));
  assert.deepEqual(f.events, []);
});

test('真实适配器强制候选后逐件独显/叠加检查，修订清空检查，保留跨 group 层序', async t => {
  const f = await prepared(t), ids = ['neck', 'head/face', 'head/eye'];
  const sourceBefore = await readFile(artifactPath(f.directory, ids[1], 'completion'));
  const result = await planPartOcclusion(f.context, { async run(task) {
    assert.equal(task.imageGeneration, false);
    assert.equal(task.sandboxMode, 'read-only');
    const tool = (name: string) => task.tools!.find(tool => tool.name === name)!;
    const preview = tool('preview_svg'), propose = tool('propose_occlusion'), check = tool('check_occlusion_part'), submit = tool('submit_occlusion');
    const layers = ids.map(id => ({ id, note: '依原图确认整件固定深度' }));
    await assert.rejects(propose.execute({ layers }, signal), /须查看/);
    await preview.execute({ path: f.context.preview.path, mode: 'blend' }, signal);
    await propose.execute({ layers }, signal);
    await assert.rejects(submit.execute({}, signal), /未检查/);
    await assert.rejects(check.execute({ id: ids[0], note: 'checked' }, signal), /须先查看/);
    const candidate = join(f.directory, 'stages/occlusion/candidate.svg');
    await preview.execute({ path: candidate, mode: 'blend' }, signal);
    for (const id of ids) {
      await preview.execute({ path: artifactPath(f.directory, id, 'completion'), mode: 'svg' }, signal);
      await preview.execute({ path: artifactPath(f.directory, id, 'completion'), mode: 'blend' }, signal);
      await preview.execute({ path: artifactPath(f.directory, id, 'reduction'), mode: 'blend' }, signal);
      await check.execute({ id, note: `${id} 的整体固定深度已核对` }, signal);
    }
    await propose.execute({ layers }, signal);
    await assert.rejects(submit.execute({}, signal), /未检查/);
    await preview.execute({ path: candidate, mode: 'blend' }, signal);
    for (const id of ids) {
      for (const mode of ['svg', 'blend']) await preview.execute({ path: artifactPath(f.directory, id, 'completion'), mode }, signal);
      await preview.execute({ path: artifactPath(f.directory, id, 'reduction'), mode: 'blend' }, signal);
      await check.execute({ id, note: '重新核对' }, signal);
    }
    await submit.execute({}, signal);
    return { text: 'done', images: [] };
  } });
  assert.equal(result.status, 'completed');
  if (result.status === 'completed') assert.deepEqual(result.output.layers.map(row => row.id), ids);
  assert.deepEqual(await readFile(artifactPath(f.directory, ids[1], 'completion')), sourceBefore);
});

test('真实适配器无法确认整件深度时交接依据并保留待办', async t => {
  const f = await prepared(t);
  const result = await planPartOcclusion(f.context, { async run(task) {
    await task.tools!.find(tool => tool.name === 'report_occlusion_problem')!.execute({ message: '当前参考无法辨认 head/face 与 neck 的前后关系，需核实对应部件' }, signal);
    return { text: 'pending', images: [] };
  } });
  assert.equal(result.status, 'pending');
});
