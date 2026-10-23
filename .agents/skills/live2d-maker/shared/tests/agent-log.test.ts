import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { AgentLog } from '../codex/agent-log.ts';
import { followNativeLog } from '../codex/native-log.ts';

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
