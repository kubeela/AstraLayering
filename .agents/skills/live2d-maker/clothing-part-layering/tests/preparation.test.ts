import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test, type TestContext } from 'node:test';
import sharp from 'sharp';
import type { AgentTask } from '../../shared/codex/agents.ts';
import { createPreparationSteps, getPreparationDirectory, loadPreparedReferences, prepareReferences } from '../preparation.ts';
import { taskDirectory, pipelineDirectory } from '../../shared/paths.ts';

async function fixture(t: TestContext) {
  const temporary = await mkdtemp(join(tmpdir(), 'clothing-preparation-'));
  const runName = `fixture-${randomUUID()}`, directory = getPreparationDirectory(runName);
  t.after(async () => { await rm(temporary, { recursive: true, force: true }); await rm(taskDirectory(runName), { recursive: true, force: true }); });
  const input = join(temporary, 'simplified-character.png'), generated = join(temporary, 'generated.png');
  await sharp({ create: { width: 96, height: 128, channels: 4, background: '#c0c0c0' } }).png().toFile(input);
  await sharp({ create: { width: 96, height: 128, channels: 4, background: '#80a0c080' } }).png().toFile(generated);
  const upstream = join(pipelineDirectory(runName, 'part-layering'), 'references/simplified-subject.png');
  await mkdir(dirname(upstream), { recursive: true });
  await copyFile(input, upstream);
  await copyFile(input, join(dirname(upstream), 'standard.png'));
  const calls: AgentTask[] = [];
  const steps = createPreparationSteps({ async run(task) {
    calls.push(task);
    return { text: JSON.stringify({ savedPath: generated, error: null }), images: [{ savedPath: generated }] };
  } });
  return { temporary, directory, runName, input, upstream, generated, calls, steps };
}

test('preparation uses one configured image task, reads the upstream clothed image, and resumes without external input', async t => {
  const f = await fixture(t);
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].imageGeneration, true);
  assert.match(f.calls[0].prompt, /image_gen\.imagegen/);
  assert.match(f.calls[0].prompt, /不要求工具字面同名/);
  assert.equal(f.calls[0].images!.length, 1);
  assert.equal(f.calls[0].images![0].path, refs.originalImage);
  assert.equal(f.calls[0].step, 'clothing_preparation');
  assert.ok(f.calls[0].prompt.includes('96×128'));
  assert.ok(!f.calls[0].prompt.includes('{width}'));
  assert.deepEqual(await readFile(refs.originalImage!), await readFile(f.input));
  assert.deepEqual(await readFile(refs.baseSubject), await readFile(f.generated));
  assert.equal(refs.baseSubject, refs.simplifiedSubject);
  await rm(f.input);
  f.calls.length = 0;
  assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
});

test('deleting clothing reference regenerates from saved character and invalidates old decomposition', async t => {
  const f = await fixture(t);
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  await mkdir(join(dirname(f.directory), 'parts'), { recursive: true });
  await writeFile(join(dirname(f.directory), 'parts/old.svg'), 'old garment');
  await writeFile(join(dirname(f.directory), 'groups.json'), '{"groups":[]}');
  await rm(refs.baseSubject);
  await assert.rejects(loadPreparedReferences(f.runName), /尚未完成/);
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(f.calls.length, 2);
  await assert.rejects(readdir(join(dirname(f.directory), 'parts')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(dirname(f.directory), 'groups.json')), { code: 'ENOENT' });
});

test('missing native image tool leaves a retryable preparation without fake output', async t => {
  const f = await fixture(t);
  const failed = createPreparationSteps({ async run() { throw new Error('image_generation unavailable'); } });
  await assert.rejects(prepareReferences({ runName: f.runName }, failed), /unavailable/);
  await readFile(f.upstream);
  await assert.rejects(readFile(join(f.directory, 'simplified-character.png')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(f.directory, 'clothing.png')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(f.directory, 'preparation.json')), { code: 'ENOENT' });
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(f.calls.length, 1);
});

test('reject invalid or empty-foreground images, normalize differing dimensions', async t => {
  for (const mode of ['invalid', 'opaque', 'wrong-size'] as const) {
    await t.test(mode, async t => {
      const f = await fixture(t);
      if (mode === 'invalid') await writeFile(f.generated, 'not an image');
      else if (mode === 'opaque') await copyFile(f.input, f.generated);
      else await sharp({ create: { width: 32, height: 32, channels: 4, background: '#aabbcc80' } }).png().toFile(f.generated);
      if (mode === 'wrong-size') {
        const refs = await prepareReferences({ runName: f.runName }, f.steps);
        const m = await sharp(refs.baseSubject).metadata();
        assert.equal(m.width, 96); assert.equal(m.height, 128);
      } else {
        await assert.rejects(prepareReferences({ runName: f.runName }, f.steps));
        await assert.rejects(readFile(join(f.directory, 'preparation.json')), { code: 'ENOENT' });
      }
    });
  }
});

test('changed cached references are not silently reused; loading missing references does not write', async t => {
  const f = await fixture(t);
  await assert.rejects(loadPreparedReferences(f.runName));
  await assert.rejects(readdir(f.directory), { code: 'ENOENT' });
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  await writeFile(refs.originalImage!, 'changed source');
  await assert.rejects(loadPreparedReferences(f.runName), /参考已变化/);
  assert.equal(f.calls.length, 1);
});

test('衣服 preparation 不接受人物标准化选项', async t => {
  const f = await fixture(t);
  for (const standard of [true, false]) {
    await assert.rejects(prepareReferences({ runName: f.runName, standard }, f.steps), /只适用于人物 part/);
  }
  assert.equal(f.calls.length, 0);
});

test('衣服输出采用 standard 尺寸而非 simplified 尺寸，并记录自动处理', async t => {
  const f = await fixture(t);
  await sharp({ create: { width: 200, height: 200, channels: 4, background: '#8888' } }).png().toFile(join(dirname(f.upstream), 'standard.png'));
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  const m = await sharp(refs.baseSubject).metadata();
  assert.equal(m.width, 200); assert.equal(m.height, 200);
  const record = JSON.parse(await readFile(refs.judgment, 'utf8'));
  assert.equal(record.normalization, undefined);
  const archive = join(f.directory, 'archive');
  const entries = await readdir(archive);
  assert.equal(entries.length, 1);
  assert.deepEqual(await readFile(join(archive, entries[0], 'original.png')), await readFile(f.generated));
  const report = JSON.parse(await readFile(join(archive, entries[0], 'normalization.json'), 'utf8'));
  assert.deepEqual(report.target, [200, 200]);
  await rm(archive, { recursive: true });
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(f.calls.length, 1);
  assert.ok(record.standardHash);
  await loadPreparedReferences(f.runName);
  await assert.rejects(readFile(join(f.directory, 'standard.png')), { code: 'ENOENT' });
});
