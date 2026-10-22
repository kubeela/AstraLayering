import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { inspectDraftPreview } from '../preview.ts';
import { inputFingerprint, resolveShadowInput } from '../input.ts';
import { stepsFor } from '../steps.ts';

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'astra-shadow-draft-')), task = join(root, 'case');
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(task, 'character-assembly/step01'), output = join(task, 'shadow/normal-depth/step01');
  const refs = join(task, 'part-layering/references');
  for (const dir of [source, output, refs]) await mkdir(dir, { recursive: true });
  await writeFile(join(source, 'character-assembled.kra'), 'original KRA');
  const color = await sharp({ create: { width: 64, height: 96, channels: 4, background: { r: 200, g: 170, b: 140, alpha: .7 } } }).png().toBuffer();
  await writeFile(join(source, 'character-assembled.png'), color);
  await writeFile(join(refs, 'simplified-subject.png'), color);
  for (const [name, rgb] of [['normal', [128,128,255]], ['depth', [180,180,180]]] as const) {
    await sharp({ create: { width: 64, height: 96, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).png().toFile(join(output, name + '.png'));
  }
  const input = await resolveShadowInput('case', root, 'normal-depth');
  await writeFile(join(output, '../run.json'), JSON.stringify({ inputFingerprint: await inputFingerprint(input, 'normal-depth', stepsFor('normal-depth')[0].prompt) }));
  await writeFile(join(task, 'shadow/selection.json'), '{"mode":"mask","accepted":true}');
  return { root, task, source, output, input };
}
test('Unified studio discovers pending maps read-only, without changing inputs, coverage or completion', async t => {
  const f = await fixture(t), before = await readdir(f.output);
  const normal = await readFile(join(f.output, 'normal.png')), selection = await readFile(join(f.task, 'shadow/selection.json'));
  const result = await inspectDraftPreview('case', f.root);
  assert.equal(result?.status, 'draft-awaiting-visual-review'); assert.equal(result.width, 64); assert.equal(result.height, 96);
  assert.ok(result.normalLengthMaxError < 0.001);
  assert.deepEqual(await readdir(f.output), before);
  assert.deepEqual(await readFile(join(f.output, 'normal.png')), normal);
  assert.deepEqual(await readFile(join(f.task, 'shadow/selection.json')), selection);
  await writeFile(join(f.output, '.completed'), '');
  assert.equal((await inspectDraftPreview('case', f.root))?.status, 'awaiting-publication');
});
test('Changed input and invalid normals are not exposed as pending maps', async t => {
  const f = await fixture(t);
  await writeFile(join(f.source, 'character-assembled.kra'), 'changed KRA');
  assert.equal(await inspectDraftPreview('case', f.root), undefined);
  await writeFile(join(f.source, 'character-assembled.kra'), 'original KRA');
  await sharp({ create: { width: 64, height: 96, channels: 3, background: 'white' } }).png().toFile(join(f.output, 'normal.png'));
  assert.equal(await inspectDraftPreview('case', f.root), undefined);
});
