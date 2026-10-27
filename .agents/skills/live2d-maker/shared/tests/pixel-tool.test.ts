import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { strToU8, zipSync } from 'fflate';
import { createPixelTool } from '../raster/pixel-tool.ts';
import { partScope, type PartScopeOptions } from '../raster/pixel-part-scope.ts';

async function fixture(t: any, options: PartScopeOptions = {}) {
  const base = await mkdtemp(join(tmpdir(), 'pixel-localization-')), task = join(base, 'case'), cwd = join(task, 'raster-layering');
  await mkdir(cwd, { recursive: true }); t.after(() => rm(base, { recursive: true, force: true }));
  const make = async (name: string, rectangles: [number, number, number, number, number[]][]) => {
    const data = Buffer.alloc(32 * 32 * 4);
    for (const [x, y, w, h, rgba] of rectangles) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++)
      rgba.forEach((n, c) => { data[(yy * 32 + xx) * 4 + c] = n; });
    await sharp(data, { raw: { width: 32, height: 32, channels: 4 } }).png().toFile(join(cwd, name));
  };
  const tool = createPixelTool(cwd, task, join(cwd, 'step01/pixel-review'), options);
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

async function ora(layers: { name: string; x: number; y: number; width: number; height: number; hole?: boolean; hidden?: boolean }[]) {
  const files: Record<string, Uint8Array> = {};
  for (const [index, layer] of layers.entries()) {
    const data = Buffer.alloc(layer.width * layer.height * 4, 255);
    if (layer.hole) for (let y = 2; y < 4; y++) for (let x = 2; x < 4; x++) data[(y * layer.width + x) * 4 + 3] = 0;
    files[`data/layer${index}.png`] = await sharp(data, { raw: { width: layer.width, height: layer.height, channels: 4 } }).png().toBuffer();
  }
  files['stack.xml'] = strToU8(`<image w="32" h="32"><stack>${layers.map((layer, i) =>
    `<layer name="${layer.name}" x="${layer.x}" y="${layer.y}" src="data/layer${i}.png" visibility="${layer.hidden ? 'hidden' : 'visible'}"/>`).join('')}</stack></image>`);
  return zipSync(files);
}

test('按部件实际范围检查多个深度分片及周边缺口，排除头发；不选仍为全图且不调用 Krita', async t => {
  let exports = 0;
  const layers = await ora([
    { name: '05 camisole/bodice L5', x: 12, y: 8, width: 6, height: 4 },
    { name: '09 camisole/bodice L9', x: 12, y: 12, width: 6, height: 4 },
    { name: '13 hair/main', x: 0, y: 0, width: 4, height: 4 },
  ]);
  const f = await fixture(t, { krita: 'fixture-krita', exportLayers: async () => { exports++; return layers; } });
  const red = [180, 80, 80, 255], blue = [80, 80, 180, 255];
  await f.make('reference.png', [[0, 0, 4, 4, red], [10, 8, 8, 8, red]]);
  await f.make('current.png', [[0, 0, 4, 4, blue], [12, 8, 6, 8, blue]]);
  await writeFile(join(f.cwd, 'current.kra'), 'fixture');
  const all = await f.call({ reference: 'reference.png', current: 'current.png' });
  const empty = await f.call({ reference: 'reference.png', current: 'current.png', parts: [] });
  assert.deepEqual(empty.counts, all.counts); assert.deepEqual(empty.regions, all.regions); assert.equal(exports, 0);
  const selected = await f.call({ reference: 'reference.png', current: 'current.png', parts: ['camisole/bodice'], part_padding: 2, min_region_pixels: 1 });
  assert.equal(exports, 1);
  assert.deepEqual(selected.partSelection.layers.map((row: any) => row.bounds), [[12, 8, 6, 4], [12, 12, 6, 4]]);
  assert.deepEqual(selected.regions.find((row: any) => row.kind === 'missing').bounds, [10, 8, 2, 8]);
  assert.deepEqual(selected.regions.find((row: any) => row.kind === 'color').bounds, [12, 8, 6, 8]);
  const mask = await sharp(selected.files.scope).greyscale().raw().toBuffer();
  assert.equal(mask[0], 0); assert.equal(mask[8 * 32 + 10], 255);
  assert.ok(selected.regions.every((row: any) => row.bounds[0] >= 10));
  assert.deepEqual((await sharp(selected.files.scopePreview).metadata()).width, 32);
  await f.make('visible.png', [[10, 8, 4, 8, [255, 255, 255, 255]]]);
  const limited = await f.call({ reference: 'reference.png', current: 'current.png', parts: ['camisole'],
    visible_mask: 'visible.png', crop: [10, 8, 3, 8], part_padding: 2, min_region_pixels: 1 });
  const limitedMask = await sharp(limited.files.scope).greyscale().raw().toBuffer();
  assert.equal(limitedMask[8 * 32 + 10], 255); assert.equal(limitedMask[8 * 32 + 13], 0);
  assert.equal(limitedMask[7 * 32 + 10], 0);
  assert.ok(limited.regions.every((row: any) => row.bounds[0] + row.bounds[2] <= 13));
});

