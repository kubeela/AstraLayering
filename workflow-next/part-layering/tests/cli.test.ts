import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { getPreparationDirectory } from '../preparation.ts';
import { formatLayeringSummary, parseRunArguments, readGroupInput } from '../run.ts';
import { GroupStore, normalizeGroups } from '../groups.ts';
import sharp from 'sharp';
import { artifactPath, draftPath, publishSvg, reportPath, svgHash } from '../artifact-facts.ts';
import { shape } from './layering-fixture.ts';

test('命令行默认并发 5，支持 --jobs 和 -j', () => {
  assert.equal(parseRunArguments(['--name', 'test']).concurrency, 5);
  assert.equal(parseRunArguments(['--name', 'test', '--jobs', '2']).concurrency, 2);
  assert.equal(parseRunArguments(['--name', 'test', '-j', '7']).concurrency, 7);
  assert.equal(parseRunArguments(['--jobs=3']).concurrency, 3);
  assert.equal(parseRunArguments(['--groups', 'groups.json']).groups, 'groups.json');
});

test('agent 并发默认 3，通过 --agents / -a 独立于组调度设置', () => {
  assert.equal(parseRunArguments(['--name','test']).agentConcurrency, 3);
  const values = parseRunArguments(['--jobs','5','--agents','2']);
  assert.equal(values.concurrency, 5);
  assert.equal(values.agentConcurrency, 2);
  assert.equal(parseRunArguments(['-a','4']).agentConcurrency, 4);
  for (const value of ['0','-1','1.5','','abc','Infinity','9007199254740992']) {
    assert.throws(() => parseRunArguments([`--agents=${value}`]), /必须是正整数/);
  }
});

test('实际入口复用已有轮廓、补全与终止分析事实，停在合并占位，不调用模型', async t => {
  const runName = `test-cli-${randomUUID()}`;
  const references = getPreparationDirectory(runName);
  const directory = dirname(references);
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(references, { recursive: true });
  await writeFile(join(references, 'judgment.json'), JSON.stringify({ needsSimplification: false }));
  await writeFile(join(references, 'simplified-subject.png'), 'cached reference');
  await sharp({ create: { width: 100, height: 100, channels: 4, background: '#ffffff' } }).png().toFile(join(references, 'base-subject.png'));
  const svgPath = artifactPath(directory, 'head', 'outline');
  await mkdir(dirname(svgPath), { recursive: true });
  await writeFile(svgPath, shape('head'));
  const reviewPath = reportPath(directory, 'head', 'review');
  await mkdir(dirname(reviewPath), { recursive: true });
  await writeFile(reviewPath, JSON.stringify({ groupId: 'head', reviews: [{ verdict: 'pass', feedback: 'checked', candidateHash: svgHash(shape('head')) }] }));
  const part = artifactPath(directory, 'head', 'completion');
  await mkdir(dirname(part), { recursive: true });
  await writeFile(draftPath(part), shape('head'));
  await publishSvg(draftPath(part), part, svgHash(shape('head')));
  const check = reportPath(directory, 'head', 'completion-check');
  await mkdir(dirname(check), { recursive: true });
  await writeFile(check, JSON.stringify({ groupId: 'head', passed: true,
    beforeHash: svgHash(shape('head')), afterHash: svgHash(await readFile(part)) }));
  const children = reportPath(directory, 'head', 'children');
  await mkdir(dirname(children), { recursive: true });
  await writeFile(children, JSON.stringify({ groupId: 'head', sourceHash: svgHash(await readFile(part)), groups: [] }));
  const store = await GroupStore.open(directory);
  await store.update(document => { document.groups = normalizeGroups([{ id: 'head', note: '已有识别的组', steps: {
    outline: { status: 'completed', output: { path: svgPath } }, review: { status: 'completed', output: { path: svgPath } },
  } }]); });
  const groupsPath = join(directory, 'input.json');
  await writeFile(groupsPath, JSON.stringify([{ id: 'head', note: '不能覆盖已有的说明' }]));
  const entry = fileURLToPath(new URL('../run.ts', import.meta.url));
  const run = promisify(execFile);
  const first = await run(process.execPath, [entry, '--name', runName, '--groups', groupsPath, '-j', '2']);
  assert.match(first.stdout, /待接入/);
  assert.match(first.stdout, /\[head\] 本组流程已完成（part）/);
  assert.match(first.stdout, /Layering 未完成/);
  await assert.rejects(readFile(join(directory, 'progress.json')), { code: 'ENOENT' });
  const second = await run(process.execPath, [entry, '--name', runName]);
  assert.match(second.stdout, /首次分组：沿用已有结果/);
  const secondState = (await GroupStore.open(directory)).snapshot();
  assert.equal(secondState.groups.length, 1);
  assert.equal(secondState.groups[0].steps.review.status, 'completed');
  assert.equal(secondState.groups[0].steps.completion.status, 'completed');
  const tree = JSON.parse(await readFile(join(directory, 'groups.json'), 'utf8'));
  assert.ok(!('initial' in tree) && !('merge' in tree) && !('steps' in tree.groups[0]));
  assert.equal(tree.groups[0].note, '已有识别的组');
  assert.deepEqual((await readGroupInput(join(directory, 'groups.json')) as { id: string }[]).map(group => group.id), ['head']);
});

