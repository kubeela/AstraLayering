import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { copyAsPng, isPng, pngBytes } from '../png.ts';

test('复制图片一律落为 PNG；同一张非 PNG 原图再次转换结果一致', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'png-copy-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const image = sharp({ create: { width: 4, height: 3, channels: 3, background: '#c08040' } });
  const jpg = join(directory, 'source.jpg'), png = join(directory, 'source.png');
  await writeFile(jpg, await image.clone().jpeg().toBuffer());
  await writeFile(png, await image.clone().png().toBuffer());
  await copyAsPng(jpg, join(directory, 'from-jpg.png'));
  await copyAsPng(png, join(directory, 'from-png.png'));
  const converted = await readFile(join(directory, 'from-jpg.png'));
  assert.ok(isPng(converted));
  assert.deepEqual((await sharp(converted).metadata()).width, 4);
  assert.deepEqual(await readFile(join(directory, 'from-png.png')), await readFile(png));
  assert.deepEqual(await pngBytes(jpg), converted);
});
