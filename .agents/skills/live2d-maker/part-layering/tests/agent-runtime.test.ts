import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentCallError, AgentRuntime, defaultAgentConcurrency, retryableAgentError } from '../../shared/codex/agent-runtime.ts';

test('独立运行层默认限制 3 个调用，失败也释放位置', async () => {
  assert.equal(defaultAgentConcurrency, 3);
  const runtime = new AgentRuntime();
  const gates = Array.from({ length: 7 }, () => Promise.withResolvers<void>());
  let active = 0, peak = 0;
  const entered: number[] = [];
  const calls = gates.map((gate, index) => runtime.run(async () => {
    entered.push(index); peak = Math.max(peak, ++active);
    try { await gate.promise; if (index === 0) throw new Error('文件错误'); return index; }
    finally { active--; }
  }));
  const settled = Promise.allSettled(calls);
  await new Promise(setImmediate);
  assert.deepEqual(entered, [0, 1, 2]);
  gates[0].resolve();
  await new Promise(setImmediate);
  assert.deepEqual(entered, [0, 1, 2, 3]);
  for (const gate of gates) gate.resolve();
  const results = await settled;
  assert.equal(results[0].status, 'rejected');
  assert.equal(peak, 3);
  assert.deepEqual(entered, [0, 1, 2, 3, 4, 5, 6]);
});

test('临时错误最多重试 10 次，等待从 5 秒逐次翻倍且随机落在每档后一半；第 10 次重试仍失败就报错并释放位置', async () => {
  const lowest: number[] = [];
  let failures = 0;
  await new AgentRuntime(1, async ms => { lowest.push(ms); }, () => 0).run(async () => {
    if (++failures <= 10) throw new AgentCallError('capacity', { rateLimitExceeded: { httpStatusCode: 429 } });
  });
  assert.deepEqual(lowest, [2500, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1280000]);
  const waits: number[] = [], retries: number[] = [];
  const runtime = new AgentRuntime(1, async ms => { waits.push(ms); }, () => 1);
  let attempts = 0;
  await assert.rejects(runtime.run(async () => { ++attempts; throw new AgentCallError('capacity', 'serverOverloaded'); },
    { onRetry: retry => { retries.push(retry.attempt); } }), /capacity/);
  assert.equal(attempts, 11);
  assert.deepEqual(waits, [5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1280000, 2560000]);
  assert.deepEqual(retries, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(await runtime.run(async () => 'next'), 'next', 'the failed call released its slot');
});

test('退避等待期间保留并发位置，排队的调用不插入；排队和等待都可以取消', async () => {
  const waiting = Promise.withResolvers<void>(), resume = Promise.withResolvers<void>();
  const controller = new AbortController();
  const runtime = new AgentRuntime(1, async (_ms, signal) => {
    waiting.resolve();
    await new Promise<void>((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      resume.promise.then(resolve);
    });
  });
  const failed = runtime.run(async () => { throw new AgentCallError('capacity', 'serverOverloaded'); }, { signal: controller.signal });
  const rejected = assert.rejects(failed, /取消等待/);
  await waiting.promise;
  let other = false;
  const queuedDuringBackoff = runtime.run(async () => { other = true; return '其他调用已执行'; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(other, false, 'a call queued during backoff waits for the retrying call');
  controller.abort(new Error('取消等待'));
  await rejected;
  assert.equal(await queuedDuringBackoff, '其他调用已执行');
  resume.resolve();
  const held = Promise.withResolvers<void>();
  const first = runtime.run(async () => { await held.promise; });
  const queued = new AbortController();
  let executed = false;
  const next = runtime.run(async () => { executed = true; }, { signal: queued.signal });
  const cancelled = assert.rejects(next, /取消排队/);
  queued.abort(new Error('取消排队'));
  await cancelled;
  held.resolve(); await first;
  assert.equal(executed, false);
});

test('只恢复可重试的通道错误，不重试认证、额度、参数、校验错误和主动取消', () => {
  for (const info of ['serverOverloaded', 'internalServerError', 'responseStreamDisconnected',
    { httpConnectionFailed: { httpStatusCode: 503 } }, { responseTooManyFailedAttempts: { httpStatusCode: 429 } },
    { apiError: { httpStatusCode: 529 } }, { apiError: { httpStatusCode: 429 } }, 'processKilled']) {
    assert.equal(retryableAgentError(new AgentCallError('test', info)), true);
  }
  // Without a structured code the text never triggers a retry, whatever it says.
  for (const message of ['Selected model is at capacity. Please try a different model.', 'server overloaded', '503 service unavailable'])
    assert.equal(retryableAgentError(new AgentCallError(message)), false, message);
  for (const info of ['usageLimitExceeded', 'contextWindowExceeded', 'badRequest', 'localError', 'other',
    { httpConnectionFailed: { httpStatusCode: 401 } }, { httpConnectionFailed: { httpStatusCode: 400 } },
    { apiError: { httpStatusCode: 400 } }, { apiError: { httpStatusCode: null } }]) {
    assert.equal(retryableAgentError(new AgentCallError('test', info)), false);
  }
  assert.equal(retryableAgentError(new AgentCallError('quota exceeded 503')), false);
  assert.equal(retryableAgentError(new Error('server overloaded')), false);
  assert.equal(retryableAgentError(new DOMException('cancelled', 'AbortError')), false);
  for (const value of [0, -1, 1.2, NaN]) assert.throws(() => new AgentRuntime(value), /正整数/);
});
