import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { GroupStore, groupCompleted, normalizeGroups, walkGroups } from '../groups.ts';
import { GroupExecutionError, runLayering } from '../layering.ts';
import { createLayeringSteps, mergeSvgPlaceholder } from '../layering-steps.ts';
import { readGroupInput } from '../run.ts';
import type { DrawingContext, GroupInput, GroupSeed, GroupsDocument, LayeringSteps, SvgArtifact, SvgMerger } from '../layering-types.ts';
import type { PreparationReferences } from '../preparation.ts';

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'part-layering-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const references: PreparationReferences = {
    directory: join(directory, 'references'), judgment: join(directory, 'references/judgment.json'),
    simplifiedSubject: join(directory, 'references/simplified.png'), baseSubject: join(directory, 'references/base.png'),
  };
  await mkdir(references.directory);
  await writeFile(references.judgment, JSON.stringify({ needsSimplification: false }));
  await writeFile(references.simplifiedSubject, 'cached reference');
  await writeFile(references.baseSubject, 'cached base');
  return { directory, references };
}

async function seed(directory: string, groups: GroupInput[]) {
  const store = await GroupStore.open(directory);
  await store.update(document => { document.groups = normalizeGroups(groups); });
  return store;
}

async function draw(context: DrawingContext): Promise<SvgArtifact> {
  await writeFile(context.outputPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0H20V20H0Z"/></svg>');
  return { path: context.outputPath };
}

function workingSteps(calls: string[], roots: GroupSeed[], children: Record<string, GroupSeed[]> = {}): LayeringSteps {
  return {
    async initialGroups() { calls.push('initial'); return { status: 'completed', output: { groups: roots } }; },
    async drawOutline(context) {
      calls.push(`${context.group.id}:outline`);
      if (context.parent) assert.ok(groupCompleted(context.parent));
      return { status: 'completed', output: await draw(context) };
    },
    async reviewOutline(context) {
      calls.push(`${context.group.id}:review`);
      assert.match(await readFile(context.outline.path, 'utf8'), /<svg/);
      assert.equal(context.reportPath, join(context.directory, 'stages/review', `${context.group.id}.review.json`));
      assert.ok(!('outputPath' in context));
      return { status: 'completed', output: context.outline };
    },
    async completeOcclusion(context) {
      calls.push(`${context.group.id}:completion`);
      assert.equal(context.reviewed.path, context.group.steps.outline.output!.path);
      assert.match(await readFile(context.reviewed.path, 'utf8'), /<svg/);
      return { status: 'completed', output: await draw(context) };
    },
    async checkCompletion(context) {
      calls.push(`${context.group.id}:check`);
      assert.notEqual(context.before.path, context.after.path);
      return { status: 'completed', output: { passed: true } };
    },
    async splitChildren(context) {
      calls.push(`${context.group.id}:children`);
      assert.match(await readFile(context.completed.path, 'utf8'), /<svg/);
      return { status: 'completed', output: { groups: children[context.group.id] ?? [] } };
    },
  };
}

function workingMerger(calls: string[]): SvgMerger {
  return async context => {
    calls.push('merge');
    assert.ok(walkGroups(context.groups).every(entry => groupCompleted(entry.group)));
    assert.equal(context.parts.length, walkGroups(context.groups).length);
    for (const part of context.parts) assert.match(await readFile(part.svg.path, 'utf8'), /<svg/);
    await writeFile(context.outputPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"/>');
    return { status: 'completed', output: { path: context.outputPath } };
  };
}

const forbiddenSteps: LayeringSteps = {
  initialGroups: async () => assert.fail('首次分组不应重复'),
  drawOutline: async () => assert.fail('轮廓不应重复'),
  reviewOutline: async () => assert.fail('review 不应重复'),
  completeOcclusion: async () => assert.fail('补形不应重复'),
  checkCompletion: async () => assert.fail('自检不应重复'),
  splitChildren: async () => assert.fail('拆分不应重复'),
};

async function saved(directory: string): Promise<GroupsDocument> {
  return (await GroupStore.open(directory)).snapshot();
}

test('已完成轮廓与 review 后停在补形占位，不调用模型、不误标完成', async t => {
  const input = await fixture(t);
  const path = join(input.directory, 'cached.svg');
  await writeFile(path, '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await seed(input.directory, [{ id: 'head', steps: {
    outline: { status: 'completed', output: { path } }, review: { status: 'completed', output: { path } },
  } }]);
  const steps = createLayeringSteps({ async run() { return assert.fail('占位符不应调用模型'); } });
  const result = await runLayering({ ...input, groups: [{ id: 'head' }], steps });
  assert.equal(result.status, 'pending');
  const state = await saved(input.directory);
  assert.ok(!('initial' in state));
  assert.equal(state.groups.length, 1);
  assert.equal(state.groups[0].steps.review.status, 'completed');
  assert.equal(state.groups[0].steps.completion.status, 'pending');
  assert.match(state.groups[0].steps.completion.message!, /待接入/);
  assert.equal(state.merge.status, 'pending');
});

