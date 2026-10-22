import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectedTask, rememberTask } from '../task-selection.js';

function storage() {
 const values = new Map<string, string>();
 return { getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); } };
}
const tasks = [{ name: 'first' }, { name: 'pink-doll' }];

test('reload selects the saved task; an explicit valid link takes priority', () => {
 const local = storage();
 rememberTask('/runs', 'pink-doll', local);
 assert.equal(selectedTask('/runs', tasks, undefined, local), 'pink-doll');
 assert.equal(selectedTask('/runs', tasks, 'first', local), 'first');
});
test('task memory belongs to its directory, and removed tasks fall back to an available task', () => {
 const local = storage();
 rememberTask('/runs-a', 'pink-doll', local);
 assert.equal(selectedTask('/runs-b', tasks, undefined, local), 'first');
 assert.equal(selectedTask('/runs-a', [{ name: 'first' }], undefined, local), 'first');
 assert.equal(selectedTask('/runs-a', [], undefined, local), '');
 assert.equal(selectedTask('/runs-a', tasks, 'deleted', local), 'pink-doll');
});
test('disabled browser storage does not prevent task browsing', () => {
 const unavailable = { getItem() { throw new Error('disabled'); }, setItem() { throw new Error('disabled'); }, removeItem() { throw new Error('disabled'); } };
 assert.equal(selectedTask('/runs', tasks, undefined, unavailable), 'first');
 assert.doesNotThrow(() => rememberTask('/runs', 'pink-doll', unavailable));
 assert.doesNotThrow(() => rememberTask('/runs', '', unavailable));
});
