import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { errorDetails, errorMessage } from '../agents/errors.ts';
import { agentCallError, agentOutcomeError, formatAgentError } from '../codex/diagnostics.ts';
import { AgentCallError, AgentRuntime, retryableAgentError } from '../codex/agent-runtime.ts';
import { CodexAgents } from '../codex/agents.ts';
import { loadWorkflowEnvironment } from '../codex/environment.ts';
import { runCliTask } from '../agents/cli.ts';
import { parseAgentModel } from '../agents/models.ts';
import { runAgent } from '../raster/agent.ts';
import {AgentLog} from '../codex/agent-log.ts';
import {setTimeout as delay} from 'node:timers/promises';

const payload = { message: 'Provider rejected this reference', code: 'bad_reference',
  type: 'invalid_request_error', param: 'input[0]', status: 400, request_id: 'provider-request-123' };

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'layering-errors-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cwd = join(root, 'case'); await mkdir(cwd);
  const logDirectory = join(cwd, 'part-layering/agents');
  return { root, cwd, logDirectory };
}

async function savedFailure(error: AgentCallError, cwd: string) {
  const result = JSON.parse(await readFile(join(error.logDirectory!, 'result.json'), 'utf8'));
  assert.equal(result.status, 'failed');
  assert.equal(result.threadId, error.threadId);
  assert.match(JSON.stringify(result.errorDetails), /bad_reference/);
  const workflow = await readFile(join(cwd, 'workflow.log'), 'utf8');
  assert.match(workflow, /错误详情/);
  assert.match(workflow, /bad_reference/);
  assert.match(workflow, /input\[0\]/);
  assert.match(formatAgentError(error), /模型最后消息/);
  assert.match(formatAgentError(error), /provider-request-123/);
  return result;
}

test('error snapshots retain nested provider details and causes without serializing SDK request credentials', () => {
  const transport = Object.assign(new Error('connection failed'), { code: 'ECONNRESET',
    config: { headers: { Authorization: 'secret-test-token' } }, request: { apiKey: 'secret-test-token' },
    cause: Object.assign(new Error('upstream closed'), { code: 'UPSTREAM_CLOSED' }) });
  const outer = agentOutcomeError('调用没有完成', { text: '当前草稿已保存', threadId: 'thread-1', logDirectory: '/case/agents/1' }, transport);
  const formatted = formatAgentError(outer);
  assert.match(formatted, /原因：connection failed/);
  assert.match(formatted, /UPSTREAM_CLOSED/);
  assert.match(formatted, /当前草稿已保存/);
  assert.doesNotMatch(formatted, /secret-test-token|Authorization/);
  const circular: Record<string, unknown> = { ...payload }; circular.cause = circular;
  assert.match(JSON.stringify(errorDetails(circular)), /\[circular\]/);
  assert.equal(errorMessage({ errors: [payload, { error: { message: 'second error' } }] }), payload.message + '\nsecond error');
  const error = agentCallError({ data: { error: payload } }, 'fallback');
  assert.equal(error.message, payload.message);
  assert.deepEqual(error.details, { data: { error: payload } });
  const info = { responseStreamDisconnected: { httpStatusCode: 503 } };
  const detailed = agentCallError({ message: 'stream disconnected', code: 'upstream' }, 'fallback', info);
  assert.equal(detailed.info, info);
  assert.equal(retryableAgentError(detailed), retryableAgentError(new AgentCallError('stream disconnected', info)));
});

for (const mode of ['rpc', 'turn', 'eof', 'recovered']) test(`Codex App Server ${mode}: preserve payloads and wait for terminal status`, async t => {
  if (mode === 'eof') {
    const record = AgentLog.prototype.recordProtocol;
    t.mock.method(AgentLog.prototype, 'recordProtocol', async function(this: AgentLog, ...args: Parameters<typeof record>) {
      if ((args[0] as {method?: string}).method === 'item/completed') await delay(100);
      return record.apply(this, args);
    });
  }
  const f = await fixture(t);
  const executable = join(f.root, 'codex.mjs');
  await writeFile(executable, `#!${process.execPath}
import { createInterface } from 'node:readline';
const payload=${JSON.stringify(payload)}, mode=${JSON.stringify(mode)};
const emit=value=>console.log(JSON.stringify(value));
for await (const line of createInterface({input:process.stdin})) {
 const message=JSON.parse(line);
 if(message.method==='initialize')emit({id:message.id,result:{}});
 if(message.method==='thread/start')emit({id:message.id,result:{thread:{id:'app-server-thread'}}});
 if(message.method==='turn/start') {
  if(mode==='rpc'){emit({id:message.id,error:{code:-32603,message:'RPC failed',data:{error:payload}}});continue;}
  emit({id:message.id,result:{turn:{id:'turn'}}});
  emit({method:'item/completed',params:{item:{type:'agentMessage',text:'当前草稿已保存'}}});
  emit({method:'error',params:{threadId:'app-server-thread',willRetry:true,error:payload}});
  if(mode==='eof')process.exit(0);
  emit({method:'turn/completed',params:{turn:{status:mode==='recovered'?'completed':'failed',error:mode==='recovered'?null:{...payload,codexErrorInfo:'other'}}}});
 }
}
`, { mode: 0o700 });
  const agents = new CodexAgents({ codexPathOverride: executable, cwd: f.cwd, logDirectory: f.logDirectory });
  const session = agents.createSession();
  try {
    if (mode === 'recovered') {
      const result = await session.run({ name: mode, prompt: 'same task', tools: [] });
      assert.equal(result.text, '当前草稿已保存');
      const record = JSON.parse(await readFile(join(result.logDirectory!, 'result.json'), 'utf8'));
      assert.equal(record.status, 'completed');
      assert.equal(record.errorDetails, undefined);
    } else {
      let failure: AgentCallError | undefined;
      await assert.rejects(session.run({ name: mode, prompt: 'same task', tools: [] }), error => {
        assert.ok(error instanceof AgentCallError); failure = error;
        assert.match(JSON.stringify(error.details), /bad_reference/);
        assert.equal(error.threadId, 'app-server-thread');
        if (mode === 'rpc') assert.equal(error.message, 'RPC failed');
        else assert.equal(error.finalResponse, '当前草稿已保存');
        return true;
      });
      const record = JSON.parse(await readFile(join(failure!.logDirectory!, 'result.json'), 'utf8'));
      assert.match(JSON.stringify(record.errorDetails), /bad_reference/);
      assert.match(await readFile(join(f.cwd, 'workflow.log'), 'utf8'), /bad_reference/);
    }
  } finally { await session.close(); }
});

