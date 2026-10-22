import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { inspectDraftPreview } from '../preview.ts';
import { inputFingerprint, resolveShadowInput } from '../input.ts';
import { stepsFor } from '../steps.ts';
import { createLightingTool, validateLighting } from '../lighting.ts';
import { defaults } from '../../../../../web/studio/lighting-model.js';

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
  assert.equal((await inspectDraftPreview('case', f.root))?.status, 'awaiting-lighting');
});
test('Changed input and invalid normals are not exposed as pending maps', async t => {
  const f = await fixture(t);
  await writeFile(join(f.source, 'character-assembled.kra'), 'changed KRA');
  assert.equal(await inspectDraftPreview('case', f.root), undefined);
  await writeFile(join(f.source, 'character-assembled.kra'), 'original KRA');
  await sharp({ create: { width: 64, height: 96, channels: 3, background: 'white' } }).png().toFile(join(f.output, 'normal.png'));
  assert.equal(await inspectDraftPreview('case', f.root), undefined);
});
test('Registered lighting tool runs the studio renderer, records full parameters and rejects stale final results', async t => {
  const f = await fixture(t), output = join(f.output, '../step02'), tool = createLightingTool(output, f.input);
  const signal = new AbortController().signal, settings = { ...defaults, shadow: false };
  assert.equal(tool.name, 'render_lighting');
  const before = await tool.execute({ settings: { ...settings, lightingMix: 0 }, final: false }, signal);
  await assert.rejects(readFile(join(output, 'light.json')), { code: 'ENOENT' });
  const after = await tool.execute({ settings: { ...settings, lightColor: '#ff9070', lightX: -2 }, final: true }, signal);
  assert.equal(after.success, true);
  const a = JSON.parse((before.contentItems[0] as any).text), b = JSON.parse((after.contentItems[0] as any).text);
  const source = await sharp(f.input.characterColor).ensureAlpha().raw().toBuffer();
  const unlit = await sharp(a.savedPath).ensureAlpha().raw().toBuffer();
  assert.ok(source.every((value, i) => i % 4 === 3 || Math.abs(value - unlit[i]) <= 1), '0% lighting preserves original RGB');
  assert.notEqual(a.previewHash, b.previewHash); assert.equal(b.width, 64); assert.equal(b.height, 96);
  assert.equal(b.settings.lightColor, '#ff9070');
  await validateLighting(output, f.input);
  await writeFile(join(f.output, 'normal.png'), 'changed map');
  await assert.rejects(validateLighting(output, f.input), /不匹配/);
});
