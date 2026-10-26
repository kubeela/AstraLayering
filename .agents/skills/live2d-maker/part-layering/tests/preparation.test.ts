import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import type { AgentTask } from '../../shared/codex/agents.ts';
import { getPreparationDirectory, loadPreparedReferences, prepareReferences, type PreparationReferences } from '../preparation.ts';
import { configureRun } from '../../workflow/state.ts';
import { createPreparationSteps } from '../run.ts';
import { taskDirectory } from '../../shared/paths.ts';
import sharp from 'sharp';
import { formatAgentError } from '../../shared/codex/diagnostics.ts';

// The preparation section and its fixed step numbers.
const section = (refs: { directory: string } | string) => join(dirname(typeof refs === 'string' ? refs : refs.directory), 'preparation');
const stages = ['original', 'options', 'pose', 'standard', 'judgment', 'simplified', 'base', 'ready'];
const step = (stage: string) => `step0${stages.indexOf(stage) + 1}`;
const optionsPath = (refs: { directory: string } | string) => join(section(refs), step('options'), 'options.json');

const styleReference = fileURLToPath(new URL('../resources/简化参考图片.png', import.meta.url));
const outfitReference = fileURLToPath(new URL('../resources/连体服参考.jpg', import.meta.url));

async function fixture(t: TestContext, needsSimplification: boolean, needsAdjustment = false, reuseBase = false) {
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
      if ((task.name === '参考判断与简化' && !needsSimplification) || (task.name === '素体换装' && reuseBase)) {
        const tool = task.tools!.find(tool => tool.name === 'reuse_reference')!;
        const result = await tool.execute({ reason: task.name === '参考判断与简化' ? '测试画风判断' : '无需替换主体衣装' }, new AbortController().signal);
        const saved = JSON.parse((result.contentItems[0] as { text: string }).text);
        return { text: JSON.stringify({ savedPath: saved.savedPath, error: null, reason: saved.reason }), images: [] };
      }
      if (!task.imageGeneration) {
        return { text: JSON.stringify(task.name === '姿态判断' ? { needsAdjustment, reason: '测试姿态判断' }
          : { needsSimplification, reason: '测试画风判断' }), images: [] };
      }
      return { text: JSON.stringify({ savedPath: generated, error: null, reason: '测试转换依据' }), images: [{ savedPath: generated }] };
    },
  });
  return { original, generated, runName, calls, steps, bytes };
}

test('无需简化仍执行换装，判断和换装各收到正确的两张图片', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['参考判断与简化', '素体换装']);
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
  assert.deepEqual(f.calls.map(task => task.name), ['参考判断与简化', '素体换装']);
  assert.deepEqual(f.calls[0].images?.map(image => image.path), [refs.standardImage, styleReference]);
  assert.deepEqual(f.calls[1].images?.map(image => image.path), [refs.simplifiedSubject, outfitReference]);
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

test('简化和素体各一次 agent 调用，复用分支保持参考字节且正常续跑零调用', async t => {
  const f = await fixture(t, false, false, true);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  assert.deepEqual(f.calls.map(call => call.name), ['参考判断与简化', '素体换装']);
  for (const task of f.calls) {
    assert.equal(task.tools?.length, 1);
    assert.equal(task.tools![0].name, 'reuse_reference');
    assert.ok(!task.prompt.includes('{image_execution_rules}'));
  }
  assert.deepEqual(await readFile(refs.simplifiedSubject), await readFile(refs.standardImage!));
  assert.deepEqual(await readFile(refs.baseSubject), await readFile(refs.simplifiedSubject));
  assert.equal(JSON.parse(await readFile(refs.judgment, 'utf8')).needsSimplification, false);
  await assert.rejects(readFile(join(section(refs), step('base'), 'judgment.json')), { code: 'ENOENT' });
  f.calls.length = 0;
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
});

