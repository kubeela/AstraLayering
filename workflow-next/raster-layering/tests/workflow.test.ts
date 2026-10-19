import { pipelineDirectory } from '../../shared/paths.ts';
const runDirectory = (name: string) => pipelineDirectory(name, 'raster-layering');
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type TestContext } from 'node:test';
import type { ThreadEvent, ThreadOptions } from '@openai/codex-sdk';
import { runAgent, type AgentRequest, type StepResult } from '../../shared/raster/agent.ts';
import { checkKrita } from '../../shared/raster/krita.ts';
import { resolvePartInput } from '../../shared/raster/input.ts';
import { parseRunArguments } from '../run.ts';
import { inspectRun, type RunConfig } from '../../shared/raster/run-store.ts';
import { steps, stepModels, type StepDefinition } from '../steps.ts';
import { runWorkflow } from '../run.ts';

const preflight = async (executable: string) => ({ executable, version: '5.3.4' });
const complete: StepResult = { status: 'completed', summary: 'Fixture delivery' };
const forbidden = async (): Promise<never> => { assert.fail('must not call agent/preflight'); };
async function absent(path: string) { await assert.rejects(readFile(path), { code: 'ENOENT' }); }
async function readConfig(directory: string): Promise<RunConfig> { return JSON.parse(await readFile(join(directory, 'run.json'), 'utf8')); }
async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'raster-workflow-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = join(directory, 'reference'), runsDirectory = join(directory, 'runs'), name = 'test';
  await mkdir(join(input, 'parts'), { recursive: true });
  await mkdir(join(input, 'references'));
  await writeFile(join(input, 'parts/face.svg'), 'source part');
  await writeFile(join(input, 'references/source.png'), 'source image');
  await writeFile(join(input, 'groups.json'), '{"subject":"fixture"}');
  await writeFile(join(input, 'occlusion.json'), '{"layers":[]}');
  await writeFile(join(input, 'preview.svg'), 'preview');
  const definitions = steps.map((step: StepDefinition) => {
    const { review: _review, ...drawing } = step;
    return drawing;
  });
  return { directory, input, output: join(runsDirectory, name, 'raster-layering'), definitions,
    options: { name, input, krita: process.execPath }, resume: { name }, deps: { runsDirectory, preflight, steps: [steps[0]] } };
}
async function deliver(request: AgentRequest, step: StepDefinition = steps[0], thread = request.threadId ?? 'thread-1') {
  await readFile(join(request.directory, step.id, '.running'));
  await request.onEvent({ type: 'thread.started', thread_id: thread });
  assert.equal((await readConfig(request.directory)).threadId, thread, 'thread must be persisted during the event');
  for (const file of step.requiredFiles) await writeFile(join(request.directory, step.id, file), `fixture ${step.id}/${file}`);
  return complete;
}

test('任务名限制为单个目录；固定 .run 与 cwd 无关，CLI 可只传 --name', () => {
  assert.equal(runDirectory('测试-01'), fileURLToPath(new URL('../../.run/测试-01/raster-layering', import.meta.url)));
  const cwd = process.cwd();
  try {
    process.chdir(tmpdir());
    assert.equal(runDirectory('test'), fileURLToPath(new URL('../../.run/test/raster-layering', import.meta.url)));
  } finally { process.chdir(cwd); }
  for (const name of ['', '.', '..', '../other', '/tmp/other', 'a/b', 'a\\b']) assert.throws(() => runDirectory(name), /--name/);
  assert.equal(parseRunArguments(['--name', 'test']).name, 'test');
  assert.throws(() => parseRunArguments([]), /--name/);
  assert.throws(() => parseRunArguments(['--check-krita']), /--krita/);
  assert.throws(() => parseRunArguments(['--name', 'test', '--output', 'x']), /Unknown option/);
});

