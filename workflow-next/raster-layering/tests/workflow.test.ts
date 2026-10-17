import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import type { ThreadEvent, ThreadOptions } from '@openai/codex-sdk';
import { runAgent, type AgentRequest, type StepResult } from '../agent.ts';
import { checkKrita } from '../krita.ts';
import { resolvePartInput } from '../input.ts';
import { parseRunArguments } from '../run.ts';
import { steps, stepModels } from '../steps.ts';
import { runWorkflow } from '../workflow.ts';

async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'raster-workflow-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const input = join(directory, 'reference'), output = join(directory, 'result');
  await mkdir(join(input, 'parts'), { recursive: true });
  await writeFile(join(input, 'reference.txt'), 'source remains unchanged');
  return { input, output, krita: process.execPath };
}
const preflight = async (executable: string) => ({ executable, version: '5.3.4' });
const complete: StepResult = { status: 'completed', summary: 'Fixture delivery' };
async function deliver(directory: string) {
  for (const file of steps[0].requiredFiles) await writeFile(join(directory, file), `fixture ${file}`);
}

test('Krita 只检查显式路径，失败不探索其他安装或启动 agent', async t => {
  const options = await fixture(t);
  let calls = 0;
  const installation = await checkKrita(process.execPath, async (command, args) => {
    calls++;
    assert.equal(command, process.execPath);
    assert.deepEqual(args, ['--version']);
    return 'krita 5.3.4.1 (test)\n';
  });
  assert.equal(installation.version, '5.3.4.1 (test)');
  await assert.rejects(checkKrita(join(options.input, 'missing-krita'), async () => { calls++; return ''; }), /不存在或不可执行/);
  await assert.rejects(checkKrita('', async () => { calls++; return ''; }), /明确指定/);
  assert.equal(calls, 1);
  await assert.rejects(runWorkflow(options, {
    preflight: async () => { throw new Error('Krita unavailable'); },
    agent: async () => { assert.fail('must not call model'); },
  }), /Krita unavailable/);
  await assert.rejects(readFile(join(options.output, '.workflow/run.json')), { code: 'ENOENT' });
  assert.throws(() => parseRunArguments(['--input', 'a', '--output', 'b']), /--krita/);
});

test('dry-run 保留完整提示词，只附运行上下文且不写文件、不调用模型', async t => {
  const options = await fixture(t);
  const prompt = await runWorkflow({ ...options, dryRun: true }, { preflight,
    agent: async () => { assert.fail('must not call model'); },
  });
  const source = await readFile(steps[0].prompt, 'utf8');
  assert.ok(prompt.startsWith(source));
  assert.ok(prompt.includes(JSON.stringify(options.input)) && prompt.includes(JSON.stringify(options.output)));
  assert.ok(prompt.includes(JSON.stringify(join(options.input, 'parts'))));
  await assert.rejects(readFile(join(options.output, '.workflow/run.json')), { code: 'ENOENT' });
  await assert.rejects(runWorkflow({ ...options, output: options.input }, { preflight }), /目录必须分开/);
});

test('运行根目录和直接 parts 路径解析到同一份标准，不重复追加 parts', async t => {
  const options = await fixture(t);
  const expected = { directory: options.input, parts: join(options.input, 'parts') };
  assert.deepEqual(await resolvePartInput(options.input), expected);
  assert.deepEqual(await resolvePartInput(join(options.input, 'parts')), expected);
  const rootPrompt = await runWorkflow({ ...options, dryRun: true }, { preflight });
  const partsPrompt = await runWorkflow({ ...options, input: join(options.input, 'parts'), dryRun: true }, { preflight });
  assert.equal(partsPrompt, rootPrompt);
});

test('缺少 parts 时在前置检查及模型调用前报错', async t => {
  const options = await fixture(t);
  await rm(join(options.input, 'parts'), { recursive: true });
  await assert.rejects(runWorkflow(options, {
    preflight: async () => { assert.fail('must not launch Krita'); },
    agent: async () => { assert.fail('must not call model'); },
  }), /输入缺少 parts/);
  await assert.rejects(readFile(join(options.output, '.workflow/run.json')), { code: 'ENOENT' });
});

test('SDK 中断保留会话和产物；resume 继续原会话，成功后复用交付', async t => {
  const options = await fixture(t);
  let calls = 0;
  await assert.rejects(runWorkflow(options, { preflight, agent: async request => {
    calls++;
    assert.equal(request.model, 'gpt-6-astra');
    assert.equal(request.effort, 'xhigh');
    await request.onEvent({ type: 'thread.started', thread_id: 'thread-1' });
    await writeFile(join(options.output, 'accepted-part.png'), 'keep this work');
    throw new Error('connection lost');
  } }), /connection lost/);
  const stateFile = join(options.output, '.workflow/run.json');
  let state = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal(state.steps['01-layering'].status, 'failed');
  assert.equal(state.steps['01-layering'].threadId, 'thread-1');
  await assert.rejects(runWorkflow(options, { preflight }), /--resume/);
  const resumed = { ...options, input: undefined, resume: true };
  const agent = async (request: AgentRequest) => {
    calls++;
    assert.equal(request.threadId, 'thread-1');
    assert.equal(await readFile(join(options.output, 'accepted-part.png'), 'utf8'), 'keep this work');
    await deliver(request.directory);
    return complete;
  };
  await runWorkflow({ ...resumed, input: join(options.input, 'parts') }, { preflight, agent });
  await runWorkflow(resumed, { preflight, agent });
  assert.equal(calls, 2);
  state = JSON.parse(await readFile(stateFile, 'utf8'));
  assert.equal(state.steps['01-layering'].status, 'completed');
  assert.equal(state.steps['01-layering'].attempt, 2);
  assert.equal(await readFile(join(options.input, 'reference.txt'), 'utf8'), 'source remains unchanged');
  // A lost deliverable is repaired in the saved thread, not silently called complete.
  await rm(join(options.output, 'report.md'));
  await runWorkflow(resumed, { preflight, agent });
  assert.equal(calls, 3);
});

test('模型受阻或缺交付文件时不能推进完成状态', async t => {
  const options = await fixture(t);
  await assert.rejects(runWorkflow(options, { preflight, agent: async () => ({ status: 'blocked', summary: 'image tool unavailable' }) }), /步骤未完成/);
  const file = join(options.output, '.workflow/run.json');
  assert.equal(JSON.parse(await readFile(file, 'utf8')).steps['01-layering'].status, 'blocked');
  await assert.rejects(runWorkflow({ ...options, resume: true }, { preflight, agent: async () => complete }), /缺少有效交付/);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).steps['01-layering'].status, 'failed');
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