test('首次分组、五个组步骤、子组循环与合并串联，null 续跑全部跳过', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const result = await runLayering({
    ...input, groups: null, concurrency: 2,
    steps: workingSteps(calls, [{ id: 'head' }, { id: 'body' }], { head: [{ id: 'head/face' }] }),
    mergeSvg: workingMerger(calls),
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.output, join(input.directory, 'character.svg'));
  assert.equal(calls[0], 'initial');
  assert.equal(calls.at(-1), 'merge');
  for (const id of ['head', 'body', 'head/face']) {
    assert.deepEqual(calls.filter(call => call.startsWith(`${id}:`)), [
      `${id}:outline`, `${id}:review`, `${id}:completion`, `${id}:check`, `${id}:children`,
    ]);
  }
  assert.ok(calls.indexOf('head:children') < calls.indexOf('head/face:outline'));
  const state = await saved(input.directory);
  assert.deepEqual(state.groups.map(group => group.id), ['head', 'body']);
  assert.deepEqual(state.groups[0].steps.children.output!.ids, ['head/face']);
  assert.equal(walkGroups(state.groups).length, 3);
  assert.ok(walkGroups(state.groups).every(entry => groupCompleted(entry.group)));
  const allPaths = walkGroups(state.groups).flatMap(({ group }) =>
    ['outline', 'review', 'completion'].map(stage => group.steps[stage as 'outline'].output!.path));
  assert.equal(new Set(allPaths).size, 6);
  assert.equal(state.groups[0].steps.completion.output!.path, join(input.directory, 'parts/head.svg'));
  assert.equal(state.groups[0].groups[0].steps.completion.output!.path, join(input.directory, 'parts/head/face.svg'));
  assert.equal(state.groups[0].steps.outline.output!.path, join(input.directory, 'stages/outline/head.svg'));
  for (const { group } of walkGroups(state.groups)) {
    assert.equal(group.steps.review.output!.path, group.steps.outline.output!.path);
    await assert.rejects(readFile(join(input.directory, 'stages/review', `${group.id}.svg`)), { code: 'ENOENT' });
  }
  const tree = JSON.parse(await readFile(result.groupsPath, 'utf8'));
  assert.deepEqual(Object.keys(tree), ['groups']);
  assert.ok(tree.groups.every((group: Record<string, unknown>) => !('steps' in group)));
  const progress = JSON.parse(await readFile(result.statePath, 'utf8'));
  assert.ok(!('initial' in progress));
  assert.equal(progress.groups['head/face'].completion.status, 'completed');

  const resumed = await runLayering({
    ...input, groups: null, steps: forbiddenSteps,
    mergeSvg: async () => assert.fail('合并不应重复'),
  });
  assert.equal(resumed.status, 'completed');
  assert.equal(resumed.output, result.output);

  // 缺少进度的同 ID 输入不能重置磁盘中的完成记录或已发现子组。
  const supplied = await runLayering({
    ...input, groups: [{ id: 'head' }, { id: 'body' }], steps: forbiddenSteps,
    mergeSvg: async () => assert.fail('合并不应重复'),
  });
  assert.equal(supplied.status, 'completed');
  assert.equal(supplied.groups[0].groups[0].id, 'head/face');
});

