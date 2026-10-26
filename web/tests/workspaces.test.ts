import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { inventory } from '../files.ts';
import { legacyWorkspaces } from '../workspaces.ts';
import { copiedInput } from '../kra-inputs.ts';

test('process folders reflect arbitrary workspace layouts and remain separate from deliveries', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const component = source.slice(source.indexOf('function processArtifacts('), source.indexOf('function flowCard('));
  const files = ['raster-layering/step01/workspace/root.py', 'raster-layering/step01/workspace/inspect/01/a.png',
    'raster-layering/step01/workspace/custom/02/b.png', 'raster-layering/step01/evidence.png', 'raster-layering/step01/prompt.md'];
  const html = runInNewContext(component + '\nprocessArtifacts(0,{id:"step01"});', {
    data: { files }, stages: [{ id: 'raster-layering' }], stepArtifacts: [{}], esc: String,
    shadowInspectionArtifacts: () => [], artifacts: (items: unknown[]) => JSON.stringify(items),
  });
  assert.match(html, /3 个过程文件/); assert.match(html, /1 个补充产物/);
  for (const folder of ['workspace 根目录', 'inspect/01', 'custom/02']) assert.ok(html.includes(folder));
  assert.ok(!html.includes('prompt.md'));
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
  const files = await inventory(root);
  assert.ok(files.some(path => path.endsWith('/draft.png')));
  assert.ok(files.some(path => path.endsWith('/tmp/intermediate.png')));
  assert.ok(!files.some(path => /auth-settings|library\.png/.test(path)));
  assert.deepEqual(await legacyWorkspaces(root, files), { 'character-assembly/step01': ['character-assembly/agents/request/workspace'] });
  const input = join(root, 'input.kra'), copy = join(old, 'copy.kra');
  await writeFile(input, 'input'); await writeFile(copy, 'input');
  assert.equal(await copiedInput(copy, [input]), true);
  await writeFile(copy, 'edited'); assert.equal(await copiedInput(copy, [input]), false);
});
