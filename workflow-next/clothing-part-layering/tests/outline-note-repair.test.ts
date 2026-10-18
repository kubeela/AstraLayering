import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import type { AgentTask } from '../agents.ts';
import { findGroup, GroupStore, normalizeGroups, writeAtomic } from '../groups.ts';
import { drawGroupOutline, reviewGroupOutline } from '../outline-agent.ts';
import { fixture, shape } from './layering-fixture.ts';

const signal = new AbortController().signal;
const inputs = (task: AgentTask) => JSON.parse(task.prompt.match(/【本次输入】\n([\s\S]*?\n})\n/)![1]);
const tool = (task: AgentTask, name: string) => task.tools!.find(item => item.name === name)!;

async function noteFixture(t: TestContext, note: string) {
  const f = await fixture(t), store = await GroupStore.open(f.directory);
  await store.update(document => { document.groups = normalizeGroups([
    { id: 'band', kind: 'group', name: 'band', note },
    { id: 'tail', kind: 'part', name: 'tail', note: '独立长幅', metadata: { preserved: true } },
  ]); });
  const candidate = join(f.directory, 'stages/outline/band.svg');
  await writeAtomic(candidate, shape('band'));
  return { ...f, store, group: findGroup(store.snapshot(), 'band'), outline: { path: candidate },
    outputPath: candidate, reportPath: join(f.directory, 'stages/review/band.review.json') };
}

test('note-only feedback is persisted and visible to the next reviewer without changing correct geometry', async t => {
  const before = '束带随腰运动。前结及长幅根部位于前带之前。保留隐藏搭接。';
  const replacement = '前结在前带之前，长幅根部在前带之后';
  const after = before.replace('前结及长幅根部位于前带之前', replacement);
  const f = await noteFixture(t, before), svg = await readFile(f.outline.path);
  const originalSibling = JSON.parse(await readFile(f.store.path, 'utf8')).groups[1];
  let reviews = 0, repairs = 0;
  const result = await reviewGroupOutline(f, { async run(task) {
    const input = inputs(task);
    assert.ok(!task.tools!.some(item => item.name === 'update_group_note'));
    assert.equal(input.group.note, reviews ? after : before);
    await tool(task, 'preview_svg').execute({ path: input.candidate, mode: 'blend' }, signal);
    await tool(task, 'submit_review').execute({ verdict: reviews++ ? 'pass' : 'revise',
      feedback: '只修正 note 的长幅根部层序；轮廓正确，保持不变。' }, signal);
    return { text: 'reviewed', images: [] };
  } }, { async run(task) {
    repairs++;
    await tool(task, 'update_group_note').execute({ oldText: '前结及长幅根部位于前带之前', newText: replacement }, signal);
    await tool(task, 'preview_svg').execute({ path: inputs(task).outputSvg, mode: 'blend' }, signal);
    return { text: 'note repaired', images: [] };
  } });
  assert.equal(result.status, 'completed');
  assert.equal(reviews, 2);
  assert.equal(repairs, 1);
  assert.equal(findGroup((await GroupStore.open(f.directory)).snapshot(), 'band').note, after);
  assert.deepEqual(JSON.parse(await readFile(f.store.path, 'utf8')).groups[1], originalSibling);
  assert.deepEqual(await readFile(f.outline.path), svg);
});

test('note repair is bound to one group, requires a unique match and preserves concurrent updates', async t => {
  const f = await noteFixture(t, '重复；重复；原层序');
  await drawGroupOutline(f, { async run(task) {
    const update = tool(task, 'update_group_note');
    await assert.rejects(update.execute({ oldText: '原层序', newText: '新层序', groupId: 'tail' }, signal), /仅提交/);
    await assert.rejects(update.execute({ oldText: '重复', newText: '新说明' }, signal), /唯一匹配/);
    await assert.rejects(update.execute({ oldText: '不存在', newText: '新说明' }, signal), /唯一匹配/);
    await assert.rejects(update.execute({ oldText: '原层序', newText: ' ' }, signal), /非空/);
    await f.store.update(document => { findGroup(document, 'tail').note = '另一组的并发更新'; });
    await update.execute({ oldText: '原层序', newText: '新层序' }, signal);
    assert.equal(findGroup(f.store.snapshot(), 'tail').note, '另一组的并发更新');
    await f.store.update(document => { findGroup(document, 'band').note = '本组已被其他调用更新'; });
    await assert.rejects(update.execute({ oldText: '新层序', newText: '覆盖修改' }, signal), /已变化/);
    assert.equal(findGroup(f.store.snapshot(), 'band').note, '本组已被其他调用更新');
    await tool(task, 'preview_svg').execute({ path: inputs(task).outputSvg, mode: 'blend' }, signal);
    return { text: 'checked', images: [] };
  } }, { candidate: f.outline.path, feedback: '修正层序说明' });
  const saved = JSON.parse(await readFile(f.store.path, 'utf8'));
  assert.equal(saved.groups[0].note, '本组已被其他调用更新');
  assert.equal(saved.groups[1].note, '另一组的并发更新');
  assert.deepEqual(saved.groups.map((group: { id: string; kind: string }) => [group.id, group.kind]),
    [['band', 'group'], ['tail', 'part']]);
});

test('initial outline drawing does not receive the group-note repair tool', async t => {
  const f = await noteFixture(t, '原说明');
  await drawGroupOutline(f, { async run(task) {
    assert.ok(!task.tools!.some(item => item.name === 'update_group_note'));
    await tool(task, 'write_outline_svg').execute({ svg: shape('band') }, signal);
    await tool(task, 'preview_svg').execute({ path: inputs(task).outputSvg, mode: 'blend' }, signal);
    return { text: 'drawn', images: [] };
  } });
  assert.equal(findGroup(f.store.snapshot(), 'band').note, '原说明');
});