test('review 失败保存已完成轮廓，null 续跑从失败步骤继续', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'head' }]);
  await assert.rejects(runLayering({ ...input, groups: null, steps: {
    ...steps, async reviewOutline() { calls.push('head:review-failed'); throw new Error('review 测试失败'); },
  } }), error => {
    assert.ok(error instanceof GroupExecutionError);
    assert.equal(error.groupId, 'head');
    assert.equal(error.stage, 'review');
    assert.match(error.message, /\[head\].*review.*review 测试失败/);
    assert.equal(error.groups[0].steps.review.status, 'failed');
    assert.equal(error.statePath, join(input.directory, 'progress.json'));
    return true;
  });
  const partial = await saved(input.directory);
  assert.deepEqual(partial.groups.map(group => group.id), ['head']);
  assert.equal(partial.groups[0].steps.outline.status, 'completed');
  assert.equal(partial.groups[0].steps.review.status, 'failed');
  assert.equal(partial.groups[0].steps.completion.status, 'pending');
  calls.length = 0;
  const result = await runLayering({ ...input, groups: null, steps, mergeSvg: workingMerger(calls) });
  assert.equal(result.status, 'completed');
  assert.deepEqual(calls, ['head:review', 'head:completion', 'head:check', 'head:children', 'merge']);
});

test('review 只能登记原轮廓路径，返回新 SVG 时拒绝放行和复制', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'head' }]);
  await assert.rejects(runLayering({ ...input, groups: null, steps: {
    ...steps, async reviewOutline(context) {
      return { status: 'completed', output: { path: join(context.directory, 'review-copy.svg') } };
    },
  } }), /review 只能引用当前组的轮廓 SVG/);
  const state = await saved(input.directory);
  assert.equal(state.groups[0].steps.outline.status, 'completed');
  assert.equal(state.groups[0].steps.review.status, 'failed');
  assert.equal(state.groups[0].steps.completion.status, 'pending');
  await assert.rejects(readFile(join(input.directory, 'stages/review/head.svg')), { code: 'ENOENT' });
});

test('深度限制留下子组待办，父组完成后续跑只处理子组', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'head' }], { head: [{ id: 'head/face' }] });
  const partial = await runLayering({
    ...input, groups: null, steps, maxDepth: 1,
    mergeSvg: async () => assert.fail('子组未完成时不能合并'),
  });
  assert.equal(partial.status, 'pending');
  assert.ok(groupCompleted(partial.groups[0]));
  assert.equal(partial.groups[0].groups[0].steps.outline.status, 'pending');
  calls.length = 0;
  const complete = await runLayering({ ...input, groups: null, steps, mergeSvg: workingMerger(calls) });
  assert.equal(complete.status, 'completed');
  assert.deepEqual(calls, [
    'head/face:outline', 'head/face:review', 'head/face:completion', 'head/face:check', 'head/face:children', 'merge',
  ]);
});

test('null 调度中父组完成就执行子组，其他根组待接入不阻塞；续跑只处理剩余分支', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'face' }, { id: 'hair' }], { face: [{ id: 'face/eye' }] });
  const partial = await runLayering({ ...input, groups: null, concurrency: 2,
    steps: { ...steps, async reviewOutline(context) {
      if (context.group.id === 'hair') {
        calls.push('hair:review-pending');
        return { status: 'pending', message: '等待接入' };
      }
      return steps.reviewOutline(context);
    } },
    mergeSvg: async () => assert.fail('第一层未完成时不能合并'),
  });
  assert.equal(partial.status, 'pending');
  const state = await saved(input.directory);
  assert.ok(groupCompleted(state.groups[0]));
  assert.equal(state.groups[1].steps.review.status, 'pending');
  assert.ok(groupCompleted(state.groups[0].groups[0]));
  assert.equal(calls.includes('face/eye:outline'), true);
  const progress = JSON.parse(await readFile(partial.statePath, 'utf8'));
  assert.equal(progress.groups.hair.review.status, 'pending');
  assert.equal(progress.groups['face/eye'].outline.status, 'completed');

  calls.length = 0;
  const complete = await runLayering({ ...input, groups: null, steps, mergeSvg: workingMerger(calls) });
  assert.equal(complete.status, 'completed');
  assert.deepEqual(calls, [
    'hair:review', 'hair:completion', 'hair:check', 'hair:children',
    'merge',
  ]);
});