test('复用工具只接受理由，输入和输出路径固定且单次复制', async t => {
  const f = await fixture(t, false);
  const target = join(dirname(f.original), 'reused.png');
  const steps = createPreparationSteps({ async run(task) {
    const tool = task.tools!.find(tool => tool.name === 'reuse_reference')!;
    const signal = new AbortController().signal;
    await assert.rejects(tool.execute({ reason: '复用', output: f.original }, signal), /只接受非空 reason/);
    const result = await tool.execute({ reason: '已满足要求' }, signal);
    assert.equal(JSON.parse((result.contentItems[0] as { text: string }).text).savedPath, target);
    await assert.rejects(tool.execute({ reason: '再次复制' }, signal), /已经复制完成/);
    return { text: JSON.stringify({ savedPath: target, error: null, reason: '已满足要求' }), images: [] };
  } });
  assert.equal(await steps.baseSubject(f.original, target, 'test prompt'), 'reused');
  assert.deepEqual(await readFile(target), f.bytes);
  assert.deepEqual(await readFile(f.original), f.bytes);
});

test('模型仅返回已有路径而未执行工具时，拒绝冒充已完成的参考', async t => {
  const f = await fixture(t, false);
  const target = join(dirname(f.original), 'missing.png');
  const steps = createPreparationSteps({ async run() {
    return { text: JSON.stringify({ savedPath: f.original, error: null, reason: '声称复用' }), images: [] };
  } });
  await assert.rejects(steps.baseSubject(f.original, target, 'test prompt'), /did not produce an image/);
  await assert.rejects(readFile(target), { code: 'ENOENT' });
});

test('复制与生图互斥，混合分支保留输入并阻止正式参考发布', async t => {
  const f = await fixture(t, false);
  const mixed = createPreparationSteps({ async run(task) {
    await task.tools![0].execute({ reason: '先复用' }, new AbortController().signal);
    return { text: JSON.stringify({ savedPath: f.generated, error: null, reason: '又生图' }), images: [{ savedPath: f.generated }] };
  } });
  await assert.rejects(prepareReferences({ runName: f.runName, image: f.original },
    { ...f.steps, baseSubject: mixed.baseSubject }), /同时执行了复制与生图/);
  const directory = getPreparationDirectory(f.runName);
  await assert.rejects(readFile(join(directory, 'base-subject.png')), { code: 'ENOENT' });
  assert.equal((await readdir(directory)).some(name => name.startsWith('base-subject.png.')), false);
  assert.deepEqual(await readFile(f.original), f.bytes);
});

test('素体准备中断后只恢复素体 agent，复用前面已完成的判断和简化', async t => {
  const f = await fixture(t, true, false, true);
  await assert.rejects(prepareReferences({ runName: f.runName, image: f.original },
    { ...f.steps, async baseSubject() { throw new Error('测试中断'); } }), /测试中断/);
  const directory = getPreparationDirectory(f.runName);
  const judgment = await readFile(join(directory, 'judgment.json'));
  f.calls.length = 0;
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(call => call.name), ['素体换装']);
  assert.deepEqual(await readFile(join(directory, 'judgment.json')), judgment);
  assert.deepEqual(await readFile(join(directory, 'base-subject.png')), await readFile(join(directory, 'simplified-subject.png')));
});

test('旧版只有画风判断的未完成任务直接完成生图，完整结果继续复用', async t => {
  const f = await fixture(t, true);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  await legacyRecord(refs);
  f.calls.length = 0;
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(call => call.name), []);
  await rm(refs.simplifiedSubject);
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(call => call.name), ['简化图片', '素体换装']);
  assert.ok(!f.calls[0].prompt.includes('reuse_reference'));
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
});

test('发布简化参考前核对缓存哈希，异常缓存停止发布且不新增模型调用', async t => {
  const f = await fixture(t, true);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  const cached = join(section(refs), step('judgment'), 'reference.png');
  await rm(refs.simplifiedSubject);
  await writeFile(cached, 'changed cache');
  f.calls.length = 0;
  await assert.rejects(prepareReferences({ runName: f.runName }, f.steps), /简化参考缓存缺失或内容改变/);
  assert.equal(f.calls.length, 0);
  await assert.rejects(readFile(refs.simplifiedSubject), { code: 'ENOENT' });
});

