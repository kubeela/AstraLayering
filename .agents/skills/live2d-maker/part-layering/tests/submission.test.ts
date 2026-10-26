import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { CodexAgents } from '../../shared/codex/agents.ts';
import { AgentRuntime } from '../../shared/codex/agent-runtime.ts';
import { textResult, type FunctionTool } from '../../shared/codex/function-tools.ts';
import { fakeAppServer } from './fake-app-server.ts';
import { nodeExecutables } from './node-executables.ts';

async function fixture(t: TestContext, behavior: Parameters<typeof fakeAppServer>[4] = {}) {
  nodeExecutables(t);
  const directory = await mkdtemp(join(tmpdir(), 'part-submission-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const server = await fakeAppServer(directory, [{ tool: 'submit_review', arguments: {} }], 'completed', [], behavior);
  const waits: number[] = [];
  const agents = new CodexAgents({ cwd: directory, codexPathOverride: server.executable,
    logDirectory: join(directory, 'agents'), runtime: new AgentRuntime(1, async ms => { waits.push(ms); }) });
  const protocol = async () => (await readFile(server.capture, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  return { agents, directory, waits, protocol, capture: server.capture };
}
const tool = (execute: FunctionTool['execute']): FunctionTool => ({ name: 'submit_review', description: 'Submit current review',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute });

test('限流后旧报告和自然语言均不能完成本轮，原会话追回当前工具提交', async t => {
  const f = await fixture(t, { failedTurns: 1, skipCallsThroughTurn: 2 });
  const report = join(f.directory, 'review.json');
  // Even an identical candidate can belong to an earlier review round.
  await writeFile(report, JSON.stringify([{ round: 1, candidateHash: 'same-candidate', verdict: 'revise' }]));
  let submitted = false, commits = 0;
  await f.agents.run({ name: 'second-review', prompt: '审查第 2 轮，候选 same-candidate。',
    submission: { tools: ['submit_review'], isSubmitted: () => submitted },
    tools: [tool(async () => {
      const reviews = JSON.parse(await readFile(report, 'utf8'));
      reviews.push({ round: 2, candidateHash: 'same-candidate', verdict: 'pass' });
      await writeFile(report, JSON.stringify(reviews));
      submitted = true; commits++;
      return textResult('current round committed');
    })] });
  assert.equal(commits, 1);
  assert.equal(JSON.parse(await readFile(report, 'utf8')).length, 2);
  const protocol = await f.protocol(), turns = protocol.filter(item => item.method === 'turn/start');
  assert.equal(turns.length, 3);
  assert.equal(new Set(turns.map(item => item.params.threadId)).size, 1);
  assert.match(turns[1].params.input[0].text, /本次调用尚未通过 submit_review 成功提交/);
  assert.match(turns[2].params.input[0].text, /本次调用尚未通过 submit_review 成功提交/);
  assert.deepEqual(f.waits, [5000]);
});

test('本轮已提交后收尾限流，程序直接复用提交结果且不再请求模型', async t => {
  const f = await fixture(t, { failedTurns: 1 });
  let submitted = false, commits = 0;
  const result = await f.agents.run({ name: 'committed-before-disconnect', prompt: '审查当前候选',
    submission: { tools: ['submit_review'], isSubmitted: () => submitted },
    tools: [tool(async () => { submitted = true; commits++; return textResult('committed'); })] });
  assert.equal(result.threadId, 'native-thread');
  assert.equal(commits, 1);
  assert.deepEqual(f.waits, []);
  assert.equal((await f.protocol()).filter(item => item.method === 'turn/start').length, 1);
  assert.equal(JSON.parse(await readFile(join(result.logDirectory!, 'result.json'), 'utf8')).status, 'failed');
});

test('保留会话的新一次调用重新要求提交；持续漏交有限退出，保留旧成果', async t => {
  const f = await fixture(t, { skipCallsAfterFailure: true });
  const session = f.agents.createSession();
  let firstSubmitted = false, secondSubmitted = false, commits = 0;
  try {
    await session.run({ name: 'first', prompt: '第一轮',
      submission: { tools: ['submit_review'], isSubmitted: () => firstSubmitted },
      tools: [tool(async () => { firstSubmitted = true; commits++; return textResult('first committed'); })] });
    await assert.rejects(session.run({ name: 'second', prompt: '第二轮',
      submission: { tools: ['submit_review'], isSubmitted: () => secondSubmitted },
      tools: [tool(async () => { secondSubmitted = true; commits++; return textResult('second committed'); })] }), /未通过 submit_review 成功提交/);
  } finally { await session.close(); }
  assert.equal(commits, 1);
  assert.equal(secondSubmitted, false);
  assert.equal((await f.protocol()).filter(item => item.method === 'turn/start').length, 3);
  assert.deepEqual(f.waits, []);
});

test('工具校验失败不算提交成功，原会话修正后才完成', async t => {
  const f = await fixture(t);
  let submitted = false, attempts = 0;
  await f.agents.run({ name: 'invalid-submission', prompt: '提交当前结论',
    submission: { tools: ['submit_review'], isSubmitted: () => submitted },
    tools: [tool(async () => {
      if (++attempts === 1) throw new Error('缺少本轮预览证据');
      submitted = true;
      return textResult('committed');
    })] });
  assert.equal(submitted, true);
  assert.equal(attempts, 2);
  assert.deepEqual((await f.protocol()).filter(item => item.id === 'call-1').map(item => item.result.success), [false, true]);
});

test('提交条件必须绑定本次注册的工具，配置错误在模型调用前报错', async t => {
  const f = await fixture(t);
  await assert.rejects(f.agents.run({ name: 'invalid-contract', prompt: 'test', tools: [],
    submission: { tools: ['submit_review'], isSubmitted: () => true } }), /未注册.*submit_review/);
  await assert.rejects(readFile(f.capture), { code: 'ENOENT' });
});

test('已提交状态仍保留用户取消和不可重试的额度错误', async t => {
  for (const cancel of [false, true]) {
    const f = await fixture(t, { failedTurns: 1, errorInfo: 'usageLimitExceeded' });
    const controller = new AbortController();
    const session = f.agents.createSession();
    let submitted = false;
    try { await assert.rejects(session.run({ name: 'stop-after-commit', prompt: '提交当前结论',
      submission: { tools: ['submit_review'], isSubmitted: () => submitted },
      tools: [tool(async () => {
        submitted = true;
        if (cancel) controller.abort(new Error('user cancelled'));
        return textResult('committed');
      })],
    }, controller.signal), cancel ? /user cancelled/ : /capacity/); }
    finally { await session.close(); }
    assert.equal(submitted, true);
    assert.deepEqual(f.waits, []);
  }
});