test('Krita 只检查显式路径，失败不探索安装或创建任务', async t => {
  const f = await fixture(t);
  let calls = 0;
  const installation = await checkKrita(process.execPath, async (command, args) => {
    calls++;
    assert.equal(command, process.execPath);
    assert.deepEqual(args, ['--version']);
    return 'krita 5.3.4.1 (test)\n';
  });
  assert.equal(installation.version, '5.3.4.1 (test)');
  await assert.rejects(checkKrita(join(f.input, 'missing-krita'), async () => { calls++; return ''; }), /不存在或不可执行/);
  await assert.rejects(checkKrita('', async () => { calls++; return ''; }), /明确指定/);
  assert.equal(calls, 1);
  await assert.rejects(runWorkflow(f.options, { ...f.deps, preflight: async () => { throw new Error('Krita unavailable'); }, agent: forbidden }), /Krita unavailable/);
  await absent(join(f.output, 'run.json'));
  await assert.rejects(runWorkflow({ name: 'test' }, f.deps), /首次运行必须提供 --input/);
  await assert.rejects(runWorkflow({ name: 'test', input: f.input }, f.deps), /首次运行必须提供 --krita/);
});

test('dry-run 保留完整提示词；根目录与 parts 等价；不写文件、不调用模型', async t => {
  const f = await fixture(t);
  const expected = { directory: f.input, parts: join(f.input, 'parts') };
  assert.deepEqual(await resolvePartInput(f.input), expected);
  assert.deepEqual(await resolvePartInput(join(f.input, 'parts')), expected);
  const prompt = await runWorkflow({ ...f.options, dryRun: true }, { ...f.deps, agent: forbidden });
  assert.ok(prompt.startsWith(await readFile(steps[0].prompt, 'utf8')));
  assert.ok(prompt.includes(JSON.stringify(join(f.output, 'input/parts'))));
  assert.ok(prompt.includes(JSON.stringify(join(f.output, 'step01'))));
  const partsPrompt = await runWorkflow({ ...f.options, input: join(f.input, 'parts'), dryRun: true }, f.deps);
  assert.equal(partsPrompt, prompt);
  await assert.rejects(readdir(f.deps.runsDirectory), { code: 'ENOENT' });
  await assert.rejects(runWorkflow(f.options, { ...f.deps, runsDirectory: f.input }), /目录必须分开/);
});

test('缺少 parts 时在前置检查和模型调用前报错', async t => {
  const f = await fixture(t);
  await rm(join(f.input, 'parts'), { recursive: true });
  await assert.rejects(runWorkflow(f.options, { ...f.deps, preflight: forbidden, agent: forbidden }), /输入缺少 parts/);
  await absent(join(f.output, 'run.json'));
});

