import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, realpath, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshot } from '../snapshot.ts';
import { acquireTaskLock, configureRun, saveRun } from '../../.agents/skills/live2d-maker/workflow/state.ts';
import { stampedSvg, svgHash } from '../../.agents/skills/live2d-maker/shared/part/artifact-facts.ts';

const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10Z"/></svg>');
async function fixture(t: any, pipeline = 'part-layering') {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'part-progress-'))), task = join(dir, 'test');
  await mkdir(task);
  t.after(() => rm(dir, { recursive: true, force: true }));
  const put = async (path: string, value: any) => {
    const target = join(task, pipeline, path); await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
  };
  const get = async () => {
    const value = await snapshot(task, 'test', dir);
    return { ...value, part: value.pipelines.find(item => item.id === pipeline)! };
  };
  // Step markers as the scheduler leaves them (see shared/step-chain.ts).
  const mark = (step: string, status: 'completed' | 'running' = 'completed') => put(`${step}/.${status}`, '');
  return { dir, task, put, get, mark };
}

for (const pipeline of ['part-layering', 'clothing-part-layering']) test(`${pipeline}: drafts, publication, hash-matched reviews, reduction, completion and child analysis`, async t => {
  const f = await fixture(t, pipeline);
  const group = { id: 'body', kind: 'group', groups: [] };
  await f.put('groups.json', { groups: [group] });
  const original = await readFile(join(f.task, pipeline, 'groups.json'));
  await f.put('step09_outline/body/outline.draft.svg', svg);
  let value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'available');
  assert.equal(value.part.groups[0].webMessages.outline, '已有产物');
  assert.match(value.part.groups[0].webDetails.outline, /草稿/);
  const version = value.fileVersions[pipeline + '/step09_outline/body/outline.draft.svg'];
  await f.put('step09_outline/body/outline.draft.svg', svg + '\n');
  value = await f.get();
  assert.notEqual(value.fileVersions[pipeline + '/step09_outline/body/outline.draft.svg'], version);
  assert.equal(value.part.groups[0].webPhases.outline, 'available', 'an inactive draft is never running');
  await f.put('step09_outline/body/outline.svg', svg);
  await rm(join(f.task, pipeline, 'step09_outline/body/outline.draft.svg'));
  assert.equal((await f.get()).part.groups[0].webPhases.outline, 'done');
  const review = { verdict: 'pass', candidateHash: svgHash(svg), feedback: '通过', observations: [] };
  await f.put('step09_outline/body/review.json', { groupId: 'body', reviews: [{ ...review, candidateHash: 'stale' }] });
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'available');
  await f.put('step09_outline/body/review.json', { groupId: 'body', reviews: [review] });
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'available', 'a passed review counts once its step is completed');
  await f.mark('step09_outline/body');
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'done');
  assert.deepEqual((await f.get()).part.groups[0].webReviewRounds.map((round: any) => [round.review.status, round.repair.status]),
    [['done', 'skipped'], ['skipped', 'skipped']]);
  await f.put('step09_outline/body/review.json', { groupId: 'body', reviews: [review, { ...review, verdict: 'revise', candidateHash: 'old', repairedCandidateHash: svgHash(svg) }] });
  assert.equal((await f.get()).part.groups[0].webMessages.review, '已完成');
  assert.match((await f.get()).part.groups[0].webDetails.review, /不再复审/);
  await f.put('step10_reduce/depth01/body.svg', svg);
  assert.equal((await f.get()).part.groups[0].webPhases.reduction, 'available');
  await f.mark('step10_reduce/depth01');
  const completed = stampedSvg(svg, svgHash(svg));
  await f.put('parts/body.svg', completed);
  await f.put('step11_completion/body/check.json', { groupId: 'body', passed: true });
  await f.mark('step11_completion/body');
  value = await f.get();
  assert.deepEqual(value.part.groups[0].webPhases, { outline: 'done', review: 'done', reduction: 'done', completion: 'done', completionCheck: 'done', children: 'pending' });
  assert.deepEqual(await readFile(join(f.task, pipeline, 'groups.json')), original, 'display must not save restored steps');
  await f.put('groups.json', { groups: [{ ...group, groups: [{ id: 'body/torso', kind: 'part', groups: [] }] }] });
  await f.mark('step12_children/body');
  value = await f.get();
  assert.equal(value.part.groups[0].webPhases.children, 'done');
  assert.equal(value.part.groups[0].groups[0].webPhases.outline, 'pending');
  // Rerunning the step clears its completed marker: the old check is only a record.
  await rm(join(f.task, pipeline, 'step11_completion/body/.completed'));
  await f.mark('step11_completion/body', 'running');
  assert.equal((await f.get()).part.groups[0].webPhases.completionCheck, 'available');
});

