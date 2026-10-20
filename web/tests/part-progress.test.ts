import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshot } from '../snapshot.ts';
import { acquireTaskLock, configureRun, saveRun } from '../../.agents/skills/live2d-maker/workflow/state.ts';
import { stampedSvg, svgHash } from '../../.agents/skills/live2d-maker/shared/part/artifact-facts.ts';

const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10Z"/></svg>');
async function fixture(t: any, pipeline = 'part-layering') {
  const dir = await mkdtemp(join(tmpdir(), 'part-progress-')), task = join(dir, 'test');
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
  return { dir, task, put, get };
}

for (const pipeline of ['part-layering', 'clothing-part-layering']) test(`${pipeline}: drafts, publication, hash-matched reviews, reduction, completion and child analysis`, async t => {
  const f = await fixture(t, pipeline);
  const group = { id: 'body', kind: 'group', groups: [] };
  await f.put('groups.json', { groups: [group] });
  const original = await readFile(join(f.task, pipeline, 'groups.json'));
  await f.put('stages/outline/body.draft.svg', svg);
  let value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'available');
  assert.match(value.part.groups[0].webMessages.outline, /草稿/);
  const version = value.fileVersions[pipeline + '/stages/outline/body.draft.svg'];
  await f.put('stages/outline/body.draft.svg', svg + '\n');
  value = await f.get();
  assert.notEqual(value.fileVersions[pipeline + '/stages/outline/body.draft.svg'], version);
  assert.equal(value.part.groups[0].webPhases.outline, 'available', 'an inactive draft is never running');
  await f.put('stages/outline/body.svg', svg);
  await rm(join(f.task, pipeline, 'stages/outline/body.draft.svg'));
  assert.equal((await f.get()).part.groups[0].webPhases.outline, 'done');
  const review = { verdict: 'pass', candidateHash: svgHash(svg), feedback: '通过', observations: [] };
  await f.put('stages/review/body.review.json', { groupId: 'body', reviews: [{ ...review, candidateHash: 'stale' }] });
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'available');
  await f.put('stages/review/body.review.json', { groupId: 'body', reviews: [review] });
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'done');
  await f.put('stages/review/body.review.json', { groupId: 'body', reviews: [review, { ...review, verdict: 'revise', candidateHash: 'old', repairedCandidateHash: svgHash(svg) }] });
  assert.match((await f.get()).part.groups[0].webMessages.review, /不再复审/);
  await f.put('stages/outline-reduce/body.svg', svg);
  await f.put('stages/outline-reduce/layers/0.json', { depth: 0, groups: [{ id: 'body', inputHash: svgHash(svg), outputHash: svgHash(svg) }] });
  const completed = stampedSvg(svg, svgHash(svg));
  await f.put('parts/body.svg', completed);
  await f.put('stages/completion-check/body.json', { groupId: 'body', passed: true, beforeHash: svgHash(svg), afterHash: svgHash(completed) });
  value = await f.get();
  assert.deepEqual(value.part.groups[0].webPhases, { outline: 'done', review: 'done', reduction: 'done', completion: 'done', completionCheck: 'done', children: 'pending' });
  assert.deepEqual(await readFile(join(f.task, pipeline, 'groups.json')), original, 'display must not save restored steps');
  await f.put('groups.json', { groups: [{ ...group, childrenAnalysis: { sourceHash: svgHash(completed) }, groups: [{ id: 'body/torso', kind: 'part', groups: [] }] }] });
  value = await f.get();
  assert.equal(value.part.groups[0].webPhases.children, 'done');
  assert.equal(value.part.groups[0].groups[0].webPhases.outline, 'pending');
  await f.put('stages/completion-check/body.json', { groupId: 'body', passed: true, beforeHash: svgHash(svg), afterHash: 'stale' });
  assert.equal((await f.get()).part.groups[0].webPhases.completionCheck, 'available');
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
  await f.put('stages/outline/hair.draft.svg', svg);
  let value = await f.get();
  assert.deepEqual(value.part.groups.map(node => node.webPhases.outline), ['running', 'available', 'pending']);
  await f.put('agents/current/result.json', { status: 'completed' });
  await f.put('stages/outline/body.svg', svg);
  await f.put('agents/review/request.json', { task: { name: '组轮廓review-body' } });
  value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'done');
  assert.equal(value.part.groups[0].webPhases.review, 'running');
  run.runner.finishedAt = new Date().toISOString(); await saveRun(f.task, run);
  assert.equal((await f.get()).part.groups[0].webPhases.review, 'pending');
});

test('unsafe group paths and symlinked drafts cannot expose outside files', async t => {
  const f = await fixture(t);
  await f.put('groups.json', { groups: [{ id: '../../../private', groups: [] }] });
  assert.match((await f.get()).errors.join(), /group id 无效/);
  await f.put('groups.json', { groups: [{ id: 'body', groups: [] }] });
  await mkdir(join(f.task, 'part-layering/stages/outline'), { recursive: true });
  await writeFile(join(f.dir, 'private.svg'), svg);
  await symlink(join(f.dir, 'private.svg'), join(f.task, 'part-layering/stages/outline/body.svg'));
  const value = await f.get();
  assert.equal(value.part.groups[0].webPhases.outline, 'pending');
  assert.ok(!value.files.includes('part-layering/stages/outline/body.svg'));
});