const legacyHash = (...inputs: (string | boolean)[]) => createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
const sha = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');
// Rebuild what earlier runs left behind: preparation.json and no step records.
async function legacyRecord(refs: PreparationReferences, edit: (state: any) => void = () => {}) {
  const { preparedImageHash: _cache, ...legacyDecision } = JSON.parse(await readFile(refs.judgment, 'utf8'));
  await writeFile(refs.judgment, JSON.stringify(legacyDecision));
  const [original, standard, judgment, simplified, base] = await Promise.all(
    [refs.originalImage!, refs.standardImage!, refs.judgment, refs.simplifiedSubject, refs.baseSubject].map(sha));
  const state = { version: 1, standard: false, files: {
    standard: { inputHash: legacyHash(original, false), outputHash: standard },
    judgment: { inputHash: legacyHash(standard), outputHash: judgment },
    simplified: { inputHash: legacyHash(standard, legacyDecision.needsSimplification), outputHash: simplified },
    base: { inputHash: legacyHash(simplified), outputHash: base } }, partReferencesHash: legacyHash(simplified, base) };
  edit(state);
  await rm(section(refs), { recursive: true });
  await writeFile(join(refs.directory, 'preparation.json'), JSON.stringify(state));
}

test('旧 preparation.json 一次性转换为步骤记录，之后不再使用；记录与文件不符时拒绝', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  const group = join(dirname(refs.directory), 'groups.json');
  await writeFile(group, 'groups');
  await legacyRecord(refs);
  assert.equal((await configureRun({ name: f.runName }, taskDirectory(f.runName))).standard, false);
  await assert.rejects(loadPreparedReferences(f.runName), /尚未转换/);
  f.calls.length = 0;
  assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
  assert.equal(f.calls.length, 0);
  await assert.rejects(readFile(join(refs.directory, 'preparation.json')), { code: 'ENOENT' });
  assert.deepEqual(JSON.parse(await readFile(optionsPath(refs), 'utf8')), { standard: false });
  assert.equal(await readFile(group, 'utf8'), 'groups');
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);

  // A stale recorded input reruns that step and what follows it, and resets the parts.
  await legacyRecord(refs, state => { state.files.simplified.inputHash = 'stale'; });
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['素体换装']);
  await assert.rejects(readFile(group), { code: 'ENOENT' });

  await legacyRecord(refs);
  await writeFile(refs.baseSubject, 'swapped');
  await assert.rejects(prepareReferences({ runName: f.runName }, f.steps), /与记录不一致/);
  assert.ok(JSON.parse(await readFile(join(refs.directory, 'preparation.json'), 'utf8')).files);
  assert.equal(await readFile(refs.baseSubject, 'utf8'), 'swapped');
});

test('删除产物即重试该步骤；无效 PNG 明确报错，不留下正式参考', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
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
  assert.deepEqual(f.calls.map(task => task.name), ['参考判断与简化', '素体换装']);
});

