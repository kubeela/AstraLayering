import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync } from 'fflate';
import sharp from 'sharp';
import { KRAPreviews } from '../kra-preview.ts';
import { createWorkbench } from '../server.ts';
import { snapshot } from '../snapshot.ts';
import { pipelineSteps } from '../progress.js';

test('raster review 位于 step01，step02 只有边缘精修', () => {
  for (const i of [1, 3]) {
    assert.deepEqual(pipelineSteps[i][0].children.map(step => step.id), ['draw', 'review-01', 'repair-01', 'review-02', 'repair-02']);
    assert.equal(pipelineSteps[i][1].children.length, 0);
  }
});

test('最新 KRA 保存画面通过真实 HTTP 预览，不采用过期导出或控制图；重写后刷新', async t => {
  const base = await mkdtemp(join(tmpdir(), 'kra-workbench-')), task = join(base, 'case'), step = join(task, 'raster-layering/step02');
  await mkdir(step, { recursive: true });
  t.after(() => rm(base, { recursive: true, force: true }));
  const png = async (color: string) => sharp({ create: { width: 16, height: 20, channels: 4, background: color } }).png().toBuffer();
  const old = await png('#ff0000'), current = await png('#00ff00');
  const main = join(step, 'character-soft-edges.kra'), draft = join(step, 'working.kra');
  await writeFile(main, zipSync({ 'mergedimage.png': old })); await utimes(main, 1, 1);
  await writeFile(draft, zipSync({ 'mergedimage.png': current, 'huge-unused-entry': new Uint8Array(1024) }));
  await writeFile(join(step, 'old-export.png'), old);
  const before = await readFile(draft), value = await snapshot(task, 'case', base);
  assert.equal(value.pipelines[1].previews.step02.path, 'raster-layering/step02/working.kra');
  assert.ok(value.fileVersions['raster-layering/step02/working.kra']);
  const server = await createWorkbench({ defaultDir: base, settingsPath: join(base, 'settings.json') });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise<void>(done => server.close(() => done())));
  const url = `http://127.0.0.1:${(server.address() as any).port}/artifact?` + new URLSearchParams({ name: 'case', dir: base,
    path: value.pipelines[1].previews.step02.path, preview: 'kra' });
  const first = await fetch(url);
  assert.equal(first.status, 200); assert.equal(first.headers.get('content-type'), 'image/png');
  assert.deepEqual(await sharp(Buffer.from(await first.arrayBuffer())).raw().toBuffer(), await sharp(current).raw().toBuffer());
  assert.deepEqual(await readFile(draft), before);
  await writeFile(draft, zipSync({ 'mergedimage.png': old }));
  const changed = await fetch(url);
  assert.deepEqual(await sharp(Buffer.from(await changed.arrayBuffer())).raw().toBuffer(), await sharp(old).raw().toBuffer());
  const after = await snapshot(task, 'case', base);
  assert.notEqual(after.fileVersions[value.pipelines[1].previews.step02.path], value.fileVersions[value.pipelines[1].previews.step02.path]);
});

test('损坏或缺少合成图的 KRA 明确报错，不伪装为其他图片', async t => {
  const base = await mkdtemp(join(tmpdir(), 'kra-preview-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const file = join(base, 'draft.kra'), previews = new KRAPreviews();
  await writeFile(file, zipSync({ 'preview.png': new Uint8Array(0) }));
  await assert.rejects(previews.get(file, 'first'), /尚未保存有效/);
  await writeFile(file, 'incomplete zip');
  await assert.rejects(previews.get(file, 'second'));
});
