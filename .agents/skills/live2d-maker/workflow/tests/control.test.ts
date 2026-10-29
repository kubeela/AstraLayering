import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canStopTask } from '../control.ts';

test('停止能力按真实运行状态判断，不要求由网页启动', () => {
  const runner = { id: 'current', pid: process.pid, startedAt: new Date().toISOString() };
  assert.equal(canStopTask(runner, true, true), true);
  assert.equal(canStopTask(runner, false, true), false);
  assert.equal(canStopTask(runner, true, false), false);
  assert.equal(canStopTask(undefined, true, true), false);
});