test('默认三步顺序执行；第二步交付和 review 完成后，第三步沿用绘制 thread 并切换模型', async t => {
  const f = await fixture(t);
  const { steps: _singleStep, ...deps } = f.deps;
  let calls = 0;
  await assert.rejects(runWorkflow(f.options, { ...deps, agent: async request => {
    const step = steps[calls++];
    if (step.id === 'step01') return deliver(request, step);
    assert.equal(request.threadId, 'thread-1');
    assert.equal(request.model, 'gpt-6-astra');
    assert.equal(request.effort, 'xhigh');
    for (const file of steps[1].inputFiles) {
      assert.ok(request.prompt.includes(JSON.stringify(join(f.output, file))));
      await readFile(join(f.output, file));
    }
    for (const file of step.requiredFiles) assert.ok(request.prompt.includes(JSON.stringify(join(f.output, 'step02', file === 'report.md' ? 'report.md.tmp' : file))));
    await writeFile(join(f.output, 'step02/character-soft-edges.kra'), 'partially softened artwork');
    await writeFile(join(f.output, 'step02/report.md.tmp'), 'PNG still missing');
    return complete;
  } }), /缺少有效交付：character-soft-edges.png/);
  assert.equal(calls, 2);
  const original = await readFile(join(f.output, 'step01/character-depth.kra'));
  await readFile(join(f.output, 'step01/.completed'));
  await readFile(join(f.output, 'step02/.running'));
  await absent(join(f.output, 'step02/report.md'));
  await absent(join(f.output, 'step02/.completed'));
  await runWorkflow(f.resume, { ...deps, agent: async request => {
    if (request.prompt.startsWith('你负责对第二步交付')) {
      assert.equal(request.threadId, undefined);
      await absent(join(f.output, 'step02/.completed'));
      await assert.rejects(readdir(join(f.output, 'step03')), { code: 'ENOENT' });
      await request.onEvent({ type: 'thread.started', thread_id: 'fresh-reviewer' });
      await writeFile(join(f.output, 'step02/review-01.md.tmp'), '结论：通过\n\n检查完成。');
      return complete;
    }
    calls++;
    assert.equal(request.threadId, 'thread-1');
    assert.equal(await readFile(join(f.output, 'step02/character-soft-edges.kra'), 'utf8'), 'partially softened artwork');
    if (request.model === 'gpt-6.1-sol') {
      assert.equal(request.effort, 'xhigh');
      await readFile(join(f.output, 'step02/.completed'));
      await readFile(join(f.output, 'step02/review-01.md'));
      assert.ok(request.prompt.startsWith(await readFile(steps[2].prompt, 'utf8')));
      for (const file of steps[2].inputFiles) {
        assert.ok(request.prompt.includes(JSON.stringify(join(f.output, file))));
        await readFile(join(f.output, file));
      }
      for (const file of steps[2].requiredFiles) assert.ok(request.prompt.includes(JSON.stringify(join(f.output, 'step03', file))));
      return deliver(request, steps[2]);
    }
    await writeFile(join(f.output, 'step02/character-soft-edges.png'), 'composite from final KRA');
    await writeFile(join(f.output, 'step02/report.md.tmp'), 'all layers reviewed');
    return complete;
  } });
  assert.equal(calls, 4);
  assert.deepEqual(await readFile(join(f.output, 'step01/character-depth.kra')), original);
  await readFile(join(f.output, 'step02/.completed'));
  await absent(join(f.output, 'step02/.running'));
  await readFile(join(f.output, 'step03/.completed'));
  await absent(join(f.output, 'step03/.running'));
  await absent(join(f.output, 'step03/review-01.md'));
  assert.equal((await readConfig(f.output)).threadId, 'thread-1');
  await runWorkflow(f.resume, { ...deps, agent: forbidden });
});

test('已完成第一步的任务可按 name 预览第二步，显示实际输入输出路径且保留完整正文', async t => {
  const f = await fixture(t);
  await runWorkflow(f.options, { ...f.deps, agent: request => deliver(request) });
  const { steps: _singleStep, ...deps } = f.deps;
  const before = await readFile(join(f.output, 'run.json'));
  const prompt = await runWorkflow({ ...f.resume, dryRun: true }, { ...deps, agent: forbidden });
  assert.ok(prompt.startsWith((await readFile(steps[1].prompt, 'utf8')).replaceAll('step02/report.md', 'step02/report.md.tmp')));
  assert.ok(prompt.includes(JSON.stringify(join(f.output, 'input/references'))));
  assert.ok(prompt.includes(JSON.stringify(join(f.output, 'step01/character-depth.kra'))));
  assert.ok(prompt.includes(JSON.stringify(join(f.output, 'step02/character-soft-edges.kra'))));
  assert.ok(prompt.includes(JSON.stringify(join(f.output, 'step02/character-soft-edges.png'))));
  assert.ok(!prompt.includes('/Users/wutian/') && !prompt.includes('demos/soft-edge-krita'));
  assert.deepEqual(await readFile(join(f.output, 'run.json')), before);
  await assert.rejects(readdir(join(f.output, 'step02')), { code: 'ENOENT' });
});

