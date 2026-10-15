import assert from 'node:assert/strict';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { artifactPath, draftPath, readJson, reductionReportPath, reportPath, svgHash } from '../artifact-facts.ts';
import { GroupStore, normalizeGroups, walkGroups, writeAtomic } from '../groups.ts';
import { GroupExecutionError, runLayering } from '../layering.ts';
import { createLayeringSteps } from '../layering-steps.ts';
import { fixture, shape, workingMerger, workingSteps } from './layering-fixture.ts';

test('按层严格等待：所有 review 结束才去重，所有父组结束才开始下一层；层内保持并发', { timeout: 5000 }, async t => {
  const f = await fixture(t), events: string[] = [];
  const steps = workingSteps(events, [{ id: 'fast' }, { id: 'slow' }], { fast: [{ id: 'fast/child' }], slow: [{ id: 'slow/child' }] });
  const slowReview = Promise.withResolvers<void>(), reviewing = Promise.withResolvers<void>();
  const slowSplit = Promise.withResolvers<void>(), splitting = Promise.withResolvers<void>();
  const fastReviewed = Promise.withResolvers<void>();
  const run = runLayering({ ...f, groups: null, concurrency: 2, steps: { ...steps,
    async reviewOutline(context) { if (context.group.id === 'slow') { reviewing.resolve(); await slowReview.promise; }
      const result = await steps.reviewOutline(context); if (context.group.id === 'fast') fastReviewed.resolve(); return result; },
    async splitChildren(context) { if (context.group.id === 'slow') { splitting.resolve(); await slowSplit.promise; } return steps.splitChildren(context); },
  }, mergeSvg: workingMerger(events) });
  try {
    await Promise.all([reviewing.promise, fastReviewed.promise]);
    assert.ok(events.includes('fast:review'));
    assert.ok(!events.includes('layer-0:reduce'));
    assert.ok(!events.includes('fast:completion'));
    slowReview.resolve();
    await splitting.promise;
    assert.ok(events.includes('layer-0:reduce'));
    assert.ok(!events.some(event => event.includes('/child:')));
  } finally { slowReview.resolve(); slowSplit.resolve(); await run; }
  const result = await run;
  assert.equal(result.status, 'completed');
  assert.ok(events.indexOf('fast/child:outline') > events.indexOf('slow:children'));
  assert.ok(events.indexOf('layer-1:reduce') > events.indexOf('slow/child:review'));
  assert.ok(events.indexOf('fast:completion') > events.indexOf('layer-0:reduce'));
});

test('全部完成后仅凭事实文件恢复；旧 progress.json 即使损坏也不读取或覆盖', async t => {
  const f = await fixture(t), events: string[] = [];
  const steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }], { a: [{ id: 'a/eye' }] });
  await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
  await assert.rejects(readFile(join(f.directory, 'progress.json')), { code: 'ENOENT' });
  await writeAtomic(join(f.directory, 'progress.json'), '{legacy broken progress');
  events.length = 0;
  const result = await runLayering({ ...f, groups: null, steps, mergeSvg: workingMerger(events) });
  assert.equal(result.status, 'completed');
  assert.deepEqual(events, []);
  assert.equal(await readFile(join(f.directory, 'progress.json'), 'utf8'), '{legacy broken progress');
  const tree = await readJson(join(f.directory, 'groups.json'));
  assert.ok(!('steps' in tree.groups[0]) && !('merge' in tree));
});

test('去重修改组写到统一目录，未修改组字节一致；补形和自检都读取去重版', async t => {
  const f = await fixture(t), events: string[] = [];
  const steps = workingSteps(events, [{ id: 'hair' }, { id: 'accessories' }]);
  const reduced = shape('accessories', 20, 80);
  await runLayering({ ...f, groups: null, steps: { ...steps,
    async reduceOutlines(context) { const entry = context.entries.find(entry => entry.group.id === 'accessories')!;
      await writeAtomic(entry.outputPath, reduced); return { status: 'completed', output: { changed: [{ groupId: entry.group.id, path: entry.outputPath }] } }; },
    async completeOcclusion(context) { assert.match(context.reviewed.path, /outline-reduce/); return steps.completeOcclusion(context); },
    async checkCompletion(context) { assert.match(context.before.path, /outline-reduce/); return steps.checkCompletion(context); },
  } });
  assert.equal(await readFile(artifactPath(f.directory, 'accessories', 'outline'), 'utf8'), shape('accessories'));
  assert.equal(await readFile(artifactPath(f.directory, 'accessories', 'reduction'), 'utf8'), reduced);
  assert.deepEqual(await readFile(artifactPath(f.directory, 'hair', 'reduction')), await readFile(artifactPath(f.directory, 'hair', 'outline')));
});