test('real Codex SDK adapter preserves turn.failed fields and last message in failure records', async t => {
  const f = await fixture(t);
  const executable = join(f.root, 'codex-sdk.mjs');
  await writeFile(executable, `#!${process.execPath}
for await(const chunk of process.stdin){}
for(const event of ${JSON.stringify([
    { type: 'thread.started', thread_id: 'sdk-thread' },
    { type: 'item.completed', item: { type: 'agent_message', id: 'msg', text: '当前草稿已保存' } },
    { type: 'turn.failed', error: payload },
  ])})console.log(JSON.stringify(event));
`, { mode: 0o700 });
  const agents = new CodexAgents({ codexPathOverride: executable, cwd: f.cwd, logDirectory: f.logDirectory });
  let failure: AgentCallError | undefined;
  await assert.rejects(agents.run({ name: 'sdk-error', prompt: 'same task' }), error => {
    assert.ok(error instanceof AgentCallError); failure = error;
    assert.deepEqual(error.details, payload); return true;
  });
  const record = await savedFailure(failure!, f.cwd);
  assert.equal(record.finalResponse, '当前草稿已保存');
});

test('raw raster SDK path keeps turn.failed details without retrying or replacing its thread', async () => {
  const client = { startThread() { return { async runStreamed() { return { events: (async function* () {
    yield { type: 'thread.started', thread_id: 'raster-thread' };
    yield { type: 'item.completed', item: { id: 'msg', type: 'agent_message', text: '草稿已保存' } };
    yield { type: 'turn.failed', error: payload };
  })() }; } }; }, resumeThread() { assert.fail('unexpected replacement'); } };
  await assert.rejects(runAgent({ prompt: 'same task', directory: '/tmp', model: 'fixture', effort: 'low', onEvent: async () => {} },
    client as Parameters<typeof runAgent>[1], new AgentRuntime(1, async () => assert.fail('must not retry'))), error => {
    assert.ok(error instanceof AgentCallError);
    assert.deepEqual(error.details, payload); assert.equal(error.threadId, 'raster-thread');
    assert.match(formatAgentError(error), /草稿已保存/); return true;
  });
});

for (const harness of ['claude', 'agv'] as const) test(`${harness}: structured errors survive CLI results and workflow.log`, async t => {
  const f = await fixture(t);
  const executable = join(f.root, `${harness}.mjs`);
  const final = harness === 'claude'
    ? { type: 'result', session_id: 'cli-session', is_error: true, subtype: 'error_during_execution', errors: [payload] }
    : { event: 'result', result: { conversation_id: 'cli-session', status: 'ERROR', error: payload, response: '当前草稿已保存' } };
  await writeFile(executable, `#!${process.execPath}
for await(const chunk of process.stdin){}
console.log(JSON.stringify({type:'assistant',session_id:'cli-session',message:{content:[{type:'text',text:'当前草稿已保存'}]}}));
console.log(JSON.stringify(${JSON.stringify(final)}));
process.exit(3);
`, { mode: 0o700 });
  const settings = loadWorkflowEnvironment({ [`layering_${harness}_path`]: executable }, f.root);
  const model = parseAgentModel(harness === 'agv' ? 'gemini-4-argon-high' : 'claude-haiku-5.5-xhigh', 'test');
  let failure: AgentCallError | undefined;
  await assert.rejects(runCliTask({ name: harness, cwd: f.cwd, prompt: 'same task' }, model, settings,
    { cwd: f.cwd, logDirectory: f.logDirectory }, new AbortController().signal), error => {
    assert.ok(error instanceof AgentCallError); failure = error;
    assert.equal(error.message, payload.message);
    assert.doesNotMatch(error.message, /\[object Object\]/); return true;
  });
  const record = await savedFailure(failure!, f.cwd);
  assert.equal(record.processExitCode, 3);
  assert.equal(record.finalResponse, '当前草稿已保存');
});
