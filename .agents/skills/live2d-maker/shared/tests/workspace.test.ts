import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { executionPaths, prepareWorkspace, workspacePrompt } from '../agents/workspace.ts';
import { contextImages, prepareFileInputs, referencesDirectory } from '../agents/inputs.ts';
import { CodexAgents } from '../codex/agents.ts';
import { loadWorkflowEnvironment } from '../codex/environment.ts';
import { textResult } from '../codex/function-tools.ts';
import { publishReportAssets } from '../report-assets.ts';
import { planWorkspaceMigration, applyWorkspaceMigration } from '../workspace-migration.ts';
import { fakeAppServer } from '../../part-layering/tests/fake-app-server.ts';

async function fixture(t: { after(callback: () => Promise<unknown>): void }) {
  const root = await mkdtemp(join(tmpdir(), 'astra-workspaces-'));
  t.after(() => rm(root, { recursive: true, force: true })); return root;
}

test('input preparation only materializes requested files in references and leaves upstream/context inputs unchanged', async t => {
  const root = await fixture(t), output = join(root, 'step02'), source = join(root, 'upstream.png');
  const bytes = Buffer.from([0, 1, 2, 255]); await writeFile(source, bytes);
  assert.deepEqual(contextImages([{ path: 'upstream.png', description: 'reference' }], root),
    [{ path: source, description: 'reference' }]);
  assert.deepEqual(await prepareFileInputs(output, []), {});
  await assert.rejects(readFile(join(referencesDirectory(output), 'upstream.png')), { code: 'ENOENT' });
  const inputs = await prepareFileInputs(output, [
    { name: 'guide.md', content: 'input guide' }, { name: 'derived/crop.png', content: bytes },
  ]);
  assert.equal(await readFile(inputs['guide.md'], 'utf8'), 'input guide');
  assert.deepEqual(await readFile(inputs['derived/crop.png']), bytes);
  assert.deepEqual(await readFile(source), bytes);
  assert.ok(Object.values(inputs).every(path => path.startsWith(referencesDirectory(output) + '/')));
  await assert.rejects(prepareFileInputs(output, [{ name: '../escape.png', source }]));
  await assert.rejects(prepareFileInputs(output, [{ name: 'same', content: '' }, { name: 'same', content: '' }]));
});