test('输入保存完整副本；中断保留 .running、产物和 thread；源目录删除后只用 name 续跑', async t => {
  const f = await fixture(t);
  await assert.rejects(runWorkflow(f.options, { ...f.deps, agent: async request => {
    assert.equal(request.model, 'gpt-6-astra');
    assert.equal(request.effort, 'xhigh');
    await readFile(join(f.output, 'step01/.running'));
    await request.onEvent({ type: 'thread.started', thread_id: 'thread-1' });
    assert.equal((await readConfig(f.output)).threadId, 'thread-1');
    await writeFile(join(f.output, 'step01/accepted-part.png'), 'keep this work');
    throw new Error('connection lost');
  } }), /connection lost/);
  const config = await readConfig(f.output);
  assert.equal(config.threadId, 'thread-1');
  assert.ok(!('steps' in config) && !('status' in config));
  assert.deepEqual(config.models, { step01: stepModels[1], step02: stepModels[2], step03: stepModels[3] });
  for (const file of ['parts/face.svg', 'references/source.png', 'groups.json', 'occlusion.json', 'preview.svg']) {
    assert.deepEqual(await readFile(join(f.output, 'input', file)), await readFile(join(f.input, file)));
  }
  // A changed source is not recopied, including when --input is repeated as parts/.
  await writeFile(join(f.input, 'parts/face.svg'), 'new source must not overwrite snapshot');
  await runWorkflow({ ...f.options, input: join(f.input, 'parts'), dryRun: true }, f.deps);
  await rm(f.input, { recursive: true });
  await runWorkflow(f.resume, { ...f.deps, preflight: async path => {
    assert.equal(path, process.execPath);
    return preflight(path);
  }, agent: async request => {
    assert.equal(request.threadId, 'thread-1');
    assert.equal(await readFile(join(f.output, 'input/parts/face.svg'), 'utf8'), 'source part');
    assert.equal(await readFile(join(f.output, 'step01/accepted-part.png'), 'utf8'), 'keep this work');
    return deliver(request);
  } });
  await readFile(join(f.output, 'step01/.completed'));
  await absent(join(f.output, 'step01/.running'));
  await runWorkflow(f.resume, { ...f.deps, agent: forbidden });
  assert.equal((await readFile(join(f.output, 'step01/attempts.jsonl'), 'utf8')).trim().split('\n').length, 2);
  await assert.rejects(readdir(join(f.output, 'step02')), { code: 'ENOENT' });
});

test('已完成第一步的任务接续后两步，共用 thread 并在第三步切换模型', async t => {
  const f = await fixture(t);
  await runWorkflow(f.options, { ...f.deps, agent: request => deliver(request) });
  let index = 1;
  await runWorkflow(f.resume, { ...f.deps, steps: f.definitions, agent: async request => {
    const step = f.definitions[index++];
    assert.equal(request.threadId, 'thread-1');
    assert.equal(request.model, step.model);
    assert.equal(request.effort, 'xhigh');
    assert.ok(request.prompt.includes(JSON.stringify(join(f.output, 'step01/report.md'))));
    return deliver(request, step);
  } });
  assert.equal(index, 3);
  for (const step of f.definitions) {
    await readFile(join(f.output, step.id, '.completed'));
    await absent(join(f.output, step.id, '.running'));
  }
});

test('删 step02 完成标记后保留 step01/input，清理后续目录，换新 thread 后共用', async t => {
  const f = await fixture(t);
  let index = 0;
  await runWorkflow(f.options, { ...f.deps, steps: f.definitions, agent: request => deliver(request, f.definitions[index++]) });
  const first = await readFile(join(f.output, 'step01/events.jsonl'));
  const snapshot = await readFile(join(f.output, 'input/parts/face.svg'));
  await writeFile(join(f.output, 'step02/old.png'), 'old artwork');
  await mkdir(join(f.output, 'step04'));
  await writeFile(join(f.output, 'step04/.completed'), '');
  await rm(join(f.output, 'step02/.completed'));
  const before = await readFile(join(f.output, 'run.json'));
  const messages: string[] = [];
  await runWorkflow({ ...f.resume, dryRun: true, progress: message => messages.push(message) }, { ...f.deps, steps: f.definitions, agent: forbidden });
  assert.ok(messages.some(message => message.includes('预览：将重置 step02')));
  assert.deepEqual(await readFile(join(f.output, 'run.json')), before);
  await readFile(join(f.output, 'step02/old.png'));
  await readFile(join(f.output, 'step03/.completed'));
  index = 1;
  await runWorkflow(f.resume, { ...f.deps, steps: f.definitions, agent: async request => {
    const step = f.definitions[index++];
    if (step.id === 'step02') {
      assert.equal(request.threadId, undefined);
      assert.equal((await readConfig(f.output)).threadId, null);
      await absent(join(f.output, 'step02/old.png'));
      await absent(join(f.output, 'step03/.completed'));
      await assert.rejects(readdir(join(f.output, 'step04')), { code: 'ENOENT' });
    } else assert.equal(request.threadId, 'thread-new');
    assert.ok(request.prompt.includes(JSON.stringify(join(f.output, 'step01/report.md'))));
    return deliver(request, step, 'thread-new');
  } });
  assert.equal(index, 3);
  assert.deepEqual(await readFile(join(f.output, 'step01/events.jsonl')), first);
  assert.deepEqual(await readFile(join(f.output, 'input/parts/face.svg')), snapshot);
  assert.equal((await readConfig(f.output)).threadId, 'thread-new');
});

