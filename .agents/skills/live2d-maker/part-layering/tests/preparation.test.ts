import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import type { AgentTask } from '../../shared/codex/agents.ts';
import { getPreparationDirectory, loadPreparedReferences, prepareReferences } from '../preparation.ts';
import { createPreparationSteps } from '../run.ts';
import { taskDirectory } from '../../shared/paths.ts';
import sharp from 'sharp';
import { formatAgentError } from '../../shared/codex/diagnostics.ts';

const styleReference = fileURLToPath(new URL('../resources/简化参考图片.png', import.meta.url));
const outfitReference = fileURLToPath(new URL('../resources/连体服参考.jpg', import.meta.url));

async function fixture(t: TestContext, needsSimplification: boolean, needsAdjustment = false) {
  const temporary = await mkdtemp(join(tmpdir(), 'part-layering-preparation-'));
  const runName = `test-${randomUUID()}`;
  t.after(async () => {
    await rm(temporary, { recursive: true, force: true });
    await rm(taskDirectory(runName), { recursive: true, force: true });
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
        return { text: JSON.stringify(task.name === '姿态判断' ? { needsAdjustment, reason: '测试姿态判断' }
          : { needsSimplification, reason: '测试画风判断' }), images: [] };
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
  assert.deepEqual(f.calls[0].images?.map(image => image.path), [refs.standardImage, styleReference]);
  assert.deepEqual(f.calls[1].images?.map(image => image.path), [refs.simplifiedSubject, outfitReference]);
  assert.deepEqual(await readFile(refs.simplifiedSubject), f.bytes);
  assert.deepEqual(await readFile(refs.baseSubject), f.bytes);
  assert.deepEqual(await readFile(refs.standardImage!), f.bytes);
  assert.deepEqual(await readFile(refs.originalImage!), f.bytes);
  assert.equal(JSON.parse(await readFile(refs.judgment, 'utf8')).reason, '测试画风判断');
});

test('需要简化时先转换画风再换装，续跑不依赖外部原图', async t => {
  const f = await fixture(t, true);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['参考判断', '简化图片', '素体换装']);
  assert.deepEqual(f.calls[1].images?.map(image => image.path), [refs.standardImage, styleReference]);
  assert.deepEqual(f.calls[2].images?.map(image => image.path), [refs.simplifiedSubject, outfitReference]);
  await rm(f.original);
  f.calls.length = 0;
  const messages: string[] = [];
  const resumed = await prepareReferences({ runName: f.runName }, f.steps, message => messages.push(message));
  assert.deepEqual(resumed, refs);
  assert.equal(f.calls.length, 0);
  assert.equal(messages.filter(message => message.includes('沿用已有')).length, 4);

  await rm(refs.baseSubject);
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['素体换装']);
});

test('续跑兼容旧判断记录，并拒绝无效 PNG 文件', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  await rm(join(refs.directory, 'preparation.json'));
  await rm(refs.standardImage!);
  await writeFile(refs.judgment, JSON.stringify({ needsSimplification: false }));
  f.calls.length = 0;
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(f.calls.length, 0);
  await rm(refs.baseSubject);
  await writeFile(f.generated, 'not a PNG');
  await assert.rejects(prepareReferences({ runName: f.runName }, f.steps), /did not produce a PNG/);
  await assert.rejects(readFile(refs.baseSubject), { code: 'ENOENT' });
});

test('原图不是 PNG 时保留原始字节，standard 和不简化的参考都是真实 PNG', async t => {
  const f = await fixture(t, false);
  const jpeg = f.original.replace('.png', '.jpg');
  const bytes = await sharp(f.original).jpeg().toBuffer();
  await writeFile(jpeg, bytes);
  const refs = await prepareReferences({ runName: f.runName, image: jpeg }, f.steps);
  assert.deepEqual(await readFile(refs.originalImage!), bytes);
  assert.ok(refs.originalImage!.endsWith('.jpg'));
  for (const path of [refs.standardImage!, refs.simplifiedSubject]) assert.equal((await sharp(path).metadata()).format, 'png');
  assert.deepEqual(f.calls.map(task => task.name), ['参考判断', '素体换装']);
});

