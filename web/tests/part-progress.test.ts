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
  await f.put('groups/body/step01/outline.draft.svg', svg);
  let value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'available');
  assert.equal(value.part.groups[0].webMessages.outline, '已有产物');
  assert.match(value.part.groups[0].webDetails.outline, /草稿/);
  const version = value.fileVersions[pipeline + '/groups/body/step01/outline.draft.svg'];
  await f.put('groups/body/step01/outline.draft.svg', svg + '\n');
  value = await f.get();
  assert.notEqual(value.fileVersions[pipeline + '/groups/body/step01/outline.draft.svg'], version);
  assert.equal(value.part.groups[0].webPhases.outline, 'available', 'an inactive draft is never running');
  await f.put('groups/body/step01/outline.svg', svg);
  await rm(join(f.task, pipeline, 'groups/body/step01/outline.draft.svg'));
  assert.equal((await f.get()).part.groups[0].webPhases.outline, 'done');
  const review = { verdict: 'pass', candidateHash: svgHash(svg), feedback: '通过', observations: [] };
  await f.put('groups/body/step01/review.json', { groupId: 'body', reviews: [{ ...review, candidateHash: 'stale' }] });
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'available');
  await f.put('groups/body/step01/review.json', { groupId: 'body', reviews: [review] });
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'available', 'a passed review counts once its step is completed');
  await f.mark('groups/body/step01');
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'done');
  assert.deepEqual((await f.get()).part.groups[0].webReviewRounds.map((round: any) => [round.review.status, round.repair.status]),
    [['done', 'skipped'], ['skipped', 'skipped']]);
  await f.put('groups/body/step01/review.json', { groupId: 'body', reviews: [review, { ...review, verdict: 'revise', candidateHash: 'old', repairedCandidateHash: svgHash(svg) }] });
  assert.equal((await f.get()).part.groups[0].webMessages.review, '已完成');
  assert.match((await f.get()).part.groups[0].webDetails.review, /不再复审/);
  await f.put('layers/depth01/body.svg', svg);
  assert.equal((await f.get()).part.groups[0].webPhases.reduction, 'available');
  await f.mark('layers/depth01');
  const completed = stampedSvg(svg, svgHash(svg));
  await f.put('parts/body.svg', completed);
  await f.put('groups/body/step02/check.json', { groupId: 'body', passed: true });
  await f.mark('groups/body/step02');
  value = await f.get();
  assert.deepEqual(value.part.groups[0].webPhases, { outline: 'done', review: 'done', reduction: 'done', completion: 'done', completionCheck: 'done', children: 'pending' });
  assert.deepEqual(await readFile(join(f.task, pipeline, 'groups.json')), original, 'display must not save restored steps');
  await f.put('groups.json', { groups: [{ ...group, groups: [{ id: 'body/torso', kind: 'part', groups: [] }] }] });
  await f.mark('groups/body/step03');
  value = await f.get();
  assert.equal(value.part.groups[0].webPhases.children, 'done');
  assert.equal(value.part.groups[0].groups[0].webPhases.outline, 'pending');
  // Rerunning the step clears its completed marker: the old check is only a record.
  await rm(join(f.task, pipeline, 'groups/body/step02/.completed'));
  await f.mark('groups/body/step02', 'running');
  assert.equal((await f.get()).part.groups[0].webPhases.completionCheck, 'available');
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
  await f.mark('initial/step01');
  assert.equal((await f.get()).part.states.initial, 'running', 'saving an output does not hide the still active agent');
  await f.put('agents/initial/result.json', { status: 'completed' });
  assert.equal((await f.get()).part.states.initial, 'done');
  await f.put('agents/depth/request.json', { task: { name: '最终遮挡层级规划' } });
  assert.equal((await f.get()).part.states.occlusion, 'running');
  await f.put('occlusion/candidate.svg', svg);
  let value = await f.get();
  assert.equal(value.part.states.occlusion, 'running');
  assert.ok(value.files.includes(pipeline + '/occlusion/candidate.svg'));
  await f.put('agents/depth/result.json', { status: 'completed' });
  assert.equal((await f.get()).part.states.occlusion, 'available');
  await f.put('occlusion.json', { version: 3, direction: 'back-to-front', sourceHash: 'input',
    layers: [{ id: 'body', level: 0, note: 'body', check: { passed: true, note: 'checked' } }] });
  assert.equal((await f.get()).part.states.occlusion, 'available', 'the table counts once its step is completed');
  await f.mark('occlusion');
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
  const files: any = {};
  for (const [stage, filename] of [['standard', 'standard.png'], ['judgment', 'judgment.json'], ['simplified', 'simplified-subject.png'], ['base', 'base-subject.png']]) {
    await f.put('references/' + filename, svg);
    files[stage] = { outputHash: svgHash(svg) };
  }
  await f.put('references/preparation.json', { version: 1, standard: true, files });
  let value = await f.get();
  assert.equal(value.part.states.preparation, 'done');
  assert.deepEqual(['standard', 'simplified', 'base'].map(phase => value.part.states[phase]), ['done', 'done', 'done']);
  await f.put('references/base-subject.png', svg + '\n');
  value = await f.get();
  assert.equal(value.part.states.base, 'available'); assert.equal(value.part.states.preparation, 'available');
});

