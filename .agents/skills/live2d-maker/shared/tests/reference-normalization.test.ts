import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, type TestContext } from 'node:test';
import sharp from 'sharp';
import { normalizeReference } from '../part/reference-normalization.ts';

async function fixture(t: TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'reference-normalization-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { input: join(dir, 'input.png'), standard: join(dir, 'standard.png'), output: join(dir, 'out.png') };
}

test('自动识别不同边缘主色，全局清除封闭孔洞且保持前景', async t => {
  for (const color of [[0, 255, 0], [245, 10, 20], [5, 10, 245], [230, 230, 230]]) {
    const f = await fixture(t), data = Buffer.alloc(64 * 64 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const foreground = x > 15 && x < 48 && y > 15 && y < 48 && !(x > 27 && x < 36 && y > 27 && y < 36);
      const i = (y * 64 + x) * 4;
      [...(foreground ? [65, 50, 70] : color), 255].forEach((v, c) => data[i + c] = v);
    }
    await sharp(data, { raw: { width: 64, height: 64, channels: 4 } }).png().toFile(f.input);
    const result = await normalizeReference(f.input, f.input, f.output);
    assert.deepEqual(result.key, color);
    const out = await sharp(f.output).raw().toBuffer();
    assert.equal(out[3], 0);
    assert.equal(out[(32 * 64 + 32) * 4 + 3], 0);
    assert.deepEqual([...out.subarray((22 * 64 + 22) * 4, (22 * 64 + 22) * 4 + 4)], [65, 50, 70, 255]);
  }
});

test('透明边缘且尺寸一致的 PNG 原字节保留，不受透明像素 RGB 干扰', async t => {
  const f = await fixture(t);
  await sharp({ create: { width: 64, height: 64, channels: 4, background: '#ff00ff00' } })
    .composite([{ input: Buffer.from('<svg width="64" height="64"><rect x="20" y="20" width="24" height="24" fill="white"/></svg>') }]).png().toFile(f.input);
  const report = await normalizeReference(f.input, f.input, f.output);
  assert.equal(report.keySkipped, true); assert.equal(report.resized, false);
  assert.deepEqual(await readFile(f.output), await readFile(f.input));
});

test('JPEG 压缩背景去色后等比缩放，透明补边以 standard 为准', async t => {
  const f = await fixture(t);
  await sharp({ create: { width: 80, height: 120, channels: 3, background: '#10f508' } })
    .composite([{ input: Buffer.from('<svg width="80" height="120"><rect x="25" y="15" width="30" height="90" fill="#785348"/></svg>') }]).jpeg({ quality: 85 }).toFile(f.input);
  await sharp({ create: { width: 100, height: 100, channels: 4, background: '#0000' } }).png().toFile(f.standard);
  const report = await normalizeReference(f.input, f.standard, f.output);
  assert.deepEqual(report.target, [100, 100]); assert.equal(report.scale, 100 / 120);
  assert.deepEqual(report.offset, [16, 0]); assert.ok(report.removed > 5000);
  const m = await sharp(f.output).metadata(); assert.equal(m.width, 100); assert.equal(m.height, 100);
  assert.equal((await sharp(f.output).raw().toBuffer())[3], 0);
});

test('多色不透明边缘没有可靠抠图色时不猜测背景', async t => {
  const f = await fixture(t), data = Buffer.alloc(32 * 32 * 4);
  for (let p = 0; p < 1024; p++) { data[p * 4] = p % 32 * 8; data[p * 4 + 1] = Math.floor(p / 32) * 8; data[p * 4 + 3] = 255; }
  await sharp(data, { raw: { width: 32, height: 32, channels: 4 } }).png().toFile(f.input);
  const result = await normalizeReference(f.input, f.input, f.output);
  assert.equal(result.key, null); assert.deepEqual(await readFile(f.output), await readFile(f.input));
});

test('混合过渡边缘参考邻近前景恢复颜色与透明度，不直接擦除', async t => {
  const f = await fixture(t), w = 64, data = Buffer.alloc(w * w * 4);
  const bg = [10, 250, 5], fg = [110, 75, 60];
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const a = x >= 20 && x <= 44 && y >= 20 && y <= 44 ? 1 : x === 19 && y >= 22 && y <= 42 ? 0.5 : 0;
    const i = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(a * fg[c] + (1 - a) * bg[c]);
    data[i + 3] = 255;
  }
  await sharp(data, { raw: { width: w, height: w, channels: 4 } }).png().toFile(f.input);
  const report = await normalizeReference(f.input, f.input, f.output);
  const result = await sharp(f.output).raw().toBuffer(), i = (32 * w + 19) * 4;
  assert.ok(report.decontaminated > 0);
  assert.ok(result[i + 3] > 100 && result[i + 3] < 155);
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(result[i + c] - fg[c]) < 12);
});