test('结果明确区分通过、返修、无法核对和执行失败', () => {
  const groups = normalizeGroups([
    { id: 'passed', steps: { outline: { status: 'completed', output: { path: 'passed.svg' } },
      review: { status: 'completed', output: { path: 'passed.svg' } } } },
    { id: 'revise', steps: { outline: { status: 'completed', output: { path: 'revise.svg' } },
      review: { status: 'pending', message: '轮廓 review revise：边缘不符' } } },
    { id: 'blocked', steps: { outline: { status: 'completed', output: { path: 'blocked.svg' } },
      review: { status: 'pending', message: '轮廓 review blocked：无法核对' } } },
    { id: 'failed', steps: { review: { status: 'failed', message: '测试工具异常' } } },
  ]);
  const lines = formatLayeringSummary(groups);
  assert.match(lines[0], /review 已通过/);
  assert.match(lines[1], /review 尚未通过.*需要返修/);
  assert.match(lines[2], /review 尚未通过.*无法核对/);
  assert.match(lines[3], /review 尚未通过.*失败：测试工具异常/);
});

test('两轮意见修正完成的结果不会显示成独立 review 已通过', () => {
  const groups = normalizeGroups([{ id: 'repaired', steps: {
    outline: { status: 'completed', output: { path: 'repaired.svg' } },
    review: { status: 'completed', output: { path: 'repaired.svg', reviewOutcome: 'repaired',
      note: '已按第 2 轮意见返修并自检，不再复审' } },
    reduction: { status: 'completed', output: { path: 'reduced.svg' } },
    completion: { status: 'pending', message: '直接遮挡补形：待接入' },
  } }]);
  const line = formatLayeringSummary(groups)[0];
  assert.match(line, /已按第 2 轮意见返修并自检，不再复审；直接遮挡补形：待接入/);
  assert.doesNotMatch(line, /review 已通过|需要返修|尚未通过/);
});

test('实际入口遇到组产物问题时报告组名、步骤和停止派发，不显示已完成', async t => {
  const runName = `test-cli-${randomUUID()}`;
  const references = getPreparationDirectory(runName);
  const directory = dirname(references);
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(references, { recursive: true });
  await writeFile(join(references, 'judgment.json'), JSON.stringify({ needsSimplification: false }));
  await writeFile(join(references, 'simplified-subject.png'), 'cached reference');
  await writeFile(join(references, 'base-subject.png'), 'cached base');
  const store = await GroupStore.open(directory);
  await store.update(document => { document.groups = normalizeGroups([{ id: 'head_accessories', steps: {
    outline: { status: 'completed', output: { path: join(directory, 'missing.svg') } },
  } }]); });
  const entry = fileURLToPath(new URL('../run.ts', import.meta.url));
  await assert.rejects(promisify(execFile)(process.execPath, [entry, '--name', runName]), error => {
    const failure = error as Error & { code: number; stderr: string };
    assert.equal(failure.code, 1);
    assert.match(failure.stderr, /\[head_accessories\] 组轮廓与自检失败/);
    assert.match(failure.stderr, /Layering 未完成：停止派发新待办/);
    assert.match(failure.stderr, /其余未启动的待办未执行/);
    assert.match(failure.stderr, /事实产物目录：/);
    assert.doesNotMatch(failure.stderr, /Layering 已完成/);
    return true;
  });
});

test('显式 groups 缺少前置参考时直接退出，不启动准备 agent 或自动补齐文件', async t => {
  const runName = `test-cli-${randomUUID()}`;
  const references = getPreparationDirectory(runName);
  const directory = dirname(references);
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(directory, { recursive: true });
  const groupsPath = join(directory, 'input.json');
  await writeFile(groupsPath, JSON.stringify([{ id: 'face' }]));
  const entry = fileURLToPath(new URL('../run.ts', import.meta.url));
  await assert.rejects(promisify(execFile)(process.execPath, [entry, '--name', runName, '--groups', groupsPath]), error => {
    const failure = error as Error & { stderr: string };
    assert.match(failure.stderr, /前置参考未完成/);
    return true;
  });
  await assert.rejects(readFile(join(directory, 'groups.json')), { code: 'ENOENT' });
  await assert.rejects(readFile(join(references, 'judgment.json')), { code: 'ENOENT' });
});

test('读取 groups 选择文件不加载外部进度，也不迁移或改写输入文件', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'part-layering-selection-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const groupsPath = join(directory, 'groups.json');
  const progressPath = join(directory, 'progress.json');
  const contents = JSON.stringify({ groups: [{ id: 'face' }], initial: { status: 'completed' }, merge: { status: 'pending' } });
  await writeFile(groupsPath, contents);
  await writeFile(progressPath, '{broken external progress');
  assert.deepEqual((await readGroupInput(groupsPath) as { id: string }[]).map(group => group.id), ['face']);
  assert.equal(await readFile(groupsPath, 'utf8'), contents);
  assert.equal(await readFile(progressPath, 'utf8'), '{broken external progress');
});

test('命令行并发参数拒绝零、负数、小数、空值及非数字', () => {
  for (const value of ['0', '-1', '1.5', '', 'abc', 'Infinity', '9007199254740992']) {
    assert.throws(() => parseRunArguments([`--jobs=${value}`]), /必须是正整数/);
  }
  assert.throws(() => parseRunArguments(['--jobs', '-1']));
});

test('实际命令行帮助包含并发参数，无效值退出且不调用模型', async () => {
  const run = promisify(execFile);
  const entry = fileURLToPath(new URL('../run.ts', import.meta.url));
  const help = await run(process.execPath, [entry, '--help']);
  assert.match(help.stdout, /--jobs/);
  assert.match(help.stdout, /默认 5/);
  assert.match(help.stdout, /--agents/);
  assert.match(help.stdout, /默认 3/);
  await assert.rejects(run(process.execPath, [entry, '--name', 'test', '-j', '0']), error => {
    const failure = error as Error & { code: number; stderr: string };
    assert.equal(failure.code, 1);
    assert.match(failure.stderr, /必须是正整数/);
    return true;
  });
});