test('父组完成后子组使用空余并发位置，其他根组仍在运行时也能启动', { timeout: 5000 }, async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'face' }, { id: 'hair' }], { face: [{ id: 'face/eye' }] });
  const slow = Promise.withResolvers<void>();
  const eyeStarted = Promise.withResolvers<void>();
  const workflow = runLayering({ ...input, groups: null, concurrency: 2, mergeSvg: workingMerger(calls),
    steps: { ...steps, async drawOutline(context) {
      if (context.group.id === 'hair') await slow.promise;
      if (context.group.id === 'face/eye') eyeStarted.resolve();
      return steps.drawOutline(context);
    } },
  });
  try {
    await eyeStarted.promise;
    const state = await saved(input.directory);
    assert.ok(groupCompleted(state.groups[0]));
    // GroupStore.open 会恢复 running，直接读磁盘确认 hair 仍在绘制。
    const progress = JSON.parse(await readFile(join(input.directory, 'progress.json'), 'utf8'));
    assert.equal(progress.groups.hair.outline.status, 'running');
  } finally { slow.resolve(); }
  assert.equal((await workflow).status, 'completed');
});

for (const concurrency of [undefined, 2]) {
  test(`完整组循环并发 ${concurrency ?? 5}，并发登记子组不丢进度`, { timeout: 10_000 }, async t => {
    const input = await fixture(t);
    const calls: string[] = [];
    const roots = Array.from({ length: 8 }, (_, index) => ({ id: `root-${index}` }));
    const children = Object.fromEntries(roots.map(root => [root.id, [{ id: `${root.id}/child` }]]));
    const steps = workingSteps(calls, roots, children);
    let active = 0;
    let peak = 0;
    let release!: () => void;
    const firstBatch = new Promise<void>(resolve => { release = resolve; });
    const result = await runLayering({
      ...input, groups: null, concurrency, mergeSvg: workingMerger(calls),
      steps: { ...steps, async drawOutline(context) {
        active++;
        peak = Math.max(peak, active);
        if (active === (concurrency ?? 5)) release();
        await firstBatch;
        const result = await steps.drawOutline(context);
        active--;
        return result;
      } },
    });
    assert.equal(peak, concurrency ?? 5);
    assert.equal(result.status, 'completed');
    const state = await saved(input.directory);
    assert.equal(walkGroups(state.groups).length, 16);
    assert.ok(walkGroups(state.groups).every(entry => groupCompleted(entry.group)));
    assert.equal(calls.filter(call => call === 'merge').length, 1);
    for (const root of state.groups) assert.deepEqual(root.steps.children.output!.ids, [`${root.id}/child`]);
  });
}

test('指定本次已处理组时跳过全部步骤；外部处理进度不能作为新组导入', async t => {
  const source = await fixture(t);
  const calls: string[] = [];
  const processed = await runLayering({
    ...source, groups: null, steps: workingSteps(calls, [{ id: 'head' }]), mergeSvg: workingMerger(calls),
  });
  calls.length = 0;
  const result = await runLayering({ ...source, groups: processed.groups, steps: forbiddenSteps,
    mergeSvg: async () => assert.fail('合并不应重复') });
  assert.equal(result.status, 'completed');
  assert.deepEqual(calls, []);
  const target = await fixture(t);
  await assert.rejects(runLayering({ ...target, groups: processed.groups, steps: forbiddenSteps }), /需要本次运行已有的分组结果/);
});

