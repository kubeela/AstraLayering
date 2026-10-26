import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { AgentLog } from '../codex/agent-log.ts';
import { followNativeLog } from '../codex/native-log.ts';
import { readTaskLog } from '../../workflow/log.ts';

test('concurrent agents and raster steps write the same task log, retaining independent request records', async t => {
  const root = await mkdtemp(join(tmpdir(), 'layering-log-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const a = await AgentLog.create(join(root, 'part-layering/agents'), 'hair/right', { prompt: 'draw' });
  const b = await AgentLog.create(join(root, 'raster-layering/step02/agents'), 'step02', { prompt: 'repair' });
  await Promise.all([a.recordProtocol({ method: 'layering/tool', params: { name: 'preview_svg', success: true } }),
    b.record({ type: 'item.completed', item: { type: 'agent_message', id: 'message', text: '修画完成' } })]);
  await AgentLog.retry(a.directory, { attempt: 1, nextAttempt: 2, delayMs: 5000, error: 'HTTP503' });
  await a.finish({ status: 'completed' }); await b.finish({ status: 'completed' });
  const log = await readFile(join(root, 'workflow.log'), 'utf8');
  assert.match(log, /\[hair\/right\].*preview_svg/s); assert.match(log, /\[step02\] 消息：修画完成/);
  assert.match(log, /HTTP503/);
  for (const agent of [a, b]) {
    const files = await readdir(agent.directory);
    assert.deepEqual(files.sort(), ['events.jsonl', 'prompt.md', 'request.json', 'result.json']);
    assert.equal(await readFile(join(agent.directory, 'prompt.md'), 'utf8'), agent === a ? 'draw' : 'repair');
  }
});

test('native diagnostics reach workflow.log and an ignored update switch reports a failure', async t => {
  const root = await mkdtemp(join(tmpdir(), 'layering-native-log-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const log = await AgentLog.create(join(root, 'clothing-part-layering/agents'), '衣服返修', {});
  const native = join(root, 'native.log'), errors: string[] = [];
  await writeFile(native, 'I1022 request started\nE1022 timeout awaiting response headers\nI1022 auto_updater.go:334] Spawned background update process with PID 123\n');
  await followNativeLog(native, log, message => errors.push(message)).close();
  const text = await readFile(join(root, 'workflow.log'), 'utf8');
  assert.match(text, /timeout awaiting response headers/);
  assert.equal(errors.length, 1); assert.match(errors[0], /禁用自动更新未生效/);
  await assert.rejects(readFile(native), { code: 'ENOENT' });
});

test('Claude tool-only activity after rate limiting updates the sole workflow log and its web summary', async t => {
  const root = await mkdtemp(join(tmpdir(), 'layering-cli-log-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const log = await AgentLog.create(join(root, 'character-assembly/agents'), 'assembly', {});
  await log.recordProtocol({ type: 'system', subtype: 'api_retry', attempt: 5, error: 'rate_limit' });
  await log.recordProtocol({ type: 'assistant', message: { content: [
    { type: 'thinking', thinking: 'private reasoning', signature: 'private signature' },
    { type: 'tool_use', id: 'fit', name: 'Bash', input: { command: 'python fit.py', description: 'Fit clothing transform' } },
  ] } });
  await log.recordProtocol({ type: 'system', subtype: 'task_notification', tool_use_id: 'fit', status: 'completed', summary: 'Fit clothing transform' });
  await log.recordProtocol({ type: 'user', message: { content: [
    { type: 'tool_result', tool_use_id: 'fit', is_error: false, content: 'Fit completed: scale=0.418' },
  ] } });
  const text = await readFile(join(root, 'workflow.log'), 'utf8');
  assert.match(text, /退避重试（第 5 次）.*rate_limit/);
  assert.match(text, /工具开始：Bash（fit）/);
  assert.match(text, /后台工具完成：fit/);
  assert.match(text, /工具完成：fit.*scale=0.418/);
  assert.doesNotMatch(text, /private reasoning|private signature/);
  const latest = await readTaskLog(root);
  assert.ok(latest.message);
  assert.match(latest.message, /scale=0.418/);
});

test('CLI image results and long tool output stay readable without discarding the raw request record', async t => {
  const root = await mkdtemp(join(tmpdir(), 'layering-cli-media-log-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const log = await AgentLog.create(join(root, 'raster-layering/agents'), 'step02', {});
  const data = 'fixture-image-data';
  await log.recordProtocol({ type: 'user', message: { content: [
    { type: 'tool_result', tool_use_id: 'preview', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data } }] },
    { type: 'tool_result', tool_use_id: 'inspect', is_error: true, content: 'missing input\n' + 'x'.repeat(8000) },
  ] } });
  const text = await readFile(join(root, 'workflow.log'), 'utf8');
  assert.match(text, /工具完成：preview/);
  assert.match(text, /二进制数据/);
  assert.doesNotMatch(text, new RegExp(data));
  assert.match(text, /工具失败：inspect.*missing input/);
  assert.match(text, /内容较长/);
  assert.ok(text.length < 5000);
  assert.match(await readFile(join(log.directory, 'events.jsonl'), 'utf8'), new RegExp(data));
});