test('删 step01 完成标记清空所有后续步骤，包括尚未定义提示词的目录', async t => {
  const f = await fixture(t);
  await runWorkflow(f.options, { ...f.deps, agent: request => deliver(request) });
  for (const id of ['step02', 'step03', 'step09']) {
    await mkdir(join(f.output, id));
    await writeFile(join(f.output, id, '.completed'), '');
  }
  await rm(join(f.output, 'step01/.completed'));
  await runWorkflow(f.resume, { ...f.deps, agent: async request => {
    assert.equal(request.threadId, undefined);
    for (const id of ['step02', 'step03', 'step09']) await assert.rejects(readdir(join(f.output, id)), { code: 'ENOENT' });
    await absent(join(f.output, 'step01/character-depth.kra'));
    return deliver(request, steps[0], 'replacement');
  } });
});

test('重置清理中断后可恢复；前序目录整个缺失时也清理后续', async t => {
  const f = await fixture(t);
  let index = 0;
  await runWorkflow(f.options, { ...f.deps, steps: f.definitions, agent: request => deliver(request, f.definitions[index++]) });
  await rm(join(f.output, 'step01/.completed'));
  // Simulate a crash after clearing the thread and deleting the furthest descendant.
  const config = await readConfig(f.output);
  config.threadId = null;
  await writeFile(join(f.output, 'run.json'), JSON.stringify(config));
  await rm(join(f.output, 'step03'), { recursive: true });
  assert.equal((await inspectRun(f.output, steps)).resetFrom, 1);
  await runWorkflow(f.resume, { ...f.deps, agent: request => deliver(request, steps[0], 'after-cleanup-crash') });
  await assert.rejects(readdir(join(f.output, 'step02')), { code: 'ENOENT' });
  await mkdir(join(f.output, 'step02'));
  await writeFile(join(f.output, 'step02/.completed'), '');
  await rm(join(f.output, 'step01'), { recursive: true });
  await runWorkflow(f.resume, { ...f.deps, agent: async request => {
    assert.equal(request.threadId, undefined);
    await assert.rejects(readdir(join(f.output, 'step02')), { code: 'ENOENT' });
    return deliver(request, steps[0], 'after-gap');
  } });
});

test('模型受阻、缺交付或取消均保留 .running；即使 result.json 写了完成也不能跳过', async t => {
  const f = await fixture(t);
  const start = async (request: AgentRequest) => request.onEvent({ type: 'thread.started', thread_id: 'thread-blocked' });
  await assert.rejects(runWorkflow(f.options, { ...f.deps, agent: async request => {
    await start(request);
    return { status: 'blocked', summary: 'image tool unavailable' };
  } }), /步骤未完成/);
  await assert.rejects(runWorkflow(f.resume, { ...f.deps, agent: async request => {
    assert.equal(request.threadId, 'thread-blocked');
    return complete;
  } }), /缺少有效交付/);
  await readFile(join(f.output, 'step01/.running'));
  await absent(join(f.output, 'step01/.completed'));
  assert.equal(JSON.parse(await readFile(join(f.output, 'step01/result.json'), 'utf8')).status, 'completed');
  const controller = new AbortController();
  await assert.rejects(runWorkflow({ ...f.resume, signal: controller.signal }, { ...f.deps, agent: async request => {
    await deliver(request);
    controller.abort(new Error('interrupted'));
    return complete;
  } }), /interrupted/);
  await readFile(join(f.output, 'step01/.running'));
  await absent(join(f.output, 'step01/.completed'));
});