test('只有 .draft.svg 不能跳过绘制；异常草稿不发布正式 SVG，重试仍能执行', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  await writeAtomic(draftPath(artifactPath(f.directory, 'head', 'outline')), shape('head', 30, 70));
  await assert.rejects(runLayering({ ...f, groups: null, steps: { ...steps, async drawOutline(context) {
    assert.ok(context.outputPath.endsWith('.draft.svg'));
    await writeAtomic(context.outputPath, shape('head')); throw new Error('interrupted');
  } } }), /interrupted/);
  await assert.rejects(readFile(artifactPath(f.directory, 'head', 'outline')), { code: 'ENOENT' });
  await runLayering({ ...f, groups: null, steps });
  assert.ok(events.includes('head:outline'));
});

test('所有绘制、去重、补形及最终合并接口只允许交付指定草稿路径', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  await assert.rejects(runLayering({ ...f, groups: null, steps: { ...steps, async drawOutline(context) {
    const other = join(f.directory, 'other.svg'); await writeAtomic(other, shape('head'));
    return { status: 'completed', output: { path: other } };
  } } }), /指定的 .draft.svg/);
  await runLayering({ ...f, groups: null, steps: { ...steps, async completeOcclusion(context) {
    assert.ok(context.outputPath.endsWith('.draft.svg')); return steps.completeOcclusion(context);
  } }, mergeSvg: async context => { assert.ok(context.outputPath.endsWith('character.draft.svg')); return workingMerger(events)(context); } });
  await assert.rejects(readFile(join(f.directory, 'character.draft.svg')), { code: 'ENOENT' });
});

test('去重输出没有整批提交记录或只有部分输出时，不消费它们，不提前补形', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
  await runLayering({ ...f, groups: null, steps: { ...steps, async reduceOutlines() { return { status: 'pending', message: 'waiting' }; } } });
  await writeAtomic(artifactPath(f.directory, 'a', 'reduction'), shape('a'));
  events.length = 0;
  await runLayering({ ...f, groups: null, steps });
  assert.equal(events[0], 'layer-0:reduce');
  assert.ok(events.includes('a:completion'));
  await rm(artifactPath(f.directory, 'b', 'reduction'));
  const state = (await GroupStore.open(f.directory)).snapshot();
  assert.ok(state.groups.every(group => group.steps.reduction.status === 'pending'));
});

test('源轮廓或去重输出变化会使批次失效；后续补形不能沿用旧输入版本', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
  await runLayering({ ...f, groups: null, steps });
  await writeAtomic(artifactPath(f.directory, 'a', 'reduction'), shape('a', 20, 80));
  const state = (await GroupStore.open(f.directory)).snapshot();
  assert.ok(state.groups.every(group => group.steps.reduction.status === 'pending' && group.steps.completion.status === 'pending'));
  events.length = 0;
  await runLayering({ ...f, groups: null, steps });
  assert.equal(events[0], 'layer-0:reduce');
});

test('补形中断只留下草稿；续跑从补形继续，不重做轮廓、review、去重', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  await assert.rejects(runLayering({ ...f, groups: null, steps: { ...steps, async completeOcclusion(context) {
    await writeAtomic(context.outputPath, shape(context.group.id)); throw new Error('completion interrupted');
  } } }), /completion interrupted/);
  await assert.rejects(readFile(artifactPath(f.directory, 'head', 'completion')), { code: 'ENOENT' });
  events.length = 0;
  await runLayering({ ...f, groups: null, steps });
  assert.deepEqual(events, ['head:completion', 'head:check', 'head:children']);
});

test('自检失败不分析子组；有效 SVG 不等于自检完成，续跑只重做自检及分析', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  await assert.rejects(runLayering({ ...f, groups: null, steps: { ...steps, async checkCompletion() {
    return { status: 'completed', output: { passed: false as true } };
  } } }), /completion check did not pass/);
  assert.ok(!events.includes('head:children'));
  const state = (await GroupStore.open(f.directory)).snapshot();
  assert.equal(state.groups[0].steps.completion.status, 'completed');
  assert.equal(state.groups[0].steps.completionCheck.status, 'pending');
  events.length = 0;
  await runLayering({ ...f, groups: null, steps });
  assert.deepEqual(events, ['head:check', 'head:children']);
});

