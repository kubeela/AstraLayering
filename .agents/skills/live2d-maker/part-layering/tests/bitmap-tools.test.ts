import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import sharp from 'sharp';
import { createBitmapTool } from '../../shared/part/bitmap-tool.ts';
import type { ToolResult } from '../../shared/codex/function-tools.ts';

const signal = new AbortController().signal;
function text(result: ToolResult) {
  const content = result.contentItems[0];
  assert.equal(content.type, 'inputText');
  return JSON.parse(content.text);
}
function bitmap(result: ToolResult) {
  const content = result.contentItems[1];
  assert.equal(content.type, 'inputImage');
  return Buffer.from(content.imageUrl.split(',')[1], 'base64');
}
async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'part-layering-bitmap-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const reference = join(directory, 'references', '自选目标.png');
  await mkdir(join(directory, 'references'));
  const pixels = Buffer.from([
    255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255,
    255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255,
  ]);
  await sharp(pixels, { raw: { width: 4, height: 2, channels: 4 } }).png().toFile(reference);
  const observations = join(directory, 'observations');
  return { directory, reference, observations, view: createBitmapTool(directory, observations) };
}

test('选框使用原图坐标且先裁剪再放大；图片回传与落盘一致，原图不变', async t => {
  const f = await fixture(t);
  const before = await readFile(f.reference);
  const result = await f.view.execute({ path: 'references/自选目标.png', crop: [2, 0, 2, 2], scale: 3 }, signal);
  const metadata = text(result);
  assert.equal(metadata.width, 6);
  assert.equal(metadata.height, 6);
  assert.deepEqual(metadata.crop, [2, 0, 2, 2]);
  const data = bitmap(result);
  assert.deepEqual(await readFile(metadata.savedPath), data);
  const raw = await sharp(data).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < raw.data.length; i += 4) assert.deepEqual([...raw.data.subarray(i, i + 4)], [0, 0, 255, 255]);
  assert.deepEqual(await readFile(f.reference), before);
});

test('全图查看与 EXIF 正向后的裁剪坐标一致', async t => {
  const f = await fixture(t);
  const path = join(f.directory, 'references', 'rotated.jpg');
  await sharp({ create: { width: 6, height: 3, channels: 3, background: '#ff0000' } })
    .withMetadata({ orientation: 6 }).jpeg().toFile(path);
  const full = text(await f.view.execute({ path }, signal));
  assert.deepEqual(full.source, { width: 3, height: 6 });
  assert.deepEqual(full.crop, [0, 0, 3, 6]);
  const cropped = text(await f.view.execute({ path, crop: [1, 3, 2, 3], scale: 2 }, signal));
  assert.equal(cropped.width, 4);
  assert.equal(cropped.height, 6);
});

test('无效选框与倍率返回具体错误，不落预览', async t => {
  const f = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), 'part-layering-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const path = join(outside, 'outside.png');
  await sharp(f.reference).toFile(path);
  await symlink(outside, join(f.directory, 'references', 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  for (const args of [
    { path: f.reference, crop: [3, 0, 2, 2] }, { path: f.reference, crop: [-1, 0, 2, 2] },
    { path: f.reference, crop: [0, 0, 0, 2] }, { path: f.reference, scale: 0 }, { path: f.reference, scale: 9 },
  ]) await assert.rejects(f.view.execute(args, signal));
  assert.ok(!(await readdir(f.directory)).includes('observations'));
});

test('外部参考、相邻文件及符号链接均可按需查看，原图保持完整', async t => {
  const f = await fixture(t), external = await fixture(t);
  const path = await realpath(external.reference), before = await readFile(path);
  const allowed = createBitmapTool(f.directory, f.observations);
  const viewed = await allowed.execute({ path, crop: [2, 0, 2, 2], scale: 2 }, signal);
  assert.equal(text(viewed).path, path);
  assert.deepEqual(text(viewed).crop, [2, 0, 2, 2]);
  assert.equal((await sharp(bitmap(viewed)).metadata()).width, 4);
  assert.deepEqual(await readFile(path), before);

  const other = join(external.directory, 'other.png');
  await sharp(external.reference).toFile(other);
  await symlink(external.directory, join(f.directory, 'outside'), process.platform === 'win32' ? 'junction' : 'dir');
  for (const path of [other, 'outside/other.png']) assert.equal((await allowed.execute({ path }, signal)).success, true);
});
