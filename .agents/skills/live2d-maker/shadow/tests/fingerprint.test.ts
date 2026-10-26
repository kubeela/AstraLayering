import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { makePipeline } from '../run.ts';
import { fileHash } from '../input.ts';
import { maskSteps } from '../steps.ts';

test('known legacy recipe accepts unchanged inputs and rejects unknown fingerprints and source changes', async t => {
  const root = await mkdtemp(join(tmpdir(), 'shadow-fingerprint-')); t.after(() => rm(root, { recursive: true, force: true }));
  const paths = ['art.kra', 'art.png', 'simplified.png', 'groups.json', 'occlusion.json'].map(name => join(root, name));
  for (const path of paths) await writeFile(path, path);
  const input = { characterKra: paths[0], characterColor: paths[1], simplifiedCharacter: paths[2], structureFiles: paths.slice(3) };
  const recipes = JSON.parse(await readFile(new URL('../legacy-recipes.json', import.meta.url), 'utf8'));
  const prompt = (await readFile(maskSteps[0].prompt, 'utf8')).replace('先读运行信息中列出的 inputs.json、production.md', '先读 references/inputs.json、production.md');
  const hashes = await Promise.all(paths.map(fileHash));
  const recorded = createHash('sha256').update(JSON.stringify({ version: 1, mode: 'mask', hashes, prompt, rules: recipes[0].rules })).digest('hex');
  const pipeline = makePipeline('mask');
  assert.equal(await pipeline.compatibleInputFingerprint!(input, recorded), true);
  const current = await pipeline.fingerprintInput!(input);
  assert.equal(await pipeline.compatibleInputFingerprint!(input, current), true);
  assert.equal(await pipeline.compatibleInputFingerprint!(input, 'unknown-old-code'), false);
  for (const path of paths) {
    const before = await readFile(path); await writeFile(path, 'changed');
    assert.equal(await pipeline.compatibleInputFingerprint!(input, recorded), false);
    assert.notEqual(await pipeline.fingerprintInput!(input), current);
    await writeFile(path, before);
  }
});