test('--standard 先判断；已标准仅复制，需要调整才传一张原图给原生生图，后续引用新图', async t => {
  for (const adjust of [false, true]) await t.test(String(adjust), async t => {
    const f = await fixture(t, true, adjust);
    await sharp({ create: { width: 24, height: 32, channels: 4, background: '#b0907080' } }).png().toFile(f.generated);
    const refs = await prepareReferences({ runName: f.runName, image: f.original, standard: true }, f.steps);
    assert.deepEqual(f.calls.map(task => task.name), ['姿态判断', ...(adjust ? ['标准姿态'] : []), '参考判断', '简化图片', '素体换装']);
    const judge = f.calls[0];
    assert.equal(judge.images!.length, 1);
    assert.equal(judge.images![0].path, refs.originalImage);
    const generation = f.calls.find(task => task.name === '标准姿态');
    if (adjust) {
      assert.equal(generation!.imageGeneration, true);
      assert.equal(generation!.images!.length, 1);
      assert.equal(generation!.images![0].path, refs.originalImage);
      assert.deepEqual(await readFile(refs.standardImage!), await readFile(f.generated));
    } else assert.deepEqual(await readFile(refs.standardImage!), f.bytes);
    for (const name of ['参考判断', '简化图片']) assert.equal(f.calls.find(task => task.name === name)!.images![0].path, refs.standardImage);
    assert.deepEqual(await readFile(refs.originalImage!), f.bytes);
    f.calls.length = 0;
    assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
    assert.equal(f.calls.length, 0);
    assert.equal(JSON.parse(await readFile(join(refs.directory, 'preparation.json'), 'utf8')).standard, true);
  });
});

test('标准生图异常保留选项和判断，续跑无需再次传 --standard 或重做判断', async t => {
  const f = await fixture(t, false, true);
  const failed = createPreparationSteps({ async run() {
    return { text: '没有 image_generation 工具，无法生图', images: [], threadId: 'standard-thread', logDirectory: '/logs/standard' };
  } });
  await assert.rejects(prepareReferences({ runName: f.runName, image: f.original, standard: true },
    { ...f.steps, standardize: failed.standardize }), error => {
    assert.match(formatAgentError(error), /模型最后消息：[\s\S]*没有 image_generation[\s\S]*standard-thread/);
    return true;
  });
  const directory = getPreparationDirectory(f.runName);
  await assert.rejects(readFile(join(directory, 'standard.png')), { code: 'ENOENT' });
  const state = JSON.parse(await readFile(join(directory, 'preparation.json'), 'utf8'));
  assert.equal(state.standard, true); assert.equal(state.standardJudgment.decision.needsAdjustment, true);
  f.calls.length = 0;
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['标准姿态', '参考判断', '素体换装']);
});

test('无效姿态判断和无效生成图片明确报错，不回退原图', async t => {
  const f = await fixture(t, false, true);
  const invalid = createPreparationSteps({ async run() {
    return { text: '{"needsAdjustment":"no"}', images: [], threadId: 'invalid-decision' };
  } });
  await assert.rejects(prepareReferences({ runName: f.runName, image: f.original, standard: true }, invalid), error => {
    assert.match(formatAgentError(error), /boolean needsAdjustment[\s\S]*invalid-decision/); return true;
  });
  await writeFile(f.generated, 'invalid PNG');
  await assert.rejects(prepareReferences({ runName: f.runName }, f.steps), /did not produce a PNG/);
  await assert.rejects(readFile(join(getPreparationDirectory(f.runName), 'standard.png')), { code: 'ENOENT' });
});