test('选择已有子组树时沿用本次拆分结果，祖先完成后才制作子组', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const groups = { id: 'head', groups: [{ id: 'head/face', groups: [{ id: 'head/face/eye' }] }] };
  await seed(input.directory, [groups]);
  const result = await runLayering({
    ...input, groups,
    steps: workingSteps(calls, []), mergeSvg: workingMerger(calls),
  });
  assert.equal(result.status, 'completed');
  assert.equal(calls.includes('initial'), false);
  assert.equal(calls.includes('head:children'), false);
  assert.equal(calls.includes('head/face:children'), false);
  assert.ok(calls.indexOf('head:check') < calls.indexOf('head/face:outline'));
  assert.ok(calls.indexOf('head/face:check') < calls.indexOf('head/face/eye:outline'));
  await GroupStore.open(input.directory);
});

test('显式选择不能创建组或覆盖分组与进度，空选择及错误父子关系也拒绝', async t => {
  const input = await fixture(t);
  const store = await seed(input.directory, [{ id: 'face', note: '本次说明', groups: [{ id: 'face/eye' }] }, { id: 'hair' }]);
  const treeBefore = await readFile(store.path, 'utf8');
  const progressBefore = await readFile(store.progressPath, 'utf8');
  for (const groups of [[], [{ id: 'unknown' }], [{ id: 'hair', groups: [{ id: 'face/eye' }] }]]) {
    await assert.rejects(runLayering({ ...input, groups, steps: forbiddenSteps }), /不能为空|尚未登记|父子关系/);
    assert.equal(await readFile(store.path, 'utf8'), treeBefore);
    assert.equal(await readFile(store.progressPath, 'utf8'), progressBefore);
  }
});

test('显式子组要求父组完成且父组 SVG 存在，拒绝时不启动 agent', async t => {
  const input = await fixture(t);
  await seed(input.directory, [{ id: 'face', groups: [{ id: 'face/eye' }] }, { id: 'hair' }]);
  await assert.rejects(runLayering({ ...input, groups: { id: 'face/eye' }, steps: forbiddenSteps }), /祖先组尚未完成：face/);
  const calls: string[] = [];
  const steps = workingSteps(calls, []);
  await runLayering({ ...input, groups: null, steps: { ...steps, async reviewOutline(context) {
    return context.group.id === 'hair' ? { status: 'pending', message: '未完成' } : steps.reviewOutline(context);
  } }, maxDepth: 1 });
  const state = await saved(input.directory);
  await rm(state.groups[0].steps.completion.output!.path);
  await assert.rejects(runLayering({ ...input, groups: { id: 'face/eye' }, steps: forbiddenSteps }), /ENOENT/);
});

test('显式选择未完成子组不受其他根组进度或无关 SVG 缺失影响', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'face' }, { id: 'hair' }], { face: [{ id: 'face/eye' }] });
  await runLayering({ ...input, groups: null, maxDepth: 1, steps: { ...steps,
    async reviewOutline(context) {
      return context.group.id === 'hair' ? { status: 'pending', message: '等待接入' } : steps.reviewOutline(context);
    },
  } });
  const state = await saved(input.directory);
  await rm(state.groups[1].steps.outline.output!.path);
  calls.length = 0;
  const result = await runLayering({ ...input, groups: { id: 'face/eye' }, steps,
    mergeSvg: async () => assert.fail('其他分支未完成时不应合并') });
  assert.equal(result.status, 'pending');
  assert.deepEqual(calls, ['face/eye:outline', 'face/eye:review', 'face/eye:completion', 'face/eye:check', 'face/eye:children']);
  assert.ok(groupCompleted(result.groups[0].groups[0]));
  assert.equal(result.groups[1].steps.review.status, 'pending');
});

