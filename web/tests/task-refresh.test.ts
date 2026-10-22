import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const refresh = source.slice(source.indexOf('let refreshVersion='), source.indexOf('function artifacts('));

function fixture(status: string, interaction: string) {
  const next = { status, runnerAlive: status === 'running', lockHeld: status === 'running', files: [], pipelines: [] };
  const calls: string[] = [];
  const context: any = {
    data: { status: 'running', runnerAlive: true, lockHeld: true },
    state: { name: 'test', directory: '/runs', page: 'project', asset: null },
    document: {
      activeElement: { matches: () => interaction === 'focus' },
      querySelector: (selector: string) => selector === '.app-header' ||
        (selector === 'dialog[open]' && interaction === 'dialog') ||
        (selector === '.panning' && interaction === 'panning') ? {} : null,
    },
    get: async (path: string) => path === './api/tasks' ? { directory: '/runs', tasks: [{ name: 'test' }] } : next,
    taskParams: () => 'name=test',
    rememberTask: () => {},
    selectedTask: () => 'test',
    applySnapshot: (value: any) => { context.data = value; calls.push('apply'); },
    render: () => calls.push('render'),
  };
  return { calls, next, context, run: () => runInNewContext(refresh + '\nrefreshTask();', context) };
}

for (const status of ['failed', 'interrupted', 'completed']) {
  for (const interaction of ['focus', 'dialog', 'panning']) {
    test(`${status} updates immediately while ${interaction} is active`, async () => {
      const f = fixture(status, interaction);
      await f.run();
      assert.deepEqual(f.calls, ['apply', 'render']);
      assert.equal(f.context.data, f.next);
    });
  }
}

test('artifact-only refreshes still defer during interaction', async () => {
  const f = fixture('running', 'focus');
  await f.run();
  assert.deepEqual(f.calls, []);
});

test('group selection keeps focus while progress and intermediate files refresh', async () => {
  const f = fixture('running', 'focus');
  let focused = false;
  f.context.document.activeElement = { dataset: { treeDepth: '0' }, getAttribute: () => '0', matches: () => true };
  const query = f.context.document.querySelector;
  f.context.document.querySelector = (selector: string) => selector === '[data-tree-depth="0"]' ? { focus: () => { focused = true; } } : query(selector);
  await f.run();
  assert.deepEqual(f.calls, ['apply', 'render']); assert.equal(focused, true);
});

test('the separate preview tab still redraws new progress and artifacts', async () => {
  const f = fixture('running', 'none');
  f.context.state.page = 'preview';
  await f.run();
  assert.deepEqual(f.calls, ['apply', 'render']);
});

test('loss of runner updates even before persisted status leaves running', async () => {
  const f = fixture('running', 'focus');
  f.next.runnerAlive = false;
  await f.run();
  assert.deepEqual(f.calls, ['apply', 'render']);
});

test('failure notice includes the last model message and stays visibly stopped', () => {
  const notice = source.slice(source.indexOf('function runNotice()'), source.indexOf('let flowObserver;'));
  const html = runInNewContext(notice + '\nrunNotice();', {
    data: { status: 'failed', errors: [], run: { error: '未交付结果\n模型最后消息：工具不可用' } },
    taskStatusNames: { failed: '执行失败' }, esc: (value: string) => value, icon: () => '',
  });
  assert.match(html, /执行失败 · 未交付结果/);
  assert.match(html, /模型最后消息：工具不可用/);
  assert.match(html, /class="run-notice error" open/);
});
