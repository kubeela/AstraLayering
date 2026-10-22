import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindingDefaults, physicsVersion } from '../studio/physics-model.js';
const { PhysicsPanel } = await import(new URL('../studio/physics-panel.js', import.meta.url).href);

test('project preparation does not guess bindings; Jianma resets old drafts and preserves newly authored bindings', async t => {
  const store = new Map<string, string>();
  for (const [key, value] of Object.entries({
    localStorage: { getItem: (key: string) => store.get(key) || null },
    requestAnimationFrame: () => 1,
  })) {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  }
  const parts = [{ id: 'hair', name: 'left_long_tail' }, { id: 'skirt', name: 'skirt_front' }];
  const panel = (owner: any) => Object.assign(Object.create(PhysicsPanel.prototype), {
    epoch: 0, source: () => owner, busy: () => false, fingerprint: () => 'source-hash', bindings: new Map(),
    surfaces: { prepare: async () => true, layers: parts, size: [100, 100] },
    sync() {}, options() {}, changed() {},
    error(message: string) { assert.fail(message); },
    rebuild(this: any) { this.bodies = new Map([...this.bindings].filter(([, binding]: any) => binding.enabled)); },
    save(this: any) { store.set(this.storageKey(), JSON.stringify(this.recipe())); },
  });
  const normal = panel({ name: 'character.kra' });
  await normal.prepare();
  assert.equal(normal.bodies.size, 0, 'part names created physical components');

  const previous = JSON.stringify({ schema: 1, solver: physicsVersion, sourceHash: 'source-hash', size: [100, 100],
    bindings: Object.fromEntries(parts.map(p => [p.id, { ...bindingDefaults(), enabled: true }])) });
  store.set('astra-physics-1:source-hash', previous);
  const jianma = { name: 'jianma-assembled.kra', project: { name: 'jianma-shadow-fresh-20261022' } };
  const reset = panel(jianma);
  await reset.prepare();
  assert.equal(reset.bodies.size, 0, 'legacy Jianma bindings were restored');
  assert.equal(store.get('astra-physics-1:source-hash'), previous, 'another project draft was deleted');
  reset.bindings.get('skirt').enabled = true;
  reset.save();
  const reopened = panel(jianma);
  await reopened.prepare();
  assert.deepEqual([...reopened.bodies.keys()], ['skirt'], 'new Jianma authoring was reset again');

  const other = panel({ name: 'another-character.kra' });
  await other.prepare();
  assert.equal(other.bodies.size, 2, 'another project lost its existing authored draft');
});