test('分析返回空子组有明确事实记录，重启不会重复分析', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  await runLayering({ ...f, groups: null, steps });
  const children = await readJson(reportPath(f.directory, 'head', 'children'));
  assert.deepEqual(children.groups, []);
  assert.equal(typeof children.sourceHash, 'string');
  events.length = 0;
  await runLayering({ ...f, groups: null, steps });
  assert.deepEqual(events, []);
  await rm(reportPath(f.directory, 'head', 'children'));
  await runLayering({ ...f, groups: null, steps });
  assert.deepEqual(events, ['head:children']);
});

test('子组分析记录已保存但分组树未落盘时，从分析结果恢复树和下一层', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'head' }], { head: [{ id: 'head/eye' }] });
  await runLayering({ ...f, groups: null, steps, maxDepth: 1 });
  const tree = await readJson(join(f.directory, 'groups.json'));
  tree.groups[0].groups = [];
  await writeAtomic(join(f.directory, 'groups.json'), JSON.stringify(tree));
  events.length = 0;
  const result = await runLayering({ ...f, groups: null, steps });
  assert.deepEqual(result.groups[0].groups.map(group => group.id), ['head/eye']);
  assert.ok(!events.includes('head:children'));
  assert.ok(events.includes('head/eye:outline'));
});

test('blocked 或 pending 阻止整层去重及下一层，其他已启动轮廓可收尾', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
  const result = await runLayering({ ...f, groups: null, steps: { ...steps, async reviewOutline(context) {
    return context.group.id === 'b' ? { status: 'pending', message: 'blocked' } : steps.reviewOutline(context);
  } } });
  assert.equal(result.status, 'pending');
  assert.ok(!events.includes('layer-0:reduce') && !events.some(event => event.includes(':completion')));
});

test('去重清空整个组时保留空 SVG，跳过该组补形和分析模型，仍可稳定续跑', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
  const reducer = async (context: Parameters<NonNullable<typeof steps.reduceOutlines>>[0]) => {
    const entry = context.entries.find(entry => entry.group.id === 'b')!;
    await writeAtomic(entry.outputPath, shape('b', 10, 90, true));
    return { status: 'completed' as const, output: { changed: [{ groupId: 'b', path: entry.outputPath }] } };
  };
  await runLayering({ ...f, groups: null, steps: { ...steps, reduceOutlines: reducer } });
  assert.ok(!events.some(event => /^b:(completion|check|children)$/.test(event)));
  const state = (await GroupStore.open(f.directory)).snapshot();
  assert.equal(state.groups[1].steps.children.status, 'completed');
});

test('显式分支复用已有整层去重，不启动其他分支；未齐备批次不能悄悄重做别的组', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
  await runLayering({ ...f, groups: null, steps: { ...steps, async completeOcclusion() { return { status: 'pending', message: 'not implemented' }; } } });
  events.length = 0;
  await runLayering({ ...f, groups: { id: 'a' }, steps });
  assert.deepEqual(events, ['a:completion', 'a:check', 'a:children']);
  await rm(reductionReportPath(f.directory, 0));
  events.length = 0;
  await assert.rejects(runLayering({ ...f, groups: { id: 'a' }, steps }), /整层去重/);
  assert.deepEqual(events, []);
});

test('指定子组仍需完整祖先；禁止未知组、空选择、错误父子关系及导入外部进度', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  await runLayering({ ...f, groups: null, steps: { ...steps, async completeOcclusion() { return { status: 'pending', message: 'waiting' }; } } });
  events.length = 0;
  for (const groups of [[], { id: 'unknown' }]) await assert.rejects(runLayering({ ...f, groups, steps }));
  await runLayering({ ...f, groups: { id: 'head', note: 'external', steps: { completion: { status: 'completed', output: { path: 'missing.svg' } } } }, steps });
  assert.ok(events.includes('head:completion'));
  assert.notEqual((await GroupStore.open(f.directory)).snapshot().groups[0].note, 'external');
});

