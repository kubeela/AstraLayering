import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ThreadEvent } from '@openai/codex-sdk';
import { runAgent, type AgentRequest } from '../raster/agent.ts';
import { AgentCallError, AgentRuntime, retryableAgentError } from '../codex/agent-runtime.ts';

const request = (): AgentRequest => ({ prompt: '按原图继续修边', directory: '/tmp', model: 'fixture', effort: 'xhigh', onEvent: async () => {} });
const success: ThreadEvent[] = [
  { type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: '{"status":"completed","summary":"完成"}' } },
  { type: 'turn.completed', usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, cache_write_input_tokens: 0, reasoning_output_tokens: 0 } },
];

test('raster 等待 CLI 终态后在原 thread 继续，保留图片并记录退避', async () => {
  const prompts: unknown[] = [], waits: number[] = [], events: string[] = [];
  let starts = 0, resumes = 0, retries = 0;
  const thread = { async runStreamed(prompt: unknown) {
    prompts.push(prompt);
    const first = prompts.length === 1;
    return { events: (async function* () {
      yield { type: 'thread.started', thread_id: 'drawing-thread' } as ThreadEvent;
      if (first) {
        yield { type: 'item.completed', item: { type: 'image_generation', savedPath: '/tmp/existing.png' } } as unknown as ThreadEvent;
        yield { type: 'error', message: 'stream disconnected; CLI retrying' } as ThreadEvent;
        assert.equal(retries, 0);
        yield { type: 'turn.failed', error: { message: '503 service unavailable' } } as ThreadEvent;
      } else yield* success;
    })() };
  } };
  const result = await runAgent({ ...request(), onEvent: async event => { events.push(event.type); }, onRetry: () => { retries++; } }, {
    startThread() { starts++; return thread; }, resumeThread() { resumes++; return thread; },
  }, new AgentRuntime(1, async ms => { waits.push(ms); }));
  assert.equal(result.status, 'completed');
  assert.equal(starts, 1); assert.equal(resumes, 0); assert.equal(retries, 1);
  assert.deepEqual(waits, [5000]);
  assert.equal(prompts[0], request().prompt);
  assert.match(String(prompts[1]), /原要求.*未完成处继续/);
  assert.match(String(prompts[1]), /existing.png/);
  assert.ok(events.includes('turn.failed'));
});

test('额度、输入图数和上下文上限不会被结构化 429 误判为临时故障', () => {
  for (const message of ['quota exhausted', 'maximum of 50 images', 'context window exceeded', 'invalid input']) {
    assert.equal(retryableAgentError(new AgentCallError(message, { rateLimitExceeded: { httpStatusCode: 429 } })), false);
  }
  assert.equal(retryableAgentError(new AgentCallError('too many requests', { rateLimitExceeded: { httpStatusCode: 429 } })), true);
});

test('AGV response-header timeouts retry in the same runtime; a recovered response ends retries', async () => {
  const timeout = 'API error (attempt 1): request failed: net/http: timeout awaiting response headers';
  assert.equal(retryableAgentError(new AgentCallError(timeout)), true);
  assert.equal(retryableAgentError(new Error(timeout)), false);
  assert.equal(retryableAgentError(new AgentCallError('authentication failed; ' + timeout)), false);
  const waits: number[] = [], errors: string[] = [];
  const runtime = new AgentRuntime(1, async ms => { waits.push(ms); });
  let calls = 0;
  const result = await runtime.run(async () => {
    calls++;
    if (calls === 1) throw new AgentCallError(timeout);
    return 'completed after retry';
  }, { onRetry: retry => { errors.push(String(retry.error)); } });
  assert.equal(result, 'completed after retry'); assert.equal(calls, 2);
  assert.deepEqual(waits, [5000]); assert.equal(errors.length, 1);
});

test('取消可以中断 raster 退避；本地事件保存失败不触发网络重试', async () => {
  const controller = new AbortController();
  let turns = 0;
  const client = { startThread() { return { async runStreamed() {
    turns++;
    return { events: (async function* () { yield { type: 'turn.failed', error: { message: '503' } } as ThreadEvent; })() };
  } }; }, resumeThread() { throw new Error('unexpected resume'); } };
  await assert.rejects(runAgent({ ...request(), signal: controller.signal }, client,
    new AgentRuntime(1, async () => { controller.abort(new Error('用户取消')); })), /用户取消/);
  assert.equal(turns, 1);
  const events = { startThread() { return { async runStreamed() { return { events: (async function* () { yield* success; })() }; } }; }, resumeThread: client.resumeThread };
  await assert.rejects(runAgent({ ...request(), onEvent: async () => { throw new Error('503 local disk error'); } }, events,
    new AgentRuntime(1, async () => assert.fail('local failure must not retry'))), /local disk error/);
});