test('父分组包含后代，重叠选择不重复计数，检测内部缺口并保留原坐标', async t => {
  const layers = await ora([
    { name: '衣服 | 01 outfit/body L1', x: 10, y: 10, width: 8, height: 8, hole: true },
    { name: '衣服 | 02 outfit/strap L2', x: 20, y: 2, width: 2, height: 8 },
  ]);
  const a = await partScope(layers, ['clothing:outfit'], 0, [32, 32]);
  const b = await partScope(layers, ['clothing:outfit', 'clothing:outfit/body'], 0, [32, 32]);
  assert.deepEqual(a.mask, b.mask);
  assert.equal(a.mask[12 * 32 + 12], 255); // Interior hole stays in the diagnostic scope.
  assert.equal(a.mask[0], 0); assert.equal(a.mask[4 * 32 + 20], 255);
  assert.deepEqual(a.bounds[0].bounds, [10, 10, 8, 8]);
});

test('未知部件、歧义归属、隐藏部件、KRA 尺寸不符和越界 KRA 均报错，不回退全图', async t => {
  const layers = await ora([
    { name: '人物 | 01 collar', x: 1, y: 1, width: 2, height: 2 },
    { name: '衣服 | 02 collar', x: 10, y: 10, width: 2, height: 2 },
    { name: '衣服 | 03 hidden', x: 20, y: 20, width: 2, height: 2, hidden: true },
  ]);
  await assert.rejects(partScope(layers, ['unknown'], 0, [32, 32]), /没有部件/);
  await assert.rejects(partScope(layers, ['collar'], 0, [32, 32]), /归属不明确/);
  await assert.rejects(partScope(layers, ['hidden'], 0, [32, 32]), /隐藏/);
  await assert.rejects(partScope(layers, ['clothing:collar'], 0, [40, 32]), /画布尺寸不同/);
  const selected = await partScope(layers, ['clothing:collar'], 0, [32, 32]);
  assert.deepEqual(selected.bounds[0].bounds, [10, 10, 2, 2]);
  let exported = '';
  const f = await fixture(t, { krita: 'fixture', exportLayers: async path => { exported = path; throw new Error('export called'); } });
  await f.make('reference.png', []); await f.make('current.png', []);
  await writeFile(join(f.base, 'outside.kra'), 'outside');
  await symlink(join(f.base, 'outside.kra'), join(f.cwd, 'escaped.kra'));
  await assert.rejects(f.call({ reference: 'reference.png', current: 'current.png', parts: ['collar'], current_kra: 'escaped.kra' }), /export called/);
  assert.ok(exported.endsWith('outside.kra'));
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
test('不同画布仍返回错误，输入与输出支持外部路径及符号链接', async t => {
  const f = await fixture(t);
  await f.make('reference.png', []); await f.make('current.png', []);
  await sharp({ create: { width: 4, height: 4, channels: 4, background: '#ffffff' } }).png().toFile(join(f.cwd, 'small.png'));
  await assert.rejects(f.call({ reference: 'reference.png', current: 'small.png' }), /画布尺寸不同/);
  const outside = join(f.base, 'outside.png'); await writeFile(outside, await readFile(join(f.cwd, 'reference.png')));
  await symlink(outside, join(f.cwd, 'escaped.png'));
  await f.call({ reference: 'escaped.png', current: 'current.png' });
  const tool = createPixelTool(f.cwd, f.task, join(f.base, 'outside-output'));
  assert.equal((await tool.execute({ reference: 'reference.png', current: 'current.png' }, new AbortController().signal)).success, true);
});