for (const pipeline of ['part-layering', 'clothing-part-layering']) test(`${pipeline}: completed nested parts show every phase from native artifact paths`, async t => {
  const f = await fixture(t, pipeline), id = 'face/eye_left/iris';
  await f.put('groups.json', { groups: [{ id: 'face', groups: [{ id: 'face/eye_left', groups: [{ id, kind: 'part', groups: [] }] }] }] });
  const item = 'face/children/eye_left/children/iris';
  await f.put(`step09_outline/${item}/outline.svg`, svg);
  await f.put(`step09_outline/${item}/review.json`, { groupId: id, reviews: [
    { verdict: 'pass', candidateHash: svgHash(svg), feedback: '通过', observations: [] },
  ] });
  await f.put(`step10_reduce/depth03/${id}.svg`, svg);
  await f.put(`parts/${id}.svg`, stampedSvg(svg, svgHash(svg)));
  await f.put(`step11_completion/${item}/check.json`, { groupId: id, passed: true });
  for (const step of [`step09_outline/${item}`, 'step10_reduce/depth03', `step11_completion/${item}`, `step12_children/${item}`]) await f.mark(step);
  const value = await f.get(), node = value.part.groups[0].groups[0].groups[0];
  assert.deepEqual(node.webPhases, Object.fromEntries(['outline', 'review', 'reduction', 'completion', 'completionCheck', 'children'].map(phase => [phase, 'done'])));
  assert.equal(node.webReviewRounds[0].review.status, 'done');
  assert.ok(value.files.includes(`${pipeline}/step09_outline/${item}/outline.svg`));
  assert.deepEqual(value.errors ?? [], []);
});

for (const pipeline of ['part-layering', 'clothing-part-layering']) test(`${pipeline}: hidden outlines and reviews finish together once the skip step completes`, async t => {
  const f = await fixture(t, pipeline);
  const group = { id: 'iris', kind: 'part', hiddenInReference: true, groups: [] };
  await f.put('groups.json', { groups: [group] });
  const original = await readFile(join(f.task, pipeline, 'groups.json'));
  const hiddenSource = '<svg xmlns="http://www.w3.org/2000/svg" data-hidden-in-reference="true"><g data-group-path="iris"/></svg>';
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'pending', 'the flag alone is not a completed skip');
  await f.mark('step09_outline/iris', 'running');
  await f.put('step09_outline/iris/outline.svg', hiddenSource);
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'pending', 'an interrupted skip still needs its completed marker');
  await rm(join(f.task, pipeline, 'step09_outline/iris/.running'));
  await f.mark('step09_outline/iris');
  let value = await f.get(), node = value.part.groups[0];
  assert.equal(node.webPhases.outline, 'done');
  assert.equal(node.webPhases.review, 'done');
  assert.match(node.webDetails.outline, /原图不可见.*已跳过/);
  assert.match(node.webDetails.review, /原图不可见.*已跳过/);
  assert.deepEqual(node.webReviewRounds.map((round: any) => [round.review.status, round.repair.status]),
    [['skipped', 'skipped'], ['skipped', 'skipped']]);
  assert.ok(node.webReviewRounds.every((round: any) => round.review.reportIndex === undefined && round.repair.reportIndex === undefined));
  assert.equal(value.files.some(file => file.endsWith('/review.json')), false, 'skipped reviews have no invented report');
  await f.put('step10_reduce/depth01/iris.svg', hiddenSource);
  await f.put('parts/iris.svg', svg);
  await f.put('step11_completion/iris/check.json', { groupId: 'iris', passed: true });
  for (const step of ['step10_reduce/depth01', 'step11_completion/iris', 'step12_children/iris', 'step13_merge']) await f.mark(step);
  await f.put('preview.svg', svg);
  value = await f.get();
  assert.ok(Object.values(value.part.groups[0].webPhases).every(status => status === 'done'));
  assert.equal(value.part.states.layers, 'done');
  assert.equal(value.part.states.merge, 'done');
  assert.deepEqual(await readFile(join(f.task, pipeline, 'groups.json')), original, 'display does not rewrite scheduler facts');
  await f.put('groups.json', { groups: [{ ...group, hiddenInReference: false }] });
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'pending', 'ordinary parts still require their review report');
  await f.put('groups.json', { groups: [group] });
  await rm(join(f.task, pipeline, 'step09_outline/iris/outline.svg'));
  value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'pending');
  assert.equal(value.part.groups[0].webPhases.review, 'pending', 'missing skip output is not a completed review');
});