test('--standard 先判断；已标准仅复制，需要调整才传一张原图给原生生图，后续引用新图', async t => {
  for (const adjust of [false, true]) await t.test(String(adjust), async t => {
    const f = await fixture(t, true, adjust);
    await sharp({ create: { width: 24, height: 32, channels: 4, background: '#b0907080' } }).png().toFile(f.generated);
    const refs = await prepareReferences({ runName: f.runName, image: f.original, standard: true }, f.steps);
    assert.deepEqual(f.calls.map(task => task.name), ['姿态判断', ...(adjust ? ['标准姿态'] : []), '参考判断与简化', '素体换装']);
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
    assert.equal(f.calls.find(task => task.name === '参考判断与简化')!.images![0].path, refs.standardImage);
    assert.deepEqual(await readFile(refs.originalImage!), f.bytes);
    f.calls.length = 0;
    assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
    assert.equal(f.calls.length, 0);
    assert.deepEqual(JSON.parse(await readFile(optionsPath(refs), 'utf8')), { standard: true });
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
  assert.deepEqual(JSON.parse(await readFile(optionsPath(directory), 'utf8')), { standard: true });
  assert.equal(JSON.parse(await readFile(join(section(directory), step('pose'), 'judgment.json'), 'utf8')).needsAdjustment, true);
  f.calls.length = 0;
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['标准姿态', '参考判断与简化', '素体换装']);
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
      const markers = section(refs);
      const before = await Promise.all(['original', 'standard', 'judgment', 'simplified', 'base', 'ready'].map(id => readFile(join(markers, step(id), '.completed'))));
      f.calls.length = 0;
      const standard = change === 'mode' ? true : undefined, error = change === 'mode' ? /不能直接切换/ : /不能直接续跑/;
      await assert.rejects(prepareReferences({ runName: f.runName, standard }, f.steps), error);
      await assert.rejects(loadPreparedReferences(f.runName, undefined, standard), error);
      assert.deepEqual(await Promise.all(['original', 'standard', 'judgment', 'simplified', 'base', 'ready'].map(id => readFile(join(markers, step(id), '.completed')))), before);
      if (change !== 'mode' && change !== 'judgment') assert.equal(await readFile(refs[change]!, 'utf8'), 'changed content');
      assert.equal(f.calls.length, 0);
    });
  }
});

test('删除参考即重试该步骤：依赖它的后续参考随之重做，只重置本 part 缓存，不动 raster', async t => {
  const f = await fixture(t, true);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  const parts = join(dirname(refs.directory), 'parts'), group = join(dirname(refs.directory), 'groups.json');
  await mkdir(parts); await writeFile(join(parts, 'old.svg'), 'old'); await writeFile(group, 'groups');
  const raster = join(taskDirectory(f.runName), 'raster-layering');
  await mkdir(join(raster, 'step01'), { recursive: true });
  await writeFile(join(raster, 'run.json'), '{"threadId":"kept-thread"}');
  await writeFile(join(raster, 'step01/.completed'), 'done');
  await rm(refs.simplifiedSubject);
  await sharp({ create: { width: 24, height: 32, channels: 4, background: '#a0708080' } }).png().toFile(f.generated);
  f.calls.length = 0;
  await prepareReferences({ runName: f.runName }, f.steps);
  assert.deepEqual(f.calls.map(task => task.name), ['素体换装']);
  await assert.rejects(readFile(group), { code: 'ENOENT' });
  await assert.rejects(readFile(join(parts, 'old.svg')), { code: 'ENOENT' });
  assert.equal(JSON.parse(await readFile(join(raster, 'run.json'), 'utf8')).threadId, 'kept-thread');
  assert.equal(await readFile(join(raster, 'step01/.completed'), 'utf8'), 'done');
});

test('切换模式须对 options 显式重试，其后的参考随之重做', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  f.calls.length = 0;
  await assert.rejects(prepareReferences({ runName: f.runName, standard: true }, f.steps), /不能直接切换[\s\S]*preparation\/step02\/\.completed/);
  await rm(join(section(refs), step('options'), '.completed'));
  const resumed = await prepareReferences({ runName: f.runName, standard: true }, f.steps);
  assert.deepEqual(resumed, refs);
  assert.deepEqual(f.calls.map(task => task.name), ['姿态判断', '参考判断与简化', '素体换装']);
  assert.deepEqual(JSON.parse(await readFile(optionsPath(refs), 'utf8')), { standard: true });
});

test('旧任务没有原图也能续跑；启用标准化不冒充已有参考来源，只读加载不转换', async t => {
  const f = await fixture(t, false);
  const directory = getPreparationDirectory(f.runName);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'judgment.json'), '{"needsSimplification":false}');
  await writeFile(join(directory, 'simplified-subject.jpg'), 'legacy reference');
  await writeFile(join(directory, 'base-subject.png'), f.bytes);
  assert.equal((await loadPreparedReferences(f.runName)).standardImage, undefined);
  await assert.rejects(readdir(section(directory)), { code: 'ENOENT' });
  await assert.rejects(prepareReferences({ runName: f.runName, image: f.original, standard: true }, f.steps), /不能直接切换/);
  const refs = await prepareReferences({ runName: f.runName }, f.steps);
  assert.equal(refs.standardImage, undefined); assert.equal(f.calls.length, 0);
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
  assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
  const record = await readFile(join(section(directory), step('options'), '.completed'));
  await assert.rejects(prepareReferences({ runName: f.runName, image: f.original, standard: true }, f.steps), /不能直接切换/);
  assert.deepEqual(await readFile(join(section(directory), step('options'), '.completed')), record);
});