test('输入、选项或任一已跟踪参考变化时不修改文件、不调用模型；只读入口同样校验', async t => {
  for (const change of ['originalImage', 'standardImage', 'judgment', 'simplifiedSubject', 'baseSubject', 'mode'] as const) {
    await t.test(change, async t => {
      const f = await fixture(t, false);
      const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
      if (change === 'judgment') await writeFile(refs.judgment, JSON.stringify({ needsSimplification: true }));
      else if (change !== 'mode') await writeFile(refs[change]!, 'changed content');
      const before = await readFile(join(refs.directory, 'preparation.json'));
      f.calls.length = 0;
      const standard = change === 'mode' ? true : undefined;
      await assert.rejects(prepareReferences({ runName: f.runName, standard }, f.steps), /参考或选项已变化/);
      await assert.rejects(loadPreparedReferences(f.runName, undefined, standard), /参考或选项已变化/);
      assert.deepEqual(await readFile(join(refs.directory, 'preparation.json')), before);
      assert.equal(f.calls.length, 0);
    });
  }
});

test('重新生成同内容参考保留拆分；内容改变时拒绝复用后续参考，只重置本 part 缓存', async t => {
  const f = await fixture(t, true);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  const parts = join(dirname(refs.directory), 'parts'), group = join(dirname(refs.directory), 'groups.json');
  await mkdir(parts); await writeFile(join(parts, 'old.svg'), 'old'); await writeFile(group, 'groups');
  const raster = join(taskDirectory(f.runName), 'raster-layering');
  await mkdir(join(raster, 'step01'), { recursive: true });
  await writeFile(join(raster, 'run.json'), '{"threadId":"kept-thread"}');
  await writeFile(join(raster, 'step01/.completed'), 'done');
  await rm(refs.simplifiedSubject);
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(await readFile(group, 'utf8'), 'groups');
  await rm(refs.simplifiedSubject);
  await sharp({ create: { width: 24, height: 32, channels: 4, background: '#a0708080' } }).png().toFile(f.generated);
  const baseBefore = await readFile(refs.baseSubject);
  f.calls.length = 0;
  await assert.rejects(prepareReferences({ runName: f.runName }, f.steps), /base-subject.png/);
  assert.deepEqual(await readFile(refs.baseSubject), baseBefore);
  assert.deepEqual(f.calls.map(task => task.name), ['简化图片']);
  assert.equal(await readFile(group, 'utf8'), 'groups');
  await rm(refs.baseSubject);
  await prepareReferences({ runName: f.runName }, f.steps);
  await assert.rejects(readFile(group), { code: 'ENOENT' });
  await assert.rejects(readFile(join(parts, 'old.svg')), { code: 'ENOENT' });
  assert.equal(JSON.parse(await readFile(join(raster, 'run.json'), 'utf8')).threadId, 'kept-thread');
  assert.equal(await readFile(join(raster, 'step01/.completed'), 'utf8'), 'done');
});

test('切换模式须显式重做 standard；若生成内容不变，后续仍复用', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  await rm(refs.standardImage!);
  f.calls.length = 0;
  const resumed = await prepareReferences({ runName: f.runName, standard: true }, f.steps);
  assert.deepEqual(resumed, refs);
  assert.deepEqual(f.calls.map(task => task.name), ['姿态判断']);
  assert.equal(JSON.parse(await readFile(join(refs.directory, 'preparation.json'), 'utf8')).standard, true);
});

test('旧任务没有原图也能续跑；启用标准化不冒充已有参考来源，只读加载不迁移', async t => {
  const f = await fixture(t, false);
  const directory = getPreparationDirectory(f.runName);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'judgment.json'), '{"needsSimplification":false}');
  await writeFile(join(directory, 'simplified-subject.jpg'), 'legacy reference');
  await writeFile(join(directory, 'base-subject.png'), f.bytes);
  assert.equal((await loadPreparedReferences(f.runName)).standardImage, undefined);
  await assert.rejects(readFile(join(directory, 'preparation.json')), { code: 'ENOENT' });
  await assert.rejects(prepareReferences({ runName: f.runName, image: f.original, standard: true }, f.steps), /旧 preparation/);
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(refs.standardImage, undefined); assert.equal(f.calls.length, 0);
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
  assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
  const record = await readFile(join(directory, 'preparation.json'));
  await assert.rejects(prepareReferences({ runName: f.runName, image: f.original, standard: true }, f.steps), /旧 preparation/);
  assert.deepEqual(await readFile(join(directory, 'preparation.json')), record);
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