for (const pipeline of ['part-layering', 'clothing-part-layering']) test(`${pipeline}: initial and depth requests show running without outputs, and candidates remain previewable`, async t => {
  const f = await fixture(t, pipeline);
  const run = await configureRun({ name: 'test', dir: f.dir, from: pipeline as any, to: pipeline as any }, f.task);
  run.status = 'running'; run.activePipeline = pipeline as any;
  run.runner = { id: 'test-runner', pid: process.pid, startedAt: new Date(Date.now() - 1000).toISOString() };
  run.pipelines[pipeline as 'part-layering']!.status = 'running';
  await saveRun(f.task, run);
  const release = await acquireTaskLock(f.task); t.after(async () => { await release(); });
  await f.put('agents/initial/request.json', { task: { name: '首次分组识别' } });
  assert.equal((await f.get()).part.states.initial, 'running');
  await f.put('groups.json', { groups: [{ id: 'body', kind: 'part', groups: [] }] });
  await f.mark('step08_initial');
  assert.equal((await f.get()).part.states.initial, 'running', 'saving an output does not hide the still active agent');
  await f.put('agents/initial/result.json', { status: 'completed' });
  assert.equal((await f.get()).part.states.initial, 'done');
  await f.put('agents/depth/request.json', { task: { name: '最终遮挡层级规划' } });
  assert.equal((await f.get()).part.states.occlusion, 'running');
  await f.put('step14_occlusion/workspace/candidate.svg', svg);
  let value = await f.get();
  assert.equal(value.part.states.occlusion, 'running');
  assert.ok(value.files.includes(pipeline + '/step14_occlusion/workspace/candidate.svg'));
  await f.put('agents/depth/result.json', { status: 'completed' });
  assert.equal((await f.get()).part.states.occlusion, 'available');
  await f.put('occlusion.json', { version: 3, direction: 'back-to-front', sourceHash: 'input',
    layers: [{ id: 'body', level: 0, note: 'body', check: { passed: true, note: 'checked' } }] });
  assert.equal((await f.get()).part.states.occlusion, 'available', 'the table counts once its step is completed');
  await f.mark('step14_occlusion');
  assert.equal((await f.get()).part.states.occlusion, 'done');
  await rm(join(f.task, pipeline, 'occlusion.json'));
  run.runner.finishedAt = new Date().toISOString(); await saveRun(f.task, run);
  assert.equal((await f.get()).part.states.occlusion, 'available', 'a stopped request cannot keep a candidate running');
});

test('preparation activity is visible before an image, and matching published references complete independently', async t => {
  const f = await fixture(t);
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'part-layering', to: 'part-layering' }, f.task);
  run.status = 'running'; run.activePipeline = 'part-layering';
  run.runner = { id: 'test-runner', pid: process.pid, startedAt: new Date(Date.now() - 1000).toISOString() };
  await saveRun(f.task, run);
  const release = await acquireTaskLock(f.task); t.after(async () => { await release(); });
  for (const [step, phase] of [['part_pose_judgment', 'standard'], ['part_simplify', 'simplified'], ['part_base_subject', 'base']]) {
    await f.put(`agents/${step}/request.json`, { task: { step, name: step } });
    const value = await f.get();
    assert.equal(value.part.states[phase], 'running'); assert.equal(value.part.states.preparation, 'running');
    await f.put(`agents/${step}/result.json`, { status: 'completed' });
  }
  for (const [step, name] of [['step04_standard', 'standard'], ['step05_simplified', 'simplified-subject'], ['step06_base', 'base-subject']]) {
    await f.put(`references/${name}.png`, svg);
    await f.mark(step);
  }
  let value = await f.get();
  assert.equal(value.part.states.preparation, 'done');
  assert.deepEqual(['standard', 'simplified', 'base'].map(phase => value.part.states[phase]), ['done', 'done', 'done']);
  // An upstream redo deletes the downstream step records.
  await rm(join(f.task, 'part-layering/step06_base/.completed'));
  value = await f.get();
  assert.equal(value.part.states.base, 'available'); assert.equal(value.part.states.preparation, 'available');
});

