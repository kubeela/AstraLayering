import assert from 'node:assert/strict';
import { test } from 'node:test';
import { taskStopMethod } from '../control.ts';

test('停止能力按真实运行状态和总调度协议判断，不要求由网页启动', () => {
  const runner = { id: 'current', pid: process.pid, startedAt: new Date().toISOString(), stopProtocol: 'file-v1' as const };
  for (const platform of ['linux', 'darwin', 'win32'] as const) {
    assert.equal(taskStopMethod(runner, true, true, undefined, platform), 'request');
    assert.equal(taskStopMethod(runner, true, true, { runnerId: 'old', token: 'stale' }, platform), 'request');
    assert.equal(taskStopMethod(runner, false, true, undefined, platform), undefined);
    assert.equal(taskStopMethod(runner, true, false, undefined, platform), undefined);
  }
  assert.equal(taskStopMethod(undefined, true, true), undefined);
});

test('已启动的旧网页 worker 继续用匹配的 token，旧终端调度可在 POSIX 上接收原有终止信号', () => {
  const runner = { id: 'current', pid: process.pid, startedAt: new Date().toISOString() };
  for (const platform of ['linux', 'darwin', 'win32'] as const) {
    assert.equal(taskStopMethod(runner, true, true, { runnerId: 'current', token: 'token' }, platform), 'web-request');
  }
  assert.equal(taskStopMethod(runner, true, true, { runnerId: 'old', token: 'stale' }, 'linux'), 'signal');
  assert.equal(taskStopMethod(runner, true, true, undefined, 'darwin'), 'signal');
  assert.equal(taskStopMethod(runner, true, true, undefined, 'win32'), undefined);
});
