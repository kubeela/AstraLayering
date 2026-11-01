import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { convertLayout, layoutState, requireCurrentLayout } from '../layout.ts';
import { readRun } from '../state.ts';

const sha = (value: unknown) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
async function put(root: string, path: string, value: unknown) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), typeof value === 'string' ? value : JSON.stringify(value));
}
const json = async (root: string, path: string) => JSON.parse(await readFile(join(root, path), 'utf8'));

// A small task in the previous layout: part preparation, a reduction, one
// group's completion, shadow mask and the legacy run records.
async function previousTask(t: { after(fn: () => Promise<void>): void }) {
  const runs = await mkdtemp(join(tmpdir(), 'layout-')), task = join(runs, 'demo');
  t.after(() => rm(runs, { recursive: true, force: true }));
  const part = join(task, 'part-layering');
  await put(task, 'run.json', { version: 1, name: 'demo', pipelines: { 'part-layering': { status: 'completed' } }, from: 'part-layering', to: 'shadow', jobs: 1, status: 'failed', activePipelines: ['shadow'] });
  await put(part, 'references/standard.png', 'standard');
  const standardOutputs = { '../../references/standard.png': sha('standard') };
  await put(part, 'preparation/step04/.completed', { stamp: sha(standardOutputs), inputs: {}, outputs: standardOutputs });
  await put(part, 'preparation/step05/.completed', { stamp: 'retired', inputs: { step04: sha(standardOutputs) } });
  await put(part, 'layers/depth01/a.svg', '<svg/>');
  const layer = { 'part-layering/layers/depth01/a.svg': sha('<svg/>') };
  await put(part, 'layers/depth01/.completed', { stamp: sha({ 'a.svg': sha('<svg/>') }), inputs: {}, outputs: layer, paths: 'task' });
  await put(part, 'parts/a.svg', '<svg id="a"/>');
  const completion = { '../../../parts/a.svg': sha('<svg id="a"/>') };
  await put(part, 'groups/a/step02/.completed', { stamp: sha(completion), inputs: { 'layers/depth01#a.svg': sha('<svg/>') }, outputs: completion });
  await put(part, 'groups/a/step02/report.md', '[layer](../../../layers/depth01/a.svg)');
  await put(part, 'agents/steps/groups/a/step01/session.json', { threadId: 'outline-thread' });
  await put(task, 'shadow/mask/step01/.completed', { stamp: 'mask', inputs: { 'part-layering/occlusion': 'x' } });
  await put(task, 'shadow/mask/run.json', { version: 2, name: 'demo', threadId: 'shadow-thread' });
  await put(task, 'shadow/mask/agents/sessions.json', { mask: {} });
  await put(task, 'shadow/normal-depth/step02/.previous-1/old.png', 'old');
  return { runs, task };
}

test('a previous-layout task converts as a whole after a full backup, keeping its step markers', async t => {
  const { runs, task } = await previousTask(t);
  assert.equal(await layoutState(task), 'previous');
  await assert.rejects(readRun(task), /旧版目录布局/);
  const result = await convertLayout(task);
  assert.equal(await layoutState(task), 'current');
  await requireCurrentLayout(task);
  assert.equal((await readRun(task))!.sections['part-layering']?.status, 'completed');
  const run = await json(task, 'run.json');
  assert.deepEqual([run.activeSections, run.activePipelines, run.pipelines], [['shadow'], undefined, undefined]);

  // The backup is the untouched old directory.
  assert.equal(dirname(result.backup), join(runs, '.backups'));
  assert.ok((await json(result.backup, 'part-layering/preparation/step05/.completed')).inputs);

  const part = join(task, 'part-layering');
  // Step records convert to plain empty markers.
  for (const marker of ['step04_standard', 'step10_reduce/depth01', 'step11_completion/a']) assert.equal(await readFile(join(part, marker, '.completed'), 'utf8'), '');
  await assert.rejects(readdir(join(part, 'preparation')), { code: 'ENOENT' });
  assert.equal(await readFile(join(part, 'step11_completion/a/report.md'), 'utf8'), '[layer](../../step10_reduce/depth01/a.svg)');
  // agents/ records are not read or renamed; legacy thread fields are dropped.
  assert.deepEqual(await json(part, 'agents/steps/groups/a/step01/session.json'), { threadId: 'outline-thread' });

  const shadow = join(task, 'shadow');
  assert.equal(await readFile(join(shadow, 'step01_mask/.completed'), 'utf8'), '');
  await assert.rejects(readFile(join(shadow, 'run.json')), { code: 'ENOENT' });
  assert.deepEqual(await json(shadow, 'agents/sessions.json'), { mask: {} });
  assert.deepEqual((await readdir(shadow)).sort(), ['agents', 'step01_mask']);
  await assert.rejects(convertLayout(task), /无需转换/);
});

test('unknown old paths abort before any change; layouts older than the previous one are refused', async t => {
  const { runs, task } = await previousTask(t);
  await put(task, 'part-layering/preparation/step09/x.json', {});
  await assert.rejects(convertLayout(task), /未做任何改动/);
  assert.ok((await json(task, 'run.json')).pipelines);
  await assert.rejects(readdir(join(runs, '.backups')), { code: 'ENOENT' });

  await put(task, 'part-layering/references/preparation.json', {});
  await assert.rejects(layoutState(task), /早于 v0\.1\.3/);
});