test('人物参考仅凭图片与步骤完成记录展示完成，缺图时仍显示待制作', async t => {
  const f = await fixture(t);
  for (const [step, name] of [['step04_standard', 'standard'], ['step05_simplified', 'simplified-subject'], ['step06_base', 'base-subject']] as const) {
    await f.put(`references/${name}.png`, svg);
    await f.mark(step);
  }
  let value = await f.get();
  assert.equal(value.part.states.preparation, 'done');
  assert.deepEqual(['standard', 'simplified', 'base'].map(phase => value.part.states[phase]), ['done', 'done', 'done']);
  assert.equal(value.files.some(file => file.endsWith('/judgment.json')), false);
  await rm(join(f.task, 'part-layering/references/base-subject.png'));
  value = await f.get();
  assert.equal(value.part.states.base, 'pending');
  assert.equal(value.part.states.preparation, 'available');
});

test('a completed merge step is complete before the whole part pipeline finishes', async t => {
  const f = await fixture(t), group = { id: 'body', kind: 'part', groups: [] };
  await f.put('groups.json', { groups: [group] });
  await f.put('step09_outline/body/outline.svg', svg);
  await f.put('step09_outline/body/review.json', { groupId: 'body', reviews: [{ verdict: 'pass', candidateHash: svgHash(svg), feedback: 'ok', observations: [] }] });
  await f.put('step10_reduce/depth01/body.svg', svg);
  await f.put('parts/body.svg', stampedSvg(svg, svgHash(svg)));
  await f.put('step11_completion/body/check.json', { groupId: 'body', passed: true });
  for (const step of ['step08_initial', 'step09_outline/body', 'step10_reduce/depth01', 'step11_completion/body', 'step12_children/body']) await f.mark(step);
  await f.put('preview.svg', svg);
  assert.equal((await f.get()).part.states.merge, 'available');
  await f.mark('step13_merge');
  assert.equal((await f.get()).part.states.merge, 'done');
  // Current step records store task-relative output keys; the view reads them against the task root.
  await f.put('step13_merge/.completed', { stamp: 'stamp', inputs: {}, outputs: { 'part-layering/preview.svg': svgHash(svg) }, paths: 'task' });
  const current = await f.get();
  assert.equal(current.part.states.merge, 'done');
  assert.deepEqual(current.errors ?? [], []);
  await rm(join(f.task, 'part-layering/step13_merge/.completed'));
  assert.equal((await f.get()).part.states.merge, 'available');
});

test('running phases require current agent requests; queued groups, old calls and interrupted runners do not count', async t => {
  const f = await fixture(t);
  await f.put('groups.json', { groups: ['body', 'hair', 'neck'].map(id => ({ id, groups: [] })) });
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'part-layering', to: 'part-layering' }, f.task);
  run.status = 'running'; run.activePipeline = 'part-layering';
  run.runner = { id: 'test-runner', pid: process.pid, startedAt: new Date(Date.now() - 1000).toISOString() };
  run.pipelines['part-layering']!.status = 'running';
  await saveRun(f.task, run);
  const release = await acquireTaskLock(f.task); t.after(async () => { await release(); });
  await f.put('agents/current/request.json', { task: { name: '组轮廓绘制-body' } });
  await f.put('agents/old/request.json', { task: { name: '组轮廓绘制-hair' } });
  await utimes(join(f.task, 'part-layering/agents/old/request.json'), 1, 1);
  await f.put('step09_outline/hair/outline.draft.svg', svg);
  let value = await f.get();
  assert.deepEqual(value.part.groups.map(node => node.webPhases.outline), ['running', 'available', 'pending']);
  await f.put('step09_outline/body/outline.svg', svg);
  assert.equal((await f.get()).part.groups[0].webPhases.outline, 'running');
  await f.put('agents/current/result.json', { status: 'completed' });
  await f.put('agents/review/request.json', { task: { name: '组轮廓review-body' } });
  value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'done');
  assert.equal(value.part.groups[0].webPhases.review, 'running');
  assert.equal(value.part.groups[0].webReviewRounds[0].review.status, 'running');
  run.runner.finishedAt = new Date().toISOString(); await saveRun(f.task, run);
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'pending');
});

