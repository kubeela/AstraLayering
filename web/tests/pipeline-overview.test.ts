import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { displayStatus, statusLabel } from '../progress.js';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const renderer = source.slice(source.indexOf('function overviewCard('), source.indexOf('function graph('));
const observed = source.slice(source.indexOf('function observedDisplayStatus('), source.indexOf('function rasterItems('));
function render(statuses: string[], files: string[] = [], running = false, locked = false) {
  return runInNewContext(observed + renderer + '\nprojectPage();', {
    stages: statuses.map((status, i) => ({ name: '管线 ' + i, id: 'pipeline-' + i, status })),
    state: { name: 'case', stage: 0 }, data: { files, runnerAlive: running, lockHeld: locked },
    stepArtifacts: {}, available: () => [], pageHeading: () => '', runNotice: () => '',
    esc: String, icon: () => '', displayStatus, statusLabel,
    statusMark: (status: string) => `<i data-status="${status}"></i>`,
  }) as string;
}

test('执行面板逐管线展示真实状态，完成与失败不再显示为未运行', () => {
  const html = render(['done', 'running', 'available', 'pending', 'failed']);
  for (const [i, label] of ['已完成', '进行中', '已有产物', '待执行', '执行失败'].entries()) {
    const card = html.match(new RegExp(`data-overview="${i}"[\\s\\S]*?</article>`))![0];
    assert.ok(card.includes(label), card);
  }
  assert.doesNotMatch(html, /未运行/);
});

test('停止后已有绘画仍是已有产物，不能误报完成或进行中', () => {
  const html = render(['interrupted', 'unconfirmed'], ['pipeline-0/step01/draft.kra']);
  assert.match(html, /execution-state available/);
  assert.match(html, /execution-state pending/);
  assert.doesNotMatch(html, /已完成|进行中/);
});

test('执行入口遵循总控锁，停止后可续跑已有或失败管线', () => {
  for (const [running, locked] of [[true, false], [false, true], [true, true]]) {
    const html = render(['done', 'failed'], [], running, locked);
    assert.equal((html.match(/data-run-stage="\d+" disabled/g) ?? []).length, 2);
  }
  const stopped = render(['done', 'failed']);
  assert.doesNotMatch(stopped, /data-run-stage="\d+" disabled/);
  assert.equal((stopped.match(/data-stage="\d+"/g) ?? []).length, 4, 'title and preview keep opening the detailed pipeline');
});

test('人物和衣服跳过的 review/repair 共用紧凑节点，明确为无需执行', () => {
  const node = source.slice(source.indexOf('function stepNode('), source.indexOf('function processArtifacts('));
  for (const index of [1, 3]) {
    const html = runInNewContext(node + `\nstepNode(${index}, step, true);`, {
      step: { id: 'repair-02', title: '第 2 轮修复', status: 'skipped' },
      observedDisplayStatus: () => 'done', icon: () => '', esc: String,
    });
    assert.match(html, /skipped-node/); assert.match(html, /无需执行/);
    assert.doesNotMatch(html, /已完成|step-content/);
  }
});
