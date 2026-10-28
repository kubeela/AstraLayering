import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('function laneFailure('), source.indexOf('const taskStatusNames'));
const laneFailure = (pipeline: unknown) => runInNewContext(helper + '\nlaneFailure(pipeline);', { pipeline });

test('a failed lane shows its reason unless a step already shows it', () => {
  // Part lanes mark failed calls with a generic message; the lane still says why it stopped.
  assert.equal(laneFailure({ summary: 'ENAMETOOLONG\nstack', messages: { outline: '调用失败，请查看运行记录：组轮廓绘制-face' } }), 'ENAMETOOLONG');
  // Shadow and other lanes without any step message.
  assert.equal(laneFailure({ summary: 'Krita 桥接就绪前退出', messages: {} }), 'Krita 桥接就绪前退出');
  assert.equal(laneFailure({ summary: 'ENAMETOOLONG', messages: { 'review-01': 'ENAMETOOLONG' } }), '');
  assert.equal(laneFailure({ messages: {} }), '');
});