test('直接父组已完成但祖父组未完成，显式选择和默认调度都不会启动后代', async t => {
  const input = await fixture(t);
  await seed(input.directory, [{ id: 'face', groups: [{ id: 'face/eye', groups: [{ id: 'face/eye/pupil' }] }] }]);
  const calls: string[] = [];
  const steps = workingSteps(calls, []);
  await runLayering({ ...input, groups: null, maxDepth: 2, steps });
  const store = await GroupStore.open(input.directory);
  await store.update(document => { document.groups[0].steps.completionCheck = { status: 'pending' }; });
  await assert.rejects(runLayering({ ...input, groups: { id: 'face/eye/pupil' }, steps: forbiddenSteps }), /祖先组尚未完成：face/);
  calls.length = 0;
  await runLayering({ ...input, groups: null, steps: { ...steps, async checkCompletion(context) {
    calls.push(`${context.group.id}:check-pending`);
    return { status: 'pending', message: '等待接入' };
  } } });
  assert.deepEqual(calls, ['face:check-pending']);
  calls.length = 0;
  const result = await runLayering({ ...input, groups: null, steps, mergeSvg: workingMerger(calls) });
  assert.equal(result.status, 'completed');
  assert.deepEqual(calls, ['face:check', 'face/eye/pupil:outline', 'face/eye/pupil:review',
    'face/eye/pupil:completion', 'face/eye/pupil:check', 'face/eye/pupil:children', 'merge']);
});

test('指定分支只制作本组及其子组，其他根组未完成也不阻塞或自动启动', async t => {
  const input = await fixture(t);
  await seed(input.directory, [{ id: 'face', note: '保存的说明' }, { id: 'hair' }]);
  const calls: string[] = [];
  const steps = workingSteps(calls, [], { face: [{ id: 'face/eye' }] });
  const first = await runLayering({ ...input, groups: { id: 'face', note: '不能覆盖的输入说明' }, steps });
  assert.deepEqual(calls, ['face:outline', 'face:review', 'face:completion', 'face:check', 'face:children',
    'face/eye:outline', 'face/eye:review', 'face/eye:completion', 'face/eye:check', 'face/eye:children']);
  assert.equal(first.groups[0].note, '保存的说明');
  assert.equal(first.groups[1].steps.outline.status, 'pending');
  assert.ok(groupCompleted(first.groups[0].groups[0]));
  calls.length = 0;
  const skipped = await runLayering({ ...input, groups: { id: 'face/eye' }, steps: forbiddenSteps });
  assert.equal(skipped.status, 'pending');
  assert.deepEqual(calls, []);
  const result = await runLayering({ ...input, groups: { id: 'hair' }, steps, mergeSvg: workingMerger(calls) });
  assert.equal(result.status, 'completed');
  assert.deepEqual(calls, ['hair:outline', 'hair:review', 'hair:completion', 'hair:check', 'hair:children', 'merge']);
});

test('中断留下的 running 恢复为待执行，已有分组继续复用', async t => {
  const input = await fixture(t);
  const store = await GroupStore.open(input.directory);
  await store.update(document => {
    document.groups = normalizeGroups([{ id: 'head', steps: { outline: { status: 'running' } } }]);
    document.groups[0].steps.outline = { status: 'running' };
  });
  const recovered = await GroupStore.open(input.directory);
  assert.equal(recovered.snapshot().groups[0].steps.outline.status, 'pending');
  assert.match(recovered.snapshot().groups[0].steps.outline.message!, /中断/);
  const calls: string[] = [];
  const result = await runLayering({ ...input, groups: null, steps: workingSteps(calls, []), mergeSvg: workingMerger(calls) });
  assert.equal(result.status, 'completed');
  assert.equal(calls.includes('initial'), false);
  assert.equal(calls[0], 'head:outline');
});

test('补形自检失败不会拆分子组，续跑只重做自检及后续步骤', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'head' }]);
  await assert.rejects(runLayering({ ...input, groups: null, steps: {
    ...steps, async checkCompletion() { return { status: 'completed', output: { passed: false } as never }; },
  } }), /completion check did not pass/);
  const state = await saved(input.directory);
  assert.equal(state.groups[0].steps.completion.status, 'completed');
  assert.equal(state.groups[0].steps.completionCheck.status, 'failed');
  assert.equal(state.groups[0].steps.children.status, 'pending');
  calls.length = 0;
  await runLayering({ ...input, groups: null, steps, mergeSvg: workingMerger(calls) });
  assert.deepEqual(calls, ['head:check', 'head:children', 'merge']);
});