test('完成标记保留但交付丢失时明确报错，不悄悄重跑；显式 Krita 更新会保存', async t => {
  const f = await fixture(t);
  await runWorkflow(f.options, { ...f.deps, agent: request => deliver(request) });
  const replacement = join(f.directory, 'explicit-krita');
  await runWorkflow({ ...f.resume, krita: replacement }, { ...f.deps, agent: forbidden });
  assert.equal((await readConfig(f.output)).krita.executable, replacement);
  await runWorkflow(f.resume, { ...f.deps, agent: forbidden, preflight: async path => {
    assert.equal(path, replacement);
    return preflight(path);
  } });
  await rm(join(f.output, 'step01/report.md'));
  await assert.rejects(runWorkflow(f.resume, { ...f.deps, agent: forbidden }), /删除 step01\/.completed/);
  await readFile(join(f.output, 'step01/.completed'));
});

test('续跑失败或 SDK 返回不同 thread ID 时保留原会话，不静默新开', async t => {
  const f = await fixture(t);
  await assert.rejects(runWorkflow(f.options, { ...f.deps, agent: async request => {
    await request.onEvent({ type: 'thread.started', thread_id: 'original' });
    throw new Error('offline');
  } }), /offline/);
  await assert.rejects(runWorkflow(f.resume, { ...f.deps, agent: request => runAgent(request, {
    startThread: () => assert.fail('must not start a replacement'),
    resumeThread: id => { assert.equal(id, 'original'); throw new Error('thread unavailable'); },
  }) }), /thread unavailable/);
  await assert.rejects(runWorkflow(f.resume, { ...f.deps, agent: async request => {
    await request.onEvent({ type: 'thread.started', thread_id: 'unexpected' });
    return complete;
  } }), /拒绝替换/);
  assert.equal((await readConfig(f.output)).threadId, 'original');
  await readFile(join(f.output, 'step01/.running'));
});

test('已有任务不接收不同输入；符号链接步骤不被递归清理', async t => {
  const f = await fixture(t);
  await runWorkflow(f.options, { ...f.deps, agent: request => deliver(request) });
  const other = join(f.directory, 'other');
  await mkdir(join(other, 'parts'), { recursive: true });
  await assert.rejects(runWorkflow({ ...f.resume, input: other }, { ...f.deps, agent: forbidden }), /另一份输入/);
  await rm(join(f.output, 'step01/.completed'));
  await symlink(other, join(f.output, 'step02'), 'dir');
  await assert.rejects(runWorkflow(f.resume, { ...f.deps, agent: forbidden }), /步骤路径必须是普通目录/);
  await readFile(join(f.output, 'step01/character-depth.kra'));
  assert.deepEqual(await readdir(other), ['parts']);
});

test('SDK 使用指定模型与 reasoning；临时 error 等待 CLI 终态，失败流不冒充成功', async () => {
  const events: ThreadEvent[] = [
    { type: 'thread.started', thread_id: 'thread-2' },
    { type: 'error', message: 'reconnecting' },
    { type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: JSON.stringify(complete) } },
    { type: 'turn.completed', usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, cache_write_input_tokens: 0, reasoning_output_tokens: 0 } },
  ];
  const received: ThreadEvent[] = [];
  const options: ThreadOptions[] = [];
  const thread = { runStreamed: async () => ({ events: (async function* () { yield* events; })() }) };
  const client = {
    startThread: (value: ThreadOptions) => { options.push(value); return thread; },
    resumeThread: (id: string, value: ThreadOptions) => { assert.equal(id, 'thread-2'); options.push(value); return thread; },
  };
  const request: AgentRequest = { prompt: 'test', directory: tmpdir(), ...stepModels[1], onEvent: async e => { received.push(e); } };
  assert.deepEqual(await runAgent(request, client), complete);
  assert.equal(options[0].model, 'gpt-6-astra');
  assert.equal(options[0].modelReasoningEffort, 'xhigh');
  assert.equal(received.length, 4);
  events.splice(0, events.length, { type: 'turn.failed', error: { message: 'image policy error' } });
  await assert.rejects(runAgent({ ...request, threadId: 'thread-2' }, client), /image policy error/);
  events.splice(0, events.length, { type: 'error', message: 'stream closed' });
  await assert.rejects(runAgent(request, client), /stream closed/);
});
