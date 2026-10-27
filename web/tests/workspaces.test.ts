import { processFileList } from '../process-files.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { inventory } from '../files.ts';
import { legacyWorkspaces } from '../workspaces.ts';
import { copiedInput, inputKras } from '../kra-inputs.ts';

test('process folders reflect arbitrary workspace layouts and remain separate from deliveries', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const component = source.slice(source.indexOf('function processArtifacts('), source.indexOf('function flowCard('));
  const files = ['raster-layering/step01/workspace/root.py', 'raster-layering/step01/workspace/inspect/01/a.png',
    'raster-layering/step01/workspace/custom/02/b.png', 'raster-layering/step01/workspace/prompt.md', 'raster-layering/step01/workspace/archive/result.json', 'raster-layering/step01/evidence.png', 'raster-layering/step01/stray.png', 'raster-layering/step01/prompt.md'];
  // Outside workspace, only report-cited evidence is a supplementary delivery; uncited leftovers stay hidden.
  const reports = { review: { images: [{ path: 'raster-layering/step01/evidence.png' }] } };
  const html = runInNewContext(component + '\nprocessArtifacts(0,{id:"step01"});', {
    processFileList, data: { files, pipelines: [{ reports }] }, reportEvidence: () => '', stages: [{ id: 'raster-layering' }], stepArtifacts: [{}], esc: String,
    shadowInspectionArtifacts: () => [], artifacts: (items: unknown[]) => JSON.stringify(items),
  });
  assert.match(html, /5 个过程文件/); assert.match(html, /1 个补充产物/);
  for (const folder of ['workspace 根目录', 'inspect/01', 'custom/02', 'archive']) assert.ok(html.includes(folder));
  assert.ok(html.includes('workspace/prompt.md'));
  assert.ok(!html.includes('step01/prompt.md'));
  assert.ok(html.includes('step01/evidence.png')); assert.ok(!html.includes('stray.png'));
  assert.ok(html.includes('workspace/archive/result.json'));
});