test('a call waiting to retry shows 限流等待 with the logged error verbatim until its wait ends, apart from running and pending', async t => {
  const f = await fixture(t);
  await f.put('groups.json', { groups: ['body', 'hair'].map(id => ({ id, groups: [] })) });
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'part-layering', to: 'part-layering' }, f.task);
  run.status = 'running'; run.activePipeline = 'part-layering';
  run.runner = { id: 'test-runner', pid: process.pid, startedAt: new Date(Date.now() - 1000).toISOString() };
  run.pipelines['part-layering']!.status = 'running';
  await saveRun(f.task, run);
  const release = await acquireTaskLock(f.task); t.after(async () => { await release(); });
  await f.put('agents/body/request.json', { task: { name: '组轮廓绘制-body' } });
  await f.put('agents/hair/request.json', { task: { name: '组轮廓绘制-hair' } });
  const wait = (ms: number) => f.put('agents/body/retry-wait.json', { reason: 'rate-limit', error: 'Rate limit exceeded: 429 Too Many Requests', until: new Date(Date.now() + ms).toISOString() });
  await wait(60_000);
  let value = await f.get();
  assert.deepEqual(value.part.groups.map(node => node.webPhases.outline), ['throttled', 'running']);
  assert.equal(value.part.groups[0].webMessages.outline, '限流等待');
  assert.equal(value.part.states.outline, 'running');
  await f.put('agents/hair/result.json', { status: 'completed' });
  assert.equal((await f.get()).part.states.outline, 'throttled');
  await f.put('agents/review/request.json', { task: { name: '组轮廓review-hair' } });
  await f.put('agents/review/retry-wait.json', { reason: 'transient', error: 'stream disconnected before completion', until: new Date(Date.now() + 60_000).toISOString() });
  value = await f.get();
  assert.equal(value.part.groups[1].webPhases.review, 'throttled');
  assert.equal(value.part.groups[1].webReviewRounds[0].review.status, 'throttled');
  assert.equal(value.part.groups[1].webReviewRounds[0].review.detail, 'stream disconnected before completion');
  assert.equal(value.part.groups[0].webDetails.outline, 'Rate limit exceeded: 429 Too Many Requests');
  // The wait has passed: the next attempt is running.
  await wait(-1);
  assert.equal((await f.get()).part.groups[0].webPhases.outline, 'running');
  // The wait file is a server-side record; the page never receives it.
  assert.ok(!value.files.some(path => path.endsWith('retry-wait.json')));
});

test('a CLI attempt that failed and scheduled a retry stays 限流等待; a result after the wait ends the call', async t => {
  const f = await fixture(t);
  await f.put('groups.json', { groups: [{ id: 'body', groups: [] }] });
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'part-layering', to: 'part-layering' }, f.task);
  run.status = 'running'; run.activePipeline = 'part-layering';
  run.runner = { id: 'test-runner', pid: process.pid, startedAt: new Date(Date.now() - 10_000).toISOString() };
  run.pipelines['part-layering']!.status = 'running';
  await saveRun(f.task, run);
  const release = await acquireTaskLock(f.task); t.after(async () => { await release(); });
  const at = (path: string, seconds: number) => utimes(join(f.task, 'part-layering', path), new Date(), new Date(Date.now() - seconds * 1000));
  // Claude and AGV CLI: each attempt has its own record, finished as failed before the retry wait is written.
  await f.put('agents/body/request.json', { task: { name: '组轮廓绘制-body' } });
  await f.put('agents/body/result.json', { status: 'failed' });
  await f.put('agents/body/retry-wait.json', { reason: 'rate-limit', error: 'API Error: 429 rate_limit_error', until: new Date(Date.now() + 60_000).toISOString() });
  await at('agents/body/result.json', 2); await at('agents/body/retry-wait.json', 1);
  let value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'throttled');
  assert.equal(value.part.groups[0].webDetails.outline, 'API Error: 429 rate_limit_error');
  // Codex keeps one record across retries: its later result ends the call.
  await f.put('agents/body/result.json', { status: 'completed' });
  value = await f.get();
  assert.notEqual(value.part.groups[0].webPhases.outline, 'throttled');
  assert.notEqual(value.part.groups[0].webPhases.outline, 'running');
});

