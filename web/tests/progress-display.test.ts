import assert from 'node:assert/strict';
import { test } from 'node:test';
import { displayStatus, groupArtifacts, groupPhases, groupPreviewArtifacts, groupSummary, statusNames, stepArtifacts } from '../progress.js';

test('normal progress has four labels; a partly finished group remains available', () => {
  assert.deepEqual(Object.values(statusNames), ['待执行', '进行中', '已有产物', '已完成', '执行失败']);
  const group = { webPhases: Object.fromEntries(groupPhases.map(([id]) => [id, 'pending'])) };
  assert.equal(groupSummary(group).text, '待执行');
  group.webPhases.outline = 'done'; assert.equal(groupSummary(group).text, '已有产物');
  group.webPhases.review = 'running'; assert.equal(groupSummary(group).text, '进行中');
  group.webPhases = Object.fromEntries(groupPhases.map(([id]) => [id, 'done']));
  assert.equal(groupSummary(group).text, '已完成');
});

test('failure is explicit, while interrupted execution keeps its intermediate artifacts', () => {
  assert.equal(displayStatus('failed', true), 'failed');
  assert.equal(displayStatus('failed', false), 'failed');
  assert.equal(statusNames.failed, '执行失败');
  assert.equal(groupSummary({ webPhases: { outline: 'failed', completion: 'available' } }).status, 'failed');
  for (const state of ['interrupted', 'unconfirmed']) {
    assert.equal(displayStatus(state, true), 'available');
    assert.equal(displayStatus(state, false), 'pending');
  }
});

for (const pipeline of ['part-layering', 'clothing-part-layering']) test(`${pipeline}: compact previews prefer the current draft over an older final image`, () => {
  const group = { id: 'body', webPhases: { completion: 'running' } };
  const artifacts = groupArtifacts(pipeline, group, 0);
  const draft = pipeline + '/parts/body.draft.svg', final = pipeline + '/parts/body.svg';
  const files = new Set([draft, final, pipeline + '/stages/outline/body.svg']);
  const versions = { [draft]: '300:1', [final]: '200:1' };
  assert.equal(groupPreviewArtifacts(group, artifacts, files, versions)[0].path, draft);
  group.webPhases.completion = 'pending';
  assert.equal(groupPreviewArtifacts(group, artifacts, files, versions)[0].path, draft);
  files.delete(draft); assert.equal(groupPreviewArtifacts(group, artifacts, files, versions)[0].path, final);
});

test('both part pipelines expose their saved depth candidate at the depth step', () => {
  for (const index of [0, 2]) assert.ok(stepArtifacts[index].occlusion.some(item => item.path.endsWith('/stages/occlusion/candidate.svg') && item.kind === 'image'));
});
