import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import sharp from 'sharp';
import { checkParentBounds, createSvgPreviewTool, validateGroupSvg } from '../svg-tools.ts';
import type { ToolResult } from '../function-tools.ts';

const signal = new AbortController().signal;
const canvas = { width: 100, height: 100 };
function svg(id: string, shape: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g id="shape" data-group-path="${id}">${shape}</g></svg>`;
}
function info(result: ToolResult) {
  const item = result.contentItems[0];
  assert.equal(item.type, 'inputText');
  return JSON.parse(item.text);
}
async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'part-layering-svg-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const reference = join(directory, 'reference.png');
  await sharp({ create: { ...canvas, channels: 4, background: '#0000ff' } }).png().toFile(reference);
  const path = join(directory, 'candidate.svg');
  await writeFile(path, svg('face', '<path fill="red" d="M20 20H80V80H20Z"/>'));
  const observationDirectory = join(directory, 'observations');
  return { directory, reference, path, observationDirectory, tool: createSvgPreviewTool({ directory, reference, canvas, observationDirectory }) };
}

test('SVG 裁剪直接放大矢量，混合和边缘叠加与参考共用坐标；预览落盘且输入不变', async t => {
  const f = await fixture(t);
  const source = await readFile(f.path), reference = await readFile(f.reference);
  for (const mode of ['svg', 'blend', 'edge']) {
    const result = await f.tool.execute({ path: f.path, mode, crop: [10, 10, 80, 80], scale: 2 }, signal);
    const metadata = info(result);
    assert.deepEqual([metadata.width, metadata.height], [160, 160]);
    const image = result.contentItems[1];
    assert.equal(image.type, 'inputImage');
    assert.deepEqual(await readFile(metadata.savedPath), Buffer.from(image.imageUrl.split(',')[1], 'base64'));
    const raw = await sharp(metadata.savedPath).ensureAlpha().raw().toBuffer();
    const center = [...raw.subarray((80 * 160 + 80) * 4, (80 * 160 + 80) * 4 + 4)];
    assert.deepEqual(center, mode === 'svg' ? [255, 0, 0, 255] : mode === 'blend' ? [128, 0, 126, 255] : [0, 0, 255, 255]);
  }
  assert.deepEqual(await readFile(f.path), source);
  assert.deepEqual(await readFile(f.reference), reference);
});

test('子组的实际渲染形状必须在父范围内，尺寸、绑定、空图和嵌图均不能冒充完成', async t => {
  const f = await fixture(t);
  const parent = join(f.directory, 'parent.svg');
  await writeFile(parent, svg('face', '<rect x="10" y="10" width="80" height="80" fill="red"/>'));
  await validateGroupSvg(f.path, 'face', canvas, parent);
  assert.equal((await checkParentBounds(f.path, parent, canvas)).status, 'pass');
  await writeFile(f.path, svg('face', '<rect x="0" y="20" width="30" height="30" fill="red"/>'));
  const bounds = await checkParentBounds(f.path, parent, canvas);
  assert.equal(bounds.status, 'fail');
  assert.deepEqual(bounds.outsideBox, [0, 20, 10, 30]);
  await assert.rejects(validateGroupSvg(f.path, 'face', canvas, parent), /超出父轮廓/);
  for (const [content, error] of [
    [svg('other', '<rect width="20" height="20"/>'), /仅绑定当前组/],
    [svg('face', ''), /没有可见/],
    [svg('face', '<image href="reference.png"/>'), /可编辑矢量/],
    [svg('face', '<rect width="20" height="20"/>').replace('0 0 100 100', '0 0 50 50'), /viewBox/],
  ] as const) {
    await writeFile(f.path, content);
    await assert.rejects(validateGroupSvg(f.path, 'face', canvas), error);
  }
});

test('允许共用完整边界、贴边和等价变换，检查采用固定四倍原图坐标网格', async t => {
  const f = await fixture(t);
  const parent = join(f.directory, 'parent.svg');
  const rectangle = '<rect x="10.125" y="10.125" width="79.75" height="79.75"/>';
  for (const [parentShape, childShape] of [
    ['<rect width="100" height="100"/>', '<rect width="100" height="100"/>'],
    [rectangle, rectangle],
    [rectangle, '<rect x="10.126" y="10.126" width="79.748" height="79.748"/>'],
    [rectangle, '<g transform="translate(10.125 10.125)"><path d="M0 0H79.75V79.75H0Z"/></g>'],
  ]) {
    await writeFile(parent, svg('face', parentShape));
    await writeFile(f.path, svg('face', childShape));
    const bounds = await checkParentBounds(f.path, parent, canvas);
    assert.equal(bounds.status, 'pass');
    assert.equal(bounds.scale, 4);
    assert.equal(bounds.alphaThreshold, 128);
    assert.equal(bounds.outsideSamples, 0);
    assert.equal(bounds.outsideBox, null);
  }
});

test('同一贝塞尔曲线精确细分后不因抗锯齿误判；真实向外偏移仍拒绝', async t => {
  const f = await fixture(t);
  const parent = join(f.directory, 'parent.svg');
  type Point = [number, number];
  const p: Point[] = [[10.13, 40.19], [30.27, 10.2], [60.37, 30.3], [90.23, 50.17]];
  const mix = (a: Point, b: Point): Point => [a[0] * .63 + b[0] * .37, a[1] * .63 + b[1] * .37];
  const a = mix(p[0], p[1]), b = mix(p[1], p[2]), c = mix(p[2], p[3]);
  const d = mix(a, b), end = mix(d, mix(b, c));
  const child: Point[] = [p[0], a, d, end];
  const shape = (points: Point[]) => `<path d="M${points[0]} C${points[1]} ${points[2]} ${points[3]} L${points[3][0]},90.17 L${points[0][0]},90.17Z"/>`;
  await writeFile(parent, svg('face', shape(p)));
  await writeFile(f.path, svg('face', shape(child)));
  const before = await Promise.all([readFile(parent), readFile(f.path)]);
  const raster = (bytes: Buffer) => sharp(bytes, { density: 288 }).ensureAlpha().extractChannel('alpha').raw().toBuffer();
  const [parentMask, childMask] = await Promise.all(before.map(raster));
  assert.ok(childMask.some((alpha, i) => alpha >= 128 && parentMask[i] < 128), '此真实共边案例须复现旧二值化方法的误判');
  assert.equal((await checkParentBounds(f.path, parent, canvas)).status, 'pass');
  await validateGroupSvg(f.path, 'face', canvas, parent);
  assert.deepEqual(await Promise.all([readFile(parent), readFile(f.path)]), before);
  await writeFile(f.path, svg('face', shape(child.map(([x, y]) => [x, y - .25]))));
  assert.equal((await checkParentBounds(f.path, parent, canvas)).status, 'fail');
});

test('原分辨率漏掉的四分之一像素越界被识别，报告位置和面积仍使用原图单位', async t => {
  const f = await fixture(t);
  const parent = join(f.directory, 'parent.svg');
  await writeFile(parent, svg('face', '<rect x="10" y="10" width="70" height="80"/>'));
  await writeFile(f.path, svg('face', '<rect x="20" y="20" width="60.25" height="30"/>'));
  const raster = async (path: string) => sharp(await readFile(path)).ensureAlpha().extractChannel('alpha').raw().toBuffer();
  const [parentMask, childMask] = await Promise.all([raster(parent), raster(f.path)]);
  assert.ok(!childMask.some((alpha, i) => alpha >= 128 && parentMask[i] < 128), '旧原分辨率检查不能识别本例');
  const bounds = await checkParentBounds(f.path, parent, canvas);
  assert.equal(bounds.status, 'fail');
  assert.equal(bounds.outsideSamples, 120);
  assert.equal(bounds.outsidePixels, 7.5);
  assert.deepEqual(bounds.outsideBox, [80, 20, .25, 30]);
  await assert.rejects(validateGroupSvg(f.path, 'face', canvas, parent), /超出父轮廓/);
  const tool = createSvgPreviewTool({ ...f, canvas, parent });
  const preview = info(await tool.execute({ path: f.path, mode: 'edge', crop: [70, 10, 25, 50], scale: 2 }, signal));
  assert.deepEqual(preview.bounds, bounds, '预览倍率和裁剪不改变父范围判断');
  await writeFile(f.path, svg('face', '<rect x="20" y="20" width="30" height="30"/><rect x="20" y="20" width="60.25" height=".25"/>'));
  const tip = await checkParentBounds(f.path, parent, canvas);
  assert.equal(tip.status, 'fail');
  assert.equal(tip.outsideSamples, 1, '仅一个真实越界采样也不得按数量豁免');
  assert.deepEqual(tip.outsideBox, [80, 20, .25, .25]);
});

test('父轮廓孔洞与分离区域继续约束子组，不用扩边或填洞掩盖越界', async t => {
  const f = await fixture(t);
  const parent = join(f.directory, 'parent.svg');
  await writeFile(parent, svg('face', '<path fill-rule="evenodd" d="M10 10H90V90H10Z M40 40H60V60H40Z"/>'));
  await writeFile(f.path, svg('face', '<rect x="40" y="40" width="20" height="20"/>'));
  const hole = await checkParentBounds(f.path, parent, canvas);
  assert.equal(hole.status, 'fail');
  assert.deepEqual(hole.outsideBox, [40, 40, 20, 20]);
  await writeFile(parent, svg('face', '<rect x="10" y="10" width="20" height="80"/><rect x="70" y="10" width="20" height="80"/>'));
  await writeFile(f.path, svg('face', '<rect x="20" y="20" width="10" height="10"/><rect x="70" y="20" width="10" height="10"/>'));
  assert.equal((await checkParentBounds(f.path, parent, canvas)).status, 'pass');
  await writeFile(f.path, svg('face', '<rect x="30" y="20" width="40" height="10"/>'));
  assert.equal((await checkParentBounds(f.path, parent, canvas)).status, 'fail');
});

test('预览拒绝越界选框、无效倍率、外部路径和逃逸 symlink，不写预览', async t => {
  const f = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), 'part-layering-svg-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const path = join(outside, 'outside.svg');
  await writeFile(path, await readFile(f.path));
  await symlink(path, join(f.directory, 'escape.svg'));
  for (const args of [{ path: f.path, crop: [99, 0, 2, 2] }, { path: f.path, scale: 9 }, { path }, { path: 'escape.svg' }]) {
    await assert.rejects(f.tool.execute(args, signal));
  }
  assert.ok(!(await readdir(f.directory)).includes('observations'));
});
