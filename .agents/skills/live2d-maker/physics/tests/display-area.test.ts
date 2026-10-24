import assert from 'node:assert/strict';
import test from 'node:test';
import { ComponentScene } from '../../shared/physics-core/component-physics-model.js';
import { componentDefaults } from '../../shared/physics-core/component-physics-schema.js';
import { applyTestInput } from '../../shared/physics-evidence/physics-test-input.js';
import { MotionStepTracker, motionIssues } from '../../shared/physics-evidence/physics-motion-review.js';

function scene() {
  // A one-pixel slit at a pinned hair boundary reproduces the failure: legal
  // pendulum controls compress a display face and retreat the whole free curve.
  const component = { id: 'hair', name: 'hair', kind: 'strand', priority: 'primary', enabled: true,
    layerRefs: [{ uuid: 'hair', contentHash: 'a'.repeat(64) }], sourcePartIds: ['hair'], supports: [{ id: 'root', at: [100, 40] }],
    ...componentDefaults('strand'), authoring: { freeLength: 300, transitionPixels: 36,
      fixedRegions: [[[80, 20], [120, 20], [120, 60], [80, 60]]], contour: [[80, 20], [120, 20], [150, 340], [70, 340]],
      centerline: [[100, 40], [100, 80], [105, 140], [120, 200], [140, 260], [120, 320]],
      widths: [25, 25, 25, 45, 50, 25], holes: [[[104, 61], [105, 61], [105, 64], [104, 64]]], swing: { parallel: .55 }, subdivisions: 2 } };
  Object.assign(component.response, { frequencyHz: 1.08, dampingRatio: .308, inputGain: 1, windGain: .36, outputGain: 1.4 });
  Object.assign(component.limits, { maxTravel: .09, maxAngle: 14, minAreaRatio: .72 });
  return new ComponentScene({ kind: 'astra-component-physics', version: 1, solver: 'astra-component-physics-1',
    source: { canvas: { width: 300, height: 400 } }, components: [component] });
}

test('the blended strand display Jacobian agrees with finite differences under a rotated parent', () => {
  const s = scene(), b = s.bodies.get('hair'); s.sourcePose = { x: 7, y: -3, angle: .03 }; b.prepare(1 / 120);
  b.p.set(b.pPose); for (let i = 0; i < b.mobility.length; i++) b.p[i * 2] += i * 1.5 * b.mobility[i]; b.syncMesh();
  const vertices = [b.weights.findIndex((w: number) => w > .1 && w < .9), b.weights.findIndex((w: number) => w === 1)],
    gradient = [.8, -.3], epsilon = 1e-4;
  for (const vertex of vertices) {
    assert(vertex >= 0); const controls = new Map(); b.accumulateDisplayGradient(vertex, gradient, controls);
    for (let id = 0; id < b.mobility.length; id++) for (let axis = 0; axis < 2; axis++) {
      const index = id * 2 + axis, initial = b.p[index];
      b.p[index] = initial + epsilon; b.syncMesh(); const plus = b.positions[vertex * 2] * gradient[0] + b.positions[vertex * 2 + 1] * gradient[1];
      b.p[index] = initial - epsilon; b.syncMesh(); const minus = b.positions[vertex * 2] * gradient[0] + b.positions[vertex * 2 + 1] * gradient[1];
      b.p[index] = initial;
      assert(Math.abs((plus - minus) / (epsilon * 2) - (controls.get(id)?.[axis] ?? 0)) < 2e-7);
    }
  }
});

test('a thin pinned display face no longer stops the whole hair curve when its parent moves', () => {
  const current = scene(), prior = scene(), b = current.bodies.get('hair'), old = prior.bodies.get('hair');
  old.correctDisplayAreas = () => false;
  const rest = new Float64Array(b.rest), indices = new Uint32Array(b.indices), author = structuredClone(b.component.authoring), limits = { ...b.component.limits };
  let retreats = 0, peak = 0, oldPeak = 0;
  for (let step = 1; step <= 960; step++) for (const s of [current, prior]) {
    applyTestInput(s, 'support-release', step); s.sourcePose.x *= 4; s.step(); const body = s.bodies.get('hair');
    assert(body.stats.valid); assert.equal(body.stats.root, 0);
    if (s === prior) { retreats += +body.stats.fallback; oldPeak = Math.max(oldPeak, body.stats.travel); }
    else { assert.equal(body.stats.fallback, false); assert(body.stats.minArea >= limits.minAreaRatio - 1e-5); peak = Math.max(peak, body.stats.travel); }
  }
  assert(retreats > 10, 'exercise the actual previously failing displayed geometry');
  assert(peak > oldPeak * .95, 'preserve visible response instead of suppressing the input');
  assert.deepEqual(b.rest, rest); assert.deepEqual(b.indices, indices); assert.deepEqual(b.component.authoring, author); assert.deepEqual(b.component.limits, limits);
});

test('legal breeze movement stays identical when display projection is available', () => {
  const current = scene(), prior = scene(); prior.bodies.get('hair').correctDisplayAreas = () => false;
  for (let step = 1; step <= 960; step++) {
    // The slit fixture deliberately fails at the full load. Here exercise the
    // legal low-load path, where no projection should alter the artwork.
    for (const s of [current, prior]) { applyTestInput(s, 'airflow', step); s.airflow.x *= .05; s.airflow.y *= .05; s.step(); assert.equal(s.bodies.get('hair').stats.fallback, false); }
    assert.deepEqual(current.bodies.get('hair').positions, prior.bodies.get('hair').positions);
  }
});

test('a continuous retreat cannot hide behind a low total or a strong-input exception', () => {
  const tracker = new MotionStepTracker({ width: 300, height: 400 }, 2);
  for (const fallback of [false, true, true, true, false, true]) tracker.update([100, 40], { x: 0, y: 0, angle: 0 }, fallback);
  assert.equal(tracker.maxFallbackStreak, 3); assert.equal(tracker.fallbackStreak, 1);
  const c = scene().bodies.get('hair').component, metric = { root: 0, invalid: 0, fallback: 4, limited: 4,
    visiblePeak: 5, peak: 5, final: 0, maxStep: 0, maxAcceleration: 0, maxFallbackStreak: tracker.maxFallbackStreak };
  for (const test of ['support-release', 'combined', 'extreme']) assert(motionIssues(test, c, metric).includes('continuous-retreat'));
  assert(!motionIssues('combined', c, { ...metric, maxFallbackStreak: 2 }).includes('continuous-retreat'));
});