test('旧树混入 steps 不代表完成；损坏的事实文件会拒绝续跑', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  await writeAtomic(join(f.directory, 'groups.json'), JSON.stringify({ groups: [{ id: 'head', steps: {
    outline: { status: 'completed', output: { path: '/old/machine/head.svg' } },
  } }], merge: { status: 'completed' } }));
  await runLayering({ ...f, groups: null, steps });
  assert.ok(events.includes('head:outline'));
  await writeAtomic(reportPath(f.directory, 'head', 'review'), '{broken');
  await assert.rejects(runLayering({ ...f, groups: null, steps }), /JSON/);
});

test('LF 审查哈希在 CRLF 签出中可恢复，返修记录也无需依赖 .repairs 目录数量', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events);
  const text = shape('head').replace('><g', '>\n<g');
  await writeAtomic(join(f.directory, 'groups.json'), '{"groups":[{"id":"head"}]}');
  await writeAtomic(artifactPath(f.directory, 'head', 'outline'), text.replace(/\n/g, '\r\n'));
  await writeAtomic(reportPath(f.directory, 'head', 'review'), JSON.stringify({ groupId: 'head', reviews: [
    { verdict: 'revise', feedback: 'first', candidateHash: 'old' },
    { verdict: 'revise', feedback: 'second', candidateHash: 'previous', repairedCandidateHash: svgHash(text) },
  ] }));
  await runLayering({ ...f, groups: null, steps });
  assert.ok(!events.includes('head:outline') && !events.includes('head:review'));
  assert.equal((await GroupStore.open(f.directory)).snapshot().groups[0].steps.review.output!.reviewOutcome, 'repaired');
});

test('异常停止新派发，已启动任务收尾；事实源保留已成功组', { timeout: 5000 }, async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  const release = Promise.withResolvers<void>(), failed = Promise.withResolvers<void>();
  const run = runLayering({ ...f, groups: null, concurrency: 2, steps: { ...steps, async drawOutline(context) {
    if (context.group.id === 'a') { failed.resolve(); throw new Error('failed draw'); }
    await release.promise; return steps.drawOutline(context);
  } } });
  const rejection = assert.rejects(run, error => error instanceof GroupExecutionError && error.groupId === 'a');
  await failed.promise;
  release.resolve(); await rejection;
  assert.ok(!events.includes('c:outline'));
  assert.ok(await readFile(artifactPath(f.directory, 'b', 'outline')));
});

test('当前真实 test 采用标准目录，8 根组及最新 hair 完成事实可跨机器恢复', async () => {
  const directory = new URL('../.run/test/', import.meta.url);
  const store = await GroupStore.open(fileURLToPath(directory));
  const groups = store.snapshot().groups;
  assert.equal(groups.length, 8);
  assert.ok(groups.every(group => group.steps.outline.status === 'completed' && group.steps.review.status === 'completed'));
  assert.equal(groups.find(group => group.id === 'arms')!.steps.review.output!.reviewOutcome, 'repaired');
  const hair = walkGroups([groups.find(group => group.id === 'hair')!]);
  assert.equal(hair.length, 10);
  assert.equal(hair.filter(({ group }) => group.kind === 'part').length, 8);
  assert.ok(hair.every(({ group }) => Object.values(group.steps).every(step => step.status === 'completed')));
  assert.equal(await readJson(join(fileURLToPath(directory), 'progress.json')), undefined);
  await assert.rejects(readFile(new URL('hair-latest/groups.json', directory)), { code: 'ENOENT' });
});

test('显式选第二层也不能绕过第一层未完成的其他分支', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }], { a: [{ id: 'a/child' }] });
  await runLayering({ ...f, groups: null, steps: { ...steps, async completeOcclusion(context) {
    return context.group.id === 'b' ? { status: 'pending', message: 'waiting' } : steps.completeOcclusion(context);
  } } });
  events.length = 0;
  await assert.rejects(runLayering({ ...f, groups: { id: 'a/child' }, steps }), /前层尚未全部完成/);
  assert.deepEqual(events, []);
});

test('自定义去重适配器的错组草稿也会拒绝发布，不覆盖正式文件', async t => {
  const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'a' }, { id: 'b' }]);
  await assert.rejects(runLayering({ ...f, groups: null, steps: { ...steps, async reduceOutlines(context) {
    const entry = context.entries[0]; await writeAtomic(entry.outputPath, shape('wrong_group'));
    return { status: 'completed', output: { changed: [{ groupId: entry.group.id, path: entry.outputPath }] } };
  } } }), /绑定当前组/);
  await assert.rejects(readFile(artifactPath(f.directory, 'a', 'reduction')), { code: 'ENOENT' });
});