test('inventory ignores credentials and virtualenv assets; old workspace lookup and exact input-copy filtering stay compatible', async t => {
  const root = await mkdtemp(join(tmpdir(), 'astra-web-workspaces-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const request = join(root, 'character-assembly/agents/request'), old = join(request, 'workspace');
  await mkdir(join(old, 'any-layout'), { recursive: true }); await mkdir(join(old, 'environment'), { recursive: true });
  await writeFile(join(old, 'environment/pyvenv.cfg'), 'environment');
  await writeFile(join(old, 'environment/library.png'), 'software asset');
  await writeFile(join(request, 'auth-settings.json'), 'secret'); await writeFile(join(old, 'any-layout/draft.png'), 'draft');
  await mkdir(join(old, 'tmp')); await writeFile(join(old, 'tmp/intermediate.png'), 'draft');
  await writeFile(join(request, 'request.json'), JSON.stringify({ task: { step: 'assembly', name: 'assembly' } }));
  await mkdir(join(root, 'part-layering/observations/outline'), { recursive: true });
  await writeFile(join(root, 'part-layering/observations/outline/legacy.png'), 'old history');
  await mkdir(join(root, 'part-layering/groups/face/step01/workspace/observations'), { recursive: true });
  await writeFile(join(root, 'part-layering/groups/face/step01/workspace/observations/current.png'), 'current history');
  const files = await inventory(root);
  assert.ok(files.includes('part-layering/observations/outline/legacy.png'));
  assert.ok(files.includes('part-layering/groups/face/step01/workspace/observations/current.png'));
  assert.ok(files.some(path => path.endsWith('/draft.png')));
  assert.ok(files.some(path => path.endsWith('/tmp/intermediate.png')));
  assert.ok(!files.some(path => /auth-settings|library\.png/.test(path)));
  assert.deepEqual(await legacyWorkspaces(root, files), { 'character-assembly/step01': ['character-assembly/agents/request/workspace'] });
  const input = join(root, 'input.kra'), copy = join(old, 'copy.kra');
  await writeFile(input, 'input'); await writeFile(copy, 'input');
  assert.equal(await copiedInput(copy, [input]), true);
  await writeFile(copy, 'edited'); assert.equal(await copiedInput(copy, [input]), false);
});

test('task-relative records: request outputDirectory and input .kra paths resolve against the task root', async t => {
  const root = await mkdtemp(join(tmpdir(), 'astra-web-relative-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const request = join(root, 'part-layering/agents/request');
  await mkdir(join(request, 'workspace'), { recursive: true }); await writeFile(join(request, 'workspace/draft.png'), 'draft');
  await writeFile(join(request, 'request.json'), JSON.stringify({ outputDirectory: 'part-layering/groups/face/step01', task: { step: 'part_outline' } }));
  assert.deepEqual(await legacyWorkspaces(root, await inventory(root)), { 'part-layering/groups/face/step01': ['part-layering/agents/request/workspace'] });
  assert.deepEqual(inputKras({ a: 'raster-layering/step01/character-depth.kra', b: '/old/run/input.kra', c: '../outside.kra', d: 'note.png' }, root),
    [join(root, 'raster-layering/step01/character-depth.kra'), '/old/run/input.kra']);
});

test('root and nested process folders share 1000 slots equally, each retaining its newest files', () => {
  const roots = ['raster-layering/step01/workspace'], versions: Record<string, string> = {}, files: string[] = [];
  for (const folder of ['inspect/01', 'review', 'observations', '']) for (let i = 0; i < 600; i++) {
    const path = roots[0] + '/' + (folder ? folder + '/' : '') + `${i}.png`; files.push(path); versions[path] = `${i + (folder === 'review' ? 10000 : 0)}:100`;
  }
  const formal = 'raster-layering/step01/report.md'; files.push(formal);
  const result = processFileList(files, roots, versions);
  assert.equal(result.total, 2400); assert.equal(result.shown, 1000);
  assert.equal(result.folders.length, 4);
  assert.ok(result.folders.every(folder => folder.total === 600 && folder.files.length === 250));
  assert.ok(result.folders.every(folder => folder.files.every(path => Number(path.split('/').at(-1)!.split('.')[0]) >= 350)));
  assert.ok(!result.folders.flatMap(folder => folder.files).includes(formal));
});

test('small folders release unused shares; remaining slots are split evenly and deterministically', () => {
  const files = ['root-1.md', 'root-2.md', ...['inspect/01', 'review'].flatMap(folder =>
    Array.from({ length: 10 }, (_, index) => `${folder}/${index}.png`))];
  const versions = Object.fromEntries(files.map((file, index) => [file, `${index}:100`]));
  const result = processFileList(files, [''], versions, 9);
  assert.equal(result.total, 22); assert.equal(result.shown, 9);
  assert.deepEqual(result.folders.map(folder => [folder.folder, folder.files.length]), [['', 2], ['inspect/01', 4], ['review', 3]]);
  assert.deepEqual(result.folders[1].files, ['inspect/01/9.png', 'inspect/01/8.png', 'inspect/01/7.png', 'inspect/01/6.png']);
  assert.deepEqual(processFileList([...files].reverse(), [''], versions, 9), result);
});

test('a single folder can use all 1000 slots; empty and small listings retain exact counts', () => {
  const files = Array.from({ length: 1500 }, (_, index) => `inspect/${index}.png`);
  const versions = Object.fromEntries(files.map((file, index) => [file, `${index}:100`]));
  const result = processFileList(files, [''], versions);
  assert.equal(result.total, 1500); assert.equal(result.shown, 1000);
  assert.equal(result.folders[0].files[0], 'inspect/1499.png');
  assert.equal(result.folders[0].files.at(-1), 'inspect/500.png');
  assert.deepEqual(processFileList([], ['']), { total: 0, shown: 0, folders: [] });
  assert.equal(processFileList(files.slice(0, 3), ['']).shown, 3);
});
