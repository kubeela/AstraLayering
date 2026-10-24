import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { counterpartBackground, recoverDualBackground } from '../agents/dual-background.ts';

const samples = [
  { rgb: [200, 210, 240], alpha: 64 }, { rgb: [200, 210, 240], alpha: 128 },
  { rgb: [200, 210, 240], alpha: 191 }, { rgb: [200, 210, 240], alpha: 230 },
  { rgb: [200, 210, 240], alpha: 242 }, { rgb: [255, 255, 255], alpha: 255 },
  { rgb: [11, 245, 5], alpha: 255 }, { rgb: [0, 0, 0], alpha: 255 },
];
async function composite(background: number[], width = 64, height = 64) {
  const rgb = Buffer.alloc(width * height * 3);
  for (let p = 0; p < width * height; p++) {
    const x = p % width, y = Math.floor(p / width);
    const sample = x >= 8 && x < 56 && y >= 8 && y < 56 ? samples[Math.floor((y - 8) / 6)] : undefined;
    const alpha = (sample?.alpha ?? 0) / 255;
    for (let c = 0; c < 3; c++) rgb[p * 3 + c] = Math.round(alpha * (sample?.rgb[c] ?? 0) + (1 - alpha) * background[c]);
  }
  return sharp(rgb, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

test('known two-background pairs retain opaque same-colour foreground and fractional 25–95% alpha', async () => {
  for (const bg of [[11, 245, 5], [3, 5, 251], [249, 5, 3], [0, 0, 0]]) {
    const recovered = await recoverDualBackground(await composite(bg), await composite([254, 255, 254]), new AbortController().signal);
    const { data, info } = await sharp(recovered.png).raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height, info.channels], [64, 64, 4]);
    assert.equal(data[3], 0);
    for (const [row, sample] of samples.entries()) {
      const p = ((8 + row * 6 + 2) * 64 + 20) * 4;
      assert.ok(Math.abs(data[p + 3] - sample.alpha) <= 1, `alpha ${sample.alpha}: ${data[p + 3]}`);
      for (let c = 0; c < 3; c++) assert.ok(Math.abs(data[p + c] - sample.rgb[c]) <= 3);
    }
    assert.deepEqual(recovered.report.backgrounds, [bg, [254, 255, 254]]);
    const alpha = await sharp(recovered.alpha).extractChannel(0).raw().toBuffer();
    assert.deepEqual(alpha, Buffer.from(Array.from({ length: 4096 }, (_, p) => data[p * 4 + 3])));
  }
});

test('counterpart selection uses actual borders and chooses black for a white first background', async () => {
  assert.equal(await counterpartBackground(await composite([11, 245, 5])), '#FFFFFF');
  assert.equal(await counterpartBackground(await composite([254, 255, 254])), '#000000');
  const reversed = await recoverDualBackground(await composite([254, 255, 254]), await composite([0, 0, 0]), new AbortController().signal);
  const data = await sharp(reversed.png).raw().toBuffer();
  assert.equal(data[((8 + 5 * 6 + 2) * 64 + 20) * 4 + 3], 255);
  // Real background-only edits may have a one-pixel grey frame on the bottom.
  const framed = await sharp(await composite([254, 255, 254])).composite([
    { input: Buffer.from('<svg width="64" height="64"><rect y="63" width="64" height="1" fill="#dddddd"/></svg>') },
  ]).png().toBuffer();
  assert.equal(await counterpartBackground(framed), '#000000');
});

test('invalid pairs and cancellation fail explicitly instead of resizing or inventing an alpha', async () => {
  const first = await composite([11, 245, 5]), signal = new AbortController().signal;
  await assert.rejects(recoverDualBackground(first, await composite([0, 255, 0]), signal), /颜色过于接近/);
  await assert.rejects(recoverDualBackground(first, await composite([255, 255, 255], 80), signal), /画布尺寸/);
  const striped = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#00ff00' } })
    .composite([{ input: Buffer.from('<svg width="32" height="32"><rect x="16" width="16" height="32" fill="#0000ff"/></svg>') }]).png().toBuffer();
  await assert.rejects(counterpartBackground(striped), /均匀纯色背景/);
  const cancelled = new AbortController(); cancelled.abort(new Error('cancelled'));
  await assert.rejects(recoverDualBackground(first, first, cancelled.signal), /cancelled/);
});
