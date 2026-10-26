import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { unzipSync } from 'fflate';
import sharp from 'sharp';
import { layerPartName } from '../layer-names.ts';
import { preparePrivateKritaEnvironment } from '../krita/private-environment.ts';
import { parseXml } from '../xml.ts';

export type Box = [number, number, number, number];
export type PartSource = { namespace: 'character' | 'clothing'; document: string };
export type PartScopeOptions = { krita?: string; env?: NodeJS.ProcessEnv; sources?: PartSource[];
  exportLayers?: typeof exportKraLayers };
export type PartScope = { parts: string[]; padding: number; bounds: { part: string; layer: string; bounds: Box }[]; mask: Buffer };

// Krita supplies the transformed, masked layer pixels. Do not approximate a
// scaled garment using its upstream SVG coordinates or decode Krita tiles here.
export async function exportKraLayers(document: string, folder: string, krita: string,
  inherited: NodeJS.ProcessEnv, signal: AbortSignal): Promise<Uint8Array> {
  const root = join(folder, 'krita-export'), ora = join(root, 'layers.ora');
  const { resource, env } = await preparePrivateKritaEnvironment(root, inherited);
  try {
    const result = await promisify(execFile)(krita, ['--nosplash', '--resource-location', resource,
      '--export', '--export-filename', ora, document], { cwd: root, env, signal, timeout: 180_000, maxBuffer: 1_000_000 });
    await writeFile(join(folder, 'krita-export.log'), result.stdout + result.stderr);
    return await readFile(ora);
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    await writeFile(join(folder, 'krita-export.log'), (failure.stdout ?? '') + (failure.stderr ?? '') + '\n' + failure.message);
    throw new Error('无法读取当前 KRA 的部件范围；请检查已保存工程、Krita 和显示环境。诊断：' + join(folder, 'krita-export.log'), { cause: error });
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function sourceNames(sources: PartSource[]) {
  const names = new Map<string, Set<string>>();
  for (const source of sources) {
    const contents = unzipSync(await readFile(source.document), { filter: file => file.name === 'maindoc.xml' });
    if (!contents['maindoc.xml']) throw new Error('输入 KRA 缺少 maindoc.xml：' + source.document);
    const xml = parseXml(new TextDecoder().decode(contents['maindoc.xml']));
    for (const layer of Array.from(xml.getElementsByTagName('layer'))) {
      const { name } = layerPartName(layer.getAttribute('name') ?? '');
      const namespaces = names.get(name) ?? new Set<string>();
      namespaces.add(source.namespace + ':'); names.set(name, namespaces);
    }
  }
  return names;
}

// Fill enclosed holes in the diagnostic coverage so a missing interior patch
// still gets compared. Intentional openings remain candidates for visual review.
function fillHoles(mask: Buffer, width: number, height: number) {
  const outside = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
  let size = 0, read = 0;
  const add = (pos: number) => { if (!mask[pos] && !outside[pos]) { outside[pos] = 1; queue[size++] = pos; } };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (read < size) {
    const pos = queue[read++], x = pos % width;
    if (x) add(pos - 1); if (x + 1 < width) add(pos + 1);
    if (pos >= width) add(pos - width); if (pos + width < mask.length) add(pos + width);
  }
  for (let pos = 0; pos < mask.length; pos++) if (!outside[pos]) mask[pos] = 255;
}

export async function partScope(ora: Uint8Array, parts: string[], padding: number, canvas: [number, number],
  sources: PartSource[] = [], signal?: AbortSignal): Promise<PartScope> {
  const files = unzipSync(ora, { filter: file => file.name === 'stack.xml' || /^data\/layer\d+\.png$/.test(file.name) });
  if (!files['stack.xml']) throw new Error('Krita 导出缺少 OpenRaster 图层目录');
  const xml = parseXml(new TextDecoder().decode(files['stack.xml'])), image = xml.documentElement;
  if (!image) throw new Error('Krita 导出的图层目录为空');
  const [width, height] = canvas;
  if (Number(image.getAttribute('w')) !== width || Number(image.getAttribute('h')) !== height) throw new Error('当前 KRA 与 current PNG 画布尺寸不同');
  const origins = await sourceNames(sources), rows = [];
  for (const layer of Array.from(xml.getElementsByTagName('layer'))) {
    const label = layer.getAttribute('name') ?? '', parsed = layerPartName(label);
    const namespaces = parsed.namespace ? [parsed.namespace] : [...(origins.get(parsed.name) ?? [''])];
    let visible = true, x = 0, y = 0;
    for (let node = layer; node && node !== image; node = node.parentNode as typeof layer) {
      if (node.getAttribute?.('visibility') === 'hidden' || Number(node.getAttribute?.('opacity') ?? 1) === 0) visible = false;
      x += Number(node.getAttribute?.('x') ?? 0); y += Number(node.getAttribute?.('y') ?? 0);
    }
    rows.push({ label, name: parsed.name, namespaces, visible, x, y, src: layer.getAttribute('src') ?? '' });
  }
  const matches = new Map<string, typeof rows>();
  for (const part of parts) {
    const separator = part.indexOf(':'), namespace = separator < 0 ? undefined : part.slice(0, separator + 1);
    const id = separator < 0 ? part : part.slice(separator + 1);
    const selected = rows.filter(row => (row.name === id || row.name.startsWith(id + '/'))
      && (!namespace || row.namespaces.includes(namespace)));
    const namespaces = new Set(selected.flatMap(row => row.namespaces));
    if (namespaces.size > 1 || selected.some(row => row.namespaces.length > 1)) throw new Error('部件归属不明确：' + part + '；请使用 character: 或 clothing: 前缀，并保留图层归属标记');
    if (!selected.length) throw new Error('当前 KRA 没有部件：' + part + '；可用路径：' + [...new Set(rows.map(row => row.name))].slice(0, 100).join('、'));
    matches.set(part, selected);
  }
  const mask = Buffer.alloc(width * height), bounds: PartScope['bounds'] = [];
  for (const [part, selected] of matches) {
    let found = false;
    for (const row of selected) {
      signal?.throwIfAborted();
      if (!row.visible) continue;
      if (!files[row.src]) throw new Error('Krita 导出缺少部件像素：' + row.label);
      const raster = await sharp(files[row.src], { limitInputPixels: 16_000_000 }).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let x0 = width, y0 = height, x1 = -1, y1 = -1;
      for (let yy = 0; yy < raster.info.height; yy++) for (let xx = 0; xx < raster.info.width; xx++) {
        const x = row.x + xx, y = row.y + yy;
        if (x < 0 || y < 0 || x >= width || y >= height || !raster.data[(yy * raster.info.width + xx) * 4 + 3]) continue;
        mask[y * width + x] = 255; found = true;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      if (x1 >= x0) bounds.push({ part, layer: row.label, bounds: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] });
    }
    if (!found) throw new Error('部件隐藏、透明或位于画布外，无法确定检查范围：' + part);
  }
  fillHoles(mask, width, height);
  // libvips erode expands WHITE coverage; its dilate expands black foreground.
  const expanded = padding ? await sharp(mask, { raw: { width, height, channels: 1 } }).erode(padding).greyscale().raw().toBuffer() : mask;
  return { parts, padding, bounds, mask: expanded };
}