test('agent 拆分提案只接受直属组，不允许携带子树或进度', async t => {
  const input = await fixture(t);
  await assert.rejects(runLayering({ ...input, groups: null, steps: {
    ...forbiddenSteps,
    async initialGroups() { return { status: 'completed', output: { groups: [{ id: 'head', groups: [] } as GroupSeed] } }; },
  } }), /direct group seeds/);
  const state = await saved(input.directory);
  assert.ok(!('initial' in state));
  assert.deepEqual(state.groups, []);
});

test('并发拆分出现重复组 ID 时拒绝提交，不污染分组树', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'a' }, { id: 'b' }], { a: [{ id: 'same' }], b: [{ id: 'same' }] });
  await assert.rejects(runLayering({ ...input, groups: null, steps, concurrency: 2 }), /Duplicate group id/);
  const state = await saved(input.directory);
  const ids = walkGroups(state.groups).map(entry => entry.group.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.filter(id => id === 'same').length, 1);
  assert.equal(state.groups.filter(group => group.steps.children.status === 'failed').length, 1);
  await GroupStore.open(input.directory);
});

test('程序合并占位保持待接入，接入合并后不重跑任何 agent', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const partial = await runLayering({
    ...input, groups: null, steps: workingSteps(calls, [{ id: 'head' }]), mergeSvg: mergeSvgPlaceholder,
  });
  assert.equal(partial.status, 'pending');
  assert.ok(groupCompleted(partial.groups[0]));
  assert.equal((await saved(input.directory)).merge.status, 'pending');
  calls.length = 0;
  const result = await runLayering({ ...input, groups: null, steps: forbiddenSteps, mergeSvg: workingMerger(calls) });
  assert.equal(result.status, 'completed');
  assert.deepEqual(calls, ['merge']);
});

test('null 输入以实际组是否为空为准，空的完成标记不能跳过首次拆解', async t => {
  const input = await fixture(t);
  await writeFile(join(input.directory, 'groups.json'), JSON.stringify({ groups: [] }));
  await writeFile(join(input.directory, 'progress.json'), JSON.stringify({
    version: 1, initial: { status: 'completed', output: { ids: ['old_head'] } }, groups: {}, merge: { status: 'pending' },
  }));
  const calls: string[] = [];
  await runLayering({ ...input, groups: null, steps: workingSteps(calls, [{ id: 'head' }]), mergeSvg: workingMerger(calls) });
  assert.equal(calls[0], 'initial');
  const result = await runLayering({
    ...input, groups: null, steps: forbiddenSteps, mergeSvg: async () => assert.fail('不应重合并'),
  });
  assert.equal(result.status, 'completed');
  assert.ok(!('initial' in JSON.parse(await readFile(result.statePath, 'utf8'))));
});

test('null 输入存在组，不需要任何首次完成标记，直接恢复现有组和步骤', async t => {
  const input = await fixture(t);
  const store = await GroupStore.open(input.directory);
  await store.update(document => { document.groups = normalizeGroups([{ id: 'head' }]); });
  const calls: string[] = [];
  const steps = workingSteps(calls, []);
  const result = await runLayering({
    ...input, groups: null, steps: { ...steps, initialGroups: forbiddenSteps.initialGroups }, mergeSvg: workingMerger(calls),
  });
  assert.equal(result.status, 'completed');
  assert.equal(calls[0], 'head:outline');
  assert.ok(!('initial' in JSON.parse(await readFile(result.statePath, 'utf8'))));
});

test('已有组时忽略并移除旧 initial 状态，保留组步骤并跳过首次识别', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  await runLayering({ ...input, groups: null, steps: workingSteps(calls, [{ id: 'head' }]), mergeSvg: workingMerger(calls) });
  const progressPath = join(input.directory, 'progress.json');
  const before = JSON.parse(await readFile(progressPath, 'utf8'));
  // 即使旧标记与实际分组矛盾，仍只以已保存的组为准。
  await writeFile(progressPath, JSON.stringify({ ...before, initial: { status: 'failed', output: { ids: [] } } }));
  const result = await runLayering({ ...input, groups: null, steps: forbiddenSteps,
    mergeSvg: async () => assert.fail('合并不应重复') });
  assert.equal(result.status, 'completed');
  assert.deepEqual(JSON.parse(await readFile(progressPath, 'utf8')), before);
});