test('native Codex executes and resumes in the step workspace; tools keep their schema and logical path base', async t => {
  const root = await fixture(t), output = join(root, 'step01');
  const server = await fakeAppServer(root, [{ tool: 'probe', arguments: {} }]);
  const paths = await prepareWorkspace({ cwd: root, outputDirectory: output }, root);
  const tool = { name: 'probe', description: 'unchanged', inputSchema: { type: 'object' },
    async execute(_args: unknown, _signal: AbortSignal, context?: typeof paths) {
      assert.deepEqual(context, paths);
      await mkdir(join(context!.workspace, 'arbitrary/01'), { recursive: true });
      await writeFile(join(context!.workspace, 'arbitrary/01/draft.py'), 'intermediate');
      return textResult({ ok: true });
    } };
  const agents = new CodexAgents({ environment: loadWorkflowEnvironment({}, root), cwd: root,
    logDirectory: join(root, 'agents'), codexPathOverride: server.executable });
  const task = { name: 'probe', prompt: 'draw', cwd: root, outputDirectory: output, tools: [tool] };
  const session = agents.createSession();
  const first = await session.run(task); await session.close();
  const resumed = agents.createSession(first.threadId!);
  const second = await resumed.run(task); await resumed.close();
  assert.equal(second.threadId, first.threadId);
  const protocol = (await readFile(server.capture, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  for (const call of protocol.filter(item => ['thread/start', 'thread/resume'].includes(item.method))) {
    assert.equal(call.params.cwd, paths.workspace);
    assert.deepEqual(call.params.dynamicTools[0].inputSchema, tool.inputSchema);
  }
  for (const result of [first, second]) {
    const request = JSON.parse(await readFile(join(result.logDirectory!, 'request.json'), 'utf8'));
    assert.equal(request.workspace, paths.workspace); assert.equal(request.outputDirectory, output);
    assert.ok(result.logDirectory!.startsWith(join(root, 'agents/')));
    assert.equal(request.prompt, workspacePrompt('draw', paths));
  }
  assert.equal(await readFile(join(paths.workspace, 'arbitrary/01/draft.py'), 'utf8'), 'intermediate');
  assert.equal(executionPaths({ cwd: root, step: 'part_children', name: '直属结构拆分-face/eye' }, root).workspace,
    join(root, 'groups/face/children/eye/step03/workspace'));
  assert.equal(executionPaths({ cwd: root, step: 'part_base_subject' }, root).workspace, join(root, 'preparation/step07/workspace'));
});

test('report publication preserves bytes and the chosen folder, and leaves unrelated intermediates in workspace', async t => {
  const root = await fixture(t), paths = await prepareWorkspace({ cwd: root, outputDirectory: 'step01' }, root);
  const image = join(paths.workspace, '自由目录/01/evidence.png');
  await mkdir(join(paths.workspace, '自由目录/01'), { recursive: true });
  const bytes = Buffer.from([0, 1, 2, 255]); await writeFile(image, bytes);
  await writeFile(join(paths.workspace, 'unrelated.py'), 'draft');
  const report = join(paths.outputDirectory, 'review-01.md.tmp');
  await writeFile(report, `结论：通过\n\n![证据](<${image}>)\n`);
  await publishReportAssets(report, paths.workspace);
  assert.deepEqual(await readFile(join(paths.outputDirectory, '自由目录/01/evidence.png')), bytes);
  const text = await readFile(report, 'utf8'); assert.ok(!text.includes(paths.workspace));
  assert.match(text, /evidence\.png/);
  assert.equal(await readFile(join(paths.workspace, 'unrelated.py'), 'utf8'), 'draft');
  await assert.rejects(readFile(join(paths.outputDirectory, 'unrelated.py')), { code: 'ENOENT' });
});

test('completed task migration preserves deliveries and raw logs, moves scratch and metadata, and repairs report links', async t => {
  const root = await fixture(t), pipeline = join(root, 'character-assembly'), step = join(pipeline, 'step01');
  const request = join(pipeline, 'agents/request'), old = join(request, 'workspace');
  await mkdir(join(old, 'inspect/01'), { recursive: true }); await mkdir(step);
  const delivery = Buffer.from('original KRA'); await writeFile(join(step, 'character-assembled.kra'), delivery);
  await writeFile(join(step, '.completed'), JSON.stringify({ stamp: 'keep', inputs: {}, outputs: { 'character-assembled.kra': 'before', 'report.md': 'before' } })); await writeFile(join(step, 'draft.py'), 'scratch');
  await writeFile(join(step, 'events.jsonl'), 'scheduler events');
  await writeFile(join(request, 'request.json'), JSON.stringify({ task: { name: 'assembly', step: 'assembly', cwd: pipeline } }));
  await writeFile(join(request, 'events.jsonl'), 'original raw events');
  const image = join(old, 'inspect/01/evidence.png'); await writeFile(image, 'evidence');
  await writeFile(join(step, 'report.md'), `结论：通过\n\n![evidence](${image})`);
  await writeFile(join(step, 'review.json'), JSON.stringify({ reviews: [{ observations: [{ savedPath: image, mode: 'blend' }] }] }));
  const plan = await planWorkspaceMigration(root);
  assert.ok(plan.some(move => move.source === join(step, 'draft.py')));
  assert.ok(!plan.some(move => move.source === join(step, 'character-assembled.kra')));
  await applyWorkspaceMigration(root, plan);
  assert.deepEqual(await readFile(join(step, 'character-assembled.kra')), delivery);
  const receipt = JSON.parse(await readFile(join(step, '.completed'), 'utf8'));
  assert.equal(receipt.stamp, 'keep');
  assert.notEqual(receipt.outputs['report.md'], 'before');
  assert.equal(await readFile(join(request, 'events.jsonl'), 'utf8'), 'original raw events');
  assert.equal(await readFile(join(step, 'workspace/draft.py'), 'utf8'), 'scratch');
  assert.equal(await readFile(join(pipeline, 'agents/steps/step01/events.jsonl'), 'utf8'), 'scheduler events');
  assert.equal(await readFile(join(step, 'inspect/01/evidence.png'), 'utf8'), 'evidence');
  assert.ok(!(await readFile(join(step, 'report.md'), 'utf8')).includes('/agents/request/workspace/'));
  const review = JSON.parse(await readFile(join(step, 'review.json'), 'utf8'));
  assert.equal(review.reviews[0].observations[0].savedPath, join(step, 'inspect/01/evidence.png'));
});
