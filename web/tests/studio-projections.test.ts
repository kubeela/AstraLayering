import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectionLayers, projectionOnlyEdit } from '../studio/projection-model.js';
import { validateSettings } from '../studio/lighting-model.js';

test('Production shadow UUIDs resolve native layers and only shadow color edits preserve data maps', () => {
  const bindings = { shadows: [{ shadowLayerUuid: 'abc-123', casterLayerUuids: ['CASTER'], receiverLayerUuids: ['receiver'] }] };
  const baseline = [
    { id: 'n0', uuid: '{ABC-123}', visible: true, opacity: 255, blend: 'multiply', inheritAlpha: true, passThrough: null },
    { id: 'n1', uuid: 'caster', visible: true, opacity: 255, blend: 'normal', inheritAlpha: false, passThrough: null },
    { id: 'n2', uuid: 'receiver', visible: true, opacity: 255, blend: 'normal', inheritAlpha: false, passThrough: null },
  ];
  const resolved = projectionLayers(bindings, baseline)[0];
  assert.equal(resolved.layer?.id, 'n0'); assert.equal(resolved.casters[0].id, 'n1'); assert.equal(resolved.receivers[0].id, 'n2');
  const edited = baseline.map(l => ({ ...l }));
  edited[0].visible = false; edited[0].opacity = 100;
  assert.equal(projectionOnlyEdit(bindings, baseline, edited), true);
  edited[1].visible = false;
  assert.equal(projectionOnlyEdit(bindings, baseline, edited), false);
  edited[1].visible = true; edited[0].inheritAlpha = false;
  assert.equal(projectionOnlyEdit(bindings, baseline, edited), false);
  assert.equal(projectionOnlyEdit(null, baseline, edited), false);
  assert.equal(projectionLayers(bindings, [])[0].layer, undefined);
});
test('Lighting blend has bounded endpoints and old recipes keep full MToon lighting', () => {
  assert.equal(validateSettings({}).lightingMix, 1);
  assert.equal(validateSettings({ lightingMix: 0 }).lightingMix, 0);
  assert.equal(validateSettings({ lightingMix: 1 }).lightingMix, 1);
  assert.throws(() => validateSettings({ lightingMix: 1.1 }), /lightingMix/);
});