test('显式组的参考入口只读已有产物，缺失时不补图或调用 agent', async t => {
  const f = await fixture(t, false);
  const refs = await prepareReferences({ runName: f.runName, image: f.original }, f.steps);
  f.calls.length = 0;
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
  await rm(refs.simplifiedSubject);
  await rm(refs.baseSubject);
  await assert.rejects(loadPreparedReferences(f.runName), /simplified-subject\.png[\s\S]*base-subject\.png/);
  assert.equal(f.calls.length, 0);
  await assert.rejects(readFile(refs.simplifiedSubject), { code: 'ENOENT' });
  await assert.rejects(readFile(refs.baseSubject), { code: 'ENOENT' });
});

// Rebuild the layout of earlier runs: records under references/.steps/<stage>
// keyed by stage names, with the options in references/options.json.
async function oldStepLayout(refs: PreparationReferences) {
  const old = join(refs.directory, '.steps'), root = section(refs), stamps = new Map<string, string>();
  const back = (path: string) => path === optionsPath(refs) ? join(refs.directory, 'options.json')
    : path.startsWith(join(root, step('pose')) + '/') ? join(old, 'pose', relative(join(root, step('pose')), path)) : path;
  const records = [];
  for (const name of (await readdir(root)).sort()) {
    const stage = stages[Number(name.slice(4)) - 1], record = JSON.parse(await readFile(join(root, name, '.completed'), 'utf8'));
    const outputs = record.outputs && Object.fromEntries(Object.entries(record.outputs)
      .map(([output, hash]) => [relative(join(old, stage), back(resolve(root, name, output))), hash]));
    const stamp = outputs ? createHash('sha256').update(JSON.stringify(outputs)).digest('hex') : record.stamp;
    stamps.set(record.stamp, stamp);
    records.push({ name, stage, record: { ...record, stamp, ...(outputs ? { outputs } : {}) } });
  }
  await mkdir(old);
  for (const { name, stage, record } of records) {
    await cp(join(root, name), join(old, stage), { recursive: true });
    const inputs = Object.fromEntries(Object.entries(record.inputs as Record<string, string>)
      .map(([dependency, stamp]) => [stages[Number(dependency.slice(4)) - 1], stamps.get(stamp) ?? stamp]));
    await writeFile(join(old, stage, '.completed'), JSON.stringify({ ...record, inputs }) + '\n');
  }
  await rename(join(old, 'options', 'options.json'), join(refs.directory, 'options.json'));
  await rm(root, { recursive: true });
}

test('旧 references/.steps 步骤记录原样迁入 preparation/stepNN，不重做任何步骤', async t => {
  const f = await fixture(t, false, true);
  const refs = await prepareReferences({ runName: f.runName, image: f.original, standard: true }, f.steps);
  const records = await Promise.all(stages.map(stage => readFile(join(section(refs), step(stage), '.completed'), 'utf8')));
  await oldStepLayout(refs);
  await assert.rejects(loadPreparedReferences(f.runName), /尚未转换/);
  f.calls.length = 0;
  assert.deepEqual(await prepareReferences({ runName: f.runName }, f.steps), refs);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(await Promise.all(stages.map(stage => readFile(join(section(refs), step(stage), '.completed'), 'utf8'))), records);
  await assert.rejects(readFile(join(refs.directory, 'options.json')), { code: 'ENOENT' });
  await assert.rejects(readdir(join(refs.directory, '.steps')), { code: 'ENOENT' });
  assert.deepEqual(await loadPreparedReferences(f.runName), refs);
});