test('a failed current group and initial request are marked failed while their drafts remain visible; recovery clears old failures', async t => {
  const f = await fixture(t);
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'part-layering', to: 'part-layering' }, f.task);
  run.status = 'failed'; run.activePipeline = 'part-layering';
  run.runner = { id: 'failed-runner', pid: process.pid, startedAt: new Date(Date.now() - 1000).toISOString(), finishedAt: new Date().toISOString() };
  run.pipelines['part-layering']!.status = 'failed'; await saveRun(f.task, run);
  await f.put('groups.json', { groups: [{ id: 'body', groups: [] }] });
  await f.mark('step08_initial');
  await f.put('step09_outline/body/outline.draft.svg', svg);
  await f.put('agents/draw/request.json', { task: { name: '组轮廓绘制-body' } });
  await f.put('agents/draw/result.json', { status: 'failed' });
  await f.put('agents/initial/request.json', { task: { step: 'part_initial_groups', name: '首次分组识别' } });
  await f.put('agents/initial/result.json', { status: 'failed' });
  let value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'failed');
  assert.equal(value.part.states.initial, 'failed');
  assert.ok(value.files.includes('part-layering/step09_outline/body/outline.draft.svg'));
  run.status = 'running'; run.pipelines['part-layering']!.status = 'running';
  run.runner = { id: 'new-runner', pid: process.pid, startedAt: new Date().toISOString() }; await saveRun(f.task, run);
  const release = await acquireTaskLock(f.task); t.after(async () => { await release(); });
  value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'available');
  assert.equal(value.part.states.initial, 'done');
});

test('unsafe group paths and symlinked drafts cannot expose outside files', async t => {
  const f = await fixture(t);
  await f.put('groups.json', { groups: [{ id: '../../../private', groups: [] }] });
  assert.match((await f.get()).errors.join(), /group id 无效/);
  await f.put('groups.json', { groups: [{ id: 'body', groups: [] }] });
  await mkdir(join(f.task, 'part-layering/step09_outline'), { recursive: true });
  await mkdir(join(f.dir, 'private'));
  await writeFile(join(f.dir, 'private/outline.svg'), svg);
  // A directory junction covers symlinked parents without requiring Windows'
  // file-symlink privilege (or enabling Developer Mode on the user's machine).
  await symlink(join(f.dir, 'private'), join(f.task, 'part-layering/step09_outline/body'), process.platform === 'win32' ? 'junction' : 'dir');
  const value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'pending');
  assert.ok(!value.files.includes('part-layering/step09_outline/body/outline.svg'));
});

test('lanes skipped because the subject was not dressed show as skipped with their reason, not pending', async t => {
  const f = await fixture(t);
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'part-layering', to: 'shadow' }, f.task);
  const summary = '素体换装沿用了简化参考，没有衣服需要拆分和绘制，跳过';
  for (const id of ['clothing-part-layering', 'clothing-raster-layering'] as const)
    run.pipelines[id] = { status: 'completed', skipped: true, updatedAt: new Date().toISOString(), summary };
  await saveRun(f.task, run);
  const { pipelines } = await f.get();
  for (const id of ['clothing-part-layering', 'clothing-raster-layering']) {
    const lane = pipelines.find(item => item.id === id)!;
    assert.equal(lane.status, 'skipped'); assert.equal(lane.skipped, true);
    assert.ok(Object.values(lane.states).every(state => state === 'skipped'), id);
  }
  assert.notEqual(pipelines.find(item => item.id === 'raster-layering')!.status, 'skipped');
});

test('a lane that failed shows as failed while the other lane runs on', async t => {
  const f = await fixture(t, 'clothing-raster-layering');
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'part-layering', to: 'shadow' }, f.task);
  run.status = 'running'; run.activePipelines = ['part-layering', 'clothing-raster-layering'];
  run.runner = { id: 'test-runner', pid: process.pid, startedAt: new Date(Date.now() - 1000).toISOString() };
  run.pipelines['part-layering']!.status = 'running';
  run.pipelines['clothing-raster-layering'] = { status: 'failed', updatedAt: new Date().toISOString(), summary: 'ENAMETOOLONG' };
  await saveRun(f.task, run);
  const release = await acquireTaskLock(f.task); t.after(async () => { await release(); });
  // The failed section never cleared its running marker.
  await f.mark('step01', 'running');
  const { pipelines } = await f.get();
  const lane = pipelines.find(item => item.id === 'clothing-raster-layering')!;
  assert.equal(lane.status, 'failed'); assert.equal(lane.states.step01, 'failed');
  assert.equal(pipelines.find(item => item.id === 'part-layering')!.status, 'running');
  // The step it left mid-way says why; a review it was on carries the reason instead of the draw step.
  assert.equal(lane.messages.step01, 'ENAMETOOLONG');
  await f.put('step01/report.md', 'drawn');
  const review = (await f.get()).pipelines.find(item => item.id === 'clothing-raster-layering')!;
  assert.equal(review.states['review-01'], 'failed');
  assert.deepEqual(review.messages, { 'review-01': 'ENAMETOOLONG' });
});
