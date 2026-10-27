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
  const base = join(dirname(upstream), 'base-subject.png');
  await sharp({ create: { width: 96, height: 128, channels: 4, background: '#a0b0c0' } }).png().toFile(base);
  const calls: AgentTask[] = [];
  const steps = createPreparationSteps({ async run(task) {
    calls.push(task);
    return { text: JSON.stringify({ savedPath: generated, error: null }), images: [{ savedPath: generated }] };
  } });
  return { temporary, directory, runName, input, upstream, base, generated, calls, steps };
}

test('preparation sends clothed and base references in order through one configured image task and resumes without external input', async t => {
  const f = await fixture(t);
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].imageGeneration, true);
  assert.match(f.calls[0].prompt, /image_gen\.imagegen/);
  assert.match(f.calls[0].prompt, /生图工具 imagegen（Codex 为内置 image_gen\.imagegen，其他模型为同名工具 imagegen/);
  assert.deepEqual(f.calls[0].images!.map(image => image.path), [refs.originalImage, f.base]);
  assert.equal(f.calls[0].step, 'clothing_preparation');
  assert.ok(f.calls[0].prompt.includes('96×128'));
  assert.ok(!f.calls[0].prompt.includes('{width}'));
  assert.deepEqual(await readFile(refs.originalImage!), await readFile(f.input));
  assert.deepEqual(await readFile(refs.baseSubject), await readFile(f.generated));
  assert.equal(refs.baseSubject, refs.simplifiedSubject);
  const record = JSON.parse(await readFile(refs.judgment, 'utf8'));
  assert.equal(record.version, 2);
  assert.equal(typeof record.baseInputHash, 'string');
  assert.notEqual(record.inputHash, record.baseInputHash);
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

test('new clothing generation requires the base reference before calling an agent', async t => {
  const f = await fixture(t);
  await rm(f.base);
  await assert.rejects(prepareReferences({ runName: f.runName }, f.steps), error => {
    assert.ok(error instanceof Error);
    assert.ok(error.message.includes(f.base));
    assert.match(error.message, /part-layering --name/);
    return true;
  });
  assert.equal(f.calls.length, 0);
  await assert.rejects(readFile(join(f.directory, 'clothing.png')), { code: 'ENOENT' });
});

test('changed base reference invalidates the new cache without deleting existing clothing or decomposition', async t => {
  const f = await fixture(t);
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  const oldBase = await readFile(f.base), oldClothing = await readFile(refs.baseSubject);
  const part = join(dirname(f.directory), 'parts/kept.svg');
  await mkdir(dirname(part), { recursive: true });
  await writeFile(part, 'keep existing decomposition');
  await sharp({ create: { width: 96, height: 128, channels: 4, background: '#405060' } }).png().toFile(f.base);
  await assert.rejects(loadPreparedReferences(f.runName), /base-subject 参考已变化/);
  await assert.rejects(prepareReferences({ runName: f.runName }, f.steps), /base-subject 参考已变化/);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(await readFile(refs.baseSubject), oldClothing);
  assert.equal(await readFile(part, 'utf8'), 'keep existing decomposition');
  await writeFile(f.base, oldBase);
  assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
  assert.equal(f.calls.length, 1);
});

test('legacy single-reference cache stays reusable without requiring or regenerating the base reference', async t => {
  const f = await fixture(t);
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  const record = JSON.parse(await readFile(refs.judgment, 'utf8'));
  record.version = 1;
  delete record.baseInputHash;
  await writeFile(refs.judgment, JSON.stringify(record));
  await rm(f.base);
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
  assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
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
  const archive = join(dirname(f.directory), 'preparation/step01/workspace/generation');
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