test('人物参考仅凭图片与步骤完成记录展示完成，缺图时仍显示待制作', async t => {
  const f = await fixture(t);
  for (const [number, name] of [[4, 'standard'], [6, 'simplified-subject'], [7, 'base-subject']] as const) {
    await f.put(`references/${name}.png`, svg);
    await f.mark(`preparation/step0${number}`);
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
  await f.put('groups/body/step01/outline.svg', svg);
  await f.put('groups/body/step01/review.json', { groupId: 'body', reviews: [{ verdict: 'pass', candidateHash: svgHash(svg), feedback: 'ok', observations: [] }] });
  await f.put('layers/depth01/body.svg', svg);
  await f.put('parts/body.svg', stampedSvg(svg, svgHash(svg)));
  await f.put('groups/body/step02/check.json', { groupId: 'body', passed: true });
  for (const step of ['initial/step01', 'groups/body/step01', 'layers/depth01', 'groups/body/step02', 'groups/body/step03']) await f.mark(step);
  await f.put('preview.svg', svg);
  assert.equal((await f.get()).part.states.merge, 'available');
  await f.mark('merge');
  assert.equal((await f.get()).part.states.merge, 'done');
  await rm(join(f.task, 'part-layering/merge/.completed'));
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
  await f.put('groups/hair/step01/outline.draft.svg', svg);
  let value = await f.get();
  assert.deepEqual(value.part.groups.map(node => node.webPhases.outline), ['running', 'available', 'pending']);
  await f.put('groups/body/step01/outline.svg', svg);
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

test('a failed current group and initial request are marked failed while their drafts remain visible; recovery clears old failures', async t => {
  const f = await fixture(t);
  const run = await configureRun({ name: 'test', dir: f.dir, from: 'part-layering', to: 'part-layering' }, f.task);
  run.status = 'failed'; run.activePipeline = 'part-layering';
  run.runner = { id: 'failed-runner', pid: process.pid, startedAt: new Date(Date.now() - 1000).toISOString(), finishedAt: new Date().toISOString() };
  run.pipelines['part-layering']!.status = 'failed'; await saveRun(f.task, run);
  await f.put('groups.json', { groups: [{ id: 'body', groups: [] }] });
  await f.mark('initial/step01');
  await f.put('groups/body/step01/outline.draft.svg', svg);
  await f.put('agents/draw/request.json', { task: { name: '组轮廓绘制-body' } });
  await f.put('agents/draw/result.json', { status: 'failed' });
  await f.put('agents/initial/request.json', { task: { step: 'part_initial_groups', name: '首次分组识别' } });
  await f.put('agents/initial/result.json', { status: 'failed' });
  let value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'failed');
  assert.equal(value.part.states.initial, 'failed');
  assert.ok(value.files.includes('part-layering/groups/body/step01/outline.draft.svg'));
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
  await mkdir(join(f.task, 'part-layering/groups/body/step01'), { recursive: true });
  await writeFile(join(f.dir, 'private.svg'), svg);
  await symlink(join(f.dir, 'private.svg'), join(f.task, 'part-layering/groups/body/step01/outline.svg'));
  const value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'pending');
  assert.ok(!value.files.includes('part-layering/groups/body/step01/outline.svg'));
});
