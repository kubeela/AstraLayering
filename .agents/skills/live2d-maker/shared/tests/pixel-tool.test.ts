import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createPixelTool } from '../raster/pixel-tool.ts';

async function fixture(t: any) {
  const base = await mkdtemp(join(tmpdir(), 'pixel-localization-')), task = join(base, 'case'), cwd = join(task, 'raster-layering');
  await mkdir(cwd, { recursive: true }); t.after(() => rm(base, { recursive: true, force: true }));
  const make = async (name: string, rectangles: [number, number, number, number, number[]][]) => {
    const data = Buffer.alloc(32 * 32 * 4);
    for (const [x, y, w, h, rgba] of rectangles) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++)
      rgba.forEach((n, c) => { data[(yy * 32 + xx) * 4 + c] = n; });
    await sharp(data, { raw: { width: 32, height: 32, channels: 4 } }).png().toFile(join(cwd, name));
  };
  const tool = createPixelTool(cwd, task, join(cwd, 'step01/pixel-review'));
  const call = async (args: any) => JSON.parse(((await tool.execute(args, new AbortController().signal)).contentItems[0] as { text: string }).text);
  return { base, task, cwd, make, call };
}
test('像素定位准确指出缺口、外伸、色差，并保留原坐标和原始文件', async t => {
  const f = await fixture(t), red = [180, 80, 80, 255], blue = [80, 80, 180, 255];
  await f.make('reference.png', [[4, 4, 8, 8, red], [20, 20, 4, 4, red]]);
  await f.make('current.png', [[6, 4, 8, 8, red], [20, 20, 4, 4, blue]]);
  const before = await readFile(join(f.cwd, 'current.png'));
  const result = await f.call({ reference: 'reference.png', current: 'current.png', min_region_pixels: 1 });
  assert.deepEqual(result.regions.find((r: any) => r.kind === 'missing').bounds, [4, 4, 2, 8]);
  assert.deepEqual(result.regions.find((r: any) => r.kind === 'extra').bounds, [12, 4, 2, 8]);
  assert.deepEqual(result.regions.find((r: any) => r.kind === 'color').bounds, [20, 20, 4, 4]);
  assert.deepEqual(await readFile(join(f.cwd, 'current.png')), before);
  assert.equal((await sharp(result.files.comparison).metadata()).width, 64);
  const cropped = await f.call({ reference: 'reference.png', current: 'current.png', crop: [3, 3, 12, 12], min_region_pixels: 1 });
  assert.deepEqual(cropped.regions.find((r: any) => r.kind === 'missing').bounds, [4, 4, 2, 8]);
});
test('单层可见 mask 保留缺口检测，同时排除合理补全；默认忽略细微颜色差', async t => {
  const f = await fixture(t), skin = [180, 100, 90, 255];
  await f.make('reference.png', [[4, 4, 8, 8, skin]]);
  await f.make('current.png', [[6, 4, 8, 8, [181, 102, 91, 255]], [20, 20, 5, 5, skin]]);
  await f.make('visible.png', [[4, 4, 8, 8, [255, 255, 255, 255]]]);
  const result = await f.call({ reference: 'reference.png', current: 'current.png', visible_mask: 'visible.png', min_region_pixels: 1 });
  assert.equal(result.regions.length, 1); assert.equal(result.regions[0].kind, 'missing');
  assert.deepEqual(result.regions[0].bounds, [4, 4, 2, 8]);
});
test('连贯的中等色差成为细节候选，分组只统计真实差异像素，不把扩展背景计入', async t => {
  const f = await fixture(t), skin = [180, 100, 90, 255];
  await f.make('reference.png', [[0, 0, 32, 32, skin]]);
  await f.make('current.png', [[0, 0, 32, 32, skin], [5, 5, 18, 18, [180, 145, 130, 255]]]);
  const result = await f.call({ reference: 'reference.png', current: 'current.png' });
  assert.ok(result.regions.some((r: any) => r.kind === 'color' && r.bounds[0] < 14 && r.bounds[0] + r.bounds[2] > 14));
  await f.make('current.png', [[0, 0, 32, 32, skin], [15, 15, 1, 1, [0, 100, 90, 255]]]);
  const tiny = await f.call({ reference: 'reference.png', current: 'current.png', min_region_pixels: 2 });
  assert.equal(tiny.regions.length, 0);
  const precise = await f.call({ reference: 'reference.png', current: 'current.png', min_region_pixels: 1 });
  assert.deepEqual(precise.regions[0].bounds, [15, 15, 1, 1]); assert.equal(precise.regions[0].pixels, 1);
});
test('不同尺寸、越界输入/输出和 symlink 逃逸均明确拒绝', async t => {
  const f = await fixture(t);
  await f.make('reference.png', []); await f.make('current.png', []);
  await sharp({ create: { width: 4, height: 4, channels: 4, background: '#ffffff' } }).png().toFile(join(f.cwd, 'small.png'));
  await assert.rejects(f.call({ reference: 'reference.png', current: 'small.png' }), /画布尺寸不同/);
  const outside = join(f.base, 'outside.png'); await writeFile(outside, await readFile(join(f.cwd, 'reference.png')));
  await symlink(outside, join(f.cwd, 'escaped.png'));
  await assert.rejects(f.call({ reference: 'escaped.png', current: 'current.png' }), /本次任务/);
  const tool = createPixelTool(f.cwd, f.task, join(f.base, 'outside-output'));
  await assert.rejects(tool.execute({ reference: 'reference.png', current: 'current.png' }, new AbortController().signal), /诊断输出/);
});
