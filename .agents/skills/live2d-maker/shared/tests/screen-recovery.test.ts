import assert from 'node:assert/strict';
import { test } from 'node:test';
import { foregroundEnvelope, recoverScreenEdges } from '../agents/screen-recovery.ts';

function fixture(channel: number, foreground = [85, 85, 85]) {
  const width = 24, height = 12, rgb = new Uint8Array(width * height * 3), rgba = new Uint8Array(width * height * 4);
  const truth = new Float64Array(width * height);
  const backgrounds = [[249, 5, 9], [10, 246, 4], [0, 7, 255]];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, a = [0, .08, .25, .5, .75, 1][Math.floor(x / 4)];
    const background = backgrounds[channel].map(value => Math.min(255, value + y % 3));
    truth[i] = a;
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.round(a * foreground[c] + (1 - a) * background[c]);
    if (a > 0) {
      rgba[i * 4 + 3] = Math.round((a === 1 ? 1 : Math.min(1, a + .2)) * 255);
      for (let c = 0; c < 3; c++) rgba[i * 4 + c] = rgb[i * 3 + c];
    }
  }
  return { width, height, rgb, rgba, truth, background: backgrounds[channel] };
}

for (const channel of [0, 1, 2]) test(`recover generated ${['red', 'green', 'blue'][channel]} screen spill while retaining soft alpha and opaque artwork`, () => {
  const f = fixture(channel), before = Uint8Array.from(f.rgba);
  const result = recoverScreenEdges(f.rgb, f.rgba, f.width, f.height, f.background, foregroundEnvelope([[85, 85, 85]], channel));
  assert.deepEqual(f.rgba, before, 'input must not be modified');
  assert.ok(result.report.adjustedPixels > 0);
  for (let y = 0; y < f.height; y++) for (const x of [1, 9, 13, 17, 21]) {
    const i = y * f.width + x, alpha = result.rgba[i * 4 + 3] / 255;
    assert.ok(Math.abs(alpha - f.truth[i]) < .035, `${channel} alpha at ${x},${y}: ${alpha}`);
    if (f.truth[i] > 0 && f.truth[i] < 1) for (let c = 0; c < 3; c++) assert.ok(Math.abs(result.rgba[i * 4 + c] - 85) <= 8, `foreground channel ${c}`);
    if (f.truth[i] === 1) assert.deepEqual(result.rgba.slice(i * 4, i * 4 + 4), before.slice(i * 4, i * 4 + 4));
  }
});

test('same-hue foreground accents are represented and do not get removed as screen colours', () => {
  for (const channel of [0, 1, 2]) {
    const foreground = [80, 85, 90]; foreground[channel] = 180;
    const f = fixture(channel, foreground), i = 5 * f.width + 21;
    const result = recoverScreenEdges(f.rgb, f.rgba, f.width, f.height, f.background, foregroundEnvelope([foreground], channel));
    assert.deepEqual(result.rgba.slice(i * 4, i * 4 + 4), f.rgba.slice(i * 4, i * 4 + 4));
    assert.equal(result.rgba[i * 4 + channel], 180);
    for (const x of [9, 13, 17]) {
      const p = 5 * f.width + x;
      assert.ok(Math.abs(result.rgba[p * 4 + 3] / 255 - f.truth[p]) < .05);
      assert.ok(result.rgba[p * 4 + channel] >= 170, 'genuine semi-transparent coloured accent must keep its hue');
    }
  }
});

test('unmapped foreground colours and absent references do not trigger a blanket channel clamp', () => {
  const f = fixture(1, [130, 190, 80]);
  assert.deepEqual(recoverScreenEdges(f.rgb, f.rgba, f.width, f.height, f.background).rgba, f.rgba);
  const wrong = foregroundEnvelope([[130, 190, 80]], 2);
  assert.deepEqual(recoverScreenEdges(f.rgb, f.rgba, f.width, f.height, f.background, wrong).rgba, f.rgba);
});

test('small background colour variations cannot increase alpha or resurrect removed background', () => {
  const f = fixture(2), i = 5 * f.width + 1;
  f.rgba[i * 4 + 2] = 255; f.rgba[i * 4 + 3] = 1;
  const result = recoverScreenEdges(f.rgb, f.rgba, f.width, f.height, f.background, foregroundEnvelope([[85, 85, 85]], 2));
  for (let p = 0; p < f.width * f.height; p++) assert.ok(result.rgba[p * 4 + 3] <= f.rgba[p * 4 + 3]);
  assert.ok(result.rgba[i * 4 + 3] <= 1);
});
