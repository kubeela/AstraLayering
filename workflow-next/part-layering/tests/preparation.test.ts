import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import type { AgentTask } from '../agents.ts';
import { getPreparationDirectory, loadPreparedReferences, prepareReferences } from '../preparation.ts';
import { createPreparationSteps } from '../run.ts';

const styleReference = fileURLToPath(new URL('../resources/简化参考图片.png', import.meta.url));
const outfitReference = fileURLToPath(new URL('../resources/连体服参考.jpg', import.meta.url));

async function fixture(t: TestContext, needsSimplification: boolean) {
  const temporary = await mkdtemp(join(tmpdir(), 'part-layering-preparation-'));
  const runName = `test-${randomUUID()}`;
  t.after(async () => {
    await rm(temporary, { recursive: true, force: true });
    await rm(dirname(getPreparationDirectory(runName)), { recursive: true, force: true });
  });
  const bytes = await readFile(styleReference);
  const original = join(temporary, 'original.png');
  const generated = join(temporary, 'generated.png');
  await writeFile(original, bytes);
  await writeFile(generated, bytes);
  const calls: AgentTask[] = [];
  const steps = createPreparationSteps({
    async run(task) {
      calls.push(task);
      if (!task.imageGeneration) {
        return { text: JSON.stringify({ needsSimplification, reason: '测试画风判断' }), images: [] };
      }
      return { text: JSON.stringify({ savedPath: generated, error: null }), images: [{ savedPath: generated }] };
    },
  });
  return { original, generated, runName, calls, steps, bytes };
}

test('无需简化仍执行换装，判断和换装各收到正确的两张图片', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['参考判断', '素体换装']);
  assert.deepEqual(f.calls[0].images?.map(image => image.path), [refs.originalImage, styleReference]);
  assert.deepEqual(f.calls[1].images?.map(image => image.path), [refs.simplifiedSubject, outfitReference]);
  assert.deepEqual(await readFile(refs.simplifiedSubject), f.bytes);
  assert.deepEqual(await readFile(refs.baseSubject), f.bytes);
  assert.equal(JSON.parse(await readFile(refs.judgment, 'utf8')).reason, '测试画风判断');
});

test('需要简化时先转换画风再换装，续跑不依赖外部原图', async t => {
  const f = await fixture(t, true);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['参考判断', '简化图片', '素体换装']);
  assert.deepEqual(f.calls[1].images?.map(image => image.path), [refs.originalImage, styleReference]);
  assert.deepEqual(f.calls[2].images?.map(image => image.path), [refs.simplifiedSubject, outfitReference]);
  await rm(f.original);
  f.calls.length = 0;
  const messages: string[] = [];
  const resumed = await prepareReferences({ runName: f.runName }, f.steps, message => messages.push(message));
  assert.deepEqual(resumed, refs);
  assert.equal(f.calls.length, 0);
  assert.equal(messages.filter(message => message.includes('沿用已有')).length, 3);

  await rm(refs.baseSubject);
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['素体换装']);
});

test('续跑兼容旧判断记录，并拒绝无效 PNG 文件', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  await writeFile(refs.judgment, JSON.stringify({ needsSimplification: false }));
  f.calls.length = 0;
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(f.calls.length, 0);
  await rm(refs.baseSubject);
  await writeFile(f.generated, 'not a PNG');
  await assert.rejects(prepareReferences({ runName: f.runName }, f.steps), /did not produce a PNG/);
  await assert.rejects(readFile(refs.baseSubject), { code: 'ENOENT' });
});

test('显式组的参考入口只读已有产物，缺失时不补图或调用 agent', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  f.calls.length = 0;
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
  await rm(refs.simplifiedSubject);
  await rm(refs.baseSubject);
  await assert.rejects(loadPreparedReferences(f.runName), /simplified-subject\.\*[\s\S]*base-subject\.png/);
  assert.equal(f.calls.length, 0);
  await assert.rejects(readFile(refs.simplifiedSubject), { code: 'ENOENT' });
  await assert.rejects(readFile(refs.baseSubject), { code: 'ENOENT' });
});
