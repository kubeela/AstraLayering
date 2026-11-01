import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import { toolDefinition } from '../codex/tool-config.ts';
import { toAgentPath, taskRootOf } from '../task-paths.ts';
import { editXmlAttributes, svgSource, updateSvgRoot, type XmlSourceElement } from '../xml.ts';
import type { ParentRegion } from './layering-types.ts';
import type { Canvas } from './svg-tools.ts';

// A child that is an independent block of its parent's completed SVG takes its
// outline straight from that SVG: the shapes wholly inside a box whose border
// runs through empty canvas. The box may not cut a shape or a connection.
const shapes = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line']);
const unsupported = new Set(['defs', 'use', 'mask', 'clipPath', 'pattern', 'symbol', 'image', 'text', 'foreignObject', 'script']);
const alphaThreshold = 128;
// A piece is one element, or one absolute-M subpath of a path.
type Piece = { element: XmlSourceElement; d?: string };

export function checkParentRegion(value: unknown, canvas: Canvas, label = 'region'): ParentRegion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 须为 {x,y,width,height} 对象`);
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some(key => !['x', 'y', 'width', 'height'].includes(key)) ||
      [raw.x, raw.y].some(v => !Number.isSafeInteger(v) || (v as number) < 0) ||
      [raw.width, raw.height].some(v => !Number.isSafeInteger(v) || (v as number) < 1)) {
    throw new Error(`${label} 须为整数 x、y ≥ 0 与 width、height ≥ 1`);
  }
  const region = { x: raw.x, y: raw.y, width: raw.width, height: raw.height } as ParentRegion;
  if (region.x + region.width > canvas.width || region.y + region.height > canvas.height) throw new Error(`${label} 超出画布`);
  return region;
}

function pieces(text: string) {
  const parsed = svgSource(text), found: Piece[] = [];
  for (const entry of parsed.elements) {
    const name = entry.element.localName ?? '';
    if (unsupported.has(name)) throw new Error(`父组完成稿含 <${name}>，不能按选框复制，请正常描边`);
    if (!shapes.has(name)) continue;
    const d = name === 'path' ? entry.element.getAttribute('d') ?? '' : undefined;
    const parts = d === undefined ? [] : d.split(/(?=M)/).map(part => part.trim()).filter(Boolean);
    if (parts.length > 1) for (const part of parts) found.push({ element: entry, d: part });
    else found.push({ element: entry });
  }
  return { parsed, found };
}

// Keeps the given pieces; every other shape is removed. Edits run from the end
// so earlier source ranges stay valid.
function keep(text: string, all: Piece[], kept: Set<number>): string {
  const byElement = new Map<XmlSourceElement, number[]>();
  all.forEach((piece, index) => byElement.set(piece.element, [...byElement.get(piece.element) ?? [], index]));
  let out = text;
  for (const [element, indices] of [...byElement].sort((a, b) => b[0].start - a[0].start)) {
    const chosen = indices.filter(index => kept.has(index));
    if (!chosen.length) out = out.slice(0, element.start) + out.slice(element.end);
    else if (chosen.length < indices.length) out = editXmlAttributes(out, element, { d: chosen.map(index => all[index].d).join(' ') });
  }
  return out;
}

async function mask(text: string, canvas: Canvas): Promise<Buffer> {
  const { data, info } = await sharp(Buffer.from(text), { limitInputPixels: 100_000_000 })
    .ensureAlpha().extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
  if (info.width !== canvas.width || info.height !== canvas.height) throw new Error('父组完成稿画布尺寸不符');
  return data;
}

export type ParentRegionCopy = { svg: string; pieces: number[]; total: number };

export async function copyParentRegion(parentPath: string, id: string, region: ParentRegion, canvas: Canvas): Promise<ParentRegionCopy> {
  const source = await readFile(parentPath), text = source.toString('utf8');
  const { found } = pieces(text);
  if (!found.length) throw new Error('父组完成稿没有可复制的形状');
  const inside = (x: number, y: number) => x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
  const whole = await mask(text, canvas);
  for (let x = region.x; x < region.x + region.width; x++) for (const y of [region.y, region.y + region.height - 1]) {
    if (whole[y * canvas.width + x] >= alphaThreshold) throw new Error(`选框边线在 (${x},${y}) 切过父组形状；框线须落在空白处，相连的形状不能按选框复制`);
  }
  for (let y = region.y; y < region.y + region.height; y++) for (const x of [region.x, region.x + region.width - 1]) {
    if (whole[y * canvas.width + x] >= alphaThreshold) throw new Error(`选框边线在 (${x},${y}) 切过父组形状；框线须落在空白处，相连的形状不能按选框复制`);
  }
  const kept: number[] = [];
  for (let index = 0; index < found.length; index++) {
    const alpha = await mask(keep(text, found, new Set([index])), canvas);
    let within = 0, outside = 0;
    for (let i = 0; i < alpha.length; i++) {
      if (alpha[i] < alphaThreshold) continue;
      if (inside(i % canvas.width, Math.floor(i / canvas.width))) within++; else outside++;
    }
    if (within && outside) throw new Error(`选框切分了父组的第 ${index + 1} 个形状；只能复制整体位于框内的独立形状`);
    if (within) kept.push(index);
  }
  if (!kept.length) throw new Error('选框内没有父组形状');
  if (kept.length === found.length) throw new Error('选框包含父组全部形状；子节点须是父组中的独立一块');
  let svg = keep(text, found, new Set(kept));
  const name = id.split('/').pop()!.replaceAll('_', '-');
  for (const entry of [...svgSource(svg).elements].reverse()) {
    if (!entry.element.hasAttribute('data-group-path')) continue;
    const container = entry.element.localName === 'g' && entry.element.hasAttribute('id');
    svg = editXmlAttributes(svg, entry, { 'data-group-path': id, ...(container ? { id: `${name}-outline` } : {}) });
  }
  svg = updateSvgRoot(svg, { 'data-source-sha256': createHash('sha256').update(source).digest('hex'),
    'data-parent-region': `${region.x} ${region.y} ${region.width} ${region.height}` });
  return { svg, pieces: kept, total: found.length };
}

// The step12 tool: records name -> region for submit_children to attach.
export function createParentRegionTool(options: { directory: string; parentPath: string; canvas: Canvas; groupId: string;
  observationDirectory: string; overrides?: string; copies: Map<string, ParentRegion & { pieces: number[] }> }): FunctionTool {
  return {
    ...toolDefinition('copy_parent_region', options.overrides),
    async execute(value, signal, context) {
      signal.throwIfAborted();
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('参数须为对象');
      const { name, region: raw, ...rest } = value as Record<string, unknown>;
      if (Object.keys(rest).length || typeof name !== 'string' || !/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('须提供 snake_case name 与 region');
      const region = checkParentRegion(raw, options.canvas);
      const copy = await copyParentRegion(options.parentPath, `${options.groupId}/${name}`, region, options.canvas);
      for (const [other, entry] of options.copies) {
        if (other !== name && entry.pieces.some(piece => copy.pieces.includes(piece))) throw new Error(`选框与 ${other} 的复制范围重叠`);
      }
      await mkdir(options.observationDirectory, { recursive: true });
      const path = join(options.observationDirectory, `copy-${name}.svg`);
      await writeFile(path, copy.svg);
      options.copies.set(name, { ...region, pieces: copy.pieces });
      const root = context?.root ?? taskRootOf(options.directory);
      return textResult({ name, region, path: await toAgentPath(root, path), shapes: copy.pieces.length, parentShapes: copy.total,
        note: '提交同名子节点后，其轮廓直接取自此复制，跳过描边与轮廓 review；请用 preview_svg 查看此文件确认范围' });
    },
  };
}