test('损坏进度文件不会被覆盖，也不会偷偷重做首次分组', async t => {
  const input = await fixture(t);
  const path = join(input.directory, 'groups.json');
  await writeFile(path, '{broken');
  await assert.rejects(runLayering({ ...input, groups: null, steps: forbiddenSteps }), SyntaxError);
  assert.equal(await readFile(path, 'utf8'), '{broken');
});

test('旧混合 groups.json 自动分离，保留完成进度及 SVG，null 续跑不调用 agent', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  await runLayering({ ...input, groups: null, steps: workingSteps(calls, [{ id: 'head' }]), mergeSvg: workingMerger(calls) });
  const completed = (await GroupStore.open(input.directory)).snapshot();
  const path = join(input.directory, 'groups.json');
  await writeFile(path, JSON.stringify({ ...completed, initial: { status: 'completed', output: { ids: ['head'] } }, mirror_pairs: [] }));
  await rm(join(input.directory, 'progress.json'));
  const result = await runLayering({ ...input, groups: null, steps: forbiddenSteps,
    mergeSvg: async () => assert.fail('旧进度不应重做合并') });
  assert.equal(result.status, 'completed');
  assert.deepEqual((await saved(input.directory)).groups, completed.groups);
  const pure = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(Object.keys(pure), ['groups']);
  assert.ok(!('steps' in pure.groups[0]));
  const progress = JSON.parse(await readFile(join(input.directory, 'progress.json'), 'utf8'));
  assert.equal(progress.groups.head.completion.status, 'completed');
  assert.ok(!('initial' in progress));
  const selected = await readGroupInput(path) as typeof completed.groups;
  assert.equal(groupCompleted(selected[0]), false);
  const resumed = await runLayering({ ...input, groups: selected, steps: forbiddenSteps,
    mergeSvg: async () => assert.fail('显式选择也应沿用本次合并进度') });
  assert.equal(resumed.status, 'completed');
});

test('损坏的独立 progress.json 拒绝续跑，分组及进度均不被覆盖', async t => {
  const input = await fixture(t);
  const store = await GroupStore.open(input.directory);
  await store.update(document => { document.groups = normalizeGroups([{ id: 'head' }]); });
  const before = await readFile(store.path, 'utf8');
  await writeFile(store.progressPath, '{broken');
  await assert.rejects(runLayering({ ...input, groups: null, steps: forbiddenSteps }), SyntaxError);
  assert.equal(await readFile(store.path, 'utf8'), before);
  assert.equal(await readFile(store.progressPath, 'utf8'), '{broken');
});

test('进度先保存、分组尚未保存时中断，以实际分组树恢复待办', async t => {
  const input = await fixture(t);
  const store = await GroupStore.open(input.directory);
  await store.update(document => {
    document.groups = normalizeGroups([{ id: 'head' }]);
  });
  const progress = JSON.parse(await readFile(store.progressPath, 'utf8'));
  progress.groups.head.children = { status: 'completed', output: { ids: ['head/face'] } };
  await writeFile(store.progressPath, JSON.stringify(progress));
  const restored = (await GroupStore.open(input.directory)).snapshot();
  assert.equal(restored.groups[0].steps.children.status, 'pending');
  assert.deepEqual(restored.groups[0].groups, []);
});

test('SVG 文件名拒绝目录穿越，不能写到运行目录之外', () => {
  for (const id of ['../head', '/head', 'head/../face', 'head\\face']) {
    assert.throws(() => normalizeGroups([{ id }]), /safe filename/);
  }
});

test('未产生 SVG 的步骤不能记为完成', async t => {
  const input = await fixture(t);
  const calls: string[] = [];
  const steps = workingSteps(calls, [{ id: 'head' }]);
  await assert.rejects(runLayering({ ...input, groups: null, steps: {
    ...steps, async drawOutline(context) { return { status: 'completed', output: { path: context.outputPath } }; },
  } }), /ENOENT/);
  const state = await saved(input.directory);
  assert.equal(state.groups[0].steps.outline.status, 'failed');
  assert.equal(state.groups[0].steps.review.status, 'pending');
});
