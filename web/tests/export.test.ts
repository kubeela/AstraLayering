import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { unzipSync } from 'fflate';
import { exportFixture } from '../../.agents/skills/live2d-maker/workflow/tests/export-fixture.ts';
import { exportCompletedRun } from '../../.agents/skills/live2d-maker/workflow/export.ts';
import { createWorkbench } from '../server.ts';
import { snapshot } from '../snapshot.ts';

test('archive snapshot preserves all pipeline/group states, reports and KRA previews with no workspace', async t => {
  const f = await exportFixture(t), destination = join(f.base, 'archive/case');
  const before = await snapshot(f.root, f.name, f.dir);
  await exportCompletedRun({ name: f.name, dir: f.dir, output: destination });
  const after = await snapshot(destination, f.name, join(f.base, 'archive'));
  assert.deepEqual(after.errors, []); assert.equal(after.archived, true); assert.equal(after.canExport, true); assert.equal(after.canStop, false);
  assert.equal(after.files.some(path => path.includes('workspace')), false);
  for (const [index, pipeline] of after.pipelines.entries()) {
    assert.deepEqual(pipeline.states, before.pipelines[index].states);
    assert.equal(pipeline.status, 'done');
    assert.deepEqual(pipeline.groups.map(group => group.webPhases), before.pipelines[index].groups.map(group => group.webPhases));
    assert.equal(Object.keys(pipeline.previews).length, Object.keys(before.pipelines[index].previews).length);
  }
  assert.equal(after.pipelines[1].reports.step01.images[0].path, 'raster-layering/step01/report-assets/inspect/cited.png');
  // Earlier archives omitted raster receipts. Their explicit archived facts
  // still show completion, provided the formal deliveries remain present.
  await rm(join(destination, 'raster-layering/step01/.completed'));
  await rm(join(destination, 'shadow/mask/step01/.completed'));
  const legacy = await snapshot(destination, f.name, join(f.base, 'archive'));
  assert.equal(legacy.pipelines[1].states.step01, 'done');
  assert.equal(legacy.pipelines[5].states.mask, 'done');
  await rm(join(destination, 'raster-layering/step01/character-depth.kra'));
  const missing = await snapshot(destination, f.name, join(f.base, 'archive'));
  assert.notEqual(missing.pipelines[1].states.step01, 'done');
});

test('HTTP export downloads the shared ZIP; incomplete and stale-directory requests are refused', async t => {
  const f = await exportFixture(t);
  const server = await createWorkbench({ defaultDir: f.dir, settingsPath: join(f.base, 'settings.json') });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const base = 'http://127.0.0.1:' + (server.address() as any).port;
  const url = base + '/api/export?' + new URLSearchParams({ dir: f.dir, name: f.name });
  const response = await fetch(url);
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'application/zip');
  assert.match(response.headers.get('content-disposition')!, /case.zip/);
  const zip = unzipSync(new Uint8Array(await response.arrayBuffer()));
  assert.deepEqual(Buffer.from(zip['case/raster-layering/step01/character-depth.kra']), f.kra);
  assert.ok(zip['case/part-layering/occlusion/preview.svg']);
  assert.equal((await fetch(base + '/api/export?' + new URLSearchParams({ dir: f.base, name: f.name }))).status, 409);
  await f.put('run.json', JSON.stringify({ ...f.run, status: 'failed' }));
  assert.equal((await fetch(url)).status, 400);
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /data\.canExport/); assert.match(app, /data-export/);
});
